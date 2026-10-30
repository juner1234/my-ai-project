import React, { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, MATTE } from "./palette";
import { BACK_Z, LEFT_X, ROOM } from "./Room";

type V3 = [number, number, number];

export const useLoop = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return {
    frame,
    t: durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1),
    seconds: frame / fps,
  };
};

export const Rug: React.FC<{ position: V3; radius?: number }> = ({
  position,
  radius = 3.0,
}) => {
  const rings = [
    { r: radius, c: C.pinkPale },
    { r: radius * 0.82, c: C.cream },
    { r: radius * 0.64, c: C.lavender },
    { r: radius * 0.46, c: C.mint },
    { r: radius * 0.28, c: C.butter },
    { r: radius * 0.12, c: C.peach },
  ];
  return (
    <group position={position}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.022 + i * 0.01, 0]}
          receiveShadow
        >
          <circleGeometry args={[ring.r, 64]} />
          <meshStandardMaterial color={ring.c} {...MATTE} />
        </mesh>
      ))}
      <mesh position={[0, 0.09, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={C.peach} {...MATTE} />
      </mesh>
    </group>
  );
};

export const Plant: React.FC<{ position: V3; scale?: number; variant?: "tall" | "bush" | "succulent" }> = ({
  position,
  scale = 1,
  variant = "tall",
}) => {
  const { seconds } = useLoop();

  const leafData = useMemo(() => {
    const leaves: Array<{ rot: number; len: number; tilt: number; phase: number; width: number }> = [];
    const count = variant === "bush" ? 14 : variant === "succulent" ? 8 : 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      leaves.push({
        rot: a,
        len: variant === "tall" ? 1.1 + (i % 3) * 0.2 : variant === "bush" ? 0.7 + (i % 2) * 0.15 : 0.5,
        tilt: variant === "tall" ? 0.45 + (i % 2) * 0.15 : variant === "bush" ? 0.6 + (i % 3) * 0.1 : 0.3,
        phase: Math.random() * Math.PI * 2,
        width: variant === "tall" ? 0.35 : variant === "bush" ? 0.45 : 0.55,
      });
    }
    return leaves;
  }, [variant]);

  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.48, 0.36, 0.88, 24]} />
        <meshStandardMaterial color={C.peach} {...MATTE} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.52, 0.48, 0.12, 24]} />
        <meshStandardMaterial color={C.pinkDeep} {...MATTE} />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 24]} />
        <meshStandardMaterial color="#6b4e3d" {...MATTE} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          position={[(Math.random() - 0.5) * 0.6, 0.9, (Math.random() - 0.5) * 0.6]}
          rotation={[Math.random(), Math.random(), Math.random()]}
        >
          <sphereGeometry args={[0.03 + Math.random() * 0.02, 8, 8]} />
          <meshStandardMaterial color="#c8b8a8" {...MATTE} />
        </mesh>
      ))}
      {leafData.map((l, i) => (
        <group
          key={i}
          position={[0, variant === "tall" ? 1.0 : variant === "bush" ? 0.8 : 0.7, 0]}
          rotation={[0, l.rot, 0]}
        >
          <mesh castShadow position={[0, l.len * 0.4, 0]} rotation={[l.tilt, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.015, l.len * 0.8, 8, 1, true]} />
            <meshStandardMaterial color={C.stem} {...MATTE} />
          </mesh>
          <mesh
            castShadow
            position={[0, l.len * 0.55, 0]}
            rotation={[l.tilt + Math.sin(seconds * 1.1 + l.phase) * 0.06, 0, 0]}
            scale={[l.width, l.len, 0.07]}
          >
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color={i % 2 === 0 ? C.leaf : C.leafDeep} {...MATTE} />
          </mesh>
          <mesh position={[0, l.len * 0.95, 0]} rotation={[l.tilt - 0.2, 0, 0]} scale={[l.width * 0.6, l.len * 0.4, 0.06]}>
            <sphereGeometry args={[0.5, 12, 12]} />
            <meshStandardMaterial color={C.leafDeep} {...MATTE} />
          </mesh>
        </group>
      ))}
      {variant !== "succulent" && (
        <mesh position={[0, variant === "tall" ? 1.6 : 1.1, 0]}>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color={variant === "tall" ? C.leaf : C.peach} {...MATTE} />
        </mesh>
      )}
    </group>
  );
};

