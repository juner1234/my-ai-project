#!/usr/bin/env python3
"""DanceFX phase 1 - tracking quality analysis (reads motion.json only)."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "tracking" / "motion.json").read_text())

frames = data["frames"]
s = data["summary"]
print("=== summary ===")
print(json.dumps(s, indent=2))
print("video:", data["meta"]["width"], "x", data["meta"]["height"],
      data["meta"]["fps"], "fps,", data["meta"]["frame_count"], "frames,",
      data["meta"]["duration_s"], "s")

# --- failed frames: which ranges ---
ff = data["failed_frames"]
print("\n=== failed frames (%d) ===" % len(ff))
runs = []
for f in ff:
    if runs and f["frame"] == runs[-1][-1] + 1:
        runs[-1].append(f["frame"])
    else:
        runs.append([f["frame"])
             if False else [f["frame"]])
print("indices:", [f["frame"] for f in ff])
print("timestamps_s:", [round(f["timestamp_ms"] / 1000, 3) for f in ff])

# --- visibility stats per key joint ---
key_idx = {"left_shoulder": 11, "right_shoulder": 12, "left_elbow": 13,
           "right_elbow": 14, "left_wrist": 15, "right_wrist": 16}
vis = {k: [] for k in key_idx}
px = {k: [] for k in key_idx}
for fr in frames:
    if not fr.get("detected"):
        continue
    for k, i in key_idx.items():
        lm = fr["landmarks"][i]
        vis[k].append(lm["visibility"])
        px[k].append((fr["frame"], lm["px"], lm["py"], lm["visibility"]))

print("\n=== visibility of tracked joints ===")
for k, v in vis.items():
    v2 = sorted(v)
    n = len(v2)
    print(f"  {k:14s} n={n}  mean={sum(v)/n:.3f}  "
          f"p10={v2[int(n*0.1)]:.3f}  median={v2[n//2]:.3f}  "
          f"frac_vis>=0.5={sum(1 for x in v if x >= 0.5)/n:.3f}  "
          f"frac_vis<0.2={sum(1 for x in v if x < 0.2)/n:.3f}")

# --- jump detection: wrist displacement between consecutive detected frames ---
print("\n=== wrist jump analysis (pixel displacement between adjacent frames) ===")
for k in ("left_wrist", "right_wrist"):
    seq = px[k]
    disps = []
    for a, b in zip(seq, seq[1:]):
        if b[0] - a[0] != 1:      # skip across gaps
            continue
        d = math.hypot(b[1] - a[1], b[2] - a[2])
        disps.append((b[0], d, a[3], b[3]))
    ds = sorted(d for _, d, _, _ in disps)
    n = len(ds)
    med = ds[n // 2]
    p95 = ds[int(n * 0.95)]
    p99 = ds[int(n * 0.99)]
    mx = ds[-1]
    # "jump" = displacement far beyond typical motion, only when both frames confident
    thresh = max(120, p99 * 3)
    jumps = [(f, round(d, 1), round(va, 2), round(vb, 2))
             for f, d, va, vb in disps if d > thresh]
    print(f"  {k}: median={med:.1f}px  p95={p95:.1f}px  p99={p99:.1f}px  "
          f"max={mx:.1f}px  jumps>{thresh:.0f}px: {len(jumps)}")
    for j in jumps[:15]:
        print(f"      frame {j[0]} disp={j[1]}px vis {j[2]}->{j[3]}")

# --- left/right swap heuristic: do the two wrists cross implausibly? ---
print("\n=== left/right wrist separation & swap suspicion ===")
seps = []
for fr in frames:
    if not fr.get("detected"):
        continue
    lw = fr["landmarks"][15]
    rw = fr["landmarks"][16]
    if lw["visibility"] < 0.5 or rw["visibility"] < 0.5:
        continue
    d = math.hypot(lw["px"] - rw["px"], lw["py"] - rw["py"])
    seps.append((fr["frame"], d))
if seps:
    ds = sorted(d for _, d in seps)
    print(f"  frames with both wrists visible: {len(seps)}  "
          f"min sep={ds[0]:.1f}px median={ds[len(ds)//2]:.1f}px")
    close = [(f, round(d, 1)) for f, d in seps if d < 30]
    print(f"  frames with both wrists < 30px apart (possible confusion): {len(close)}")
    print("   ", close[:20])

# --- speed spikes ---
print("\n=== wrist speed distribution (px/s, central difference) ===")
for k in ("left", "right"):
    sp = []
    for fr in frames:
        if not fr.get("detected"):
            continue
        m = fr.get("wrist_motion", {}).get(k, {})
        if "speed_px_s" in m:
            sp.append((fr["frame"], m["speed_px_s"], m.get("direction"), m.get("confidence_ok")))
    if not sp:
        print(f"  {k}: none")
        continue
    vals = sorted(x[1] for x in sp)
    n = len(vals)
    print(f"  {k}: n={n} median={vals[n//2]:.0f}  p95={vals[int(n*.95)]:.0f}  "
          f"p99={vals[int(n*.99)]:.0f}  max={vals[-1]:.0f} px/s")
    top = sorted(sp, key=lambda x: -x[1])[:5]
    print("      fastest:", [(f, int(v), d, ok) for f, v, d, ok in top])
    low_conf = [x for x in sp if not x[3]]
    print(f"      samples with vis<0.5 (flagged unreliable): {len(low_conf)}/{n}")

# --- segmentation ---
print("\n=== segmentation ===")
cov = [fr["segmentation"].get("coverage") for fr in frames
       if fr.get("detected") and fr["segmentation"].get("available")]
if cov:
    cov_s = sorted(cov)
    print(f"  masks: {len(cov)}/{len(frames)}  coverage "
          f"min={cov_s[0]:.3f} median={cov_s[len(cov_s)//2]:.3f} max={cov_s[-1]:.3f}")
    empty = sum(1 for c in cov if c <= 0)
    print(f"  empty masks: {empty}")

# --- out-of-frame wrist ---
print("\n=== wrists outside frame bounds ===")
for k, i in (("left_wrist", 15), ("right_wrist", 16)):
    out = 0
    for fr in frames:
        if not fr.get("detected"):
            continue
        lm = fr["landmarks"][i]
        if lm["visibility"] >= 0.5 and not (0 <= lm["x"] <= 1 and 0 <= lm["y"] <= 1):
            out += 1
    print(f"  {k}: {out} frames with vis>=0.5 but normalized coords outside [0,1]")

# --- hands crossing midline (possible left/right error) ---
print("\n=== side-label sanity (person's left should be screen-right if facing camera) ===")
cross_lr = 0  # left wrist on screen-left half while vis high
tot = 0
for fr in frames:
    if not fr.get("detected"):
        continue
    lw = fr["landmarks"][15]
    rw = fr["landmarks"][16]
    if lw["visibility"] >= 0.5:
        tot += 1
        if lw["x"] < 0.5:
            cross_lr += 1
print(f"  left wrist x<0.5 (screen-left): {cross_lr}/{tot} confident frames "
      f"({cross_lr/tot:.1%})" if tot else "  no confident frames")

print("\n=== failed-frame contiguity ===")
print("  failed frame ids:", [f["frame"] for f in ff])
