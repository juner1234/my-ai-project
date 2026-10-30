import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { POSE_W, POSE_H } from "./pose";
import { SF_VIDEO } from "./data.live";

const CYA = "#22d3ee";
const ICE = "#eaf6ff";

const COLS = 12;
const ROWS = 10;
const CW = POSE_W / COLS;
const CH = POSE_H / ROWS;
const N = COLS * ROWS;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const AI_FONT = '"Avenir Next Condensed", "Futura", "Arial Black", sans-serif';
const AI_MONO = '"Menlo", "SF Mono", monospace';
const LETTERS = "AIJING".split("");
const AI_SIZE = 116;
const AI_GAP = 104; // 收紧字距，杂志主标题式紧凑排版
const AI_WORD_W = (LETTERS.length - 1) * AI_GAP + AI_SIZE * 0.6;

// 局部错位块（区域偏移，制造"格子正在重组"的信号不稳感）
const BLOCKS = [
  { x: POSE_W * 0.06, y: POSE_H * 0.18, w: POSE_W * 0.36, h: POSE_H * 0.28, ph: 0 },
  { x: POSE_W * 0.56, y: POSE_H * 0.44, w: POSE_W * 0.38, h: POSE_H * 0.30, ph: 5 },
  { x: POSE_W * 0.30, y: POSE_H * 0.02, w: POSE_W * 0.34, h: POSE_H * 0.22, ph: 9 },
];

