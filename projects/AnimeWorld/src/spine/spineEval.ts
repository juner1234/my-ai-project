import type { BoneDef, BoneTimelines, Keyframe, TestSkeleton } from "./testSkeleton";

/** World transform in canvas space (Y-down px, rotation = visual-clockwise deg). */
export interface WorldNode {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface PlacedSlot {
  slot: string;
  file: string;
  /** image center in canvas px */
  cx: number;
  cy: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  opacity: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Sample a numeric field from keyframes at time t (linear interp).
 * Before first key -> first value would pop, so hold first; after last -> hold last.
 * Returns { value, stepped } where stepped flags Spine `stepped` curves (unsupported -> hold).
 */
function sampleField(kfs: Keyframe[], field: string, t: number, warnings: string[], ctx: string): number {
  if (kfs.length === 0) throw new Error("empty track");
  const at = (k: Keyframe) => k[field] as number;
  if (t <= kfs[0].time) return at(kfs[0]);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t >= a.time && t <= b.time) {
      const curve = (a as Record<string, unknown>).curve;
      if (curve === "stepped") {
        warnings.push(`${ctx}: stepped curve approximated as hold`);
        return at(a);
      }
      if (curve !== undefined && curve !== "linear") {
        warnings.push(`${ctx}: bezier curve approximated as linear`);
      }
      const span = b.time - a.time;
      const f = span <= 0 ? 0 : (t - a.time) / span;
      return lerp(at(a), at(b), f);
    }
  }
  return at(kfs[kfs.length - 1]);
}

interface LocalBone {
  lx: number; // spine-local parent offset (Y-up)
  ly: number;
  rot: number; // spine rotation (CCW deg)
  sx: number;
  sy: number;
}

function animatedLocal(
  setup: BoneDef,
  tl: BoneTimelines | undefined,
  t: number,
  warnings: string[],
): LocalBone {
  let dx = 0;
  let dy = 0;
  let drot = 0;
  let sx = setup.scaleX ?? 1;
  let sy = setup.scaleY ?? 1;
  if (tl?.translate) {
    dx = sampleField(tl.translate, "x", t, warnings, `translate ${setup.name}.x`);
    dy = sampleField(tl.translate, "y", t, warnings, `translate ${setup.name}.y`);
  }
  if (tl?.rotate) {
    drot = sampleField(tl.rotate, "value", t, warnings, `rotate ${setup.name}`);
  }
  if (tl?.scale) {
    sx *= sampleField(tl.scale, "x", t, warnings, `scale ${setup.name}.x`);
    sy *= sampleField(tl.scale, "y", t, warnings, `scale ${setup.name}.y`);
  }
  return {
    lx: (setup.x ?? 0) + dx,
    ly: (setup.y ?? 0) + dy,
    rot: (setup.rotation ?? 0) + drot,
    sx,
    sy,
  };
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Deterministic pose for animation time t (seconds). Pure function of t:
 * scrubbing the Remotion timeline always yields the same pose.
 */
export function poseAtTime(
  skel: TestSkeleton,
  animationName: string,
  t: number,
): { slots: PlacedSlot[]; warnings: string[] } {
  const warnings: string[] = [];
  const anim = skel.animations[animationName];
  if (!anim) {
    return { slots: [], warnings: [`animation "${animationName}" not found`] };
  }

  const world = new Map<string, WorldNode>();
  world.set("root", { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });

  // Bones are stored parents-first (exporters emit topological order).
  for (const b of skel.bones) {
    if (b.name === "root") continue;
    const parent = world.get(b.parent ?? "root");
    if (!parent) {
      warnings.push(`bone "${b.name}" has unknown parent "${b.parent}", attached to root`);
    }
    const p = parent ?? { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const local = animatedLocal(b, anim.bones[b.name], t, warnings);
    const c = Math.cos(rad(p.rotation));
    const s = Math.sin(rad(p.rotation));
    const ox = local.lx * p.scaleX;
    const oy = local.ly * p.scaleY;
    world.set(b.name, {
      x: p.x + ox * c - oy * s,
      y: p.y + ox * s + oy * c,
      rotation: p.rotation + local.rot,
      scaleX: p.scaleX * local.sx,
      scaleY: p.scaleY * local.sy,
    });
  }

  const H = skel.canvasHeight;
  const slots: PlacedSlot[] = skel.slots.map((slot) => {
    const bone = world.get(slot.bone) ?? { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const attachment = skel.attachments[slot.attachment];
    // Attachment center in spine-local (Y-up), scaled by the bone, then rotated.
    const ax = attachment.x * bone.scaleX;
    const ay = attachment.y * bone.scaleY;
    const c = Math.cos(rad(bone.rotation));
    const s = Math.sin(rad(bone.rotation));
    const spineX = bone.x + ax * c - ay * s;
    const spineY = bone.y + ax * s + ay * c;
    // spine (Y-up) -> canvas (Y-down).
    return {
      slot: slot.name,
      file: attachment.file,
      cx: spineX,
      cy: H - spineY,
      rotation: -(bone.rotation + (attachment.rotation ?? 0)),
      scaleX: bone.scaleX,
      scaleY: bone.scaleY,
      width: attachment.width,
      height: attachment.height,
      opacity: 1,
    };
  });

  return { slots, warnings };
}

/** Longest keyframe time in the animation; used for looping. */
export function animationDuration(skel: TestSkeleton, animationName: string): number {
  const anim = skel.animations[animationName];
  if (!anim) return 0;
  let max = 0;
  for (const tl of Object.values(anim.bones)) {
    for (const track of [tl.rotate, tl.translate, tl.scale]) {
      for (const k of track ?? []) max = Math.max(max, k.time);
    }
  }
  return max;
}
