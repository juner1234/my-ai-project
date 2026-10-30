import type { VideoSample } from "mediabunny";
import { FrameSource, type MediaInfo } from "./FrameSource";
import { FrameStream } from "./FrameStream";

export type Side = "left" | "right";

export interface StageHandle {
  canvas: HTMLCanvasElement;
  audio: HTMLAudioElement | null;
}

export interface EngineCallbacks {
  onTime: (t: number) => void;
  onDuration: (d: number) => void;
  onReady: (side: Side) => void;
  onInfo: (side: Side, info: MediaInfo) => void;
  onError: (side: Side, message: string) => void;
  onEnded?: () => void;
}

interface SideState {
  src: FrameSource;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio: HTMLAudioElement | null;
  stream: FrameStream | null;
}

const MAX_TICK_GAP = 0.5; // 秒：单次 rAF 间隔超过此值视为节流/挂起，不推进时钟，改为重锚

/**
 * 帧编号驱动的双源呈现引擎（WebCodecs）。
 * - 帧号 n 是唯一同步标准：左右都取第 n 帧。
 * - 呈现于同一同步事务：两路样本都就绪后才一起绘制，绝不出现一边新一边旧。
 * - 播放用单 rAF + 顺序流；seek/step 用随机访问。
 * 对外方法与旧 PlaybackEngine 对齐，便于整体回退。
 */
export class WebCodecsEngine {
  private readonly cb: EngineCallbacks;
  private readonly fpsFallback: number;
  private sides: Record<Side, SideState | null> = { left: null, right: null };
  private tokens: Record<Side, number> = { left: 0, right: 0 };
  private readySides: Record<Side, boolean> = { left: false, right: false };
  private playing = false;
  private scrubbing = false;
  private rate = 1;
  private fps = 30;
  private frames = 0;
  private duration = 0;
  private lastTime = 0;
  private presented = -1;
  private intended = 0;
  private anchorClock = 0; // 秒：统一媒体时钟锚点
  private anchorWall = 0; // ms：锚点对应的 performance.now()
  private rafId = 0;
  private lastWall = 0;
  private lastDisplay = 0;
  private scrubTarget: number | null = null;
  private req = 0;
  private opSeq = 0; // 离散操作世代号：快速连续操作以最后一次为准
  private drops = 0;

  constructor(cb: EngineCallbacks, fpsFallback = 30) {
    this.cb = cb;
    this.fpsFallback = fpsFallback;
  }

  private get(side: Side): SideState | null {
    return this.sides[side];
  }
  private set(side: Side, state: SideState | null) {
    this.sides[side] = state;
  }
  private bothReady(): boolean {
    return this.readySides.left && this.readySides.right;
  }
  private recompute() {
    const l = this.sides.left?.src.info;
    const r = this.sides.right?.src.info;
    this.fps = l?.fps || r?.fps || this.fpsFallback;
    const fr = Math.min(l?.frames ?? Infinity, r?.frames ?? Infinity);
    this.frames = Number.isFinite(fr) ? fr : 0;
    this.duration = l?.duration ?? r?.duration ?? 0;
    this.cb.onDuration(this.duration);
  }
  private curFrame(): number {
    return this.intended;
  }
  private clampFrame(n: number): number {
    if (!Number.isFinite(n)) return this.intended;
    const v = Math.max(0, Math.round(n));
    return this.frames > 0 ? Math.min(this.frames - 1, v) : v;
  }

  /** 统一媒体时钟：由锚点 + 真实时间推导（非 rAF 累加），可随时重新锚定 */
  private clockAt(nowMs: number): number {
    return this.anchorClock + ((nowMs - this.anchorWall) / 1000) * this.rate;
  }
  private reanchor(t: number, nowMs: number) {
    this.anchorClock = t;
    this.anchorWall = nowMs;
  }

