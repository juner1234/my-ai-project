// Phase 4：可靠的视频标识（内容指纹，而非文件名）。
// 采用「文件大小 + 首尾各 1MiB 采样」的 SHA-256：
//  - 同一视频即使改名，指纹不变 → 可恢复其编辑内容；
//  - 不同视频（哪怕同名）指纹不同 → 自动切换/新建，互不混入。
// 边界：极少数「大小相同且首尾 1MiB 相同、仅中段不同」的文件会被视为同一视频，
// 对本地导演台场景可接受（换取几乎零成本的全量读取）。

const SAMPLE = 1024 * 1024; // 1 MiB

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 由 (总大小, 首段, 末段) 采样计算指纹，统一所有来源的算法 */
async function digestSample(size: number, first: ArrayBuffer, last: ArrayBuffer): Promise<string> {
  const head = new TextEncoder().encode(`${size}:`);
  const total = head.byteLength + first.byteLength + last.byteLength;
  const buf = new Uint8Array(total);
  buf.set(head, 0);
  buf.set(new Uint8Array(first), head.byteLength);
  buf.set(new Uint8Array(last), head.byteLength + first.byteLength);
  return toHex(await crypto.subtle.digest("SHA-256", buf));
}

/** 本地导入的 File → 内容指纹 */
export async function videoKeyFromFile(file: File): Promise<string> {
  const size = file.size;
  const first = await file.slice(0, Math.min(SAMPLE, size)).arrayBuffer();
  const last = size > SAMPLE ? await file.slice(Math.max(0, size - SAMPLE), size).arrayBuffer() : new ArrayBuffer(0);
  return digestSample(size, first, last);
}

/** 服务端路径视频（如 input/dance.MP4）→ 内容指纹；Range 失败时回退整段读取 */
export async function videoKeyFromUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${SAMPLE - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`读取视频失败: ${res.status}`);
  if (res.status === 200) {
    const full = await res.arrayBuffer();
    const size = full.byteLength;
    const first = full.slice(0, Math.min(SAMPLE, size));
    const last = size > SAMPLE ? full.slice(Math.max(0, size - SAMPLE)) : new ArrayBuffer(0);
    return digestSample(size, first, last);
  }
  const cr = res.headers.get("content-range") || "";
  const m = /\/(\d+)\s*$/.exec(cr);
  const cl = res.headers.get("content-length");
  const total = m ? Number(m[1]) : cl ? Number(cl) : 0;
  const first = await res.arrayBuffer();
  if (!total || total <= SAMPLE) return digestSample(first.byteLength, first, new ArrayBuffer(0));
  const lastRes = await fetch(url, { headers: { Range: `bytes=${total - SAMPLE}-${total - 1}` } });
  const last = await lastRes.arrayBuffer();
  return digestSample(total, first, last);
}
