import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Annotation, AnnotationTool, FxNode, Project } from "./types";
import { makeNodeId } from "./types";
import { loadProject, saveProject, normalizeProject } from "./api";
import { fmtTimecode } from "./timecode";
import VideoStage from "./components/VideoStage";
import Timeline from "./components/Timeline";
import NodePanel from "./components/NodePanel";
import AnnotationLayer from "./components/AnnotationLayer";
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
  // 画面原始宽高比（用于让 .video-wrap 贴合实际画面，避免拉伸/裁切，并保证标注坐标对齐）
  const [dims, setDims] = useState({ left: { w: 1280, h: 720 }, right: { w: 1280, h: 720 } });
  const bothReady = leftReady && rightReady;
  const rightSrc = rightVideo || leftVideo; // 无右侧成片时，右屏显示原片
  const timeRef = useRef(time);
  timeRef.current = time;

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

  const updateNode = useCallback((id: string, patch: Partial<FxNode>) => {
    setProject((p) =>
      p
        ? {
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
            ),
          }
        : p,
    );
  }, []);

  const deleteNode = (id: string) => {
    if (!window.confirm(`删除节点 ${id}？其手绘标注也会一并删除。`)) return;
    setProject((p) =>
      p ? { ...p, nodes: p.nodes.filter((n) => n.id !== id), ui: { ...p.ui, selectedNodeId: null } } : p,
    );
  };

  const addTrack = useCallback(() => {
    setProject((p) => {
      if (!p) return p;
      const n = p.tracks.length + 1;
      return { ...p, tracks: [...p.tracks, `T${n}`] };
    });
  }, []);

  const addNodeAtCurrentTime = useCallback(() => {
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
  }, []);

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


  // ---- 键盘 ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
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
  }, [togglePlay, stepFrame]);

  const selected = useMemo(
    () => project?.nodes.find((n) => n.id === project.ui.selectedNodeId) ?? null,
    [project],
  );
  const inSelectedRange =
    !!selected && time >= selected.start && time <= selected.start + selected.duration;

  const addAnnotation = (a: Annotation) => {
    if (!selected) return;
    updateNode(selected.id, {
      creative: {
        ...selected.creative,
        annotations: [...selected.creative.annotations, a],
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const undoAnnotation = () => {
    if (!selected) return;
    updateNode(selected.id, {
      creative: {
        ...selected.creative,
        annotations: selected.creative.annotations.slice(0, -1),
        updatedAt: new Date().toISOString(),
      },
    });
  };
  const clearAnnotations = () => {
    if (!selected || selected.creative.annotations.length === 0) return;
    if (!window.confirm(`清除 ${selected.id} 的全部 ${selected.creative.annotations.length} 条标注？`)) return;
    updateNode(selected.id, {
      creative: { ...selected.creative, annotations: [], updatedAt: new Date().toISOString() },
    });
  };

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
          <span className="small dim">{importMsg}</span>
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
              {(["pen", "arrow", "ellipse"] as AnnotationTool[]).map((t) => (
                <button key={t} className={tool === t ? "active" : ""} onClick={() => setTool(tool === t ? null : t)}>
                  {t === "pen" ? "轨迹" : t === "arrow" ? "箭头" : "圈选"}
                </button>
              ))}
              {COLORS.map((c) => (
                <button key={c} className={`swatch ${color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
              <button onClick={undoAnnotation} disabled={!selected}>撤销</button>
              <button onClick={clearAnnotations} disabled={!selected}>清除</button>
            </div>
          </div>
          <div className="stage-box">
            <div className="video-wrap" style={{ aspectRatio: `${dims.left.w} / ${dims.left.h}` }}>
              <VideoStage surfaceRef={leftCanvasRef} />
              <AnnotationLayer
                annotations={selected?.creative.annotations ?? []}
                tool={tool}
                color={color}
                timeVisible={inSelectedRange}
                onAdd={addAnnotation}
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
