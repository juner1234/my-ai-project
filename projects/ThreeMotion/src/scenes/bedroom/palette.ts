/**
 * 童话治愈少女风 · 水彩黄昏调色系
 * 统一：低饱和、暖粉/暖黄过渡、哑光、无高光、微噪点
 */
export const C = {
  // === 墙面渐变：奶白 + 粉色融合（上部柔和粉 → 下部奶白）===
  wallTop: "#f0d6df",    // 柔和粉
  wallMid: "#f7e9e6",    // 粉白融合
  wallBase: "#faf3ec",   // 奶白
  wallTrim: "#f5efe8",   // 腰线/踢脚：极浅暖白

  // === 地板：哑光暖木 ===
  floorBase: "#d8c8b8",
  floorGrain: "#c8b8a8",

  // === 木材系：统一哑光、偏暖 ===
  wood: "#c4b098",
  woodWarm: "#cdb8a0",
  woodDark: "#b09880",
  woodPale: "#e8e0d8",

  // === 纺织/主色：全线压低饱和、偏暖 ===
  cream: "#f5f0eb",      // 奶白
  pink: "#e8d0d8",       // 灰粉
  pinkDeep: "#d8b8c4",   // 深灰粉
  pinkPale: "#f2e8ec",   // 极浅粉
  mint: "#d0e8e0",       // 灰薄荷
  mintDeep: "#c0d8d0",
  lavender: "#e0d8e8",   // 灰薰衣草
  lavenderDeep: "#d0c8d8",
  blue: "#d0dce8",       // 灰蓝
  butter: "#f0e8d8",     // 奶黄
  peach: "#f0e0d8",      // 蜜桃奶茶

  // === 金属/金色：全哑光化、极弱 ===
  gold: "#d4c0a0",       // 哑金
  goldSoft: "#e8d8c8",   // 极浅哑金
  roseGold: "#d8c0c8",   // 玫瑰哑金

  // === 植物：灰绿 ===
  leaf: "#b8d0b8",
  leafDeep: "#a8c0a8",
  stem: "#98b098",

  // === 发光/氛围：极弱、暖 ===
  glowWarm: "#f0e0d0",
  glowPink: "#e8d8dc",
  glowMint: "#d8e8e0",
  warmLight: "#ffd8ab",  // 暖光主色：黄昏暖黄（日式治愈）

  // === 阴影/线条：极浅 ===
  line: "#e0d8d8",
  shadow: "rgba(80,70,75,0.04)", // 极淡阴影色
} as const;

/** 通用材质参数：全哑光 */
export const MATTE = {
  roughness: 0.95,
  metalness: 0,
} as const;

/** 微弱自发光（仅用于灯罩内侧等） */
export const SOFT_EMISSIVE = {
  emissiveIntensity: 0.15,
  emissive: "#f0e0d0" as const,
} as const;