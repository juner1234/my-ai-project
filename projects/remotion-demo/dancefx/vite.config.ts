import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_FILE = path.join(ROOT, "project.json");
const LIBRARY_FILE = path.join(ROOT, "projects.json");
const BRIEF_FILE = path.join(ROOT, "ai-brief.json");
const RESULT_FILE = path.join(ROOT, "ai-result.json");

/** 原子写：先写临时文件再 rename，避免半截文件 */
function writeAtomic(file: string, data: unknown) {
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

/**
 * Local read/write API for project.json.
 *  GET  /api/project  -> current project data (never touches motion.json)
 *  POST /api/project  -> atomic save (tmp file + rename)
 */
function projectApi(): Plugin {
  return {
    name: "dancefx-project-api",
    configureServer(server) {
      server.middlewares.use("/api/project", (req, res) => {
        const send = (code: number, obj: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(obj));
        };
        if (req.method === "GET") {
          try {
            if (!fs.existsSync(PROJECT_FILE)) {
              return send(404, { error: "project.json not found" });
            }
            const raw = fs.readFileSync(PROJECT_FILE, "utf8");
            send(200, JSON.parse(raw));
          } catch (e) {
            send(500, { error: String(e) });
          }
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              if (
                !data ||
                typeof data !== "object" ||
                !Array.isArray(data.nodes) ||
                typeof data.sourceVideo !== "string"
              ) {
                return send(400, { error: "invalid project shape" });
              }
              const tmp = PROJECT_FILE + ".tmp";
              fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
              fs.renameSync(tmp, PROJECT_FILE);
              send(200, { ok: true });
            } catch (e) {
              send(400, { error: String(e) });
            }
          });
          return;
        }
        send(405, { error: "method not allowed" });
      });
    },
  };
}

function libraryApi(): Plugin {
  return {
    name: "dancefx-library-api",
    configureServer(server) {
      server.middlewares.use("/api/library", (req, res) => {
        const send = (code: number, obj: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(obj));
        };
        if (req.method === "GET") {
          try {
            if (!fs.existsSync(LIBRARY_FILE)) return send(404, { error: "projects.json not found" });
            send(200, JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8")));
          } catch (e) {
            send(500, { error: String(e) });
          }
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const entry = data?.entry;
              if (
                !data ||
                typeof data !== "object" ||
                !entry ||
                typeof entry.key !== "string" ||
                !entry.project ||
                !Array.isArray(entry.project.nodes) ||
                typeof entry.project.sourceVideo !== "string"
              ) {
                return send(400, { error: "invalid library entry" });
              }
              let lib: any = { version: 1, current: null, projects: {} };
              if (fs.existsSync(LIBRARY_FILE)) {
                try {
                  lib = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));
                } catch {
                  /* 损坏则重建，保留新条目 */
                }
              }
              if (!lib.projects || typeof lib.projects !== "object") lib.projects = {};
              lib.version = lib.version ?? 1;
              lib.projects[entry.key] = entry;
              lib.current = typeof data.current === "string" ? data.current : entry.key;
              writeAtomic(LIBRARY_FILE, lib);
              send(200, { ok: true });
            } catch (e) {
              send(400, { error: String(e) });
            }
          });
          return;
        }
        send(405, { error: "method not allowed" });
      });
    },
  };
}

function aiHandoffApi(): Plugin {
  return {
    name: "dancefx-ai-handoff",
    configureServer(server) {
      server.middlewares.use("/api/ai", (req, res) => {
        const send = (code: number, obj: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(obj));
        };
        const route = (req.url || "").split("?")[0];
        if (req.method === "POST" && route === "/brief") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              if (!data || !Array.isArray(data.nodes)) return send(400, { error: "invalid brief" });
              writeAtomic(BRIEF_FILE, data);
              send(200, { ok: true, path: "ai-brief.json" });
            } catch (e) {
              send(400, { error: String(e) });
            }
          });
          return;
        }
        if (req.method === "GET" && route === "/result") {
          if (!fs.existsSync(RESULT_FILE)) return send(404, { error: "ai-result.json not found" });
          try {
            send(200, JSON.parse(fs.readFileSync(RESULT_FILE, "utf8")));
          } catch (e) {
            send(500, { error: String(e) });
          }
          return;
        }
        send(405, { error: "method not allowed" });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), projectApi(), libraryApi(), aiHandoffApi()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: false,
    fs: { allow: [ROOT, path.resolve(ROOT, "..")] },
  },
});
