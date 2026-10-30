import React from "react";
import { PALETTE, STROKE } from "./theme";

/**
 * 手绘裙子（独立元素）
 * 每一条裙子是独立组件实例：可单独删除 / 替换 / 改位置 / 改动画。
 * variant 决定款式，color 决定主色，均来自统一色板。
 */
export type DressVariant = "pinafore" | "puff" | "long";

interface Props {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  color?: string;
  lace?: string;
  variant?: DressVariant;
  opacity?: number;
}

export const Dress: React.FC<Props> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotation = 0,
  color = PALETTE.creamPink,
  lace = PALETTE.offWhite,
  variant = "pinafore",
  opacity = 1,
}) => {
  const c = STROKE.color;
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
      opacity={opacity}
      stroke={c}
      strokeWidth={STROKE.main}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* 吊挂点 */}
      <circle cx="0" cy="-118" r="3.5" fill={c} stroke="none" />
      <path d="M0 -114 L0 -92" fill="none" />
      {/* 上身 */}
      <path
        d="M-30 -92 Q0 -100 30 -92 L26 -44 Q0 -38 -26 -44 Z"
        fill={lace}
      />
      <path d="M-30 -92 Q-6 -96 0 -80 Q6 -96 30 -92" fill="none" />
      {variant === "pinafore" && (
        <>
          {/* 背带 */}
          <path d="M-22 -90 L-16 -66 M22 -90 L16 -66" fill="none" />
          {/* 胸前小扣 */}
          <circle cx="-9" cy="-74" r="2.4" fill={PALETTE.grayBlue} stroke="none" />
          <circle cx="-9" cy="-62" r="2.4" fill={PALETTE.grayBlue} stroke="none" />
        </>
      )}
      {/* 裙摆 */}
      {variant === "long" ? (
        <path
          d="M-26 -44 Q-40 20 -30 84 Q0 96 30 84 Q40 20 26 -44 Q0 -38 -26 -44 Z"
          fill={color}
        />
      ) : (
        <path
          d="M-26 -44 Q-50 8 -44 30 Q0 46 44 30 Q50 8 26 -44 Q0 -38 -26 -44 Z"
          fill={color}
        />
      )}
      {/* 蕾丝裙边 */}
      <path
        d={
          variant === "long"
            ? "M-30 84 Q-22 92 -14 84 Q-6 92 2 84 Q10 92 18 84 Q26 92 30 84"
            : "M-44 30 Q-34 40 -22 30 Q-10 40 0 30 Q10 40 22 30 Q34 40 44 30"
        }
        fill="none"
        strokeWidth={STROKE.fine}
        opacity={0.9}
      />
      {/* 腰部蝴蝶结（可选装饰线） */}
      <path
        d="M0 -46 q-14 -8 -18 2 q4 8 18 2 q14 6 18 -2 q-4 -10 -18 -2 Z"
        fill={PALETTE.rose}
        strokeWidth={STROKE.fine}
      />
    </g>
  );
};
