import React from 'react';
import { Composition, staticFile, type CalculateMetadataFunction } from 'remotion';
import { Video } from './Video';
import { Miniatura } from './Miniatura';
import type { Datos } from './estilo';

type Props = { datos: Datos | null } & Record<string, unknown>;

// Si no se pasan datos (por ejemplo en el estudio), usa el último video preparado.
const cargar: CalculateMetadataFunction<any> = async ({ props }) => {
  const datos: Datos = (props.datos as Datos | null) ?? (await (await fetch(staticFile('proyecto/actual.json'))).json());
  return { props: { datos }, durationInFrames: datos.duracionFrames, fps: datos.fps };
};

export const Root: React.FC = () => (
  <>
    <Composition id="Video" component={Video as React.FC<any>} width={1920} height={1080} fps={30}
      durationInFrames={300} defaultProps={{ datos: null } as Props} calculateMetadata={cargar} />
    <Composition id="Miniatura" component={Miniatura as React.FC<any>} width={1280} height={720} fps={30}
      durationInFrames={1} defaultProps={{ datos: null } as Props}
      calculateMetadata={async (o) => ({ ...(await cargar(o)), durationInFrames: 1 })} />
  </>
);
