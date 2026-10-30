// === SIGNAL V2 · 阶段A样片：Shot 05「失控 OVERLOAD」 ===
// 100 帧 @30fps = 3.33s，三子节拍：
//   A F0–F29  加速：大字字距拉开 + 字母漂移 + 同心圆反向脉冲
//   B F30–F64 切割：大字被 7 条水平带切割错位 + 局部反相块 + 单帧冲击白闪（F36/48/58，非连续频闪）
//   C F65–F99 爆发：字母聚合 → F80 单次白闪 2 帧 + IMPACT → 12 放射线爆散 + SIGNAL 字标浮现
// 高潮手段：大型动态字体 + 局部反相 + 图形切割 + 尺度冲击 + 音画重击（避免全屏高频频闪）。

import React from "react";
import { AbsoluteFill, useCurrentFrame, Audio, staticFile } from "remotion";
import {
  BLACK, WHITE, CYAN, SANS,
  Grid, Rings, CornerBrackets, TopBar, Readout, Flash, tc,
} from "./parts";
import { lerp, hr, easeOutCubic, easeInCubic } from "./random";

const WORD = "OVERLOAD".split("");

// —— 局部反相带：白底 + 黑色纹理（缓慢移动的"反相块"语言，非高频切换）——
const InvertBand: React.FC<{ x: number; y: number; w: number; h: number; tick: number; seed: number }> = ({
  x, y, w, h, tick, seed,
}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={WHITE} />
    {/* 块内黑色网格纹理 + 读数碎片 */}
    <g stroke={BLACK} strokeWidth={1} opacity={0.9}>
      {Array.from({ length: Math.floor(h / 24) }, (_, i) => (
        <line key={i} x1={x} y1={y + i * 24} x2={x + w} y2={y + i * 24} />
      ))}
    </g>
    <text x={x + 16} y={y + h - 18} fill={BLACK} fontFamily='"SF Mono", Menlo, monospace' fontSize={26} fontWeight={700}>
      {`ERR ${Math.floor(hr(0x1000, 0xffff, tick, seed)).toString(16).toUpperCase()}`}
    </text>
  </g>
);

