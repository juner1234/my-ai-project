"""Gothic 5-second environment-only animation. Keeps the original girl untouched.
Requires: Pillow, numpy, ffmpeg (for MP4). No API, no image generation.
Place in experiments/gothic-animation/tools/ and run with python3.
"""
from pathlib import Path
import math, shutil, subprocess
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source/source.jpeg'
OUT = ROOT / 'out/preview'
FRAMES = OUT / 'frames_environment'
FPS, SECONDS = 15, 5
WIDTH = 960

if not SOURCE.exists():
    raise SystemExit(f'Cannot find source: {SOURCE}')
OUT.mkdir(parents=True, exist_ok=True)
FRAMES.mkdir(parents=True, exist_ok=True)
original = Image.open(SOURCE).convert('RGB')
height = round(original.height * WIDTH / original.width / 2) * 2
base = original.resize((WIDTH, height), Image.Resampling.LANCZOS)
w, h = base.size
sx, sy = w / original.width, h / original.height
Y, X = np.mgrid[0:h, 0:w].astype(np.float32)
base_arr = np.asarray(base, dtype=np.float32)

# Environment effects are restricted to the far-right castle/sky region.
# This avoids touching the girl, hair, ribbons, dress, house and roses.
right_gate = np.clip((X / sx - 770) / 120, 0, 1)
vertical_gate = np.clip((Y / sy - 45) / 75, 0, 1) * np.clip((480 - Y / sy) / 100, 0, 1)
region = right_gate * vertical_gate

# Light positions are approximate based on the grid; do not reshape windows.
lights = [(350, 407, 30, 44, .065), (815, 386, 19, 30, .045)]
for frame in range(FPS * SECONDS):
    t = frame / FPS
    phase = 2 * math.pi * t / SECONDS
    fog = np.zeros((h, w), dtype=np.float32)
    for i, (cx, cy, rx, ry, strength) in enumerate([
        (930, 250, 175, 55, .16), (1080, 300, 165, 70, .14),
        (840, 205, 125, 40, .085), (1000, 370, 185, 55, .085)
    ]):
        drift = 17 * math.sin(phase + i * .7) + 9 * t
        xx = (X / sx - (cx + drift)) / rx
        yy = (Y / sy - (cy + 5 * math.sin(phase + i))) / ry
        fog += strength * np.exp(-2 * (xx * xx + yy * yy))
    fog = np.clip(fog * region, 0, .26)[..., None]
    fog_color = np.array([163, 175, 181], dtype=np.float32)
    arr = base_arr * (1 - fog) + fog_color * fog

    # Very gentle, local warm light shimmer over existing lit windows.
    for i, (cx, cy, rx, ry, power) in enumerate(lights):
        xx = (X / sx - cx) / rx
        yy = (Y / sy - cy) / ry
        halo = np.exp(-2.2 * (xx * xx + yy * yy))
        pulse = .65 + .35 * math.sin(2 * math.pi * (.62 + i * .11) * t + i)
        amp = (power * pulse * halo)[..., None]
        arr += amp * np.array([105, 63, 22], dtype=np.float32)

    # Copy the entire original girl's zone verbatim: no body or clothing motion.
    # Mask softly around its edges to avoid any visible rectangular boundary.
    protect_x = np.clip((X / sx - 490) / 30, 0, 1) * np.clip((780 - X / sx) / 30, 0, 1)
    protect_y = np.clip((Y / sy - 260) / 25, 0, 1)
    protect = (protect_x * protect_y)[..., None]
    arr = arr * (1 - protect) + base_arr * protect
    Image.fromarray(np.uint8(np.clip(arr, 0, 255)), 'RGB').save(FRAMES / f'frame_{frame:04d}.png')
    if frame % 15 == 0: print(f'Frame {frame+1}/{FPS*SECONDS}', flush=True)

mp4 = OUT / 'gothic-environment-test.mp4'
ffmpeg = shutil.which('ffmpeg')
if ffmpeg:
    cmd = [ffmpeg, '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i',
           str(FRAMES / 'frame_%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
           '-crf', '20', '-movflags', '+faststart', str(mp4)]
    subprocess.run(cmd, check=True)
    print(f'Video ready: {mp4}')
else:
    print('PNG frames ready:', FRAMES)
    print('ffmpeg was not found. Install ffmpeg to create MP4, or import frames into Remotion.')
