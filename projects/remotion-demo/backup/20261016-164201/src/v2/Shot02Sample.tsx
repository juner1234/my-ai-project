// === SIGNAL V2 · 阶段A样片：Shot 02「传播 PROPAGATION」 ===
// 72 帧 @30fps = 2.4s
// 大型动态字体 PROPAGATION 为主体，网格/同心圆/波形/柱状为结构层，标注为辅助层。
// 转场：F68–F69 整体反相 2 帧（切换事件符号）。

import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, staticFile } from "remotion";
import {
  BLACK, WHITE, CYAN, SANS, MONO,
  Grid, Rings, WaveLines, FreqBars, CornerBrackets, TopBar, Readout, OutlineNum, tc,
} from "./parts";
import { lerp, easeOutCubic } from "./random";

const WORD = "PROPAGATION".split("");

export const Shot02Sample: React.FC = () => {
  const f = useCurrentFrame();

  // —— 网格：F0–F14 从中心展开；F36 密度硬切 40→20px；之后 1px/帧下移 ——
  const reveal = lerp(f, [0, 14], [0, 1], easeOutCubic);
  const spacing = f < 36 ? 40 : 20;
  const gridOpacity = f < 36 ? 0.35 : 0.5;
  const flowY = f >= 36 ? -((f - 36) % spacing) : 0;

  // —— 同心圆：F8 起每 4 帧一个，14px/帧向外扩张，远处渐隐留残影 ——
  const ringRadii: number[] = [];
  const ringOpac: number[] = [];
  for (let i = 0; i < 5; i++) {
    const born = 8 + i * 4;
    const r = Math.max(0, (f - born) * 14);
    ringRadii.push(r);
    ringOpac.push(r <= 0 ? 0 : Math.max(0.15, 1 - r / 900));
  }

  // —— 波形：F24 / F36 两级振幅阶梯 ——
  const amp = f < 24 ? 10 : f < 36 ? 22 : 36;

  // —— 大字：F16 起逐字母显现，stagger 4 帧 ——
  const letterStyle = (i: number) => {
    const born = 16 + i * 4;
    const t = lerp(f, [born, born + 6], [0, 1], easeOutCubic);
    return {
      opacity: t,
      transform: `translateY(${(1 - t) * 14}px)`,
    };
  };

  // —— 反相转场：F68–F69 ——
  const inverted = f >= 68;

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK, filter: inverted ? "invert(1)" : "none" }}>
      {/* 图形层（SVG） */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        {/* 结构网格（框定区域，瑞士式） */}
        <Grid frame={f} spacing={spacing} bounds={[120, 240, 960, 1120]} opacity={gridOpacity} offsetY={flowY} reveal={reveal} />

        {/* 同心圆组（第 3 环青蓝） */}
        <Rings
          cx={540}
          cy={680}
          radii={ringRadii}
          colors={[WHITE, WHITE, CYAN, WHITE, WHITE]}
          opacity={1}
        />
        {ringRadii.map((r, i) => (
          <circle key={`o${i}`} cx={540} cy={680} r={r} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={ringOpac[i] * 0.4} />
        ))}

        {/* 版面锚点：描边大数字 02 */}
        <OutlineNum text="02" x={150} y={400} size={240} opacity={0.5} />

        {/* 波形线（网格下方左侧） */}
        <WaveLines frame={f} x={120} y={1230} w={420} count={3} amp={amp} />

        {/* 频率柱（右侧） */}
        <FreqBars frame={f} x={700} y={1210} w={260} h={90} count={8} />

        {/* 四角刻度框 */}
        <CornerBrackets inset={40} len={36} opacity={lerp(f, [2, 10], [0, 0.8])} />
      </svg>

      {/* 字体排版层（HTML） */}
      {/* 大型动态字体主体 */}
      {f >= 16 && (
        <div style={{ position: "absolute", left: 0, top: 1360, width: 1080, display: "flex", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 110, color: WHITE, letterSpacing: 6, lineHeight: 1 }}>
          {WORD.map((ch, i) => {
            const st = letterStyle(i);
            return (
              <span key={i} style={{ display: "inline-block", opacity: st.opacity, transform: st.transform }}>
                {ch}
              </span>
            );
          })}
        </div>
      )}

      {/* 辅助标注层（≥24px，手机可读） */}
      <div style={{ position: "absolute", left: 0, top: 0, opacity: lerp(f, [4, 12], [0, 1]) }}>
        <TopBar left="SEG 02/07" right="PROPAGATION" />
      </div>
      <Readout
        left="X0540 Y0680"
        center={f < 24 ? "FREQ ————" : "FREQ 0431.7 HZ"}
        right={tc(f)}
      />

      {/* 音轨（阶段A声音设计，帧对齐合成） */}
      <Audio src={staticFile("signal-v2-shot02.wav")} />
    </AbsoluteFill>
  );
};
