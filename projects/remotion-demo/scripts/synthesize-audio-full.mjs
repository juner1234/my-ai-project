// === SIGNAL V2 · 完整 12 秒音乐主轨合成（Node 原生，零依赖） ===
// 输出：public/signal-v2-full.wav（44.1kHz 16-bit mono，12.000s = 529200 采样）
//
// 设计原则（阶段B升级）：
// 1. 全片音符写入同一个缓冲区——镜头切换永远不会重启音乐，结构上无断层。
// 2. 连续层：Pad 和声（交叉淡化换和弦）、Bass line、全局 hum 全程存在。
// 3. 动机 D4–F4–G4–A4 贯穿七阶段变奏（隐约→完整→切碎→长音→强化→恢复→收束）。
// 4. Reverb 对总线全局施加——混响尾自然跨越任何镜头边界。
// 5. 冲击/故障/扫描音仅为点缀，服从音乐结构。
//
// 统一时间轴：1 拍 = 10 帧 = 14700 采样（180BPM，体感 90BPM half-time），全片 9 小节。
// 1 帧 = 1470 采样，任意事件精确落帧。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public");

const SR = 44100;
const SPF = 1470; // 采样/帧 @30fps
const FRAMES = 360;
const TOTAL = FRAMES * SPF; // 529200
const F = (fr) => Math.round(fr * SPF);

// 确定性 RNG
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
// 帧种子哈希（与视觉端 random.ts 同族，独立实现）
const hash = (...nums) => {
  let h = 2166136261;
  for (const n of nums) {
    let x = Math.imul(n | 0, 374761393) ^ 0x5bd1e995;
    x = Math.imul(x ^ (x >>> 15), 2246822507);
    h = Math.imul(h ^ x, 16777619);
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296;
};

// ============ 轨道缓冲 ============
const pad = new Float32Array(TOTAL);
const bass = new Float32Array(TOTAL);
const drums = new Float32Array(TOTAL);
const motif = new Float32Array(TOTAL);
const fx = new Float32Array(TOTAL);
const amb = new Float32Array(TOTAL); // 全局 hum（跨镜头连续底噪）

// ============ 基础合成 ============
function tone(buf, start, durMs, opts) {
  const {
    freq = 440, type = "sine", gain = 0.3,
    attack = 3, decay = null,
    sweepTo = null, sweepMs = null,
    lp = null, bits = null, vibrato = null, // vibrato: {rate, depthCents}
    hold = 0, // 持续段 ms（attack 后保持，再 release）
    release = null,
  } = opts;
  const n = Math.floor((SR * durMs) / 1000);
  const a = Math.max(1, Math.floor((SR * attack) / 1000));
  const d = decay ? Math.max(1, Math.floor((SR * decay) / 1000)) : n;
  const h = Math.floor((SR * hold) / 1000);
  const r = release ? Math.max(1, Math.floor((SR * release) / 1000)) : d;
  let phase = 0;
  let y = 0;
  const lpA = lp ? 1 - Math.exp((-2 * Math.PI * lp) / SR) : 0;
  for (let i = 0; i < n; i++) {
    const tMs = (i / SR) * 1000;
    let fr = sweepTo !== null && sweepMs !== null ? freq + (sweepTo - freq) * Math.min(1, tMs / sweepMs) : freq;
    if (vibrato) fr *= Math.pow(2, (Math.sin((2 * Math.PI * vibrato.rate * i) / SR) * vibrato.depthCents) / 1200);
    phase += fr / SR;
    let s = 0;
    if (type === "sine") s = Math.sin(2 * Math.PI * phase);
    else if (type === "saw") s = 2 * (phase % 1) - 1;
    else if (type === "square") s = (phase % 1) < 0.5 ? 1 : -1;
    else if (type === "tri") s = 4 * Math.abs((phase % 1) - 0.5) - 1;
    // 包络：attack → hold → release（指数）
    let env;
    if (i < a) env = i / a;
    else if (i < a + h) env = 1;
    else env = Math.exp(-(i - a - h) / r);
    let v = s * env * gain;
    if (lp) { y += lpA * (v - y); v = y; }
    if (bits) { const q = Math.pow(2, bits - 1); v = Math.round(v * q) / q; }
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += v;
  }
}

function noiseBurst(buf, start, durMs, opts) {
  const { gain = 0.3, hp = false, decay = null, rng = makeRng(1) } = opts;
  const n = Math.floor((SR * durMs) / 1000);
  const d = decay ? Math.max(1, Math.floor((SR * decay) / 1000)) : n;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let v = rng() * 2 - 1;
    if (hp) { const t = v - prev + 0.92 * 0; prev = v; v = t * 1.1; }
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += v * Math.exp(-i / d) * gain;
  }
}

