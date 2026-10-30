import React from "react";
import { RealSpinePlayer } from "../spine/RealSpinePlayer";

/**
 * 暖暖（独立元素）
 * 仅封装现有正面 Spine 播放器，不改骨骼、不改外观。
 * 仅暴露位移/缩放/旋转，动作能力受现有骨骼限制（呼吸 / 歪头 / 摇头）。
 * 若将来替换人物资源，只改此处，不影响场景其它元素。
 */
interface Props {
  x?: number;
  y?: number;
  size?: number;
  showWarnings?: boolean;
  /**
   * 整组微倾（deg，正=向右倾）。
   * 现有骨骼层未提供“单独头部”的岁时序注入，故用容器旋转近似歪头/倾身；
   * 头部轻摆与呼吸来自 RealSpinePlayer 注入的 Spine 动画（呼吸/头摆）。
   */
  tilt?: number;
  opacity?: number;
  flipX?: boolean;
}

export const WarmWarm: React.FC<Props> = ({
  x = 0,
  y = 0,
  size = 720,
  showWarnings = false,
  tilt = 0,
  opacity = 1,
  flipX = false,
}) => {
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none" }}>
      <div
        style={{
          transform: `rotate(${tilt}deg) scaleX(${flipX ? -1 : 1})`,
          transformOrigin: "50% 86%",
        }}
      >
        <RealSpinePlayer size={size} showWarnings={showWarnings} />
      </div>
    </div>
  );
};
