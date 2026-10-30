import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "./theme";
import { HandDrawnDefs } from "./HandDrawn";

export const PaperBackground: React.FC<{ tone?: string }> = ({ tone = PALETTE.paper }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: tone }}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0 }}>
        <HandDrawnDefs />
        <rect width="1920" height="1080" fill={tone} />
        {/* 轻柔纸页暖调 vignette */}
        <radialGradient id="ep01-vig" cx="50%" cy="42%" r="74%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor={PALETTE.wood} stopOpacity="0.12" />
        </radialGradient>
        <rect width="1920" height="1080" fill="url(#ep01-vig)" />
        {/* 纸纤维 */}
        <rect width="1920" height="1080" fill="url(#ep01-paperfiber)" />
      </svg>
    </AbsoluteFill>
  );
};
