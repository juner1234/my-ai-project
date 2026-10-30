import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PALETTE } from "./theme";
import { PaperBackground, PaperGrain } from "./PaperBackground";
import { Wardrobe } from "./Wardrobe";
import { MomHand } from "./MomHand";
import { Subtitle } from "./Subtitle";
import { WarmWarm } from "./Character";
import { Star, QMark } from "./Sticker";
import { useEp01Font } from "./useFont";

/**
 * EP01 · 动态验证样片（仅 10.5 秒，非完整成片）
 * ------------------------------------------------------------------
 * 验证目标（等待审核，配音/音乐暂缓）：
 *   1. 妈妈不出现人物形象：仅局部手（伸入/提裙/轻摇），SVG 独立层。
 *   2. 暖暖不固定：三段自然换位 + 换大小（开始大 → 略小 → 回落），呼吸/头摆来自现有 Spine。
 *   3. 元素独立图层、无不合理遮挡（小臂高出柜顶；手/裙在门之前）。
 *
 * 分段（24fps）：
 *   f0-70    暖暖弹入 · “嗨，我叫暖暖。”
 *   f76-120  换位变小 · “我有一个超爱我的妈妈。”
 *   f126-186 衣柜滑入+手伸入提裙 · “妈妈最大爱好，就是给我挑新衣服。”
 *   f192-250 轻摇/歪头 · “穿这件？还是这件？”
 */

const CLAMP = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const easeOut = (n: number) => ({ ...CLAMP, easing: Easing.out(Easing.cubic), durationInFrames: n });
const soft = (n: number) => ({ ...CLAMP, easing: Easing.inOut(Easing.cubic), durationInFrames: n });

/** 单句字幕：入场弹入 + 结尾淡出 */
const Line: React.FC<{ text: string; start: number; end: number; bottom?: number }> = ({ text, start, end, bottom }) => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [start, start + 12], [0, 1], soft(12));
  const out = interpolate(frame, [end - 8, end], [1, 0], CLAMP);
  return <Subtitle text={text} reveal={reveal} opacity={out} bottom={bottom} />;
};

const VectorLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
    {children}
  </svg>
);

const FontGate: React.FC = () => {
  useEp01Font();
  return null;
};

export const EP01Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ---------- 暖暖：三段换位 + 换大小 + 歪头 ---------- */
  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 120, mass: 0.7 } }); // 0→1 弹入
  const kx = interpolate(frame, [76, 104, 128, 156], [-30, 95, 95, -55], soft(28));
  const ky = interpolate(frame, [76, 104, 128, 156], [200, 255, 255, 300], soft(28));
  const ks = interpolate(frame, [76, 104, 128, 156], [800, 705, 705, 755], soft(28));
  // 歪头：提到裙子后向右轻倾，并加极轻微的回正摆动（近似点头）
  const tiltBase = interpolate(frame, [180, 206], [0, 6], soft(26));
  const tilt = tiltBase + interpolate(frame, [206, 252], [0, 1.4], soft(46)) * Math.sin((frame - 206) * 0.25) * 1.2;

  /* ---------- 衣柜：右侧滑入 + 柜门打开 ---------- */
  const wx = interpolate(frame, [126, 146], [2080, 1300], soft(20));
  const wOpen = interpolate(frame, [158, 174], [0, 0.55], soft(16));

  /* ---------- 妈妈的手：滑入 → 提裙 → 轻摇 ---------- */
  const hx = interpolate(frame, [130, 150], [2120, 1210], soft(20));
  const hyBase = interpolate(frame, [130, 150], [-180, 300], soft(20));
  const lift = interpolate(frame, [172, 192], [0, 1], soft(20));
  const hy = hyBase - lift * 26 + lift * 3 * Math.sin((frame - 176) * 0.22);
  const hrot = interpolate(frame, [130, 150], [-13, -2], soft(20)) + lift * 4 * Math.sin((frame - 176) * 0.22);
  const dressSway = lift * 5 * Math.sin((frame - 176) * 0.22 - 0.55);

  /* ---------- 问号贴纸：第四句逐个弹入 ---------- */
  const q1 = spring({ frame: frame - 196, fps, config: { damping: 9, stiffness: 130 } });
  const q2 = spring({ frame: frame - 208, fps, config: { damping: 9, stiffness: 130 } });
  const starIn = spring({ frame: frame - 24, fps, config: { damping: 11, stiffness: 110 } });

  return (
    <AbsoluteFill>
      <FontGate />
      <PaperBackground />
      <VectorLayer>
        {/* 墙面与地板（场景底，独立层） */}
        <path d="M0 880 H1920" stroke={PALETTE.wood} strokeWidth={2} opacity={0.28} fill="none" />
        <rect x="0" y="880" width="1920" height="200" fill={PALETTE.paperWarm} opacity={0.5} />

        {/* 衣柜（滑入，门随台词打开） */}
        <Wardrobe x={wx} y={560} scale={0.98} open={wOpen} dressCount={1} />

        {/* 妈妈的手 + 挂着的裙子：画在衣柜之后（更上层），构成“门内提裙” */}
        <MomHand
          x={hx}
          y={hy}
          rotation={hrot}
          dressColor={PALETTE.rose}
          dressSway={dressSway}
        />

        {/* 装饰贴纸 */}
        <Star x={620} y={235} scale={1.05} opacity={starIn * 0.8} />
        <QMark x={690} y={415} scale={1.7} opacity={q1 * 0.85} rotation={8} />
        <QMark x={770} y={505} scale={1.15} opacity={q2 * 0.75} rotation={-10} color={PALETTE.grayBlue} />
      </VectorLayer>

      {/* 暖暖（DOM 独立层，动作：呼吸/头摆 来自 Spine；换位/歪头 由 Remotion 驱动） */}
      <WarmWarm x={kx} y={ky - (1 - pop) * 30} size={ks * (0.82 + 0.18 * pop)} tilt={tilt} />

      <Line text="嗨，我叫暖暖。" start={18} end={70} />
      <Line text="我有一个超爱我的妈妈。" start={76} end={120} />
      <Line text="妈妈最大爱好，就是给我挑新衣服。" start={126} end={186} />
      <Line text="穿这件？还是这件？" start={192} end={250} bottom={44} />

      <PaperGrain />
    </AbsoluteFill>
  );
};

/** 结束 */
