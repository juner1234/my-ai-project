import { useState } from "react";
import type { FxNode, FollowTarget, AiProposal } from "../types";
import { FOLLOW_TARGETS, REVIEW_LABELS, newVersionId } from "../types";
import { fmtTimecode, parseTimecode } from "../timecode";

interface Props {
  node: FxNode | null;
  duration: number;
  tracks: string[];
  onUpdate: (id: string, patch: Partial<FxNode>) => void;
  onDelete: (id: string) => void;
}

/** 时间输入：接受 00:00:06.500 或秒数，失焦/回车提交 */
function TimeField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(fmtTimecode(value));
  const [focused, setFocused] = useState(false);
  const commit = () => {
    const p = parseTimecode(text);
    if (p === null || p < 0) {
      setText(fmtTimecode(value));
      return;
    }
    onCommit(Math.round(p * 1000) / 1000);
  };
  return (
    <label className="field half">
      <span>{label}</span>
      <input
        value={focused ? text : fmtTimecode(value)}
        onFocus={() => {
          setFocused(true);
          setText(fmtTimecode(value));
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

export default function NodePanel({ node, duration, tracks, onUpdate, onDelete }: Props) {
  if (!node) {
    return (
      <div className="workbench empty">
        <span className="dim">
          未选中节点 · 点击时间轴上的 FX 块，或按「＋ 添加 FX 节点」在当前时间创建
        </span>
      </div>
    );
  }

  const end = node.start + node.duration;
  const patchCreative = (p: Partial<FxNode["creative"]>) =>
    onUpdate(node.id, {
      creative: { ...node.creative, ...p, updatedAt: new Date().toISOString() },
    });
  const patchAi = (p: Partial<FxNode["ai"]>) => onUpdate(node.id, { ai: { ...node.ai, ...p } });

  const addVersion = () => {
    const v = {
      id: newVersionId(node.ai.versions),
      createdAt: new Date().toISOString(),
      note: "",
      locked: false,
      previewFrame: null,
    };
    patchAi({ versions: [...node.ai.versions, v] });
  };
  const patchVersion = (vid: string, p: Partial<(typeof node.ai.versions)[number]>) =>
    patchAi({ versions: node.ai.versions.map((v) => (v.id === vid ? { ...v, ...p } : v)) });

  const acceptProposal = (p: AiProposal) => {
    const val = p.editedValue ?? p.proposedValue;
    if (p.field === "description") patchCreative({ description: val });
    else patchCreative({ followTarget: val as FollowTarget });
    patchAi({
      proposals: node.ai.proposals.map((x) =>
        x.id === p.id ? { ...x, status: p.editedValue ? "edited_accepted" : "accepted" } : x,
      ),
    });
  };
  const rejectProposal = (p: AiProposal) =>
    patchAi({
      proposals: node.ai.proposals.map((x) => (x.id === p.id ? { ...x, status: "rejected" } : x)),
    });

  return (
    <div className="workbench">
      <div className="wb-col wb-main">
        <div className="wb-head">
          <span className="wb-id">{node.id}</span>
          <TimeField
            label="开始"
            value={node.start}
            onCommit={(v) =>
              onUpdate(node.id, { start: v, duration: Math.max(0.1, end - v) })
            }
          />
          <TimeField
            label="结束"
            value={end}
            onCommit={(v) =>
              onUpdate(node.id, {
                duration: Math.max(0.1, v - node.start),
              })
            }
          />
          <TimeField
            label="持续"
            value={node.duration}
            onCommit={(v) => onUpdate(node.id, { duration: Math.max(0.1, v) })}
          />
          <label className="field half">
            <span>轨道</span>
            <select
              value={node.trackId}
              onChange={(e) => onUpdate(node.id, { trackId: e.target.value })}
            >
              {tracks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field half">
            <span>跟随对象</span>
            <select
              value={node.creative.followTarget}
              onChange={(e) => patchCreative({ followTarget: e.target.value as FollowTarget })}
            >
              {FOLLOW_TARGETS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field half">
            <span>审核状态</span>
            <select
              value={node.reviewStatus}
              onChange={(e) => onUpdate(node.id, { reviewStatus: e.target.value as FxNode["reviewStatus"] })}
            >
              {(Object.keys(REVIEW_LABELS) as FxNode["reviewStatus"][]).map((s) => (
                <option key={s} value={s}>
                  {REVIEW_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="wb-desc">
          <span className="field-label">创意描述</span>
          <textarea
            rows={3}
            value={node.creative.description}
            placeholder="例如：人物右手挥出时，出现蓝色发光丝带，沿我绘制的轨迹运动，最后逐渐消散。"
            onChange={(e) => patchCreative({ description: e.target.value })}
          />
        </div>

        <div className="wb-toolbar">
          <span className="small dim">
            标注 {node.creative.annotations.length} 条 · 在左侧画面绘制（仅创意说明，不进成片）
          </span>
          <button className="danger" onClick={() => onDelete(node.id)}>
            删除节点
          </button>
        </div>
      </div>

      <div className="wb-col wb-side">
        <h3>AI 实现（隔离区）</h3>
        <textarea
          rows={2}
          value={node.ai.designProposal}
          placeholder="未接入 AI API。AI 输出写在这里，不会自动覆盖上方创意。"
          onChange={(e) => patchAi({ designProposal: e.target.value })}
        />
        {node.ai.proposals.length > 0 && (
          <div className="proposals">
            {node.ai.proposals.map((p) => (
              <div key={p.id} className="proposal">
                <div className="small dim">
                  {p.field === "description" ? "创意描述" : "跟随对象"} · {p.status}
                </div>
                <div className="small">建议：{p.proposedValue}</div>
                {p.status === "pending" && (
                  <div className="row">
                    <button onClick={() => acceptProposal(p)}>接受</button>
                    <button onClick={() => rejectProposal(p)}>拒绝</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <h3>动画版本</h3>
        <div className="versions">
          {node.ai.versions.length === 0 && <span className="dim small">尚无版本</span>}
          {node.ai.versions.map((v) => (
            <div key={v.id} className={`version ${v.id === node.ai.adoptedVersionId ? "adopted" : ""}`}>
              <div className="row">
                <strong>{v.id}</strong>
                {v.id === node.ai.adoptedVersionId && <span className="badge">当前采用</span>}
                {v.locked && <span className="badge locked">已锁定</span>}
              </div>
              <input
                placeholder="版本备注"
                value={v.note}
                disabled={v.locked}
                onChange={(e) => patchVersion(v.id, { note: e.target.value })}
              />
              <div className="row">
                <button disabled={v.locked} onClick={() => patchAi({ adoptedVersionId: v.id })}>
                  设为当前
                </button>
                <button
                  disabled={v.locked}
                  onClick={() => {
                    if (window.confirm(`锁定 ${v.id}？锁定后不可编辑。`)) patchVersion(v.id, { locked: true });
                  }}
                >
                  锁定
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addVersion}>＋ 新建版本</button>
        <span className="small dim">历史版本永久保留 · 本阶段不生成真实动画</span>
      </div>
    </div>
  );
}
