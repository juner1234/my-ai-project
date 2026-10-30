import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import { C, MATTE } from "./palette";
import { Room, ROOM, BACK_Z, LEFT_X } from "./Room";
import { Bed, BED } from "./Bed";
import { Nightstand, TableLamp, Wardrobe, Desk, Chair, Bookshelf } from "./Furniture";
import {
  Rug,
  Plant,
  WallArt,
  CeilingLamp,
  FairyLights,
  Balloons,
  Teddy,
  WallShelf,
  WallStars,
  MoonLamp,
} from "./Decor";
import { CameraRig } from "./CameraRig";
import { ExportGlb } from "./ExportGlb";

/**
 * 柔和黄昏光影 + 单通道着色器后处理（无外部 postprocessing 依赖）：
 * - 纸张噪点 + 轻微暗角 + 极弱色差 + 色彩分级 + 水彩渗透
 * - 全场景哑光材质（MATTE），无高光金属感
 */
export const BedroomScene: React.FC = () => {
  const { width, height } = useVideoConfig();

  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      camera={{ fov: 36, position: [10, 9.5, 14.5], near: 0.1, far: 100 }}
      style={{ backgroundColor: C.wallMid }}
    >
      <color attach="background" args={[C.wallMid]} />
      <fog attach="fog" args={[C.wallMid, 40, 80]} />

      <CameraRig />
      <ExportGlb />

      {/* ===== 暖调温馨环境光系统（日式治愈）===== */}
      {/* 暖琥珀基础环境光：让整个房间笼罩柔和暖意 */}
      <ambientLight intensity={0.5} color={C.warmLight} />
      {/* 半球光：天顶暖粉、地面暖黄，形成柔和的上下包裹 */}
      <hemisphereLight intensity={0.5} color={C.glowWarm} groundColor={C.warmLight} />
      {/* 窗外主光：大面积暖黄，阴影极柔 */}
      <directionalLight
        position={[8, 14, 8]}
        intensity={0.95}
        color={C.warmLight}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-radius={8}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* 侧面极弱暖补光（替代冷蓝）*/}
      <directionalLight position={[-3, 6, -12]} intensity={0.2} color={C.glowPink} />
      {/* 地面反射暖光：自下而上，增强包裹温暖感 */}
      <directionalLight position={[0, -5, 0]} intensity={0.32} color={C.warmLight} />
      {/* 台灯区域：柔和暖光（功率已调低）*/}
      <pointLight position={[0.35, 1.3, BACK_Z + 0.75]} color={C.warmLight} intensity={0.55} distance={5.5} decay={2} />
      {/* 书桌区域暖光 */}
      <pointLight position={[4.6, 1.4, BACK_Z + 1.2]} color={C.warmLight} intensity={0.6} distance={4.5} decay={2} />
      {/* 顶灯下方：更亮的暖光，照亮整个房间中部 */}
      <pointLight position={[0.4, ROOM.height - 2.0, 1.2]} color={C.warmLight} intensity={1.7} distance={10} decay={2} />
      {/* 衣柜顶部反射暖光 */}
      <pointLight position={[LEFT_X + 1.5, 4.5, 1.6]} color={C.glowWarm} intensity={0.4} distance={5} decay={2} />

      {/* ===== 场景内容 ===== */}
      <Room />
      <Bed />

      <Nightstand />
      <TableLamp position={[0.35, 1.55, BACK_Z + 0.85]} />

      <Wardrobe position={[LEFT_X + 0.85, 0, 1.6]} />
      <Bookshelf position={[LEFT_X + 0.7, 0, -2.6]} />

      <Desk position={[4.6, 0, BACK_Z + 0.9]} />
      <Chair position={[4.6, 0, BACK_Z + 2.5]} rotationY={Math.PI} />

      <Rug position={[0.4, 0, 1.5]} radius={3.1} />

      <Plant position={[5.2, 0, 4.2]} scale={1.05} variant="tall" />
      <Plant position={[LEFT_X + 0.7, 0, 4.5]} scale={0.9} variant="bush" />
      <Plant position={[4.8, 0, -3.2]} scale={0.75} variant="succulent" />
      <Plant position={[-4.2, 0, 3.0]} scale={0.65} variant="bush" />

      <CeilingLamp position={[0.4, ROOM.height - 1.3, 1.2]} />

      <FairyLights />
      <WallStars />
      <Balloons origin={[3.9, 4.6, 1.8]} />
      <Balloons origin={[-3.5, 4.2, -1.2]} />

      <WallArt
        position={[LEFT_X + 0.18, 3.5, -0.8]}
        rotationY={Math.PI / 2}
        size={[1.4, 1.8]}
        color={C.pinkPale}
        motif="heart"
      />
      <WallArt
        position={[LEFT_X + 0.18, 3.5, 2.8]}
        rotationY={Math.PI / 2}
        size={[1.3, 1.6]}
        color={C.mint}
        motif="cloud"
      />
      <WallShelf position={[LEFT_X + 0.22, 3.7, 3.6]} rotationY={Math.PI / 2} />

      <WallArt
        position={[BED.centerX, 4.5, BACK_Z + 0.22]}
        size={[1.6, 1.2]}
        color={C.lavender}
        motif="moon"
      />
      <MoonLamp position={[BED.centerX - 1.3, 2.8, BACK_Z + 0.3]} />
      <MoonLamp position={[BED.centerX + 1.3, 2.8, BACK_Z + 0.3]} />

      <WallArt
        position={[4.6, 3.6, BACK_Z + 0.22]}
        size={[1.2, 1.0]}
        color={C.butter}
        motif="star"
      />

      <Teddy position={[1.9, 0, 2.9]} scale={0.95} rotationY={-0.6} />
      <Teddy position={[-4.8, 0, 1.2]} scale={0.8} rotationY={0.8} />
      <Teddy position={[3.2, 0, -2.5]} scale={0.7} rotationY={1.2} />

      {/* ===== 单通道后处理着色器 ===== */}
      <PostProcessingEffect width={width} height={height} />
    </ThreeCanvas>
  );
};

