import React, { useMemo } from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { animationDuration, poseAtTime } from "./spineEval";
import { useSpineData } from "./loadSpine";
import type { BoneTimelines, TestSkeleton } from "./testSkeleton";

interface Props {
  /** path under public/, e.g. characters/test/spine/skeleton.json */
  skeletonPath?: string;
  imageDir?: string;
  size?: number;
  showWarnings?: boolean;
}

const SPINE_DIR = "characters/test/spine";
const IMAGE_DIR = "characters/test/spine/images";

/**
 * Player for the REAL Stretchy Studio Spine export.
 * NOT a full Spine runtime. See capability notes rendered in-studio.
 */
export const RealSpinePlayer: React.FC<Props> = ({
  skeletonPath = `${SPINE_DIR}/skeleton.json`,
  imageDir = IMAGE_DIR,
  size = 768,
  showWarnings = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { data, error } = useSpineData(skeletonPath, imageDir);

  const { skel, animName, warnings } = useMemo(() => {
    if (!data) return { skel: null, animName: "", warnings: [] as string[] };
    const { skeleton, warnings: loadWarnings } = data;
    const w = [...loadWarnings];

    // The export shipped with an empty `animations` map (no clip was authored),
    // so inject an explicitly-labelled test motion to exercise the rig.
    let name = Object.keys(skeleton.animations)[0];
    if (!name) {
      name = "injected_test";
      skeleton.animations[name] = buildInjected(skeleton);
      w.unshift("no animation in export: using INJECTED head-sway + breathing");
    }
    return { skel: skeleton, animName: name, warnings: w };
  }, [data]);

  if (error) {
    return <div style={{ color: "#f88", fontFamily: "monospace", padding: 16 }}>spine load error: {error}</div>;
  }
  if (!skel) {
    return null;
  }

  const W = skel.canvasWidth;
  const H = skel.canvasHeight;
  const scale = size / W;
  const duration = animationDuration(skel, animName);
  const t = duration > 0 ? (frame / fps) % duration : 0;
  const pose = poseAtTime(skel, animName, t);
  const allWarnings = [...warnings, ...pose.warnings];

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
        {pose.slots.map((s) => (
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
      {showWarnings && (
        <div
          style={{
            position: "absolute",
            left: 8,
            bottom: 8,
            maxWidth: W * scale - 16,
            backgroundColor: "rgba(120, 20, 20, 0.85)",
            color: "#fff",
            fontSize: 13,
            fontFamily: "monospace",
            padding: 8,
            borderRadius: 4,
          }}
        >
          <div>RealSpinePlayer — not a full Spine runtime</div>
          <div>supports: region attachments, bone t/r/s, linear interp</div>
          <div>unsupported: mesh, deform, constraints, bezier (approx linear)</div>
          {allWarnings.slice(0, 8).map((w, i) => (
            <div key={i}>- {w}</div>
          ))}
          {allWarnings.length > 8 && <div>... +{allWarnings.length - 8} more</div>}
          <div style={{ opacity: 0.7 }}>anim: {animName} · duration: {duration.toFixed(2)}s</div>
        </div>
      )}
    </div>
  );
};

/** Programmatic test motion for the real rig (head sway + torso breathing). */
function buildInjected(skel: TestSkeleton): { bones: Record<string, BoneTimelines> } {
  const bones: Record<string, BoneTimelines> = {};
  const hasHead = skel.bones.some((b) => b.name === "head");
  const hasTorso = skel.bones.some((b) => b.name === "torso");
  if (hasHead) {
    bones.head = {
      rotate: [
        { time: 0, value: 0 },
        { time: 1.25, value: -5 },
        { time: 2.5, value: 0 },
        { time: 3.75, value: 5 },
        { time: 5, value: 0 },
      ],
    };
  }
  if (hasTorso) {
    bones.torso = {
      scale: [
        { time: 0, x: 1, y: 1 },
        { time: 1.25, x: 1.015, y: 1.03 },
        { time: 2.5, x: 1, y: 1 },
        { time: 3.75, x: 1.015, y: 1.03 },
        { time: 5, x: 1, y: 1 },
      ],
    };
  }
  return { bones };
}
