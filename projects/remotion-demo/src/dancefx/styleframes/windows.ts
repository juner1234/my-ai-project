// 窗口配置：时间来自导演器工程（data.live），与视频路径、效果实现解耦。
import { liveNodes } from "./data.live";
import { SF_EFFECTS } from "./effectsRegistry";
export { SF_VIDEO } from "./data.live";

export interface SFWindow {
  baseFrame: number;
  durationInFrames: number;
  follow: string;
  title: string;
}

const nodes = liveNodes();

function win(id: string): SFWindow {
  const n = nodes.find((x) => x.id === id);
  return {
    baseFrame: n?.baseFrame ?? 0,
    durationInFrames: n?.durationInFrames ?? 1,
    follow: n?.follow ?? "none",
    title: SF_EFFECTS[id]?.title ?? id,
  };
}

// A2/B1/C1 独立预览合成沿用同一窗口（随导演器节点时间自动变化）
export const WINDOWS: Record<"A2" | "B1" | "C1", SFWindow> = {
  A2: win("FX-002"),
  B1: win("FX-004"),
  C1: win("FX-005"),
};
