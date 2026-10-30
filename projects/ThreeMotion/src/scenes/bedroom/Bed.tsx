import React from "react";
import { RoundedBox } from "@react-three/drei";
import { C, MATTE } from "./palette";
import { BACK_Z } from "./Room";

export const BED = {
  centerX: -2.5,
  headZ: BACK_Z + 0.18,
  width: 4.2,
  depth: 3.8,
  baseH: 0.88,
  mattressH: 0.38,
  headboardH: 2.5,
  postH: 3.8,
} as const;

const BedFrame: React.FC = () => {
  const { centerX, headZ, width, depth, baseH } = BED;
  const footZ = headZ + depth;
  const midZ = (headZ + footZ) / 2;
  const legH = baseH - 0.1;

  return (
    <group>
      <RoundedBox
        args={[width - 0.12, baseH - 0.1, depth - 0.12]}
        radius={0.22}
        smoothness={3}
        position={[centerX, (baseH - 0.1) / 2, midZ]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={C.woodWarm} {...MATTE} />
      </RoundedBox>
      {[
        [-width / 2 + 0.45, headZ + 0.45],
        [width / 2 - 0.45, headZ + 0.45],
        [-width / 2 + 0.45, footZ - 0.45],
        [width / 2 - 0.45, footZ - 0.45],
      ].map(([lx, lz], i) => (
        <mesh key={i} castShadow receiveShadow position={[centerX + lx, legH / 2, lz]}>
          <cylinderGeometry args={[0.16, 0.19, legH, 18]} />
          <meshStandardMaterial color={C.woodDark} {...MATTE} />
        </mesh>
      ))}
      <RoundedBox
        args={[width, 0.14, depth]}
        radius={0.07}
        smoothness={3}
        position={[centerX, baseH - 0.07, midZ]}
      >
        <meshStandardMaterial color={C.pinkPale} transparent opacity={0.85} {...MATTE} />
      </RoundedBox>
    </group>
  );
};

const Headboard: React.FC = () => {
  const { centerX, headZ, width, headboardH, baseH } = BED;
  return (
    <group>
      <RoundedBox
        args={[width + 0.25, headboardH, 0.42]}
        radius={0.35}
        smoothness={4}
        position={[centerX, baseH + headboardH / 2, headZ - 0.06]}
        castShadow
      >
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.4, headboardH - 0.5, 0.18]}
        radius={0.25}
        smoothness={3}
        position={[centerX, baseH + headboardH / 2, headZ + 0.04]}
      >
        <meshStandardMaterial color={C.pink} {...MATTE} />
      </RoundedBox>
      <RoundedBox
        args={[width + 0.1, 0.18, 0.3]}
        radius={0.08}
        smoothness={3}
        position={[centerX, baseH + headboardH, headZ - 0.02]}
      >
        <meshStandardMaterial color={C.goldSoft} {...MATTE} />
      </RoundedBox>
    </group>
  );
};

const Mattress: React.FC = () => {
  const { centerX, headZ, width, depth, baseH, mattressH } = BED;
  const midZ = headZ + depth / 2;
  return (
    <RoundedBox
      args={[width - 0.35, mattressH, depth - 0.6]}
      radius={0.24}
      smoothness={4}
      position={[centerX, baseH + mattressH / 2, midZ]}
      castShadow
    >
      <meshStandardMaterial color={C.cream} {...MATTE} />
    </RoundedBox>
  );
};

const Duvet: React.FC = () => {
  const { centerX, headZ, width, depth, baseH, mattressH } = BED;
  const footZ = headZ + depth;
  const duvetDepth = depth - 1.25;
  const duvetZ = footZ - 0.35 - duvetDepth / 2;
  return (
    <group>
      <RoundedBox
        args={[width - 0.38, 0.55, duvetDepth]}
        radius={0.28}
        smoothness={4}
        position={[centerX, baseH + mattressH + 0.28, duvetZ]}
        castShadow
      >
        <meshStandardMaterial color={C.mint} {...MATTE} />
      </RoundedBox>
      <RoundedBox
        args={[width - 0.4, 0.26, 0.45]}
        radius={0.12}
        smoothness={3}
        position={[centerX, baseH + mattressH + 0.48, duvetZ - duvetDepth / 2 + 0.22]}
        castShadow
      >
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </RoundedBox>
      {[
        [-width / 2 + 0.22, duvetZ],
        [width / 2 - 0.22, duvetZ],
        [-width / 2 + 0.22, duvetZ + duvetDepth],
        [width / 2 - 0.22, duvetZ + duvetDepth],
      ].map(([x, z], i) => (
        <RoundedBox
          key={i}
          args={[0.18, 0.4, 0.18]}
          radius={0.07}
          position={[centerX + x, baseH + mattressH + 0.35, z]}
          rotation={[0, 0, (i < 2 ? 0.08 : -0.08)]}
        >
          <meshStandardMaterial color={C.mint} {...MATTE} />
        </RoundedBox>
      ))}
    </group>
  );
};

