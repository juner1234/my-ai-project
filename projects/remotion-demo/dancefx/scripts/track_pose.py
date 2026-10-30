#!/usr/bin/env python3
"""
DanceFX Phase 1 - human motion tracking experiment.

Uses Google MediaPipe Pose Landmarker (HEAVY) in VIDEO running mode to extract
33 body landmarks per frame, wrist velocities, and body segmentation masks.

Outputs:
  - tracking/motion.json
  - previews/pose-preview.mp4  (original video + skeleton overlay, original audio)

Reads the source video strictly read-only.
"""
from __future__ import annotations

import csv
import io
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
VIDEO = ROOT / "input" / "dance.MP4"
MODEL = ROOT / "models" / "pose_landmarker_heavy.task"
OUT_JSON = ROOT / "tracking" / "motion.json"
OUT_PREVIEW = ROOT / "previews" / "pose-preview.mp4"

FFMPEG_DIR = Path(
    "/Users/mac/Desktop/remotion-demo/node_modules/@remotion/compositor-darwin-arm64"
)

# --------------------------------------------------------------------------
# Pose topology (MediaPipe Pose, 33 landmarks) - drawn manually because
# mediapipe 1.x no longer ships the legacy drawing utils.
# --------------------------------------------------------------------------
LEFT = "LEFT"
RIGHT = "RIGHT"

LANDMARK_NAMES = [
    "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner",
    "right_eye", "right_eye_outer", "left_ear", "right_ear", "mouth_left",
    "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index",
    "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel",
    "right_heel", "left_foot_index", "right_foot_index",
]

L, R = LEFT, RIGHT
POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (0, 4), (4, 5), (5, 6), (3, 7), (4, 8),
    (9, 10), (11, 12), (11, 13), (13, 15), (15, 17), (15, 19), (15, 21),
    (17, 19), (19, 21), (12, 14), (14, 16), (16, 18), (16, 20), (16, 22),
    (18, 20), (20, 22), (11, 23), (12, 24), (23, 24), (23, 25), (24, 26),
    (25, 27), (26, 28), (27, 29), (28, 30), (29, 31), (30, 32), (27, 31),
    (28, 32),
]

SIDE_OF = {
    1: L, 2: L, 3: L, 7: L, 11: L, 13: L, 15: L, 17: L, 19: L, 21: L,
    23: L, 25: L, 27: L, 29: L, 31: L,
    4: R, 5: R, 6: R, 8: R, 12: R, 14: R, 16: R, 18: R, 20: R, 22: R,
    24: R, 26: R, 28: R, 30: R, 32: R,
    0: "CENTER", 9: "CENTER", 10: "CENTER",
}

LEFT_WRIST, RIGHT_WRIST = 15, 16
WRIST_IDS = {LEFT_WRIST: "left", RIGHT_WRIST: "right"}

COLOR_L_WRIST = (0, 255, 0)      # left wrist  -> green
COLOR_R_WRIST = (0, 165, 255)    # right wrist -> orange
COLOR_BONE = (255, 255, 255)
COLOR_POINT = (0, 200, 255)

VIS_WRIST_MIN = 0.5  # below this visibility a wrist is flagged unreliable

# central-difference window for velocity (frames)
VEL_SPAN = 1


def die(msg: str) -> None:
    print(f"FATAL: {msg}", file=sys.stderr)
    sys.exit(1)


def ffprobe_frame_timestamps(video: Path) -> list[float]:
    """Exact per-frame PTS in seconds, taken straight from the container."""
    env = dict(os.environ)
    env["DYLD_LIBRARY_PATH"] = str(FFMPEG_DIR)
    cmd = [
        str(FFMPEG_DIR / "ffprobe"), "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "frame=pts_time",
        "-of", "csv=p=0",
        str(video),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, env=env, check=True)
    stamps: list[float] = []
    for row in csv.reader(io.StringIO(out.stdout)):
        row = [c for c in row if c.strip()]
        if not row:
            continue
        stamps.append(float(row[0]))
    return stamps


