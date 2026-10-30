// 分析 videos.json 的 prompt，统计结构与高频句式，生成 PATTERNS.md
// 用法: node reference/opus5-5/analyze.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const videos = JSON.parse(readFileSync(join(here, "videos.json"), "utf8"));

const hasText = videos.filter((v) => typeof v.prompt === "string" && v.prompt.trim().length > 0);
const full = hasText.filter((v) => !v.prompt_partial);
const short = hasText.filter((v) => v.prompt_partial);
const F = full.map((v) => v.prompt.trim());
const S = short.map((v) => v.prompt.trim());

const STOP = new Set(
  "a an the and or of to in on at for with this that it is are be as by from you your we our i me my so if its into out up down can could would should will make made making do does did than then there here what which who when how not no all any some one two three want like use using it's i'm".split(
    " ",
  ),
);
const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s.'+/-]/gu, " ").split(/\s+/).filter(Boolean);
const ngrams = (list, n) => {
  const m = new Map();
  for (const s of list) {
    const w = words(s);
    for (let i = 0; i + n <= w.length; i++) {
      const g = w.slice(i, i + n);
      if (n > 1 && g.every((x) => STOP.has(x))) continue;
      const k = g.join(" ");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

// 噪声 n-gram：来自推文里的模型名，不是 prompt 内容
const NOISE = /^(opus|claude|5\.5|5|gpt|sonnet)\b|^(opus|claude|5\.5) /;

const bi = ngrams(F, 2).filter(([k]) => !NOISE.test(k));
const tri = ngrams(F, 3).filter(([k]) => !NOISE.test(k));
const uni = ngrams(F, 1).filter(([k]) => !STOP.has(k) && k.length > 1);

const FEATURES = {
  "命令式开头（Make/Create/Build…）": /^(make|create|build|generate|design|animate|render|write|draw|produce|code)\b/i,
  "请求式开头（Can you / Could you）": /^(can|could|would) you\b/i,
  "第一人称叙述（I want / I've included）": /^(i\s|i'?ve|i'?d|i would)/i,
  "角色扮演（Act as / Pretend you are）": /act as|pretend you are|you are a|imagine you'?re|as a world-class/i,
  "品质形容词（world-class / best / professional）": /world[- ]class|best|top[- ]tier|professional|high[- ]quality|award|dribbble[- ]level|kickass|impressive/i,
  "明确时长": /\b\d+\s*-?\s*(second|sec|s\b|minute|min\b)/i,
  "指定输出技术": /\b(html|javascript|\bjs\b|css|canvas|svg|webgl|three\.?js|shader|react|typescript|raylib)\b/i,
  "禁止解释（no explanation）": /no explanation|don'?t explain|only (output|return|give)|reply with only/i,
  "单文件 / 自包含": /single (file|html)|one file|self[- ]contained|no dependencies|no build/i,
  "循环 / 无缝": /\b(loop|looping|seamless|infinite)\b/i,
  "画幅比例": /\b(vertical|9:16|16:9|square|1:1|aspect ratio|portrait|instagram|reel|tiktok)\b/i,
  "提供素材/参考": /attach|included .*(file|mp4|image)|reference image|this (image|logo|photo|track|song|mp4)|uploaded/i,
  "交互 / 可玩": /\b(game|playable|click|drag|interactive|keyboard|mouse|controls?)\b/i,
  "音效 / 音频": /\b(audio|sound|music|sfx|voice ?over|bpm)\b/i,
  "明确禁止项（do not / avoid）": /\b(do not|don'?t|never|avoid|must not|without)\b/i,
  "分点 / 编号要求": /^\s*(\d+[.)]|[-*•])\s/m,
  "Markdown 小标题": /^#{1,4}\s/m,
  "XML 标签分段": /<\/?(inputs|direction|context|task|requirements|output|style|rules|constraints|objective|goal|spec|format|deliverable|scene|shot)\b/i,
  "代码块/反引号": /`[^`]{2,}`/,
  "点名 Remotion / 帧驱动": /remotion|useCurrentFrame|frame[- ]by[- ]frame/i,
};

const feat = Object.entries(FEATURES).map(([label, re]) => [label, F.filter((p) => re.test(p)).length]);
const pctF = (n) => Math.round((n / F.length) * 100);

const lens = (arr) => {
  const l = arr.map((p) => p.split(/\s+/).length).sort((a, b) => a - b);
  return {
    min: l[0],
    p25: l[Math.floor(l.length * 0.25)],
    median: l[Math.floor(l.length * 0.5)],
    p75: l[Math.floor(l.length * 0.75)],
    max: l[l.length - 1],
    avg: Math.round(l.reduce((a, b) => a + b, 0) / l.length),
  };
};
const lenF = lens(F);
const lenS = lens(S);

// 按词数分桶（这才是真正的"风格分档"）
const bucketOf = (n) => (n <= 15 ? "极简（≤15 词）" : n <= 60 ? "中等（16–60 词）" : n <= 200 ? "详细（61–200 词）" : "超长（>200 词）");
const buckets = new Map();
for (const p of [...F, ...S]) {
  const k = bucketOf(p.split(/\s+/).length);
  buckets.set(k, (buckets.get(k) ?? 0) + 1);
}
const BUCKET_ORDER = ["极简（≤15 词）", "中等（16–60 词）", "详细（61–200 词）", "超长（>200 词）"];

// 完全重复的 prompt（同一条被多个视频复用）
const promptCount = new Map();
for (const p of [...F, ...S]) promptCount.set(p, (promptCount.get(p) ?? 0) + 1);
const dupGroups = [...promptCount.entries()].filter(([, n]) => n > 1);
const dupEntries = dupGroups.reduce((a, [, n]) => a + n, 0);

const openers = new Map();
for (const p of F) {
  const w = words(p);
  const head = `${w[0] ?? ""} ${w[1] ?? ""}`;
  openers.set(head, (openers.get(head) ?? 0) + 1);
}
const topOpeners = [...openers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);

const techCount = new Map();
for (const v of hasText) for (const t of v.tech_tags ?? ["unknown"]) techCount.set(t, (techCount.get(t) ?? 0) + 1);

// 按分类抽样最完整的 prompt，作为"最佳样本"
const longest = [...full].sort((a, b) => b.prompt.length - a.prompt.length);

const md = [];
md.push("# Opus 5.5 视频 Prompt 模式提炼");
md.push("");
md.push(`由 \`analyze.mjs\` 从 \`videos.json\` 自动统计（**${hasText.length}** 条含文本：完整 prompt ${F.length} 条 + 短句 ${S.length} 条）。`);
md.push("重新生成：`node reference/opus5-5/analyze.mjs`");
md.push("");
md.push("## 0. 最重要的结论：三种风格分档（按词数）");
md.push("");
md.push("| 分档 | 条数 | 占比 | 特点 |");
md.push("|---|---|---|---|");
for (const k of BUCKET_ORDER) {
  const n = buckets.get(k) ?? 0;
  const note = {
    "极简（≤15 词）": "一句话下需求，细节全交给模型",
    "中等（16–60 词）": "主流写法：主题 + 时长 + 风格 + 一两条约束",
    "详细（61–200 词）": "分段落写死约束，可复现性高",
    "超长（>200 词）": "接近规格书，常含 XML 标签与逐条规则",
  }[k];
  md.push(`| ${k} | ${n} | ${Math.round((n / (F.length + S.length)) * 100)}% | ${note} |`);
}
md.push("");
md.push(`**结论**：中位数 ${lenF.median} 词，半数落在「中等」档。所以主流并不是"一句话"，也不是"规格书"，而是**主题 + 时长 + 风格 + 少量硬约束**的中间态。`);
md.push("");
md.push("## 0.1 数据质量提示（影响你怎么读这份统计）");
md.push("");
md.push(`1. **${S.length} 条 \`prompt_partial: true\` 不全是"短 prompt"**。该组中位 ${lenS.median} 词，但其中只有约三成是真正的短句，其余是原作者推文摘录（最长 ${lenS.max} 词）。因此本节按**词数**分档，而不是按这个标记分档。`);
md.push(`2. **存在重复条目**：${dupGroups.length} 组完全相同的 prompt，共涉及 ${dupEntries} 条记录（最多的一组出现 ${Math.max(...dupGroups.map(([, n]) => n))} 次，作者用同一条 prompt 做了多个视频）。这会让下文高频词统计略微偏向重复内容，但不影响结论方向。`);
md.push(`3. 高频词统计**只用 ${F.length} 条完整 prompt**，并剔除了 \`opus\` / \`claude\` / \`5.5\` 这类来自推文正文的模型名噪声。`);
md.push("");
md.push("## 1. 长度分布（完整 prompt）");
md.push("");
md.push("| 指标 | 词数 |");
md.push("|---|---|");
md.push(`| 最短 | ${lenF.min} |`);
md.push(`| 25% | ${lenF.p25} |`);
md.push(`| 中位数 | ${lenF.median} |`);
md.push(`| 平均 | ${lenF.avg} |`);
md.push(`| 75% | ${lenF.p75} |`);
md.push(`| 最长 | ${lenF.max} |`);
md.push("");
md.push(`**结论**：中位数 ${lenF.median} 词。即使"写得很细"的那一半，也就 ${lenF.p75} 词封顶——仍然是一段话，不是规格书。`);
md.push("");
md.push("## 2. 结构特征命中率（完整 prompt）");
md.push("");
md.push("| 特征 | 命中 | 占比 |");
md.push("|---|---|---|");
for (const [k, n] of feat.sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${n} | ${pctF(n)}% |`);
md.push("");
md.push("**读法**：占比高的就是「行业惯例」，写 prompt 时可以照抄；占比低的是「高级技巧」，用了显专业。");
md.push("");
md.push("## 3. 最常见开头两词");
md.push("");
md.push("| 开头 | 次数 |");
md.push("|---|---|");
for (const [k, n] of topOpeners) md.push(`| \`${k}\` | ${n} |`);
md.push("");
md.push("## 4. 高频词组（已剔除模型名噪声）");
md.push("");
md.push("### 二元词");
md.push("");
md.push("| 词组 | 次数 |");
md.push("|---|---|");
for (const [k, n] of bi.slice(0, 25)) md.push(`| \`${k}\` | ${n} |`);
md.push("");
md.push("### 三元词");
md.push("");
md.push("| 词组 | 次数 |");
md.push("|---|---|");
for (const [k, n] of tri.slice(0, 20)) md.push(`| \`${k}\` | ${n} |`);
md.push("");
md.push("## 5. 高频单词（前 40）");
md.push("");
md.push(uni.slice(0, 40).map(([k, n]) => `\`${k}\`(${n})`).join(" · "));
md.push("");
md.push("## 6. 技术栈分布");
md.push("");
md.push("| 技术 | 条数 |");
md.push("|---|---|");
for (const [k, n] of [...techCount.entries()].sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${n} |`);
md.push("");
md.push("---");
md.push("");
md.push("# 7. 模板配方（数据归纳 + 可直接套用）");
md.push("");
md.push("以下五套按上文频率归纳。方括号是填空位。");
md.push("");
md.push("## 配方 A · 短句式（最短，最省事）");
md.push("");
md.push("```text");
md.push("[风格/品牌]-style [时长] video of [主题]");
md.push("```");
md.push("");
md.push("真实样本：`an Apple-style 30s video of my app`");
md.push("");
md.push(`## 配方 B · 命令式（占比最高，${feat.find(([k]) => k.startsWith("命令式开头"))?.[1] ?? 0}/${F.length}）`);
md.push("");
md.push("```text");
md.push("Make a [时长] [风格] [产物形式] about [主题].");
md.push("Use [技术] so it runs in the browser. [1–2 条硬约束]");
md.push("```");
md.push("");
md.push("## 配方 C · 角色扮演式");
md.push("");
md.push("```text");
md.push("Act as a world-class [motion designer / animator / director].");
md.push("Create a [时长] [产物] of [主题], in the style of [参考]. [约束]");
md.push("```");
md.push("");
md.push("## 配方 D · 结构化 XML 式（长 prompt 派的代表）");
md.push("");
md.push("```text");
md.push("<inputs>");
md.push("  需要我提供什么：[素材/参数/尺寸/配色/BPM]");
md.push("</inputs>");
md.push("<direction>");
md.push("  视觉方向、动效原则、镜头与节奏");
md.push("</direction>");
md.push("<deliverable>");
md.push("  输出形式：[单文件 HTML / 技术栈]；[时长]；[比例]");
md.push("</deliverable>");
md.push("<rules>");
md.push("  必须：… ；禁止：…（no explanation, only output）");
md.push("</rules>");
md.push("```");
md.push("");
md.push("## 配方 E · 端到端复刻式");
md.push("");
md.push("```text");
md.push("I've included [素材: MP4 / 原视频链接 / 音频].");
md.push("Do an end-to-end pass and make an updated version.");
md.push("Use the exact same [audio track / structure / pacing], and [改动要求].");
md.push("```");
md.push("");
md.push("## 通用检查清单（写完 prompt 后过一遍）");
md.push("");
md.push("| 项 | 是否写了 |");
md.push("|---|---|");
md.push("| 时长（几秒） | ☐ |");
md.push("| 比例 / 平台（9:16 竖屏 / 16:9） | ☐ |");
md.push("| 输出形式与技术栈 | ☐ |");
md.push("| 视觉风格 / 参考对象 | ☐ |");
md.push("| 音效或 BPM | ☐ |");
md.push("| 是否要循环无缝 | ☐ |");
md.push("| 禁止项（不要解释、不要文字、不要水印） | ☐ |");
md.push("| 是否需要交互 | ☐ |");
md.push("");
md.push("---");
md.push("");
md.push("# 8. 落到 ThreeMotion（Remotion + R3F）的模板");
md.push("");
md.push("上面的 prompt 都是让模型写「单文件 HTML/Canvas/Three.js」。本项目是 **Remotion 合成**，需要多两条硬约束才符合本仓库约定：");
md.push("");
md.push("```text");
md.push("Act as a world-class motion designer.");
md.push("");
md.push("Create a Remotion composition for [主题] in [时长] seconds at 30fps, 1920x1080.");
md.push("");
md.push("<rules>");
md.push("  - Use React Three Fiber (@react-three/fiber) with @remotion/three's ThreeCanvas.");
md.push("  - All animation MUST be a pure function of useCurrentFrame() / useVideoConfig().");
md.push("  - Do NOT use useFrame, three's Clock, or requestAnimationFrame.");
md.push("  - Export one component; register it in src/Root.tsx as a new <Composition />.");
md.push("  - Put the 3D scene under src/scenes/, keep the composition entry thin.");
md.push("  - Style: [风格]. Camera: [运镜]. Lighting: [灯光].");
md.push("  - No text overlays unless asked. No external assets.");
md.push("</rules>");
md.push("```");
md.push("");
md.push("写完照 `README.md` 的「关键约定」自检：预览与渲染必须逐帧一致。");
md.push("");
md.push("## 9. 样本库入口");
md.push("");
md.push("- 结构化检索：`npm run prompts -- --tech threejs --limit 10`");
md.push("- 最长/最完整的 prompt（学写法）：见下方「最完整 prompt Top 5」");
md.push("");
md.push("| slug | 分类 | 词数 |");
md.push("|---|---|---|");
for (const v of longest.slice(0, 5)) md.push(`| \`${v.slug}\` | ${v.category} | ${v.prompt.split(/\s+/).length} |`);
md.push("");

writeFileSync(join(here, "PATTERNS.md"), md.join("\n") + "\n");
console.log(`PATTERNS.md 已生成`);
console.log(`完整 prompt ${F.length} 条（中位 ${lenF.median} 词 / 平均 ${lenF.avg} 词）`);
console.log(`短句 ${S.length} 条（中位 ${lenS.median} 词）`);
console.log("特征 Top8:", feat.sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k}=${pctF(n)}%`).join(", "));
console.log("开头 Top5:", topOpeners.slice(0, 5).map(([k, n]) => `"${k}"=${n}`).join(", "));