  /** 装载/替换某一侧的来源与渲染目标（url 为空则清空该侧） */
  async setSide(side: Side, url: string, handle: StageHandle): Promise<void> {
    const token = ++this.tokens[side];
    this.readySides[side] = false;
    const prev = this.get(side);
    if (prev) {
      prev.stream?.close();
      prev.src.close();
      this.set(side, null);
    }
    if (!url) return;
    let src: FrameSource;
    try {
      src = await FrameSource.open(url);
    } catch (e) {
      if (token === this.tokens[side]) {
        this.cb.onError(side, e instanceof Error ? e.message : String(e));
      }
      return;
    }
    if (token !== this.tokens[side]) {
      src.close();
      return;
    }
    const ctx = handle.canvas.getContext("2d");
    if (!ctx) {
      src.close();
      this.cb.onError(side, "无法创建 2D 渲染上下文");
      return;
    }
    handle.canvas.width = src.info.width;
    handle.canvas.height = src.info.height;
    this.set(side, { src, canvas: handle.canvas, ctx, audio: handle.audio, stream: null });
    this.readySides[side] = true;
    this.cb.onInfo(side, src.info);
    this.recompute();
    this.cb.onReady(side);
    if (this.playing && this.bothReady()) this.restartStreams(this.curFrame());
    else if (!this.playing) void this.presentPair(this.curFrame());
  }

  setMuted(side: Side, muted: boolean) {
    const a = this.get(side)?.audio;
    if (a) a.muted = muted;
  }

  // ---- 呈现 ----
  private draw(state: SideState, s: VideoSample) {
    const { ctx, canvas } = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    s.draw(ctx, 0, 0, canvas.width, canvas.height);
  }

  /**
   * 随机访问呈现：等两路都取到第 frame 帧，再在同一同步块里一起绘制。
   * req 世代号保证快速拖动时只有最后一次请求生效（过期结果直接丢弃）。
   */
  private async presentPair(frame: number) {
    const f = this.clampFrame(frame);
    const my = ++this.req;
    const L = this.sides.left;
    const R = this.sides.right;
    const [sL, sR] = await Promise.all([
      L ? L.src.sampleAtFrame(f) : Promise.resolve(null),
      R ? R.src.sampleAtFrame(f) : Promise.resolve(null),
    ]);
    if (my !== this.req) {
      sL?.close();
      sR?.close();
      return;
    }
    if (L && sL) this.draw(L, sL);
    if (R && sR) this.draw(R, sR);
    sL?.close();
    sR?.close();
    this.presented = f;
    this.intended = f;
    this.lastTime = f / this.fps;
    this.cb.onTime(this.lastTime);
  }

  private presentBuffered(frame: number, ts: number): boolean {
    const L = this.sides.left;
    const R = this.sides.right;
    if (!L?.stream || !R?.stream) return false;
    const a = L.stream.peek(frame);
    const b = R.stream.peek(frame);
    if (!a || !b) return false;
    L.stream.consume();
    R.stream.consume();
    this.draw(L, a);
    this.draw(R, b);
    a.close();
    b.close();
    this.presented = frame;
    this.intended = frame;
    this.lastTime = frame / this.fps;
    if (ts - this.lastDisplay >= 66) {
      this.lastDisplay = ts;
      this.cb.onTime(this.lastTime);
    }
    return true;
  }

  private restartStreams(frame: number) {
    const L = this.sides.left;
    const R = this.sides.right;
    if (!L || !R) return;
    const f = this.clampFrame(frame);
    L.stream?.close();
    R.stream?.close();
    L.stream = new FrameStream(L.src);
    R.stream = new FrameStream(R.src);
    L.stream.startAtFrame(f);
    R.stream.startAtFrame(f);
    this.presented = f - 1;
    this.intended = f;
  }

  private stopStreams() {
    for (const side of ["left", "right"] as Side[]) {
      const s = this.get(side);
      if (s) {
        s.stream?.close();
        s.stream = null;
      }
    }
  }

