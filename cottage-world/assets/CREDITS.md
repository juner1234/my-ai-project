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

## 林间环境补充

`Forest ` 对象的树木、弯曲叶片、蕨类、灌木、屋顶苔草和扩展地形由本项目脚本原创生成。`assets/pbr/generated_meadow.png` 为本项目确定性生成的草地底色纹理；不是第三方下载材质。树木共享网格。三时段预览直接渲染自这些模型；远景使用深度雾合成，天空为程序化云层。

## Sapling 树形生成工具

新的 Landscape 枫树、田野枫树、垂柳与低灌木，使用 Blender 官方 add_curve_sapling 生成后转为模型网格；工具来源：blender/blender-addons，提交 b42d68627734cb18af0e6f41537063984313a284。原代码/预设版权归 Blender Foundation 等原作者，许可证 GPL-2.0-or-later，完整许可文本见 art/vendor/COPYING；文件来源与校验值见 art/vendor/SAPLING_SOURCE.json。工具许可证不应被误写成 Poly Haven 的 CC0 许可证。新的植物生成参数、摆放、路径和草丛由本项目制作。

## 摄影云层与加密花园

`Floral ` 对象（野花、玫瑰、花穗、茎叶）由本项目脚本原创生成。天空原图为 HDRI Haven / Poly Haven 的 `the_sky_is_on_fire`，CC0；镜像下载自 Google Filament 固定提交，文件原始 SHA256、尺寸与来源链接见 `assets/sky/SOURCES.json`。本环境通过 GitHub 镜像下载，未声称原站访问恢复，也未重新获取原站条款页。白天使用原始摄影云层的蓝白调色版本，黄昏保留柔粉色；原始 HDR 文件未改写。夜景继续使用原有程序天空和暖灯，不把所有时段都描述成摄影天空。
