import React from "react";
import { PALETTE, PENCIL, STROKE } from "./theme";
import { Dress } from "./Dress";

/**
 * 妈妈的手（独立 SVG 层，用于 EP01 的“局部手部动作”）
 * ------------------------------------------------------------------
 * 硬性约定（来自需求）：
 *   - 妈妈不出现完整人物形象：无脸、无身体、无剪影；
 *     只允许“局部手”从画面外伸入辅助叙事（拿衣架 / 挑裙子 / 整理衣柜）。
 *   - 画风与暖暖统一：柔和手绘彩铅，禁止写实手部。
 *
 * 本组件只画：小臂 + 圆润柔软的拳头 + 枕式衣架。
 * 裙子作为独立子层挂在衣架下方（可单独替换/删除）。
 * 小臂方向固指向右上，末端始终伸到画框之外，不出现“断臂”。
 */

export type MomHandMode = "reach" | "present";

interface Props {
  x?: number;
  y?: number;
  scale?: number;
  /** 整组旋转（deg），用于伸手 / 放下 / 轻摇 */
  rotation?: number;
  opacity?: number;
  /** 挂在衣架上的裙子（传 undefined 即空衣架） */
  dressColor?: string;
  /** 裙子相对衣架的额外摆动（deg），由 Remotion 逐帧驱动 */
  dressSway?: number;
}

/** 柔软圆润的拳头 + 小臂（彩铅感：软轮廓、暖棕描边） */
export const MomHand: React.FC<Props> = ({
  x = 0,
  y = 0,
  scale = 1,
  rotation = 0,
  opacity = 1,
  dressColor,
  dressSway = 0,
}) => {
  const c = STROKE.color;
  const skin = PALETTE.offWhite;

  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
      opacity={opacity}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* ---- 小臂：从拳向右上伸入画外，先描边再覆盖肤色形成软胶囊 ---- */}
      <path d="M16 10 Q 420 -60 880 -232" fill="none" stroke={c} strokeWidth={68} opacity={STROKE.opacity} />
      <path d="M16 10 Q 420 -60 880 -232" fill="none" stroke={skin} strokeWidth={62} />

      {/* ---- 枕式衣架：钩 + 三角臂 + 横杆 ---- */}
      <g stroke={c} strokeWidth={STROKE.fine} fill="none">
        <path d="M0 -30 q -2 -12 8 -14 q 9 -3 11 6" />
        <path d="M0 -22 L-46 26 M0 -22 L46 26 M-46 26 L46 26" />
      </g>

      {/* ---- 挂着的裙子（独立子层） ---- */}
      {dressColor && (
        <g transform={`rotate(${dressSway})`}>
          <Dress x={0} y={94} scale={1.02} variant="pinafore" color={dressColor} opacity={0.96} />
        </g>
      )}

      {/* ---- 拳头（画在衣架之上，表现握杆） ---- */}
      <g stroke={c} strokeWidth={STROKE.main} opacity={1}>
        {/* 掌 */}
        <ellipse cx="0" cy="0" rx="36" ry="31" fill={skin} />
        {/* 四指：从掌左下向左/下轻弯，握住衣架杆 */}
        <path d="M-28 -20 q -18 4 -22 16 q 3 12 18 13" fill={skin} />
        <path d="M-30 2 q -17 7 -19 18 q 5 12 20 10" fill={skin} />
        <path d="M-24 22 q -13 9 -13 19 q 7 10 20 6" fill={skin} />
        {/* 拇指：从掌右上压在杆上 */}
        <path d="M22 -26 q 14 -12 26 -6 q 8 7 -2 20" fill={skin} />
        {/* 手背彩铅颗粒高光（很淡，只为质感统一） */}
        <ellipse cx="8" cy="-8" rx="14" ry="9" fill={PENCIL.grain > 0 ? "#FFFFFF" : "#FFFFFF"} opacity={0.16} stroke="none" />
      </g>
    </g>
  );
};
