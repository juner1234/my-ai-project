import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { jointPx, POSE_W, POSE_H } from "./pose";

const MAG = "#ff2d6f";
const CYA = "#22d3ee";
const TEA = "#17e0a0";
const WHT = "#f5f7fa";

/** B1 / FX-004：地面透视系统 + 落地涟漪 + 深度计 */
export const GroundSystem: React.FC<{ baseFrame: number; durationInFrames: number }> = ({
  baseFrame,
  durationInFrames,
}) => {
  const f = useCurrentFrame();
  const g = baseFrame + f;
  const dur = durationInFrames;
  const t = f / Math.max(1, dur - 1);

  const entry = interpolate(f, [0, Math.min(12, dur * 0.24)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitFade = interpolate(f, [dur - 4, dur - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const la = jointPx("left_ankle", g);
  const ra = jointPx("right_ankle", g);
  const fx = ((la?.[0] ?? POSE_W * 0.5) + (ra?.[0] ?? POSE_W * 0.5)) / 2;
  const fy = ((la?.[1] ?? POSE_H * 0.9) + (ra?.[1] ?? POSE_H * 0.9)) / 2;

  // 落地节拍：涟漪连续两拍展开
  const beat = (offset: number) =>
    interpolate(f, [dur * offset, dur * (offset + 0.3)], [0, 1], {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const rip1 = beat(0.42);
  const rip2 = beat(0.62);

  const vpx = 446;
  const vpy = 230;
  const gaugeX = POSE_W - 58;

  const rings: { p: number; col: string }[] = [
    { p: rip1, col: WHT },
    { p: rip2, col: TEA },
    { p: rip1, col: CYA },
    { p: rip2, col: TEA },
  ];

  return (
    <g opacity={exitFade}>
      <defs>
        <radialGradient id="b1-vig" cx="50%" cy="60%" r="70%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.55} />
        </radialGradient>
        <pattern id="b1-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#05060f" opacity="0.14" />
        </pattern>
        <filter id="b1-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="b1-grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={11} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.06} />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* 地面透视网格 */}
      <g opacity={entry}>
        {Array.from({ length: 16 }).map((_, i) => {
          const y = 430 + (POSE_H - 430) * Math.pow(i / 15, 1.7);
          const al = (70 * (i / 15) + 20) / 255;
          return <line key={`h${i}`} x1={0} y1={y} x2={POSE_W} y2={y} stroke={CYA} strokeWidth={1} opacity={al} />;
        })}
        {Array.from({ length: 29 }).map((_, k) => {
          const x = 446 + (k - 14) * 120;
          return <line key={`v${k}`} x1={vpx} y1={vpy} x2={x} y2={POSE_H} stroke={TEA} strokeWidth={1} opacity={0.11} />;
        })}
      </g>

      {/* 落地涟漪 + 冲击辐射 */}
      <g filter="url(#b1-glow)" opacity={entry}>
        {[70, 140, 215, 300].map((rr, i) => {
          const p = rings[i].p;
          const r = rr * (0.4 + p * 1.1);
          return (
            <ellipse
              key={i}
              cx={fx}
              cy={fy}
              rx={r}
              ry={r * 0.34}
              fill="none"
              stroke={rings[i].col}
              strokeWidth={3}
              opacity={(0.86 - i * 0.15) * (1 - p)}
            />
          );
        })}
        {Array.from({ length: 16 }).map((_, k) => {
          const ang = (k * Math.PI * 2) / 16;
          const p = rip1;
          return (
            <line
              key={k}
              x1={fx}
              y1={fy}
              x2={fx + Math.cos(ang) * 170 * (0.4 + p)}
              y2={fy + Math.sin(ang) * 60 * (0.4 + p)}
              stroke={WHT}
              strokeWidth={1}
              opacity={0.35 * (1 - p)}
            />
          );
        })}
      </g>

      {/* 尘土 */}
      <g opacity={entry * rip1}>
        {Array.from({ length: 90 }).map((_, k) => {
          const a = (k * 2.39996) % (Math.PI * 2);
          const rr = (k % 10) * 32 + rip1 * 60;
          const x = fx + Math.cos(a) * rr;
          const y = fy + Math.sin(a) * rr * 0.26;
          return <circle key={k} cx={x} cy={y} r={1 + (k % 3)} fill={WHT} opacity={0.35 * (1 - rip1)} />;
        })}
      </g>

      {/* 右侧深度计 Z-DROP */}
      <g opacity={entry}>
        <line x1={gaugeX} y1={120} x2={gaugeX} y2={POSE_H - 120} stroke={CYA} strokeWidth={2} opacity={0.62} />
        {Array.from({ length: 11 }).map((_, k) => {
          const y = 120 + (k * (POSE_H - 240)) / 10;
          return <line key={k} x1={gaugeX - 8} y1={y} x2={gaugeX + 8} y2={y} stroke={CYA} strokeWidth={2} opacity={0.5} />;
        })}
        <polygon
          points={`${gaugeX - 14},${fy - 40} ${gaugeX},${fy - 49} ${gaugeX + 14},${fy - 40} ${gaugeX},${fy - 31}`}
          fill={TEA}
        />
        <text x={gaugeX - 54} y={96} fill={TEA} fontSize={13} fontFamily="Menlo, monospace">
          Z-DROP
        </text>
      </g>

      {/* 后期 */}
      <rect width={POSE_W} height={POSE_H} fill="url(#b1-scan)" />
      <rect width={POSE_W} height={POSE_H} fill="url(#b1-vig)" />
      <rect width={POSE_W} height={POSE_H} filter="url(#b1-grain)" opacity={0.5} />

      {/* 文案 */}
      <g opacity={entry}>
        <rect x={28} y={26} width={6} height={52} fill={TEA} />
        <text x={46} y={50} fill={WHT} fontSize={26} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
          FX-004 // GROUND SYSTEM
        </text>
        <text x={46} y={72} fill={TEA} fontSize={14} fontFamily="Menlo, monospace">
          ground rebuild · impact at body-center
        </text>
      </g>
      <text
        x={POSE_W - 30}
        y={POSE_H - 24}
        textAnchor="end"
        fill={TEA}
        fontSize={30}
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight={900}
        opacity={interpolate(t, [0.45, 0.75], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      >
        IMPACT
      </text>
    </g>
  );
};
