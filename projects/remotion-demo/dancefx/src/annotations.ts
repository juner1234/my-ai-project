import type { Annotation, FxNode, Project } from "./types";

/** 节点在时刻 t 是否处于有效时间范围（含端点） */
export function isNodeActiveAt(node: FxNode, time: number): boolean {
  return time >= node.start && time <= node.start + node.duration;
}

/** 时刻 t 应显示的标注：可见性只由时间与各节点时间范围决定（与选中无关） */
export function visibleAnnotationsAt(project: Project, time: number): Annotation[] {
  const out: Annotation[] = [];
  for (const n of project.nodes) {
    if (!isNodeActiveAt(n, time)) continue;
    for (const a of n.creative.annotations) out.push(a);
  }
  return out;
}

/** 时刻 t 可编辑的节点：只由「选中节点 + 其时间范围」决定（与可见性分离） */
export function editableNodeIdAt(project: Project, time: number): string | null {
  const id = project.ui.selectedNodeId;
  if (!id) return null;
  const n = project.nodes.find((x) => x.id === id);
  return n && isNodeActiveAt(n, time) ? n.id : null;
}
