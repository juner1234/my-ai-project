import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE, PENCIL } from "./theme";
import { PaperBackground, PaperGrain } from "./PaperBackground";
import { Wardrobe } from "./Wardrobe";
import { Dress } from "./Dress";
import { Bow } from "./Bow";
import { Star, Heart, Note, Arrow, DashedFrame, Tape, Squiggle } from "./Sticker";
import { Subtitle } from "./Subtitle";
import { WarmWarm } from "./Character";
import { useEp01Font } from "./useFont";

/**
 * EP01 阶段二 · 静态视觉样稿
 * ------------------------------------------------------------------
 * 目的：验证统一美术风格、元素分层管理、字幕效果。
 * 每个场景由独立元素拼装，元素可单独删除/替换/调位置（见各组件文件）。
 * 这不是完整视频，只是静态构图样稿。
 *
 * 本轮调整（四项目标）：
 *   1. 三张画面中暖暖的位置/大小/构图各不相同（建立“人物—道具—留白”的三种关系）。
 *   2. 衣柜与新增素材适度降低不透明度，退为场景底，不抢暖暖。
 *   3. 全画布叠加彩铅颗粒（PaperGrain），与暖暖的水彩人物统一为柔和手绘绘本质感。
 *   4. 修正不合理遮挡（便签不再被暖暖身体压住；涌出衣物画在柜门之前）。
 */

/** 场景层：只放 SVG 矢量元素（衣柜/裙子/贴纸等） */
const VectorLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
    {children}
  </svg>
);

const Backdrop: React.FC = () => <PaperBackground />;

/** 触发字体加载的占位组件（保证字幕用真实字体渲染） */
const FontGate: React.FC = () => {
  useEp01Font();
  return null;
};

/* ---------- 样稿 A：开场 · 人物偏左放大 · 衣柜在右 ----------
 * 构图关系：暖暖为主视觉（大），衣柜为右侧道具，中间大量留白给旁白情绪。 */
export const EP01Style_WardrobeOpen: React.FC = () => (
  <AbsoluteFill>
    <FontGate />
    <Backdrop />
    <VectorLayer>
      {/* 墙面与地板（可整体替换的场景底，独立于衣柜） */}
      <path d="M0 880 H1920" stroke={PALETTE.wood} strokeWidth={2} opacity={0.28} fill="none" />
      <rect x="0" y="880" width="1920" height="200" fill={PALETTE.paperWarm} opacity={0.5} />

      {/* 衣柜（半开，独立元素）—— 默认透明度已被 theme 压低 */}
      <Wardrobe x={1300} y={560} scale={1.0} open={0.45} dressCount={4} />

      {/* 贴纸点缀（各自独立，整体降透明度退为背景） */}
      <Star x={980} y={220} scale={1.1} opacity={PENCIL.decorOpacity} />
      <Star x={1740} y={300} scale={0.8} rotation={18} opacity={PENCIL.decorOpacity} />
      <Heart x={640} y={250} scale={1.0} opacity={PENCIL.decorOpacity} />
      <Squiggle x={1020} y={820} w={70} opacity={PENCIL.decorOpacity} />
    </VectorLayer>
    {/* 暖暖（独立元素，DOM 层，位于场景之上） */}
    <WarmWarm x={-10} y={210} size={820} />
    <Subtitle text="嗨，我叫暖暖。我有一个超爱我的妈妈。" reveal={1} />
    <PaperGrain />
  </AbsoluteFill>
);

/* ---------- 样稿 B：手账构图 · 内心吐槽 ----------
 * 构图关系：暖暖缩小退到左下，手账内容占右上；便签全部上移，避免压在暖暖身上。 */
