// Opus 5.5 prompt 语料 · 本地阅读/编辑工具（零依赖）
//
// 用法:  npm run prompts:viewer        然后浏览器打开提示的地址
//
// 设计要点:
//  - 只读上游 index.json，用户编辑写入独立的 overrides.json，
//    因此重新同步上游数据不会覆盖你的中文对照。
//  - 除本机 file 读写外不联网；AI 翻译由浏览器直接调用你自己配置的接口。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const baseDir = join(here, ".."); // reference/opus5-5
const OVERRIDES = join(baseDir, "overrides.json");
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function loadOverrides() {
  if (!existsSync(OVERRIDES)) return {};
  try {
    return JSON.parse(readFileSync(OVERRIDES, "utf8"));
  } catch {
    console.error("overrides.json 解析失败，已按空处理（原文件未改动）");
    return {};
  }
}

function saveOverrides(obj) {
  writeFileSync(OVERRIDES, JSON.stringify(obj, null, 2) + "\n");
}

const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => {
      buf += c;
      if (buf.length > 5_000_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // ---- API ----
    if (path === "/api/prompts") {
      const raw = await readFile(join(baseDir, "index.json"), "utf8");
      res.writeHead(200, { "content-type": MIME[".json"] });
      return res.end(raw);
    }

    if (path === "/api/overrides" && req.method === "GET") {
      return json(res, 200, loadOverrides());
    }

    if (path === "/api/overrides" && req.method === "PUT") {
      const body = await readBody(req);
      let incoming;
      try {
        incoming = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "invalid json" });
      }
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return json(res, 400, { error: "expected an object keyed by slug" });
      }
      const current = loadOverrides();
      const next = { ...current, ...incoming };
      // 清掉空条目，避免文件膨胀
      for (const [slug, v] of Object.entries(next)) {
        const en = (v?.en ?? "").trim();
        const zh = (v?.zh ?? "").trim();
        if (!en && !zh) delete next[slug];
      }
      saveOverrides(next);
      return json(res, 200, { ok: true, count: Object.keys(next).length });
    }

    // 导出中英对照 Markdown
    if (path === "/api/export") {
      const idx = JSON.parse(await readFile(join(baseDir, "index.json"), "utf8"));
      const ov = loadOverrides();
      const lines = [
        "# Opus 5.5 视频 prompt · 中英对照",
        "",
        `导出时间：${new Date().toISOString()}`,
        `共 ${idx.items.length} 条，其中已填写中文对照 ${Object.values(ov).filter((v) => (v?.zh ?? "").trim()).length} 条。`,
        "",
      ];
      for (const it of idx.items) {
        const o = ov[it.slug] ?? {};
        lines.push(`## ${it.slug}`);
        lines.push("");
        lines.push(
          `- 分类：${it.category} · 技术：${(it.techTags ?? []).join(", ") || "-"} · 作者：@${it.author}${
            it.partial ? " · prompt 不完整" : ""
          }`,
        );
        if (it.postUrl) lines.push(`- 原推文：${it.postUrl}`);
        lines.push("");
        lines.push("**English**");
        lines.push("");
        lines.push("```text");
        lines.push((o.en ?? it.prompt ?? "").trim());
        lines.push("```");
        lines.push("");
        lines.push("**中文对照**");
        lines.push("");
        lines.push("```text");
        lines.push((o.zh ?? "").trim() || "（未填写）");
        lines.push("```");
        lines.push("");
      }
      const md = lines.join("\n");
      res.writeHead(200, {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": 'attachment; filename="opus55-bilingual.md"',
      });
      return res.end(md);
    }

    // ---- 静态文件 ----
    const rel = path === "/" ? "/index.html" : path;
    const filePath = join(here, normalize(rel).replace(/^(\.\.[/\\])+/, ""));
    if (!filePath.startsWith(here)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
    return res.end(data);
  } catch (err) {
    if (err?.code === "ENOENT") {
      res.writeHead(404);
      return res.end("not found");
    }
    console.error(err);
    res.writeHead(500);
    return res.end("internal error");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  Opus 5.5 prompt 语料 · 本地工具已启动");
  console.log(`  打开: http://127.0.0.1:${PORT}`);
  console.log(`  数据: ${join(baseDir, "index.json")}`);
  console.log(`  编辑保存到: ${OVERRIDES}`);
  console.log("  停止: Ctrl+C");
  console.log("");
});
