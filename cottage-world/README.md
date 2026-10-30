# 苔光小屋：制作链路与交互验证

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
- Poly Haven API 和 ambientCG 官网请求在环境代理处被 403 拦截，不能宣称已下载其高清材质。
- Godot 编辑器尝试打开远程调试监听时受沙箱限制；独立 headless 功能测试仍能正常完成。

## 用 Mac 网络补齐高清材质

`art/download_pbr_on_mac.py` 使用 Python 标准库，通过已确认的 Clash HTTP 混合端口 7900 访问官方 Poly Haven 目录，选择木纹、灰泥和苔藓类的 2k 颜色/法线/粗糙度贴图。不是生成模型或消耗 AI 额度的程序。

文件仅保存到 Mac 的 Downloads 下新建的带时间目录，不修改现有项目、Git 分支或密钥。保留官方来源、可用的 MD5 校验及 SHA256 记录，分成小于附件限制的 ZIP 文件，便于上传回聊天。使用前已经过语法和离线 API 数据选择测试；本云环境无法访问该 API，所以没有把端到端下载标成已验证。

```bash
python3 art/download_pbr_on_mac.py --proxy http://127.0.0.1:7900
```

拿到真实 PBR 素材后继续替换当前程序材质和精修建筑/植被；纹理下载本身不等于已达到参考图质量。正式人物、骨骼、裙装/头发动画仍需单独制作或取得适用模型。

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
