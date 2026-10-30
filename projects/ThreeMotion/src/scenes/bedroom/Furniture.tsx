import React from "react";
import { RoundedBox } from "@react-three/drei";
import { C, MATTE } from "./palette";
import { BACK_Z, LEFT_X } from "./Room";

type V3 = [number, number, number];

export const NIGHTSTAND = {
  x: 0.35,
  z: BACK_Z + 0.85,
  w: 1.15,
  d: 0.95,
  h: 1.55,
} as const;

export const Nightstand: React.FC = () => {
  const { x, z, w, d, h } = NIGHTSTAND;
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, h, d]} radius={0.14} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.woodWarm} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[w - 0.22, 0.5, 0.06]} radius={0.06} position={[0, h - 0.5, d / 2 + 0.02]} smoothness={3}>
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[w - 0.22, 0.5, 0.06]} radius={0.06} position={[0, h - 1.1, d / 2 + 0.02]} smoothness={3}>
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </RoundedBox>
      <mesh position={[0, h - 0.5, d / 2 + 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 12]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
      <mesh position={[0, h - 1.1, d / 2 + 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 12]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
      <RoundedBox args={[w - 0.1, 0.04, d - 0.1]} radius={0.02} position={[0, h - 0.02, 0]}>
        <meshStandardMaterial color={C.goldSoft} {...MATTE} />
      </RoundedBox>
    </group>
  );
};

export const TableLamp: React.FC<{ position: V3 }> = ({ position }) => (
  <group position={position}>
    <mesh castShadow position={[0, 0.06, 0]}>
      <cylinderGeometry args={[0.22, 0.26, 0.28, 24]} />
      <meshStandardMaterial color={C.cream} {...MATTE} />
    </mesh>
    <mesh castShadow position={[0, 0.58, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.95, 12]} />
      <meshStandardMaterial color={C.gold} {...MATTE} />
    </mesh>
    <mesh castShadow position={[0, 1.2, 0]}>
      <cylinderGeometry args={[0.38, 0.55, 0.62, 24, 1, true]} />
      <meshStandardMaterial color={C.butter} emissive={C.glowWarm} emissiveIntensity={0.22} side={2} {...MATTE} />
    </mesh>
    <pointLight position={[0, 1.12, 0]} color={C.glowWarm} intensity={0.6} distance={5} decay={2} />
  </group>
);

export const Wardrobe: React.FC<{ position: V3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => {
  const w = 1.6;
  const h = 4.3;
  const d = 2.8;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[w, h, d]} radius={0.18} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[0.12, h - 0.55, d / 2 - 0.2]}
          radius={0.08}
          smoothness={3}
          position={[w / 2 + 0.01, h / 2, (s * (d / 2 - 0.2)) / 2]}
          castShadow
        >
          <meshStandardMaterial color={C.pinkPale} {...MATTE} />
        </RoundedBox>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[w / 2 + 0.09, h / 2, (s * (d / 4))]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.05, 0.05, 0.7, 16]} />
          <meshStandardMaterial color={C.gold} {...MATTE} />
        </mesh>
      ))}
      <RoundedBox args={[w + 0.2, 0.22, d + 0.2]} radius={0.08} position={[0, h + 0.11, 0]} smoothness={3}>
        <meshStandardMaterial color={C.pinkDeep} {...MATTE} />
      </RoundedBox>
      <mesh position={[0, h + 0.45, 0.6]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color={C.lavender} {...MATTE} />
      </mesh>
    </group>
  );
};

export const Desk: React.FC<{ position: V3 }> = ({ position }) => {
  const w = 2.8;
  const d = 1.5;
  const h = 1.55;
  const legR = 0.065;
  return (
    <group position={position}>
      <RoundedBox args={[w, 0.18, d]} radius={0.08} smoothness={3} position={[0, h, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={C.woodPale} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[w - 0.3, 0.5, d - 0.25]} radius={0.1} position={[0, h - 0.45, 0]} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial color={C.woodWarm} {...MATTE} />
      </RoundedBox>
      <mesh position={[-w / 2 + 0.7, h - 0.45, d / 2 - 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.3, 12]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
      {[
        [-w / 2 + 0.15, -d / 2 + 0.15],
        [w / 2 - 0.15, -d / 2 + 0.15],
        [-w / 2 + 0.15, d / 2 - 0.15],
        [w / 2 - 0.15, d / 2 - 0.15],
      ].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx, (h - 0.15) / 2, lz]}>
          <cylinderGeometry args={[legR, legR + 0.02, h - 0.15, 12]} />
          <meshStandardMaterial color={C.woodDark} {...MATTE} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <RoundedBox
          key={i}
          args={[0.72 - i * 0.06, 0.13, 0.52]}
          radius={0.03}
          position={[-w / 2 + 0.7, h + 0.15 + i * 0.14, 0.15]}
          rotation={[0, i * 0.1, 0]}
          castShadow
        >
          <meshStandardMaterial color={[C.lavender, C.mint, C.pink][i]} {...MATTE} />
        </RoundedBox>
      ))}
      <mesh position={[w / 2 - 0.55, h + 0.28, 0.2]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
        <meshStandardMaterial color={C.blue} {...MATTE} />
      </mesh>
      <group position={[-w / 2 + 0.6, h + 0.2, -d / 2 + 0.5]} castShadow>
        <RoundedBox args={[0.26, 0.22, 0.26]} radius={0.04} smoothness={3}>
          <meshStandardMaterial color={C.peach} {...MATTE} />
        </RoundedBox>
        <mesh position={[0, 0.22, 0]} rotation={[0.15, 0, 0.1]}>
          <sphereGeometry args={[0.22, 14, 14]} />
          <meshStandardMaterial color={C.leaf} {...MATTE} />
        </mesh>
      </group>
    </group>
  );
};

