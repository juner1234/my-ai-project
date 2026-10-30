import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { NeonReshape } from "./NeonReshape";
import { GroundSystem } from "./GroundSystem";
import { FrameConstellation } from "./FrameConstellation";
import { WINDOWS, SF_VIDEO } from "./windows";
import { POSE_W, POSE_H } from "./pose";

const Stage: React.FC<{ baseFrame: number; children: React.ReactNode }> = ({ baseFrame, children }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile(SF_VIDEO)} startFrom={baseFrame} />
    {children}
  </AbsoluteFill>
);

export const SvgLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    width="100%"
    height="100%"
    viewBox={`0 0 ${POSE_W} ${POSE_H}`}
    preserveAspectRatio="none"
    style={{ position: "absolute", inset: 0 }}
  >
    {children}
  </svg>
);

export const PreviewA2: React.FC = () => (
  <Stage baseFrame={WINDOWS.A2.baseFrame}>
    <SvgLayer>
      <NeonReshape baseFrame={WINDOWS.A2.baseFrame} durationInFrames={WINDOWS.A2.durationInFrames} />
    </SvgLayer>
  </Stage>
);

export const PreviewB1: React.FC = () => (
  <Stage baseFrame={WINDOWS.B1.baseFrame}>
    <SvgLayer>
      <GroundSystem baseFrame={WINDOWS.B1.baseFrame} durationInFrames={WINDOWS.B1.durationInFrames} />
    </SvgLayer>
  </Stage>
);

export const PreviewC1: React.FC = () => (
  <Stage baseFrame={WINDOWS.C1.baseFrame}>
    <FrameConstellation baseFrame={WINDOWS.C1.baseFrame} durationInFrames={WINDOWS.C1.durationInFrames} />
  </Stage>
);
