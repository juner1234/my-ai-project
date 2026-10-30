import { useState } from "react";

interface Props {
  onClose: () => void;
  duration: number;
  fps: number;
}

const FORMATS = ["MP4", "MOV", "WebM", "GIF"];
const RESOLUTIONS = ["原始", "720P", "1080P", "2K", "4K"];
const FRAMERATES = ["跟随原视频", "24", "25", "30", "60"];
const QUALITIES = ["高质量", "标准", "自定义"];
const AUDIOS = ["保留原音频", "静音"];
const RANGES = ["完整视频", "选定时间范围"];

/** 导出设置界面。渲染管线尚未实现——界面上必须明确标注，绝不假装导出成功。 */
export default function ExportDialog({ onClose, duration, fps }: Props) {
  const [format, setFormat] = useState("MP4");
  const [res, setRes] = useState("原始");
  const [fr, setFr] = useState("跟随原视频");
  const [quality, setQuality] = useState("高质量");
  const [audio, setAudio] = useState("保留原音频");
  const [range, setRange] = useState("完整视频");

  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h2>导出</h2>
          <button onClick={onClose}>关闭</button>
        </div>
        <p className="warn">渲染管线尚未实现，当前仅保存设置，无法导出文件。</p>
        <div className="dialog-grid">
          <label className="field">
            <span>格式</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>分辨率</span>
            <select value={res} onChange={(e) => setRes(e.target.value)}>
              {RESOLUTIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>帧率</span>
            <select value={fr} onChange={(e) => setFr(e.target.value)}>
              {FRAMERATES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>画质</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>音频</span>
            <select value={audio} onChange={(e) => setAudio(e.target.value)}>
              {AUDIOS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field">
            <span>范围</span>
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {RANGES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
        </div>
        <div className="dialog-summary small dim">
          当前设置：{format} · {res} · {fr} · {quality} · {audio} · {range}
          <br />
          源视频 {duration.toFixed(3)}s @ {fps}fps。默认保持原分辨率与帧率；代理预览文件不会当作最终成片。
        </div>
        <div className="dialog-foot">
          <span className="badge locked">暂未实现</span>
          <button disabled title="渲染管线未实现，此按钮不会假装导出成功">开始导出（暂未实现）</button>
        </div>
      </div>
    </div>
  );
}
