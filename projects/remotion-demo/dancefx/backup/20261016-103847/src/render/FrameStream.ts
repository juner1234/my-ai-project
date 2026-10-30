import type { VideoSample } from "mediabunny";
import type { FrameSource } from "./FrameSource";

/**
 * 播放用的顺序帧缓冲。
 * 单路只负责“按帧号取到对应样本”，不参与呈现；呈现由引擎在同一事务里合并。
 */
export class FrameStream {
  private gen: AsyncGenerator<VideoSample, void, unknown> | null = null;
  private buf: VideoSample[] = [];
  private pumping = false;
  private done = false;
  private readonly cap: number;

  constructor(
    private readonly src: FrameSource,
    cap = 8,
  ) {
    this.cap = cap;
  }

  private idx(s: VideoSample) {
    return this.src.frameOf(s);
  }

  startAtFrame(n: number) {
    this.close();
    this.done = false;
    this.buf = [];
    this.gen = this.src.samplesFrom(n);
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

  /** 若队首正好是第 frame 帧则返回它（不消费），否则丢弃过期帧并触发预取 */
  peek(frame: number): VideoSample | null {
    while (this.buf.length && this.idx(this.buf[0]) < frame) this.buf.shift()!.close();
    if (this.buf.length && this.idx(this.buf[0]) === frame) return this.buf[0];
    void this.pump();
    return null;
  }

  consume(): VideoSample | null {
    const s = this.buf.shift() ?? null;
    void this.pump();
    return s;
  }

  close() {
    this.done = true;
    this.gen = null;
    for (const s of this.buf) s.close();
    this.buf = [];
  }
}
