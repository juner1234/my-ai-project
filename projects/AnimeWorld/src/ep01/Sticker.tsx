import React from "react";
import { PALETTE, STROKE, FONT } from "./theme";

/**
 * 治愈手账 · 纸质贴画与装饰组件库
 * ------------------------------------------------------------------
 * 特性：
 * 1. 纯手绘矢量 + 白边裁切（Die-cut Sticker）纸质贴画质感；
 * 2. 柔和环境纸质投影（drop shadow）；
 * 3. 元素独立、带旋转与缩放，方便在 Remotion 时间轴上做 Q 弹（spring）跳入；
 * 4. 丰富多样：拍立得、小太阳、云朵、小花、时钟、信封、游戏卡牌、数字徽章、
 *    气泡对话框、彩屑、汗滴、惊吓线、放射爆裂线、波点纸胶带、回形针等。
 */

export type Pos = {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  color?: string;
};

export const baseTransform = (p: Pos) =>
  `translate(${p.x ?? 0} ${p.y ?? 0}) rotate(${p.rotation ?? 0}) scale(${p.scale ?? 1})`;

/** 纸质贴画柔和白边与投影滤镜 Defs（可挂在全局 SVG 顶部） */
export const StickerFilterDefs: React.FC = () => (
  <defs>
    {/* 纸质贴画投影 */}
    <filter id="sticker-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" floodColor="#6B5148" floodOpacity="0.18" />
    </filter>
    {/* 轻微纸面立体厚度 */}
    <filter id="paper-lift" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#6B5148" floodOpacity="0.12" />
    </filter>
  </defs>
);

/** 1. 经典五角星（彩铅描边 + 柔光高光点） */
export const Star: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白色贴纸底模 */}
    <path
      d="M0 -22 L6 -7 L22 -6 L10 5 L14 20 L0 11 L-14 20 L-10 5 L-22 -6 L-6 -7 Z"
      fill="#ffffff"
      stroke="#ffffff"
      strokeWidth={6}
      strokeLinejoin="round"
    />
    <path
      d="M0 -20 L5.5 -6.5 L20 -5.5 L9 4.5 L12.5 18 L0 10 L-12.5 18 L-9 4.5 L-20 -5.5 L-5.5 -6.5 Z"
      fill={p.color ?? PALETTE.creamYellow}
      stroke={STROKE.color}
      strokeWidth={STROKE.fine}
      strokeLinejoin="round"
    />
    {/* 手绘小高光 */}
    <circle cx="-4" cy="-8" r="1.8" fill="#ffffff" opacity={0.85} />
  </g>
);

/** 2. 温暖爱心贴纸（饱满圆润、白边贴画质感） */
export const Heart: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    <path
      d="M0 16 q-20 -15 -20 -28 q0 -13 11 -13 q9 0 9 9 q0 -9 9 -9 q11 0 11 13 q0 13 -20 28 Z"
      fill="#ffffff"
      stroke="#ffffff"
      strokeWidth={6}
    />
    <path
      d="M0 14 q-18 -13 -18 -25 q0 -12 10 -12 q8 0 8 8 q0 -8 8 -8 q10 0 10 12 q0 12 -18 25 Z"
      fill={p.color ?? PALETTE.blush}
      stroke={STROKE.color}
      strokeWidth={STROKE.fine}
    />
    <path d="M-8 -14 q-4 6 0 12" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
  </g>
);

/** 3. 手绘便签纸（带横线、折角与手写文字） */
export const Note: React.FC<Pos & { w?: number; h?: number; text?: string; lines?: number }> = (p) => {
  const w = p.w ?? 200;
  const h = p.h ?? 140;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 白边 */}
      <rect x={-w / 2 - 3} y={-h / 2 - 3} width={w + 6} height={h + 6} rx="10" fill="#ffffff" />
      {/* 便签底 */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="8" fill={p.color ?? PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={STROKE.fine} />
      {/* 顶部彩色装饰胶带头 */}
      <rect x={-36} y={-h / 2 - 8} width={72} height={18} fill={PALETTE.rose} opacity={0.85} transform="rotate(1)" />
      {/* 便签横线 */}
      {Array.from({ length: p.lines ?? 3 }).map((_, i) => (
        <line
          key={i}
          x1={-w / 2 + 20}
          y1={-h / 2 + 36 + i * 26}
          x2={w / 2 - 20}
          y2={-h / 2 + 36 + i * 26}
          stroke={STROKE.color}
          strokeWidth={1.2}
          strokeDasharray="4 4"
          opacity={0.35}
        />
      ))}
      {p.text && (
        <text
          x="0"
          y={h / 2 - 22}
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={PALETTE.latte}
          fontFamily={FONT.subtitle}
        >
          {p.text}
        </text>
      )}
    </g>
  );
};

