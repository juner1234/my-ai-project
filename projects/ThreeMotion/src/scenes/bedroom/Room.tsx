import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { C, MATTE } from "./palette";

export const ROOM = {
  width: 12,
  depth: 10,
  height: 6,
  wallT: 0.3,
} as const;

export const FLOOR_Y = 0;
export const BACK_Z = -ROOM.depth / 2;
export const LEFT_X = -ROOM.width / 2;

const GradientWallMaterial: React.FC<{
  top: string;
  mid: string;
  base: string;
  height: number;
}> = ({ top, mid, base, height }) => {
  const texture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, top);
    grad.addColorStop(0.35, mid);
    grad.addColorStop(0.7, base);
    grad.addColorStop(1, base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [top, mid, base, height]);

  return <meshStandardMaterial map={texture} {...MATTE} color="#ffffff" />;
};

const FloorMaterial: React.FC = () => {
  const texture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = C.floorBase;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = C.floorGrain;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const y = i * 32 + Math.random() * 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 3, size * 0.7, y + Math.random() * 3, size, y);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    tex.needsUpdate = true;
    return tex;
  }, []);

  return <meshStandardMaterial map={texture} {...MATTE} color="#ffffff" />;
};

const WallPanel: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
}> = ({ position, size, color, radius = 0.2 }) => {
  const [w, h, d] = size;
  return (
    <RoundedBox
      args={[w, h, d]}
      radius={radius}
      smoothness={3}
      position={position}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} {...MATTE} />
    </RoundedBox>
  );
};

