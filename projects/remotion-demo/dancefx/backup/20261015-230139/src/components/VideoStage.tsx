import type { RefObject } from "react";

interface Props {
  surfaceRef: RefObject<HTMLCanvasElement | null>;
  width?: number;
  height?: number;
}

/**
 * 帧呈现画布：实际尺寸由引擎按媒体分辨率写入 canvas.width/height。
 * 这里给一个与视频同规格的初始尺寸，保证加载前布局与标注层比例稳定。
 * class 与旧 <video> 一致（stage-video），因此 .video-wrap / 标注坐标不需要改动。
 */
export default function VideoStage({ surfaceRef, width = 1280, height = 720 }: Props) {
  return <canvas ref={surfaceRef} className="stage-video" width={width} height={height} />;
}
