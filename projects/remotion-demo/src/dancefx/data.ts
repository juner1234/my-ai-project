// DanceFX 渲染数据与几何工具（由 dancefx/scripts/gen_render_data.py 生成）
import raw from "./dancefx-data.json";

export type Pt = [number, number];
export interface Ann {
  tool: "pen" | "arrow" | "ellipse";
  points: Pt[];
}
export interface FXNode {
  id: string;
  startFrame: number;
  durationFrames: number;
  followTarget: "none" | "left_wrist" | "right_wrist" | "left_elbow" | "right_elbow" | "head" | "body_center";
  color: string;
  description: string;
  annotations: Ann[];
}
export interface DanceData {
  video: { file: string; width: number; height: number; fps: number; frames: number };
  nodes: FXNode[];
  anchors: Record<string, (Pt | null)[]>;
}

export const DATA = raw as unknown as DanceData;

/** 取某帧的归一化锚点；越界或缺失返回 null */
export function anchorAt(target: string, frame: number): Pt | null {
  const arr = DATA.anchors[target];
  if (!arr) return null;
  const f = Math.max(0, Math.min(arr.length - 1, Math.round(frame)));
  return arr[f] ?? null;
}

/** 相对节点起点的锚点漂移（像素）——让效果跟随舞者位移；不可用时为 0 */
export function driftPx(target: string, frame: number, startFrame: number, w: number, h: number): Pt {
  const a = anchorAt(target, frame);
  const b = anchorAt(target, startFrame);
  if (!a || !b) return [0, 0];
  return [(a[0] - b[0]) * w, (a[1] - b[1]) * h];
}

/** Catmull-Rom 采样：给定归一化控制点，返回 t∈[0,1] 的归一化位置 */
export function samplePath(points: Pt[], t: number): Pt {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  const n = points.length - 1;
  const x = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const lt = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n, i + 2)];
  const cr = (a: number, b: number, c: number, d: number) => {
    const t2 = lt * lt;
    const t3 = t2 * lt;
    return 0.5 * (2 * b + (-a + c) * lt + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  };
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}

export const toPx = (p: Pt, w: number, h: number): Pt => [p[0] * w, p[1] * h];

/** 归一化点列表 → "x,y x,y ..." 字符串（像素） */
export function polylinePx(points: Pt[], w: number, h: number): string {
  return points.map((p) => `${p[0] * w},${p[1] * h}`).join(" ");
}
