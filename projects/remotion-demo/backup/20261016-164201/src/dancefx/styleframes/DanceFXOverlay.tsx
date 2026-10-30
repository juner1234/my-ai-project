// 完整成片：原视频全程连续播放（含原声），按导演器节点时间叠加对应 Style Frame 效果。
// 窗口/节点数来自 data.live（projects.json），新增已登记节点会自动出现。
import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { SvgLayer } from "./Previews";
import { SF_VIDEO } from "./windows";
import { liveNodes } from "./data.live";
import { SF_EFFECTS } from "./effectsRegistry";

export const DanceFXOverlay: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile(SF_VIDEO)} />
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
    </AbsoluteFill>
  );
};
