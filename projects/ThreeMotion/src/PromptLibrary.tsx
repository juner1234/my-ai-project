import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { filterPrompts, promptStats, type PromptFilter, type PromptItem } from "./data/opus55";

/**
 * PromptLibrary —— 在 Remotion Studio 里直接翻阅 Opus 5.5 视频 prompt 语料。
 *
 * 设计约定（与项目 README 一致）：所有动画都是当前帧的纯函数，
 * 不使用 requestAnimationFrame / three 时钟，因此预览与渲染逐帧一致。
 *
 * 用法：
 *  1) Studio 左侧选中 `PromptLibrary`，右侧 props 面板改 tech / category / query 即时筛选。
 *  2) 命令行渲染带筛选的版本：
 *       npx remotion render PromptLibrary out/prompts-threejs.mp4 \
 *         --props='{"tech":"threejs","onlyComplete":true}'
 */

export type PromptLibraryProps = PromptFilter & {
  /** 每页显示条数（4 条可完整放入 1080p 一屏） */
  pageSize: number;
  /** 每页停留秒数 */
  secondsPerPage: number;
  /** 标题行文字 */
  title: string;
};

export const defaultPromptLibraryProps: PromptLibraryProps = {
  tech: null,
  category: null,
  query: "",
  onlyComplete: true,
  pageSize: 4,
  secondsPerPage: 6,
  title: "Opus 5.5 视频 prompt 语料",
};

export const computePromptLibraryDuration = (props: PromptLibraryProps): number => {
  const items = filterPrompts(props);
  const pages = Math.max(1, Math.ceil(items.length / Math.max(1, props.pageSize)));
  return Math.max(1, Math.round(pages * props.secondsPerPage * 30));
};

const FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif';
const MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';

const CATEGORY_COLOR: Record<string, string> = {
  motion: "#4f9cf9",
  "3d": "#a06bff",
  explainer: "#3ddc97",
  interactive: "#ffb454",
};

const Badge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span
    style={{
      fontSize: 18,
      lineHeight: 1,
      padding: "5px 11px",
      borderRadius: 999,
      color,
      border: `1.5px solid ${color}55`,
      background: `${color}14`,
      fontFamily: MONO,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

const PromptRow: React.FC<{
  item: PromptItem;
  index: number;
  localFrame: number;
  appearAt: number;
}> = ({ item, index, localFrame, appearAt }) => {
  const { fps } = useVideoConfig();

  // 逐行入场：纯帧函数
  const progress = spring({
    frame: localFrame - appearAt,
    fps,
    config: { damping: 200, mass: 0.6 },
    durationInFrames: 16,
  });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [18, 0]);

  const color = CATEGORY_COLOR[item.category] ?? "#8b9bb4";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        flexShrink: 0,
        display: "flex",
        gap: 20,
        padding: "18px 24px",
        borderRadius: 14,
        background: "#141a2e",
        border: "1.5px solid #1f2740",
      }}
    >
      {/* 序号 */}
      <div style={{ minWidth: 66, fontSize: 30, fontWeight: 700, color: "#39415a", fontFamily: MONO }}>
        {String(index + 1).padStart(3, "0")}
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 元信息行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "nowrap" }}>
          <Badge text={item.category} color={color} />
          {item.techTags.slice(0, 3).map((t) => (
            <Badge key={t} text={t} color="#6c7a96" />
          ))}
          {item.partial ? <Badge text="不完整" color="#ff6b6b" /> : null}
          <span style={{ fontSize: 19, color: "#5d6a84", fontFamily: MONO, whiteSpace: "nowrap" }}>
            @{item.author}
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 17,
              color: "#39415a",
              fontFamily: MONO,
              whiteSpace: "nowrap",
            }}
          >
            prompts/{item.slug}.md
          </span>
        </div>

        {/* prompt 正文，最多 2 行 */}
        <div
          style={{
            fontSize: 25,
            lineHeight: 1.4,
            color: "#c8d3e6",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.prompt ?? "(无 prompt)"}
        </div>
      </div>
    </div>
  );
};

export const PromptLibrary: React.FC<PromptLibraryProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const items = filterPrompts(props);
  const pageSize = Math.max(1, props.pageSize);
  const framesPerPage = Math.max(1, Math.round(props.secondsPerPage * fps));
  const pages = Math.max(1, Math.ceil(items.length / pageSize));

  const pageIndex = Math.min(pages - 1, Math.floor(frame / framesPerPage));
  const frameInPage = frame - pageIndex * framesPerPage;
  const pageItems = items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  // 首页直接展示（Studio 打开时停在 frame 0，否则会是空白）；翻页时才播入场动画
  const localFrame = pageIndex === 0 ? frameInPage + 40 : frameInPage;

  const filterLabel = [
    props.tech ? `tech=${props.tech}` : null,
    props.category ? `category=${props.category}` : null,
    props.query ? `query="${props.query}"` : null,
    props.onlyComplete ? "仅完整 prompt" : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1020", fontFamily: FONT, padding: 56 }}>
      {/* 顶部标题 */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#e8eefc" }}>{props.title}</div>
          <div style={{ fontSize: 25, color: "#4f9cf9", fontFamily: MONO }}>
            {items.length} / {promptStats.total} 条
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 21, color: "#5d6a84", fontFamily: MONO, minHeight: 26 }}>
          {filterLabel || "无筛选（全部语料）"}
        </div>
      </div>

      {/* 列表：固定高度，超出裁掉，保证底栏始终可见 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {pageItems.map((item, i) => (
          <PromptRow
            key={item.slug}
            item={item}
            index={pageIndex * pageSize + i}
            localFrame={localFrame}
            appearAt={i * 5}
          />
        ))}
        {items.length === 0 ? (
          <div style={{ fontSize: 28, color: "#5d6a84", padding: 40 }}>没有匹配的 prompt，改一下筛选条件。</div>
        ) : null}
      </div>

      {/* 底部：页码 + 进度条 */}
      <div style={{ marginTop: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, color: "#5d6a84", fontFamily: MONO }}>
          <span>
            页 {pageIndex + 1} / {pages}
          </span>
          <span>
            每页 {pageSize} 条 · 每页 {props.secondsPerPage}s · {fps}fps · {width}×{height}
          </span>
        </div>
        <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: "#1f2740", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${((frame + 1) / durationInFrames) * 100}%`,
              background: "#4f9cf9",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
