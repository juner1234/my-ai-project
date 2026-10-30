import React from "react";
import { PALETTE, PENCIL, STROKE } from "./theme";
import { Dress, DressVariant } from "./Dress";
import { Bow } from "./Bow";

/**
 * 手绘衣柜（独立元素，本集核心道具）
 * ------------------------------------------------------------------
 * 连续场景的唯一载体：出现 → 打开 → 越塞越满 → 柜门鼓起 → “亿点点”弹开。
 * 全部靠 props 驱动，可在 Remotion 时间轴上逐帧插值：
 *   open   0..1  柜门开合（用横向透视收缩模拟柜门向外打开，非消失的平面旋转）
 *   bulge  0..1  内部衣物鼓起（把柜门向外顶）
 *   burst  0..1  高潮：衣物/蝴蝶结涌出，柜门弹开
 * 柜体 / 柜门 / 内部衣物 / 涌出物 都是分离图层，可单独替换。
 */
interface Props {
  x?: number;
  y?: number;
  scale?: number;
  open?: number;
  bulge?: number;
  burst?: number;
  dressCount?: number;
  /** 整柜不透明度：默认略低，作为场景底而非主体 */
  opacity?: number;
}

const DRESS_COLORS = [PALETTE.creamPink, PALETTE.rose, PALETTE.milkBlue, PALETTE.creamYellow, PALETTE.creamPinkDeep];
const VARIANTS: DressVariant[] = ["pinafore", "puff", "long", "puff", "pinafore"];

