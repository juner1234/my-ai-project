// 完整成片：原视频全程连续播放（含原声），按导演器节点时间叠加对应 Style Frame 效果。
// 窗口/节点数来自 data.live（projects.json），新增已登记节点会自动出现。
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { SvgLayer } from "./Previews";
import { SF_VIDEO } from "./windows";
import { liveNodes } from "./data.live";
import { SF_EFFECTS } from "./effectsRegistry";
import { GlobalAmbient, GlobalHud, DigitalRain } from "./GlobalStyle";
import { ScanSweep, ImpactBurst, Shake } from "./TimeFx";

// 时间触发特效（按当前时间轴换算帧数，30fps）：
// 7.1s -> 帧 213；12.26s -> 帧 368。
const SCAN_FROM = 203;
const SCAN_DUR = 54;
const IMPACT_FROM = 364;
const IMPACT_DUR = 48;

export const DanceFXOverlay: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Shake>
        <OffthreadVideo src={staticFile(SF_VIDEO)} />
        <GlobalAmbient />
        <DigitalRain />
        <Sequence from={SCAN_FROM} durationInFrames={SCAN_DUR} layout="none">
          <ScanSweep />
        </Sequence>
        <Sequence from={IMPACT_FROM} durationInFrames={IMPACT_DUR} layout="none">
          <ImpactBurst />
        </Sequence>
        {liveNodes().map((n) => {
          const e = SF_EFFECTS[n.id];
          if (!e) return null;
          const body = <e.Comp baseFrame={n.baseFrame} durationInFrames={n.durationInFrames} />;
          return (
            <Sequence key={n.id} from={n.baseFrame} durationInFrames={n.durationInFrames} layout="none">
              {e.svg ? <SvgLayer>{body}</SvgLayer> : body}
            </Sequence>
          );
        })}
        <GlobalHud />
      </Shake>
    </AbsoluteFill>
  );
};
