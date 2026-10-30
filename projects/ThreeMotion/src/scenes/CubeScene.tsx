import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 缓慢旋转的立方体。
 *
 * 关键点：旋转角度完全由 Remotion 的当前帧推导（纯函数），
 * 不使用 three 的时钟 / requestAnimationFrame，
 * 因此预览与最终渲染逐帧一致（deterministic）。
 */
const Cube: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // 0 -> 1 的归一化进度；一圈缓慢旋转（含一点俯仰变化，视觉更立体）
  const progress = frame / durationInFrames;
  const angle = progress * Math.PI * 2;

  return (
    <mesh rotation={[angle * 0.35, angle, 0]}>
      <boxGeometry args={[1.6, 1.6, 1.6]} />
      <meshStandardMaterial color="#4f9cf9" roughness={0.25} metalness={0.4} />
    </mesh>
  );
};

/**
 * 整个 3D 场景：背景、灯光、摄像机、模型。
 * ThreeCanvas 会自动和 Remotion 的画布尺寸 / 当前帧同步。
 */
export const CubeScene: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ fov: 45, position: [0, 0, 6] }}
      style={{ backgroundColor: "#0b1020" }}
    >
      {/* 背景色（同时影响渲染输出的底色） */}
      <color attach="background" args={["#0b1020"]} />

      {/* 基础灯光：柔和环境光 + 主方向光 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-5, -2, -4]} intensity={0.6} color="#7aa2ff" />

      <Cube />
    </ThreeCanvas>
  );
};