export const WallArt: React.FC<{
  position: V3;
  rotationY?: number;
  size?: [number, number];
  color?: string;
  motif?: "star" | "heart" | "cloud" | "moon";
}> = ({ position, rotationY = 0, size = [1.5, 1.9], color = C.pinkPale, motif = "star" }) => {
  const [w, h] = size;
  const motifs = {
    star: (
      <mesh position={[0, 0, 0.09]}>
        <circleGeometry args={[Math.min(w, h) * 0.24, 5]} />
        <meshStandardMaterial color={C.butter} emissive={C.glowWarm} emissiveIntensity={0.08} {...MATTE} />
      </mesh>
    ),
    heart: (
      <group position={[0, 0, 0.09]}>
        <mesh rotation={[0, 0, Math.PI / 4]} scale={[1, 0.9, 1]}>
          <boxGeometry args={[0.32, 0.32, 0.03]} />
          <meshStandardMaterial color={C.pinkDeep} {...MATTE} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]} position={[0.3, 0, 0]} scale={[1, 0.9, 1]}>
          <boxGeometry args={[0.32, 0.32, 0.03]} />
          <meshStandardMaterial color={C.pinkDeep} {...MATTE} />
        </mesh>
      </group>
    ),
    cloud: (
      <group position={[0, 0, 0.09]}>
        {[0, 1].map((s) => (
          <mesh key={s} position={[(s === 0 ? -1 : 1) * 0.25, 0, 0]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshStandardMaterial color={C.cream} {...MATTE} />
          </mesh>
        ))}
        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshStandardMaterial color={C.cream} {...MATTE} />
        </mesh>
      </group>
    ),
    moon: (
      <mesh position={[0, 0, 0.09]} rotation={[0, 0, -Math.PI / 6]}>
        <circleGeometry args={[Math.min(w, h) * 0.28, 32, 0, Math.PI]} />
        <meshStandardMaterial color={C.butter} emissive={C.glowWarm} emissiveIntensity={0.06} side={2} {...MATTE} />
      </mesh>
    ),
  };

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RoundedBox args={[w, h, 0.1]} radius={0.08} smoothness={3} castShadow>
        <meshStandardMaterial color={C.wallTrim} {...MATTE} />
      </RoundedBox>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[w - 0.26, h - 0.26]} />
        <meshStandardMaterial color={color} {...MATTE} />
      </mesh>
      {motifs[motif]}
    </group>
  );
};

export const CeilingLamp: React.FC<{ position: V3 }> = ({ position }) => {
  const { seconds } = useLoop();
  const sway = Math.sin(seconds * 0.35) * 0.06;
  const glow = 0.5 + Math.sin(seconds * 1.4) * 0.08;
  return (
    <group position={position}>
      <mesh position={[sway * 0.5, 0.85, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 1.7, 6]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
      <mesh castShadow position={[sway, 0, 0]}>
        <sphereGeometry args={[0.78, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial
          color={C.pinkPale}
          emissive={C.glowWarm}
          emissiveIntensity={glow * 0.24}
          transparent
          opacity={0.85}
          side={2}
          {...MATTE}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[sway + s * 0.35, -0.55, 0]} rotation={[0.15 * s, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.005, 0.55, 6]} />
          <meshStandardMaterial color={C.gold} {...MATTE} />
        </mesh>
      ))}
      <mesh position={[sway, -0.12, 0]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color={C.glowWarm} emissive={C.glowWarm} emissiveIntensity={0.5} {...MATTE} />
      </mesh>
      <pointLight position={[sway, -0.35, 0]} color={C.glowWarm} intensity={5.5} distance={12} decay={2} />
    </group>
  );
};

