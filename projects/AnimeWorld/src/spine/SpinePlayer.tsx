import React, { useMemo } from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TEST_SKELETON } from "./testSkeleton";
import { animationDuration, poseAtTime } from "./spineEval";

interface Props {
  animationName?: string;
  /** canvas px size of the 768x768 skeleton stage */
  size?: number;
  showWarnings?: boolean;
}

/**
 * Minimal bone-driven character player (NOT a full Spine runtime).
 *
 * Supported: bone translate/rotate/scale timelines with linear interp,
 * region attachments, slot draw order. Pose is a pure function of the
 * Remotion frame, so timeline scrubbing is always correct.
 *
 * Explicitly NOT supported (reported in-studio, never silently ignored):
 * mesh attachments, vertex deform timelines, draw-order timelines,
 * IK / transform / path constraints, slot color timelines, bezier
 * easing (approximated as linear + reported), audio.
 */
export const SpinePlayer: React.FC<Props> = ({
  animationName = "test_sway",
  size = 768,
  showWarnings = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { slots, warnings, duration } = useMemo(() => {
    const d = animationDuration(TEST_SKELETON, animationName);
    const t = d > 0 ? (frame / fps) % d : 0;
    const pose = poseAtTime(TEST_SKELETON, animationName, t);
    const support = capabilityWarnings();
    return { slots: pose.slots, warnings: [...support, ...pose.warnings], duration: d };
  }, [frame, fps, animationName]);

  const scale = size / TEST_SKELETON.canvasWidth;
  const W = TEST_SKELETON.canvasWidth;
  const H = TEST_SKELETON.canvasHeight;

  return (
    <div style={{ position: "relative", width: W * scale, height: H * scale }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {slots.map((s) => (
          <Img
            key={s.slot}
            src={staticFile(s.file)}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: W,
              height: H,
              transformOrigin: "0 0",
              transform: [
                `translate(${s.cx}px, ${s.cy}px)`,
                `rotate(${s.rotation}deg)`,
                `scale(${s.scaleX}, ${s.scaleY})`,
                `translate(${-W / 2}px, ${-H / 2}px)`,
              ].join(" "),
              opacity: s.opacity,
            }}
          />
        ))}
      </div>
      {showWarnings && warnings.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            maxWidth: size - 16,
            backgroundColor: "rgba(120, 20, 20, 0.85)",
            color: "#fff",
            fontSize: 14,
            fontFamily: "monospace",
            padding: 8,
            borderRadius: 4,
          }}
        >
          <div>SpinePlayer limits ({warnings.length}):</div>
          {warnings.map((w, i) => (
            <div key={i}>- {w}</div>
          ))}
          <div style={{ opacity: 0.7 }}>duration: {duration.toFixed(2)}s</div>
        </div>
      )}
    </div>
  );
};

/** Static capability report: what this player does not implement. */
function capabilityWarnings(): string[] {
  return [
    "mesh attachments: not supported (test data is region-only)",
    "deform / draw-order / constraint timelines: not supported",
    "bezier easing: approximated as linear when encountered",
  ];
}