/** 4. 纸胶带（带斜条纹或波点质感，半透明手账感） */
export const Tape: React.FC<Pos & { w?: number; h?: number; pattern?: "stripe" | "dots" | "plain" }> = (p) => {
  const w = p.w ?? 120;
  const h = p.h ?? 34;
  const bg = p.color ?? PALETTE.rose;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 0.88} filter="url(#paper-lift)">
      {/* 纸胶带两端撕边撕裂牙口效果 */}
      <polygon
        points={`
          ${-w / 2},${-h / 2} 
          ${w / 2},${-h / 2} 
          ${w / 2 - 4},${-h / 4} 
          ${w / 2},0 
          ${w / 2 - 3},${h / 4} 
          ${w / 2},${h / 2} 
          ${-w / 2},${h / 2} 
          ${-w / 2 + 3},${h / 4} 
          ${-w / 2},0 
          ${-w / 2 + 4},${-h / 4}
        `}
        fill={bg}
      />
      {/* 白色半透明斜条纹 */}
      {p.pattern !== "plain" && (
        <g stroke="#ffffff" strokeWidth="2.5" opacity="0.45" strokeLinecap="round">
          {Array.from({ length: 8 }).map((_, i) => {
            const x = -w / 2 + 15 + i * 14;
            return <line key={i} x1={x - 8} y1={h / 2 - 4} x2={x + 8} y2={-h / 2 + 4} />;
          })}
        </g>
      )}
    </g>
  );
};

/** 5. 拍立得照片贴纸（Polaroid：带照片内框、大白边、手写签名） */
export const PolaroidFrame: React.FC<
  Pos & { w?: number; h?: number; title?: string; photoBg?: string; children?: React.ReactNode }
> = (p) => {
  const w = p.w ?? 240;
  const h = p.h ?? 280;
  const innerW = w - 32;
  const innerH = h - 76;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 白色厚底纸 */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="8" fill="#FFFFFF" stroke={STROKE.color} strokeWidth={STROKE.fine} />
      {/* 照片内视窗 */}
      <rect
        x={-innerW / 2}
        y={-h / 2 + 18}
        width={innerW}
        height={innerH}
        rx="4"
        fill={p.photoBg ?? PALETTE.paperWarm}
        stroke={STROKE.color}
        strokeWidth={1.2}
      />
      {p.children && <g transform={`translate(0 ${-h / 2 + 18 + innerH / 2})`}>{p.children}</g>}
      {/* 照片下方手写标题 */}
      {p.title && (
        <text
          x="0"
          y={h / 2 - 18}
          textAnchor="middle"
          fontSize="22"
          fill={PALETTE.latte}
          fontFamily={FONT.subtitle}
        >
          {p.title}
        </text>
      )}
      {/* 顶部固定的小纸胶带 */}
      <Tape y={-h / 2 + 2} w={64} h={22} rotation={-3} color={PALETTE.creamPinkDeep} />
    </g>
  );
};

/** 6. 拟人小太阳贴纸（眨眼笑脸 + 腮红） */
export const SunSticker: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白边 */}
    <circle cx="0" cy="0" r="38" fill="#ffffff" />
    {/* 光芒 */}
    {Array.from({ length: 8 }).map((_, i) => (
      <line
        key={i}
        x1="0"
        y1="-32"
        x2="0"
        y2="-42"
        stroke={PALETTE.creamYellow}
        strokeWidth={5}
        strokeLinecap="round"
        transform={`rotate(${i * 45})`}
      />
    ))}
    {/* 太阳圆脸 */}
    <circle cx="0" cy="0" r="30" fill={p.color ?? PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    {/* 萌眼笑脸 */}
    <path d="M-10 -3 q4 -5 8 0 M2 -3 q4 -5 8 0" fill="none" stroke={STROKE.color} strokeWidth={2} strokeLinecap="round" />
    <path d="M-6 8 q6 6 12 0" fill="none" stroke={STROKE.color} strokeWidth={2} strokeLinecap="round" />
    {/* 腮红 */}
    <circle cx="-13" cy="5" r="4.5" fill={PALETTE.blush} opacity={0.7} />
    <circle cx="13" cy="5" r="4.5" fill={PALETTE.blush} opacity={0.7} />
  </g>
);

