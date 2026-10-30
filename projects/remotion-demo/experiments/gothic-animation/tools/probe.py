"""只读探针：取样像素统计 + 生成带坐标网格的参考图（不修改原图）。"""
import numpy as np
from PIL import Image, ImageDraw

SRC = "/Users/mac/Desktop/remotion-demo/experiments/gothic-animation/assets/source/source.jpeg"
OUT_GRID = "/Users/mac/Desktop/remotion-demo/experiments/gothic-animation/out/preview/grid.png"

im = Image.open(SRC).convert("RGB")
W, H = im.size
a = np.asarray(im).astype(np.float32)
print(f"size = {W}x{H}")


def sample(name, x, y, r=6):
    x0, x1 = max(0, x - r), min(W, x + r + 1)
    y0, y1 = max(0, y - r), min(H, y + r + 1)
    blk = a[y0:y1, x0:x1]
    R, G, B = blk[..., 0].mean(), blk[..., 1].mean(), blk[..., 2].mean()
    greenness = G - (R + B) / 2
    print(
        f"{name:22s} ({x:4d},{y:4d})  R={R:6.1f} G={G:6.1f} B={B:6.1f}  "
        f"lum={(0.299*R+0.587*G+0.114*B):6.1f}  G-avg={greenness:+6.1f}"
    )


pts = [
    ("sky_top_left", 60, 30),
    ("sky_mid", 700, 40),
    ("sky_near_castle", 1060, 120),
    ("cloud_dark", 640, 90),
    ("castle_body", 950, 170),
    ("crag_rock", 1000, 300),
    ("fog_band_left", 90, 250),
    ("branch_topright", 1180, 40),
    ("roof_shingle", 400, 60),
    ("roof_dark_under", 300, 130),
    ("house_wall", 500, 250),
    ("house_wall2", 620, 300),
    ("window_warm_L", 360, 400),
    ("window_warm_R", 812, 405),
    ("ivy_on_wall", 470, 210),
    ("rose_white", 330, 220),
    ("annex_roof", 800, 250),
    ("woman_hair", 620, 330),
    ("woman_dress", 620, 560),
    ("woman_dress2", 660, 620),
    ("hair_ribbon", 618, 340),
    ("grass_fg_mid", 300, 600),
    ("grass_fg_right", 950, 620),
    ("grass_mid_left", 150, 500),
    ("bush_left", 120, 430),
    ("bush_right", 1000, 500),
    ("pillar_stone", 1120, 500),
    ("crow_body", 1130, 390),
    ("fence_rail", 1000, 480),
    ("butterfly", 210, 425),
    ("far_left_void", 20, 300),
    ("right_edge", 1240, 350),
]
print("=" * 100)
for n, x, y in pts:
    sample(n, x, y)
print("=" * 100)

# 绿色度统计：判断 vegetation keying 可行性
R, G, B = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * R + 0.587 * G + 0.114 * B
green = G - (R + B) / 2
for thr in (4, 8, 12, 16, 20):
    m = green > thr
    print(f"greenness > {thr:2d}: {m.mean()*100:5.1f}% of pixels")
# 分带统计
for y0, y1, tag in [(0, 200, "top"), (200, 430, "mid"), (430, 660, "bottom")]:
    m = green[y0:y1] > 8
    print(f"  band y={y0}-{y1} ({tag}): green>8 = {m.mean()*100:5.1f}%")

# 亮度直方图关键分位
print("lum percentiles:", [f"{p}={np.percentile(lum,p):.0f}" for p in (5, 25, 50, 75, 95)])

# 网格参考图
g = im.copy()
d = ImageDraw.Draw(g, "RGBA")
for x in range(0, W, 50):
    d.line([(x, 0), (x, H)], fill=(255, 0, 0, 90) if x % 200 == 0 else (0, 200, 255, 60), width=1)
    if x % 100 == 0:
        d.text((x + 2, 2), str(x), fill=(255, 255, 0, 255))
        d.text((x + 2, H - 14), str(x), fill=(255, 255, 0, 255))
for y in range(0, H, 50):
    d.line([(0, y), (W, y)], fill=(255, 0, 0, 90) if y % 200 == 0 else (0, 200, 255, 60), width=1)
    if y % 100 == 0:
        d.text((2, y + 2), str(y), fill=(255, 255, 0, 255))
        d.text((W - 34, y + 2), str(y), fill=(255, 255, 0, 255))
g.save(OUT_GRID)
print("grid ->", OUT_GRID)
