import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, type Datos } from './estilo';
import { Fondo, Pelicula } from './efectos';
import { Subtitulos, Video } from './Video';

export type PropsShort = { datos: Datos; inicio: number; fin: number; gancho: string };

// Short vertical 1080x1920: gancho arriba, el video al medio y subtítulos grandes abajo.
export const Short: React.FC<PropsShort> = ({ datos, inicio, fin, gancho }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const dur = fin - inicio;
  const escala = 0.76; // 1920x1080 → 1459x821, se recortan los lados
  const alto = 1080 * escala;
  const entra = spring({ frame: f, fps, config: { damping: 13 } });
  const subs = datos.subtitulos
    .filter((s) => s.fin > inicio && s.inicio < fin)
    .map((s) => ({ ...s, inicio: s.inicio - inicio, fin: s.fin - inicio }));
  const final = f > dur - 75;
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      <Fondo />
      {/* video horizontal al medio */}
      <div style={{ position: 'absolute', top: 560, left: 0, width, height: alto, overflow: 'hidden',
        borderTop: `4px solid ${C.rojo}`, borderBottom: `4px solid ${C.rojo}` }}>
        <div style={{ position: 'absolute', width: 1920, height: 1080, left: (width - 1920 * escala) / 2, top: 0,
          transform: `scale(${escala})`, transformOrigin: 'top left' }}>
          <Sequence from={-inicio}>
            <Video datos={datos} sinSubtitulos />
          </Sequence>
        </div>
      </div>
      {/* gancho arriba */}
      <AbsoluteFill style={{ height: 560, justifyContent: 'center', alignItems: 'center', padding: '0 60px' }}>
        <div style={{ fontFamily: F.normal, fontSize: 30, letterSpacing: 8, color: C.rojo, marginBottom: 14,
          opacity: entra }}>● CASO SIN RESOLVER</div>
        <div style={{ fontFamily: F.titulo, fontSize: gancho.length > 30 ? 96 : 118, lineHeight: 0.95, color: '#fff',
          textAlign: 'center', transform: `scale(${0.8 + entra * 0.2})`, opacity: entra,
          textShadow: '6px 6px 0 #000' }}>
          {gancho.toUpperCase()}
        </div>
      </AbsoluteFill>
      <Pelicula />
      {/* subtítulos abajo */}
      <div style={{ position: 'absolute', top: 560 + alto + 40, left: 0, right: 0, height: 420 }}>
        <Subtitulos subs={subs} tam={74} abajo={0} ancho={960} />
      </div>
      {/* barra de progreso */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 12, background: C.rojo,
        width: `${interpolate(f, [0, dur], [0, 100])}%` }} />
      {/* cierre: invita a ver el video completo */}
      {final && (
        <AbsoluteFill style={{ background: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center',
          opacity: interpolate(f, [dur - 75, dur - 60], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <div style={{ fontFamily: F.titulo, fontSize: 110, color: '#fff', textAlign: 'center', lineHeight: 1 }}>
            EL CASO COMPLETO
          </div>
          <div style={{ fontFamily: F.titulo, fontSize: 110, color: C.amarillo, textAlign: 'center' }}>EN EL CANAL ▶</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
