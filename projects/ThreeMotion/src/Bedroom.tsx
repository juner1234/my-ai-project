import React from "react";
import { AbsoluteFill } from "remotion";
import { BedroomScene } from "./scenes/bedroom/BedroomScene";

/**
 * 治愈系少女童话风卧室 —— 复杂多部件 3D 场景。
 * 摄像机缓慢环绕，窗光、吊灯、串灯、气球等元素随帧轻动。
 */
export const Bedroom: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#F7EFF6" }}>
      <BedroomScene />
    </AbsoluteFill>
  );
};