def eight_direction(dx: float, dy: float) -> str:
    """Screen coordinates: +y points down."""
    import math
    if dx == 0 and dy == 0:
        return "still"
    ang = math.degrees(math.atan2(-dy, dx)) % 360  # 0=east, 90=north(up)
    names = ["right", "up-right", "up", "up-left", "left", "down-left", "down", "down-right"]
    return names[int(((ang + 22.5) % 360) // 45)]


def main() -> None:
    if not VIDEO.exists():
        die(f"video not found: {VIDEO}")
    if not MODEL.exists():
        die(f"model not found: {MODEL}")

    cap = cv2.VideoCapture(str(VIDEO))
    if not cap.isOpened():
        die("cannot open video")
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    n_pts = n_frames  # alias used in the HUD

    pts = ffprobe_frame_timestamps(VIDEO)
    if len(pts) != n_frames:
        print(f"WARN: pts count {len(pts)} != container frame count {n_frames}")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_PREVIEW.parent.mkdir(parents=True, exist_ok=True)

    options = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(MODEL)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_segmentation_masks=True,
    )

    # encoder: raw BGR frames on stdin, audio copied from the original file
    env = dict(os.environ)
    env["DYLD_LIBRARY_PATH"] = str(FFMPEG_DIR)
    tmp_preview = OUT_PREVIEW.with_suffix(".tmp.mp4")
    # this ffmpeg build has no rawvideo demuxer; feed PNG frames on stdin instead
    enc_cmd = [
        str(FFMPEG_DIR / "ffmpeg"), "-y", "-v", "error",
        "-f", "image2pipe", "-c:v", "png", "-framerate", f"{fps:g}",
        "-i", "pipe:0",
        "-i", str(VIDEO),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-shortest",
        str(tmp_preview),
    ]
    encoder = subprocess.Popen(enc_cmd, stdin=subprocess.PIPE, env=env)

    frames_json: list[dict] = []
    failed_frames: list[dict] = []
    mask_ok_frames = 0
    detected_frames = 0
    wrist_stats = {"left": {"present": 0, "reliable": 0},
                   "right": {"present": 0, "reliable": 0}}

    t_start = time.time()

    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            ts_ms = int(round(pts[idx] * 1000)) if idx < len(pts) else idx * int(round(1000 / fps))
            ts_s = pts[idx] if idx < len(pts) else idx / fps

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect_for_video(mp_img, ts_ms)

            overlay = frame.copy()
            rec: dict = {
                "frame": idx,
                "timestamp_ms": ts_ms,
                "timestamp_s": round(ts_s, 6),
            }

            detected = bool(result.pose_landmarks)
            if not detected:
                rec["detected"] = False
                rec["reason"] = "no_pose_detected"
                failed_frames.append(
                    {"frame": idx, "timestamp_ms": ts_ms, "reason": "no_pose_detected"}
                )
                cv2.putText(overlay, f"NO POSE  t={ts_s:0.2f}s", (12, height - 16),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA)
            else:
                detected_frames += 1
                lms = result.pose_landmarks[0]
                world = result.pose_world_landmarks[0] if result.pose_world_landmarks else None

                # ---- landmarks -------------------------------------------------
                lm_out = []
                for i, lm in enumerate(lms):
                    px = lm.x * width
                    py = lm.y * height
                    lm_out.append({
                        "index": i,
                        "name": LANDMARK_NAMES[i],
                        "side": SIDE_OF.get(i, "CENTER"),
                        "x": round(lm.x, 6),
                        "y": round(lm.y, 6),
                        "z": round(lm.z, 6),
                        "px": round(px, 3),
                        "py": round(py, 3),
                        "visibility": round(lm.visibility, 4),
                        "presence": round(lm.presence, 4),
                    })

                world_out = None
                if world:
                    world_out = [
                        {"x": round(w.x, 5), "y": round(w.y, 5), "z": round(w.z, 5),
                         "visibility": round(w.visibility, 4)}
                        for w in world
                    ]

                # ---- segmentation mask --------------------------------------
                seg = {"available": False}
                masks = result.segmentation_masks
                if masks:
                    m = masks[0].numpy_view().squeeze()
                    binary = m > 0.5
                    coverage = float(binary.mean())
                    if binary.any():
                        ys, xs = np.nonzero(binary)
                        seg = {
                            "available": True,
                            "coverage": round(coverage, 6),
                            "bbox_px": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                            "mean_confidence": round(float(m[binary].mean()), 4),
                        }
                        mask_ok_frames += 1
                        # faint tint so the mask is visible in the preview
                        tint = np.zeros_like(overlay)
                        tint[..., 1] = 60  # green
                        overlay[binary] = cv2.addWeighted(overlay[binary], 0.75, tint[binary], 0.25, 0)
                    else:
                        seg = {"available": True, "coverage": 0.0, "bbox_px": None,
                               "note": "mask_all_zero"}

                # ---- wrists: velocity / direction (central difference) ---------
                wrists = {}
                for wid, key in WRIST_IDS.items():
                    cur = lm_out[wid]
                    present = True
                    reliable = cur["visibility"] >= VIS_WRIST_MIN
                    wrist_stats[key]["present"] += 1
                    if reliable:
                        wrist_stats[key]["reliable"] += 1
                    wrists[key] = {
                        "landmark_index": wid,
                        "px": cur["px"], "py": cur["py"],
                        "x": cur["x"], "y": cur["y"],
                        "visibility": cur["visibility"],
                        "reliable": reliable,
                    }

                rec.update({
                    "detected": True,
                    "landmarks": lm_out,
                    "world_landmarks": world_out,
                    "segmentation": seg,
                    "wrists": wrists,
                })

                # ---- skeleton overlay ----------------------------------------
                for a, b in POSE_CONNECTIONS:
                    pa = lm_out[a]
                    pb = lm_out[b]
                    if pa["visibility"] < 0.5 or pb["visibility"] < 0.5:
                        continue
                    cv2.line(overlay, (int(pa["px"]), int(pa["py"])),
                             (int(pb["px"]), int(pb["py"])), COLOR_BONE, 2, cv2.LINE_AA)
                for p in lm_out:
                    if p["visibility"] < 0.5:
                        continue
                    cv2.circle(overlay, (int(p["px"]), int(p["py"])), 4, COLOR_POINT, -1, cv2.LINE_AA)
                for wid, color in ((LEFT_WRIST, COLOR_L_WRIST), (RIGHT_WRIST, COLOR_R_WRIST)):
                    p = lm_out[wid]
                    if p["visibility"] < VIS_WRIST_MIN:
                        continue
                    cv2.circle(overlay, (int(p["px"]), int(p["py"])), 11, color, 3, cv2.LINE_AA)
                    cv2.circle(overlay, (int(p["px"]), int(p["py"])), 4, color, -1, cv2.LINE_AA)

            # ---- HUD ---------------------------------------------------------
            cv2.rectangle(overlay, (0, 0), (width, 34), (0, 0, 0), -1)
            cv2.putText(overlay, f"t={ts_s:06.3f}s  frame {idx+1}/{n_pts}  MediaPipe HEAVY",
                        (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.putText(overlay, "L wrist", (10, height - 44),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_L_WRIST, 1, cv2.LINE_AA)
            cv2.putText(overlay, "R wrist", (10, height - 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_R_WRIST, 1, cv2.LINE_AA)

            okp, png = cv2.imencode(".png", overlay)
            if not okp:
                die(f"PNG encode failed at frame {idx}")
            encoder.stdin.write(png.tobytes())
            frames_json.append(rec)
            idx += 1
            if idx % 50 == 0:
                elapsed = time.time() - t_start
                print(f"  {idx}/{n_pts} frames  ({elapsed:.0f}s elapsed)", flush=True)

    cap.release()
    encoder.stdin.close()
    ret = encoder.wait()
    if ret != 0:
        die(f"ffmpeg encoder failed with code {ret}")
    os.replace(tmp_preview, OUT_PREVIEW)

    # ------------------------------------------------------------------
    # wrist velocity: central difference over the tracked sequence
    # ------------------------------------------------------------------
    n = len(frames_json)
    for i, rec in enumerate(frames_json):
        if not rec.get("detected"):
            continue
        dt_info = {}
        for key in ("left", "right"):
            w = rec["wrists"][key]
            prev = frames_json[i - 1] if i > 0 else None
            nxt = frames_json[i + 1] if i < n - 1 else None
            if prev and prev.get("detected") and nxt and nxt.get("detected"):
                a, b = prev["wrists"][key], nxt["wrists"][key]
                dt = (nxt["timestamp_ms"] - prev["timestamp_ms"]) / 1000.0
                if dt > 0:
                    vx = (b["px"] - a["px"]) / dt
                    vy = (b["py"] - a["py"]) / dt
                    speed = float(np.hypot(vx, vy))
                    entry = {
                        "vx_px_s": round(vx, 2),
                        "vy_px_s": round(vy, 2),
                        "speed_px_s": round(speed, 2),
                        "direction_deg": round(float(np.degrees(np.arctan2(-vy, vx)) % 360), 1),
                        "direction": eight_direction(vx, vy),
                        "confidence_ok": bool(w["reliable"]),
                    }
                    # world-space speed (metres, camera frame) when available
                    if rec.get("world_landmarks"):
                        if prev.get("world_landmarks") and nxt.get("world_landmarks"):
                            aw = prev["world_landmarks"][w["landmark_index"]]
                            bw = nxt["world_landmarks"][w["landmark_index"]]
                            vwx = (bw["x"] - aw["x"]) / dt
                            vwy = (bw["y"] - aw["y"]) / dt
                            vwz = (bw["z"] - aw["z"]) / dt
                            entry["speed_m_s"] = round(float(np.sqrt(vwx**2 + vwy**2 + vwz**2)), 4)
                    dt_info[key] = entry
            elif key not in dt_info:
                dt_info[key] = {"confidence_ok": bool(w["reliable"]), "note": "not_computable"}
        rec["wrist_motion"] = dt_info

    # ------------------------------------------------------------------
    # summary
    # ------------------------------------------------------------------
    total = len(frames_json)
    detected = detected_frames
    summary = {
        "total_frames": total,
        "detected_frames": detected,
        "failed_frames_count": len(failed_frames),
        "detection_rate": round(detected / total, 4) if total else 0.0,
        "segmentation_mask_frames": mask_ok_frames,
        "segmentation_rate": round(mask_ok_frames / total, 4) if total else 0.0,
        "left_wrist": {
            "frames_with_landmark": wrist_stats["left"]["present"],
            "frames_reliable_vis_ge_0.5": wrist_stats["left"]["reliable"],
            "completeness": round(wrist_stats["left"]["reliable"] / total, 4) if total else 0.0,
        },
        "right_wrist": {
            "frames_with_landmark": wrist_stats["right"]["present"],
            "frames_reliable_vis_ge_0.5": wrist_stats["right"]["reliable"],
            "completeness": round(wrist_stats["right"]["reliable"] / total, 4) if total else 0.0,
        },
        "processing_seconds": round(time.time() - t_start, 1),
    }

    payload = {
        "meta": {
            "project": "DanceFX phase 1 - motion tracking experiment",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source_video": str(VIDEO.name),
            "video_path": str(VIDEO),
            "width": width,
            "height": height,
            "fps": fps,
            "frame_count": total,
            "duration_s": pts[-1] if pts else None,
            "timestamp_source": "ffprobe frame pts_time (container, original)",
            "engine": "Google MediaPipe Tasks - PoseLandmarker",
            "model": MODEL.name,
            "model_variant": "heavy",
            "running_mode": "VIDEO",
            "segmentation_masks": True,
            "num_poses": 1,
            "note": (
                "Coordinates are written exactly as produced by MediaPipe. "
                "Frames where detection failed are listed in failed_frames and "
                "contain NO landmark data (no fabricated coordinates)."
            ),
        },
        "summary": summary,
        "failed_frames": failed_frames,
        "frames": frames_json,
    }

    with open(OUT_JSON, "w") as f:
        json.dump(payload, f, ensure_ascii=False)

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"motion.json -> {OUT_JSON}")
    print(f"preview     -> {OUT_PREVIEW}")


if __name__ == "__main__":
    main()
