import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  type InputVideoTrack,
  type VideoSample,
} from "mediabunny";

const $ = (id: string) => document.getElementById(id) as any;
const logEl = $("log") as HTMLPreElement;
function log(s: string, cls = "") {
  const t = new Date().toISOString().slice(11, 23);
  logEl.innerHTML += `<span class="${cls}">[${t}] ${s}</span>\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

const cvL = $("cvL") as HTMLCanvasElement;
const cvR = $("cvR") as HTMLCanvasElement;
const ctxL = cvL.getContext("2d")!;
const ctxR = cvR.getContext("2d")!;
interface Src {
  side: "L" | "R";
  sink: VideoSampleSink;
  fps: number;
  frames: number;
  duration: number;
  w: number;
  h: number;
  hasAudio: boolean;
}

async function loadSide(side: "L" | "R", url: string): Promise<Src> {
  const blob = await (await fetch(url)).blob();
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error(side + ": 无视频轨");
  const canDecode = await track.canDecode();
  const m = await track.computeFrameRateMetrics();
  const stats = await track.computePacketStats(600);
  const duration = await input.computeDuration();
  const audio = await input.getPrimaryAudioTrack();
  const fps = m.bestGuessFrameRate;
  const frames = stats.packetCount;
  log(
    `${side}: ${track.displayWidth}x${track.displayHeight} · fps=${fps.toFixed(3)}` +
      `(underlying=${m.underlyingFrameRate} · avgRate=${stats.averagePacketRate.toFixed(3)})` +
      ` · frames=${frames} · dur=${duration.toFixed(3)}s` +
      ` · canDecode=${canDecode} · audio=${audio ? "有" : "无"}`,
    canDecode ? "ok" : "bad",
  );
  return {
    side,
    sink: new VideoSampleSink(track),
    fps,
    frames,
    duration,
    w: track.displayWidth,
    h: track.displayHeight,
    hasAudio: !!audio,
  };
}
class Stream {
  private gen: AsyncGenerator<VideoSample> | null = null;
  private buf: VideoSample[] = [];
  private pumping = false;
  private done = false;
  private cap = 8;
  constructor(private sink: VideoSampleSink, private fps: number) {}
  private idx(s: VideoSample) {
    return Math.round(s.timestamp * this.fps);
  }
  start(t: number) {
    this.close();
    this.gen = this.sink.samples(t);
    this.done = false;
    void this.pump();
  }
  private async pump() {
    if (this.pumping || this.done || !this.gen) return;
    this.pumping = true;
    try {
      while (this.gen && this.buf.length < this.cap) {
        const r = await this.gen.next();
        if (r.done) {
          this.done = true;
          break;
        }
        this.buf.push(r.value);
      }
    } finally {
      this.pumping = false;
    }
  }
  peek(frame: number): VideoSample | null {
    while (this.buf.length && this.idx(this.buf[0]) < frame) this.buf.shift()!.close();
    if (this.buf.length && this.idx(this.buf[0]) === frame) return this.buf[0];
    void this.pump();
    return null;
  }
  consume() {
    const s = this.buf.shift();
    void this.pump();
    return s ?? null;
  }
  close() {
    this.done = true;
    this.gen = null;
    for (const s of this.buf) s.close();
    this.buf = [];
  }
}
let srcL: Src;
let srcR: Src;
const st = { target: 0, presented: -1, playing: false, rate: 1, mismatches: 0, drops: 0 };

function readout(frame: number, fL: number, fR: number, ms: number) {
  const match = fL === fR && fL === frame;
  if (!match) st.mismatches++;
  $("readout").innerHTML =
    `target=${frame} · L=${fL} · R=${fR} · ` +
    (match ? `<span class="ok">同帧 OK</span>` : `<span class="bad">错位×${st.mismatches}</span>`) +
    ` · ${ms.toFixed(1)}ms · 丢帧=${st.drops}`;
  $("frame").value = String(frame);
}

async function presentPair(frame: number) {
  const t = (frame + 0.5) / srcL.fps;
  const t0 = performance.now();
  const [sL, sR] = await Promise.all([srcL.sink.getSample(t), srcR.sink.getSample(t)]);
  const ms = performance.now() - t0;
  if (!sL || !sR) {
    sL?.close();
    sR?.close();
    log(`frame ${frame} 取样失败`, "bad");
    return;
  }
  ctxL.clearRect(0, 0, cvL.width, cvL.height);
  sL.draw(ctxL, 0, 0, cvL.width, cvL.height);
  ctxR.clearRect(0, 0, cvR.width, cvR.height);
  sR.draw(ctxR, 0, 0, cvR.width, cvR.height);
  const fL = Math.round(sL.timestamp * srcL.fps);
  const fR = Math.round(sR.timestamp * srcR.fps);
  sL.close();
  sR.close();
  st.presented = frame;
  readout(frame, fL, fR, ms);
}
let streamL: Stream | null = null;
let streamR: Stream | null = null;
let raf = 0;
let lastWall = 0;
let acc = 0;

function canPresent(frame: number) {
  return !!streamL && !!streamR && !!streamL.peek(frame) && !!streamR.peek(frame);
}

function presentBuffered(frame: number) {
  const a = streamL!.peek(frame)!;
  const b = streamR!.peek(frame)!;
  streamL!.consume();
  streamR!.consume();
  ctxL.clearRect(0, 0, cvL.width, cvL.height);
  a.draw(ctxL, 0, 0, cvL.width, cvL.height);
  ctxR.clearRect(0, 0, cvR.width, cvR.height);
  b.draw(ctxR, 0, 0, cvR.width, cvR.height);
  const fL = Math.round(a.timestamp * srcL.fps);
  const fR = Math.round(b.timestamp * srcR.fps);
  a.close();
  b.close();
  st.presented = frame;
  readout(frame, fL, fR, 0);
}

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  if (!st.playing) return;
  const dt = (now - lastWall) / 1000;
  lastWall = now;
  acc += dt * srcL.fps * st.rate;
  const target = Math.min(srcL.frames - 1, Math.floor(acc));
  if (target <= st.presented) return;
  if (canPresent(target)) presentBuffered(target);
  else st.drops++;
}
function stopStreams() {
  streamL?.close();
  streamR?.close();
  streamL = streamR = null;
}

async function seek(frame: number) {
  const f = Math.max(0, Math.min(srcL.frames - 1, Math.round(frame)));
  st.target = f;
  if (st.playing && streamL && streamR) {
    acc = f;
    lastWall = performance.now();
    streamL.start(f / srcL.fps);
    streamR.start(f / srcR.fps);
    seekAudio(f);
  } else {
    await presentPair(f);
    seekAudio(f);
  }
}

function play() {
  if (st.playing) return;
  st.playing = true;
  acc = st.presented >= 0 ? st.presented : st.target;
  lastWall = performance.now();
  streamL = new Stream(srcL.sink, srcL.fps);
  streamR = new Stream(srcR.sink, srcR.fps);
  streamL.start(acc / srcL.fps);
  streamR.start(acc / srcR.fps);
  playAudio();
  $("play").textContent = "⏸ 暂停";
  log("播放开始（左主时钟 → 同一帧编号驱动两路）");
}

function pause() {
  if (!st.playing) return;
  st.playing = false;
  stopStreams();
  pauseAudio();
  $("play").textContent = "▶ 播放";
}
const audL = $("audL") as HTMLAudioElement;
const audR = $("audR") as HTMLAudioElement;

function seekAudio(frame: number) {
  const t = frame / srcL.fps;
  for (const a of [audL, audR]) {
    try {
      a.currentTime = t;
    } catch {
      /* 尚未就绪 */
    }
  }
}
function playAudio() {
  if ($("aL").checked) void audL.play().catch((e) => log(`左声播放失败: ${e}`, "bad"));
  if ($("aR").checked) void audR.play().catch((e) => log(`右声播放失败: ${e}`, "bad"));
}
function pauseAudio() {
  audL.pause();
  audR.pause();
}

async function init() {
  const webcodecs = typeof (window as any).VideoDecoder !== "undefined";
  log(`WebCodecs 可用 = ${webcodecs}`, webcodecs ? "ok" : "bad");
  [srcL, srcR] = await Promise.all([
    loadSide("L", "/poc/media/left.mp4"),
    loadSide("R", "/poc/media/right.mp4"),
  ]);
  cvL.width = srcL.w;
  cvL.height = srcL.h;
  cvR.width = srcR.w;
  cvR.height = srcR.h;
  $("frame").max = String(srcL.frames - 1);
  audL.src = "/poc/media/left.mp4";
  audR.src = "/poc/media/right.mp4";
  await seek(0);
  const fpsEq = Math.abs(srcL.fps - srcR.fps) < 1e-6;
  const frEq = srcL.frames === srcR.frames;
  log(`一致性：fps ${fpsEq ? "一致" : "不一致"} · 帧数 ${frEq ? "一致" : "不一致"}`, fpsEq && frEq ? "ok" : "bad");
  log(`音频：左音轨=${srcL.hasAudio ? "有" : "无"} · 右音轨=${srcR.hasAudio ? "有" : "无"}`);
  (window as any).poc = { seek, play, pause, presentPair, st, srcL, srcR };
  raf = requestAnimationFrame(tick);
}

$("play").onclick = () => {
  if (st.playing) pause();
  else play();
};
$("prev").onclick = () => {
  pause();
  void seek(st.presented - 1);
};
$("next").onclick = () => {
  pause();
  void seek(st.presented + 1);
};
$("frame").oninput = (e: Event) => {
  void seek(Number((e.target as HTMLInputElement).value));
};
$("aL").onchange = () => {
  audL.muted = !$("aL").checked;
  log(`左声 ${$("aL").checked ? "开" : "关"}`);
};
$("aR").onchange = () => {
  audR.muted = !$("aR").checked;
  log(`右声 ${$("aR").checked ? "开" : "关"}`);
};
window.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    if (st.playing) pause();
    else play();
  }
  if (e.code === "ArrowRight") {
    pause();
    void seek(st.presented + 1);
  }
  if (e.code === "ArrowLeft") {
    pause();
    void seek(st.presented - 1);
  }
});

void init();
