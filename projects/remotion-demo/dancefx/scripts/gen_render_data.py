#!/usr/bin/env python
"""Phase 4-Render：从 DanceFX 工程 + tracking/motion.json 生成 Remotion 效果数据。
只读，不修改任何既有工程数据。
输出：/Users/mac/Desktop/remotion-demo/src/dancefx/dancefx-data.json
"""
import json, os, sys

DFX = "/Users/mac/Desktop/remotion-demo/dancefx"
OUT = "/Users/mac/Desktop/remotion-demo/src/dancefx/dancefx-data.json"

# 已确认的三条效果描述（FX-002 / FX-004 / FX-005）
DESCRIPTIONS = {
    "FX-002": "左手腕牵引的上升能量轨迹：沿弧线蓄力上冲，末尾随双臂上举爆发光环",
    "FX-004": "身体中心的下坠冲击：自上而下的扫描光随身体下沉，落地激起地面涟漪",
    "FX-005": "右手腕的抛射箭头：沿箭头方向上抛，留下彗尾并在末端闪击",
}


def load_project():
    lib_path = os.path.join(DFX, "projects.json")
    if os.path.exists(lib_path):
        lib = json.load(open(lib_path, encoding="utf-8"))
        cur = lib.get("current")
        if cur and cur in lib.get("projects", {}):
            return lib["projects"][cur]["project"]
    return json.load(open(os.path.join(DFX, "project.json"), encoding="utf-8"))


def norm_xy(frames, idxs):
    """返回逐帧归一化中心点 [[x,y]|None, ...]"""
    out = []
    for fr in frames:
        if not fr.get("detected"):
            out.append(None); continue
        lms = fr.get("landmarks") or []
        pts = [lms[i] for i in idxs if i < len(lms)]
        if not pts:
            out.append(None); continue
        x = sum(p["x"] for p in pts) / len(pts)
        y = sum(p["y"] for p in pts) / len(pts)
        out.append([round(x, 5), round(y, 5)])
    return out


def main():
    proj = load_project()
    motion = json.load(open(os.path.join(DFX, "tracking", "motion.json"), encoding="utf-8"))
    meta = motion["meta"]
    frames = motion["frames"]
    fps = float(meta["fps"])

    anchors = {
        "left_wrist": [[round(fr["wrists"]["left"]["x"], 5), round(fr["wrists"]["left"]["y"], 5)]
                       if fr.get("detected") and fr.get("wrists", {}).get("left") else None for fr in frames],
        "right_wrist": [[round(fr["wrists"]["right"]["x"], 5), round(fr["wrists"]["right"]["y"], 5)]
                        if fr.get("detected") and fr.get("wrists", {}).get("right") else None for fr in frames],
        "body_center": norm_xy(frames, [11, 12, 23, 24]),
    }

    nodes = []
    for n in proj["nodes"]:
        anns = [{"tool": a["tool"], "points": [[round(p["x"], 5), round(p["y"], 5)] for p in a["points"]]}
                for a in n.get("creative", {}).get("annotations", [])]
        nodes.append({
            "id": n["id"],
            "startFrame": int(round(n["start"] * fps)),
            "durationFrames": int(round(n["duration"] * fps)),
            "followTarget": n.get("creative", {}).get("followTarget", "none"),
            "color": "#ff4d6d",
            "description": DESCRIPTIONS.get(n["id"], n.get("creative", {}).get("description", "")),
            "annotations": anns,
        })

    data = {
        "video": {"file": "dancefx-dance.mp4", "width": meta["width"], "height": meta["height"],
                  "fps": fps, "frames": len(frames)},
        "nodes": nodes,
        "anchors": anchors,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("wrote", OUT)
    print("video", data["video"])
    for n in nodes:
        print("node", n["id"], "frames", n["startFrame"], "+", n["durationFrames"],
              "target", n["followTarget"], "anns", len(n["annotations"]))


if __name__ == "__main__":
    main()
