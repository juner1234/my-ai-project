import React from "react";
import { PALETTE, FONT } from "./theme";

/**
 * 字幕（独立元素）
 * - 逐句一行，圆润手写体，浅棕/奶油粉/深奶茶色
 * - reveal 0..1 控制淡入 + 轻弹入（时间轴上插值）
 * - 位置可单独调整；默认贴在画面下方留白区，不遮挡暖暖脸与主体
 */
interface Props {
  text: string;
  /** 0..1 出现进度 */
  reveal?: number;
  /** 画面底部偏移 */
  bottom?: number;
  color?: string;
  fontSize?: number;
  /** 额外整行透明度（用于淡出） */
  opacity?: number;
}

export const Subtitle: React.FC<Props> = ({
  text,
  reveal = 1,
  bottom = 70,
  color = PALETTE.latte,
  fontSize = 54,
  opacity = 1,
}) => {
  const t = Math.max(0, Math.min(1, reveal));
  const o = Math.max(0, Math.min(1, t * opacity));
  const scale = 0.92 + t * 0.08;
  const ty = (1 - t) * 16;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          transform: `translateY(${ty}px) scale(${scale})`,
          opacity: o,
          color,
          fontFamily: FONT.subtitle,
          fontSize,
          lineHeight: 1.35,
          padding: "10px 30px",
          // 极浅的纸色描边，保证在纸纹上可读，同时不抢画面
          textShadow: `0 1px 0 ${PALETTE.paper}, 1px 0 0 ${PALETTE.paper}, -1px 0 0 ${PALETTE.paper}, 0 -1px 0 ${PALETTE.paper}`,
          letterSpacing: 2,
        }}
      >
        {text}
      </span>
    </div>
  );
};
