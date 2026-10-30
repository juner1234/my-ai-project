import { Composition } from "remotion";
import { RotatingCube } from "./RotatingCube";
import { Bedroom } from "./Bedroom";
import {
  PromptLibrary,
  computePromptLibraryDuration,
  defaultPromptLibraryProps,
} from "./PromptLibrary";

/**
 * 注册所有合成（Composition）。
 * 后续新增 3D 动画时，在这里追加一个 <Composition /> 即可，
 * 每个合成对应场景目录下的一个独立组件，便于复用。
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RotatingCube"
        component={RotatingCube}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* 治愈系少女童话风卧室：多部件复杂 3D 场景，摄像机缓慢环绕 */}
      <Composition
        id="Bedroom"
        component={Bedroom}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />

      {/*
        PromptLibrary：翻阅 reference/opus5-5 的 prompt 语料。
        时长按「筛选结果条数 ÷ 每页条数 × 每页秒数」自动计算，
        所以在 props 面板改筛选条件后，时长会跟着变。
      */}
      <Composition
        id="PromptLibrary"
        component={PromptLibrary}
        durationInFrames={computePromptLibraryDuration(defaultPromptLibraryProps)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultPromptLibraryProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: computePromptLibraryDuration(props),
        })}
      />
    </>
  );
};