// ============ Pad（全程连续，和弦交叉淡化 40 帧） ============
// D 小调和声走向（每小节一和弦，段间 40 帧 crossfade）
const CHORDS = [
  { start: 0, freqs: [146.83, 174.61, 220.0], gain: 0.045 },          // Bar1 Dm（隐约）
  { start: 40, freqs: [146.83, 174.61, 220.0], gain: 0.062 },         // Bar2 Dm
  { start: 80, freqs: [116.54, 146.83, 174.61], gain: 0.062 },        // Bar3 Bb
  { start: 120, freqs: [146.83, 174.61, 220.0], gain: 0.075 },        // Bar4 Dm（Hold 突出）
  { start: 160, freqs: [73.42, 146.83, 174.61, 220.0], gain: 0.08 },  // Bar5 Dm 加厚
  { start: 200, freqs: [116.54, 146.83, 174.61, 233.08], gain: 0.08 },// Bar6 Bb
  { start: 240, freqs: [87.31, 174.61, 220.0, 261.63], gain: 0.07 },  // Bar7 F（提亮）
  { start: 280, freqs: [146.83, 174.61, 220.0], gain: 0.065 },        // Bar8 Dm 恢复
  { start: 320, freqs: [146.83, 174.61, 220.0], gain: 0.055 },        // Bar9 Dm 收束
];
{
  const FADE = F(40); // 40 帧 crossfade
  for (const ch of CHORDS) {
    const s0 = Math.max(0, F(ch.start) - FADE);
    const s1 = Math.min(TOTAL, F(ch.start + 40) + FADE);
    for (const f0 of ch.freqs) {
      for (const det of [-4, 4]) {
        // 每和弦音：tri + sine 混合，detune ±4 音分双振荡
        const len = ((s1 - s0) / SR) * 1000;
        const tmp = new Float32Array(s1 - s0);
        const fr = f0 * Math.pow(2, det / 1200);
        tone(tmp, 0, len, { freq: fr, type: "tri", gain: ch.gain * 0.55, attack: 1200, lp: 1200 });
        tone(tmp, 0, len, { freq: fr * 2, type: "sine", gain: ch.gain * 0.12, attack: 1500, lp: 2000 });
        // crossfade 窗（前 40 帧淡入、后 40 帧淡出）
        for (let i = 0; i < tmp.length; i++) {
          const abs = s0 + i;
          let g = 1;
          const inS = F(ch.start);
          if (abs < inS) g = (abs - s0) / FADE;
          else if (abs > inS + F(40)) g = Math.max(0, 1 - (abs - inS - F(40)) / FADE);
          if (abs >= 0 && abs < TOTAL) pad[abs] += tmp[i] * g;
        }
      }
    }
  }
}

// ============ Bass line（连续低音线，F40 起，八分=5帧网格） ============
const D2 = 73.42, F2 = 87.31, A2 = 110.0, Bb2 = 116.54, G2 = 98.0, C3 = 130.81;
const bassNote = (fr, f0, gain, dur = 140, bits = null) =>
  tone(bass, F(fr), dur, { freq: f0, type: "saw", gain, attack: 2, decay: dur * 0.45, lp: 320, bits });
// Propagation F40–89：规整八分 D2，每小节末八分上行 A2
for (let fr = 40; fr < 90; fr += 5) {
  const inBar = (fr - 40) % 40;
  bassNote(fr, inBar === 35 ? A2 : D2, 0.17);
}
// Interference F90–139：断奏（30% 帧种子缺音）+ 4-bit
for (let fr = 90; fr < 140; fr += 5) {
  if (hash(fr, 7) < 0.3) continue;
  bassNote(fr, hash(fr, 9) < 0.8 ? D2 : C3, 0.16, 110, 4);
}
// Hold F140–159：drop，仅一个 D2 长拖尾
tone(bass, F(140), 700, { freq: D2, type: "sine", gain: 0.1, attack: 20, decay: 650, lp: 260 });
// Overload F160–259：加厚双音（D2+D3），F200–239 → Bb，F240–259 → F2
for (let fr = 160; fr < 260; fr += 5) {
  const root = fr < 200 ? D2 : fr < 240 ? Bb2 : F2;
  bassNote(fr, root, 0.2, 130);
  bassNote(fr, root * 2, 0.1, 110);
}
// Reconstruction F260–309：规整八分恢复 D2，F300 起减半密度
for (let fr = 260; fr < 300; fr += 5) bassNote(fr, D2, 0.16);
for (let fr = 300; fr < 310; fr += 10) bassNote(fr, D2, 0.13);
// Archive F310–359：四分 D2 渐弱，F340 最后一音长拖
for (let fr = 310; fr < 340; fr += 10) bassNote(fr, D2, 0.12 - (fr - 310) * 0.001, 160);
tone(bass, F(340), 600, { freq: D2, type: "saw", gain: 0.1, attack: 5, decay: 550, lp: 300 });