/** 7. 手绘云朵贴纸（蓬松柔软） */
export const CloudSticker: React.FC<Pos & { w?: number }> = (p) => {
  const s = p.scale ?? 1;
  return (
    <g transform={baseTransform({ ...p, scale: s })} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 白边底模 */}
      <path
        d="M-50 15 a20 20 0 0 1 12 -28 a26 26 0 0 1 42 -8 a22 22 0 0 1 34 16 a18 18 0 0 1 8 20 z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path
        d="M-48 14 a19 19 0 0 1 11 -26 a24 24 0 0 1 40 -8 a21 21 0 0 1 32 15 a17 17 0 0 1 8 19 z"
        fill={p.color ?? "#ffffff"}
        stroke={STROKE.color}
        strokeWidth={STROKE.fine}
        strokeLinejoin="round"
      />
      {/* 云朵内部淡淡手绘线条 */}
      <circle cx="-12" cy="0" r="1.5" fill={PALETTE.milkBlue} />
      <circle cx="6" cy="-4" r="1.5" fill={PALETTE.milkBlue} />
    </g>
  );
};

/** 8. 小雏菊花朵贴纸（Daisy） */
export const FlowerSticker: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白边 */}
    <circle cx="0" cy="0" r="28" fill="#ffffff" />
    {/* 8 个花瓣 */}
    {Array.from({ length: 8 }).map((_, i) => (
      <ellipse
        key={i}
        cx="0"
        cy="-14"
        rx="7"
        ry="11"
        fill={p.color ?? PALETTE.creamPink}
        stroke={STROKE.color}
        strokeWidth={STROKE.fine}
        transform={`rotate(${i * 45})`}
      />
    ))}
    {/* 花蕊 */}
    <circle cx="0" cy="0" r="9" fill={PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={STROKE.fine} />
  </g>
);

/** 9. 爱心信封贴纸（Heart Envelope：写给最爱我的妈妈） */
export const HeartEnvelope: React.FC<Pos & { w?: number; h?: number }> = (p) => {
  const w = p.w ?? 220;
  const h = p.h ?? 160;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 白底模 */}
      <rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} rx="12" fill="#ffffff" />
      {/* 信封本体 */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="8" fill={PALETTE.offWhite} stroke={STROKE.color} strokeWidth={STROKE.fine} />
      {/* 信封折痕 */}
      <path d={`M${-w / 2} ${-h / 2} L0 16 L${w / 2} ${-h / 2}`} fill="none" stroke={STROKE.color} strokeWidth={STROKE.fine} />
      <path d={`M${-w / 2} ${h / 2} L${-w / 6} 0 M${w / 2} ${h / 2} L${w / 6} 0`} fill="none" stroke={STROKE.color} strokeWidth={1.5} opacity={0.6} />
      {/* 封口大爱心印章 */}
      <g transform="translate(0, 14) scale(0.95)">
        <Heart />
      </g>
      {/* 手绘邮戳与标签 */}
      <rect x={-w / 2 + 16} y={-h / 2 + 16} width={50} height={34} rx="4" fill={PALETTE.rose} stroke={STROKE.color} strokeWidth={1.2} />
      <text x={-w / 2 + 41} y={-h / 2 + 39} textAnchor="middle" fontSize="16" fill="#ffffff" fontFamily={FONT.subtitle}>
        MOM
      </text>
    </g>
  );
};

/** 10. 闹钟贴纸（Clock：晨起挑选新衣服） */
export const ClockSticker: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白边 */}
    <circle cx="0" cy="0" r="36" fill="#ffffff" />
    {/* 闹钟双耳 */}
    <circle cx="-24" cy="-24" r="10" fill={PALETTE.wood} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    <circle cx="24" cy="-24" r="10" fill={PALETTE.wood} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    {/* 闹钟双脚 */}
    <path d="M-18 26 L-26 38 M18 26 L26 38" stroke={STROKE.color} strokeWidth={3} strokeLinecap="round" />
    {/* 表盘 */}
    <circle cx="0" cy="0" r="28" fill={p.color ?? PALETTE.paperWarm} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    {/* 刻度与指针（8:00 AM） */}
    <circle cx="0" cy="0" r="2.5" fill={STROKE.color} />
    <line x1="0" y1="0" x2="0" y2="-16" stroke={STROKE.color} strokeWidth={2.5} strokeLinecap="round" />
    <line x1="0" y1="0" x2="-12" y2="7" stroke={STROKE.color} strokeWidth={2} strokeLinecap="round" />
  </g>
);

