// 全片统一视觉层：机械少女 × 赛博霓虹 × 未来科技。
// GlobalAmbient = 氛围（在原视频之上、节点效果之下）；GlobalHud = 常驻 HUD（最上层，节点效果覆盖不到）。
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

const MAG = "#ff2d6f";
const CYA = "#22d3ee";
const TEA = "#17e0a0";
const WHT = "#f5f7fa";

// 未来科技感字体栈（使用系统自带字体，无新依赖）
const TECH = '"Avenir Next Condensed", "Futura", "Arial Narrow", sans-serif';
const MONO = '"Menlo", "SF Mono", monospace';

const PARTICLES = 44;
const TITLE = "DANCEFX";

export const GlobalAmbient: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0 }}
    >
      <defs>
        <linearGradient id="ga-tint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a0b2a" />
          <stop offset="55%" stopColor="#160a20" />
          <stop offset="100%" stopColor="#05060f" />
        </linearGradient>
        <pattern id="ga-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#05060f" opacity="0.16" />
        </pattern>
        <radialGradient id="ga-vig" cx="50%" cy="48%" r="62%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <linearGradient id="ga-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CYA} stopOpacity="0" />
          <stop offset="50%" stopColor={CYA} stopOpacity="0.16" />
          <stop offset="100%" stopColor={CYA} stopOpacity="0" />
        </linearGradient>
        <filter id="ga-grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={4} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.05} />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* 统一色调 */}
      <rect width={W} height={H} fill="url(#ga-tint)" opacity={0.2} />
      {/* 光带扫过 */}
      <rect
        x={-W + ((f * 7) % (W * 2))}
        y={0}
        width={W * 0.6}
        height={H}
        fill="url(#ga-sweep)"
        transform={`skewX(-18)`}
      />
      {/* 漂浮粒子（机械尘埃） */}
      {Array.from({ length: PARTICLES }).map((_, i) => {
        const speed = 0.25 + (i % 5) * 0.12;
        const x = (i * 137.5 + f * speed) % W;
        const y = (i * 89.3 + f * (speed * 0.6)) % H;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f * 0.05 + i));
        const col = i % 3 === 0 ? MAG : i % 3 === 1 ? CYA : TEA;
        return <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.6} fill={col} opacity={0.5 * tw} />;
      })}
      {/* 扫描线 / 暗角 / 颗粒 */}
      <rect width={W} height={H} fill="url(#ga-scan)" />
      <rect width={W} height={H} fill="url(#ga-vig)" />
      <rect width={W} height={H} filter="url(#ga-grain)" opacity={0.5} />
    </svg>
  );
};