// ============ Drums（点缀与节奏事件，服从音乐结构） ============
const kick = (fr, g) => {
  tone(drums, F(fr), 140, { freq: 130, type: "sine", gain: g, attack: 1, decay: 60, sweepTo: 45, sweepMs: 70 });
  noiseBurst(drums, F(fr), 16, { gain: g * 0.3, hp: true, decay: 8 });
};
const hat = (fr, g) => noiseBurst(drums, F(fr), 13, { gain: g, hp: true, decay: 5, rng: makeRng(fr) });
const tick = (fr, g) => tone(drums, F(fr), 12, { freq: 2400, type: "square", gain: g, attack: 0.5, decay: 5 });
const snare = (fr, g) => {
  noiseBurst(drums, F(fr), 70, { gain: g, hp: true, decay: 32, rng: makeRng(fr + 3) });
  tone(drums, F(fr), 50, { freq: 210, type: "tri", gain: g * 0.4, attack: 1, decay: 24 });
};
// Capture：稀疏 half-time
kick(0, 0.34); kick(20, 0.3);
// Propagation：half-time 实拍 + 反拍 hat/snare
for (const fr of [40, 60, 80]) kick(fr, 0.5);
for (const fr of [50, 70]) snare(fr, 0.14);
for (const fr of [45, 55, 65, 75, 85]) hat(fr, 0.1);
// Interference：kick + glitch 点缀（非铺满）
for (const fr of [90, 110, 130]) kick(fr, 0.5);
kick(120, 0.42);
for (const fr of [100, 125]) snare(fr, 0.12);
for (const fr of [95, 105, 115, 125, 135]) hat(fr, 0.08);
// Hold：DROP（无鼓）——仅 F140 下行噪声收束
noiseBurst(drums, F(140), 260, { gain: 0.12, decay: 130, rng: makeRng(140), hp: true });
// Overload：加密（每 10 帧 kick），F200 起反拍加密，F240 IMPACT
for (let fr = 160; fr <= 250; fr += 10) kick(fr, fr >= 240 ? 0.68 : 0.55);
for (let fr = 205; fr <= 255; fr += 10) hat(fr, 0.1);
for (const fr of [196, 208, 218]) tick(fr, 0.3); // 白闪对齐
snare(190, 0.16); snare(230, 0.18);
// ★ F240 IMPACT：下潜 + 宽带爆
tone(drums, F(240), 520, { freq: 90, type: "sine", gain: 0.75, attack: 2, decay: 240, sweepTo: 30, sweepMs: 420 });
noiseBurst(drums, F(240), 300, { gain: 0.42, decay: 150, rng: makeRng(240) });
// F225 次重击
tone(drums, F(225), 240, { freq: 150, type: "sine", gain: 0.45, attack: 1, decay: 120, sweepTo: 42, sweepMs: 200 });
noiseBurst(drums, F(225), 160, { gain: 0.28, decay: 90, rng: makeRng(225) });
// Reconstruction：规整 half-time 恢复
for (const fr of [260, 280, 300]) kick(fr, 0.5);
for (const fr of [270, 290]) snare(fr, 0.13);
for (const fr of [265, 275, 285, 295]) hat(fr, 0.09);
// Archive：收束节拍，F340 最后一击
for (const fr of [310, 330]) kick(fr, 0.42);
snare(320, 0.1);
hat(315, 0.08); hat(335, 0.07);
kick(340, 0.32);

