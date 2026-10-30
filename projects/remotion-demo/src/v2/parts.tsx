// === SIGNAL V2 · 可复用视觉部件 ===
// SVG 图形层 + HTML 字体排版层。标注字号 ≥18px（手机竖屏可读性优先）。

import React from "react";
import { hash, hr, lerp, easeOutCubic } from "./random";

// —— 配色 ——
export const BLACK = "#000000";
export const WHITE = "#FFFFFF";
export const CYAN = "#6EC5DB";
export const MONO = '"SF Mono", Menlo, "Courier New", monospace';
export const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// —— 动态网格 ——
// bounds: [x1,y1,x2,y2] 框定区域（瑞士式框定，不铺全屏）
export const Grid: React.FC<{
  frame: number;
  spacing: number;
  bounds: [number, number, number, number];
  opacity?: number;
  offsetY?: number;
  reveal?: number; // 0–1 从中心展开
}> = ({ frame, spacing, bounds, opacity = 0.35, offsetY = 0, reveal = 1 }) => {
  const [x1, y1, x2, y2] = bounds;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const halfW = ((x2 - x1) / 2) * reveal;
  const halfH = ((y2 - y1) / 2) * reveal;
  const lines: React.ReactNode[] = [];
  const startX = Math.ceil((cx - halfW) / spacing) * spacing;
  const endX = cx + halfW;
  for (let x = startX; x <= endX; x += spacing) {
    lines.push(<line key={`v${x}`} x1={x} y1={cy - halfH} x2={x} y2={cy + halfH} />);
  }
  const startY = Math.ceil((cy - halfH + offsetY) / spacing) * spacing;
  const endY = cy + halfH + offsetY;
  for (let y = startY; y <= endY; y += spacing) {
    lines.push(<line key={`h${y}`} x1={cx - halfW} y1={y} x2={cx + halfW} y2={y} />);
  }
  return (
    <g stroke={WHITE} strokeWidth={1} opacity={opacity}>
      {lines}
    </g>
  );
};

// —— 同心圆组 ——
export const Rings: React.FC<{
  cx: number;
  cy: number;
  radii: number[];
  colors?: string[];
  strokeWidth?: number;
  opacity?: number;
  rotations?: number[]; // 每环旋转角（度），用于虚线环的方向感
  dash?: number;
}> = ({ cx, cy, radii, colors, strokeWidth = 1.5, opacity = 1, rotations, dash }) => (
  <g opacity={opacity}>
    {radii.map((r, i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={colors ? colors[i % colors.length] : WHITE}
        strokeWidth={strokeWidth}
        strokeDasharray={dash ? `${dash} ${dash * 1.6}` : undefined}
        transform={rotations ? `rotate(${rotations[i] % 360} ${cx} ${cy})` : undefined}
      />
    ))}
  </g>
);

// —— 参数化波形线 ——
export const WaveLines: React.FC<{
  frame: number;
  x: number;
  y: number;
  w: number;
  count: number;
  amp: number;
  color?: string;
  speed?: number;
}> = ({ frame, x, y, w, count, amp, color = WHITE, speed = 0.22 }) => {
  const paths: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const phase = frame * speed + i * 0.9;
    let d = `M ${x} ${y + i * 26}`;
    for (let px = 0; px <= w; px += 8) {
      const yy =
        y + i * 26 +
        Math.sin(phase + px * 0.02) * amp * (0.6 + 0.4 * Math.sin(px * 0.008 + i)) +
        Math.sin(phase * 1.7 + px * 0.045) * amp * 0.3;
      d += ` L ${x + px} ${yy}`;
    }
    paths.push(<path key={i} d={d} fill="none" stroke={color} strokeWidth={1.2} opacity={0.85} />);
  }
  return <g>{paths}</g>;
};

// —— 频率柱状条 ——
export const FreqBars: React.FC<{
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  color?: string;
}> = ({ frame, x, y, w, h, count, color = WHITE }) => {
  const bw = Math.floor(w / (count * 2));
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const v = 0.25 + 0.75 * Math.abs(Math.sin(frame * 0.18 + i * 1.1) * Math.cos(frame * 0.07 + i));
        return (
          <rect
            key={i}
            x={x + i * bw * 2}
            y={y + h - h * v}
            width={bw}
            height={h * v}
            fill={color}
            opacity={0.7}
          />
        );
      })}
    </g>
  );
};

