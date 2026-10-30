#!/usr/bin/env node
// Opus 5.5 视频 prompt 语料检索工具
//
// 用法:
//   node reference/opus5-5/search.mjs three                 # 关键词（匹配 prompt/作者/技术/分类）
//   node reference/opus5-5/search.mjs --tech three          # 按技术栈过滤
//   node reference/opus5-5/search.mjs --category 3d         # 按分类过滤
//   node reference/opus5-5/search.mjs --limit 10            # 限制条数（默认 5）
//   node reference/opus5-5/search.mjs --full                # 显示完整 prompt
//   node reference/opus5-5/search.mjs --list                # 只列出分类与技术统计
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flags = {};
const words = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--full" || a === "--list") flags[a.slice(2)] = true;
  else if (a.startsWith("--")) flags[a.slice(2)] = args[++i];
  else words.push(a);
}
const limit = Number(flags.limit ?? 5);
const keyword = words.join(" ").toLowerCase();

let data;
try {
  data = JSON.parse(readFileSync(join(here, "index.json"), "utf8"));
} catch {
  console.error("缺少 index.json，请先运行: node reference/opus5-5/build-index.mjs");
  process.exit(1);
}

if (flags.list) {
  console.log(`共 ${data.total} 条，含 remake ${data.withRemake} 条\n`);
  console.log("分类:");
  for (const [k, v] of Object.entries(data.byCategory)) console.log(`  ${k} (${v.length})`);
  console.log("\n技术栈:");
  for (const [k, v] of Object.entries(data.byTech)) console.log(`  ${k} (${v.length})`);
  process.exit(0);
}

let hits = data.items;
if (flags.category) hits = hits.filter((v) => v.category === flags.category);
if (flags.tech) hits = hits.filter((v) => v.techTags.includes(flags.tech));
if (keyword) {
  hits = hits.filter((v) =>
    [v.slug, v.author, v.category, v.techTags.join(" "), v.prompt ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(keyword),
  );
}

console.log(`命中 ${hits.length} 条，显示前 ${Math.min(limit, hits.length)} 条\n`);
for (const v of hits.slice(0, limit)) {
  console.log(`─ ${v.slug}  [${v.category}] ${v.techTags.join(",")}${v.partial ? " (prompt 不完整)" : ""}`);
  console.log(`  作者: @${v.author}   ${v.postUrl ?? ""}`);
  const p = (v.prompt ?? "(无 prompt)").replace(/\s+/g, " ").trim();
  console.log(`  ${flags.full ? "prompt" : "prompt 预览"}: ${p.slice(0, flags.full ? 4000 : 220)}${!flags.full && p.length > 220 ? "…" : ""}`);
  console.log(`  文件: reference/opus5-5/prompts/${v.slug}.md\n`);
}
