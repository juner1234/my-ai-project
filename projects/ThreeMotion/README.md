# ThreeMotion

Three.js + React Three Fiber (@react-three/fiber) + Remotion (@remotion/three) 的 3D 动画项目。

独立于 `remotion-demo`，不依赖也不影响其它项目。

## 环境

- Node.js v24.21.0（本机已有）
- npm 11.19.0（本机已有）
- Remotion 4.0.536 / React 19.2.3 / three 0.186.1 / @react-three/fiber 9.8.2

> 版本与已安装的 Remotion 4.0.x 主版本保持一致，避免重复安装与冲突。

## 快速开始

```bash
npm install      # 首次
npm run dev      # 打开 Remotion Studio 实时预览
```

Studio 中选中左侧 `RotatingCube` 合成即可预览缓慢旋转的立方体。

## 渲染导出

```bash
npm run render   # 导出 out/RotatingCube.mp4
npm run still    # 导出单帧 out/frame.png
npm run typecheck
```

## 目录结构

```
src/
  index.ts              # registerRoot 入口
  Root.tsx              # 注册所有 Composition
  RotatingCube.tsx      # 合成入口
  scenes/
    CubeScene.tsx       # 3D 场景：背景 / 灯光 / 摄像机 / 模型
remotion.config.ts      # Remotion 配置
```

## 关键约定

动画必须由 Remotion 的帧时间驱动，保证预览与渲染逐帧一致：

- 使用 `useCurrentFrame()` / `useVideoConfig()` 计算模型属性（如旋转角度），是当前帧的纯函数；
- 不要使用 `useFrame` 或 three 自带的 clock / requestAnimationFrame 做时间推进；
- 新增 3D 动画时，在 `src/scenes/` 下新建场景组件，并在 `src/Root.tsx` 注册一个新的 `<Composition />`。

## 后续扩展

模型、材质、灯光、摄像机动画均按上述约定，以 `frame` 推导。可通过 `useCurrentFrame` + `interpolate`/`spring` 做摄像机推移、材质过渡等效果，形成可复用的 3D 动画片段。