export const Shot05Sample: React.FC<{ withAudio?: boolean; globalOffset?: number }> = ({
  withAudio = true,
  globalOffset = 0,
}) => {
  const f = useCurrentFrame();

  // —— 三段状态 ——
  const segA = f < 30;
  const segB = f >= 30 && f < 65;
  const segC = f >= 65;

  // —— 冲击尺度：F30 / F65 两次指数衰减回弹；F80 白闪同步 ——
  const impact =
    1 +
    0.12 * Math.exp(-Math.max(0, f - 30) / 3) * (f >= 30 ? 1 : 0) +
    0.18 * Math.exp(-Math.max(0, f - 65) / 4) * (f >= 65 ? 1 : 0);

  // —— 网格 20px 循环流动（2px/帧）——
  const flowY = -((f * 2) % 20);

  // —— 同心圆：反向旋转 + 每 10 帧收缩脉冲 ——
  const pulse = Math.sin(f * 0.3) * 10;
  const ringBase = segC ? lerp(f, [65, 99], [240, 60], easeInCubic) : 240;
  const radii = [ringBase + pulse, ringBase * 0.66 + pulse * 0.6, ringBase * 0.38];

  // —— 大字 OVERLOAD ——
  // A 段：字距拉开 + 字母漂移（每 3 帧更新，确定性种子）
  // B 段：整体由 7 条水平带 clip 副本渲染，各带独立错位（每 4 帧更新）
  // C 段：字母向中心聚合（stagger 2 帧）并淡出
  const tick3 = Math.floor(f / 3);
  const tick4 = Math.floor(f / 4);
  const tracking = lerp(f, [0, 11], [10, 26]);
  const driftAmp = 12; // B 段的切割感由带错位提供，字母漂移保持小幅度以保留字体可读性

  const letterTransform = (i: number): string => {
    // C 段聚合
    if (segC) {
      const agg = lerp(f, [65 + i * 2, 95 + i * 2], [1, 0], easeInCubic);
      const dx = hr(-driftAmp, driftAmp, tick3, i) * agg;
      const dy = hr(-driftAmp, driftAmp, tick3, i + 50) * agg;
      const rot = hr(-8, 8, tick3, i + 99) * agg;
      return `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    }
    // L / D 字母脱落（F25 起）
    let extraY = 0;
    let extraRot = 0;
    if (f >= 25 && (i === 4 || i === 7)) {
      const t = lerp(f, [25, 34], [0, 1], easeOutCubic);
      extraY = 60 * t;
      extraRot = 20 * t;
    }
    const dx = hr(-driftAmp, driftAmp, tick3, i);
    const dy = hr(-driftAmp, driftAmp, tick3, i + 50) + extraY;
    const rot = hr(-5, 5, tick3, i + 99) + extraRot;
    return `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
  };

  const letterOpacity = (i: number): number => {
    if (segC) return lerp(f, [82 + i, 92 + i], [1, 0], easeInCubic);
    return 1;
  };

  // —— C 段：SIGNAL 字标浮现 ——
  const sigT = lerp(f, [84, 96], [0, 1], easeOutCubic);
  // —— C 段：12 条放射线爆散 ——
  const rayLen = f >= 82 ? (f - 82) * 18 : 0;

  // —— B 段局部反相块（缓慢移动，floor(f/12) 缓变种子）——
  const bTick = Math.floor(f / 12);

  // —— 白闪：单帧冲击（F36/48/58）+ F80–F81 单次 2 帧 ——
  const flash = f === 36 || f === 48 || f === 58 || f === 80 || f === 81;

  // —— C 段大数字 05 ——
  const numScale = lerp(f, [30, 64], [1, 1.4]);

  const status = f < 15 ? "STATUS: NOMINAL" : f < 85 ? "STATUS: ERR 0x1F" : "STATUS: RESOLVING";

  // —— B 段：7 带切割渲染的大字（带高在带内按字块 190px 计算）——
  const BANDS = 7;

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      {/* 图形层 */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <g transform={`translate(540 860) scale(${impact}) translate(-540 -860)`}>
          <Grid frame={f} spacing={20} bounds={[60, 180, 1020, 1400]} opacity={0.28} offsetY={flowY} />
          <Rings
            cx={540}
            cy={860}
            radii={radii}
            colors={[WHITE, CYAN, WHITE]}
            rotations={[f * 3, -f * 4, f * 5]}
            dash={14}
            strokeWidth={1.5}
          />

          {/* C 段：12 条放射线爆散 */}
          {segC &&
            Array.from({ length: 12 }, (_, i) => {
              const a = (i * Math.PI * 2) / 12 + 0.13;
              const x1 = 540 + Math.cos(a) * 90;
              const y1 = 860 + Math.sin(a) * 90;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={540 + Math.cos(a) * (90 + rayLen)}
                  y2={860 + Math.sin(a) * (90 + rayLen)}
                  stroke={WHITE}
                  strokeWidth={2}
                  opacity={lerp(f, [82, 99], [0.9, 0.5])}
                />
              );
            })}

          {/* C 段：SIGNAL 字标（青蓝描边 + 白填充） */}
          {segC && sigT > 0 && (
            <text
              x={540}
              y={860 + 46}
              textAnchor="middle"
              fontFamily={SANS}
              fontWeight={700}
              fontSize={130}
              letterSpacing={8}
              fill={WHITE}
              stroke={CYAN}
              strokeWidth={2}
              opacity={sigT}
              transform={`translate(540 860) scale(${0.8 + 0.2 * sigT}) translate(-540 -860)`}
            >
              SIGNAL
            </text>
          )}

          {/* B 段：局部反相块（缓慢移动） */}
          {segB && (
            <>
              <InvertBand x={hr(60, 300, bTick, 1)} y={hr(260, 1000, bTick, 2)} w={380} h={200} tick={bTick} seed={7} />
              <InvertBand x={hr(560, 700, bTick, 3)} y={hr(300, 1100, bTick, 4)} w={300} h={150} tick={bTick} seed={13} />
            </>
          )}

          {/* 背景大数字 05（描边） */}
          <text
            x={540}
            y={1560}
            textAnchor="middle"
            fill="none"
            stroke={WHITE}
            strokeWidth={1.5}
            opacity={0.35}
            fontFamily={SANS}
            fontWeight={700}
            fontSize={300}
            transform={`translate(540 1500) scale(${numScale}) translate(-540 -1500)`}
          >
            05
          </text>

          <CornerBrackets inset={40} len={36} opacity={0.8} />
        </g>

        {/* F80–F81 单次白闪（2 帧，非连续频闪） */}
        <Flash on={f === 80 || f === 81} />
      </svg>

      {/* 字体层（HTML）——A/B 段大字主体 */}
      {f < 92 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${impact})`, transformOrigin: "540px 860px" }}>
          {segB ? (
            /* B 段：以字块为基准的 7 带切割（带高=字块高/7，中央带小错位保字形） */
            Array.from({ length: BANDS }, (_, b) => {
              const bandH = 190 / BANDS;
              const off = hr(-1, 1, tick4, b) * (34 * (1 - Math.abs(b - 3) / 4.5)) * (b % 2 === 0 ? 1 : -0.85);
              return (
                <div
                  key={b}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 770,
                    width: 1080,
                    height: 190,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 140,
                    color: WHITE,
                    letterSpacing: tracking,
                    lineHeight: 1,
                    clipPath: `inset(${b * bandH}px 0 ${190 - (b + 1) * bandH}px 0)`,
                    transform: `translateX(${off}px)`,
                  }}
                >
                  {WORD.map((ch, i) => (
                    <span key={i} style={{ display: "inline-block", transform: letterTransform(i) }}>
                      {ch}
                    </span>
                  ))}
                </div>
              );
            })
          ) : (
            /* A 段（及 C 段淡出尾）：单份大字（与 B 段字块位置一致，切换无跳动） */
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 770,
                width: 1080,
                height: 190,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 140,
                color: WHITE,
                letterSpacing: tracking,
                lineHeight: 1,
              }}
            >
              {WORD.map((ch, i) => (
                <span key={i} style={{ display: "inline-block", opacity: letterOpacity(i), transform: letterTransform(i) }}>
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A/B 段单帧白闪（冲击层，1 帧粒度） */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920">
          <Flash on={f === 36 || f === 48 || f === 58} opacity={0.9} />
        </svg>
      </AbsoluteFill>

      {/* 标注层 */}
      <TopBar left="SEG 05/07" right={f < 85 ? "OVERLOAD" : "RECONSTRUCT"} />
      <Readout left={status} center="0431.7 HZ" right={tc(f + globalOffset)} color={f >= 85 ? CYAN : WHITE} />

      {/* 音轨（全片嵌入时关闭，由 SignalV2 播放定稿主轨） */}
      {withAudio && <Audio src={staticFile("signal-v2-shot05.wav")} />}
    </AbsoluteFill>
  );
};
