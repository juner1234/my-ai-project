/** 00:00:06.500 格式 */
export function fmtTimecode(seconds: number): string {
  const s = Math.max(0, seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const msFix = ms === 1000 ? 999 : ms;
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(msFix, 3)}`;
}

/** "00:00:06.500" -> 秒；无效返回 null */
export function parseTimecode(v: string): number | null {
  const m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?\s*$/.exec(v);
  if (m) {
    const h = Number(m[1] ?? 0);
    const min = Number(m[2]);
    const sec = Number(m[3]);
    const ms = Number((m[4] ?? "0").padEnd(3, "0"));
    if (sec >= 60 || min >= 60) return null;
    return h * 3600 + min * 60 + sec + ms / 1000;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
