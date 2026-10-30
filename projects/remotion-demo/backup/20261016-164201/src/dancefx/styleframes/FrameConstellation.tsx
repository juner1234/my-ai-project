import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { POSE_W, POSE_H } from "./pose";

const MAG = "#ff2d6f";
const CYA = "#22d3ee";
const TEA = "#17e0a0";
const WHT = "#f5f7fa";
const INK = "#0a0710";

interface Tile {
  src: string;
  x: number;
  y: number;
  w: number;
  rot: number;
  col: string;
  bw: number;
  delay: number;
}

const TILES: Tile[] = [
  { src: "styleframes/tiles/tile_492.png", x: 30, y: 96, w: 224, rot: -9, col: CYA, bw: 3, delay: 0.08 },
  { src: "styleframes/tiles/tile_507.png", x: 300, y: 40, w: 224, rot: 7, col: MAG, bw: 3, delay: 0.2 },
  { src: "styleframes/tiles/tile_519.png", x: 560, y: 72, w: 224, rot: -6, col: CYA, bw: 3, delay: 0.32 },
  { src: "styleframes/tiles/tile_543.png", x: 638, y: 330, w: 224, rot: 10, col: MAG, bw: 3, delay: 0.44 },
];
const HERO: Tile = { src: "styleframes/tiles/hero_534.png", x: 70, y: 300, w: 560, rot: -2, col: MAG, bw: 4, delay: 0 };

/** C1 / FX-005：自由帧拼贴星图（帧块为真实抽帧，星图为矢量叠加） */
export const FrameConstellation: React.FC<{ baseFrame: number; durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const f = useCurrentFrame();
  const dur = durationInFrames;

  const exitFade = interpolate(f, [dur - 4, dur - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = (delay: number) =>
    interpolate(f, [dur * delay, dur * (delay + 0.22)], [0, 1], {
      easing: Easing.out(Easing.back(1.4)),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const heroP = enter(HERO.delay);
  const all = [HERO, ...TILES];
  const centers: [number, number][] = all.map((tl) => {
    const p = enter(tl.delay);
    return [tl.x + (tl.w * p) / 2, tl.y + (tl.w * 0.8 * p) / 2];
  });
  const hub: [number, number] = [150, 180];

  const lineP = interpolate(f, [dur * 0.3, dur * 0.7], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: exitFade }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${POSE_W} ${POSE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern id="c1-grid" width={44} height={44} patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke={CYA} strokeWidth={1} opacity={0.09} />
          </pattern>
        </defs>
        <rect width={POSE_W} height={POSE_H} fill={INK} />
        <rect width={POSE_W} height={POSE_H} fill="url(#c1-grid)" />
        {Array.from({ length: 180 }).map((_, k) => {
          const x = (k * 137) % POSE_W;
          const y = (k * 223) % POSE_H;
          return <circle key={k} cx={x} cy={y} r={1} fill={WHT} opacity={0.16} />;
        })}

        <g strokeLinecap="round" style={{ clipPath: `inset(0 ${(100 - lineP * 100).toFixed(1)}% 0 0)` }}>
          {centers.slice(1).map((c, i) => (
            <line key={`hub${i}`} x1={hub[0]} y1={hub[1]} x2={c[0]} y2={c[1]} stroke={CYA} strokeWidth={2} opacity={0.8} />
          ))}
          {centers.slice(0, -1).map((c, i) => (
            <line key={`ch${i}`} x1={c[0]} y1={c[1]} x2={centers[i + 1][0]} y2={centers[i + 1][1]} stroke={TEA} strokeWidth={1} opacity={0.5} />
          ))}
          {centers.map((c, i) => (
            <circle key={`d${i}`} cx={c[0]} cy={c[1]} r={5} fill={WHT} />
          ))}
        </g>
      </svg>

      {all.map((tl, i) => {
        const p = enter(tl.delay);
        const drift = Math.sin(f * 0.08 + i) * 3;
        return (
          <Img
            key={tl.src}
            src={staticFile(tl.src)}
            style={{
              position: "absolute",
              left: tl.x + drift,
              top: tl.y,
              width: tl.w * p,
              height: "auto",
              border: `${tl.bw}px solid ${tl.col}`,
              boxShadow: "7px 9px 22px rgba(0,0,0,0.6)",
              transform: `rotate(${tl.rot}deg)`,
              opacity: p,
            }}
          />
        );
      })}

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${POSE_W} ${POSE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <g opacity={heroP}>
          <text x={64} y={650} fill={MAG} fontSize={72} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
            LAUNCH
          </text>
          <text x={68} y={654} fill={CYA} fontSize={72} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900} opacity={0.6}>
            LAUNCH
          </text>
          <text x={66} y={652} fill={WHT} fontSize={72} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
            LAUNCH
          </text>
        </g>
        <g opacity={heroP}>
          <rect x={28} y={26} width={6} height={52} fill={CYA} />
          <text x={46} y={50} fill={WHT} fontSize={26} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
            FX-005 // FRAME CONSTELLATION
          </text>
          <text x={46} y={72} fill={CYA} fontSize={14} fontFamily="Menlo, monospace">
            freeze-frame collage · 5 extracted stills
          </text>
        </g>
      </svg>
    </div>
  );
};
