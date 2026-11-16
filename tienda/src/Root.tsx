import React from 'react';
import { Composition } from 'remotion';
import { TikTok, type Datos } from './TikTok';

export const Root: React.FC = () => (
  <Composition id="TikTok" component={TikTok as React.FC<any>} width={1080} height={1920} fps={30} durationInFrames={300}
    defaultProps={{ datos: null as unknown as Datos }}
    calculateMetadata={async ({ props }) => {
      const d = (props as { datos: Datos }).datos;
      return { durationInFrames: d.duracionFrames, fps: d.fps };
    }} />
);
