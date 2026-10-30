# Spine 冒烟测试：能力边界与真实导出记录

## 播放器
- `src/spine/RealSpinePlayer.tsx`：加载并渲染真实 Stretchy Spine 导出。
- `src/spine/loadSpine.ts`：解析 `skeleton.json`，丢弃模型伪影层，转换内部结构。
- `src/spine/spineEval.ts`：纯函数求值器（帧→全身世界变换），坐标：内部在 Spine Y-up 世界计算，最后转画布 Y-down。
- `src/spine/testSkeleton.ts` / `SpinePlayer.tsx`：早期手写数据版，保留作参考，当前未接入。

## 支持
- region 附件、slot 遮挡顺序
- 骨骼 translate / rotate / scale 时间轴，linear 插值
- 姿态是帧的纯函数，拖时间轴逐帧正确
- 动画时间单位秒，与导出 fps 无关

## 明确不支持（Studio 内红色警告条展示，不静默忽略）
- mesh 附件（顶点网格）
- deform / draw-order / IK / transform / path 约束时间轴
- slot 颜色时间轴
- bezier 缓动（近似 linear 并上报）

播放器不是完整 Spine 运行时。

## 真实导出实测发现（Spine ZIP）
1. **`animations` 为空 `{}`** —— 导出里没有任何关键帧。播放器当前注入一段**明确标注**的测试动作（头摆 + 呼吸）来演练骨架。
2. **部分层绑定到 `root`**：eyewhite / irides / eyelash / eyebrow / ears / legwear / handwear 未绑到 head 或对应骨，仅 back_hair / face / mouth / nose / front_hair / headwear 绑到 head，topwear 绑到 torso。因此头部旋转时眼睛/睫毛等不跟随。
3. **伪影层被导出**：`neckwear`、`headwear`（模型误判的背景残留）。播放器在加载时丢弃并上报。
4. **导出的 images 未清洗**：其 `back_hair.png` 含紫色背景框；已用本地清洗版本同名替换。
5. 骨架含 leftArm/rightArm/leftElbow/rightElbow/leftLeg/rightLeg/leftKnee/rightKnee/eyes 等骨，但当前 Q 版素材无可分离的手臂/腿层。

## 后续需要（在 Stretchy 内）
- 建一个动画 Clip 并打关键帧（否则导出 `animations` 恒为空）。
- 隐藏 `neckwear` / `headwear` 再导出。
- 校正层标签/绑定，使眼睛、睫毛、眉毛、耳朵归到 head。
- 校对各关节轴心后再导出。
