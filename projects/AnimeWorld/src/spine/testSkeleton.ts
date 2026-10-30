/**
 * Hand-authored minimal skeleton for the AnimeWorld smoke test.
 *
 * Shape mirrors Stretchy Studio's Spine 4.0 export (`exportSpine.js`) so the
 * real export can replace this file later:
 *  - bones with parent-local x/y (Spine Y-up), rotation (CCW deg), scale
 *  - slots in draw order (bottom -> top), each bound to a bone + attachment
 *  - region attachments only (full-canvas 768x768 PNGs)
 *  - one animation with bone rotate/scale timelines, times in seconds
 *
 * Q版 test art has no separable arm layers, so no arm bones are invented.
 * Motions: head sway (head rotate) + breathing (torso scale).
 */

export interface RegionAttachment {
  type: "region";
  name: string;
  /** image center in parent-bone local space, Spine Y-up */
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  /** PNG file under public/characters/test/clean/ */
  file: string;
}

export interface BoneDef {
  name: string;
  parent?: string;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface SlotDef {
  name: string;
  bone: string;
  attachment: string;
}

export interface Keyframe {
  time: number;
  curve?: unknown;
  [k: string]: number | unknown;
}

export interface BoneTimelines {
  rotate?: Keyframe[]; // { time, value } delta deg, Spine CCW
  translate?: Keyframe[]; // { time, x, y } deltas
  scale?: Keyframe[]; // { time, x, y } multipliers
}

export interface TestSkeleton {
  canvasWidth: number;
  canvasHeight: number;
  bones: BoneDef[];
  slots: SlotDef[];
  attachments: Record<string, RegionAttachment>;
  animations: Record<string, { bones: Record<string, BoneTimelines> }>;
}

// Joint positions in canvas px (Y-down), 768x768 canvas.
const RIG_ROOT = { x: 384, y: 560 };
const TORSO = { x: 384, y: 540 };
const NECK = { x: 384, y: 460 };
const HEAD = { x: 384, y: 460 }; // pivot at neck joint for sway
const H = 768;

// Attachment center (384,384 image center) relative to bone, Spine Y-up.
const att = (bone: { x: number; y: number }, file: string): RegionAttachment => ({
  type: "region",
  name: file,
  x: 384 - bone.x,
  y: bone.y - 384,
  rotation: 0,
  width: 768,
  height: 768,
  file: `characters/test/clean/${file}.png`,
});

export const TEST_SKELETON: TestSkeleton = {
  canvasWidth: 768,
  canvasHeight: H,
  bones: [
    { name: "root" },
    {
      name: "rig_root",
      parent: "root",
      x: RIG_ROOT.x,
      y: -RIG_ROOT.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    {
      name: "torso",
      parent: "rig_root",
      x: 0,
      y: -(TORSO.y - RIG_ROOT.y),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    {
      name: "neck",
      parent: "torso",
      x: 0,
      y: -(NECK.y - TORSO.y),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
    {
      name: "head",
      parent: "neck",
      x: 0,
      y: -(HEAD.y - NECK.y),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    },
  ],
  // Verified PSD stacking order, bottom -> top.
  slots: [
    { name: "back_hair", bone: "head", attachment: "back_hair" },
    { name: "legwear", bone: "rig_root", attachment: "legwear" },
    { name: "handwear", bone: "torso", attachment: "handwear" },
    { name: "eyewhite", bone: "head", attachment: "eyewhite" },
    { name: "topwear", bone: "torso", attachment: "topwear" },
    { name: "ears", bone: "head", attachment: "ears" },
    { name: "face", bone: "head", attachment: "face" },
    { name: "eyebrow", bone: "head", attachment: "eyebrow" },
    { name: "eyelash", bone: "head", attachment: "eyelash" },
    { name: "mouth", bone: "head", attachment: "mouth" },
    { name: "nose", bone: "head", attachment: "nose" },
    { name: "front_hair", bone: "head", attachment: "front_hair" },
    { name: "irides", bone: "head", attachment: "irides" },
  ],
  attachments: {
    back_hair: att(HEAD, "back_hair"),
    legwear: att(RIG_ROOT, "legwear"),
    handwear: att(TORSO, "handwear"),
    eyewhite: att(HEAD, "eyewhite"),
    topwear: att(TORSO, "topwear"),
    ears: att(HEAD, "ears"),
    face: att(HEAD, "face"),
    eyebrow: att(HEAD, "eyebrow"),
    eyelash: att(HEAD, "eyelash"),
    mouth: att(HEAD, "mouth"),
    nose: att(HEAD, "nose"),
    front_hair: att(HEAD, "front_hair"),
    irides: att(HEAD, "irides"),
  },
  animations: {
    test_sway: {
      bones: {
        head: {
          rotate: [
            { time: 0, value: 0 },
            { time: 1.25, value: -5 },
            { time: 2.5, value: 0 },
            { time: 3.75, value: 5 },
            { time: 5, value: 0 },
          ],
        },
        torso: {
          scale: [
            { time: 0, x: 1, y: 1 },
            { time: 1.25, x: 1.015, y: 1.03 },
            { time: 2.5, x: 1, y: 1 },
            { time: 3.75, x: 1.015, y: 1.03 },
            { time: 5, x: 1, y: 1 },
          ],
        },
      },
    },
  },
};