export const GlobalHud: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const total = useVideoConfig().durationInFrames;

  const tc = (() => {
    const s = Math.floor(f / fps);
    const ff = f % fps;
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
  })();

  const intro = interpolate(f, [0, 4, 26, 30], [0, 1, 1, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(f, [total - 60, total - 40, total - 1], [0, 1, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bracket = 34;
  const inset = 18;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0 }}
    >
      {/* 四角支架 */}
      <g stroke={CYA} strokeWidth={2} opacity={0.65} fill="none">
        <path d={`M${inset} ${inset + bracket} V${inset} H${inset + bracket}`} />
        <path d={`M${W - inset - bracket} ${inset} H${W - inset} V${inset + bracket}`} />
        <path d={`M${inset} ${H - inset - bracket} V${H - inset} H${inset + bracket}`} />
        <path d={`M${W - inset - bracket} ${H - inset} H${W - inset} V${H - inset - bracket}`} />
      </g>

      {/* 右侧刻度 */}
      <g opacity={0.5}>
        <line x1={W - inset} y1={H * 0.28} x2={W - inset} y2={H * 0.72} stroke={TEA} strokeWidth={2} />
        {Array.from({ length: 9 }).map((_, k) => {
          const y = H * 0.28 + (k * (H * 0.44)) / 8;
          return <line key={k} x1={W - inset - 8} y1={y} x2={W - inset} y2={y} stroke={TEA} strokeWidth={2} />;
        })}
      </g>

      {/* HUD 文本 */}
      <g fontFamily={MONO} fill={CYA} opacity={0.82}>
        <text x={W - inset - bracket - 8} y={inset + 16} fontSize={13} textAnchor="end">
          DANCEFX // 30fps
        </text>
        <text x={inset} y={H - inset - 6} fontSize={13}>
          TC {tc}
        </text>
        <text x={W / 2} y={H - inset - 6} fontSize={13} textAnchor="middle" fill={MAG}>
          CYBER-NEON v1
        </text>
      </g>

      {/* 开场标题：逐字机械显现 + 故障闪烁 + 扫描 */}
      {intro > 0 && (
        <g opacity={intro}>
          <rect x={0} y={H * 0.36} width={W} height={H * 0.28} fill="#05060f" opacity={0.5} />
          {TITLE.split("").map((ch, i) => {
            const p = interpolate(f, [i * 2, i * 2 + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const jit = Math.sin((f + i * 9) * 1.7) * (1 - p) * 16;
            const cx = W / 2 + (i - (TITLE.length - 1) / 2) * 88;
            const flick = i % 2 === 0 || f % 9 !== 0 ? 1 : 0.35;
            return (
              <g key={i} transform={`translate(${jit.toFixed(1)} 0)`} opacity={p * flick}>
                <text x={cx - 3} y={H * 0.5 - 2} textAnchor="middle" fill={MAG} fontSize={104} fontWeight={900} fontFamily={TECH}>{ch}</text>
                <text x={cx + 3} y={H * 0.5 + 2} textAnchor="middle" fill={CYA} fontSize={104} fontWeight={900} fontFamily={TECH}>{ch}</text>
                <text x={cx} y={H * 0.5} textAnchor="middle" fill={WHT} fontSize={104} fontWeight={900} fontFamily={TECH}>{ch}</text>
              </g>
            );
          })}
          <rect x={0} y={H * 0.5 - 86 + ((f * 15) % 172)} width={W} height={3} fill={CYA} opacity={Math.max(0, 0.55 - (f % 12) / 22)} />
          <text x={W / 2} y={H * 0.5 + 42} textAnchor="middle" fill={CYA} fontSize={15} fontFamily={MONO} letterSpacing={6}>
            MECHANICAL GIRL · CYBER NEON · FUTURE TECH
          </text>
        </g>
      )}

      {/* 收尾 */}
      {outro > 0 && f > total - 62 && (
        <g opacity={outro}>
          <rect x={0} y={H * 0.4} width={W} height={H * 0.2} fill="#05060f" opacity={0.4} />
          <text x={W / 2} y={H * 0.52} textAnchor="middle" fill={WHT} fontSize={72} fontWeight={900} fontFamily={TECH} letterSpacing={8}>
            LAUNCH
          </text>
        </g>
      )}
    </svg>
  );
};

// 结尾数字矩阵背景：21.2s（帧 636）起逐渐铺满，持续到片尾。
const DR_START = 636;
const DR_GLYPHS = "01ABCDEF#$%&*/<>{}[]=+0123456789XZ";
export const DigitalRain: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const ramp = interpolate(f, [DR_START, DR_START + 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (ramp <= 0) return null;
  const COLS = 24;
  const ROWS = 11;
  const items: React.ReactNode[] = [];
  for (let c = 0; c < COLS; c++) {
    for (let k = 0; k < ROWS; k++) {
      const seed = c * 17 + k * 29;
      const x = (c + 0.5) * (W / COLS);
      const speed = 34 + (seed % 5) * 30;
      const y = ((seed * 59 + f * speed) % (H + 240)) - 120;
      const size = 11 + (seed % 4) * 5;
      const op = (0.05 + (seed % 5) * 0.035) * ramp;
      const col = seed % 3 === 0 ? CYA : seed % 3 === 1 ? TEA : WHT;
      items.push(
        <text key={`${c}-${k}`} x={x} y={y} fontSize={size} fontFamily={MONO} fill={col} opacity={op}>
          {DR_GLYPHS[(seed + Math.floor(f / 6) * 3) % DR_GLYPHS.length]}
        </text>
      );
    }
  }
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0 }}
    >
      {items}
    </svg>
  );
};
