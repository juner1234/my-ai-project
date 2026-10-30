import React from "react";
import { PALETTE } from "./theme";

/**
 * 手绘彩铅滤镜（独立工具）
 * ------------------------------------------------------------------
 * 让 SVG 矢量元素产生手绘彩铅绘本质感：
 *   - 边缘轻微抖动（wobble），弱化规整矢量感
 *   - 色块内叠加彩铅颗粒（ multiply 柔化，降低饱和/对比）
 *   - 轻微柔化，避免尖锐边缘
 * 仅作用于矢量层，暖暖人物保持原画 unaffected。
 */
export const HAND_FILTER = `url(#${ROUGH_FILTER_ID})`;

export const HandDrawnDefs: React.FC = () => (
  <defs>
    <filter id={ROUGH_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      {/* 边缘抖动 */}
      <feTurbulence type="fractalNoise" baseFrequency="0.013 0.022" numOctaves="3" seed="5" result="warp" />
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="warped" />
      {/* 彩铅颗粒：灰噪点 → 压缩向白 → 仅在形状内 → multiply 柔化 */}
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="11" result="grain" />
      <feColorMatrix in="grain" type="saturate" values="0" result="gray" />
      <feComponentTransfer in="gray" result="soft">
        <feFuncR type="linear" slope="0.32" intercept="0.68" />
        <feFuncG type="linear" slope="0.32" intercept="0.68" />
        <feFuncB type="linear" slope="0.32" intercept="0.68" />
        <feFuncA type="linear" slope="0" intercept="1" />
      </feComponentTransfer>
      <feComposite in="soft" in2="warped" operator="in" result="texture" />
      <feBlend in="texture" in2="warped" mode="multiply" result="textured" />
      <feComposite in="textured" in2="warped" operator="in" result="clipped" />
      {/* 轻柔化 */}
      <feGaussianBlur in="clipped" stdDeviation="0.5" />
    </filter>
    {/* 纸张纤维叠加，统一“印在纸上的”质感，仅用于矢量层 */}
    <pattern id="ep01-paperfiber" x="0" y="0" width="220" height="220" patternUnits="userSpaceOnUse">
      <rect width="220" height="220" fill="transparent" />
      <g opacity="0.08" stroke={PALETTE.pencil} strokeWidth="0.6" fill="none">
        <path d="M0 40 C60 36 120 44 220 38" />
        <path d="M0 110 C70 104 150 118 220 108" />
        <path d="M0 175 C50 170 130 182 220 172" />
      </g>
    </pattern>
  </defs>
);