/** C1 / FX-005：原视频按透明小格重组（节奏抖动 + 收尾稳定） */
export const FrameConstellation: React.FC<{ baseFrame: number; durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const f = useCurrentFrame();
  const dur = durationInFrames;

  // 每 12 帧（0.4s）一次脉冲；最后 ~18% 收敛，恢复清晰画面
  const pulse = interpolate(f % 12, [0, 2, 7], [0, 1, 0], clamp);
  const settle = interpolate(f, [dur * 0.82, dur - 1], [1, 0], clamp);
  const amp = (3 * pulse + 1) * settle;
  const gx = Math.sin(f * 1.9) * amp * 0.5;
  const gy = Math.cos(f * 2.3) * amp * 0.4;
  const exitFade = interpolate(f, [dur - 3, dur - 1], [1, 0], clamp);

  // AIJING 文字动画：整体/逐字旋转、流光、上下残影
  const textEnv = interpolate(f, [0, 8, dur * 0.74, dur - 1], [0, 1, 1, 0], clamp);
  const rot = Math.sin(f * 0.09) * 2.6;
  const flow = (((f * 0.05) % 1.4) + 1.4) % 1.4 - 0.2;
  const ruleP = interpolate(f, [6, 20], [0, 1], { easing: Easing.out(Easing.cubic), ...clamp });

  return (
    <AbsoluteFill style={{ opacity: exitFade }}>
      {/* 原始舞蹈画面（按网格重组） */}
      <div style={{ position: "absolute", inset: 0, transform: `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)` }}>
        <OffthreadVideo src={staticFile(SF_VIDEO)} muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {BLOCKS.map((b, i) => {
          const spike = interpolate((f + b.ph) % 12, [0, 2, 6], [0, 1, 0], clamp);
          const dx = (i % 2 ? -1 : 1) * spike * (7 + i * 3) * settle;
          return (
            <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, overflow: "hidden" }}>
              <OffthreadVideo
                src={staticFile(SF_VIDEO)}
                muted
                style={{ position: "absolute", width: POSE_W, height: POSE_H, transform: `translate(${(dx - b.x).toFixed(1)}px, ${(-b.y).toFixed(1)}px)` }}
              />
            </div>
          );
        })}
      </div>

      {/* 透明小格子：亮度/透明度脉冲闪烁 + 网格缝 */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${POSE_W} ${POSE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        {Array.from({ length: N }).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const seed = (c * 7 + r * 13) % 11;
          const tw = interpolate((f + seed * 2) % 18, [0, 3, 9], [0, 1, 0], clamp);
          return (
            <rect
              key={i}
              x={c * CW}
              y={r * CH}
              width={CW}
              height={CH}
              fill={i % 5 === 0 ? CYA : ICE}
              opacity={(0.02 + tw * 0.1) * settle}
            />
          );
        })}
        <g stroke={CYA} strokeWidth={1} opacity={0.14 * settle} fill="none">
          {Array.from({ length: COLS + 1 }).map((_, c) => (
            <line key={`v${c}`} x1={c * CW} y1={0} x2={c * CW} y2={POSE_H} />
          ))}
          {Array.from({ length: ROWS + 1 }).map((_, r) => (
            <line key={`h${r}`} x1={0} y1={r * CH} x2={POSE_W} y2={r * CH} />
          ))}
        </g>
      </svg>

      {/* 文案 */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${POSE_W} ${POSE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <g>
          <rect x={28} y={26} width={6} height={52} fill={CYA} />
          <text x={46} y={50} fill={ICE} fontSize={26} fontFamily="Arial Black, Impact, sans-serif" fontWeight={900}>
            FX-005 // FRAME REASSEMBLY
          </text>
          <text x={46} y={72} fill={CYA} fontSize={14} fontFamily="Menlo, monospace">
            live video · transparent cells
          </text>
        </g>
      </svg>

      {/* AIJING：杂志主标题式动态字组（冷白虹彩 + 单一双色点缀 + 描边拖影 + 动感入场） */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${POSE_W} ${POSE_H}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="aij-sheen" gradientUnits="userSpaceOnUse" x1={POSE_W / 2 - 280} y1={0} x2={POSE_W / 2 + 280} y2={0}>
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#cdeeff" />
            <stop offset="55%" stopColor="#b9c8ff" />
            <stop offset="78%" stopColor="#e3d2ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="aij-accent" gradientUnits="userSpaceOnUse" x1={POSE_W / 2 - 300} y1={0} x2={POSE_W / 2 + 300} y2={0}>
            <stop offset="0%" stopColor="#35e6ff" />
            <stop offset="100%" stopColor="#ff2d9b" />
          </linearGradient>
          <linearGradient id="aij-flow" x1="0" y1="0" x2="1" y2="0">
            <stop offset={Math.max(0, flow - 0.15).toFixed(3)} stopColor="#ffffff" stopOpacity="0" />
            <stop offset={Math.max(0, Math.min(1, flow)).toFixed(3)} stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset={Math.min(1, flow + 0.15).toFixed(3)} stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="aij-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={6} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="aij-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={6} />
          </filter>
        </defs>

        <g opacity={textEnv} transform={`translate(${POSE_W / 2} ${POSE_H * 0.42}) rotate(${rot.toFixed(2)})`}>
          {/* 杂志式细线 + 小号标签 */}
          <g stroke="url(#aij-accent)" strokeWidth={2} opacity={0.85 * ruleP}>
            <line x1={-AI_WORD_W / 2} y1={-88} x2={-AI_WORD_W / 2 + AI_WORD_W * ruleP} y2={-88} />
            <line x1={AI_WORD_W / 2 - AI_WORD_W * ruleP} y1={86} x2={AI_WORD_W / 2} y2={86} />
          </g>
          <g fill="#8fe9ff" fontFamily={AI_MONO} opacity={0.9 * ruleP}>
            <text x={-AI_WORD_W / 2} y={-102} fontSize={13} letterSpacing={4}>NEON EDITION</text>
            <text x={AI_WORD_W / 2} y={-102} textAnchor="end" fontSize={13} letterSpacing={4}>AIJING — 01</text>
          </g>

          {LETTERS.map((ch, i) => {
            const t0 = 3 + i * 3;
            const p = interpolate(f, [t0, t0 + 9], [0, 1], {
              easing: Easing.out(Easing.exp),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const cx = (i - (LETTERS.length - 1) / 2) * AI_GAP;
            const y = (1 - p) * 46 + p * Math.sin(f * 0.1 + i * 0.8) * 2;
            const sc = 1 + (1 - p) * 0.35;
            const rotI = Math.sin(f * 0.1 + i) * 4;
            const echoes: React.ReactNode[] = [];
            for (let k = 1; k <= 3; k++) {
              for (const dir of [-1, 1]) {
                const born = t0 + 5 + k * 2.4;
                const rp = interpolate(f, [born, born + 18], [0, 1], clamp);
                if (rp > 0 && rp < 1) {
                  echoes.push(
                    <text
                      key={`${k}_${dir}`}
                      x={cx}
                      y={y + dir * k * 13 * rp}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={AI_SIZE * (1 + rp * 0.1)}
                      fontFamily={AI_FONT}
                      fontWeight={900}
                      fill="none"
                      stroke="#8fe9ff"
                      strokeWidth={1.4}
                      opacity={(1 - rp) * 0.22 * p}
                    >
                      {ch}
                    </text>
                  );
                }
              }
            }
            return (
              <g key={i} opacity={p}>
                {echoes}
                <g transform={`translate(${cx} ${y.toFixed(1)}) rotate(${rotI.toFixed(2)}) scale(${sc.toFixed(3)})`}>
                  <text x={3} y={4} textAnchor="middle" dominantBaseline="middle" fontSize={AI_SIZE} fontFamily={AI_FONT} fontWeight={900} fill="#02040a" opacity={0.55} filter="url(#aij-shadow)">
                    {ch}
                  </text>
                  <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={AI_SIZE} fontFamily={AI_FONT} fontWeight={900} fill="url(#aij-sheen)" filter="url(#aij-glow)">
                    {ch}
                  </text>
                  <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={AI_SIZE} fontFamily={AI_FONT} fontWeight={900} fill="url(#aij-flow)" opacity={0.85}>
                    {ch}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
