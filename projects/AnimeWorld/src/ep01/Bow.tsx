import React from "react";
import { PALETTE, STROKE } from "./theme";

/**
 * 手绘蝴蝶结（独立元素）
 * 可单独复用/替换/做弹入动画。
 */
interface Props {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  color?: string;
  opacity?: number;
}

export const Bow: React.FC<Props> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotation = 0,
  color = PALETTE.rose,
  opacity = 1,
}) => {
  const c = STROKE.color;
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
      opacity={opacity}
      stroke={c}
      strokeWidth={STROKE.fine}
      strokeLinejoin="round"
    >
      <path d="M0 0 q-26 -16 -30 4 q6 16 30 2 q24 14 30 -2 q-4 -20 -30 -4 Z" fill={color} />
      <circle cx="0" cy="1" r="5" fill={PALETTE.offWhite} />
      <path d="M-6 6 q-8 16 -16 22 M6 6 q8 16 16 22" fill="none" />
    </g>
  );
};
