// 实时数据桥：直接读取导演器的 dancefx/projects.json（当前工程）。
// 导演器保存 → 该 JSON 变化 → Remotion Studio 重新打包 → 预览自动更新，无需手动跑 Python。
import lib from "../../../dancefx/projects.json";

const FPS = 30;

interface RawNode {
  id: string;
  start: number;
  duration: number;
  trackId?: string;
  creative?: { followTarget?: string };
}
interface RawProject {
  name?: string;
  sourceVideo?: string;
  nodes?: RawNode[];
}

/** 取当前工程的原始节点数组（projects.json 优先，回退顶层 project.json 结构） */
function rawNodes(): RawNode[] {
  const l = lib as any;
  if (l?.projects && l.current && l.projects[l.current]?.project?.nodes) {
    return l.projects[l.current].project.nodes as RawNode[];
  }
  if (Array.isArray((l as any)?.nodes)) return (l as any).nodes as RawNode[];
  return [];
}

export interface LiveNode {
  id: string;
  baseFrame: number;
  durationInFrames: number;
  follow: string;
}

/** 由导演器节点派生 Remotion 窗口（秒 → 帧），与效果组件解耦 */
export function liveNodes(): LiveNode[] {
  return rawNodes().map((n) => ({
    id: n.id,
    baseFrame: Math.round(n.start * FPS),
    durationInFrames: Math.max(1, Math.round(n.duration * FPS)),
    follow: n.creative?.followTarget ?? "none",
  }));
}

export const LIVE_FPS = FPS;

// 原视频公共路径（放在此处以避免 windows ↔ effectsRegistry 循环依赖）
export const SF_VIDEO = "dancefx-dance.mp4";
