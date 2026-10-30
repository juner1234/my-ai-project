# 把星星送回家

## 第六版：Reverie 配乐版

使用用户上传的 Scott Buckley《Reverie》MP3。保留第五版视频流，不重新渲染人物或背景；加入原曲开头 42 秒连续节选、淡入淡出、关键音效处的轻微音乐衰减和统一响度。保留原环境音与情节音效。播放器默认第六版，第五版可供无背景音乐对比。

```bash
python3 tools/score_film.py --music /path/to/sb_reverie.mp3
```

原曲由用户提供且不在公开仓库单独分发。作者和来源见播放器、视频元数据及 `audio/CREDITS.md`；未声称已独立访问官网授权页面。

## 第五版：回归第二版构图

根据用户最新澄清，以第二版 `storyboard.png` 的六幕人物占比、位置、景别与环境关系为参考重新替换人物细节。远景仍保留小人物，不为了展示新面容而放大女孩；较近镜头保留第二版原有的叙事用途。恢复第二版的取景范围与镜头运动参数，不使用第四版局部修订图。

```bash
python3 tools/render_film_v3.py video/storyboard_v5.png --edition v5
```

播放器默认第五版，第二版放在版本列表的第二项，方便直接对比人物与场景的尺度。沿用精致双行字幕和环境音效；《Reverie》仍待官方音频及授权核验。

## 第四版：人物与环境比例

针对捧星星和电车镜头重新构图：女孩与店门、座椅及车窗形成正常尺度参照，增加空间留白。只从修订图中使用第 2、4 格；其余四格继续使用第三版原图，保留不同景别。两处修订镜头减少裁切放大，使用更宽取景。

```bash
python3 tools/render_film_v3.py video/storyboard_v3.png --composition-sheet video/composition_corrections_v4.png --edition v4
```

播放器默认第四版，第三版、第二版可切换对比。第四版仍仅含环境音与音效，《Reverie》尚待取得官方音频并核验授权。

### Mac 本地预览

云端推送不会自动更新用户 Mac 文件。每次交付视频修订时，发送下面的安全同步命令和本地地址；不要用网页托管地址代替本地预览：

```bash
cd /Users/mac/.gemini/antigravity/scratch/my-ai-project &&
git fetch origin &&
git switch video/bring-the-star-home &&
git pull --ff-only origin video/bring-the-star-home &&
open -a "Google Chrome" index.html
```

`file:///Users/mac/.gemini/antigravity/scratch/my-ai-project/index.html`

如本地修改使切换或更新失败，保留文件并排查，不强制覆盖。

## 第三版画面审阅

`bring_the_star_home_v3.mp4`：新版栗棕卷发、轻微忧郁面容的女孩贯穿六幕，保留红色冬装、水彩纸感与蓝金夜色。底部重排为小章名、动态金线、双行衬线字幕和六幕进度点；文字采用二倍分辨率渲染，淡入时轻微上移，标题固定。增加结尾逐渐增强的暖光，电车场景的雪限制在窗外。

播放器默认第三版，提供第二版对比切换。第三版当前仅含环境音和情节音效，无背景音乐，**不是最终配乐版**。

用户选择 Scott Buckley《Reverie》。当前环境对其官方作品页的请求被代理返回 403，未取得音频或独立核验授权。未用旧 lo-fi 冒充该曲。取得官方音频并核验适用授权后，可重新混音：

```bash
python3 tools/render_film_v3.py video/storyboard_v3.png --music /path/to/verified-reverie.mp3
```

当前可重复生成的画面审阅版：

```bash
python3 tools/render_film_v3.py video/storyboard_v3.png
```

第二版：42 秒，720 × 1280，30 fps，H.264 / AAC，无对白，中文字幕。

## 本次调整

- 相机使用浮点仿射采样，消除整数像素取整引发的阶梯式慢移；移动幅度收敛，24 fps 提升至 30 fps。
- 取消每幕整屏淡出，以 0.65 秒画面叠化衔接；标题区保持稳定。
- 替换上一版合成旋律，采用现成的 MDN CC0 lo-fi 旋律循环，搭配脚步、风声、轮轨、星光提示音和结尾音效；来源见 `audio/CREDITS.md`。
- 增加近景暖光晕、电车玻璃反光、结尾窗户光晕，近景中不再另加一颗掠过脸部的星星。
- 第一版 `bring_the_star_home.mp4` 保留，播放器指向 `bring_the_star_home_v2.mp4`。

## 参考分析

已查看 `ass` 中全部六张 PNG：IMG_5258 的暮色坡道与车灯；IMG_5259 的暖色便利店；IMG_5260 的雪地小镇；IMG_5261 的雪夜电车；IMG_5262 的橙黄巷道；IMG_5263 的临海街口。共同语言为水彩/彩铅纸感、明显颗粒、蓝紫暗部与琥珀色光源、微缩场景和星形拼贴。

## 六幕故事

1. 0–7 秒：暮色城市，红外套女孩走近便利店。
2. 7–14 秒：她捡到一颗失去光芒的星星。
3. 14–21 秒：星星带着她穿过巷道。
4. 21–28 秒：女孩坐上驶向雪夜的电车。
5. 28–35 秒：女孩找到一扇黑着的窗。
6. 35–42 秒：星星成为窗中的光，小镇亮起。

这是动态绘本版本：原创生成的分镜插画搭配数字推进、平移、移动星光及尾迹、飘雪、转场与音乐。人物动作主要由分镜呈现，未使用生成式视频或逐帧角色表演；不应将其描述为完整角色动画。

## 再现

在仓库根目录运行：

```bash
python3 tools/render_film.py video/storyboard.png
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of json video/bring_the_star_home_v2.mp4
```

需 Python 3、Pillow、numpy、scipy、FFmpeg 和系统 Noto Serif CJK 字体。生成图保存在 `storyboard.png`，现成音乐素材与授权位于 `audio`。渲染器调用声音脚本混合音乐与音效。现有 `ass` 参考图保持不变。
