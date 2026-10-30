# 苔光别墅：制作链路与交互验证

**状态：技术样机，未达到用户参考图的最终画质，不是美术定稿。**

用户目标是自然、精细的森系小屋、浓密植被和湖边，以及可编辑室内、可进入房屋的长发裙装人物。最终质感优先于网页部署便利。

## 已实际准备和验证

- 云环境已有 Blender 4.3.2 与 Godot 4.6.3，无需重复下载。
- 木屋、门洞、屋瓦、藤蔓、草地、小湖、室内家具的可编辑 Blender 源文件。
- 便携 GLB 导出，15 套程序材质已烘焙为颜色/法线贴图，30 张图片嵌入 GLB；不是把参考图片贴成背景。
- 从 Khronos 官方示例仓库下载 Lantern、GlassVaseFlowers 道具，附原始 CC0 说明、下载来源和校验值。
- Godot 交互验证：第一人称移动、门开关、墙体碰撞、进屋坡道、家具变换、布局保存恢复。
- 自动检查实际执行并通过：几何与道具加载、编辑/存档恢复、墙体阻挡、从门洞进入室内。

## 未完成及实际限制

- 当前程序化模型和植物仍达不到参考图的复杂度与自然度；技术渲染图只用于检查构图和制作链路。
- 尚无正式长发白裙人物的三维模型、骨骼、头发和服装动画。当前第一人称相机不是最终人物。
- 这台云环境无可见独立 GPU，Blender 使用 CPU 渲染。Godot 使用 headless 检查功能，不代表已验证实时画质或在用户 Mac 上的帧率。
- 实时工程当前采用 Compatibility 作为技术验证设置，不代表最终画质配置或引擎已锁定。正式光照和渲染方案需要在可用 GPU 上验证。
- 云环境仍无法直接访问 Poly Haven API 和 ambientCG。用户已通过 Mac 下载并上传两个素材包，现已收到并校验三套 Poly Haven 2K 材质；不能将这描述为云端官网访问已恢复。
- Godot 编辑器尝试打开远程调试监听时受沙箱限制；独立 headless 功能测试仍能正常完成。

## 用 Mac 网络补齐高清材质

`art/download_pbr_on_mac.py` 使用 Python 标准库整理数据，并调用 Mac 的 `/usr/bin/curl` 下载，通过已确认的 Clash HTTP 混合端口 7900 访问官方 Poly Haven 目录，选择木纹、灰泥和苔藓类的 2k 颜色/法线/粗糙度贴图。避免依赖 Python 单独的证书库，仍保持 TLS 与文件校验。不是生成模型或消耗 AI 额度的程序。

文件仅保存到 Mac 的 Downloads 下新建的带时间目录，不修改现有项目、Git 分支或密钥。保留官方来源、可用的 MD5 校验及 SHA256 记录，分成小于附件限制的 ZIP 文件，便于上传回聊天。使用前已经过语法和离线 API 数据选择测试；本云环境无法访问该 API，所以没有把端到端下载标成已验证。

下载采用 HTTP/1.1，网络中断自动重试并使用 Range 续传；部分文件和已校验下载缓存位于 `~/Library/Caches/MosslightCottage/materials`。重新运行会复用已完成文件。服务器不接受断点时重下载当前文件；文件大小/官方 MD5 不匹配时不会将其接受为完成。TLS 证书失败仍停止，不使用不安全绕过。

```bash
python3 art/download_pbr_on_mac.py --proxy http://127.0.0.1:7900
```

拿到真实 PBR 素材后继续替换当前程序材质和精修建筑/植被；纹理下载本身不等于已达到参考图质量。正式人物、骨骼、裙装/头发动画仍需单独制作或取得适用模型。

## 已接入的用户上传材质

两包共九张 2048×2048 贴图（每套颜色、OpenGL 法线、粗糙度）：

| 素材 | 当前应用 |
| --- | --- |
| wood_planks_dirt | Weathered oak 木构件 |
| painted_plaster_wall | Limewashed plaster 墙面 |
| mossy_rock | Old limestone 石块、石质基础 |

导入时校验包内记录的 SHA256、官方 MD5 记录和字节数；拒绝未声明文件、越界路径、符号链接与损坏文件，校验完成后才写入贴图目录。第一包与第二包合并到 `assets/pbr/IMPORT_REPORT.json`，实际应用到材质的映射见 `assets/pbr/APPLIED.json`。

