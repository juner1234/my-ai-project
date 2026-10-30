import type React from "react";
import { NeonReshape } from "./NeonReshape";
import { GroundSystem } from "./GroundSystem";
import { FrameConstellation } from "./FrameConstellation";

export interface SfEffect {
  Comp: React.FC<{ baseFrame: number; durationInFrames: number }>;
  /** true = 需要被 <svg> 包裹（矢量层）；false = 自带 HTML 层 */
  svg: boolean;
  title: string;
}

/** 节点 id → Style Frame 效果组件（新节点接入时在此登记） */
export const SF_EFFECTS: Record<string, SfEffect> = {
  "FX-002": { Comp: NeonReshape, svg: true, title: "FX-002 // NEON RESHAPE" },
  "FX-004": { Comp: GroundSystem, svg: true, title: "FX-004 // GROUND SYSTEM" },
  "FX-005": { Comp: FrameConstellation, svg: false, title: "FX-005 // FRAME CONSTELLATION" },
};
