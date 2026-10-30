import index from "../../reference/opus5-5/index.json";

/**
 * Opus 5.5 视频 prompt 语料（来自 reference/opus5-5/index.json）。
 *
 * 该文件由 `npm run prompts:index` 生成，包含：
 *  - items: 703 条记录（slug / 作者 / 分类 / 技术栈 / prompt 全文 / 原推文链接）
 *  - byCategory / byTech: 分组索引
 *
 * 这里只做「读取 + 归一化 + 过滤」，不复制数据，保持单一数据源。
 */
export type PromptItem = (typeof index)["items"][number];

export const promptItems: PromptItem[] = index.items as PromptItem[];

export const promptStats = {
  total: index.total,
  withRemake: index.withRemake,
  partialPrompt: index.partialPrompt,
  categories: Object.entries(index.byCategory).map(([name, slugs]) => ({ name, count: slugs.length })),
  techs: Object.entries(index.byTech).map(([name, slugs]) => ({ name, count: slugs.length })),
};

const norm = (s: string) => s.toLowerCase();

export const matchesQuery = (item: PromptItem, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.slug, item.author, item.category, item.techTags.join(" "), item.prompt ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(q);
};

export type PromptFilter = {
  tech: string | null;
  category: string | null;
  query: string;
  onlyComplete: boolean;
};

export const filterPrompts = (filter: PromptFilter): PromptItem[] =>
  promptItems.filter((item) => {
    if (filter.tech && !item.techTags.some((t) => norm(t) === norm(filter.tech!))) return false;
    if (filter.category && norm(item.category) !== norm(filter.category)) return false;
    if (filter.onlyComplete && item.partial) return false;
    return matchesQuery(item, filter.query);
  });

export const uniqueTechs = Array.from(new Set(promptItems.flatMap((i) => i.techTags))).sort();
export const uniqueCategories = Array.from(new Set(promptItems.map((i) => i.category))).sort();
