// === SIGNAL V2 · 阶段A 声音合成脚本（Node 原生，零依赖） ===
// 输出：public/signal-v2-shot02.wav (72帧=2.4s)  public/signal-v2-shot05.wav (100帧=3.33s)
// 44.1kHz 16-bit mono PCM。帧对齐：1帧 = 1470 采样（@30fps）。
// 原创动机 MOTIF = [D4, F4, G4, A4] 上行四音，贯穿"出现→干扰→失控→稳定"叙事。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public");

const SR = 44100;
const SPF = 1470; // samples per frame @30fps
const frameToSample = (fr) => Math.round(fr * SPF);

// —— 确定性噪声源（LCG）——
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

// —— WAV 写出 ——
function writeWav(filePath, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.writeWAVE = undefined;
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
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
  console.log(`wrote ${filePath} (${(buf.length / 1024).toFixed(1)} KB, ${n} samples)`);
}

// —— 基础合成器 ——
// 振荡器 + 包络，写入 mix 缓冲
function osc(buf, start, durMs, opts) {
  const {
    freq = 440,
    type = "sine", // sine | saw | square | tri
    gain = 0.3,
    attack = 3, // ms
    decay = null, // ms（指数衰减到 sustain）
    sweepTo = null, // Hz（线性扫频目标）
    sweepMs = null,
    lp = null, // 低通截止 Hz
    bits = null, // 位深量化
    rng = null,
    truncate = 1, // 截断比例
  } = opts;
  const n = Math.floor((SR * durMs * truncate) / 1000);
  const a = Math.max(1, Math.floor((SR * attack) / 1000));
  const d = decay ? Math.max(1, Math.floor((SR * decay) / 1000)) : n;
  let phase = 0;
  let y = 0; // 低通状态
  const lpA = lp ? 1 - Math.exp((-2 * Math.PI * lp) / SR) : 0;
  for (let i = 0; i < n; i++) {
    const tMs = (i / SR) * 1000;
    const fr =
      sweepTo !== null && sweepMs !== null
        ? freq + (sweepTo - freq) * Math.min(1, tMs / sweepMs)
        : freq;
    phase += fr / SR;
    let s = 0;
    if (type === "sine") s = Math.sin(2 * Math.PI * phase);
    else if (type === "saw") s = 2 * (phase % 1) - 1;
    else if (type === "square") s = (phase % 1) < 0.5 ? 1 : -1;
    else if (type === "tri") s = 4 * Math.abs((phase % 1) - 0.5) - 1;
    // 包络：线性起音 + 指数衰减
    const env = i < a ? i / a : Math.exp(-(i - a) / d);
    let v = s * env * gain;
    if (lp) {
      y += lpA * (v - y);
      v = y;
    }
    if (bits) {
      const q = Math.pow(2, bits - 1);
      v = Math.round(v * q) / q;
    }
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += v;
  }
}

// 噪声爆
function noise(buf, start, durMs, opts) {
  const { gain = 0.3, hp = false, rng = makeRng(42), decay = null } = opts;
  const n = Math.floor((SR * durMs) / 1000);
  const d = decay ? Math.max(1, Math.floor((SR * decay) / 1000)) : n;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    let v = rng() * 2 - 1;
    if (hp) {
      const hped = v - prev + 0.95 * (hp === true ? 0 : 0); // 简易高通：差分
      prev = v;
      v = hped * 0.8;
    }
    const env = Math.exp(-i / d);
    const idx = start + i;
    if (idx >= 0 && idx < buf.length) buf[idx] += v * env * gain;
  }
}

// 常量
const F = frameToSample;
const HUM = (buf, len, fadeOutFrame = null) => {
  osc(buf, 0, (len / SR) * 1000, { freq: 60, type: "tri", gain: 0.022, attack: 100 });
  osc(buf, 0, (len / SR) * 1000, { freq: 120, type: "tri", gain: 0.012, attack: 120 });
  if (fadeOutFrame !== null) {
    // 结尾 5 帧淡出由包络自然衰减（简化：hum 是恒定的，额外叠一个反向补偿意义不大，保持自然）
  }
};

const KICK = (buf, fr, gain) => {
  osc(buf, F(fr), 120, { freq: 120, type: "sine", gain: gain, attack: 1, decay: 55, sweepTo: 45, sweepMs: 60 });
  noise(buf, F(fr), 15, { gain: gain * 0.25, hp: true, decay: 8 });
};
const SUB = (buf, fr, gain, dur = 110) => osc(buf, F(fr), dur, { freq: 55, type: "sine", gain, attack: 2, decay: dur * 0.8 });
const HAT = (buf, fr, gain) => noise(buf, F(fr), 14, { gain, hp: true, decay: 6 });
const TICK = (buf, fr, gain) => osc(buf, F(fr), 10, { freq: 2200, type: "square", gain, attack: 0.5, decay: 4 });

// —— 原创动机 MOTIF：D4 F4 G4 A4 ——
const M = [293.66, 349.23, 392.0, 440.0];
const MOTIF = (buf, fr, noteIdx, opts = {}) => {
  const { gain = 0.2, dur = 340, bits = null, shift = 0, truncate = 1, rng = makeRng(7) } = opts;
  const f0 = M[noteIdx] * Math.pow(2, shift / 12);
  osc(buf, F(fr), dur, { freq: f0, type: "saw", gain: gain * 0.7, attack: 4, decay: dur * 0.55, lp: 1800, bits, truncate, rng });
  osc(buf, F(fr), dur, { freq: f0 * 1.003, type: "saw", gain: gain * 0.5, attack: 6, decay: dur * 0.5, lp: 1600, bits, truncate, rng });
};