```bash
python3 art/import_pbr_pack.py /path/to/cottage_materials_02.zip
python3 art/import_pbr_pack.py /path/to/cottage_materials_01.zip
blender --background --factory-startup --python art/apply_pbr_materials.py
```

已重新生成 `.blend` 和含嵌入贴图的 GLB，并通过 Godot 的几何/道具加载、编辑、存档恢复、墙体阻挡和门洞进入测试。`technical_study.jpg` 仍是技术场景渲染，不是最终美术定稿或最终人物预览。

## 运行验证

在本目录用 Godot 4.6.3 导入 `project.godot`，等待导入后运行主场景。点击画面捕获鼠标，WASD 移动，靠近门按 E，Tab 打开家具编辑，Esc 释放鼠标。

```bash
godot --headless --editor --import --quit
godot --headless -- --self-test
```

云端需将 XDG_DATA_HOME、XDG_CONFIG_HOME、XDG_CACHE_HOME 指向可写位置；不要修改 HOME。

## 可重复生成资产

```bash
blender --background --factory-startup --python art/build_cottage.py
blender --background --factory-startup --python art/bake_materials.py
```

Blender 生成细节模型和程序化材质；随后将材质烘焙为便携贴图，导出供实时端读取的 GLB。当前 Blender 构建不含 OpenImageDenoise，已采用更多采样并关闭不可用的降噪功能，未降低安装验证或绕过文件校验。

## 第二轮造型研究

`art/refine_cottage.py` 在已接入 PBR 的 Blender 源文件上增量细化；重复运行会替换这一轮创建的对象，不累积重复植物。包括有真实开口的侧窗、百叶窗和木框、窗台花箱、弯曲折叠叶片、分层玫瑰与绣球花簇，并清除跨越门洞的藤蔓。细化不会将技术样机标为参考图级成品。

```bash
blender --background --factory-startup --python art/refine_cottage.py
```

重新从头生成时依次执行 build_cottage → bake_materials → apply_pbr_materials → refine_cottage，避免生成基础场景时覆盖最终材质/细节。`art/geometry_report.json` 记录此轮网格统计。

Godot 为新叶片与水面接入轻微风动/波纹着色器。headless 验证无法证明 GPU 着色器的画面效果或 Mac 帧率，需在实际图形设备上复核。`index.html` 仅展示静态制作前后对比，不会把图片预览当作可玩的游戏；`material_baseline.jpg` 是已接入材质、未做第二轮造型的对照图。

## 两层别墅与三时段

`art/build_villa.py` 在细化后的 PBR 工程上进行一次结构升级：保留一楼与原材质，将屋顶/山墙抬高，建立二楼真实楼板和楼梯洞口、24 级楼梯、二楼窗、可进入的阳台和花箱。二楼地面高 4.35 米。床移到二楼，家具编辑入口仍保留。

新增混合花带、较高的紫色花穗、低矮雏菊及粉白花朵、阳台花箱与湖边点缀。数量见 `art/villa_report.json`；花多不等于已达到参考图的精细度，当前仍为程序化造型研究。

```bash
blender --background --factory-startup --python art/build_villa.py
```

生成 `villa_day.jpg`、`villa_dusk.jpg`、`villa_night.jpg` 三张同机位实际渲染。源 `.blend` 默认保存白天，并内嵌贴图，单独下载源文件也能保留材质。已升级的文件重复运行仅刷新导出与三张渲染，不重复创建楼层。要从零生成，顺序为 build_cottage → bake_materials → apply_pbr_materials → refine_cottage → build_villa；不要在最终别墅上单独重新执行基础细化脚本。

Godot 左上角新增天空选择框，数字键 1/2/3 分别切换蓝天、黄昏和夜景。切换会同步天空渐变/云层/星空、日月光方向和颜色、环境光、雾与暖灯。阶梯使用与可见踏步匹配的平滑碰撞坡面，避免角色被每一级踏步卡住。二楼、阳台与护栏拥有碰撞。

自动验证覆盖上下楼、二楼阳台进出与护栏阻挡、三时段参数与 UI 同步，以及原有进屋/编辑/存档检查。网页时段按钮已在 Chromium 桌面和手机布局中实际点击验证；它展示静态 Blender 渲染，不能行走。Godot 实时天空着色器的 GPU 画面与 Mac 帧率尚未实测。
