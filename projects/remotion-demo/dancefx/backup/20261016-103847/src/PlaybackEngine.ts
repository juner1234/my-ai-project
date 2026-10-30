/**
 * 双视频同步引擎
 * 单一权威时钟：播放中以主视频 currentTime 为唯一时间来源。
 * 唯一写入者：所有 currentTime 写入都经过这里。
 */
export interface EngineCallbacks {
  onTime: (t: number) => void;
}
const DISPLAY_HZ = 15; // 播放中 UI 时间刷新频率
const SOFT_SEEK = 0.04; // 秒：偏差小于此值视为已同步
const HARD_SEEK = 0.12; // 秒：偏差超过此值才硬 seek 从动方
const SETTLE_MS = 320; // 硬 seek / 拖拽结束后的静默窗口
const SEEK_EPS = 0.004; // 秒：避免无意义写入

export class PlaybackEngine {
  private master: HTMLVideoElement | null = null;
  private slave: HTMLVideoElement | null = null;
  private cb: EngineCallbacks;
  private fps: number;
  private rafId = 0;
  private playing = false;
  private scrubbing = false;
  private rate = 1;
  private duration = 0;
  private lastTime = 0;
  private scrubTarget: number | null = null;
  private settleUntil = 0;
  private lastDisplayTs = 0;

  constructor(cb: EngineCallbacks, fps: number) {
    this.cb = cb;
    this.fps = fps;
  }

  setMaster(el: HTMLVideoElement | null) {
    this.master = el;
    if (!el) return;
    this.applyRate(el);
    this.seekElement(el, this.lastTime);
  }
  setSlave(el: HTMLVideoElement | null) {
    this.slave = el;
    if (!el) return;
    this.applyRate(el);
    this.seekElement(el, this.lastTime);
  }

  setDuration(d: number) {
    this.duration = Number.isFinite(d) ? d : 0;
  }

  /** 媒体就绪后把两侧对齐到引擎当前时间（播放中不动，避免打断解码） */
  resync() {
    if (this.playing) return;
    this.applySeek(this.lastTime);
  }

  setRate(r: number) {
    this.rate = r > 0 ? r : 1;
    this.applyRate(this.master);
    this.applyRate(this.slave);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.settleUntil = 0;
    this.startLoop();
    this.kick(this.master);
    this.kick(this.slave);
  }
  pause() {
    this.playing = false;
    this.safePause(this.master);
    this.safePause(this.slave);
    if (!this.scrubbing) this.stopLoop();
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  step(frames: number) {
    this.pause();
    const base =
      this.master && Number.isFinite(this.master.currentTime)
        ? this.master.currentTime
        : this.lastTime;
    this.commit(base + frames / this.fps);
  }
  private commit(t: number) {
    const tt = this.clamp(t);
    this.lastTime = tt;
    this.applySeek(tt);
    this.cb.onTime(tt);
  }
  seek(t: number) {
    if (this.scrubbing) {
      const tt = this.clamp(t);
      this.lastTime = tt;
      this.scrubTarget = tt;
      this.cb.onTime(tt);
    } else {
      this.commit(t);
    }
  }

  beginScrub() {
    this.scrubbing = true;
    this.scrubTarget = null;
    this.startLoop();
  }
  endScrub() {
    this.scrubbing = false;
    const pending = this.scrubTarget;
    this.scrubTarget = null;
    if (pending != null) this.commit(pending);
    this.settleUntil = nowMs() + SETTLE_MS;
    if (!this.playing) this.stopLoop();
  }
  private loop = (ts: number) => {
    this.rafId = requestAnimationFrame(this.loop);
    if (this.scrubTarget != null) {
      this.applySeek(this.scrubTarget);
      this.scrubTarget = null;
    }
    if (this.scrubbing) return;
    const m = this.master;
    if (!m || !this.playing) {
      this.stopLoop();
      return;
    }
    if (m.ended) {
      this.handleEnded();
      return;
    }
    if (m.paused) this.kick(m);
    const mt = m.currentTime;
    this.lastTime = mt;
    if (ts >= this.settleUntil) this.correctSlave(mt, ts);
    if (ts - this.lastDisplayTs >= 1000 / DISPLAY_HZ) {
      this.lastDisplayTs = ts;
      this.cb.onTime(mt);
    }
  };
  private handleEnded() {
    this.playing = false;
    this.safePause(this.master);
    this.safePause(this.slave);
    this.stopLoop();
    const t = this.master ? this.clamp(this.master.currentTime) : this.lastTime;
    this.lastTime = t;
    this.seekElement(this.slave, t);
    this.cb.onTime(t);
  }
  private correctSlave(masterTime: number, ts: number) {
    const s = this.slave;
    if (!s) return;
    if (s.seeking || s.readyState < 2) return;
    if (!Number.isFinite(s.duration) || s.duration <= 0) return;
    if (s.ended && !this.master?.ended) return;
    const drift = masterTime - s.currentTime;
    if (Math.abs(drift) <= SOFT_SEEK) {
      this.applyRate(s);
      return;
    }
    if (Math.abs(drift) >= HARD_SEEK) {
      this.lastTime = masterTime;
      this.seekElement(s, masterTime);
      this.settleUntil = ts + SETTLE_MS;
      return;
    }
    const boost = this.rate * (1 + drift * 3);
    const lo = this.rate * 0.6;
    const hi = this.rate * 1.4;
    this.applyRate(s, Math.max(lo, Math.min(hi, boost)));
  }
  private applyRate(v: HTMLVideoElement | null, r = this.rate) {
    if (!v) return;
    if (Math.abs(v.playbackRate - r) < 0.001) return;
    try {
      v.playbackRate = r;
    } catch {
      /* 元素未就绪 */
    }
  }
  private seekElement(v: HTMLVideoElement | null, t: number) {
    if (!v) return;
    const dur = v.duration;
    const max = Number.isFinite(dur) && dur > 0 ? dur : t;
    const target = Math.max(0, Math.min(max, t));
    if (Math.abs(v.currentTime - target) <= SEEK_EPS) return;
    try {
      v.currentTime = target;
    } catch {
      /* 未就绪 */
    }
  }
  private applySeek(t: number) {
    this.seekElement(this.master, t);
    this.seekElement(this.slave, t);
  }

  private kick(v: HTMLVideoElement | null) {
    if (!v) return;
    try {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* 自动播放策略或未就绪，由循环重试 */
    }
  }
  private safePause(v: HTMLVideoElement | null) {
    if (!v) return;
    try {
      v.pause();
    } catch {
      /* noop */
    }
  }

  private clamp(t: number) {
    if (!Number.isFinite(t)) return this.lastTime;
    const d = this.duration;
    if (!Number.isFinite(d) || d <= 0) return Math.max(0, t);
    return Math.max(0, Math.min(d, t));
  }
  private startLoop() {
    if (this.rafId) return;
    this.lastDisplayTs = 0;
    this.rafId = requestAnimationFrame(this.loop);
  }

  private stopLoop() {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
  destroy() {
    this.stopLoop();
    this.safePause(this.master);
    this.safePause(this.slave);
    this.master = null;
    this.slave = null;
  }
}

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