// ================= Shot 02：72 帧 =================
{
  const FRAMES = 72;
  const len = F(FRAMES);
  const buf = new Float32Array(len);
  const rng = makeRng(2026);

  HUM(buf, len);
  // 节拍：每 12 帧（400ms）一拍
  for (const fr of [0, 12, 24, 36, 48, 60]) {
    KICK(buf, fr, fr === 0 ? 0.4 : 0.5);
    SUB(buf, fr, 0.32);
  }
  // 反拍 hat
  for (const fr of [6, 18, 30, 42, 54, 66]) HAT(buf, fr, 0.12);
  // 扫频（帧 24 起 400ms 上行，峰在 F36 密度切换）
  osc(buf, F(24), 420, { freq: 400, type: "sine", gain: 0.14, attack: 30, sweepTo: 3000, sweepMs: 400 });
  // 动机（干净呈现）：帧 12/24/36/48 → D4 F4 G4 A4
  MOTIF(buf, 12, 0, { gain: 0.2 });
  MOTIF(buf, 24, 1, { gain: 0.2 });
  MOTIF(buf, 36, 2, { gain: 0.22 });
  MOTIF(buf, 48, 3, { gain: 0.22 });
  // 转场噪声闪（帧 68–69 反相）
  noise(buf, F(68), 67, { gain: 0.28, rng });

  writeWav(path.join(OUT_DIR, "signal-v2-shot02.wav"), buf);
}

// ================= Shot 05：100 帧 =================
{
  const FRAMES = 100;
  const len = F(FRAMES);
  const buf = new Float32Array(len);
  const rng = makeRng(505);

  HUM(buf, len);

  // A 段 F0–29：kick 每 10 帧 + sub；反相带 tick 帧 5/15/25
  for (const fr of [0, 10, 20]) {
    KICK(buf, fr, 0.45);
    SUB(buf, fr, 0.3);
  }
  for (const fr of [5, 15, 25]) TICK(buf, fr, 0.15);

  // B 段 F30–64：F30 重击；kick 每 10 帧；tick 每 5 帧；glitch 3-bit 方波
  KICK(buf, 30, 0.6);
  SUB(buf, 30, 0.4, 160);
  for (const fr of [40, 50, 60]) KICK(buf, fr, 0.4);
  for (let fr = 35; fr <= 64; fr += 5) HAT(buf, fr, 0.08);
  for (const fr of [33, 43, 53, 63]) {
    const shift = Math.floor(rng() * 5);
    osc(buf, F(fr), 30, { freq: 330 * Math.pow(2, shift / 12), type: "square", gain: 0.16, attack: 0.5, decay: 14, bits: 3 });
  }
  // 白闪 tick（帧 36/48/58 单帧白闪对齐）
  for (const fr of [36, 48, 58]) noise(buf, F(fr), 40, { gain: 0.3, hp: true, decay: 18, rng });

  // 失控动机：帧 30/45/60/75，带半音偏移 + 4-bit 量化 + 随机截断
  const tr = makeRng(99);
  const shiftFor = (k) => Math.floor(tr() * 8); // 0–7 半音
  const truFor = (k) => 0.5 + tr() * 0.5;
  MOTIF(buf, 30, 0, { gain: 0.2, bits: 4, shift: shiftFor(0), truncate: truFor(0), rng });
  MOTIF(buf, 45, 1, { gain: 0.2, bits: 4, shift: shiftFor(1), truncate: truFor(1), rng });
  MOTIF(buf, 60, 2, { gain: 0.2, bits: 4, shift: shiftFor(2), truncate: truFor(2), rng });
  MOTIF(buf, 75, 3, { gain: 0.2, bits: 4, shift: shiftFor(3), truncate: truFor(3), rng });

  // F65 impact
  KICK(buf, 65, 0.65);
  osc(buf, F(65), 220, { freq: 150, type: "sine", gain: 0.5, attack: 1, decay: 120, sweepTo: 40, sweepMs: 200 });
  noise(buf, F(65), 170, { gain: 0.4, decay: 90, rng });

  // F80 IMPACT（大重击，对齐白闪 2 帧）
  osc(buf, F(80), 460, { freq: 80, type: "sine", gain: 0.8, attack: 2, decay: 220, sweepTo: 30, sweepMs: 400 });
  noise(buf, F(80), 240, { gain: 0.5, decay: 110, rng });
  SUB(buf, 80, 0.5, 200);

  // F88 动机收尾：干净 D4（信号稳定的第一声）
  MOTIF(buf, 88, 0, { gain: 0.16, dur: 480 });

  // 尾部噪声墙衰减 + hum 自然延续
  noise(buf, F(85), 480, { gain: 0.18, decay: 220, rng });
  SUB(buf, 85, 0.25, 200);

  writeWav(path.join(OUT_DIR, "signal-v2-shot05.wav"), buf);
}

console.log("audio synthesis done");