export const FairyLights: React.FC = () => {
  const { seconds } = useLoop();

  const points = useMemo(() => {
    const pts: V3[] = [];
    const spans: Array<[number, number, number]> = [
      [-5.2, 1.2, ROOM.height - 0.35],
      [0.2, 1.0, ROOM.height - 0.45],
      [3.5, 0.8, ROOM.height - 0.55],
    ];
    spans.forEach(([x0, sag, y0]) => {
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = x0 + u * 4.2;
        const y = y0 - Math.sin(u * Math.PI) * sag;
        pts.push([x, y, BACK_Z + 0.28]);
      }
    });
    const wx = 2.7;
    const wy = 3.4;
    const wr = 1.95;
    const hr = 1.75;
    for (let i = 0; i <= 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      pts.push([wx + Math.cos(ang) * wr, wy + Math.sin(ang) * hr, BACK_Z + 0.36]);
    }
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push([-2.5 + u * 5, ROOM.height - 0.2, 0]);
    }
    return pts;
  }, []);

  return (
    <group>
      {points.map((p, i) => {
        const twinkle = 0.6 + 0.4 * Math.sin(seconds * 2.8 + i * 1.5);
        const pulse = 0.9 + Math.sin(seconds * 4.2 + i * 2.1) * 0.1;
        return (
          <mesh key={i} position={p} scale={pulse}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial
              color="#fff5d6"
              emissive={C.glowWarm}
              emissiveIntensity={0.25 + twinkle * 0.6}
              {...MATTE}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const Balloons: React.FC<{ origin: V3 }> = ({ origin }) => {
  const { seconds } = useLoop();
  const balloons = [
    { off: [0, 0, 0], c: C.pink, str: "#e8d8dc" },
    { off: [0.9, 0.5, 0.35], c: C.mint, str: "#d0e8e0" },
    { off: [-0.8, 0.3, 0.25], c: C.lavender, str: "#e0d8e8" },
    { off: [1.4, -0.2, -0.3], c: C.butter, str: "#f0e8d8" },
    { off: [-1.2, -0.3, -0.2], c: C.peach, str: "#f0e0d8" },
  ];
  return (
    <group position={origin}>
      {balloons.map((b, i) => {
        const bob = Math.sin(seconds * 0.85 + i * 1.2) * 0.16;
        const drift = Math.cos(seconds * 0.3 + i) * 0.04;
        return (
          <group key={i} position={[b.off[0] + drift, b.off[1] + bob, b.off[2]]}>
            <mesh castShadow scale={[1, 1.25, 1]}>
              <sphereGeometry args={[0.52, 28, 28]} />
              <meshStandardMaterial color={b.c} {...MATTE} />
            </mesh>
            <mesh position={[0, -0.68, 0]}>
              <coneGeometry args={[0.09, 0.18, 12]} />
              <meshStandardMaterial color={b.c} {...MATTE} />
            </mesh>
            <mesh position={[0, -1.35, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 1.5, 6]} />
              <meshStandardMaterial color={b.str} {...MATTE} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export const Teddy: React.FC<{ position: V3; scale?: number; rotationY?: number }> = ({
  position,
  scale = 1,
  rotationY = 0,
}) => (
  <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
    <mesh castShadow position={[0, 0.32, 0]}>
      <sphereGeometry args={[0.36, 20, 20]} />
      <meshStandardMaterial color="#e8c4a0" {...MATTE} />
    </mesh>
    <mesh castShadow position={[0, 0.8, 0.02]}>
      <sphereGeometry args={[0.28, 20, 20]} />
      <meshStandardMaterial color="#e8c4a0" {...MATTE} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.2, 1.0, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#d8b088" {...MATTE} />
      </mesh>
    ))}
    <mesh position={[0, 0.74, 0.26]}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshStandardMaterial color="#f5e0d0" {...MATTE} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.1, 0.86, 0.26]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#3d2a22" {...MATTE} />
      </mesh>
    ))}
    {[-1, 1].map((s) => (
      <mesh key={s} castShadow position={[s * 0.36, 0.34, 0.1]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#d8b088" {...MATTE} />
      </mesh>
    ))}
    {[-1, 1].map((s) => (
      <mesh key={s} castShadow position={[s * 0.18, -0.12, 0.15]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#d8b088" {...MATTE} />
      </mesh>
    ))}
  </group>
);

export const WallShelf: React.FC<{ position: V3; rotationY?: number }> = ({
  position,
  rotationY = 0,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RoundedBox args={[1.9, 0.1, 0.45]} radius={0.05} smoothness={3} castShadow>
      <meshStandardMaterial color={C.woodPale} {...MATTE} />
    </RoundedBox>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.85, -0.18, 0.22]} rotation={[0, 0, s * 0.4]}>
        <boxGeometry args={[0.06, 0.4, 0.06]} />
        <meshStandardMaterial color={C.gold} {...MATTE} />
      </mesh>
    ))}
    <group position={[-0.55, 0.2, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.28, 16]} />
        <meshStandardMaterial color={C.pinkPale} {...MATTE} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial color={C.leaf} {...MATTE} />
      </mesh>
    </group>
    <group position={[0.55, 0.2, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.12, 0.28, 16]} />
        <meshStandardMaterial color={C.mint} {...MATTE} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial color={C.leafDeep} {...MATTE} />
      </mesh>
    </group>
    <RoundedBox args={[0.5, 0.6, 0.28]} radius={0.03} smoothness={2} position={[0, 0.35, 0]}>
      <meshStandardMaterial color={C.lavender} {...MATTE} />
    </RoundedBox>
  </group>
);

export const WallStars: React.FC = () => {
  const { seconds } = useLoop();
  const stars = useMemo(() => {
    let s = 7;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: 20 }).map(() => ({
      x: (rand() - 0.5) * 10,
      y: 2.8 + rand() * 3.2,
      sz: 0.07 + rand() * 0.1,
      ph: rand() * Math.PI * 2,
      spd: 0.8 + rand() * 1.2,
    }));
  }, []);
  return (
    <group position={[0, 0, BACK_Z + 0.12]}>
      {stars.map((st, i) => (
        <mesh key={i} position={[st.x, st.y, 0]} rotation={[0, 0, st.ph]}>
          <circleGeometry args={[st.sz, 5]} />
          <meshStandardMaterial
            color={C.butter}
            emissive={C.glowWarm}
            emissiveIntensity={0.25 + Math.sin(seconds * st.spd + st.ph) * 0.3}
            {...MATTE}
          />
        </mesh>
      ))}
    </group>
  );
};

export const MoonLamp: React.FC<{ position: V3 }> = ({ position }) => {
  const { seconds } = useLoop();
  const glow = 0.3 + Math.sin(seconds * 1.1) * 0.1;
  return (
    <group position={position}>
      <mesh castShadow>
        <sphereGeometry args={[0.35, 24, 24, 0, Math.PI, 0, Math.PI]} />
        <meshStandardMaterial
          color={C.butter}
          emissive={C.glowWarm}
          emissiveIntensity={glow * 0.12}
          side={2}
          {...MATTE}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[0.35, 32, 0, Math.PI]} />
        <meshStandardMaterial color={C.cream} side={2} {...MATTE} />
      </mesh>
      <pointLight position={[0, 0, 0.2]} color={C.glowWarm} intensity={1} distance={4} decay={2} />
    </group>
  );
};