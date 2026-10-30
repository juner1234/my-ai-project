import { continueRender, delayRender, staticFile } from "remotion";
import { useCallback, useEffect, useState } from "react";
import type { BoneDef, BoneTimelines, SlotDef, TestSkeleton } from "./testSkeleton";

/** Raw Stretchy Studio Spine 4.0 JSON (subset we consume). */
interface SpineJson {
  skeleton: { width: number; height: number; fps: number };
  bones: Array<{
    name: string;
    parent?: string;
    x?: number;
    y?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
  }>;
  slots: Array<{ name: string; bone: string; attachment: string }>;
  skins: Array<{
    name: string;
    attachments: Record<
      string,
      Record<
        string,
        { type: string; name: string; x: number; y: number; rotation: number; width?: number; height?: number }
      >
    >;
  }>;
  animations: Record<
    string,
    {
      bones: Record<
        string,
        {
          rotate?: Array<{ time: number; value: number; curve?: unknown }>;
          translate?: Array<{ time: number; x: number; y: number; curve?: unknown }>;
          scale?: Array<{ time: number; x: number; y: number; curve?: unknown }>;
        }
      >;
    }
  >;
}

/** Layers we know are model artifacts and must not be shown. */
const DROP_LAYERS = new Set(["neckwear", "headwear"]);

/**
 * Slots the auto-rig left on `root` but that should follow the head.
 * We rebind them here and recompute the attachment offset so the rest pose
 * (and therefore the look) is unchanged. This is a post-export correction,
 * not a Stretchy setting.
 */
const REBIND_TO_HEAD = new Set(["eyewhite", "irides", "eyelash", "eyebrow", "ears"]);

const rad = (d: number) => (d * Math.PI) / 180;