// —— 四角 L 形边框刻度 ——
export const CornerBrackets: React.FC<{ inset: number; len: number; color?: string; opacity?: number }> = ({
  inset,
  len,
  color = WHITE,
  opacity = 0.8,
}) => {
  const c = (x: number, y: number, dx: number, dy: number, k: string) => (
    <path
      key={k}
      d={`M ${x + dx * len} ${y} L ${x} ${y} L ${x} ${y + dy * len}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
  return (
    <g opacity={opacity}>
      {c(inset, inset, 1, 1, "tl")}
      {c(1080 - inset, inset, -1, 1, "tr")}
      {c(inset, 1920 - inset, 1, -1, "bl")}
      {c(1080 - inset, 1920 - inset, -1, -1, "br")}
    </g>
  );
};

// —— 白闪（单帧冲击，非连续频闪）——
export const Flash: React.FC<{ on: boolean; opacity?: number }> = ({ on, opacity = 1 }) =>
  on ? <rect x={0} y={0} width={1080} height={1920} fill={WHITE} opacity={opacity} /> : null;

// —— HTML 大型动态字体（逐字母独立控制）——
export const BigWord: React.FC<{
  letters: string[];
  x: number; // 中心 x
  y: number; // 基线参考 y（块中心）
  size: number;
  tracking?: number;
  color?: string;
  letterStyle: (i: number) => { opacity?: number; transform?: string; color?: string; WebkitTextStroke?: string };
  weight?: number;
}> = ({ letters, x, y, size, tracking = 0, color = WHITE, letterStyle, weight = 700 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: 1080,
      height: 1920,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y - size,
        width: 1080,
        display: "flex",
        justifyContent: "center",
        fontFamily: SANS,
        fontWeight: weight,
        fontSize: size,
        color,
        letterSpacing: tracking,
        lineHeight: 1,
      }}
    >
      {letters.map((ch, i) => (
        <span key={i} style={{ display: "inline-block", ...letterStyle(i) }}>
          {ch}
        </span>
      ))}
    </div>
  </div>
);

// —— 顶部/底部标注条（24px 可读）——
export const TopBar: React.FC<{ left: string; right: string; y?: number }> = ({ left, right, y = 64 }) => (
  <div
    style={{
      position: "absolute",
      left: 56,
      top: y,
      width: 968,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: MONO,
      fontSize: 24,
      color: WHITE,
      letterSpacing: 2,
    }}
  >
    <span>{left}</span>
    <span>{right}</span>
  </div>
);

export const Readout: React.FC<{ left?: string; center?: string; right?: string; y?: number; color?: string }> = ({
  left,
  center,
  right,
  y = 1796,
  color = WHITE,
}) => (
  <div
    style={{
      position: "absolute",
      left: 56,
      top: y,
      width: 968,
      display: "flex",
      justifyContent: "space-between",
      fontFamily: MONO,
      fontSize: 22,
      color,
      letterSpacing: 1.5,
    }}
  >
    <span>{left}</span>
    <span>{center}</span>
    <span>{right}</span>
  </div>
);

// —— 局部反相区域（缓慢移动的白色矩形块，块内内容反相；非高频切换，避免光敏风险）——
export const InvertDefs: React.FC = () => (
  <defs>
    <filter id="inv" x="0%" y="0%" width="100%" height="100%">
      <feColorMatrix
        type="matrix"
        values="-1 0 0 0 1
                 0 -1 0 0 1
                 0 0 -1 0 1
                 0 0 0 1 0"
      />
    </filter>
    <clipPath id="invClip">
      <rect x={0} y={0} width={520} height={340} />
    </clipPath>
  </defs>
);

// —— 时间码格式化（帧号 → TC）——
export const tc = (frame: number): string => {
  const s = Math.floor(frame / 30);
  const ff = frame % 30;
  return `TC 00:00:${String(s).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
};

// —— 描边大数字（版面锚点）——
export const OutlineNum: React.FC<{ text: string; x: number; y: number; size: number; opacity?: number }> = ({
  text,
  x,
  y,
  size,
  opacity = 0.5,
}) => (
  <text
    x={x}
    y={y}
    fill="none"
    stroke={WHITE}
    strokeWidth={1.5}
    opacity={opacity}
    fontFamily={SANS}
    fontWeight={700}
    fontSize={size}
  >
    {text}
  </text>
);