/** 11. 手绘沉思气泡（Thought Bubbles） */
export const ThoughtBubbles: React.FC<Pos & { children?: React.ReactNode }> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    <circle cx="-42" cy="38" r="6" fill="#ffffff" stroke={STROKE.color} strokeWidth={STROKE.fine} />
    <circle cx="-28" cy="22" r="10" fill="#ffffff" stroke={STROKE.color} strokeWidth={STROKE.fine} />
    {/* 主气泡 */}
    <ellipse cx="20" cy="-10" rx="80" ry="55" fill="#ffffff" stroke={STROKE.color} strokeWidth={STROKE.fine} />
    {p.children && <g transform="translate(20 -10)">{p.children}</g>}
  </g>
);

/** 12. 换装游戏 SSR 卡牌（GameCard：奇迹暖暖） */
export const GameCard: React.FC<Pos & { rank?: string; score?: string; title?: string }> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白色贴画边框 */}
    <rect x="-95" y="-135" width="190" height="270" rx="14" fill="#ffffff" />
    {/* 卡牌本体 */}
    <rect x="-90" y="-130" width="180" height="260" rx="10" fill={PALETTE.paperWarm} stroke={PALETTE.creamPinkDeep} strokeWidth={3} />
    <rect x="-82" y="-122" width="164" height="244" rx="8" fill="none" stroke={PALETTE.creamYellow} strokeWidth={1.5} strokeDasharray="6 4" />
    {/* 顶部 SSR 徽章 */}
    <rect x="-45" y="-120" width="90" height="28" rx="6" fill={PALETTE.rose} stroke={STROKE.color} strokeWidth={1.5} />
    <text x="0" y="-100" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#ffffff" fontFamily={FONT.subtitle}>
      {p.rank ?? "SSR ★★★"}
    </text>
    {/* 标题 */}
    <text x="0" y="80" textAnchor="middle" fontSize="19" fill={PALETTE.latte} fontFamily={FONT.subtitle}>
      {p.title ?? "梦幻甜心裙"}
    </text>
    {/* 底部搭配分数 */}
    <rect x="-65" y="94" width="130" height="24" rx="12" fill={PALETTE.creamYellow} />
    <text x="0" y="112" textAnchor="middle" fontSize="15" fontWeight="bold" fill={PALETTE.latte} fontFamily={FONT.subtitle}>
      {p.score ?? "美感 +9999"}
    </text>
  </g>
);

/** 13. 皇冠贴纸（Crown） */
export const CrownSticker: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    <path
      d="M-28 16 L-34 -14 L-12 2 L0 -20 L12 2 L34 -14 L28 16 Z"
      fill="#ffffff"
      stroke="#ffffff"
      strokeWidth={6}
      strokeLinejoin="round"
    />
    <path
      d="M-26 14 L-32 -12 L-11 2 L0 -18 L11 2 L32 -12 L26 14 Z"
      fill={p.color ?? PALETTE.creamYellow}
      stroke={STROKE.color}
      strokeWidth={STROKE.fine}
      strokeLinejoin="round"
    />
    <circle cx="-32" cy="-12" r="3.5" fill={PALETTE.rose} stroke={STROKE.color} strokeWidth={1.2} />
    <circle cx="0" cy="-18" r="4.2" fill={PALETTE.milkBlue} stroke={STROKE.color} strokeWidth={1.2} />
    <circle cx="32" cy="-12" r="3.5" fill={PALETTE.rose} stroke={STROKE.color} strokeWidth={1.2} />
  </g>
);

