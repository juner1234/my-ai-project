// === SIGNAL V2 · 12 秒完整成片主组件 ===
// 360 帧 @30fps；帧路由七阶段；定稿音乐主轨全程播放（单一 WAV，无拼接断层）。
// S5 直接复用已验收 Shot05Sample（withAudio=false，内部 F0–99 ↔ 全局 F160–259）。

import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame } from "remotion";
import { BLACK } from "./parts";
import { Shot01Capture, Shot02PropagationFull, Shot03Interference } from "./shots1";
import { Shot04Hold, Shot06Reconstruction, Shot07Archive } from "./shots2";
import { Shot05Sample } from "./Shot05Sample";

export const SignalV2: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: BLACK }}>
      {/* 定稿音乐主轨（12.000s，帧对齐） */}
      <Audio src={staticFile("signal-v2-full.wav")} />

      {/* 七阶段帧路由（边界均落在 10 帧拍点上） */}
      <Sequence from={0} durationInFrames={40}>
        <Shot01Capture globalOffset={0} />
      </Sequence>
      <Sequence from={40} durationInFrames={50}>
        <Shot02PropagationFull globalOffset={40} />
      </Sequence>
      <Sequence from={90} durationInFrames={50}>
        <Shot03Interference globalOffset={90} />
      </Sequence>
      <Sequence from={140} durationInFrames={20}>
        <Shot04Hold globalOffset={140} />
      </Sequence>
      <Sequence from={160} durationInFrames={100}>
        <Shot05Sample withAudio={false} globalOffset={160} />
      </Sequence>
      <Sequence from={260} durationInFrames={50}>
        <Shot06Reconstruction globalOffset={260} />
      </Sequence>
      <Sequence from={310} durationInFrames={50}>
        <Shot07Archive globalOffset={310} />
      </Sequence>
    </AbsoluteFill>
  );
};