export const Chair: React.FC<{ position: V3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => {
  const s = 1.15;
  const seatH = 0.92;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[s, 0.16, s]} radius={0.08} position={[0, seatH, 0]} smoothness={3} castShadow>
        <meshStandardMaterial color={C.mint} {...MATTE} />
      </RoundedBox>
      <RoundedBox args={[s, 1.25, 0.14]} radius={0.08} position={[0, seatH + 0.68, -s / 2 + 0.12]} smoothness={3} castShadow>
        <meshStandardMaterial color={C.mint} {...MATTE} />
      </RoundedBox>
      {[
        [-s / 2 + 0.15, -s / 2 + 0.15],
        [s / 2 - 0.15, -s / 2 + 0.15],
        [-s / 2 + 0.15, s / 2 - 0.15],
        [s / 2 - 0.15, s / 2 - 0.15],
      ].map(([lx, lz], i) => (
        <mesh key={i} castShadow position={[lx, seatH / 2, lz]}>
          <cylinderGeometry args={[0.055, 0.065, seatH, 12]} />
          <meshStandardMaterial color={C.woodDark} {...MATTE} />
        </mesh>
      ))}
    </group>
  );
};

export const Bookshelf: React.FC<{ position: V3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => {
  const w = 1.15;
  const h = 3.1;
  const d = 2.1;
  const shelves = [0.38, 1.42, 2.46];
  const bookColors = [C.pink, C.lavender, C.mint, C.blue, C.butter, C.peach];
  let seed = 1;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[-w / 2 + 0.06, h / 2, 0]} receiveShadow>
        <boxGeometry args={[0.12, h, d]} />
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, h / 2, (i === 0 ? -1 : 1) * (d / 2 - 0.06)]} receiveShadow>
          <boxGeometry args={[w, h, 0.12]} />
          <meshStandardMaterial color={C.cream} {...MATTE} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.06, 0]} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </mesh>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color={C.cream} {...MATTE} />
      </mesh>
      {shelves.map((y, si) => (
        <group key={si}>
          <mesh position={[0, y, 0]} receiveShadow castShadow>
            <boxGeometry args={[w, 0.1, d]} />
            <meshStandardMaterial color={C.cream} {...MATTE} />
          </mesh>
          {Array.from({ length: 8 }).map((_, bi) => {
            const bh = 0.48 + rand() * 0.3;
            const bw = 0.1 + rand() * 0.08;
            const bz = -d / 2 + 0.25 + bi * 0.22;
            return (
              <RoundedBox
                key={bi}
                args={[0.35, bh, bw]}
                radius={0.02}
                smoothness={2}
                position={[w / 4, y + 0.05 + bh / 2, bz]}
                rotation={[0, 0, (rand() - 0.5) * 0.06]}
                castShadow
              >
                <meshStandardMaterial color={bookColors[(si * 8 + bi) % bookColors.length]} {...MATTE} />
              </RoundedBox>
            );
          })}
        </group>
      ))}
      <group position={[0, h + 0.3, 0.5]} castShadow>
        <RoundedBox args={[0.55, 0.7, 0.1]} radius={0.03} smoothness={2}>
          <meshStandardMaterial color={C.lavenderDeep} {...MATTE} />
        </RoundedBox>
        <mesh position={[0, -0.42, 0.15]} castShadow>
          <cylinderGeometry args={[0.18, 0.15, 0.3, 16]} />
          <meshStandardMaterial color={C.peach} {...MATTE} />
        </mesh>
        <mesh position={[0, -0.1, 0.15]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color={C.leaf} {...MATTE} />
        </mesh>
      </group>
    </group>
  );
};