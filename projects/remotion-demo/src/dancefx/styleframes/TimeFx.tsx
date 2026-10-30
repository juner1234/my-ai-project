// 两个按时间触发的特效：7.1s 系统扫描；12.26s 重击爆发（含短暂画面震动）。
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

const CYA = "#22d3ee";
const ICE = "#eaf6ff";
const ELEC = "#3aa0ff";
const MONO = '"Menlo", "SF Mono", monospace';

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 约 7.1s（帧 213）：全息扫描带横扫 + 地面光柱 + 数据读数
export const ScanSweep: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const DUR = 54;
  const env = interpolate(f, [0, 8, DUR - 12, DUR - 1], [0, 1, 1, 0], clamp);
  const x = interpolate(f, [4, 46], [-0.12 * W, 1.12 * W], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const pct = Math.round(interpolate(f, [4, 46], [0, 100], clamp));
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }} opacity={env}>
      <defs>
        <linearGradient id="tf-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CYA} stopOpacity="0" />
          <stop offset="70%" stopColor={CYA} stopOpacity="0.18" />
          <stop offset="100%" stopColor={ICE} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect x={x - 160} y={0} width={160} height={H} fill="url(#tf-band)" />
      <line x1={x} y1={0} x2={x} y2={H} stroke={ICE} strokeWidth={2} opacity={0.9} />
      <line x1={x} y1={0} x2={x} y2={H} stroke={CYA} strokeWidth={8} opacity={0.25} />
      {Array.from({ length: 18 }).map((_, k) => {
        const bx = (k + 0.5) * (W / 18);
        const hh = 60 + (k % 4) * 40;
        return <rect key={k} x={bx - 1} y={H - hh} width={2} height={hh} fill={CYA} opacity={0.18} />;
      })}
      <g opacity={0.16} stroke={CYA} strokeWidth={1}>
        {Array.from({ length: 10 }).map((_, k) => (
          <line key={`h${k}`} x1={0} y1={((k + 1) * H) / 11} x2={W} y2={((k + 1) * H) / 11} />
        ))}
      </g>
      <g fontFamily={MONO} fill={CYA}>
        <text x={36} y={H * 0.32} fontSize={15} letterSpacing={4}>SYSTEM SCAN</text>
        <text x={36} y={H * 0.32 + 22} fontSize={13} fill={ICE}>
          SUBJECT 02 · DATA {String(pct).padStart(3, "0")}%
        </text>
      </g>
    </svg>
  );
};

// 约 12.26s（帧 368）：冲击波 + 能量爆发 + 粒子外扩
export const ImpactBurst: React.FC = () => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const cx = W * 0.5;
  const cy = H * 0.55;
  const flash = interpolate(f, [0, 2, 7], [0, 0.85, 0], clamp);
  const coreOp = interpolate(f, [0, 3, 14], [0, 1, 0], clamp);
  const ring = (delay: number, max: number, sw: number, col: string) => {
    const lf = f - delay;
    if (lf < 0) return null;
    const p = interpolate(lf, [0, 26], [0, 1], clamp);
    return <circle cx={cx} cy={cy} r={p * max} fill="none" stroke={col} strokeWidth={sw * (1 - p) + 1} opacity={(1 - p) * 0.9} />;
  };
  const parts = Array.from({ length: 46 }).map((_, k) => {
    const a = (k / 46) * Math.PI * 2;
    const d = interpolate(f, [0, 30], [0, 300 + (k % 5) * 70], clamp);
    const op = interpolate(f, [0, 6, 30], [0, 0.9, 0], clamp);
    return <circle key={k} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d * 0.8} r={2 + (k % 3)} fill={k % 2 ? CYA : ICE} opacity={op} />;
  });
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
      {flash > 0 && <rect width={W} height={H} fill={ICE} opacity={flash} />}
      <circle cx={cx} cy={cy} r={40 + coreOp * 30} fill="#fff" opacity={coreOp * 0.9} />
      {ring(0, 520, 14, ICE)}
      {ring(3, 640, 10, CYA)}
      {ring(6, 760, 6, ELEC)}
      {parts}
    </svg>
  );
};

// 短暂画面震动（约 12.26s 触发），轻微放大以遮住位移露边
export const Shake: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [364, 367, 382, 398], [0, 1, 0.5, 0], clamp);
  const amp = 15 * k;
  const x = Math.sin(f * 2.7) * amp;
  const y = Math.cos(f * 3.3) * amp;
  return (
    <AbsoluteFill style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 + 0.05 * k).toFixed(3)})` }}>
      {children}
    </AbsoluteFill>
  );
};