/** 14. 计数圆标贴纸（一件、两件、三件……数字印章） */
export const TallyNumber: React.FC<Pos & { num: string; label?: string }> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    {/* 白色白边 */}
    <circle cx="0" cy="0" r="36" fill="#ffffff" />
    <circle cx="0" cy="0" r="30" fill={p.color ?? PALETTE.creamPinkDeep} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    <circle cx="0" cy="0" r="25" fill="none" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" />
    <text x="0" y="10" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#ffffff" fontFamily={FONT.subtitle}>
      {p.num}
    </text>
    {p.label && (
      <text x="0" y="48" textAnchor="middle" fontSize="20" fontWeight="bold" fill={PALETTE.latte} fontFamily={FONT.subtitle}>
        {p.label}
      </text>
    )}
  </g>
);

/** 15. 汗滴贴纸（SweatDrop：失宠 / 关不上时的戏剧小点缀） */
export const SweatDrop: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    <path
      d="M0 -22 C-14 -6 -14 12 0 16 C14 12 14 -6 0 -22 Z"
      fill={p.color ?? PALETTE.milkBlue}
      stroke={STROKE.color}
      strokeWidth={STROKE.fine}
    />
    <path d="M-4 -4 A6 6 0 0 1 -4 8" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
  </g>
);

/** 16. 惊吓抖动线（Shock Lines / Stress marks） */
export const ShockLines: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} stroke={STROKE.color} strokeWidth={2.6} strokeLinecap="round">
    <line x1="-24" y1="-20" x2="-38" y2="-32" />
    <line x1="0" y1="-26" x2="0" y2="-42" />
    <line x1="24" y1="-20" x2="38" y2="-32" />
  </g>
);

/** 17. 漫画手绘对话框（Speech Bubble） */
export const SpeechBubble: React.FC<Pos & { w?: number; h?: number; text?: string }> = (p) => {
  const w = p.w ?? 260;
  const h = p.h ?? 110;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 气泡白边底模 */}
      <path
        d={`M${-w / 2 - 4} ${-h / 2 - 4} h${w + 8} a16 16 0 0 1 16 16 v${h - 24} a16 16 0 0 1 -16 16 h${-w / 2} l-20 22 l6 -22 h${-w / 2 + 14} a16 16 0 0 1 -16 -16 v${-(h - 24)} a16 16 0 0 1 16 -16 z`}
        fill="#ffffff"
      />
      {/* 气泡主体 */}
      <path
        d={`M${-w / 2} ${-h / 2} h${w} a12 12 0 0 1 12 12 v${h - 24} a12 12 0 0 1 -12 12 h${-w / 2} l-18 18 l5 -18 h${-w / 2 + 13} a12 12 0 0 1 -12 -12 v${-(h - 24)} a12 12 0 0 1 12 -12 z`}
        fill={p.color ?? "#ffffff"}
        stroke={STROKE.color}
        strokeWidth={STROKE.fine}
      />
      {p.text && (
        <text
          x="0"
          y="6"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill={PALETTE.latte}
          fontFamily={FONT.subtitle}
        >
          {p.text}
        </text>
      )}
    </g>
  );
};

/** 18. 彩色纸屑飘散（Confetti：烘托温馨与高潮） */
export const ConfettiPiece: React.FC<Pos & { shape?: "rect" | "circle" | "ribbon" }> = (p) => {
  const shape = p.shape ?? "rect";
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 0.85}>
      {shape === "rect" ? (
        <rect x="-8" y="-5" width="16" height="10" rx="2" fill={p.color ?? PALETTE.creamPink} stroke={STROKE.color} strokeWidth={0.8} />
      ) : shape === "circle" ? (
        <circle cx="0" cy="0" r="6" fill={p.color ?? PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={0.8} />
      ) : (
        <path d="M-10 -4 Q0 8 10 -4" fill="none" stroke={p.color ?? PALETTE.milkBlue} strokeWidth={3} strokeLinecap="round" />
      )}
    </g>
  );
};

/** 19. 礼物盒贴纸（Gift Box：妈妈又买新衣服） */
export const GiftBox: React.FC<Pos & { size?: number }> = (p) => {
  const s = p.size ?? 80;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      {/* 盒子 */}
      <rect x={-s / 2} y={-s / 2 + 14} width={s} height={s - 14} rx="6" fill={p.color ?? PALETTE.creamPink} stroke={STROKE.color} strokeWidth={STROKE.fine} />
      {/* 盒盖 */}
      <rect x={-s / 2 - 5} y={-s / 2} width={s + 10} height="16" rx="4" fill={PALETTE.creamYellow} stroke={STROKE.color} strokeWidth={STROKE.fine} />
      {/* 丝带 */}
      <rect x="-7" y={-s / 2} width="14" height={s} fill={PALETTE.rose} />
      {/* 顶部蝴蝶结 */}
      <path d="M-14 -s/2-6 q-10 -12 0 -12 q10 4 14 12 q4 -8 14 -12 q10 0 0 12 Z" fill={PALETTE.rose} stroke={STROKE.color} strokeWidth={STROKE.fine} />
    </g>
  );
};

