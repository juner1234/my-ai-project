import {
  Input,
  ALL_FORMATS,
  BlobSource,
  VideoSampleSink,
  type VideoSample,
} from "mediabunny";

export interface MediaInfo {
  url: string;
  fps: number;
  frames: number;
  duration: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

/**
 * 单个视频源的拆封装 + 解码封装。
 * 帧号 n 是唯一坐标：timeOfFrame(n) 给出该帧中心时间，
 * sampleAtFrame(n) 通过受控随机访问取回“第 n 帧”样本。
 */
export class FrameSource {
  readonly info: MediaInfo;
  private readonly input: Input;
  private readonly sink: VideoSampleSink;

  private constructor(input: Input, sink: VideoSampleSink, info: MediaInfo) {
    this.input = input;
    this.sink = sink;
    this.info = info;
  }

  static async open(url: string): Promise<FrameSource> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`读取失败 (${res.status})`);
    const blob = await res.blob();
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("文件中没有视频轨");
    if (!(await track.canDecode())) throw new Error("当前浏览器无法解码该视频编码");
    const metrics = await track.computeFrameRateMetrics();
    const stats = await track.computePacketStats();
    const duration = await input.computeDuration();
    const audio = await input.getPrimaryAudioTrack();
    const info: MediaInfo = {
      url,
      fps: metrics.bestGuessFrameRate || 30,
      frames: stats.packetCount,
      duration,
      width: track.displayWidth,
      height: track.displayHeight,
      hasAudio: !!audio,
    };
    return new FrameSource(input, new VideoSampleSink(track), info);
  }

  /** 帧号 -> 该帧中心时间（秒），落在帧内，避免边界歧义 */
  timeOfFrame(n: number): number {
    return (n + 0.5) / this.info.fps;
  }
  /** 解码样本 -> 帧号 */
  frameOf(sample: VideoSample): number {
    return Math.round(sample.timestamp * this.info.fps);
  }
  /** 随机访问：取第 n 帧 */
  sampleAtFrame(n: number): Promise<VideoSample | null> {
    const f = Math.max(0, Math.min(this.info.frames - 1, n));
    return this.sink.getSample(this.timeOfFrame(f));
  }
  /** 顺序访问生成器：从第 n 帧开始（播放用） */
  samplesFrom(n: number): AsyncGenerator<VideoSample, void, unknown> {
    const f = Math.max(0, Math.min(this.info.frames - 1, n));
    return this.sink.samples(f / this.info.fps);
  }
  close() {
    try {
      this.input.dispose();
    } catch {
      /* noop */
    }
  }
}
