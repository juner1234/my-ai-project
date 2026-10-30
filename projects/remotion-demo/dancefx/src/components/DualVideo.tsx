import { useEffect, useRef, type RefObject } from "react";

interface Props {
  src: string;
  muted: boolean;
  onDuration: (d: number) => void;
  onReady?: () => void;
  onEnded?: () => void;
  elementRef?: RefObject<HTMLVideoElement | null>;
}
/**
 * 预览单元：只负责 src / 静音 等元素属性。
 * 播放、暂停、seek、倍速统一由 PlaybackEngine 通过 elementRef 驱动，
 * 避免多处同时写 currentTime 互相覆盖。
 */
export default function DualVideo({ src, muted, onDuration, onReady, onEnded, elementRef }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (elementRef) elementRef.current = ref.current;
  }, [elementRef, src]);
  useEffect(() => {
    const v = ref.current;
    if (v) v.muted = muted;
  }, [muted, src]);

  return (
    <video
      ref={ref}
      className="stage-video"
      src={src}
      playsInline
      preload="auto"
      muted={muted}
      onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
      onCanPlay={() => onReady?.()}
      onEnded={() => onEnded?.()}
    />
  );
}
