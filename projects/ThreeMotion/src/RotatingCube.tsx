import React from "react";
import { AbsoluteFill } from "remotion";
import { CubeScene } from "./scenes/CubeScene";

/**
 * 合成入口：一个最简单的 3D 测试场景。
 * 画面 = 3D 场景（ThreeCanvas 已按视频尺寸铺满）。
 */
export const RotatingCube: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1020" }}>
      <CubeScene />
    </AbsoluteFill>
  );
};
