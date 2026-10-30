# Opus 5.5 视频 Prompt 模式提炼

由 `analyze.mjs` 从 `videos.json` 自动统计（**703** 条含文本：完整 prompt 496 条 + 短句 207 条）。
重新生成：`node reference/opus5-5/analyze.mjs`

## 0. 最重要的结论：三种风格分档（按词数）

| 分档 | 条数 | 占比 | 特点 |
|---|---|---|---|
| 极简（≤15 词） | 165 | 23% | 一句话下需求，细节全交给模型 |
| 中等（16–60 词） | 351 | 50% | 主流写法：主题 + 时长 + 风格 + 一两条约束 |
| 详细（61–200 词） | 129 | 18% | 分段落写死约束，可复现性高 |
| 超长（>200 词） | 58 | 8% | 接近规格书，常含 XML 标签与逐条规则 |

**结论**：中位数 35 词，半数落在「中等」档。所以主流并不是"一句话"，也不是"规格书"，而是**主题 + 时长 + 风格 + 少量硬约束**的中间态。

## 0.1 数据质量提示（影响你怎么读这份统计）

1. **207 条 `prompt_partial: true` 不全是"短 prompt"**。该组中位 36 词，但其中只有约三成是真正的短句，其余是原作者推文摘录（最长 2131 词）。因此本节按**词数**分档，而不是按这个标记分档。
2. **存在重复条目**：11 组完全相同的 prompt，共涉及 30 条记录（最多的一组出现 7 次，作者用同一条 prompt 做了多个视频）。这会让下文高频词统计略微偏向重复内容，但不影响结论方向。
3. 高频词统计**只用 496 条完整 prompt**，并剔除了 `opus` / `claude` / `5.5` 这类来自推文正文的模型名噪声。

## 1. 长度分布（完整 prompt）

| 指标 | 词数 |
|---|---|
| 最短 | 1 |
| 25% | 18 |
| 中位数 | 35 |
| 平均 | 104 |
| 75% | 73 |
| 最长 | 1787 |

**结论**：中位数 35 词。即使"写得很细"的那一半，也就 73 词封顶——仍然是一段话，不是规格书。

## 2. 结构特征命中率（完整 prompt）

| 特征 | 命中 | 占比 |
|---|---|---|
| 命令式开头（Make/Create/Build…） | 249 | 50% |
| 明确时长 | 184 | 37% |
| 指定输出技术 | 177 | 36% |
| 音效 / 音频 | 126 | 25% |
| 明确禁止项（do not / avoid） | 76 | 15% |
| 品质形容词（world-class / best / professional） | 71 | 14% |
| 画幅比例 | 67 | 14% |
| 分点 / 编号要求 | 60 | 12% |
| 交互 / 可玩 | 57 | 11% |
| 循环 / 无缝 | 38 | 8% |
| XML 标签分段 | 31 | 6% |
| 第一人称叙述（I want / I've included） | 29 | 6% |
| 单文件 / 自包含 | 29 | 6% |
| 点名 Remotion / 帧驱动 | 26 | 5% |
| 提供素材/参考 | 17 | 3% |
| 角色扮演（Act as / Pretend you are） | 12 | 2% |
| 请求式开头（Can you / Could you） | 6 | 1% |
| Markdown 小标题 | 6 | 1% |
| 代码块/反引号 | 3 | 1% |
| 禁止解释（no explanation） | 0 | 0% |

**读法**：占比高的就是「行业惯例」，写 prompt 时可以照抄；占比低的是「高级技巧」，用了显专业。

## 3. 最常见开头两词

| 开头 | 次数 |
|---|---|
| `make a` | 94 |
| `create a` | 71 |
| `i want` | 23 |
| `inputs ask` | 21 |
| `build a` | 14 |
| `create an` | 11 |
| `build me` | 10 |
| `you are` | 7 |
| `can you` | 6 |
| `make an` | 5 |
| `show me` | 4 |
| `make me` | 4 |
| `build an` | 4 |
| `make this` | 3 |
| `render a` | 3 |
| `帮我做一个原创的手游 高光时刻` | 3 |
| `build the` | 3 |
| `please create` | 3 |

## 4. 高频词组（已剔除模型名噪声）

### 二元词

| 词组 | 次数 |
|---|---|
| `create a` | 99 |
| `motion graphics` | 82 |
| `the camera` | 61 |
| `graphics video` | 54 |
| `the same` | 52 |
| `html file` | 48 |
| `video for` | 48 |
| `the first` | 47 |
| `ask me` | 46 |
| `one html` | 45 |
| `a dynamic` | 44 |
| `go all` | 43 |
| `120 bpm` | 40 |
| `the beat` | 40 |
| `motion designer` | 38 |
| `a single` | 38 |
| `the cursor` | 37 |
| `every frame` | 37 |
| `video that` | 36 |
| `that shows` | 35 |
| `the last` | 34 |
| `the best` | 32 |
| `an incredible` | 32 |
| `last frame` | 30 |
| `the video` | 30 |

### 三元词