  // ---- 传输控制 ----
  play() {
    if (this.playing || !this.bothReady()) return;
    const f = this.curFrame();
    const now = performance.now();
    this.playing = true;
    this.reanchor(f / this.fps, now);
    this.lastWall = now;
    this.restartStreams(f);
    this.positionAudio(f);
    this.audioPlay();
    this.startLoop();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.opSeq++;
    this.stopStreams();
    this.audioPause();
    if (!this.scrubbing) this.stopLoop();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  step(delta: number) {
    this.scrubbing = false;
    const f = this.clampFrame(this.intended + delta);
    void this.goToFrame(f, false);
  }

  seek(t: number) {
    const f = this.clampFrame(t * this.fps);
    if (this.scrubbing) {
      this.scrubTarget = f;
      this.intended = f;
      this.lastTime = f / this.fps;
      this.cb.onTime(this.lastTime);
      return;
    }
    void this.goToFrame(f, this.playing);
  }

  /**
   * 离散操作统一入口：先停音频与循环 → 等左右第 frame 帧都就绪 → 统一定位音频 → 需要则恢复播放。
   * opSeq 世代号保证快速连续操作只有最后一次生效（防异步竞争）。
   */
  private async goToFrame(f0: number, resume: boolean) {
    const frame = this.clampFrame(f0);
    const token = ++this.opSeq;
    const now = performance.now();
    this.playing = false;
    this.stopStreams();
    this.audioPause();
    this.stopLoop();
    this.reanchor(frame / this.fps, now);
    this.intended = frame;
    this.lastTime = frame / this.fps;
    this.cb.onTime(this.lastTime);
    await this.presentPair(frame);
    if (token !== this.opSeq) return; // 已被更晚的请求取代
    this.positionAudio(frame);
    if (resume && this.bothReady()) {
      const t = performance.now();
      this.playing = true;
      this.reanchor(frame / this.fps, t);
      this.lastWall = t;
      this.restartStreams(frame);
      this.audioPlay();
      this.startLoop();
    }
  }

  beginScrub() {
    this.scrubbing = true;
    this.scrubTarget = null;
    this.opSeq++;
    this.startLoop();
  }

  endScrub() {
    if (!this.scrubbing) return;
    this.scrubbing = false;
    const f = this.scrubTarget;
    this.scrubTarget = null;
    const target = this.clampFrame(f ?? this.curFrame());
    const resume = this.playing && this.bothReady();
    void this.goToFrame(target, resume);
  }

  resync() {
    if (this.playing || this.scrubbing) return;
    void this.presentPair(this.curFrame());
  }

  setRate(r: number) {
    if (this.playing) this.reanchor(this.clockAt(performance.now()), performance.now());
    this.rate = r > 0 ? r : 1;
    for (const side of ["left", "right"] as Side[]) {
      const a = this.get(side)?.audio;
      if (a) {
        try {
          a.playbackRate = this.rate;
        } catch {
          /* noop */
        }
      }
    }
  }

  private loop = (ts: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.scrubbing) {
      const f = this.scrubTarget;
      if (f != null) {
        this.scrubTarget = null;
        void this.presentPair(f);
      }
      return;
    }
    if (!this.playing) {
      this.stopLoop();
      return;
    }
    const gap = ts - this.lastWall;
    this.lastWall = ts;
    if (gap > MAX_TICK_GAP * 1000) {
      // 浏览器节流/挂起：本 tick 不推进，重锚到已呈现帧，避免跳帧后与音频错位
      this.reanchor(this.presented >= 0 ? this.presented / this.fps : this.anchorClock, ts);
      return;
    }
    if (this.clockAt(ts) >= this.frames / this.fps) {
      const last = this.frames - 1;
      if (this.presented < last) this.presentBuffered(last, ts);
      this.playing = false;
      this.stopStreams();
      this.audioPause();
      this.stopLoop();
      this.cb.onEnded?.();
      return;
    }
    const target = Math.min(this.frames - 1, Math.floor(this.clockAt(ts) * this.fps));
    if (target <= this.presented) return;
    if (!this.presentBuffered(target, ts)) this.drops++;
  };

  private startLoop() {
    if (this.rafId) return;
    this.lastDisplay = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }
  private stopLoop() {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  // ---- 音频：左右两条独立链路，只做“按帧定位 + 漂移纠正” ----
  private audioPlay() {
    for (const side of ["left", "right"] as Side[]) {
      const a = this.get(side)?.audio;
      if (!a) continue;
      try {
        a.playbackRate = this.rate;
      } catch {
        /* noop */
      }
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }
  private audioPause() {
    for (const side of ["left", "right"] as Side[]) {
      try {
        this.get(side)?.audio?.pause();
      } catch {
        /* noop */
      }
    }
  }
  /** 离散定位：把两侧音频定位到第 frame 帧对应时间（仅在 seek/step/pause→resume 时调用） */
  private positionAudio(frame: number) {
    const t = frame / this.fps;
    for (const side of ["left", "right"] as Side[]) {
      const a = this.get(side)?.audio;
      if (!a || a.readyState < 1) continue;
      try {
        const max = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : t;
        a.currentTime = Math.max(0, Math.min(max, t));
      } catch {
        /* noop */
      }
    }
  }

  destroy() {
    this.stopLoop();
    this.audioPause();
    for (const side of ["left", "right"] as Side[]) {
      const s = this.get(side);
      if (s) {
        s.stream?.close();
        s.src.close();
      }
      this.set(side, null);
      this.readySides[side] = false;
    }
  }
}
