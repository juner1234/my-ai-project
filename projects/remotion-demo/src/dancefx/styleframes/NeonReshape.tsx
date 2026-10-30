import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { jointPx, POSE_W, POSE_H } from "./pose";

const ELEC = "#3aa0ff"; // 电光蓝：主发光
const CYA = "#22d3ee"; // 青蓝
const VIO = "#8b5cf6"; // 蓝紫
const ICE = "#eaf6ff"; // 冰白核心

const SEGS: [string, string][] = [
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
  ["nose", "left_shoulder"],
  ["nose", "right_shoulder"],
];

/** A2 / FX-002：霓虹人体描边 + 同心弧场 + 碎块 + 左手腕标记 */
export const NeonReshape: React.FC<{ baseFrame: number; durationInFrames: number }> = ({
  baseFrame,
  durationInFrames,
}) => {
  const f = useCurrentFrame();
  const g = baseFrame + f;
  const dur = durationInFrames;
  const t = f / Math.max(1, dur - 1);

  const entry = interpolate(f, [0, Math.min(10, dur * 0.2)], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const climax = interpolate(f, [dur * 0.62, dur * 0.82, dur * 0.98], [0, 1, 0.35], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitFade = interpolate(f, [dur - 4, dur - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bc = {
    x: ((jointPx("left_hip", g)?.[0] ?? POSE_W * 0.5) + (jointPx("right_hip", g)?.[0] ?? POSE_W * 0.52)) / 2,
    y: ((jointPx("left_shoulder", g)?.[1] ?? POSE_H * 0.4) + (jointPx("right_hip", g)?.[1] ?? POSE_H * 0.64)) / 2,
  };

  const wrist = jointPx("left_wrist", g);
  const head = jointPx("nose", g);
  const lsW = jointPx("left_shoulder", g);
  const rsW = jointPx("right_shoulder", g);
  const shoulderDist = lsW && rsW ? Math.hypot(lsW[0] - rsW[0], lsW[1] - rsW[1]) : 90;
  const headR = Math.max(14, shoulderDist * 0.55);

  const drawP = interpolate(f, [0, dur * 0.55], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const segLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const [a, b] of SEGS) {
    const p = jointPx(a, g);
    const q = jointPx(b, g);
    if (p && q) segLines.push({ x1: p[0], y1: p[1], x2: q[0], y2: q[1] });
  }

  return (
    <g opacity={exitFade}>
      <defs>
        <linearGradient id="a2-grade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0b1e" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#160a20" stopOpacity={0.35} />
        </linearGradient>
        <pattern id="a2-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#05060f" opacity="0.14" />
        </pattern>
        <radialGradient id="a2-vig" cx="50%" cy="48%" r="62%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.62} />
        </radialGradient>
        <filter id="a2-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={7} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="a2-grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={7} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.06} />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width={POSE_W} height={POSE_H} fill="url(#a2-grade)" opacity={entry} />

      {/* 同心弧场 + 辐射线，锚定身体中心 */}
      <g transform={`translate(${bc.x.toFixed(1)} ${bc.y.toFixed(1)})`} opacity={entry * 0.9}>
        <g transform={`rotate(${(t * 12).toFixed(2)})`}>
          {[120, 166, 212, 258, 304, 350, 396, 442, 488, 534].map((r, i) => (
            <g key={r}>
              <ellipse
                rx={r * (1 + climax * 0.06)}
                ry={r * 0.62 * (1 + climax * 0.06)}
                fill="none"
                stroke={i % 2 ? ELEC : CYA}
                strokeWidth={2}
                opacity={(i % 2 ? 0.5 : 0.42) * (0.5 + 0.5 * Math.sin(f * 0.3 - i * 0.5))}
                strokeDasharray={`${(r * 2.2).toFixed(0)} ${(r * 3).toFixed(0)}`}
                strokeDashoffset={-(f * 3 + i * 20)}
              />
            </g>
          ))}
        </g>
        {Array.from({ length: 28 }).map((_, k) => {
          const ang = (k * 360) / 28;
          const rad = (ang * Math.PI) / 180;
          return (
            <line
              key={k}
              x1={0}
              y1={0}
              x2={Math.cos(rad) * 600}
              y2={Math.sin(rad) * 370}
              stroke={VIO}
              strokeWidth={1}
              opacity={0.14}
            />
          );
        })}
      </g>

      {/* 霓虹人体描边 */}
      {drawP > 0 && (
        <g
          filter="url(#a2-glow)"
          style={{ clipPath: `inset(0 ${(100 - drawP * 100).toFixed(1)}% 0 0)` }}
        >
          {segLines.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={ELEC}
              strokeWidth={20}
              strokeLinecap="round"
              opacity={0.8}
            />
          ))}
          {head && <circle cx={head[0]} cy={head[1]} r={headR + 2} fill="none" stroke={ELEC} strokeWidth={22} />}
        </g>
      )}
      {drawP > 0.2 && (
        <g style={{ clipPath: `inset(0 ${(100 - drawP * 100).toFixed(1)}% 0 0)` }}>
          {segLines.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={ICE}
              strokeWidth={8}
              strokeLinecap="round"
            />
          ))}
          {head && <circle cx={head[0]} cy={head[1]} r={headR} fill="none" stroke={ICE} strokeWidth={7} />}
        </g>
      )}

      {/* 能量流动：沿骨骼轮廓流动的脉冲 */}
      {drawP > 0.35 && (
        <g style={{ clipPath: `inset(0 ${(100 - drawP * 100).toFixed(1)}% 0 0)` }}>
          {segLines.map((s, i) => (
            <line
              key={`e${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={ICE}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray="6 22"
              strokeDashoffset={-(f * 7 + i * 5)}
              opacity={0.95}
            />
          ))}
        </g>
      )}

      {/* 环绕碎块 */}
      <g opacity={entry}>
        {Array.from({ length: 12 }).map((_, k) => {
          const a = (k / 12) * Math.PI * 2 + f * 0.012;
          const rr = 230 + (k % 3) * 40 + climax * 30;
          const x = bc.x + Math.cos(a) * rr;
          const y = bc.y + Math.sin(a) * rr * 0.7;
          const s = 9 + (k % 4) * 3;
          const rot = a * 2 + f * 0.05;
          return (
            <g key={k} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((rot * 180) / Math.PI).toFixed(1)})`}>
              <polygon
                points={`0,${-s} ${s},0 0,${s} ${-s},0`}
                fill="none"
                stroke={k % 2 ? CYA : ELEC}
                strokeWidth={2}
                opacity={0.9}
              />
            </g>
          );
        })}
      </g>

      {/* 左手腕标记 */}
      {wrist && (
        <g opacity={entry}>
          <circle cx={wrist[0]} cy={wrist[1]} r={16} fill="none" stroke={VIO} strokeWidth={3} />
          <circle cx={wrist[0]} cy={wrist[1]} r={16 + climax * 26} fill="none" stroke={VIO} strokeWidth={2} opacity={1 - climax} />
          <line x1={wrist[0]} y1={wrist[1] - 30} x2={wrist[0]} y2={wrist[1] - 16} stroke={VIO} strokeWidth={2} />
          <text x={wrist[0] + 22} y={wrist[1] - 12} fill={VIO} fontSize={14} fontFamily="Menlo, monospace">
            L-WRIST
          </text>
        </g>
      )}

      {/* 后期：扫描线 / 暗角 / 颗粒 */}
      <rect width={POSE_W} height={POSE_H} fill="url(#a2-scan)" />
      <rect width={POSE_W} height={POSE_H} fill="url(#a2-vig)" />
      <rect width={POSE_W} height={POSE_H} filter="url(#a2-grain)" opacity={0.5} />

      {/* 文案 */}
      <g opacity={entry}>
        <rect x={28} y={26} width={6} height={52} fill={ELEC} />
        <text x={46} y={50} fill={ICE} fontSize={26} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
          FX-002 // NEON RESHAPE
        </text>
        <text x={46} y={72} fill={ELEC} fontSize={14} fontFamily="Menlo, monospace">
          subject reshape · local pose extract
        </text>
      </g>
      <text
        x={POSE_W - 30}
        y={POSE_H - 24}
        textAnchor="end"
        fill={ICE}
        fontSize={30}
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight={900}
        opacity={interpolate(t, [0.4, 0.7], [0, 0.92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      >
        RISE
      </text>
    </g>
  );
};