/** 20. 手绘大问号贴纸（带白边） */
export const QMark: React.FC<Pos> = (p) => (
  <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
    <path
      d="M-5 -22 q18 -14 22 8 q3 14 -10 18 q-6 3 -6 12"
      fill="none"
      stroke="#ffffff"
      strokeWidth={10}
      strokeLinecap="round"
    />
    <circle cx="1" cy="24" r="5" fill="#ffffff" />
    <path
      d="M-5 -22 q18 -14 22 8 q3 14 -10 18 q-6 3 -6 12"
      fill="none"
      stroke={p.color ?? STROKE.color}
      strokeWidth={STROKE.fine * 1.5}
      strokeLinecap="round"
    />
    <circle cx="1" cy="24" r="3.8" fill={p.color ?? STROKE.color} />
  </g>
);

/** 21. 手绘箭头贴纸 */
export const Arrow: React.FC<Pos & { len?: number }> = (p) => {
  const len = p.len ?? 110;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1} filter="url(#sticker-shadow)">
      <path d={`M0 0 q ${len * 0.5} -20 ${len} 0`} fill="none" stroke="#ffffff" strokeWidth={9} strokeLinecap="round" />
      <path d={`M0 0 q ${len * 0.5} -20 ${len} 0`} fill="none" stroke={STROKE.color} strokeWidth={STROKE.fine * 1.3} strokeLinecap="round" />
      <polygon points={`${len},0 ${len - 14},-10 ${len - 8},0 ${len - 14},10`} fill={STROKE.color} stroke="#ffffff" strokeWidth={2} />
    </g>
  );
};

/** 22. 漫画放射爆裂线（Burst Rays：“亿点点”高潮用） */
export const BurstRays: React.FC<Pos & { count?: number; rInner?: number; rOuter?: number }> = (p) => {
  const count = p.count ?? 16;
  const rIn = p.rInner ?? 160;
  const rOut = p.rOuter ?? 480;
  const angleStep = 360 / count;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 0.65}>
      {Array.from({ length: count }).map((_, i) => {
        const a1 = ((i * angleStep - 4) * Math.PI) / 180;
        const a2 = ((i * angleStep + 4) * Math.PI) / 180;
        const aMid = ((i * angleStep) * Math.PI) / 180;
        const x1 = Math.cos(a1) * rIn;
        const y1 = Math.sin(a1) * rIn;
        const x2 = Math.cos(a2) * rIn;
        const y2 = Math.sin(a2) * rIn;
        const x3 = Math.cos(aMid) * rOut;
        const y3 = Math.sin(aMid) * rOut;
        return (
          <polygon
            key={i}
            points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`}
            fill={i % 2 === 0 ? PALETTE.creamYellow : PALETTE.creamPink}
            opacity={0.5}
          />
        );
      })}
    </g>
  );
};

/** 23. 手账虚线框（Dashed Frame） */
export const DashedFrame: React.FC<Pos & { w?: number; h?: number }> = (p) => {
  const w = p.w ?? 300;
  const h = p.h ?? 200;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 1}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx="16"
        fill={p.color ?? "none"}
        stroke={STROKE.color}
        strokeWidth={STROKE.fine}
        strokeDasharray="10 8"
      />
    </g>
  );
};

/** 24. 手绘波浪涂鸦线（Squiggle） */
export const Squiggle: React.FC<Pos & { w?: number }> = (p) => {
  const w = p.w ?? 80;
  return (
    <g transform={baseTransform(p)} opacity={p.opacity ?? 0.8}>
      <path
        d={`M0 0 q ${w / 4} -14 ${w / 2} 0 q ${w / 4} 14 ${w / 2} 0`}
        fill="none"
        stroke={p.color ?? STROKE.color}
        strokeWidth={STROKE.fine}
        strokeLinecap="round"
      />
    </g>
  );
};
