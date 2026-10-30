import { WebCodecsEngine } from "./render/WebCodecsEngine";

const $ = (id: string) => document.getElementById(id) as any;
const logEl = $("log") as HTMLPreElement;
function log(s: string, cls = "") {
  const t = new Date().toISOString().slice(11, 23);
  logEl.innerHTML += `<span class="${cls}">[${t}] ${s}</span>\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

const cvL = $("cvL") as HTMLCanvasElement;
const cvR = $("cvR") as HTMLCanvasElement;
const audL = $("audL") as HTMLAudioElement;
const audR = $("audR") as HTMLAudioElement;
audL.src = "/poc/media/left.mp4"; // 无音轨
audR.src = "/poc/media/right.mp4"; // 带音轨（随时间变化的扫频）

let fps = 30;
const engine = new WebCodecsEngine(
  {
    onTime: (t) => {
      $("ro").textContent = `t=${t.toFixed(3)}s · 帧 ${Math.round(t * fps)}`;
      $("frame").value = String(Math.round(t * fps));
    },
    onDuration: () => {},
    onReady: (side) => log(`${side} 就绪`, "ok"),
    onInfo: (side, info) => {
      fps = info.fps;
      $("frame").max = String(info.frames - 1);
      log(
        `${side}: ${info.width}×${info.height} · ${info.fps}fps · ${info.frames}帧 · ${info.duration.toFixed(2)}s · 音轨=${info.hasAudio ? "有" : "无"}`,
        "ok",
      );
    },
    onError: (side, m) => log(`${side} 错误：${m}`, "bad"),
    onEnded: () => log("播放结束"),
  },
  30,
);

void engine.setSide("left", "/poc/media/left.mp4", { canvas: cvL, audio: audL });
void engine.setSide("right", "/poc/media/right.mp4", { canvas: cvR, audio: audR });

$("play").onclick = () => engine.toggle();
$("prev").onclick = () => engine.step(-1);
$("next").onclick = () => engine.step(1);
$("frame").oninput = (e: Event) => engine.seek(Number((e.target as HTMLInputElement).value) / fps);

(window as any).t = {
  engine,
  fps: () => fps,
  goto: (n: number) => engine.seek(n / fps),
  state: () => ({
    left: { w: cvL.width, h: cvL.height },
    right: { w: cvR.width, h: cvR.height },
    audioL: { muted: audL.muted, ready: audL.readyState, ct: +audL.currentTime.toFixed(3) },
    audioR: { muted: audR.muted, ready: audR.readyState, ct: +audR.currentTime.toFixed(3) },
  }),
};
