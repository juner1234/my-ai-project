# 把星星送回家

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
