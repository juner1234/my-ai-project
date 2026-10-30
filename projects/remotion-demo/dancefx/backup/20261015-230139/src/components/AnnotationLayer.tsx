import { useRef, useState } from "react";
import type { Annotation, AnnotationTool, Point } from "../types";

interface Props {
  annotations: Annotation[];           // 当前选中节点的标注
  tool: AnnotationTool | null;         // null = 不绘制（指针不可用）
  color: string;
  timeVisible: boolean;                // 当前时间是否在选中节点范围内
  onAdd: (a: Annotation) => void;
}

/** 左侧画面上的创意标注层：自由绘制 / 箭头 / 圈选，全部归一化坐标 */
export default function AnnotationLayer({ annotations, tool, color, timeVisible, onAdd }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<{ tool: AnnotationTool; points: Point[] } | null>(null);

  const toNorm = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const down = (e: React.PointerEvent) => {
    if (!tool) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrawing({ tool, points: [toNorm(e)] });
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = toNorm(e);
    if (drawing.tool === "pen") {
      setDrawing({ ...drawing, points: [...drawing.points, p] });
    } else {
      setDrawing({ ...drawing, points: [drawing.points[0], p] });
    }
  };
  const up = () => {
    if (!drawing) return;
    const enough =
      drawing.tool === "pen"
        ? drawing.points.length > 2
        : Math.hypot(
            drawing.points[1].x - drawing.points[0].x,
            drawing.points[1].y - drawing.points[0].y,
          ) > 0.01;
    if (enough) {
      onAdd({
        id: `ann-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        tool: drawing.tool,
        points: drawing.points,
        color,
        width: 0.004,
        createdAt: new Date().toISOString(),
      });
    }
    setDrawing(null);
  };

  const W = 1000;
  const H = 800;
  const px = (p: Point) => `${p.x * W},${p.y * H}`;
  const renderShape = (a: Annotation, live = false) => {
    const key = live ? "live" : a.id;
    if (a.tool === "pen") {
      return (
        <polyline
          key={key}
          points={a.points.map(px).join(" ")}
          fill="none"
          stroke={a.color}
          strokeWidth={a.width * W}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
        />
      );
    }
    const [p0, p1] = [a.points[0], a.points[a.points.length - 1]];
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
        <g key={key} stroke={a.color} fill={a.color} opacity={0.95}>
          <line x1={p0.x * W} y1={p0.y * H} x2={p1.x * W} y2={p1.y * H} strokeWidth={a.width * W} />
          <polygon
            points={`${px(p1)} ${px(h1)} ${px(h2)}`}
            strokeWidth={0}
            stroke="none"
          />
        </g>
      );
    }
    // ellipse
    const cx = ((p0.x + p1.x) / 2) * W;
    const cy = ((p0.y + p1.y) / 2) * H;
    const rx = (Math.abs(p1.x - p0.x) / 2) * W;
    const ry = (Math.abs(p1.y - p0.y) / 2) * H;
    return (
      <ellipse
        key={key}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={a.color}
        strokeWidth={a.width * W}
        opacity={0.95}
      />
    );
  };

  const showAnnotations = timeVisible;
  const cursor = tool ? "crosshair" : "default";

  return (
    <svg
      ref={svgRef}
      className="anno-layer"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ cursor }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      {showAnnotations && annotations.map((a) => renderShape(a))}
      {drawing && renderShape({ ...draft(drawing), color, width: 0.004 }, true)}
      {tool && !timeVisible && (
        <text x={W / 2} y={40} textAnchor="middle" fill="#f0a" fontSize={20} opacity={0.8}>
          当前时间不在选中节点范围内，绘制不会保存
        </text>
      )}
    </svg>
  );
}

function draft(d: { tool: AnnotationTool; points: Point[] }): Annotation {
  return {
    id: "draft",
    tool: d.tool,
    points: d.points,
    color: "#fff",
    width: 0.004,
    createdAt: "",
  };
}
