import type { Project, FxNode, Creative, AiSection, ReviewStatus, Annotation, AnnotationTool, FollowTarget } from "./types";

const API = "/api/project";

export async function loadProject(): Promise<Project | null> {
  const res = await fetch(API, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`读取 project.json 失败: ${res.status}`);
  return (await res.json()) as Project;
}

export async function saveProject(p: Project): Promise<void> {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`保存 project.json 失败: ${res.status}`);
}

/** 单条标注迁移：补齐结构化字段，绝不丢失既有笔迹 */
function migrateAnnotation(a: any, node: any, now: string): Annotation {
  const start = Number(node?.start ?? 0);
  const duration = Number(node?.duration ?? 0);
  const points = Array.isArray(a?.points)
    ? a.points
        .filter((p: any) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p: any) => ({ x: Number(p.x), y: Number(p.y) }))
    : [];
  return {
    id: typeof a?.id === "string" ? a.id : `ann-${Math.random().toString(36).slice(2, 10)}`,
    tool: (a?.tool ?? "pen") as AnnotationTool,
    points,
    color: typeof a?.color === "string" ? a.color : "#ff4d6d",
    width: Number(a?.width ?? 0.004),
    createdAt: a?.createdAt ?? now,
    start: Number(a?.start ?? start),
    end: Number(a?.end ?? start + duration),
    duration: Number(a?.duration ?? duration),
    trackId: typeof a?.trackId === "string" ? a.trackId : node?.trackId ?? "T1",
    followTarget: (a?.followTarget ?? "none") as FollowTarget,
    description: typeof a?.description === "string" ? a.description : "",
  };
}

/** 用后端已有字段做容错迁移，绝不丢失既有数据 */
export function normalizeProject(raw: any): Project {
  const now = new Date().toISOString();
  const nodes: FxNode[] = Array.isArray(raw?.nodes)
    ? raw.nodes.map((n: any): FxNode => {
        const creative: Creative = {
          description: n?.creative?.description ?? n?.description ?? "",
          followTarget: n?.creative?.followTarget ?? n?.followTarget ?? "none",
          annotations: (Array.isArray(n?.creative?.annotations)
            ? n.creative.annotations
            : Array.isArray(n?.annotations)
              ? n.annotations
              : []
          ).map((a: any) => migrateAnnotation(a, n, now)),
          updatedAt: n?.creative?.updatedAt ?? n?.updatedAt ?? now,
        };
        const ai: AiSection = {
          designProposal: n?.ai?.designProposal ?? "",
          versions: Array.isArray(n?.ai?.versions) ? n.ai.versions : [],
          adoptedVersionId: n?.ai?.adoptedVersionId ?? null,
          proposals: Array.isArray(n?.ai?.proposals) ? n.ai.proposals : [],
        };
        return {
          id: typeof n?.id === "string" ? n.id : `FX-?`,
          start: Number(n?.start ?? 0),
          duration: Number(n?.duration ?? 1),
          trackId: typeof n?.trackId === "string" ? n.trackId : "T1",
          creative,
          ai,
          reviewStatus: (n?.reviewStatus ?? "draft") as ReviewStatus,
          createdAt: n?.createdAt ?? now,
          updatedAt: n?.updatedAt ?? now,
        };
      })
    : [];

  const maxNum = nodes.reduce((m, n) => {
    const m2 = /FX-(\d+)/.exec(n.id);
    return m2 ? Math.max(m, Number(m2[1])) : m;
  }, 0);

  // 轨道迁移：旧数据没有 tracks / trackId，统一落到 T1
  let tracks: string[] = Array.isArray(raw?.tracks) && raw.tracks.length
    ? raw.tracks.map((t: any) => String(t))
    : ["T1"];
  for (const n of nodes) {
    if (!tracks.includes(n.trackId)) tracks.push(n.trackId);
  }

  return {
    name: raw?.name ?? "DanceFX",
    version: raw?.version ?? "0.1.0",
    sourceVideo: raw?.sourceVideo ?? "input/dance.MP4",
    nextNodeId: Math.max(Number(raw?.nextNodeId ?? 1), maxNum + 1),
    nodes,
    tracks,
    ui: {
      selectedNodeId: raw?.ui?.selectedNodeId ?? null,
      lastTime: Number(raw?.ui?.lastTime ?? 0),
    },
    updatedAt: raw?.updatedAt ?? now,
  };
}

const AI_BRIEF = "/api/ai/brief";
const AI_RESULT = "/api/ai/result";

/** 导出简报：由本地服务写入 ai-brief.json（与 project.json 并列），返回文件名 */
export async function exportBrief(brief: unknown): Promise<string> {
  const res = await fetch(AI_BRIEF, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  });
  if (!res.ok) throw new Error(`写出 ai-brief.json 失败: ${res.status}`);
  const data = (await res.json()) as { path?: string };
  return data?.path ?? "ai-brief.json";
}

/** 读取 ai-result.json（AI 回填结果）；文件不存在时返回 null */
export async function loadAiResult(): Promise<unknown | null> {
  const res = await fetch(AI_RESULT, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`读取 ai-result.json 失败: ${res.status}`);
  return await res.json();
}