/**
 * 综合后处理：噪点 + 暗角 + 色差 + 色彩分级 + 水彩渗透
 * 全部在一个 ShaderMaterial 里完成，避免 postprocessing 库版本冲突
 */
const PostProcessingEffect: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(width, height) },
        time: { value: 0 },
        noiseScale: { value: 1.0 },
      },
      depthWrite: false,
      depthTest: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float time;
        uniform float noiseScale;

        // 伪随机噪点
        float rand(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        float noise(vec2 uv) {
          vec2 i = floor(uv);
          vec2 f = fract(uv);
          f = f * f * (3.0 - 2.0 * f);
          float a = rand(i);
          float b = rand(i + vec2(1.0, 0.0));
          float c = rand(i + vec2(0.0, 1.0));
          float d = rand(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // sRGB <-> Linear
        vec3 linearToSrgb(vec3 c) {
          return pow(max(c, 0.0), vec3(1.0 / 2.2));
        }
        vec3 srgbToLinear(vec3 c) {
          return pow(c, vec3(2.2));
        }

        // Cineon 近似
        vec3 cineon(vec3 c) {
          return pow(c, vec3(0.92));
        }

        void main() {
          vec3 color = texture2D(tDiffuse, vUv).rgb;
          color = srgbToLinear(color);

          // ============================================================
          // 1. 纸张噪点：极细颗粒，Overlay 混合
          // ============================================================
          float n = noise(vUv * resolution.x * noiseScale * 0.5 + time * 0.1) * 2.0 - 1.0;
          color += n * 0.018; // 极弱噪点强度

          // ============================================================
          // 2. 轻微暗角：边缘变暗，聚焦中心
          // ============================================================
          vec2 center = vUv - 0.5;
          float dist = length(center * vec2(1.2, 1.0));
          float vignette = smoothstep(0.55, 0.85, dist) * 0.22;
          color *= 1.0 - vignette;

          // ============================================================
          // 3. 极弱色差：边缘微红蓝偏移（径向）
          // ============================================================
          vec2 chromaOffset = center * 0.0006;
          float r = texture2D(tDiffuse, vUv + chromaOffset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - chromaOffset).b;
          color = vec3(r, g, b);
          color = srgbToLinear(color); // 重新线性化

          // ============================================================
          // 4. 垂直渐变色调：上部粉紫 → 下部暖黄
          // ============================================================
          float y = vUv.y;
          vec3 pinkTint = vec3(1.045, 0.955, 1.025);  // 微粉紫
          vec3 warmTint = vec3(1.065, 1.025, 0.935);  // 微暖黄
          float grad = smoothstep(0.25, 0.75, y);
          vec3 tint = mix(pinkTint, warmTint, grad);
          color *= tint;

          // ============================================================
          // 5. 压低对比度 + 提亮阴影 + 压暗高光
          // ============================================================
          color = mix(color, vec3(0.48), 0.14) * 0.9 + 0.05;

          // ============================================================
          // 6. 降低饱和度（去色 30%）
          // ============================================================
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(color, vec3(lum), 0.3);

          // ============================================================
          // 7. 水彩渗透边缘：亮部边缘向周围颜色渗色
          // ============================================================
          vec2 invRes = 1.0 / resolution;
          vec3 bleed = vec3(0.0);
          bleed += texture2D(tDiffuse, vUv + vec2(invRes.x, 0.0)).rgb;
          bleed += texture2D(tDiffuse, vUv - vec2(invRes.x, 0.0)).rgb;
          bleed += texture2D(tDiffuse, vUv + vec2(0.0, invRes.y)).rgb;
          bleed += texture2D(tDiffuse, vUv - vec2(0.0, invRes.y)).rgb;
          bleed /= 4.0;
          bleed = srgbToLinear(bleed);
          float edge = smoothstep(0.4, 0.65, lum) * (1.0 - smoothstep(0.7, 0.9, lum));
          color = mix(color, bleed * 1.04, edge * 0.12);

          // ============================================================
          // 8. 整体暖色调收尾
          // ============================================================
          color *= vec3(1.025, 0.99, 0.965);

          // Cineon tone mapping
          color = cineon(color);
          color = linearToSrgb(color);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
  }, [width, height]);

  return (
    <>
      <primitive
        object={material}
        attach="material"
        onBeforeRender={(self: THREE.ShaderMaterial) => {
          self.uniforms.time.value = performance.now() * 0.001;
          self.uniforms.resolution.value.set(width, height);
        }}
      />
    </>
  );
};