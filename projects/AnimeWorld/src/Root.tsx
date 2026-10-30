import { Composition } from "remotion";
import { AnimeWorldTest } from "./AnimeWorldTest";
import {
  EP01Style_WardrobeOpen,
  EP01Style_Journal,
  EP01Style_Burst,
} from "./ep01/EP01StyleSample";
import { EP01Proof } from "./ep01/EP01Proof";
import { EP01Video } from "./ep01/EP01Video";
import { EP01VideoV2 } from "./ep01/EP01VideoV2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AnimeWorldTest"
        component={AnimeWorldTest}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* EP01 阶段二 静态视觉样稿（16:9 / 24fps） */}
      <Composition id="EP01Style-WardrobeOpen" component={EP01Style_WardrobeOpen} durationInFrames={1} fps={24} width={1920} height={1080} />
      <Composition id="EP01Style-Journal" component={EP01Style_Journal} durationInFrames={1} fps={24} width={1920} height={1080} />
      <Composition id="EP01Style-Burst" component={EP01Style_Burst} durationInFrames={1} fps={24} width={1920} height={1080} />
      {/* EP01 动态验证样片（10.5s @ 24fps） */}
      <Composition id="EP01-Proof" component={EP01Proof} durationInFrames={252} fps={24} width={1920} height={1080} />
      {/* EP01 完整配音声画结合成片 V1 原版（46.0s @ 24fps） */}
      <Composition id="EP01-Full" component={EP01Video} durationInFrames={1104} fps={24} width={1920} height={1080} />
      {/* EP01 V2 优化版（48.5s @ 24fps，含 2.5s 悬念片头、强化金句与精准音效） */}
      <Composition id="EP01-V2" component={EP01VideoV2} durationInFrames={1164} fps={24} width={1920} height={1080} />
    </>
  );
};
