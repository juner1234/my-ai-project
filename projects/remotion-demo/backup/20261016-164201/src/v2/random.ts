// === SIGNAL V2 · 确定性伪随机 ===
// 所有"随机"效果均由 (帧号, 种子) 确定性生成，保证任意帧可独立渲染，
// Studio 预览与最终导出完全一致。

export const hash = (...nums: number[]): number => {
  let h = 2166136261;
  for (const n of nums) {
    let x = Math.imul(n | 0, 374761393) ^ 0x5bd1e995;
    x = Math.imul(x ^ (x >>> 15), 2246822507);
    h = Math.imul(h ^ x, 16777619);
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296; // [0, 1)
};

// 映射到 [min, max]
export const hr = (min: number, max: number, ...seed: number): number =>
  min + hash(...seed) * (max - min);

// 映射到整数 [min, max]
export const hi = (min: number, max: number, ...seed: number): number =>
  Math.floor(hr(min, max + 0.999999, ...seed));

// 缓动
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number): number => t * t * t;
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// 线性插值（区间裁剪）
export const lerp = (frame: number, inRange: [number, number], outRange: [number, number], ease?: (t: number) => number): number => {
  let t = (frame - inRange[0]) / (inRange[1] - inRange[0]);
  t = Math.max(0, Math.min(1, t));
  if (ease) t = ease(t);
  return outRange[0] + t * (outRange[1] - outRange[0]);
};
