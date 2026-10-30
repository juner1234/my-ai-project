// DanceFX 可视化导演台 V0.1 - 数据结构
// 用户创意与 AI 实现严格分离：creative.* 只能由用户修改。

export type FollowTarget =
  | "none"
  | "left_wrist"
  | "right_wrist"
  | "left_elbow"
  | "right_elbow"
  | "head"
  | "body_center";

// 与 MediaPipe Pose 33 关键点命名对应
export const FOLLOW_TARGETS: { value: FollowTarget; label: string; landmarks: number[] }[] = [
  { value: "none", label: "无", landmarks: [] },
  { value: "left_wrist", label: "左手腕", landmarks: [15] },
  { value: "right_wrist", label: "右手腕", landmarks: [16] },
  { value: "left_elbow", label: "左手肘", landmarks: [13] },
  { value: "right_elbow", label: "右手肘", landmarks: [14] },
  { value: "head", label: "头部", landmarks: [0, 7, 8] },
  { value: "body_center", label: "身体中心", landmarks: [11, 12, 23, 24] },
];

export type AnnotationTool = "pen" | "arrow" | "ellipse";

export interface Point {
  x: number; // 归一化 0..1
  y: number;
}

// 手绘标注：只属于创意说明，永不进入最终渲染
export interface Annotation {
  id: string;
  nodeId: string; // 所属节点（显式外键；与嵌套存储并存，导出/往返时以它为准）
  tool: AnnotationTool;
  points: Point[]; // pen: 连续点; arrow/ellipse: 首尾两点（全部为相对视频实际画面的 0..1 归一化坐标）
  color: string;
  width: number; // 归一化线宽
  createdAt: string;
  // 时间信息（start/end/duration/trackId）不再存于标注上：单一事实源为所属节点，
  // 需要时由 nodeId 指向的节点派生（见 src/annotations.ts）。
  followTarget: FollowTarget; // 关联对象（视频中的人物部位等）
  description: string; // 该标注的创意描述
}

// 版本：独立保存，锁定后不可覆盖
export interface FxVersion {
  id: string; // V1, V2...
  createdAt: string;
  note: string;
  locked: boolean;
  previewFrame: number | null; // 预留：动画预览帧，本阶段为 null
}

// AI 对创意的修改建议：未经批准不得覆盖 creative
export interface AiProposal {
  id: string;
  // description / followTarget：节点级创意；annotation_description：某条标注的描述
  field: "description" | "followTarget" | "annotation_description";
  annotationId?: string; // field = annotation_description 时，指向对应标注
  proposedValue: string;
  reason: string;
  status: "pending" | "accepted" | "rejected" | "edited_accepted";
  editedValue?: string; // 编辑后接受时保存
  createdAt: string;
}

export interface Creative {
  description: string; // 用户创意描述（原始记录）
  followTarget: FollowTarget;
  annotations: Annotation[];
  updatedAt: string;
}

export interface AiSection {
  designProposal: string; // AI 设计方案（暂为空，未接入 API）
  versions: FxVersion[];
  adoptedVersionId: string | null; // 当前采用版本
  proposals: AiProposal[]; // 对创意的修改建议
}

export type ReviewStatus = "draft" | "submitted" | "approved" | "rejected";

export interface FxNode {
  id: string; // FX-001
  start: number; // 秒
  duration: number; // 秒
  trackId: string; // 所属轨道（V0.3 新增，兼容旧数据默认 "T1"）
  creative: Creative; // 用户创意（权威）
  ai: AiSection; // AI 实现（隔离）
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  name: string;
  version: string;
  sourceVideo: string;
  nextNodeId: number;
  nodes: FxNode[];
  tracks: string[]; // 轨道 ID 列表（V0.3 新增，兼容旧数据默认 ["T1"]）
  ui: {
    selectedNodeId: string | null;
    lastTime: number;
  };
  updatedAt: string;
}

// ---- Phase 4：以视频为单位的工程库 ----
// key = 视频内容指纹（见 src/videoId.ts）；label 仅用于展示，不作身份依据。
export interface LibraryEntry {
  key: string;
  label: string; // 展示名（如原文件名），不参与身份判定
  sourcePath: string; // 服务端可寻址路径；本地导入为空，刷新后需重新导入以恢复
  project: Project;
  updatedAt: string;
}

export interface Library {
  version: number;
  current: string | null;
  projects: Record<string, LibraryEntry>;
}

/** 某视频尚无编辑数据时的空白工程（默认轨道 T1/T2，节点为空） */
export function blankProject(label: string): Project {
  const now = new Date().toISOString();
  return {
    name: label ? `DanceFX · ${label}` : "DanceFX",
    version: "0.1.0",
    sourceVideo: label,
    nextNodeId: 1,
    nodes: [],
    tracks: ["T1", "T2"],
    ui: { selectedNodeId: null, lastTime: 0 },
    updatedAt: now,
  };
}

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  draft: "草稿",
  submitted: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

export function makeNodeId(n: number): string {
  return `FX-${String(n).padStart(3, "0")}`;
}

export function newVersionId(versions: FxVersion[]): string {
  return `V${versions.length + 1}`;
}