export const EP01Style_Journal: React.FC = () => (
  <AbsoluteFill>
    <FontGate />
    <Backdrop />
    <VectorLayer>
      {/* 手账虚线框 + 纸胶带（右上区域） */}
      <DashedFrame x={1240} y={500} w={600} h={540} rotation={-2} opacity={PENCIL.decorOpacity} />
      <Tape x={980} y={250} rotation={-12} opacity={0.75} />
      <Tape x={1540} y={790} rotation={8} opacity={0.75} />

      {/* 展示用裙子（本帧主体之一，保持较高不透明度但略柔） */}
      <Dress x={1090} y={470} scale={1.1} color={PALETTE.creamPink} variant="pinafore" rotation={-4} opacity={0.95} />
      <Dress x={1350} y={490} scale={1.0} color={PALETTE.milkBlue} variant="puff" rotation={3} opacity={0.95} />
      <Dress x={1530} y={580} scale={0.9} color={PALETTE.rose} variant="long" rotation={-6} opacity={0.95} />

      <Bow x={1030} y={720} scale={1.1} rotation={-8} opacity={PENCIL.decorOpacity} />
      <Bow x={1600} y={370} scale={0.9} rotation={14} color={PALETTE.creamPinkDeep} opacity={PENCIL.decorOpacity} />

      {/* 手写便签 + 箭头：整体放在暖暖上方/右侧，杜绝被人物遮挡 */}
      <Note x={400} y={270} w={230} h={150} rotation={-5} text="穿这件？" opacity={PENCIL.decorOpacity} />
      <Arrow x={540} y={360} len={130} rotation={24} opacity={PENCIL.decorOpacity} />
      <Note x={700} y={470} w={230} h={150} rotation={4} color={PALETTE.milkBlue} text="还是这件？" opacity={PENCIL.decorOpacity} />

      <Star x={840} y={200} scale={0.9} color={PALETTE.creamYellow} opacity={PENCIL.decorOpacity} />
      <Heart x={900} y={880} scale={0.8} opacity={PENCIL.decorOpacity} />
      <Squiggle x={1180} y={250} w={80} opacity={PENCIL.decorOpacity} />
    </VectorLayer>
    {/* 字幕是 DOM 层，必须在 VectorLayer（SVG）之外，否则不渲染 */}
    <Subtitle text="妈妈哪里是养女儿，她分明在玩奇迹暖暖。" reveal={1} />
    <WarmWarm x={30} y={380} size={620} />
    <PaperGrain />
  </AbsoluteFill>
);

/* ---------- 样稿 C：衣柜弹开 · “亿点点”高潮 ----------
 * 构图关系：暖暖缩小、站在衣柜前作为高潮的“反应者”，不再与柜体争夺画面中心。 */
export const EP01Style_Burst: React.FC = () => (
  <AbsoluteFill>
    <FontGate />
    <Backdrop />
    <VectorLayer>
      {/* 满地裙子（各自独立元素，降透明度做柔和的“溢出感”背景） */}
      <Dress x={300} y={920} scale={1.45} rotation={-24} color={PALETTE.rose} variant="puff" opacity={0.85} />
      <Dress x={1640} y={930} scale={1.4} rotation={26} color={PALETTE.milkBlue} variant="long" opacity={0.85} />

      {/* 涌出的衣物与蝴蝶结由 Wardrobe.burst 承载（已画在柜门之前=更上层） */}
      <Wardrobe x={960} y={590} scale={1.02} open={1} bulge={0.6} burst={1} dressCount={6} />

      {/* 飘散蝴蝶结与星星（背景装饰，降透明度） */}
      <Bow x={520} y={250} scale={1.25} rotation={-18} opacity={PENCIL.decorOpacity} />
      <Bow x={1440} y={240} scale={1.15} rotation={16} color={PALETTE.creamPinkDeep} opacity={PENCIL.decorOpacity} />
      <Star x={760} y={180} scale={1.2} opacity={PENCIL.decorOpacity} />
      <Star x={1180} y={150} scale={0.9} rotation={22} opacity={PENCIL.decorOpacity} />
      <Heart x={300} y={430} scale={1.1} opacity={PENCIL.decorOpacity} />
      <Heart x={1660} y={520} scale={0.9} opacity={PENCIL.decorOpacity} />
    </VectorLayer>
    {/* 字幕是 DOM 层，必须在 VectorLayer（SVG）之外，否则不渲染；下移避开柜脚与阴影 */}
    <Subtitle text="不多，也就亿点点。" reveal={1} fontSize={62} color={PALETTE.creamPinkDeep} bottom={36} />
    {/* 暖暖站位：偏左居中、较小，站在衣柜前方承担“被裙子包围”的反应 */}
    <WarmWarm x={90} y={440} size={520} />
    <PaperGrain />
  </AbsoluteFill>
);

/** 默认导出取高潮样稿（其余样稿各自独立注册为 Composition） */
export const EP01StyleSample: React.FC = () => <EP01Style_Burst />;