// ============ Motif D4–F4–G4–A4（贯穿七阶段变奏） ============
const [D4, F4, G4, A4] = [293.66, 349.23, 392.0, 440.0];
// 干净动机音：detune 双锯齿 + 低通 + 可选回声
const clean = (fr, f0, gain = 0.2, dur = 320, lp = 1800, echo = true) => {
  tone(motif, F(fr), dur, { freq: f0, type: "saw", gain: gain * 0.7, attack: 4, decay: dur * 0.5, lp });
  tone(motif, F(fr), dur, { freq: f0 * 1.003, type: "saw", gain: gain * 0.5, attack: 6, decay: dur * 0.45, lp: lp * 0.9 });
  if (echo) {
    tone(motif, F(fr + 10), dur * 0.8, { freq: f0, type: "saw", gain: gain * 0.22, attack: 5, decay: dur * 0.4, lp: lp * 0.7 });
    tone(motif, F(fr + 20), dur * 0.7, { freq: f0, type: "saw", gain: gain * 0.08, attack: 5, decay: dur * 0.35, lp: lp * 0.5 });
  }
};
// 碎片化动机音（Interference）：切 4 片、3-bit、音高抖动
const shattered = (fr, f0, gain = 0.18) => {
  const offs = [0, 4, 7, 11];
  offs.forEach((o, k) => {
    const jitter = Math.pow(2, (hash(fr, k) * 10 - 5) / 12); // ±5 半音
    tone(motif, F(fr + o), 26, {
      freq: f0 * jitter, type: "saw", gain: gain * (0.6 + hash(fr, k, 1) * 0.4),
      attack: 1, decay: 14, lp: 1500, bits: 3,
    });
  });
};
// Capture F20：隐约单音（远：强低通 + 微回声）
tone(motif, F(20), 460, { freq: D4, type: "sine", gain: 0.07, attack: 30, decay: 420, lp: 700 });
tone(motif, F(30), 380, { freq: D4, type: "sine", gain: 0.024, attack: 30, decay: 340, lp: 600 });
// Propagation：完整呈现 F40/50/60/70
clean(40, D4, 0.2, 340, 1800);
clean(50, F4, 0.2, 340, 1800);
clean(60, G4, 0.22, 340, 1900);
clean(70, A4, 0.22, 340, 1900);
// Interference：切碎失真 F90/100/110/120 + F130–139 混乱加密
shattered(90, D4);
shattered(100, F4);
shattered(110, G4);
shattered(120, A4);
for (const fr of [130, 133, 136]) {
  const f0 = [D4, F4, G4][Math.floor(hash(fr, 5) * 3)];
  shattered(fr, f0 * Math.pow(2, hash(fr, 6) * 2 - 1), 0.14);
}
// Hold F140：A4 长音（颤音）
tone(motif, F(140), 800, {
  freq: A4, type: "saw", gain: 0.15, attack: 40, hold: 150, release: 620, lp: 1500,
  vibrato: { rate: 5.5, depthCents: 8 },
});
tone(motif, F(140), 800, { freq: D4 / 2, type: "sine", gain: 0.06, attack: 60, hold: 100, release: 600, lp: 800 });
// Overload：强化（8度+3bit）F160/175/190/205 + 碎片强化 + F240 极速连打
for (const [fr, f0] of [[160, D4], [175, F4], [190, G4], [205, A4]]) {
  tone(motif, F(fr), 220, { freq: f0, type: "saw", gain: 0.18, attack: 2, decay: 110, lp: 2400, bits: 3 });
  tone(motif, F(fr), 220, { freq: f0 * 2, type: "saw", gain: 0.1, attack: 2, decay: 100, lp: 3000, bits: 3 });
}
for (const fr of [210, 215, 220, 225]) {
  tone(motif, F(fr), 46, { freq: A4, type: "square", gain: 0.12, attack: 1, decay: 24, bits: 2 });
}
for (const [fr, f0] of [[240, D4], [243, F4], [246, G4], [249, A4]]) {
  tone(motif, F(fr), 110, { freq: f0, type: "saw", gain: 0.2, attack: 1, decay: 60, lp: 3200, bits: 2 });
}
// Reconstruction：恢复 F260/270/280/290（干净）
clean(260, D4, 0.2, 330, 2000);
clean(270, F4, 0.2, 330, 2000);
clean(280, G4, 0.2, 330, 2100);
clean(290, A4, 0.2, 330, 2100);
// Archive：完整收束 F310/320/330/340（渐弱，最后 A4 拖尾）
clean(310, D4, 0.2, 340, 1900);
clean(320, F4, 0.19, 340, 1900);
clean(330, G4, 0.18, 340, 1800);
tone(motif, F(340), 700, { freq: A4, type: "saw", gain: 0.16, attack: 6, hold: 120, release: 560, lp: 1800 });
tone(motif, F(340), 700, { freq: A4 * 1.003, type: "saw", gain: 0.11, attack: 8, hold: 100, release: 540, lp: 1600 });

// ============ FX（过渡/衔接，跨镜头连续） ============
const upSweep = (fr, dur, f0, f1, g) =>
  tone(fx, F(fr), dur, { freq: f0, type: "sine", gain: g, attack: dur * 0.3, sweepTo: f1, sweepMs: dur });
