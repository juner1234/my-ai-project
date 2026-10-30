import { useEffect, useRef, useState } from "react";
import type { FxNode } from "../types";
import { fmtTimecode } from "../timecode";

interface Props {
  duration: number;
  time: number;
  zoom: number;
  nodes: FxNode[];
  tracks: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeek: (t: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  onChange: (id: string, patch: Partial<Pick<FxNode, "start" | "duration" | "trackId">>) => void;
  onAddAtPlayhead: () => void;
  onAddTrack: () => void;
  onZoom: (z: number) => void;
}

interface DragSession {
  mode: "playhead" | "move" | "left" | "right";
  id?: string;
  offsetX: number;
  origStart: number;
  origDuration: number;
  origTrackId: string;
}

const TRACK_H = 30;
const LABEL_W = 70;

export default function Timeline({
  duration,
  time,
  zoom,
  nodes,
  tracks,
  selectedId,
  onSelect,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onChange,
  onAddAtPlayhead,
  onAddTrack,
  onZoom,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [dragging, setDragging] = useState(false);

  const dur = Math.max(duration || 0.001, 0.001);
  const innerW = Math.max(dur * 60 * zoom, 100);
  const pxPerSec = innerW / dur;

  const timeAtClientX = (clientX: number): number => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(dur, (clientX - r.left) / pxPerSec));
  };
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  // 拖拽期间挂 window 监听，避免事件被子元素捕获/组件重渲染打断
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const t = timeAtClientX(e.clientX);
      if (d.mode === "playhead") {
        onSeek(t);
      } else if (d.mode === "move") {
        const patch: Partial<Pick<FxNode, "start" | "duration" | "trackId">> = {
          start: round3(Math.max(0, Math.min(dur - d.origDuration, t - d.offsetX))),
        };
        // 垂直拖动切换轨道
        const lanes = lanesRef.current;
        if (lanes) {
          const lr = lanes.getBoundingClientRect();
          const idx = Math.floor((e.clientY - lr.top) / TRACK_H);
          if (idx >= 0 && idx < tracks.length) {
            const tid = tracks[idx];
            if (tid !== d.origTrackId) patch.trackId = tid;
          }
        }
        onChange(d.id!, patch);
      } else if (d.mode === "left") {
        const end = d.origStart + d.origDuration;
        const start = Math.max(0, Math.min(end - 0.1, t));
        onChange(d.id!, { start: round3(start), duration: round3(end - start) });
      } else {
        onChange(d.id!, { duration: round3(Math.max(0.1, Math.min(dur - d.origStart, t - d.origStart))) });
      }
    };
    const onUp = () => {
      const wasPlayhead = dragRef.current?.mode === "playhead";
      dragRef.current = null;
      setDragging(false);
      if (wasPlayhead) onScrubEnd();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, dur, pxPerSec, tracks, onSeek, onChange, onScrubEnd]);

  const beginDrag = (d: DragSession) => {
    dragRef.current = d;
    setDragging(true);
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(".fx-node")) return;
    onScrubStart();
    beginDrag({ mode: "playhead", offsetX: 0, origStart: 0, origDuration: 0, origTrackId: "" });
    onSeek(timeAtClientX(e.clientX));
  };

  const onNodePointerDown = (e: React.PointerEvent, node: FxNode, mode: "move" | "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(node.id);
    beginDrag({
      mode,
      id: node.id,
      offsetX: timeAtClientX(e.clientX) - node.start,
      origStart: node.start,
      origDuration: node.duration,
      origTrackId: node.trackId,
    });
  };

  // 节点按轨道分组（同一轨道允许时间重叠）
  const byTrack = new Map<string, FxNode[]>();
  for (const t of tracks) byTrack.set(t, []);
  for (const n of nodes) {
    if (!byTrack.has(n.trackId)) byTrack.set(n.trackId, []);
    byTrack.get(n.trackId)!.push(n);
  }
  const trackList = [...byTrack.keys()];

  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60];
  const tickStep = candidates.find((c) => c * pxPerSec >= 45) ?? 120;
  const ticks: number[] = [];
  for (let t = 0; t <= dur + 1e-6; t += tickStep) ticks.push(t);

  return (
    <div className="tl">
      <div className="tl-toolbar">
        <button onClick={onAddAtPlayhead}>＋ 添加 FX 节点</button>
        <button onClick={onAddTrack}>＋ 添加轨道</button>
        <span className="tl-timecode">{fmtTimecode(time)}</span>
        <span className="tl-dim">总长 {fmtTimecode(dur)} · {trackList.length} 轨</span>
        <span className="tl-spacer" />
        <button onClick={() => onSeek(Math.max(0, time - 1))}>−1s</button>
        <button onClick={() => onSeek(Math.min(dur, time + 1))}>+1s</button>
        <label className="tl-zoom">
          缩放
          <input type="range" min={0.4} max={8} step={0.1} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} />
        </label>
      </div>
      <div className="tl-body">
        {/* 左侧轨道标签（固定） */}
        <div className="tl-labels">
          <div className="tl-label-head">轨道</div>
          {trackList.map((tid, i) => (
            <div key={tid} className="tl-label" style={{ height: TRACK_H }}>
              {tid}
              <span className="tl-label-count">{byTrack.get(tid)!.length}</span>
            </div>
          ))}
        </div>
        {/* 右侧可滚动区域 */}
        <div className="tl-scroll">
          <div
            className="tl-inner"
            ref={trackRef}
            style={{ width: innerW, cursor: dragging && dragRef.current?.mode === "playhead" ? "ew-resize" : undefined }}
            onPointerDown={onTrackPointerDown}
          >
            <div className="tl-ruler">
              {ticks.map((t) => (
                <div key={t} className="tl-tick" style={{ left: t * pxPerSec }}>
                  <span>{fmtTimecode(t)}</span>
                </div>
              ))}
            </div>
            <div className="tl-lanes" ref={lanesRef}>
              {trackList.map((tid) => (
                <div key={tid} className="tl-lane" style={{ height: TRACK_H }}>
                  {(byTrack.get(tid) ?? []).map((n) => (
                    <div
                      key={n.id}
                      className={`fx-node ${n.id === selectedId ? "selected" : ""}`}
                      style={{
                        left: n.start * pxPerSec,
                        width: Math.max(6, n.duration * pxPerSec),
                        top: 3,
                        height: TRACK_H - 6,
                      }}
                      onPointerDown={(e) => onNodePointerDown(e, n, "move")}
                      title={`${n.id} ${fmtTimecode(n.start)} → ${fmtTimecode(n.start + n.duration)} · ${tid}`}
                    >
                      <div className="fx-edge left" onPointerDown={(e) => onNodePointerDown(e, n, "left")} />
                      <span className="fx-node-label">{n.id}</span>
                      <div className="fx-edge right" onPointerDown={(e) => onNodePointerDown(e, n, "right")} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="tl-playhead" style={{ left: time * pxPerSec }}>
              <div className="tl-playhead-label">{fmtTimecode(time)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
