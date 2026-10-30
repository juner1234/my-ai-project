/**
 * EP01 统一美术规范（唯一基准 = 现有暖暖人物画风）
 * ------------------------------------------------------------------
 * 所有场景元素共用此色板与线条规范，避免混搭异风格。
 * 本版调整：降低饱和度/对比度，线条改为浅棕铅笔色，供手绘彩铅绘本感。
 */

export const PALETTE = {
  paper: "#FBF6EE",
  paperWarm: "#F6EFE4",
  creamPink: "#F3D9DF", // 奶油粉（主，降低饱和）
  creamPinkDeep: "#EBC3CC",
  creamYellow: "#F5E8C6",
  wood: "#CBAD91", // 浅木棕（柔和）
  woodDeep: "#B4977C",
  offWhite: "#F2E9DF",
  milkBlue: "#D6E3E8",
  rose: "#EBD0D4",
  grayBlue: "#BFC7CE",
  pencil: "#9C7B63", // 铅笔轮廓线（浅棕，非纯黑）
  blush: "#F1C7CD",
  latte: "#8A7466", // 字幕颜色（深奶茶）
} as const;

/** 线条规范：与人物线条粗细一致的软手绘描边 */
export const STROKE = {
  main: 2.6,
  fine: 1.5,
  color: PALETTE.pencil,
  opacity: 0.62,
} as const;

export const FONT = {
  subtitle: "'ZCOOL KuaiLe', 'Huninn', 'Noto Sans SC', sans-serif",
  label: "'Huninn', 'ZCOOL KuaiLe', sans-serif",
} as const;

export const CANVAS = { width: 1920, height: 1080, fps: 24 } as const;

export const ROUGH_FILTER_ID = "ep01-hand";
