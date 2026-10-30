import { Composition } from "remotion";
import { SignalComposition } from "./Composition";
import { Shot02Sample } from "./v2/Shot02Sample";
import { Shot05Sample } from "./v2/Shot05Sample";
import { SignalV2 } from "./v2/SignalV2";
import { DanceFXTest } from "./dancefx/DanceFXTest";
import { DATA } from "./dancefx/data";
import { PreviewA2, PreviewB1, PreviewC1 } from "./dancefx/styleframes/Previews";
import { WINDOWS } from "./dancefx/styleframes/windows";
import { DanceFXOverlay } from "./dancefx/styleframes/DanceFXOverlay";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 完整成片：原视频全程 + 三窗口 Style Frame 效果叠加（892×718 @30fps，704 帧） */}
      <Composition
        id="DanceFXStyleFrames"
        component={DanceFXOverlay}
        durationInFrames={DATA.video.frames}
        fps={DATA.video.fps}
        width={DATA.video.width}
        height={DATA.video.height}
      />
      {/* Style Frame 效果预览（低成本：仅效果窗口 ≈2s，原视频从头连续播放该窗口） */}
      <Composition
        id="SF-A2"
        component={PreviewA2}
        durationInFrames={WINDOWS.A2.durationInFrames}
        fps={DATA.video.fps}
        width={DATA.video.width}
        height={DATA.video.height}
      />
      <Composition
        id="SF-B1"
        component={PreviewB1}
        durationInFrames={WINDOWS.B1.durationInFrames}
        fps={DATA.video.fps}
        width={DATA.video.width}
        height={DATA.video.height}
      />
      <Composition
        id="SF-C1"
        component={PreviewC1}
        durationInFrames={WINDOWS.C1.durationInFrames}
        fps={DATA.video.fps}
        width={DATA.video.width}
        height={DATA.video.height}
      />
      {/* DanceFX：原舞视频 + 三节点效果（892×718 @30fps，整段 704 帧） */}
      <Composition
        id="DanceFXTest"
        component={DanceFXTest}
        durationInFrames={DATA.video.frames}
        fps={DATA.video.fps}
        width={DATA.video.width}
        height={DATA.video.height}
      />
      <Composition
        id="Signal"
        component={SignalComposition}
        durationInFrames={255}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* V2 阶段A 样片（独立于 V1，不覆盖） */}
      <Composition
        id="SignalV2Shot02"
        component={Shot02Sample}
        durationInFrames={72}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SignalV2Shot05"
        component={Shot05Sample}
        durationInFrames={100}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* V2 完整成片：12 秒 360 帧 */}
      <Composition
        id="SignalV2"
        component={SignalV2}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
