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

const AUDIO_DRIFT = 0.2; // 秒：音频漂移超过此值才纠正，避免频繁跳变
const AUDIO_SYNC_HZ = 4; // 播放中音频校正检查频率

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
  private acc = 0;
  private rafId = 0;
  private lastWall = 0;
  private lastAudioSync = 0;
  private lastDisplay = 0;
  private scrubTarget: number | null = null;
  private req = 0;
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
    this.playing = true;
    this.acc = this.curFrame();
    this.lastWall = performance.now();
    this.lastAudioSync = 0;
    this.restartStreams(this.acc);
    this.audioPlay();
    this.startLoop();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.stopStreams();
    this.audioPause();
    if (!this.scrubbing) this.stopLoop();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  step(delta: number) {
    this.pause();
    this.scrubbing = false;
    const f = this.clampFrame(this.intended + delta);
    this.intended = f;
    void this.presentPair(f);
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
    if (this.playing) {
      this.acc = f;
      this.lastWall = performance.now();
      this.restartStreams(f);
      this.syncAudioTo(f);
      this.cb.onTime(f / this.fps);
    } else {
      this.seekToFrame(f);
    }
  }

  private seekToFrame(f: number) {
    const frame = this.clampFrame(f);
    this.lastTime = frame / this.fps;
    this.cb.onTime(this.lastTime);
    this.syncAudioTo(frame);
    void this.presentPair(frame);
  }

  beginScrub() {
    this.scrubbing = true;
    this.scrubTarget = null;
    this.startLoop();
  }

  endScrub() {
    if (!this.scrubbing) return;
    this.scrubbing = false;
    const f = this.scrubTarget;
    this.scrubTarget = null;
    const target = this.clampFrame(f ?? this.curFrame());
    if (this.playing) {
      this.acc = target;
      this.lastWall = performance.now();
      this.restartStreams(target);
      this.syncAudioTo(target);
    } else {
      this.seekToFrame(target);
      this.stopLoop();
    }
  }

  resync() {
    if (this.playing || this.scrubbing) return;
    void this.presentPair(this.curFrame());
  }

  setRate(r: number) {
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
    const dt = (ts - this.lastWall) / 1000;
    this.lastWall = ts;
    this.acc += dt * this.fps * this.rate;
    if (this.acc >= this.frames) {
      const last = this.frames - 1;
      if (this.presented < last) this.presentBuffered(last, ts);
      this.playing = false;
      this.stopStreams();
      this.audioPause();
      this.stopLoop();
      this.cb.onEnded?.();
      return;
    }
    const target = Math.min(this.frames - 1, Math.floor(this.acc));
    if (target <= this.presented) return;
    if (this.presentBuffered(target, ts)) {
      if (ts - this.lastAudioSync >= 1000 / AUDIO_SYNC_HZ) {
        this.lastAudioSync = ts;
        this.syncAudio(false);
      }
    } else {
      this.drops++;
    }
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
  /** 跳转后把音频定位到第 frame 帧对应时间（暂停时不会发声，恢复播放即从此处继续） */
  private syncAudioTo(frame: number) {
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
  private syncAudio(force: boolean) {
    const t = this.presented / this.fps;
    for (const side of ["left", "right"] as Side[]) {
      const a = this.get(side)?.audio;
      if (!a || a.readyState < 2) continue;
      if (force || Math.abs(a.currentTime - t) > AUDIO_DRIFT) {
        try {
          a.currentTime = t;
        } catch {
          /* noop */
        }
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
