// DanceFX 三个效果组件（Remotion 实现）
// 统一约定：锚点用 tracking 的归一化坐标，叠加「相对节点起点」的漂移以跟随舞者。
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import type { ReactElement } from "react";
import { DATA, type FXNode, type Pt, samplePath, toPx, driftPx } from "./data";

const SAMPLES = 48;

function pathD(points: Pt[], w: number, h: number): string {
  const parts: string[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = toPx(samplePath(points, i / SAMPLES), w, h);
    parts.push(`${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
  }
  return parts.join(" ");
}

function GlowDot({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <>
      <circle cx={x} cy={y} r={r * 2.6} fill={color} opacity={0.18} />
      <circle cx={x} cy={y} r={r * 1.6} fill={color} opacity={0.35} />
      <circle cx={x} cy={y} r={r} fill="#fff" />
    </>
  );
}

/** FX-002：左手腕牵引的上升能量轨迹（蓄力上冲 + 末段爆发光环） */
export function EnergyTrail({ node }: { node: FXNode }) {
  const frame = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const dur = node.durationFrames;
  const pts = node.annotations[0]?.points ?? [];
  const [dx, dy] = driftPx(node.followTarget, node.startFrame + frame, node.startFrame, w, h);

  const p = interpolate(frame, [0, dur - 1], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const head = toPx(samplePath(pts, p), w, h);
  const d = pathD(pts, w, h);

  // 末段爆发光环
  const burst = interpolate(frame, [dur * 0.72, dur], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g transform={`translate(${dx.toFixed(1)} ${dy.toFixed(1)})`}>
      <defs>
        <linearGradient id="fx2-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#4cc9f0" />
          <stop offset="100%" stopColor="#ff4d6d" />
        </linearGradient>
      </defs>
      {/* 轨迹底光 */}
      <path d={d} fill="none" stroke="url(#fx2-grad)" strokeWidth={14} strokeLinecap="round"
        strokeLinejoin="round" opacity={0.22} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      {/* 轨迹主线 */}
      <path d={d} fill="none" stroke="url(#fx2-grad)" strokeWidth={6} strokeLinecap="round"
        strokeLinejoin="round" opacity={0.95} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      {/* 上升粒子 */}
      {[0.06, 0.12, 0.18].map((k, i) => {
        const q = Math.max(0, p - k);
        const c = toPx(samplePath(pts, q), w, h);
        return <circle key={i} cx={c[0]} cy={c[1]} r={3} fill="#ffd166" opacity={(0.7 - i * 0.2) * (p > 0 ? 1 : 0)} />;
      })}
      {/* 头部光点 */}
      {p > 0 && p < 1 && <GlowDot x={head[0]} y={head[1]} r={7} color="#ff4d6d" />}
      {/* 爆发光环 */}
      {burst > 0 && (
        <>
          <circle cx={head[0]} cy={head[1]} r={20 + burst * 150} fill="none"
            stroke="#4cc9f0" strokeWidth={4 * (1 - burst)} opacity={0.8 * (1 - burst)} />
          <circle cx={head[0]} cy={head[1]} r={10 + burst * 90} fill="none"
            stroke="#ff4d6d" strokeWidth={3 * (1 - burst)} opacity={0.7 * (1 - burst)} />
        </>
      )}
    </g>
  );
}

/** FX-004：身体中心的下坠冲击（自上而下扫描 + 落地地面涟漪） */
export function ScanDown({ node }: { node: FXNode }) {
  const frame = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const dur = node.durationFrames;
  const pts = node.annotations[0]?.points ?? [];
  const [dx, dy] = driftPx(node.followTarget, node.startFrame + frame, node.startFrame, w, h);

  const p = interpolate(frame, [0, dur - 1], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scan = toPx(samplePath(pts, p), w, h);
  const bottom = toPx(pts[pts.length - 1] ?? [0.5, 0.8], w, h);
  const d = pathD(pts, w, h);

  // 落地涟漪（扫描到底后展开）
  const rip = interpolate(frame, [dur * 0.68, dur], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rx = 24 + rip * 220;
  const ry = rx * 0.28;

  return (
    <g transform={`translate(${dx.toFixed(1)} ${dy.toFixed(1)})`}>
      {/* S 形引导光（淡） */}
      <path d={d} fill="none" stroke="#06d6a0" strokeWidth={5} strokeLinecap="round"
        strokeLinejoin="round" opacity={0.22} />
      {/* 下落扫描带 */}
      <rect x={scan[0] - 90} y={scan[1] - 10} width={180} height={20} rx={10}
        fill="#4cc9f0" opacity={0.16} />
      <line x1={scan[0] - 70} y1={scan[1]} x2={scan[0] + 70} y2={scan[1]}
        stroke="#06d6a0" strokeWidth={3} opacity={0.85} />
      <GlowDot x={scan[0]} y={scan[1]} r={6} color="#06d6a0" />
      {/* 地面涟漪 */}
      {rip > 0 && (
        <>
          <ellipse cx={bottom[0]} cy={bottom[1]} rx={rx} ry={ry} fill="none"
            stroke="#4cc9f0" strokeWidth={4 * (1 - rip)} opacity={0.85 * (1 - rip)} />
          <ellipse cx={bottom[0]} cy={bottom[1]} rx={rx * 0.6} ry={ry * 0.6} fill="none"
            stroke="#06d6a0" strokeWidth={3 * (1 - rip)} opacity={0.7 * (1 - rip)} />
        </>
      )}
    </g>
  );
}

/** FX-005：右手腕的抛射箭头（沿箭头上抛 + 彗尾 + 末端闪击） */
export function CometArrow({ node }: { node: FXNode }) {
  const frame = useCurrentFrame();
  const { width: w, height: h, fps } = useVideoConfig();
  const dur = node.durationFrames;
  const pts = node.annotations[0]?.points ?? [];
  const a = toPx(pts[0] ?? [0.5, 0.5], w, h);
  const b = toPx(pts[pts.length - 1] ?? [0.5, 0.5], w, h);
  const [dx, dy] = driftPx(node.followTarget, node.startFrame + frame, node.startFrame, w, h);

  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len = Math.max(1, Math.hypot(vx, vy));
  const ux = vx / len;
  const uy = vy / len;
  const ang = (Math.atan2(vy, vx) * 180) / Math.PI;

  const s = spring({ frame, fps, config: { damping: 13, mass: 0.6, stiffness: 120 } });
  const headX = a[0] + vx * s;
  const headY = a[1] + vy * s;

  const flash = interpolate(frame, [dur * 0.8, dur], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <g transform={`translate(${dx.toFixed(1)} ${dy.toFixed(1)})`}>
      {/* 彗尾：多个滞后副本 */}
      {[0.08, 0.16, 0.24, 0.32, 0.42].map((k, i) => {
        const ss = Math.max(0, s - k);
        const x = a[0] + vx * ss;
        const y = a[1] + vy * ss;
        return (
          <circle key={i} cx={x} cy={y} r={Math.max(1, 9 - i * 1.5)} fill="#ff4d6d"
            opacity={0.5 - i * 0.09} />
        );
      })}
      {/* 箭头 */}
      <g transform={`translate(${headX.toFixed(1)} ${headY.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
        <polygon points="22,0 -10,10 -10,-10" fill="#ff4d6d" />
        <polygon points="14,0 -6,6 -6,-6" fill="#fff" opacity={0.9} />
      </g>
      <GlowDot x={headX} y={headY} r={6} color="#ff4d6d" />
      {/* 末端闪击 */}
      {flash > 0 && (
        <circle cx={b[0]} cy={b[1]} r={10 + flash * 120} fill="none"
          stroke="#ffd166" strokeWidth={5 * (1 - flash)} opacity={0.9 * (1 - flash)} />
      )}
    </g>
  );
}

export const EFFECTS: Record<string, (p: { node: FXNode }) => ReactElement> = {
  "FX-002": EnergyTrail,
  "FX-004": ScanDown,
  "FX-005": CometArrow,
};

export { DATA };
