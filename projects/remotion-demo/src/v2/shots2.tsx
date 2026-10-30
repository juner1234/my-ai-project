// === SIGNAL V2 · S4 Hold / S6 Reconstruction / S7 Archive ===
// S5 Overload 复用已验收 Shot05Sample（withAudio=false, globalOffset=160）。
// 转场桥接：T3 F140 骤停坍缩 / T5 F260 射线回抽 / T6 F310 字标定稿。

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BLACK, WHITE, CYAN, SANS, MONO, Grid, TopBar, Readout, tc } from "./parts";
import { lerp, hr, hash, easeOutCubic, easeInCubic } from "./random";

// ============================================================
// S4 HOLD：全局 F140–159（20帧，相对帧）
// T3：rel0 单帧反相 + 全画面骤停；切片归零；大字 HOLD 原位瞬现；
//     干涉波冻结为驻波；竖条噪声塌缩为青蓝进度线。
// F155 起（rel15）蓄力：网格 scale 增、HOLD 微抖（T4 预兆）。
// ============================================================
export const Shot04Hold: React.FC<{ globalOffset?: number }> = ({ globalOffset = 140 }) => {
  const f = useCurrentFrame();

  const inverted = f === 0; // 单帧反相=骤停标记
  // 驻波（冻结相位+微呼吸）
  const standing = (() => {
    let d = "M 90 640";
    for (let px = 0; px <= 660; px += 6) {
      const y = 640 + (Math.sin((px / 660) * Math.PI * 4) + Math.sin((px / 660) * Math.PI * 5)) * 0.5 * 56 + Math.sin(f * 0.35 + px * 0.01) * 2;
      d += ` L ${90 + px} ${y}`;
    }
    return d;
  })();

  // 蓄力：F155 起网格 scale
  const chargeScale = 1 + Math.max(0, f - 15) * 0.006;
  // HOLD 字母微抖（rel15 起，T4 预兆）
  const jitter = f >= 15;

  // 青蓝进度线（长音可视化）：rel1–15 从左到右
  const lineW = lerp(f, [1, 15], [0, 640]);

  const word = "HOLD".split("");

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK, filter: inverted ? "invert(1)" : "none" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <g transform={`translate(540 960) scale(${chargeScale}) translate(-540 -960)`}>
          <Grid frame={0} spacing={20} bounds={[60, 200, 1020, 1620]} opacity={0.2} />
          {/* 驻波（继承干涉合成波，冻结） */}
          <path d={standing} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.85} />
          {/* 双频分量降为幽灵层 */}
          <path d={standing} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.2} transform="translate(6 0)" />
          {/* 青蓝进度线 */}
          <rect x={90} y={1480} width={lineW} height={3} fill={CYAN} />
          <g stroke={WHITE} strokeWidth={1} opacity={0.5}>
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={90 + i * 213} y1={1466} x2={90 + i * 213} y2={1496} />
            ))}
          </g>
        </g>
        {/* 四角括号（锁定静止） */}
        {[[40, 40, 1, 1], [1040, 40, -1, 1], [40, 1880, 1, -1], [1040, 1880, -1, -1]].map(([x, y, dx, dy], i) => (
          <path key={i} d={`M ${x + dx * 36} ${y} L ${x} ${y} L ${x} ${y + dy * 36}`} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.8} />
        ))}
        <text x={140} y={1240} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.4} fontFamily={SANS} fontWeight={700} fontSize={220}>
          04
        </text>
      </svg>

      {/* 大字 HOLD（原位瞬现，字距缓扩=长音） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1050,
          width: 1080,
          display: "flex",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 96,
          color: WHITE,
          letterSpacing: 4 + f * 1.4,
          lineHeight: 1,
        }}
      >
        {word.map((ch, i) => {
          const jx = jitter ? hr(-2.5, 2.5, Math.floor(f / 2), i) : 0;
          const jy = jitter ? hr(-2, 2, Math.floor(f / 2), i + 9) : 0;
          return (
            <span key={i} style={{ display: "inline-block", transform: `translate(${jx}px, ${jy}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>

      <TopBar left="SEG 04/07" right="HOLD" />
      {/* TC 冻结=停帧符号 */}
      <Readout left="STATE: FROZEN" center="SUSTAIN A4" right="TC 00:00:04:20" color={CYAN} />
    </AbsoluteFill>
  );
};

