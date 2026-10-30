# 素材来源与验证

## 下载的官方道具

- Lantern：Microsoft（2017），初始版本 sbtron；CC0 1.0。官方 Khronos glTF Sample Assets 仓库。
- GlassVaseFlowers：玻璃花瓶 Eric Chadwick、花卉 Rico Cilliers（2023）；CC0 1.0。官方 Khronos glTF Sample Assets 仓库。
- 完整原始说明分别存放在 `vendor/*-README.md`；来源 URL、下载字节数与 SHA256 存放在 `vendor/manifest.json`。GLB 文件头已验证。

## 自制技术场景

房屋、分块屋瓦、藤蔓叶片、草地、小湖与基础家具由 `art/build_cottage.py` 生成，Blender 源文件可编辑。便携颜色/法线贴图由 `art/bake_materials.py` 从程序材质烘焙。当前属于技术验证资产，不标为与参考图等质量的正式美术成品。

## 用户上传的 Poly Haven 材质

用户通过 Mac 下载并上传两包 Poly Haven 纹理。已接收 wood_planks_dirt、painted_plaster_wall、mossy_rock 的颜色、OpenGL 法线与粗糙度贴图，共九张 2K 图片；按上传清单中的 SHA256、MD5 记录及大小逐一校验通过。

原始下载来源、字节数与校验记录保存在 `pbr/IMPORT_REPORT.json`。用户下载器按 Poly Haven 官方 CC0 说明记录来源 https://polyhaven.com/license 。本云环境仍被网络策略拦截，未声称独立从官网重新下载或读取许可页。

## 尚未取得的正式模型

匹配参考图质量的正式人物模型尚未取得；现有外部道具中没有人物。当前建筑/植被属于程序化技术场景，不应标作最终高质量模型。
