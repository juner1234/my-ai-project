# 新版声音素材

## 第七版

同一用户提供的 Scott Buckley《Reverie》，使用开头 34 秒连续节选。0.7 秒淡入、3.3 秒淡出；原场景音效依据新镜头顺序重排，不拉伸音乐速度。其余来源与署名说明同第六版。

## 第六版配乐：Reverie

- 用户上传文件：`sb_reverie.mp3`。文件标签标注曲名 `Reverie`、作者 `Scott Buckley`、年份 `2020`、专辑/来源 `www.scottbuckley.com.au/library`，全长约 223.7 秒。
- 第六版使用开头 0–42 秒连续节选，1.8 秒淡入、4.2 秒淡出；调整音乐与场景音效的平衡、关键事件处轻微压低音乐并统一成片响度。
- 作者音乐库：https://www.scottbuckley.com.au/library/ 。曲目原先选定的作品页：https://www.scottbuckley.com.au/library/reverie/ 。本环境对官网请求仍被拦截；未独立核验该曲具体授权页面，不把文件标签当作授权证据。
- 播放器和视频元数据保留作者、曲名、来源及节选/混音说明。用户上传的完整原曲存放于工作区附件目录，不单独上传到公开仓库。
- 第六版无 MDN lo-fi 循环。下面的 MDN 素材说明仅适用于历史第二版。

## 现成音乐

- 素材：`rnb-lofi-melody-loop.wav`，7.5 秒立体声旋律循环，重复编排至 42 秒。
- 来源：MDN 官方 Web Audio 示例仓库。
- 固定来源版本：`5582dbc39f241117c27c516b21243b041dc69fcb`。
- 文件：https://github.com/mdn/webaudio-examples/blob/5582dbc39f241117c27c516b21243b041dc69fcb/audio-buffer-source-node/loop/rnb-lofi-melody-loop.wav
- 仓库授权：CC0 1.0；授权文本随素材保存在 `MDN-CC0-LICENSE.txt`。该样本路径未附单独署名或不同授权说明，不推测演奏者或曲名。
- 使用方式：保持原有旋律和节奏循环，调整音量、淡入淡出，搭配情节音效。不是一首全长商用歌曲，也不是上一版程序生成的旋律。

## 音效

脚步、风声、电车低频与轮轨节奏、星光与结尾提示音由 `tools/build_soundtrack.py` 本地合成，未使用未注明来源的第三方录音。

## 混音

成片目标综合响度为 -18 LUFS，真峰值限制 -1.5 dBTP；关键事件处轻压音乐，为音效留出空间。声音效果按六幕情节分段出现。