| 词组 | 次数 |
|---|---|
| `motion graphics video` | 54 |
| `make a dynamic` | 38 |
| `ask me for` | 37 |
| `one html file` | 34 |
| `what an incredible` | 30 |
| `go all out.` | 30 |
| `shows what an` | 29 |
| `graphics video that` | 27 |
| `that shows what` | 27 |
| `an incredible motion` | 26 |
| `incredible motion designer` | 26 |
| `motion designer you` | 26 |
| `video that shows` | 25 |
| `on the beat` | 24 |
| `15-second motion graphics` | 23 |
| `inputs ask me` | 22 |
| `the last frame` | 22 |
| `black and white` | 21 |
| `/structure build 1.` | 20 |
| `a royalty-free song` | 19 |

## 5. 高频单词（前 40）

`video`(284) · `every`(252) · `motion`(244) · `frame`(178) · `create`(146) · `camera`(124) · `build`(118) · `each`(114) · `product`(114) · `real`(110) · `about`(97) · `html`(92) · `beat`(91) · `ui`(90) · `animation`(88) · `per`(87) · `first`(86) · `graphics`(86) · `render`(84) · `3d`(84) · `through`(78) · `cursor`(77) · `inside`(77) · `style`(76) · `black`(76) · `never`(75) · `music`(75) · `before`(75) · `show`(74) · `go`(73) · `text`(70) · `line`(69) · `bar`(68) · `file`(68) · `think`(67) · `back`(66) · `dynamic`(65) · `sound`(65) · `same`(64) · `only`(64)

## 6. 技术栈分布

| 技术 | 条数 |
|---|---|
| canvas | 267 |
| svg | 183 |
| threejs | 131 |
| shader | 92 |
| gsap | 86 |
| css | 57 |
| audio | 39 |
| playable | 22 |
| particles | 17 |
| pixel | 15 |
| webgl | 9 |
| physics | 9 |
| ai-image | 6 |

---

# 7. 模板配方（数据归纳 + 可直接套用）

以下五套按上文频率归纳。方括号是填空位。

## 配方 A · 短句式（最短，最省事）

```text
[风格/品牌]-style [时长] video of [主题]
```

真实样本：`an Apple-style 30s video of my app`

## 配方 B · 命令式（占比最高，249/496）

```text
Make a [时长] [风格] [产物形式] about [主题].
Use [技术] so it runs in the browser. [1–2 条硬约束]
```

## 配方 C · 角色扮演式

```text
Act as a world-class [motion designer / animator / director].
Create a [时长] [产物] of [主题], in the style of [参考]. [约束]
```

## 配方 D · 结构化 XML 式（长 prompt 派的代表）

```text
<inputs>
  需要我提供什么：[素材/参数/尺寸/配色/BPM]
</inputs>
<direction>
  视觉方向、动效原则、镜头与节奏
</direction>
<deliverable>
  输出形式：[单文件 HTML / 技术栈]；[时长]；[比例]
</deliverable>
<rules>
  必须：… ；禁止：…（no explanation, only output）
</rules>
```

## 配方 E · 端到端复刻式

```text
I've included [素材: MP4 / 原视频链接 / 音频].
Do an end-to-end pass and make an updated version.
Use the exact same [audio track / structure / pacing], and [改动要求].
```

## 通用检查清单（写完 prompt 后过一遍）

| 项 | 是否写了 |
|---|---|
| 时长（几秒） | ☐ |
| 比例 / 平台（9:16 竖屏 / 16:9） | ☐ |
| 输出形式与技术栈 | ☐ |
| 视觉风格 / 参考对象 | ☐ |
| 音效或 BPM | ☐ |
| 是否要循环无缝 | ☐ |
| 禁止项（不要解释、不要文字、不要水印） | ☐ |
| 是否需要交互 | ☐ |

---

# 8. 落到 ThreeMotion（Remotion + R3F）的模板

上面的 prompt 都是让模型写「单文件 HTML/Canvas/Three.js」。本项目是 **Remotion 合成**，需要多两条硬约束才符合本仓库约定：

```text
Act as a world-class motion designer.

Create a Remotion composition for [主题] in [时长] seconds at 30fps, 1920x1080.

<rules>
  - Use React Three Fiber (@react-three/fiber) with @remotion/three's ThreeCanvas.
  - All animation MUST be a pure function of useCurrentFrame() / useVideoConfig().
  - Do NOT use useFrame, three's Clock, or requestAnimationFrame.
  - Export one component; register it in src/Root.tsx as a new <Composition />.
  - Put the 3D scene under src/scenes/, keep the composition entry thin.
  - Style: [风格]. Camera: [运镜]. Lighting: [灯光].
  - No text overlays unless asked. No external assets.
</rules>
```

写完照 `README.md` 的「关键约定」自检：预览与渲染必须逐帧一致。

## 9. 样本库入口

- 结构化检索：`npm run prompts -- --tech threejs --limit 10`
- 最长/最完整的 prompt（学写法）：见下方「最完整 prompt Top 5」

| slug | 分类 | 词数 |
|---|---|---|
| `froessell-562325` | interactive | 1787 |
| `iamtanzil-120030` | motion | 1432 |
| `anabology-491441` | motion | 1738 |
| `redpersongpt-284430` | interactive | 1389 |
| `brainextends-606193` | motion | 1210 |