export const Wardrobe: React.FC<Props> = ({
  x = 0,
  y = 0,
  scale = 1,
  open = 0,
  bulge = 0,
  burst = 0,
  dressCount = 5,
  opacity = PENCIL.wardrobeOpacity,
}) => {
  const c = STROKE.color;
  const W = 440;
  const H = 600;
  // 柜门打开的透视收缩：1=完全关闭 → 0.16=几乎开到侧面
  const doorSquash = 1 - Math.max(0, Math.min(1, open)) * 0.84;
  // 鼓起把门再顶开一点
  const squashed = Math.max(0.24, doorSquash - bulge * 0.1);
  const tilt = 4 + open * 8; // 打开时轻微外倾，增加手绘活气

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {/* 落地柔和阴影（独立装饰） */}
      <ellipse cx="0" cy={H / 2 + 34} rx={W * 0.55} ry="20" fill={PALETTE.wood} opacity="0.14" />

      {/* ---- 柜体：背板 + 内腔 + 顶檐 + 脚 ---- */}
      <g stroke={c} strokeWidth={STROKE.main} strokeLinejoin="round">
        <rect x={-W / 2} y={-H / 2} width={W} height={H} rx="18" fill={PALETTE.offWhite} />
        {/* 内腔 */}
        <rect x={-W / 2 + 20} y={-H / 2 + 26} width={W - 40} height={H - 52} rx="10" fill={PALETTE.paperWarm} stroke="none" />
        {/* 顶檐 */}
        <path
          d={`M${-W / 2 - 24} ${-H / 2} L${W / 2 + 24} ${-H / 2} L${W / 2 + 12} ${-H / 2 - 30} L${-W / 2 - 12} ${-H / 2 - 30} Z`}
          fill={PALETTE.wood}
        />
        {/* 脚 */}
        <path d={`M${-W / 2 + 34} ${H / 2} L${-W / 2 + 50} ${H / 2 + 32} L${-W / 2 + 10} ${H / 2 + 32} Z`} fill={PALETTE.woodDeep} />
        <path d={`M${W / 2 - 34} ${H / 2} L${W / 2 - 10} ${H / 2 + 32} L${W / 2 - 50} ${H / 2 + 32} Z`} fill={PALETTE.woodDeep} />
      </g>

      {/* ---- 内腔顶部挂杆 ---- */}
      <line x1={-W / 2 + 36} y1={-H / 2 + 64} x2={W / 2 - 36} y2={-H / 2 + 64} stroke={c} strokeWidth={STROKE.fine} opacity={0.55} />

      {/* ---- 内部：一排裙子（独立元素，可单独替换/调数量） ---- */}
      <g>
        {Array.from({ length: dressCount }).map((_, i) => {
          const n = dressCount;
          const spread = (i - (n - 1) / 2) * (Math.min(60, (W - 140) / Math.max(1, n - 1)));
          return (
            <Dress
              key={i}
              x={spread}
              y={-H / 2 + 178 + bulge * 22}
              scale={0.98}
              rotation={spread * 0.05}
              color={DRESS_COLORS[i % DRESS_COLORS.length]}
              variant={VARIANTS[i % VARIANTS.length]}
            />
          );
        })}
      </g>

      {/* ---- 鼓起：衣物从门缝挤出（独立图层，bulge 驱动） ---- */}
      {bulge > 0.02 && (
        <g opacity={Math.min(1, bulge * 1.4)}>
          {[-1, 1].map((s) => (
            <Dress
              key={s}
              x={s * (W / 2 - 40) * (0.6 + bulge * 0.4)}
              y={-40 + bulge * 30}
              scale={0.8}
              rotation={s * (10 + bulge * 22)}
              color={s < 0 ? PALETTE.rose : PALETTE.milkBlue}
              variant="puff"
            />
          ))}
        </g>
      )}

      {/* ---- 柜门（分离图层；横向收缩 + 轻微外倾，绕外侧立边打开） ---- */}
      {/* 左门：铰链在左外沿，门面向内延伸 */}
      <g transform={`translate(${-W / 2} 0) rotate(${-tilt * (1 - squashed)}) scale(${squashed} 1)`}>
        <rect x={0} y={-H / 2 + 16} width={W / 2 - 6} height={H - 32} rx="10" fill={PALETTE.wood} stroke={c} strokeWidth={STROKE.main} />
        <rect x={16} y={-H / 2 + 44} width={W / 2 - 44} height={H - 88} rx="8" fill="none" stroke={c} strokeWidth={STROKE.fine} opacity={0.5} />
        <circle cx={W / 2 - 34} cy={6} r="6" fill={PALETTE.woodDeep} stroke={c} strokeWidth={STROKE.fine} />
      </g>
      {/* 右门：铰链在右外沿 */}
      <g transform={`translate(${W / 2} 0) rotate(${tilt * (1 - squashed)}) scale(${squashed} 1)`}>
        <rect x={-(W / 2 - 6)} y={-H / 2 + 16} width={W / 2 - 6} height={H - 32} rx="10" fill={PALETTE.wood} stroke={c} strokeWidth={STROKE.main} />
        <rect x={-(W / 2 - 16)} y={-H / 2 + 44} width={W / 2 - 44} height={H - 88} rx="8" fill="none" stroke={c} strokeWidth={STROKE.fine} opacity={0.5} />
        <circle cx={-(W / 2 - 34)} cy={6} r="6" fill={PALETTE.woodDeep} stroke={c} strokeWidth={STROKE.fine} />
      </g>

      {/* ---- 高潮：衣物与蝴蝶结从柜中涌出（独立图层，burst 驱动） ----
           刻意画在柜门之后（更上层）：涌出的衣物应在打开的门“前面”，
           避免出现衣物被门遮挡的不合理关系。 */}
      {burst > 0 && (
        <g opacity={Math.min(1, burst * 1.2)}>
          {Array.from({ length: 8 }).map((_, i) => {
            const a = -78 + i * 22;
            const d = 70 + burst * (260 - i * 14);
            return (
              <Dress
                key={`b${i}`}
                x={Math.cos((a * Math.PI) / 180) * d}
                y={-70 + Math.sin((a * Math.PI) / 180) * d - burst * 40}
                scale={0.72 + (i % 3) * 0.12}
                rotation={a * 1.5}
                color={DRESS_COLORS[i % DRESS_COLORS.length]}
                variant={VARIANTS[(i + 2) % VARIANTS.length]}
              />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => (
            <Bow
              key={`bb${i}`}
              x={(i - 2.5) * 96}
              y={-300 - i * 20 - burst * 60}
              scale={0.85}
              rotation={(i - 3) * 24}
              color={i % 2 ? PALETTE.rose : PALETTE.creamPinkDeep}
            />
          ))}
        </g>
      )}
    </g>
  );
};
