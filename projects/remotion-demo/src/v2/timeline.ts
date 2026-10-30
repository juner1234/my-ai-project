// === SIGNAL V2 · 全片时间轴（单一事实来源） ===
// 360 帧 @30fps = 12.000s
// 统一节拍：1 拍 = 10 帧 = 0.333s → 180 BPM（4分音符网格），体感 90 BPM half-time。
// 校正说明：阶段A报告中"90BPM 每12帧一拍"为计算错误（12帧/拍实为150BPM）。
// 全片以 10 帧/拍为唯一拍网格；每小节 4/4 = 40 帧 = 1.333s；全片 9 小节。
// 阶段边界全部落在拍点（10 帧网格）上。

export const FPS = 30;
export const TOTAL_FRAMES = 360;
export const BEAT = 10; // 帧/拍 @180BPM
export const BAR = 40; // 帧/小节（4/4）

export type Segment = {
  id: number;
  name: string;
  start: number;
  end: number;
  motif: string; // 该阶段动机形态
};

export const SEGMENTS: Segment[] = [
  { id: 1, name: "CAPTURE", start: 0, end: 39, motif: "隐约出现（单音 D4，远）" },
  { id: 2, name: "PROPAGATION", start: 40, end: 89, motif: "完整呈现（D4-F4-G4-A4）" },
  { id: 3, name: "INTERFERENCE", start: 90, end: 139, motif: "切碎失真（碎片+位深压缩）" },
  { id: 4, name: "HOLD", start: 140, end: 159, motif: "长音（A4 持续+颤音）" },
  { id: 5, name: "OVERLOAD", start: 160, end: 259, motif: "强化（8度+失真+极速连打）" },
  { id: 6, name: "RECONSTRUCT", start: 260, end: 309, motif: "恢复（干净再现）" },
  { id: 7, name: "ARCHIVE", start: 310, end: 359, motif: "完整收束（四音陈述+尾音）" },
];

export const segmentAt = (frame: number): Segment =>
  SEGMENTS.find((s) => frame >= s.start && frame <= s.end) ?? SEGMENTS[SEGMENTS.length - 1];

// 动机 D4–F4–G4–A4
export const MOTIF = [293.66, 349.23, 392.0, 440.0];

// —— 音画同步关键事件（帧）——
// 音乐重击 / 视觉冲击 / 段落过渡的对齐锚点
export const SYNC_EVENTS: { frame: number; music: string; visual: string }[] = [
  { frame: 0, music: "sub kick + pad 淡入", visual: "Shot01 点阵/扫描线起" },
  { frame: 20, music: "kick + 隐约 D4（远）", visual: "捕获框收缩锁定" },
  { frame: 30, music: "up-sweep 起（→Shot02）", visual: "捕获确认脉冲" },
  { frame: 40, music: "motif D4 完整 + kick 实", visual: "Shot02 网格展开起" },
  { frame: 50, music: "motif F4 + kick", visual: "PROPAGATION 大字起（stagger）" },
  { frame: 60, music: "motif G4 + kick", visual: "网格密度硬切 40→20px" },
  { frame: 70, music: "motif A4 + kick", visual: "波形振幅阶梯升级" },
  { frame: 88, music: "down-sweep + 噪声闪", visual: "整屏反相 2 帧转场" },
  { frame: 90, music: "motif 碎片化失真 + kick", visual: "Shot03 干涉波形/切割大字起" },
  { frame: 102, music: "glitch 点缀", visual: "象限轮换 Q2（F102–113）" },
  { frame: 114, music: "glitch 点缀", visual: "象限轮换 Q3（F114–125）" },
  { frame: 126, music: "glitch 点缀", visual: "象限轮换 Q4（F126–137）" },
  { frame: 140, music: "全轨 DROP：A4 长音 + pad", visual: "Shot04 停帧 + 单帧反相" },
  { frame: 155, music: "up-sweep 蓄力（→Shot05）", visual: "网格向心收缩预兆" },
  { frame: 160, music: "段落重击 + 加密 kick", visual: "Shot05 A段加速（OVERLOAD 字距拉开）" },
  { frame: 190, music: "kick 加密 + tick", visual: "Shot05 字母漂移加剧" },
  { frame: 196, music: "tick（白闪）", visual: "单帧冲击白闪 F196" },
  { frame: 208, music: "tick（白闪）", visual: "单帧冲击白闪 F208" },
  { frame: 218, music: "tick（白闪）", visual: "单帧冲击白闪 F218" },
  { frame: 225, music: "次重击 impact", visual: "Shot05 C段字母聚合冲击" },
  { frame: 240, music: "★ IMPACT（80→30Hz 下潜）+ motif 极速连打", visual: "★ 单次 2 帧全屏白闪" },
  { frame: 260, music: "up-sweep + 规整节拍恢复", visual: "Shot06 字母归位重构起" },
  { frame: 280, music: "kick + 网格归位", visual: "网格回归规整 40px" },
  { frame: 300, music: "pad 主导", visual: "SIGNAL 字标预览浮现" },
  { frame: 310, music: "motif 收束陈述 D4", visual: "Shot07 SIGNAL 大字标起" },
  { frame: 320, music: "motif F4 + kick", visual: "版面边框收拢" },
  { frame: 330, music: "motif G4", visual: "读数归位 ARCHIVED" },
  { frame: 340, music: "motif A4 + 最后 kick", visual: "最后一次拍点脉冲环" },
  { frame: 350, music: "全轨淡出（pad+reverb 尾）", visual: "元素渐次淡出，SIGNAL 定格" },
];
