# 素材来源与验证

## 下载的官方道具

- Lantern：Microsoft（2017），初始版本 sbtron；CC0 1.0。官方 Khronos glTF Sample Assets 仓库。
- GlassVaseFlowers：玻璃花瓶 Eric Chadwick、花卉 Rico Cilliers（2023）；CC0 1.0。官方 Khronos glTF Sample Assets 仓库。
- 完整原始说明分别存放在 `vendor/*-README.md`；来源 URL、下载字节数与 SHA256 存放在 `vendor/manifest.json`。GLB 文件头已验证。

## 自制技术场景

房屋、分块屋瓦、藤蔓叶片、草地、小湖与基础家具由 `art/build_cottage.py` 生成，Blender 源文件可编辑。便携颜色/法线贴图由 `art/bake_materials.py` 从程序材质烘焙。当前属于技术验证资产，不标为与参考图等质量的正式美术成品。

## 尚未取得的素材

Poly Haven/ambientCG 高清材质未在云环境下载成功，原因是环境网络策略 403。Mac 材质下载器只保存来自 Poly Haven 官方域名的文件，并保留来源与校验记录。正式人物模型尚未取得，现有外部道具中没有人物。
