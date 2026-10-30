import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_FILE = path.join(ROOT, "project.json");

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

export default defineConfig({
  plugins: [react(), projectApi()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: false,
    fs: { allow: [ROOT, path.resolve(ROOT, "..")] },
  },
});
