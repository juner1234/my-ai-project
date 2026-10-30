// 由 videos.json 生成 index.json（按 category 与 tech 分组）
// 用法: node reference/opus5-5/build-index.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const videos = JSON.parse(readFileSync(join(here, "videos.json"), "utf8"));

function group(list, keyFn) {
  const out = {};
  for (const v of list) {
    for (const k of keyFn(v)) {
      (out[k] ??= []).push(v.slug);
    }
  }
  for (const k of Object.keys(out)) out[k].sort();
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const index = {
  source: "yihui-dev/awesome-opus5-5-videos",
  generatedFrom: "videos.json",
  total: videos.length,
  withRemake: videos.filter((v) => v.has_remake).length,
  partialPrompt: videos.filter((v) => v.prompt_partial).length,
  byCategory: group(videos, (v) => [v.category ?? "unknown"]),
  byTech: group(videos, (v) => (v.tech_tags?.length ? v.tech_tags : ["unknown"])),
  items: videos.map((v) => ({
    slug: v.slug,
    author: v.author,
    category: v.category,
    techTags: v.tech_tags ?? [],
    partial: !!v.prompt_partial,
    hasRemake: !!v.has_remake,
    added: v.added,
    postUrl: v.post_url,
    posterUrl: v.poster_url,
    skillryUrl: v.skillry_url,
    prompt: v.prompt,
  })),
};

writeFileSync(join(here, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(
  `index.json 已生成: ${index.total} 条 (remake ${index.withRemake}, 部分 prompt ${index.partialPrompt})`,
);
console.log("分类:", Object.keys(index.byCategory).join(", "));
console.log("技术:", Object.keys(index.byTech).join(", "));
