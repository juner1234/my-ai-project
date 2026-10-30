// DanceFX 测试片：原视频 + 三个节点效果叠加，保留原声与时间同步。
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { DATA } from "./data";
import { EFFECTS } from "./effects";

export const DanceFXTest: React.FC = () => {
  const { video, nodes } = DATA;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 原视频（含原声，整段铺底，保证音画同步） */}
      <OffthreadVideo src={staticFile(video.file)} />
      {/* 每个节点仅在其时间范围内叠加效果 */}
      {nodes.map((n) => {
        const Eff = EFFECTS[n.id];
        if (!Eff) return null;
        return (
          <Sequence key={n.id} from={n.startFrame} durationInFrames={n.durationFrames} layout="none">
            <AbsoluteFill>
              <svg width="100%" height="100%" viewBox={`0 0 ${video.width} ${video.height}`}
                preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                <Eff node={n} />
              </svg>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