const downSweep = upSweep;
upSweep(30, 460, 380, 2400, 0.11);      // → Propagation
downSweep(84, 560, 3000, 320, 0.11);    // → Interference
noiseBurst(fx, F(88), 67, { gain: 0.22, rng: makeRng(88) }); // F88 反相转场噪声闪
downSweep(134, 520, 2000, 220, 0.1);    // → Hold（drop 配合）
upSweep(154, 560, 300, 4000, 0.15);     // → Overload 蓄力
upSweep(254, 540, 320, 2800, 0.1);      // → Reconstruction
downSweep(304, 520, 2600, 300, 0.09);   // → Archive
// ============ Ambient hum（全程连续底噪，跨一切镜头） ============
tone(amb, 0, 12000, { freq: 36.71, type: "sine", gain: 0.016, attack: 800, hold: 10500, release: 700 });
tone(amb, 0, 12000, { freq: 73.42, type: "tri", gain: 0.008, attack: 1000, hold: 10200, release: 800 });
noiseBurst(amb, 0, 12000, { gain: 0.006, hp: true, decay: 11500, rng: makeRng(2026) });

// ============ 总线：mix → soft-clip → 全局 Reverb → 归一化 → 淡出 ============
const dry = new Float32Array(TOTAL);
for (let i = 0; i < TOTAL; i++) {
  dry[i] = pad[i] + bass[i] + drums[i] + motif[i] + fx[i] + amb[i];
}
// soft-clip（tanh 保险）
for (let i = 0; i < TOTAL; i++) dry[i] = Math.tanh(dry[i] * 1.4) * 0.85;

// Schroeder reverb：4 comb + 2 allpass（全局施加 → 混响尾跨越任何镜头边界）
function comb(input, delay, feedback, damp) {
  const out = new Float32Array(input.length);
  const buf = new Float32Array(delay);
  let idx = 0, store = 0;
  for (let i = 0; i < input.length; i++) {
    const y = buf[idx];
    out[i] = y;
    store = y * (1 - damp) + store * damp;
    buf[idx] = input[i] + store * feedback;
    idx = (idx + 1) % delay;
  }
  return out;
}
function allpass(input, delay, feedback) {
  const out = new Float32Array(input.length);
  const buf = new Float32Array(delay);
  let idx = 0;
  for (let i = 0; i < input.length; i++) {
    const y = buf[idx];
    out[i] = -input[i] + y;
    buf[idx] = input[i] + y * feedback;
    idx = (idx + 1) % delay;
  }
  return out;
}
const combs = [1557, 1617, 1491, 1422].map((d) => comb(dry, d, 0.8, 0.28));
const wet = new Float32Array(TOTAL);
for (let i = 0; i < TOTAL; i++) wet[i] = (combs[0][i] + combs[1][i] + combs[2][i] + combs[3][i]) * 0.25;
let ap = allpass(wet, 225, 0.5);
ap = allpass(ap, 556, 0.5);

const out = new Float32Array(TOTAL);
let peak = 0;
for (let i = 0; i < TOTAL; i++) {
  out[i] = dry[i] + ap[i] * 0.22; // wet 22%
  // 末 25 帧全局淡出防 click
  if (i > TOTAL - F(25)) out[i] *= (TOTAL - i) / F(25);
  if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]);
}
const norm = 0.89 / peak; // 归一化到约 -1dB
for (let i = 0; i < TOTAL; i++) out[i] *= norm;

// ============ WAV 写出 ============
function writeWav(filePath, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
  return buf.length;
}
const outPath = path.join(OUT_DIR, "signal-v2-full.wav");
const bytes = writeWav(outPath, out);
console.log(`wrote ${outPath}`);
console.log(`  ${TOTAL} samples = ${(TOTAL / SR).toFixed(3)}s @ ${SR}Hz mono 16bit, ${(bytes / 1024).toFixed(1)} KB`);
console.log(`  peak before norm: ${peak.toFixed(3)}, norm gain: ${norm.toFixed(3)}`);
// RMS 分段检查（确认全片连续、无镜头边界断层：每 20 帧一窗）
const rms = [];
for (let fr = 0; fr < 360; fr += 20) {
  let acc = 0;
  for (let i = F(fr); i < Math.min(TOTAL, F(fr + 20)); i++) acc += out[i] * out[i];
  rms.push(Math.sqrt(acc / (SPF * 20)));
}
console.log("  RMS per 20-frame window:");
console.log("  " + rms.map((v, i) => `${i * 20}:${v.toFixed(2)}`).join("  "));