// ============================================================
// S6 RECONSTRUCTION：全局 F260–309（50帧，相对帧）
// T5：rel0–6 SIGNAL 字标收缩为右下参考牌；12 放射线回抽拉直成为网格线。
// 大字 RECONSTRUCT 字母散乱回归基线（stagger，motif 四音对齐四波）。
// rel20（F280）网格回归规整 40px；rel40（F300）SIGNAL 预览浮现。
// ============================================================
export const Shot06Reconstruction: React.FC<{ globalOffset?: number }> = ({ globalOffset = 260 }) => {
  const f = useCurrentFrame();

  // T5：放射线回抽并拉直（rel0–6）
  const rayPull = f <= 8;
  const rayT = lerp(f, [0, 6], [1, 0], easeOutCubic); // 1=放射态 0=正交态
  const rayLen = lerp(f, [0, 6], [420, 900], easeOutCubic);

  // 网格：rel0–19 斜切散乱（20px），rel20 起规整 40px
  const spacing = f < 20 ? 20 : 40;
  const tilt = f < 20 ? lerp(f, [0, 20], [2.2, 0], easeOutCubic) : 0;
  const gridOp = f < 20 ? 0.22 : lerp(f, [20, 26], [0.22, 0.4]);

  // 同心环：rel0–19 混乱旋转 → rel20+ 同步慢转
  const ringRot = (i: number) => (f < 20 ? f * (i % 2 === 0 ? 5 : -6.5) : f * 1.5);

  // 大字 RECONSTRUCT：字母散乱回归（11字母，4波对齐 motif F260/270/280/290）
  const word = "RECONSTRUCT".split("");
  const letterState = (i: number) => {
    const wave = Math.floor(i / 3); // 0..3
    const start = wave * 10;
    const t = lerp(f, [start, start + 14], [0, 1], easeOutCubic);
    const dx = hr(-260, 260, i, 1) * (1 - t);
    const dy = hr(-340, -60, i, 2) * (1 - t);
    const rot = hr(-38, 38, i, 3) * (1 - t);
    return { t, transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)` };
  };

  // SIGNAL 字标轨迹：rel0–6 收缩至右下参考牌；rel40–49 浮现至中央预览
  const sigPlate = (() => {
    if (f < 6) {
      const t = lerp(f, [0, 6], [0, 1], easeOutCubic);
      return {
        x: lerp(t, [0, 1], [540, 900]),
        y: lerp(t, [0, 1], [860, 1660]),
        size: lerp(t, [0, 1], [130, 44]),
        op: lerp(t, [0, 1], [1, 0.35]),
      };
    }
    if (f < 40) return { x: 900, y: 1660, size: 44, op: 0.35 };
    const t = lerp(f, [40, 49], [0, 1], easeOutCubic);
    return { x: lerp(t, [0, 1], [900, 540]), y: lerp(t, [0, 1], [1660, 860]), size: lerp(t, [0, 1], [44, 90]), op: lerp(t, [0, 1], [0.35, 1]) };
  })();

  // 青蓝引入：rel20 起部分环与线转青蓝
  const cyanOn = f >= 20;

  // 捕获框回归（锁定）
  const lockT = lerp(f, [18, 26], [0, 1], easeOutCubic);

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <g transform={`rotate(${tilt} 540 860)`}>
          <Grid frame={f} spacing={spacing} bounds={[60, 200, 1020, 1620]} opacity={gridOp} offsetY={-(f % 20)} />
        </g>
        {/* T5：放射线回抽拉直（斜线→正交网格线的连续变形） */}
        {rayPull &&
          Array.from({ length: 12 }, (_, i) => {
            const a0 = (i * Math.PI * 2) / 12 + 0.13;
            const aOrth = Math.round(a0 / (Math.PI / 2)) * (Math.PI / 2);
            const a = lerp(rayT, [0, 1], [aOrth, a0]);
            const x1 = 540 + Math.cos(a) * 90;
            const y1 = 860 + Math.sin(a) * 90;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={540 + Math.cos(a) * (90 + rayLen * rayT + 200 * (1 - rayT))}
                y2={860 + Math.sin(a) * (90 + rayLen * rayT + 200 * (1 - rayT))}
                stroke={i % 3 === 0 && cyanOn ? CYAN : WHITE}
                strokeWidth={2}
                opacity={0.9 * rayT}
              />
            );
          })}
        {/* 同心环（混乱→同步） */}
        <g>
          {[300, 198, 114].map((r, i) => (
            <circle
              key={i}
              cx={540}
              cy={860}
              r={r + Math.sin(f * 0.3) * 8}
              fill="none"
              stroke={cyanOn && i === 1 ? CYAN : WHITE}
              strokeWidth={1.5}
              strokeDasharray="14 22"
              opacity={0.7}
              transform={`rotate(${ringRot(i)} 540 860)`}
            />
          ))}
        </g>
        {/* SIGNAL 参考牌/预览（T5/T6 连续元素） */}
        <text
          x={sigPlate.x}
          y={sigPlate.y + sigPlate.size * 0.35}
          textAnchor="middle"
          fontFamily={SANS}
          fontWeight={700}
          fontSize={sigPlate.size}
          letterSpacing={sigPlate.size * 0.06}
          fill={WHITE}
          stroke={CYAN}
          strokeWidth={sigPlate.size > 60 ? 2 : 1}
          opacity={sigPlate.op}
        >
          SIGNAL
        </text>
        {/* 捕获框回归 */}
        {lockT > 0 &&
          [[260, 540, 1, 1], [820, 540, -1, 1], [260, 820, 1, -1], [820, 820, -1, -1]].map(([x, y, dx, dy], i) => {
            const len = 44 * lockT;
            return (
              <path key={i} d={`M ${x + dx * len} ${y} L ${x} ${y} L ${x} ${y + dy * len}`} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.5 * lockT} />
            );
          })}
        <text x={140} y={1240} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.35} fontFamily={SANS} fontWeight={700} fontSize={220}>
          06
        </text>
      </svg>

      {/* 大字 RECONSTRUCT（散乱→归位） */}
      <div style={{ position: "absolute", left: 0, top: 1360, width: 1080, display: "flex", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 100, color: WHITE, letterSpacing: 4, lineHeight: 1 }}>
        {word.map((ch, i) => {
          const st = letterState(i);
          return (
            <span key={i} style={{ display: "inline-block", opacity: Math.max(0.15, st.t), transform: st.transform }}>
              {ch}
            </span>
          );
        })}
      </div>

      <TopBar left="SEG 06/07" right="RECONSTRUCT" />
      <Readout left={f < 30 ? "STATE: RESTORING" : "STATE: RESTORED"} center="GRID LOCK" right={tc(f + globalOffset)} color={f >= 30 ? CYAN : WHITE} />
    </AbsoluteFill>
  );
};

// ============================================================
// S7 ARCHIVE：全局 F310–359（50帧，相对帧）
// T6：rel0–8 RECONSTRUCT 下滑淡出；SIGNAL 预览原位放大定稿。
// rel10–25 角括号延伸为完整细边框；rel30（F340）拍点脉冲环；
// rel40–49 元素渐次淡出，仅留字标+边框，F359 静帧。
// ============================================================
export const Shot07Archive: React.FC<{ globalOffset?: number }> = ({ globalOffset = 310 }) => {
  const f = useCurrentFrame();

  // RECONSTRUCT 下滑淡出（T6，rel0–8）
  const prevWord = "RECONSTRUCT".split("");
  const prevOut = f <= 8;

  // SIGNAL 定稿：rel0–16 由 90px 预览放大至 150px
  const sigSize = lerp(f, [0, 16], [90, 150], easeOutCubic);
  const sigTrack = lerp(f, [0, 16], [6, 12], easeOutCubic);

  // 边框绘制（rel10–25）
  const borderT = lerp(f, [10, 25], [0, 1], easeOutCubic);
  const inset = 48;
  const W = 1080 - inset * 2;
  const H = 1920 - inset * 2;
  const perim = 2 * (W + H);

  // 网格渐淡（rel25 起）
  const gridOp = f < 25 ? 0.3 : lerp(f, [25, 45], [0.3, 0.06]);

  // 拍点脉冲环（rel30，F340）
  const pulseR = f >= 30 ? (f - 30) * 26 : 0;

  // 渐次淡出（rel40–48）：除字标与边框外全淡出
  const fadeOut = lerp(f, [40, 48], [1, 0]);

  // 青蓝短闪（rel30 单帧）
  const cyanFlash = f === 30;

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <g opacity={fadeOut}>
          <Grid frame={f} spacing={40} bounds={[60, 200, 1020, 1620]} opacity={gridOp} />
          {/* 归档扁平信号条（波形血统终点：振幅→0） */}
          <path
            d={(() => {
              let d = "M 140 1680";
              const flat = 1 - lerp(f, [0, 30], [0, 0.85], easeOutCubic);
              for (let px = 0; px <= 800; px += 8) {
                const y = 1680 + Math.sin(px * 0.05 + f * 0.1) * 8 * flat;
                d += ` L ${140 + px} ${y}`;
              }
              return d;
            })()}
            fill="none"
            stroke={CYAN}
            strokeWidth={1.5}
            opacity={0.6}
          />
          {/* 拍点脉冲环（F340） */}
          {pulseR > 0 && pulseR < 620 && <circle cx={540} cy={820} r={pulseR} fill="none" stroke={CYAN} strokeWidth={2} opacity={Math.max(0, 0.8 - pulseR / 700)} />}
        </g>
        {cyanFlash && <rect x={0} y={0} width={1080} height={1920} fill={CYAN} opacity={0.08} />}
        {/* 完整细边框（角括号延伸的终点，全片首尾呼应） */}
        <rect
          x={inset}
          y={inset}
          width={W}
          height={H}
          fill="none"
          stroke={WHITE}
          strokeWidth={1}
          opacity={0.8}
          strokeDasharray={perim}
          strokeDashoffset={perim * (1 - borderT)}
        />
      </svg>

      {/* RECONSTRUCT 下滑（T6 桥接） */}
      {prevOut && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 1360 + f * 26,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 100,
            color: WHITE,
            letterSpacing: 4,
            lineHeight: 1,
            opacity: 1 - f / 9,
          }}
        >
          {prevWord.map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      )}

      {/* SIGNAL 大字标定稿 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 745,
          width: 1080,
          display: "flex",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: sigSize,
          color: WHITE,
          letterSpacing: sigTrack,
          lineHeight: 1,
        }}
      >
        {("SIGNAL").split("").map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
      {/* 字标下副题（rel16+） */}
      {f >= 16 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 940,
            width: 1080,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 24,
            color: WHITE,
            letterSpacing: 4,
            opacity: lerp(f, [16, 22], [0, 0.85]) * fadeOut,
          }}
        >
          SIGNAL V2 · 12.0s · 360F · ARCHIVE
        </div>
      )}

      <div style={{ opacity: fadeOut }}>
        <TopBar left="SEG 07/07" right="ARCHIVE" />
        <Readout left="STATE: ARCHIVED" center="0431.7 HZ LOCK" right={tc(f + globalOffset)} color={CYAN} />
      </div>
    </AbsoluteFill>
  );
};
