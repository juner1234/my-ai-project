import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Img,
  interpolate,
  registerRoot,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const GothicScene = () => {
  const frame = useCurrentFrame();

  const progress = frame / 74;

  const zoom = interpolate(progress, [0, 1], [1.04, 1.13]);
  const moveX = interpolate(progress, [0, 1], [0, -24]);
  const moveY = interpolate(progress, [0, 1], [0, 9]);

  const fogX = interpolate(progress, [0, 1], [-170, 120]);
  const fogX2 = interpolate(progress, [0, 1], [140, -110]);

  const glow = 0.38 + 0.18 * Math.sin(frame * 0.13);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#101820',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${moveX}px, ${moveY}px) scale(${zoom})`,
          transformOrigin: '55% 48%',
        }}
      >
        <Img
          src={staticFile('gothic-preview/frame_0000.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: 0.34,
          transform: `translateX(${fogX}px)`,
          background:
            'radial-gradient(ellipse 55% 15% at 52% 39%, rgba(177,192,205,0.52), transparent 85%)',
          filter: 'blur(28px)',
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: 0.28,
          transform: `translateX(${fogX2}px)`,
          background:
            'radial-gradient(ellipse 65% 13% at 55% 70%, rgba(183,195,204,0.50), transparent 85%)',
          filter: 'blur(35px)',
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: glow,
          mixBlendMode: 'screen',
          background:
            'radial-gradient(ellipse 9% 12% at 28% 58%, rgba(255,164,75,0.28), transparent 90%)',
          filter: 'blur(16px)',
        }}
      />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at center, transparent 43%, rgba(5,9,16,0.30) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition
    id="GothicV2"
    component={GothicScene}
    durationInFrames={75}
    fps={15}
    width={960}
    height={506}
  />
);

registerRoot(Root);