const Pillow: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  color?: string;
}> = ({ position, rotation = [0, 0, 0], size = [1.2, 0.44, 0.58], color = C.cream }) => (
  <RoundedBox
    args={size}
    radius={0.18}
    smoothness={4}
    position={position}
    rotation={rotation}
    castShadow
  >
    <meshStandardMaterial color={color} {...MATTE} />
  </RoundedBox>
);

const Canopy: React.FC = () => {
  const { centerX, headZ, width, depth, postH, baseH } = BED;
  const footZ = headZ + depth;
  const postX = width / 2 - 0.25;
  const zH = headZ + 0.25;
  const zF = footZ - 0.25;
  const topY = baseH + postH;
  const midZ = (headZ + footZ) / 2;
  const railX = postX * 2;
  const railZ = depth - 0.5;

  const goldMat = <meshStandardMaterial color={C.gold} {...MATTE} />;

  return (
    <group>
      {[
        [-postX, zH],
        [postX, zH],
        [-postX, zF],
        [postX, zF],
      ].map(([px, pz], i) => (
        <mesh key={i} castShadow position={[centerX + px, (topY + baseH) / 2, pz]}>
          <cylinderGeometry args={[0.07, 0.055, postH, 16]} />
          {goldMat}
        </mesh>
      ))}
      {[zH, zF].map((z, i) => (
        <mesh key={`rx${i}`} castShadow position={[centerX, topY, z]}>
          <cylinderGeometry args={[railX / 2, railX / 2, 0.06, 8]} />
          {goldMat}
        </mesh>
      ))}
      {[-postX, postX].map((x, i) => (
        <mesh key={`rz${i}`} castShadow position={[centerX + x, topY, midZ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[railZ / 2, railZ / 2, 0.06, 8]} />
          {goldMat}
        </mesh>
      ))}
      <mesh position={[centerX, topY - 0.03, midZ]} castShadow receiveShadow>
        <boxGeometry args={[railX - 0.1, 0.02, railZ - 0.1]} />
        <meshStandardMaterial color={C.cream} transparent opacity={0.2} {...MATTE} />
      </mesh>
      {[-postX + 0.2, postX - 0.2].map((x, i) => (
        <mesh key={`vd${i}`} position={[centerX + x, topY - 1.0, zH + 0.08]}>
          <boxGeometry args={[postX - 0.45, 2.0, 0.03]} />
          <meshStandardMaterial color={C.cream} transparent opacity={0.25} side={2} {...MATTE} />
        </mesh>
      ))}
      <mesh position={[centerX, topY - 1.2, zF - 0.08]}>
        <boxGeometry args={[railX * 0.7, 2.2, 0.03]} />
        <meshStandardMaterial color={C.cream} transparent opacity={0.18} side={2} {...MATTE} />
      </mesh>
    </group>
  );
};

export const Bed: React.FC = () => {
  const { centerX, headZ, baseH, mattressH } = BED;
  const pillowY = baseH + mattressH + 0.45;
  const pillowZ = headZ + 0.85;

  return (
    <group>
      <BedFrame />
      <Headboard />
      <Mattress />
      <Duvet />
      <Pillow
        position={[centerX - 0.98, pillowY, pillowZ]}
        rotation={[-0.2, 0, 0.05]}
        size={[1.18, 0.46, 0.56]}
        color={C.cream}
      />
      <Pillow
        position={[centerX + 0.98, pillowY, pillowZ]}
        rotation={[-0.2, 0, -0.05]}
        size={[1.18, 0.46, 0.56]}
        color={C.cream}
      />
      <Pillow
        position={[centerX - 0.78, pillowY - 0.22, pillowZ + 0.45]}
        size={[0.55, 0.32, 0.52]}
        color={C.lavender}
        rotation={[0, 0, 0.06]}
      />
      <Pillow
        position={[centerX + 0.78, pillowY - 0.22, pillowZ + 0.45]}
        size={[0.55, 0.32, 0.52]}
        color={C.butter}
        rotation={[0, 0, -0.06]}
      />
      <RoundedBox
        args={[0.42, 0.26, 0.42]}
        radius={0.12}
        smoothness={4}
        position={[centerX, pillowY - 0.38, pillowZ + 0.85]}
        castShadow
      >
        <meshStandardMaterial color={C.peach} {...MATTE} />
      </RoundedBox>
      <Canopy />
    </group>
  );
};