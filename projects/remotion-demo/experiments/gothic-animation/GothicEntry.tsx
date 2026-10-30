import React from 'react';
import {Composition, Img, staticFile, useCurrentFrame, registerRoot} from 'remotion';

const GothicVideo = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{width: '100%', height: '100%', backgroundColor: '#000'}}>
      <Img
        src={staticFile(`gothic-preview/frame_${String(frame).padStart(4, '0')}.png`)}
        style={{width: '100%', height: '100%'}}
      />
    </div>
  );
};

const Root = () => (
  <Composition
    id="GothicEnvironmentTest"
    component={GothicVideo}
    durationInFrames={75}
    fps={15}
    width={960}
    height={506}
  />
);

registerRoot(Root);