interface RestBone {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** Rest-pose world transforms (spine Y-up) for all bones. */
function computeRestWorld(bones: BoneDef[]): Map<string, RestBone> {
  const world = new Map<string, RestBone>();
  world.set("root", { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
  for (const b of bones) {
    if (b.name === "root") continue;
    const p = world.get(b.parent ?? "root") ?? { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const c = Math.cos(rad(p.rotation));
    const s = Math.sin(rad(p.rotation));
    const ox = (b.x ?? 0) * p.scaleX;
    const oy = (b.y ?? 0) * p.scaleY;
    world.set(b.name, {
      x: p.x + ox * c - oy * s,
      y: p.y + ox * s + oy * c,
      rotation: p.rotation + (b.rotation ?? 0),
      scaleX: p.scaleX * (b.scaleX ?? 1),
      scaleY: p.scaleY * (b.scaleY ?? 1),
    });
  }
  return world;
}

/**
 * Draw-order correction for THIS test character ONLY.
 *
 * The auto-rig exported `eyelash`/`eyebrow` *below* the opaque `face` layer,
 * so the face hid them. These two layers are raised to sit directly above
 * `face`. This is deliberately scoped to this character's layer names (it only
 * acts when a `face` slot exists) and is NOT a general rule for all characters.
 */
const TEST_CHARACTER_RAISE_ABOVE_FACE = ["eyebrow", "eyelash"];

function applyDrawOrderFix(skeleton: TestSkeleton, warnings: string[]): void {
  if (!skeleton.slots.some((s) => s.name === "face")) return;
  const movers = TEST_CHARACTER_RAISE_ABOVE_FACE.map((name) =>
    skeleton.slots.find((s) => s.name === name),
  ).filter((s): s is (typeof skeleton.slots)[number] => Boolean(s));
  if (movers.length === 0) return;
  const rest = skeleton.slots.filter((s) => !TEST_CHARACTER_RAISE_ABOVE_FACE.includes(s.name));
  const faceIdx = rest.findIndex((s) => s.name === "face");
  rest.splice(faceIdx + 1, 0, ...movers);
  skeleton.slots = rest;
  warnings.push(
    `draw-order fix: raised ${movers.map((m) => `"${m.name}"`).join(", ")} above "face"`,
  );
}

/**
 * Rebind head-following slots to the head bone, preserving their rest position
 * by recomputing the local attachment offset. Mutates `skeleton` in place.
 */
function applyRebinds(skeleton: TestSkeleton, warnings: string[]): void {
  const world = computeRestWorld(skeleton.bones);
  const head = world.get("head");
  if (!head) {
    warnings.push("cannot rebind to head: bone not found");
    return;
  }
  for (const slot of skeleton.slots) {
    if (!REBIND_TO_HEAD.has(slot.name) || slot.bone === "head") continue;
    const att = skeleton.attachments[slot.attachment];
    const cur = world.get(slot.bone) ?? { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    // current attachment center in spine world
    const c = Math.cos(rad(cur.rotation));
    const s = Math.sin(rad(cur.rotation));
    const ax = att.x * cur.scaleX;
    const ay = att.y * cur.scaleY;
    const sx = cur.x + ax * c - ay * s;
    const sy = cur.y + ax * s + ay * c;
    // express it relative to head (inverse rotate/scale)
    const dx = sx - head.x;
    const dy = sy - head.y;
    const ic = Math.cos(rad(-head.rotation));
    const is = Math.sin(rad(-head.rotation));
    att.x = (dx * ic - dy * is) / head.scaleX;
    att.y = (dx * is + dy * ic) / head.scaleY;
    att.rotation = cur.rotation + att.rotation - head.rotation;
    warnings.push(`rebound "${slot.name}" -> head (rest position preserved)`);
    slot.bone = "head";
  }
}

/**
 * Convert a real Stretchy Spine export into the player's internal skeleton.
 * Only region attachments are accepted; mesh/unknown attachments are skipped
 * and reported (never silently ignored).
 */
export function convertSpine(
  json: SpineJson,
  imageDir: string,
): { skeleton: TestSkeleton; warnings: string[] } {
  const warnings: string[] = [];
  const skins = json.skins?.[0]?.attachments ?? {};

  const attachments: TestSkeleton["attachments"] = {};
  for (const slot of json.slots) {
    if (DROP_LAYERS.has(slot.name)) {
      warnings.push(`dropped artifact layer "${slot.name}"`);
      continue;
    }
    const def = skins[slot.attachment]?.[slot.attachment];
    if (!def) {
      warnings.push(`slot "${slot.name}": no skin attachment, skipped`);
      continue;
    }
    if (def.type !== "region") {
      warnings.push(`slot "${slot.name}": attachment type "${def.type}" not supported, skipped`);
      continue;
    }
    attachments[slot.attachment] = {
      type: "region",
      name: def.name,
      x: def.x,
      y: def.y,
      rotation: def.rotation ?? 0,
      width: def.width ?? json.skeleton.width,
      height: def.height ?? json.skeleton.height,
      file: `${imageDir}/${slot.name}.png`,
    };
  }

  const slots: SlotDef[] = json.slots.filter((s) => !DROP_LAYERS.has(s.name) && attachments[s.attachment]);

  const bones: BoneDef[] = json.bones.map((b) => ({
    name: b.name,
    parent: b.parent,
    x: b.x,
    y: b.y,
    rotation: b.rotation,
    scaleX: b.scaleX,
    scaleY: b.scaleY,
  }));

  const animations: Record<string, { bones: Record<string, BoneTimelines> }> = {};
  for (const [name, anim] of Object.entries(json.animations ?? {})) {
    const out: Record<string, BoneTimelines> = {};
    for (const [boneName, tl] of Object.entries(anim.bones ?? {})) {
      out[boneName] = {
        rotate: tl.rotate?.map((k) => ({ time: k.time, value: k.value, curve: k.curve })),
        translate: tl.translate?.map((k) => ({ time: k.time, x: k.x, y: k.y, curve: k.curve })),
        scale: tl.scale?.map((k) => ({ time: k.time, x: k.x, y: k.y, curve: k.curve })),
      };
    }
    animations[name] = { bones: out };
  }

  const skeleton: TestSkeleton = {
    canvasWidth: json.skeleton.width,
    canvasHeight: json.skeleton.height,
    bones,
    slots,
    attachments,
    animations,
  };

  applyRebinds(skeleton, warnings);
  applyDrawOrderFix(skeleton, warnings);

  return { skeleton, warnings };
}

/**
 * Load and convert the real Stretchy export. Follows Remotion's async asset
 * rules (delayRender/continueRender) so the pose stays frame-deterministic.
 */
export function useSpineData(path: string, imageDir: string) {
  const [data, setData] = useState<{ skeleton: TestSkeleton; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const handle = delayRender(`Loading ${path}`);
    try {
      const res = await fetch(staticFile(path));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SpineJson;
      setData(convertSpine(json, imageDir));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      continueRender(handle);
    }
  }, [path, imageDir]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error };
}
