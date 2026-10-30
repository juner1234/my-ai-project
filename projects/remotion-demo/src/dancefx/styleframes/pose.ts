import pose from "./pose.json";
type P = [number, number, number] | null;
const RAW = pose as unknown as {
  joints: string[];
  frames: P[][];
  width: number;
  height: number;
  fps: number;
};
export const POSE_W = RAW.width;
export const POSE_H = RAW.height;
export const POSE_FPS = RAW.fps;
const IDX: Record<string, number> = {};
RAW.joints.forEach((n, i) => (IDX[n] = i));

/** 取某帧归一化关节坐标 [x,y,vis]，越界返回 null（只读，复用自己的 motion.json） */
export function jointAt(name: string, frame: number): P {
  const i = Math.max(0, Math.min(RAW.frames.length - 1, Math.round(frame)));
  return RAW.frames[i]?.[IDX[name]] ?? null;
}

/** 取某帧像素关节坐标 [x,y]，缺失返回 null */
export function jointPx(name: string, frame: number): [number, number] | null {
  const p = jointAt(name, frame);
  return p ? [p[0] * POSE_W, p[1] * POSE_H] : null;
}

/** 相对基帧的像素漂移，让效果跟随舞者位移；不可用时为 [0,0] */
export function driftPx(name: string, frame: number, baseFrame: number): [number, number] {
  const a = jointAt(name, frame);
  const b = jointAt(name, baseFrame);
  if (!a || !b) return [0, 0];
  return [(a[0] - b[0]) * POSE_W, (a[1] - b[1]) * POSE_H];
}

export const POSE_FRAME_COUNT = RAW.frames.length;
