// === SIGNAL V2 · S1 Capture / S2 Propagation / S3 Interference ===
// 相对帧组件；globalOffset 用于全局时间码。
// 转场桥接内置：T1 F32–48 / T2 F80–96。

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BLACK, WHITE, CYAN, SANS, MONO, Grid, WaveLines, FreqBars, TopBar, Readout, tc } from "./parts";
import { lerp, hr, hash, easeOutCubic, easeInCubic } from "./random";

// ============================================================
// S1 CAPTURE：全局 F0–39（40帧）
// 点阵噪声中显形一条波形；F20 捕获框收缩锁定；F32–39 波形坍缩为源点（T1）。
// ============================================================
export const Shot01Capture: React.FC<{ globalOffset?: number }> = ({ globalOffset = 0 }) => {
  const f = useCurrentFrame();

  const CAP_BOX: [number, number, number, number] = [260, 540, 820, 820]; // x1,y1,x2,y2
  const collapsing = f >= 32;

  // 点阵：F0–19 密布闪烁；F20 起仅捕获框内保留；F32 起径向飞散
  const dots: React.ReactNode[] = [];
  const dotTick = Math.floor(f / 3);
  for (let i = 0; i < 60; i++) {
    const seedX = hr(80, 1000, dotTick, i);
    const seedY = hr(240, 1560, dotTick, i + 90);
    let dx = seedX;
    let dy = seedY;
    let op = 0.55;
    const inBox = dx > CAP_BOX[0] && dx < CAP_BOX[2] && dy > CAP_BOX[1] && dy < CAP_BOX[3];
    if (f >= 20 && !inBox && !collapsing) continue;
    if (f >= 20 && !inBox && collapsing) {
      // 径向飞散（T1）：以捕获点为中心向外
      const ang = Math.atan2(seedY - 680, seedX - 540);
      const dist = (f - 32) * 30 * (0.6 + hash(i, 5) * 0.8);
      dx = 540 + Math.cos(ang) * (Math.hypot(seedX - 540, seedY - 680) + dist);
      dy = 680 + Math.sin(ang) * (Math.hypot(seedX - 540, seedY - 680) + dist);
      op = 0.55 * Math.max(0, 1 - (f - 32) / 8);
    }
    if (hash(dotTick, i) < 0.22) continue; // 闪烁
    const r = 1.5 + hash(dotTick, i, 3) * 2;
    dots.push(<rect key={i} x={dx} y={dy} width={r * 2} height={r * 2} fill={WHITE} opacity={op} />);
  }

  // 扫描线 F0–20：扫至捕获中心
  const scanY = lerp(f, [0, 20], [240, 680], easeOutCubic);
  const scanOn = f < 22;

  // 捕获框四角：F20–30 收缩锁定；F32–39 向中心收拢消失（信号坍缩）
  const openT = lerp(f, [20, 30], [1, 0], easeOutCubic); // 1→0 展开度
  const closeT = collapsing ? lerp(f, [32, 39], [0, 1], easeInCubic) : 0;
  const cornerX = (base: number, dir: number) => base + dir * (openT * 170) - dir * 0 + (base === 260 ? -1 : 1) * 0 + closeT * (540 - base) * 0.92;
  const cornerY = (base: number, dir: number) => base + dir * (openT * 110) + closeT * (680 - base) * 0.92;
  const corners: [number, number, number, number][] = [
    [CAP_BOX[0], CAP_BOX[1], 1, 1],
    [CAP_BOX[2], CAP_BOX[1], -1, 1],
    [CAP_BOX[0], CAP_BOX[3], 1, -1],
    [CAP_BOX[2], CAP_BOX[3], -1, -1],
  ];

  // 波形：F8 显形，F32–39 振幅坍缩
  const amp = collapsing ? lerp(f, [32, 39], [40, 0], easeInCubic) : lerp(f, [8, 20], [2, 40]);

  // 大字 CAPTURE：F12 逐字；F34 起下滑（T1 桥接至 S2）
  const word = "CAPTURE".split("");
  const slideY = f >= 34 ? (f - 34) * 12 : 0;
  const slideOp = f >= 34 ? 1 - (f - 34) * 0.14 : 1;

  // F30 青蓝锁定脉冲（遗传给 S2 第3环）
  const lockR = f >= 30 ? (f - 30) * 26 : 0;

  // 源点（坍缩目标）
  const srcGlow = collapsing ? lerp(f, [32, 39], [2, 9]) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <Grid frame={f} spacing={40} bounds={[60, 180, 1020, 1560]} opacity={lerp(f, [0, 12], [0, 0.16])} reveal={lerp(f, [0, 16], [0.2, 1], easeOutCubic)} />
        {dots}
        {scanOn && (
          <g>
            <line x1={60} y1={scanY} x2={1020} y2={scanY} stroke={WHITE} strokeWidth={1.5} opacity={0.7} />
            <rect x={60} y={scanY - 3} width={1020} height={6} fill={WHITE} opacity={0.1} />
          </g>
        )}
        {/* 捕获波形 */}
        <g clipPath="url(#capBox)">
          <defs>
            <clipPath id="capBox">
              <rect x={CAP_BOX[0]} y={CAP_BOX[1]} width={CAP_BOX[2] - CAP_BOX[0]} height={CAP_BOX[3] - CAP_BOX[1]} />
            </clipPath>
          </defs>
          {f >= 8 && amp > 0.5 && (
            <path
              d={(() => {
                let d = `M ${CAP_BOX[0]} 680`;
                for (let px = 0; px <= CAP_BOX[2] - CAP_BOX[0]; px += 8) {
                  const y = 680 + Math.sin(f * 0.35 + px * 0.05) * amp + Math.sin(f * 0.7 + px * 0.022) * amp * 0.4;
                  d += ` L ${CAP_BOX[0] + px} ${y}`;
                }
                return d;
              })()}
              fill="none"
              stroke={WHITE}
              strokeWidth={1.8}
            />
          )}
        </g>
        {/* 捕获框四角 */}
        {f >= 20 && (
          <g>
            {corners.map(([x, y, dx, dy], i) => {
              const ox = cornerX(x, dx);
              const oy = cornerY(y, dy);
              const len = 44 * (1 - closeT * 0.6);
              return (
                <path
                  key={i}
                  d={`M ${ox + dx * len} ${oy} L ${ox} ${oy} L ${ox} ${oy + dy * len}`}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth={3}
                  opacity={1 - closeT}
                />
              );
            })}
          </g>
        )}
        {/* 锁定脉冲环 */}
        {f >= 30 && lockR < 460 && (
          <circle cx={540} cy={680} r={lockR} fill="none" stroke={CYAN} strokeWidth={2} opacity={Math.max(0, 1 - lockR / 460)} />
        )}
        {/* 坍缩源点 */}
        {collapsing && <circle cx={540} cy={680} r={srcGlow} fill={WHITE} />}
        {/* 描边 01 */}
        <text x={140} y={430} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.45} fontFamily={SANS} fontWeight={700} fontSize={220}>
          01
        </text>
        {/* 刻度条 */}
        <g stroke={WHITE} strokeWidth={1} opacity={0.3}>
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={260 + i * 43} y1={880} x2={260 + i * 43} y2={i % 4 === 0 ? 910 : 896} />
          ))}
        </g>
      </svg>

      {/* 大字 CAPTURE（F12 逐字，F34 起下滑交接） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1240 + slideY,
          width: 1080,
          display: "flex",
          justifyContent: "center",
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 104,
          color: WHITE,
          letterSpacing: 8,
          lineHeight: 1,
          opacity: slideOp,
        }}
      >
        {word.map((ch, i) => {
          const t = lerp(f, [12 + i * 3, 18 + i * 3], [0, 1], easeOutCubic);
          return (
            <span key={i} style={{ display: "inline-block", opacity: t, transform: `translateY(${(1 - t) * 12}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>

      <TopBar left="SEG 01/07" right="CAPTURE" />
      <Readout left="SRC: UNKNOWN" center={f < 30 ? "ACQ ————" : "LOCK 0431.7 HZ"} right={tc(f + globalOffset)} color={f >= 30 ? CYAN : WHITE} />
    </AbsoluteFill>
  );
};

// ============================================================
// S2 PROPAGATION：全局 F40–89（50帧，相对帧）
// T1 桥接：rel0 源点爆发第一环；CAPTURE 大字滑出（rel0–8）。
// T2 桥接：rel40–47 外环碎裂为水平切片+字母失步；rel48–49 整屏反相。
// ============================================================
export const Shot02PropagationFull: React.FC<{ globalOffset?: number }> = ({ globalOffset = 40 }) => {
  const f = useCurrentFrame();

  const reveal = lerp(f, [0, 10], [0, 1], easeOutCubic);
  const spacing = f < 20 ? 40 : 20; // rel20 = 全局F60 密度硬切（拍点）
  const gridOpacity = f < 20 ? 0.32 : 0.48;
  const flowY = f >= 20 ? -((f - 20) % spacing) : 0;

  // 5 环：rel0 起每 5 帧一环（全局 F40/45/50/55/60），15px/帧
  const ringRadii = Array.from({ length: 5 }, (_, i) => Math.max(0, (f - i * 5) * 15));
  // T2：rel40–47 最外环碎裂
  const shatter = f >= 40 && f < 48;
  const shatterChaos = (f - 40) / 8;

  const amp = f < 14 ? 8 : f < 20 ? 14 : f < 30 ? 26 : 40; // rel14/20/30 阶梯（全局F54/60/70）

  const word = "PROPAGATION".split("");
  const inverted = f >= 48; // 全局 F88–89

  // CAPTURE 滑出桥接（rel0–8）
  const capSlideY = 60 + f * 42;
  const capOp = 0.3 * Math.max(0, 1 - f / 9);

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK, filter: inverted ? "invert(1)" : "none" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <Grid frame={f} spacing={spacing} bounds={[120, 240, 960, 1120]} opacity={gridOpacity} offsetY={flowY} reveal={reveal} />
        {/* 同心环：第3环青蓝（遗传 S1 锁定脉冲） */}
        {ringRadii.map((r, i) => {
          if (r <= 0) return null;
          const isOuter = i === 4;
          const dash = shatter && isOuter ? `${6 + shatterChaos * 34} ${5}` : undefined;
          return (
            <circle
              key={i}
              cx={540}
              cy={680}
              r={r}
              fill="none"
              stroke={i === 2 ? CYAN : WHITE}
              strokeWidth={1.5}
              strokeDasharray={dash}
              opacity={Math.max(0.14, 1 - r / 880)}
            />
          );
        })}
        {/* T2：外环水平切片碎片 */}
        {shatter &&
          ringRadii[4] > 40 &&
          (() => {
            const r = ringRadii[4];
            const slices: React.ReactNode[] = [];
            for (let k = 0; k < 7; k++) {
              const dy = -r + (k * 2 * r) / 6;
              const chord = 2 * Math.sqrt(Math.max(0, r * r - dy * dy)) * 0.55;
              const off = hr(-70, 70, Math.floor(f / 2), k) * (0.4 + shatterChaos);
              slices.push(
                <rect
                  key={k}
                  x={540 - chord / 2 + off}
                  y={680 + dy - 1.5}
                  width={chord}
                  height={3}
                  fill={WHITE}
                  opacity={Math.max(0.2, 0.85 - shatterChaos * 0.4)}
                />
              );
            }
            return <g>{slices}</g>;
          })()}
        {/* T1：rel0 源点闪 */}
        {f === 0 && <circle cx={540} cy={680} r={9} fill={WHITE} />}
        <text x={150} y={400} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.5} fontFamily={SANS} fontWeight={700} fontSize={240}>
          02
        </text>
        {/* 波形 + 频率柱 */}
        <WaveLines frame={f} x={120} y={1230} w={420} count={3} amp={amp} />
        <FreqBars frame={f} x={700} y={1210} w={260} h={90} count={8} />
        {/* 四角括号（承接 S1） */}
        {[[40, 40, 1, 1], [1040, 40, -1, 1], [40, 1880, 1, -1], [1040, 1880, -1, -1]].map(([x, y, dx, dy], i) => (
          <path key={i} d={`M ${x + dx * 36} ${y} L ${x} ${y} L ${x} ${y + dy * 36}`} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.8} />
        ))}
      </svg>

      {/* CAPTURE 滑出（T1 桥接） */}
      {capOp > 0.01 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 1240 + capSlideY,
            width: 1080,
            display: "flex",
            justifyContent: "center",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 104,
            color: WHITE,
            letterSpacing: 8,
            lineHeight: 1,
            opacity: capOp,
          }}
        >
          {("CAPTURE").split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </div>
      )}

      {/* 大字 PROPAGATION：rel10 逐字（全局F50，对齐 motif F4） */}
      <div style={{ position: "absolute", left: 0, top: 1360, width: 1080, display: "flex", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 110, color: WHITE, letterSpacing: 6, lineHeight: 1 }}>
        {word.map((ch, i) => {
          const t = lerp(f, [10 + i * 3, 15 + i * 3], [0, 1], easeOutCubic);
          // T2：rel40+ 字母失步抖动
          const desync = f >= 40 ? hr(-5, 5, Math.floor(f / 2), i) : 0;
          return (
            <span key={i} style={{ display: "inline-block", opacity: t, transform: `translate(${desync}px, ${(1 - t) * 12}px)` }}>
              {ch}
            </span>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 0, top: 0, opacity: lerp(f, [0, 6], [0, 1]) }}>
        <TopBar left="SEG 02/07" right="PROPAGATION" />
      </div>
      <Readout left="X0540 Y0680" center={f < 14 ? "FREQ ————" : "FREQ 0431.7 HZ"} right={tc(f + globalOffset)} />
    </AbsoluteFill>
  );
};

