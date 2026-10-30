import os
import numpy as np
import cv2

W, H, FPS, N = 1280, 720, 30, 300
os.makedirs("poc/frames/left", exist_ok=True)
os.makedirs("poc/frames/right", exist_ok=True)
for n in range(N):
    L = np.full((H, W, 3), 26, np.uint8)
    cv2.putText(L, f"L {n:03d}", (60, H // 2 + 70), cv2.FONT_HERSHEY_SIMPLEX, 6.0, (255, 255, 255), 12, cv2.LINE_AA)
    cv2.rectangle(L, (0, 0), (int(n / N * W), 20), (255, 255, 255), -1)
    cv2.imwrite(f"poc/frames/left/{n:04d}.png", L)

    R = np.full((H, W, 3), (60, 30, 20), np.uint8)
    cv2.putText(R, f"R {n:03d}", (60, H // 2 + 70), cv2.FONT_HERSHEY_SIMPLEX, 6.0, (80, 220, 255), 12, cv2.LINE_AA)
    cv2.rectangle(R, (0, 0), (int(n / N * W), 20), (80, 220, 255), -1)
    cv2.imwrite(f"poc/frames/right/{n:04d}.png", R)

print("frames done:", N)
