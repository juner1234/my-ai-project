import { useEffect, useRef, useState } from "react";
import type { Annotation, AnnotationTool, Point } from "../types";

export interface Shape {
  tool: AnnotationTool;
  points: Point[];
}

interface Props {
  annotations: Annotation[]; // 当前时刻全部节点中应显示的标注（App 已按时间过滤）
  editableNodeId: string | null; // 当前可编辑的节点（null = 不可编辑/绘制）
  hint: string | null; // 只读提示（如“当前时间不在该节点时间范围内”），不参与编辑权限
  tool: AnnotationTool | null; // null = 选择模式（可点选/框选）
  color: string;
  selectedIds: string[]; // 当前选中的元素
  active: Shape | null; // 正在绘制中的图形（由 App 持有，用于「完成」成形）
  onAddPoint: (p: Point) => void; // 轨迹/箭头：单击画面添加一个点
  onDragShape: (shape: Shape) => void; // 圈选：拖拽结束
  onSelect: (ids: string[]) => void; // 选择结果（替换式）
}

const CLICK_TOL = 0.02; // 归一化位移阈值：小于此值视为“单击”
const W = 1000;
const H = 800;

/**
 * 左侧画面上的标注层：轨迹 / 箭头 / 圈选 + 点选。
 * 全部坐标为相对“视频实际画面”的 0..1 归一化坐标（viewBox 拉伸映射），
 * 因此窗口或画布尺寸变化时不会偏移。
 */