// ============================================================
// S3 INTERFERENCE：全局 F90–139（50帧，相对帧）
// T2 桥接：rel0 大字已原位替换（首字母带切口）。
// 象限轮换（明确帧号）：Q1 F90–101 / Q2 F102–113 / Q3 F114–125 / Q4 F126–137。
// 破坏帧：全局 F100/F112/F124 单帧大错位。
// T3 铺垫：rel40–49（F130–139）混乱加密，字母丢失率飙升。
// ============================================================
export const Shot03Interference: React.FC<{ globalOffset?: number }> = ({ globalOffset = 90 }) => {
  const f = useCurrentFrame();
  const gf = f + globalOffset;

  const qIndex = gf < 102 ? 0 : gf < 114 ? 1 : gf < 126 ? 2 : 3;
  const breaking = gf === 100 || gf === 112 || gf === 124;
  const breakShift = breaking ? (gf === 112 ? 1 : -1) * 84 : 0;
  const chaos = lerp(f, [40, 49], [0, 1], easeInCubic); // 混乱加密

  // 干涉波形：双频分量 + 合成亮线（继承 S2 波形槽位）
  const waveAt = (k: number, ph: number, mult: number, base: number) => {
    let d = `M 90 ${base}`;
    for (let px = 0; px <= 660; px += 6) {
      const y = base + Math.sin((px / 660) * Math.PI * 2 * k + ph) * mult;
      d += ` L ${90 + px} ${y}`;
    }
    return d;
  };
  const phA = f * 0.12;
  const phB = -f * 0.17;

  const word = "INTERFERENCE".split("");
  const tick2 = Math.floor(f / 2);
  const BANDS = 9;
  const bandH = 150 / BANDS;
  const bandMul = 1 + chaos * 1.2;

  // 竖条噪声（T3：向中心收拢）
  const bars = Array.from({ length: 12 }, (_, i) => {
    const xr = hr(80, 1000, tick2, i);
    const x = lerp(xr, 540, chaos * 0.7);
    const h = hr(50, 210, tick2, i + 40) * (1 + chaos);
    return <rect key={i} x={x} y={1560 - h / 2} width={3} height={h} fill={WHITE} opacity={0.5} />;
  });

  const lossRate = 0.14 + chaos * 0.36;

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
        <Grid frame={f} spacing={20} bounds={[60, 200, 1020, 1620]} opacity={0.13} offsetY={-(f % 20)} />
        <g transform={`translate(${breakShift} 0)`}>
          {/* 双频分量 */}
          <path d={waveAt(2, phA, 34, 640)} fill="none" stroke={WHITE} strokeWidth={1} opacity={0.3} />
          <path d={waveAt(2.5, phB, 30, 640)} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.36} />
          {/* 合成波（继承 S2 波形，F90 瞬间裂为双频） */}
          <path
            d={(() => {
              let d = "M 90 640";
              for (let px = 0; px <= 660; px += 6) {
                const y = 640 + (Math.sin((px / 660) * Math.PI * 4 + phA) + Math.sin((px / 660) * Math.PI * 5 + phB)) * 0.5 * 56;
                d += ` L ${90 + px} ${y}`;
              }
              return d;
            })()}
            fill="none"
            stroke={WHITE}
            strokeWidth={2.2}
          />
        </g>
        {/* 象限轮换（明确帧号） */}
        {["Q1 F90–101", "Q2 F102–113", "Q3 F114–125", "Q4 F126–137"].map((label, i) => {
          const active = i === qIndex && gf <= 137;
          return (
            <g key={i}>
              <rect x={800} y={380 + i * 74} width={230} height={56} fill={active ? WHITE : "none"} stroke={WHITE} strokeWidth={1} opacity={active ? 1 : 0.4} />
              <text x={815} y={418 + i * 74} fill={active ? BLACK : WHITE} fontFamily={MONO} fontSize={24} fontWeight={700} opacity={active ? 1 : 0.55}>
                {label}
              </text>
            </g>
          );
        })}
        {bars}
        <text x={140} y={1240} fill="none" stroke={WHITE} strokeWidth={1.5} opacity={0.4} fontFamily={SANS} fontWeight={700} fontSize={220} transform={`translate(${breakShift} 0)`}>
          03
        </text>
      </svg>

      {/* 大字 INTERFERENCE（9 带切割 + 字母丢失；rel0 首字母已带切口=原位替换感） */}
      {Array.from({ length: BANDS }, (_, b) => {
        const off = hr(-1, 1, tick2, b) * (24 * (1 - Math.abs(b - 4) / 6)) * bandMul;
        return (
          <div
            key={b}
            style={{
              position: "absolute",
              left: 0,
              top: 1050,
              width: 1080,
              height: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 96,
              color: WHITE,
              letterSpacing: 5,
              lineHeight: 1,
              clipPath: `inset(${b * bandH}px 0 ${150 - (b + 1) * bandH}px 0)`,
              transform: `translateX(${off + breakShift}px)`,
            }}
          >
            {word.map((ch, i) => {
              const t = i === 0 ? 1 : lerp(f, [i * 2, 4 + i * 2], [0, 1], easeOutCubic);
              const lost = hash(f, i, 11) < lossRate && f > 16;
              return (
                <span key={i} style={{ display: "inline-block", opacity: lost ? 0 : t }}>
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}

      <TopBar left="SEG 03/07" right="INTERFERENCE" />
      <Readout left="MODE: Xtalk" center={gf <= 137 ? "ERR +12dB" : "SEQ ——"} right={tc(gf)} />
    </AbsoluteFill>
  );
};