const Window: React.FC = () => {
  const w = 3.4;
  const h = 3.0;
  const frame = 0.18;
  const sill = 0.16;
  return (
    <group position={[2.7, 3.4, BACK_Z + 0.2]}>
      {/* 窗外天光：极弱发光 */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={C.blue} emissive={C.glowMint} emissiveIntensity={0.06} {...MATTE} />
      </mesh>
      {/* 玻璃：微透、无反射 */}
      <mesh position={[0, 0, 0.15]}>
        <planeGeometry args={[w - 0.02, h - 0.02]} />
        <meshStandardMaterial color="#f0f0eb" transparent opacity={0.08} {...MATTE} />
      </mesh>
      {/* 窗框：哑光 */}
      <RoundedBox args={[w + frame * 2, frame, 0.3]} radius={0.06} position={[0, h / 2 + frame / 2, 0.2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[w + frame * 2, frame, 0.3]} radius={0.06} position={[0, -h / 2 - frame / 2, 0.2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[frame, h + frame * 2, 0.3]} radius={0.06} position={[-w / 2 - frame / 2, 0, 0.2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[frame, h + frame * 2, 0.3]} radius={0.06} position={[w / 2 + frame / 2, 0, 0.2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      {/* 窗棂 */}
      <RoundedBox args={[w - 0.02, 0.1, 0.14]} radius={0.04} position={[0, 0, 0.23]} smoothness={2}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[0.1, h - 0.02, 0.14]} radius={0.04} position={[0, 0, 0.23]} smoothness={2}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      {/* 窗台 */}
      <RoundedBox args={[w + 0.6, sill, 0.7]} radius={0.05} position={[0, -h / 2 - frame - sill / 2, 0.4]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      {/* 窗台盆栽 */}
      <group position={[-w / 2 + 0.5, -h / 2 - frame + 0.02, 0.5]}>
        <RoundedBox args={[0.35, 0.35, 0.35]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={C.peach} {...MATTE} />
        </RoundedBox>
        <mesh position={[0, 0.32, 0]}>
          <sphereGeometry args={[0.28, 18, 18]} />
          <meshStandardMaterial color={C.leaf} {...MATTE} />
        </mesh>
      </group>
      <group position={[w / 2 - 0.5, -h / 2 - frame + 0.02, 0.5]}>
        <RoundedBox args={[0.32, 0.32, 0.32]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color={C.mint} {...MATTE} />
        </RoundedBox>
        <mesh position={[0, 0.3, 0]} rotation={[0.2, 0, 0.1]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial color={C.leafDeep} {...MATTE} />
        </mesh>
      </group>
    </group>
  );
};

const Curtains: React.FC = () => {
  const panelW = 2.3;
  const panelH = 3.2;
  const layers = [
    { z: 0.32, color: C.pinkPale, opacity: 0.9, pleats: 6 },
    { z: 0.24, color: C.cream, opacity: 0.3, pleats: 7 },
  ];
  return (
    <group position={[2.7, 3.4, BACK_Z + 0.2]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, panelH / 2 + 0.18, 0.4]}>
        <cylinderGeometry args={[0.08, 0.08, 5.8, 16]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (panelW / 2 + 0.12), 0, 0]}>
          {layers.map((lay, li) => (
            <group key={li} position={[0, 0, lay.z]}>
              {Array.from({ length: lay.pleats }).map((_, i) => (
                <RoundedBox
                  key={i}
                  args={[0.22, panelH, 0.06]}
                  radius={0.08}
                  smoothness={4}
                  position={[(i - (lay.pleats - 1) / 2) * 0.28, 0.05, (i % 2) * -0.02]}
                  castShadow
                >
                  <meshStandardMaterial color={lay.color} transparent opacity={lay.opacity} {...MATTE} />
                </RoundedBox>
              ))}
            </group>
          ))}
        </group>
      ))}
      <RoundedBox args={[5.6, 0.55, 0.22]} radius={0.14} position={[0, panelH / 2 + 0.02, 0.36]} smoothness={4}>
        <meshStandardMaterial color={C.pinkDeep} {...MATTE} />
      </RoundedBox>
    </group>
  );
};

export const Room: React.FC = () => {
  const { width, depth, height, wallT } = ROOM;

  return (
    <group>
      {/* 地板 */}
      <mesh
        receiveShadow
        position={[0, FLOOR_Y - 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, depth, 1, 1]} />
        <FloorMaterial />
      </mesh>

      {/* 后墙渐变 */}
      <mesh
        receiveShadow
        position={[0, height / 2, BACK_Z - wallT / 2]}
        scale={[width, height, 1]}
      >
        <planeGeometry args={[1, 1, 1, 1]} />
        <GradientWallMaterial top={C.wallTop} mid={C.wallMid} base={C.wallBase} height={height} />
      </mesh>
      <mesh receiveShadow position={[0, height / 2, BACK_Z - wallT / 2]} scale={[width + 0.1, height + 0.1, wallT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={C.wallBase} {...MATTE} />
      </mesh>

      {/* 左墙渐变 */}
      <mesh
        receiveShadow
        position={[LEFT_X - wallT / 2, height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[depth, height, 1]}
      >
        <planeGeometry args={[1, 1, 1, 1]} />
        <GradientWallMaterial top={C.wallTop} mid={C.wallMid} base={C.wallBase} height={height} />
      </mesh>
      <mesh receiveShadow position={[LEFT_X - wallT / 2, height / 2, 0]} scale={[wallT, height + 0.1, depth + 0.1]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={C.wallBase} {...MATTE} />
      </mesh>

      {/* 腰线 & 踢脚线 */}
      <RoundedBox args={[width + 0.1, 0.12, wallT + 0.1]} radius={0.04} position={[0, 1.6, BACK_Z - wallT / 2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[width + 0.1, 0.08, wallT + 0.1]} radius={0.03} position={[0, 0.22, BACK_Z - wallT / 2]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[depth + 0.1, 0.12, wallT + 0.1]} radius={0.04} position={[LEFT_X - wallT / 2, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[depth + 0.1, 0.08, wallT + 0.1]} radius={0.03} position={[LEFT_X - wallT / 2, 0.22, 0]} rotation={[0, Math.PI / 2, 0]} smoothness={3}>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>

      <Window />
      <Curtains />

      {/* 天花板微弱暖光带 */}
      <mesh position={[0, height - 0.05, 0]}>
        <boxGeometry args={[width - 0.4, 0.06, depth - 0.4]} />
        <meshStandardMaterial color={C.glowWarm} emissive={C.glowWarm} emissiveIntensity={0.04} {...MATTE} />
      </mesh>
    </group>
  );
};