import type { Project, FxNode, Creative, AiSection, ReviewStatus } from "./types";

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

/** 用后端已有字段做容错迁移，绝不丢失既有数据 */
export function normalizeProject(raw: any): Project {
  const now = new Date().toISOString();
  const nodes: FxNode[] = Array.isArray(raw?.nodes)
    ? raw.nodes.map((n: any): FxNode => {
        const creative: Creative = {
          description: n?.creative?.description ?? n?.description ?? "",
          followTarget: n?.creative?.followTarget ?? n?.followTarget ?? "none",
          annotations: Array.isArray(n?.creative?.annotations)
            ? n.creative.annotations
            : Array.isArray(n?.annotations)
              ? n.annotations
              : [],
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
