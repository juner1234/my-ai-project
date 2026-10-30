import type { AiProposal, FollowTarget, FxNode, Project } from "./types";
import { FOLLOW_TARGETS, newVersionId } from "./types";

// ---- 交给 AI 的简报 / AI 回填结果（独立文件，与 project.json 并列）----
export interface AiBriefAnnotation {
  id: string;
  tool: string;
  description: string;
  followTarget: FollowTarget;
  points: { x: number; y: number }[];
}
export interface AiBriefNode {
  id: string;
  start: number;
  duration: number;
  trackId: string;
  description: string;
  followTarget: FollowTarget;
  followTargetLabel: string;
  annotations: AiBriefAnnotation[];
}

export interface AiBrief {
  kind: "dancefx-ai-brief";
  version: number;
  generatedAt: string;
  sourceVideo: string;
  instructions: string;
  nodes: AiBriefNode[];
}
export interface AiResultNode {
  id: string;
  description?: string;
  followTarget?: FollowTarget;
  reason?: string;
  designProposal?: string;
  annotations?: { id: string; description?: string }[];
}

export interface AiResult {
  kind?: string;
  version?: number;
  generatedAt?: string;
  nodes: AiResultNode[];
}

export interface ApplySummary {
  nodes: number;
  proposals: number;
}
const targetLabel = (t: FollowTarget) =>
  FOLLOW_TARGETS.find((f) => f.value === t)?.label ?? t;

/** 把当前工程整理成可交给 AI 的简报（只读快照，不改动 project） */
export function buildBrief(project: Project): AiBrief {
  const round = (p: { x: number; y: number }) => ({
    x: Number(p.x.toFixed(3)),
    y: Number(p.y.toFixed(3)),
  });
  return {
    kind: "dancefx-ai-brief",
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceVideo: project.sourceVideo,
    instructions:
      "请为每个节点补全 description（创意描述）与 followTarget（跟随对象），并可为每条标注补写 description。" +
      "followTarget 取值：" +
      FOLLOW_TARGETS.map((f) => `${f.value}(${f.label})`).join("、") +
      "。回填文件请用 kind=dancefx-ai-result，nodes[].id 必须与简报一致，只填需要修改的字段。",
    nodes: project.nodes.map((n) => ({
      id: n.id,
      start: Number(n.start.toFixed(3)),
      duration: Number(n.duration.toFixed(3)),
      trackId: n.trackId,
      description: n.creative.description,
      followTarget: n.creative.followTarget,
      followTargetLabel: targetLabel(n.creative.followTarget),
      annotations: n.creative.annotations.map((a) => ({
        id: a.id,
        tool: a.tool,
        description: a.description,
        followTarget: a.followTarget,
        points: a.points.map(round),
      })),
    })),
  };
}
const VALID_TARGETS = new Set<string>(FOLLOW_TARGETS.map((f) => f.value));
let seq = 0;
const proposalId = () => `prop-${Date.now()}-${seq++}`;

/** 从一个 AI 结果节点收集「待审建议」（只收集与现状不同的项） */
function collectProposals(n: FxNode, r: AiResultNode, now: string): AiProposal[] {
  const out: AiProposal[] = [];
  if (
    typeof r.description === "string" &&
    r.description.trim() &&
    r.description !== n.creative.description
  ) {
    out.push({
      id: proposalId(),
      field: "description",
      proposedValue: r.description,
      reason: r.reason ?? "",
      status: "pending",
      createdAt: now,
    });
  }
  if (
    typeof r.followTarget === "string" &&
    r.followTarget !== n.creative.followTarget &&
    VALID_TARGETS.has(r.followTarget)
  ) {
    out.push({
      id: proposalId(),
      field: "followTarget",
      proposedValue: r.followTarget,
      reason: r.reason ?? "",
      status: "pending",
      createdAt: now,
    });
  }
  if (Array.isArray(r.annotations)) {
    for (const ar of r.annotations) {
      if (!ar || typeof ar.id !== "string" || typeof ar.description !== "string") continue;
      const ann = n.creative.annotations.find((a) => a.id === ar.id);
      if (!ann || !ar.description.trim() || ar.description === ann.description) continue;
      out.push({
        id: proposalId(),
        field: "annotation_description",
        annotationId: ar.id,
        proposedValue: ar.description,
        reason: "",
        status: "pending",
        createdAt: now,
      });
    }
  }
  return out;
}
/**
 * 把 AI 回填结果转为「待审建议」，绝不直接覆盖 creative。
 * 节点级 description / followTarget、标注级 description 都变为 proposals；
 * designProposal 属 AI 隔离区，可直接写入；每次导入追加一个锁定版本。
 */
export function applyResult(
  project: Project,
  result: AiResult,
): { project: Project; summary: ApplySummary } {
  if (!result || !Array.isArray(result.nodes)) {
    return { project, summary: { nodes: 0, proposals: 0 } };
  }
  const now = new Date().toISOString();
  let nodeCount = 0;
  let proposalCount = 0;

  const nodes = project.nodes.map((n) => {
    const r = result.nodes.find((x) => x && x.id === n.id);
    if (!r) return n;
    const fresh = collectProposals(n, r, now);
    const hasDesign = typeof r.designProposal === "string" && !!r.designProposal.trim();
    if (fresh.length === 0 && !hasDesign) return n;
    nodeCount += 1;
    proposalCount += fresh.length;
    // 同一目标的旧「待审」建议被本次覆盖，避免重复导入堆积（已接受/已拒绝的历史保留）
    const keys = new Set(fresh.map((p) => `${p.field}:${p.annotationId ?? ""}`));
    const kept = n.ai.proposals.filter(
      (p) => !(p.status === "pending" && keys.has(`${p.field}:${p.annotationId ?? ""}`)),
    );
    const version = {
      id: newVersionId(n.ai.versions),
      createdAt: now,
      note: `AI 导入 · ${fresh.length} 条建议${hasDesign ? " · 含设计方案" : ""}`,
      locked: true,
      previewFrame: null,
    };
    return {
      ...n,
      ai: {
        ...n.ai,
        designProposal: hasDesign ? r.designProposal! : n.ai.designProposal,
        proposals: [...kept, ...fresh],
        versions: [...n.ai.versions, version],
      },
      updatedAt: now,
    };
  });

  return {
    project: { ...project, nodes, updatedAt: now },
    summary: { nodes: nodeCount, proposals: proposalCount },
  };
}
