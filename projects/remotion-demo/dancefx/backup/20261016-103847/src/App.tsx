import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Annotation, AnnotationTool, FxNode, Point, Project } from "./types";
import { makeNodeId } from "./types";
import { loadProject, saveProject, normalizeProject, exportBrief, loadAiResult } from "./api";
import { buildBrief, applyResult, type AiResult } from "./aiHandoff";
import { fmtTimecode } from "./timecode";
import VideoStage from "./components/VideoStage";
import Timeline from "./components/Timeline";
import NodePanel from "./components/NodePanel";
import AnnotationLayer, { type Shape } from "./components/AnnotationLayer";
import ExportDialog from "./components/ExportDialog";
import { WebCodecsEngine } from "./render/WebCodecsEngine";

const FPS = 30;
const COLORS = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#ffffff"];
const ACCEPT_VIDEO = ".mp4,.mov,.m4v,.webm,.mkv,.avi";

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<AnnotationTool | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showExport, setShowExport] = useState(false);
  const [leftVideo, setLeftVideo] = useState("");
  const [rightVideo, setRightVideo] = useState("");
  const [leftMuted, setLeftMuted] = useState(false);  // 默认左侧有声
  const [rightMuted, setRightMuted] = useState(true); // 默认右侧静音
  const [leftReady, setLeftReady] = useState(false);
  const [rightReady, setRightReady] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  // AI 交接（导出简报 / 导入回填结果）的状态提示
  const [aiMsg, setAiMsg] = useState("");
  // 画面原始宽高比（用于让 .video-wrap 贴合实际画面，避免拉伸/裁切，并保证标注坐标对齐）
  const [dims, setDims] = useState({ left: { w: 1280, h: 720 }, right: { w: 1280, h: 720 } });
  // ---- 标注：当前选中元素 + 正在绘制中的图形 ----
  const [selectedAnnIds, setSelectedAnnIds] = useState<string[]>([]);
  const [activeShape, setActiveShape] = useState<Shape | null>(null);
  const activeRef = useRef<Shape | null>(null);
  const putActive = (s: Shape | null) => {
    activeRef.current = s;
    setActiveShape(s);
  };
  // ---- 撤销/重做历史（project 内容快照；撤销时保留当前 ui，不打断播放/选择）----
  const pastRef = useRef<Project[]>([]);
  const futureRef = useRef<Project[]>([]);
  const lastCoalesce = useRef<{ key: string; t: number } | null>(null);
  const [histVer, setHistVer] = useState(0);
  const bothReady = leftReady && rightReady;
  const rightSrc = rightVideo || leftVideo; // 无右侧成片时，右屏显示原片
  const timeRef = useRef(time);
  timeRef.current = time;
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;

  // ---- 启动恢复 ----
  useEffect(() => {
    loadProject()
      .then((p) => {
        if (!p) {
          setError("project.json 不存在或读取失败");
          return;
        }
        const np = normalizeProject(p);
        setProject(np);
        setLeftVideo(np.sourceVideo);
        setRightVideo((p as any).rightVideo ?? "");
        if (p.ui?.lastTime) {
          setTime(p.ui.lastTime);
          engine.seek(p.ui.lastTime);
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  // ---- 自动保存（防抖）----
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!project) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const toSave: Project = {
        ...project,
        ui: { ...project.ui, lastTime: timeRef.current },
        updatedAt: new Date().toISOString(),
      };
      setSaveState("saving");
      saveProject(toSave)
        .then(() => setSaveState("saved"))
        .catch((e) => {
          setSaveState("error");
          setError(String(e));
        });
    }, 600);
    return () => window.clearTimeout(saveTimer.current);
  }, [project]);

  // ---- 撤销/重做 ----
  const clone = (p: Project): Project => JSON.parse(JSON.stringify(p)) as Project;

  const pushHistory = useCallback((coalesceKey?: string) => {
    const cur = projectRef.current;
    if (!cur) return;
    const now = Date.now();
    const lc = lastCoalesce.current;
    if (coalesceKey && lc && lc.key === coalesceKey && now - lc.t < 700) {
      lc.t = now;
      futureRef.current = [];
      setHistVer((v) => v + 1);
      return;
    }
    pastRef.current.push(clone(cur));
    if (pastRef.current.length > 100) pastRef.current.shift();
    futureRef.current = [];
    lastCoalesce.current = coalesceKey ? { key: coalesceKey, t: now } : null;
    setHistVer((v) => v + 1);
  }, []);

  const updateNode = useCallback(
    (id: string, patch: Partial<FxNode>, hist: "coalesce" | "single" | "off" = "coalesce") => {
      if (hist === "coalesce") pushHistory(`n:${id}`);
      else if (hist === "single") pushHistory();
      setProject((p) =>
        p
          ? {
              ...p,
              nodes: p.nodes.map((n) => {
                if (n.id !== id) return n;
                const merged: FxNode = { ...n, ...patch, updatedAt: new Date().toISOString() };
                // 节点时间/轨道变化时，同步其标注的结构化字段，保证标注始终绑定到节点
                if (patch.start !== undefined || patch.duration !== undefined || patch.trackId !== undefined) {
                  merged.creative = {
                    ...merged.creative,
                    annotations: merged.creative.annotations.map((a) => ({
                      ...a,
                      start: merged.start,
                      end: merged.start + merged.duration,
                      duration: merged.duration,
                      trackId: merged.trackId,
                    })),
                  };
                }
                return merged;
              }),
            }
          : p,
      );
    },
    [pushHistory],
  );

  const applyHistory = (p: Project) => {
    const cur = projectRef.current;
    setProject({ ...clone(p), ui: cur ? cur.ui : p.ui });
    putActive(null);
    setSelectedAnnIds([]);
  };

  const undo = useCallback(() => {
    const cur = projectRef.current;
    if (!cur || pastRef.current.length === 0) return;
    const prev = pastRef.current.pop()!;
    futureRef.current.push(clone(cur));
    lastCoalesce.current = null;
    applyHistory(prev);
    setHistVer((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const cur = projectRef.current;
    if (!cur || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(clone(cur));
    lastCoalesce.current = null;
    applyHistory(next);
    setHistVer((v) => v + 1);
  }, []);

  const deleteNode = (id: string) => {
    if (!window.confirm(`删除节点 ${id}？其手绘标注也会一并删除。`)) return;
    pushHistory();
    setProject((p) =>
      p ? { ...p, nodes: p.nodes.filter((n) => n.id !== id), ui: { ...p.ui, selectedNodeId: null } } : p,
    );
  };

  const addTrack = useCallback(() => {
    pushHistory();
    setProject((p) => {
      if (!p) return p;
      const n = p.tracks.length + 1;
      return { ...p, tracks: [...p.tracks, `T${n}`] };
    });
  }, [pushHistory]);

  const addNodeAtCurrentTime = useCallback(() => {
    pushHistory();
    setProject((p) => {
      if (!p) return p;
      const id = makeNodeId(p.nextNodeId);
      const now = new Date().toISOString();
      const sel = p.nodes.find((n) => n.id === p.ui.selectedNodeId);
      const node: FxNode = {
        id,
        start: Number(timeRef.current.toFixed(3)),
        duration: 2,
        trackId: sel?.trackId ?? p.tracks[0] ?? "T1",
        creative: { description: "", followTarget: "none", annotations: [], updatedAt: now },
        ai: { designProposal: "", versions: [], adoptedVersionId: null, proposals: [] },
        reviewStatus: "draft",
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...p,
        nodes: [...p.nodes, node],
        nextNodeId: p.nextNodeId + 1,
        ui: { ...p.ui, selectedNodeId: id },
      };
    });
  }, [pushHistory]);

  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftAudioRef = useRef<HTMLAudioElement | null>(null);
  const rightAudioRef = useRef<HTMLAudioElement | null>(null);

  // ---- 帧编号驱动引擎：左右独立解码，同一事务呈现同一帧号 ----
  const [engine] = useState(
    () =>
      new WebCodecsEngine(
        {
          onTime: (t) => setTime(t),
          onDuration: (d) => setDuration(d),
          onReady: (side) => (side === "left" ? setLeftReady(true) : setRightReady(true)),
          onInfo: (side, info) => {
            setDims((d) => ({ ...d, [side]: { w: info.width, h: info.height } }));
            console.info(
              `[${side}] ${info.width}×${info.height} · ${info.fps}fps · ${info.frames}帧 · ${info.duration.toFixed(2)}s · 音轨=${info.hasAudio ? "有" : "无"}`,
            );
          },
          onError: (side, message) => {
            setImportMsg(`${side === "left" ? "左侧" : "右侧"}视频：${message}`);
          },
          onEnded: () => setPlaying(false),
        },
        FPS,
      ),
  );

  // 装载/替换左右来源（画布挂载后再调用，避免拿到空 ref）
  useEffect(() => {
    const canvas = leftCanvasRef.current;
    if (!canvas) return;
    void engine.setSide("left", leftVideo, { canvas, audio: leftAudioRef.current });
  }, [engine, leftVideo, project]);

  useEffect(() => {
    const canvas = rightCanvasRef.current;
    if (!canvas) return;
    void engine.setSide("right", rightSrc, { canvas, audio: rightAudioRef.current });
  }, [engine, rightSrc, project]);

  useEffect(() => {
    engine.setRate(rate);
  }, [engine, rate]);

  // React 的 playing 只代表用户意图，实际播放/暂停交给引擎
  useEffect(() => {
    if (playing && bothReady) engine.play();
    else engine.pause();
  }, [engine, playing, bothReady]);

  // 所有跳转都交给引擎，由它统一写入两侧 currentTime
  const seekBoth = useCallback((t: number) => engine.seek(t), [engine]);

  const togglePlay = useCallback(() => {
    if (playing) {
      engine.pause();
      setPlaying(false);
    } else {
      if (bothReady) engine.play();
      setPlaying(true);
    }
  }, [playing, bothReady, engine]);

  const stepFrame = useCallback(
    (delta: number) => {
      setPlaying(false);
      engine.step(delta);
    },
    [engine],
  );

  // 同步由 WebCodecsEngine 统一处理：帧编号是唯一标准，seek/step/播放都在引擎内部完成


  const selected = useMemo(
    () => project?.nodes.find((n) => n.id === project.ui.selectedNodeId) ?? null,
    [project],
  );

  // 全工程「待审 AI 建议」总数（用于顶部提示）
  const pendingProposals = useMemo(
    () =>
      project?.nodes.reduce(
        (sum, n) => sum + n.ai.proposals.filter((p) => p.status === "pending").length,
        0,
      ) ?? 0,
    [project],
  );

  // 选中节点的当前时间范围（标注与节点绑定：只有落在范围内才显示/可编辑）
  const inSelectedRange =
    !!selected && time >= selected.start && time <= selected.start + selected.duration;

  // 切换节点时清空选中元素与绘制中状态
  useEffect(() => {
    setSelectedAnnIds([]);
    putActive(null);
    // 选中节点后，若播放头不在其时间范围内，则跳入范围，保证标注可见可编辑
    const p = projectRef.current;
    const n = p?.nodes.find((x) => x.id === p.ui.selectedNodeId);
    if (!n) return;
    const t = timeRef.current;
    if (t < n.start || t > n.start + n.duration) {
      setTime(n.start);
      engine.seek(n.start);
    }
  }, [project?.ui.selectedNodeId]);

  // 切换模式（绘制 ⇄ 选择）时：放弃正在绘制的图形，并清空选择
  useEffect(() => {
    putActive(null);
    setSelectedAnnIds([]);
  }, [tool]);

  /** 由一笔绘制生成结构化标注记录（补齐开始/结束/持续/轨道/关联对象/描述） */
  const makeAnnotation = (shape: Shape, node: FxNode): Annotation => {
    const end = node.start + node.duration;
    return {
      id: `ann-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      tool: shape.tool,
      points: shape.points,
      color,
      width: 0.004,
      createdAt: new Date().toISOString(),
      start: node.start,
      end,
      duration: node.duration,
      trackId: node.trackId,
      followTarget: node.creative.followTarget,
      description: node.creative.description,
    };
  };

  // 新增一笔标注：立即提交到节点（可撤销/重做），并选中它
  const drawAnnotation = (shape: Shape) => {
    if (!selected) return;
    const ann = makeAnnotation(shape, selected);
    updateNode(
      selected.id,
      {
        creative: {
          ...selected.creative,
          annotations: [...selected.creative.annotations, ann],
          updatedAt: new Date().toISOString(),
        },
      },
      "single",
    );
  };

  // 圈选：拖拽结束 → 直接成为元素
  const dragShape = (shape: Shape) => drawAnnotation(shape);

  // 轨迹：单击依次加点（由「完成」成形）；箭头：第 1 击起点、第 2 击终点，自动完成
  const addPoint = (p: Point) => {
    if (!selected || !tool) return;
    const cur = activeRef.current;
    if (tool === "pen") {
      const pts = cur && cur.tool === "pen" ? [...cur.points, p] : [p];
      putActive({ tool: "pen", points: pts });
    } else if (tool === "arrow") {
      if (cur && cur.tool === "arrow") {
        drawAnnotation({ tool: "arrow", points: [cur.points[0], p] });
        putActive(null);
      } else {
        putActive({ tool: "arrow", points: [p] });
      }
    }
  };

  // 完成：把“正在绘制”的轨迹成形为一个元素
  const finishDrawing = () => {
    const cur = activeRef.current;
    putActive(null);
    if (cur && cur.tool === "pen" && cur.points.length >= 2) drawAnnotation(cur);
  };

  // 取消：放弃正在绘制的图形
  const cancelDrawing = () => putActive(null);

  // （完成/取消已在上方统一定义）

  // 撤销/重做由全局历史处理（undo/redo，见上）

  // 删除：删除当前选中的所有元素（可撤销）
  const deleteSelectedAnnotation = () => {
    if (!selected || selectedAnnIds.length === 0) return;
    const kill = new Set(selectedAnnIds);
    updateNode(
      selected.id,
      {
        creative: {
          ...selected.creative,
          annotations: selected.creative.annotations.filter((a) => !kill.has(a.id)),
          updatedAt: new Date().toISOString(),
        },
      },
      "single",
    );
    setSelectedAnnIds([]);
  };

  const clearAnnotations = () => {
    if (!selected || selected.creative.annotations.length === 0) return;
    if (!window.confirm(`清除 ${selected.id} 的全部 ${selected.creative.annotations.length} 条标注？`)) return;
    updateNode(
      selected.id,
      { creative: { ...selected.creative, annotations: [], updatedAt: new Date().toISOString() } },
      "single",
    );
    setSelectedAnnIds([]);
  };

  // 保存：先把草稿合并进当前节点，再立即写入 project.json
  const saveNow = () => {
    if (!project) return;
    const sel = project.nodes.find((n) => n.id === project.ui.selectedNodeId);
    const nowIso = new Date().toISOString();
    const cur = activeRef.current;
    const extra =
      cur && cur.tool === "pen" && cur.points.length >= 2 && sel ? [makeAnnotation(cur, sel)] : [];
    const pending = extra;
    putActive(null);
    const nodes =
      sel && pending.length
        ? project.nodes.map((n) =>
            n.id === sel.id
              ? {
                  ...n,
                  creative: { ...n.creative, annotations: [...n.creative.annotations, ...pending], updatedAt: nowIso },
                  updatedAt: nowIso,
                }
              : n,
          )
        : project.nodes;
    if (sel && pending.length) {
      pushHistory();
      setProject((p) => (p ? { ...p, nodes } : p));
    }
    setSaveState("saving");
    saveProject({ ...project, nodes, ui: { ...project.ui, lastTime: timeRef.current }, updatedAt: nowIso })
      .then(() => setSaveState("saved"))
      .catch((e) => {
        setSaveState("error");
        setError(String(e));
      });
  };

  // ---- AI 交接：导出简报 / 导入回填结果（均为可撤销操作）----
  const exportBriefNow = async () => {
    if (!project) return;
    try {
      const brief = buildBrief(project);
      const file = await exportBrief(brief);
      setAiMsg(`已导出 ${file}（${brief.nodes.length} 个节点）→ 交给 AI 填写`);
    } catch (e) {
      setAiMsg(`导出失败：${String(e)}`);
    }
  };

  const importAiResultNow = async () => {
    const cur = projectRef.current;
    if (!cur) return;
    try {
      const raw = await loadAiResult();
      if (!raw) {
        setAiMsg("未找到 ai-result.json：请先「导出给 AI」，让 AI 填写后保存为项目根目录的 ai-result.json");
        return;
      }
      const { project: next, summary } = applyResult(cur, raw as AiResult);
      if (summary.nodes === 0) {
        setAiMsg("ai-result.json 中没有需要回填的改动");
        return;
      }
      pushHistory();
      setProject(next);
      setAiMsg(`已导入 ${summary.nodes} 个节点 / ${summary.proposals} 条待审建议 → 在下方节点面板逐条「接受 / 拒绝」`);
    } catch (e) {
      setAiMsg(`导入失败：${String(e)}`);
    }
  };

  // ---- 键盘 ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedAnnIds.length) {
          e.preventDefault();
          deleteSelectedAnnotation();
        }
      } else if (e.code === "Escape") {
        putActive(null);
        setTool(null);
        setSelectedAnnIds([]);
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        stepFrame(e.shiftKey ? 10 : 1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        stepFrame(e.shiftKey ? -10 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, stepFrame, undo, redo, deleteSelectedAnnotation, selectedAnnIds]);

  // ---- 视频导入 ----
  // src 变化时重置就绪状态，等待新的媒体就绪后再播放
  useEffect(() => {
    setLeftReady(false);
  }, [leftVideo]);
  useEffect(() => {
    setRightReady(false);
  }, [rightVideo]);

  const importVideo = (side: "left" | "right") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPT_VIDEO;
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      probe.onloadedmetadata = () => {
        if (side === "left") setLeftVideo(url);
        else setRightVideo(url);
        setImportMsg(`已导入 ${f.name}（${probe.videoWidth}×${probe.videoHeight}）`);
      };
      probe.onerror = () => {
        setImportMsg(`${f.name}：浏览器无法解码该格式，需先用 FFmpeg 转成 MP4（原文件保留）`);
        URL.revokeObjectURL(url);
      };
    };
    input.click();
  };

  if (error) return <div className="app-error">加载失败：{error}</div>;
  if (!project) return <div className="app-loading">载入中…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>DanceFX</strong> <span className="brand-sub">可视化导演台 V0.3</span>
        </div>
        <div className="topbar-actions">
          <button onClick={() => importVideo("left")}>导入左侧视频</button>
          <button onClick={() => importVideo("right")}>导入右侧视频</button>
          {rightVideo && (
            <button className="danger" onClick={() => setRightVideo("")}>
              清除右侧对照
            </button>
          )}
          <span className="tools-sep" />
          <button onClick={exportBriefNow} title="把 节点/标注/绑定 导出为 ai-brief.json，交给 AI 填写">
            🤖 导出给 AI
          </button>
          <button onClick={importAiResultNow} title="读取项目根目录的 ai-result.json，生成待审建议">
            📥 导入 AI 结果
          </button>
          {pendingProposals > 0 && <span className="badge locked">待审 AI 建议 {pendingProposals}</span>}
          <span className="small dim">{importMsg}</span>
          {aiMsg && <span className="small dim">{aiMsg}</span>}
        </div>
        <div className="topbar-right">
          <span className={`save-state ${saveState}`}>
            {saveState === "saving" ? "保存中…" : saveState === "saved" ? "已保存" : saveState === "error" ? "保存失败" : ""}
          </span>
          <button className="primary" onClick={() => setShowExport(true)}>
            导出…
          </button>
        </div>
      </header>

      {/* ===== 上层：双视频预览 ===== */}
      <section className="stages">
        <div className="stage">
          <div className="stage-head">
            <span>原始 · 创意标注</span>
            <div className="tools">
              <button onClick={() => setLeftMuted((m) => !m)} title="左侧声音开关">
                {leftMuted ? "🔇 静音" : "🔊 有声"}
              </button>
              <button className={tool === null ? "active" : ""} onClick={() => setTool(null)} title="选择模式（点击元素选中；Esc）">
                选择
              </button>
              {(["pen", "arrow", "ellipse"] as AnnotationTool[]).map((t) => (
                <button key={t} className={tool === t ? "active" : ""} onClick={() => setTool(tool === t ? null : t)}>
                  {t === "pen" ? "轨迹" : t === "arrow" ? "箭头" : "圈选"}
                </button>
              ))}
              {COLORS.map((c) => (
                <button key={c} className={`swatch ${color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
              <span className="tools-sep" />
              {activeShape && <span className="badge locked">绘制中 {activeShape.points.length} 点</span>}
              <button onClick={finishDrawing} disabled={!activeShape} title="完成：把正在绘制的轨迹成形">
                ✓ 完成
              </button>
              <button onClick={cancelDrawing} disabled={!activeShape} title="取消：放弃正在绘制">
                ✕ 取消
              </button>
              <span className="tools-sep" />
              <button onClick={undo} disabled={pastRef.current.length === 0} title="撤销 (⌘Z)">
                ↶ 撤销
              </button>
              <button onClick={redo} disabled={futureRef.current.length === 0} title="重做 (⌘⇧Z)">
                ↷ 重做
              </button>
              <button
                onClick={deleteSelectedAnnotation}
                disabled={selectedAnnIds.length === 0}
                title="删除选中元素 (Delete)"
              >
                🗑 删除{selectedAnnIds.length > 1 ? ` ${selectedAnnIds.length}` : ""}
              </button>
              <button
                onClick={clearAnnotations}
                disabled={!selected || selected.creative.annotations.length === 0}
                title="清空该节点全部标注"
              >
                清空
              </button>
              <button onClick={saveNow} disabled={!project} title="保存到 project.json">
                💾 保存
              </button>
            </div>
          </div>
          <div className="stage-box">
            <div className="video-wrap" style={{ aspectRatio: `${dims.left.w} / ${dims.left.h}` }}>
              <VideoStage surfaceRef={leftCanvasRef} />
              <AnnotationLayer
                committed={selected?.creative.annotations ?? []}
                timeVisible={inSelectedRange}
                active={activeShape}
                tool={tool}
                color={color}
                selectedIds={selectedAnnIds}
                onAddPoint={addPoint}
                onDragShape={dragShape}
                onSelect={setSelectedAnnIds}
              />
            </div>
          </div>
        </div>

        <div className="stage">
          <div className="stage-head">
            <span>AI 效果预览</span>
            <div className="tools">
              <button onClick={() => setRightMuted((m) => !m)} title="右侧声音开关">
                {rightMuted ? "🔇 静音" : "🔊 有声"}
              </button>
              {!rightVideo && <span className="badge muted">暂无 AI 特效 · 显示原视频</span>}
            </div>
          </div>
          <div className="stage-box">
            <div className="video-wrap" style={{ aspectRatio: `${dims.right.w} / ${dims.right.h}` }}>
              <VideoStage surfaceRef={rightCanvasRef} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 中层：播放控制 ===== */}
      <section className="transport-bar">
        <button onClick={() => stepFrame(-10)} title="后退 10 帧">⏮⏮</button>
        <button onClick={() => stepFrame(-1)} title="上一帧 (←)">⏮</button>
        <button className="play" onClick={togglePlay} title="播放/暂停 (空格)">
          {playing ? "⏸" : "▶"}
        </button>
        <button onClick={() => stepFrame(1)} title="下一帧 (→)">⏭</button>
        <button onClick={() => stepFrame(10)} title="前进 10 帧">⏭⏭</button>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {[0.25, 0.5, 1, 1.5, 2].map((r) => (
            <option key={r} value={r}>{r}x</option>
          ))}
        </select>
        <span className="tc-main">{fmtTimecode(time)}</span>
        <span className="small dim">帧 {Math.round(time * FPS)} · {fmtTimecode(duration)}</span>
        {playing && !bothReady && <span className="badge locked">等待视频就绪…</span>}
        {playing && bothReady && <span className="badge locked">帧号同步中</span>}
      </section>

      {/* ===== 中层：多轨时间轴 ===== */}
      <section className="timeline-zone">
        <Timeline
          duration={duration}
          time={time}
          zoom={zoom}
          nodes={project.nodes}
          tracks={project.tracks}
          selectedId={project.ui.selectedNodeId}
          onSelect={(id) => setProject((p) => (p ? { ...p, ui: { ...p.ui, selectedNodeId: id } } : p))}
          onSeek={(t) => seekBoth(t)}
          onScrubStart={() => engine.beginScrub()}
          onScrubEnd={() => engine.endScrub()}
          onChange={(id, patch) => updateNode(id, patch)}
          onAddAtPlayhead={addNodeAtCurrentTime}
          onAddTrack={addTrack}
          onZoom={setZoom}
        />
      </section>

      {/* ===== 底层：节点编辑工作台 ===== */}
      <section className="workbench-zone">
        <NodePanel
          node={selected}
          duration={duration}
          tracks={project.tracks}
          onUpdate={updateNode}
          onDelete={deleteNode}
        />
      </section>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} duration={duration} fps={FPS} />}

      {/* 左右两条独立音频链路：与画面同帧号定位，一侧静音/无音轨不影响另一侧 */}
      <audio ref={leftAudioRef} src={leftVideo || undefined} muted={leftMuted} preload="auto" />
      <audio ref={rightAudioRef} src={rightSrc || undefined} muted={rightMuted} preload="auto" />
    </div>
  );
}
