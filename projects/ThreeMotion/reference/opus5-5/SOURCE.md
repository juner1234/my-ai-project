# Awesome Opus 5.5 Videos — 本地语料库

## 来源

- 上游仓库：https://github.com/yihui-dev/awesome-opus5-5-videos
- 上游 commit：`92aee2f586ac0715cb3cbcb6384834f98a33383d`（2026-10-13T14:46:40Z）
- 拉取日期：2026-10-19
- 许可证：MIT（见同目录 `LICENSE`，覆盖本目录内的文本内容）

## 内容

```
videos.json    703 条记录（机器可读，已含 prompt 全文）
prompts/       703 个 .md，每个视频一个，带分类 / 技术栈 / 原作者推文链接 / prompt 原文
index.json     由 videos.json 生成的索引（按 category 与 tech 分组）
search.mjs     命令行检索工具
```

`videos.json` 每条记录字段：

| 字段 | 说明 |
|---|---|
| `slug` | 唯一标识，与 `prompts/<slug>.md` 对应 |
| `author` / `author_url` | 原作者 |
| `post_url` | 原推文链接 |
| `category` | `explainer` / `motion` / `3d` / `game` 等 |
| `tech_tags` | 实现技术：`canvas` / `svg` / `three` / `css` / `gsap` 等 |
| `prompt` | prompt 全文 |
| `prompt_partial` | 上游未公开完整 prompt 时为 `true` |
| `poster_url` | 预览图（远程，未下载到本地） |
| `skillry_url` | 上游付费站点的对比页（商业导流链接） |
| `added` / `has_remake` | 收录日期 / 是否有 remake |

## 使用

```bash
# 按关键词检索 prompt
npm run prompts -- three

# 按分类或技术栈过滤
npm run prompts -- --tech three --limit 10
npm run prompts -- --category 3d
```

## 注意事项

- 本目录是**参考语料**，不参与 Remotion 构建，不影响打包产物。
- `prompt` 是**输入灵感**，不是精密工程模板：多为一句话的自然语言描述。
- `skillry_url` / `poster_url` 指向上游商业站点，仅作溯源，本项目不依赖它们。
- 预览图未落盘，避免仓库体积膨胀；需要看图时用 `poster_url`。
- 上游可能继续更新，如需同步：重新拉取 tarball 覆盖 `videos.json` 与 `prompts/`，再执行 `node reference/opus5-5/build-index.mjs`。