export default function AnnotationLayer({
  annotations,
  editableNodeId,
  hint,
  active,
  tool,
  color,
  selectedIds,
  onAddPoint,
  onDragShape,
  onSelect,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  // viewBox 单位 / CSS 像素：让选择框、虚线、控制点在屏幕上保持恒定大小
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => setScale(W / Math.max(1, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const downPt = useRef<Point | null>(null);
  const dragRef = useRef<Shape | null>(null);
  const marqueeRef = useRef<{ a: Point; b: Point } | null>(null);
  const [marquee, setMarquee] = useState<{ a: Point; b: Point } | null>(null);
  const putMarquee = (m: { a: Point; b: Point } | null) => {
    marqueeRef.current = m;
    setMarquee(m);
  };
  const [cursor, setCursor] = useState<Point | null>(null);
  const [drag, setDrag] = useState<Shape | null>(null);
  const putDrag = (s: Shape | null) => {
    dragRef.current = s;
    setDrag(s);
  };

  // 可编辑性：只对属于「当前可编辑节点」的标注成立（与可见性分离）
  const isEditable = (a: Annotation) => a.nodeId === editableNodeId;

  const toNorm = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width))),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(1, r.height))),
    };
  };

  const down = (e: React.PointerEvent) => {
    // 绘制需当前有可编辑节点；选择模式始终可拖框（只命中可编辑标注）
    if (tool && !editableNodeId) return;
    const p = toNorm(e);
    if (!tool) {
      // 选择模式：从空白处开始框选（单击则取消选择）
      downPt.current = p;
      svgRef.current?.setPointerCapture(e.pointerId);
      putMarquee({ a: p, b: p });
      return;
    }
    e.preventDefault();
    downPt.current = p;
    setCursor(p);
    if (tool === "ellipse") {
      svgRef.current?.setPointerCapture(e.pointerId);
      putDrag({ tool: "ellipse", points: [p, p] });
    }
  };

  const move = (e: React.PointerEvent) => {
    const p = toNorm(e);
    if (!tool) {
      const m = marqueeRef.current;
      if (m) putMarquee({ a: m.a, b: p });
      return;
    }
    setCursor(p);
    if (tool === "ellipse") {
      const s = dragRef.current;
      if (s) putDrag({ tool: "ellipse", points: [s.points[0], p] });
    }
  };

  const up = (e: React.PointerEvent) => {
    const p = toNorm(e);
    if (!tool) {
      const m = marqueeRef.current;
      putMarquee(null);
      downPt.current = null;
      if (!m) return;
      const w = Math.abs(p.x - m.a.x);
      const h = Math.abs(p.y - m.a.y);
      if (w < 0.01 && h < 0.01) {
        onSelect([]); // 单击空白 → 取消选择
        return;
      }
      const r = {
        x0: Math.min(m.a.x, p.x),
        x1: Math.max(m.a.x, p.x),
        y0: Math.min(m.a.y, p.y),
        y1: Math.max(m.a.y, p.y),
      };
      onSelect(annotations.filter((a) => isEditable(a) && hitRect(a, r)).map((a) => a.id));
      return;
    }
    const start = downPt.current;
    downPt.current = null;
    const d = start ? Math.hypot(p.x - start.x, p.y - start.y) : 1;
    if (tool === "ellipse") {
      const s = dragRef.current;
      putDrag(null);
      if (s && Math.hypot(s.points[1].x - s.points[0].x, s.points[1].y - s.points[0].y) > CLICK_TOL) {
        onDragShape(s);
      }
      return;
    }
    // 轨迹 / 箭头：单击加点（拖拽超过阈值则忽略）
    if (d <= CLICK_TOL) onAddPoint(p);
  };

  const cancel = () => {
    downPt.current = null;
    putDrag(null);
  };

  const px = (p: Point) => `${p.x * W},${p.y * H}`;

  const renderShape = (
    a: { tool: AnnotationTool; points: Point[]; color: string; width: number },
    opts: { preview?: boolean; cursorPt?: Point | null; selected?: boolean } = {},
  ) => {
    const cls = opts.selected ? "anno-selected" : undefined;
    const sw = Math.max(2, a.width * W);
    const dash = opts.preview ? "7 7" : undefined;
    const op = opts.preview ? 0.7 : 0.95;
    if (a.tool === "pen") {
      return (
        <polyline
          className={cls}
          points={a.points.map(px).join(" ")}
          fill="none"
          stroke={a.color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dash}
          opacity={op}
        />
      );
    }
    const p0 = a.points[0];
    if (!p0) return null;
    if (a.points.length < 2 && !opts.cursorPt) {
      return <circle className={cls} cx={p0.x * W} cy={p0.y * H} r={sw} fill={a.color} opacity={op} />;
    }
    const p1 = a.points.length >= 2 ? a.points[a.points.length - 1] : opts.cursorPt!;
    if (a.tool === "arrow") {
      const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const head = 0.025;
      const h1 = {
        x: p1.x - head * Math.cos(angle - Math.PI / 7),
        y: p1.y - head * Math.sin(angle - Math.PI / 7),
      };
      const h2 = {
        x: p1.x - head * Math.cos(angle + Math.PI / 7),
        y: p1.y - head * Math.sin(angle + Math.PI / 7),
      };
      return (
        <g className={cls} stroke={a.color} fill={a.color} opacity={op}>
          <line x1={p0.x * W} y1={p0.y * H} x2={p1.x * W} y2={p1.y * H} strokeWidth={sw} strokeDasharray={dash} />
          <polygon points={`${px(p1)} ${px(h1)} ${px(h2)}`} strokeWidth={0} stroke="none" />
        </g>
      );
    }
    const cx = ((p0.x + p1.x) / 2) * W;
    const cy = ((p0.y + p1.y) / 2) * H;
    const rx = (Math.abs(p1.x - p0.x) / 2) * W;
    const ry = (Math.abs(p1.y - p0.y) / 2) * H;
    return (
      <ellipse
        className={cls}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={a.color}
        strokeWidth={sw}
        strokeDasharray={dash}
        opacity={op}
      />
    );
  };

  const hitShape = (a: { tool: AnnotationTool; points: Point[] }) => {
    const hp = Math.max(16, 0.016 * W);
    const common = {
      fill: "none",
      stroke: "transparent",
      strokeWidth: hp,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      pointerEvents: "stroke" as const,
    };
    if (a.tool === "pen") return <polyline points={a.points.map(px).join(" ")} {...common} />;
    const p0 = a.points[0];
    const p1 = a.points[a.points.length - 1];
    if (!p0 || !p1) return null;
    if (a.tool === "arrow")
      return <line x1={p0.x * W} y1={p0.y * H} x2={p1.x * W} y2={p1.y * H} {...common} />;
    return (
      <ellipse
        cx={((p0.x + p1.x) / 2) * W}
        cy={((p0.y + p1.y) / 2) * H}
        rx={(Math.abs(p1.x - p0.x) / 2) * W}
        ry={(Math.abs(p1.y - p0.y) / 2) * H}
        {...common}
      />
    );
  };

  const hitRect = (a: Annotation, r: { x0: number; x1: number; y0: number; y1: number }) => {
    if (a.points.length === 0) return false;
    let x0 = 1;
    let y0 = 1;
    let x1 = 0;
    let y1 = 0;
    for (const p of a.points) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    return !(x1 < r.x0 || x0 > r.x1 || y1 < r.y0 || y0 > r.y1);
  };

  const PAD = 5 * scale; // 选框外扩（约 5px）
  const boxOf = (a: Annotation) => {
    let x0 = 1;
    let y0 = 1;
    let x1 = 0;
    let y1 = 0;
    for (const p of a.points) {
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    return {
      x: x0 * W - PAD,
      y: y0 * H - PAD,
      w: Math.max(10, (x1 - x0) * W + PAD * 2),
      h: Math.max(10, (y1 - y0) * H + PAD * 2),
    };
  };

  const renderSelection = (a: Annotation) => {
    const b = boxOf(a);
    const hs = 4 * scale; // 控制点半边（约 4px）
    const corners: [number, number][] = [
      [b.x, b.y],
      [b.x + b.w, b.y],
      [b.x, b.y + b.h],
      [b.x + b.w, b.y + b.h],
    ];
    return (
      <g key={`sel-${a.id}`} pointerEvents="none">
        <rect
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill="rgba(76,201,240,0.10)"
          stroke="#4cc9f0"
          strokeWidth={2 * scale}
          strokeDasharray={`${7 * scale} ${5 * scale}`}
        />
        {corners.map(([hx, hy], i) => (
          <rect
            key={i}
            x={hx - hs}
            y={hy - hs}
            width={hs * 2}
            height={hs * 2}
            fill="#4cc9f0"
            stroke="#fff"
            strokeWidth={1.5 * scale}
          />
        ))}
      </g>
    );
  };

  const cursorStyle = tool ? "crosshair" : "default";

  return (
    <svg
      ref={svgRef}
      className="anno-layer"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ cursor: cursorStyle }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onPointerLeave={() => setCursor(null)}
    >
      {/* 透明捕获层：保证在空白区域也能触发指针事件（修复“画不出来”） */}
      <rect x={0} y={0} width={W} height={H} fill="transparent" pointerEvents="all" />

      {hint && (
        <text x={W / 2} y={40} textAnchor="middle" fill="#ffd166" fontSize={26} opacity={0.85}>
          {hint}
        </text>
      )}

      {annotations.map((a) => (
        <g
          key={a.id}
          onPointerDown={(e) => {
            if (!tool && isEditable(a)) {
              e.stopPropagation();
              const on = selectedIds.includes(a.id);
              onSelect(e.shiftKey ? (on ? selectedIds.filter((x) => x !== a.id) : [...selectedIds, a.id]) : [a.id]);
            }
          }}
        >
          {hitShape(a)}
          {renderShape(a, { selected: selectedIds.includes(a.id) })}
        </g>
      ))}
      {drag && renderShape({ tool: drag.tool, points: drag.points, color, width: 0.004 }, { preview: true })}
      {active && renderShape({ tool: active.tool, points: active.points, color, width: 0.004 })}
      {active?.points.map((p, i) => (
        <circle key={i} cx={p.x * W} cy={p.y * H} r={Math.max(2, 0.004 * W)} fill={color} />
      ))}
      {active && cursor && active.points.length > 0 && (
        <line
          x1={active.points[active.points.length - 1].x * W}
          y1={active.points[active.points.length - 1].y * H}
          x2={cursor.x * W}
          y2={cursor.y * H}
          stroke={color}
          strokeWidth={Math.max(2, 0.004 * W)}
          strokeDasharray="6 6"
          opacity={0.6}
        />
      )}
      {marquee && (
        <rect
          x={Math.min(marquee.a.x, marquee.b.x) * W}
          y={Math.min(marquee.a.y, marquee.b.y) * H}
          width={Math.abs(marquee.b.x - marquee.a.x) * W}
          height={Math.abs(marquee.b.y - marquee.a.y) * H}
          fill="rgba(76,201,240,0.15)"
          stroke="#4cc9f0"
          strokeWidth={2 * scale}
          strokeDasharray={`${7 * scale} ${5 * scale}`}
          pointerEvents="none"
        />
      )}
      {tool === null && annotations.filter((a) => isEditable(a) && selectedIds.includes(a.id)).map(renderSelection)}
    </svg>
  );
}
