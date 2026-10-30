import React, { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";

/**
 * 摄像机动画：缓慢环绕 + 轻微推近 + 呼吸式起伏。
 * 全部由当前帧推导，保证预览与渲染一致。
 */
export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const camera = useThree((s) => s.camera);
  const target = useMemo(() => new Vector3(0, 2.6, -1.0), []);

  useLayoutEffect(() => {
    const t = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
    const theta = 0.62 - 0.12 * t; // 环绕角度
    const radius = 18.0 - 1.4 * t; // 轻推进
    const height = 8.6 + 0.6 * Math.sin(t * Math.PI * 2);
    camera.position.set(
      radius * Math.sin(theta),
      height,
      radius * Math.cos(theta)
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [frame, durationInFrames, camera, target]);

  return null;
};