import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, type Datos, type Escena } from './estilo';
import { Fondo, Glitch, Pelicula, Polvo, Salida } from './efectos';
import { Mapa } from './escenas/Mapa';
import { Doc, Fecha, Ficha, Imagen, Texto, Titulo } from './escenas/Escenas';
import { Evidencia, Linea, Nota } from './escenas/Nuevas';

const ESCENAS: Record<string, React.FC<any>> = {
  TITULO: Titulo, MAPA: Mapa, FECHA: Fecha, FICHA: Ficha, DOC: Doc, TEXTO: Texto, IMAGEN: Imagen,
  EVIDENCIA: Evidencia, NOTA: Nota, LINEA: Linea,
};

// Momento (en frames, dentro de la escena) en que cae un sello, para poner el golpe de sonido.
const golpe = (e: Escena) => {
  const d = e.fin - e.inicio;
  if (e.tipo === 'FICHA' && e.datos[3]) return Math.min(Math.round(d * 0.45), 70);
  if (e.tipo === 'DOC') return Math.min(50, Math.round(d * 0.5));
  return null;
};

export const Subtitulos: React.FC<{ subs: Datos['subtitulos']; tam?: number; abajo?: number; ancho?: number }> = ({
  subs, tam = 58, abajo = 70, ancho = 1500,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = subs.find((x) => f >= x.inicio && f < x.fin);
  if (!s) return null;
  const pop = spring({ frame: f - s.inicio, fps, config: { damping: 14, stiffness: 220 } });
  const palabras = s.texto.split(' ');
  const progreso = (f - s.inicio) / Math.max(1, s.fin - s.inicio);
  const activa = Math.min(palabras.length - 1, Math.floor(progreso * palabras.length));
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: abajo }}>
      <div style={{ fontFamily: F.normal, fontWeight: 600, fontSize: tam, color: '#fff', textAlign: 'center',
        maxWidth: ancho, transform: `scale(${0.85 + pop * 0.15})`, letterSpacing: 1,
        textShadow: '0 0 6px #000, 3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000' }}>
        {palabras.map((p, i) => (
          <span key={i} style={{ color: i === activa ? C.amarillo : '#fff' }}>{p} </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Video: React.FC<{ datos: Datos; sinSubtitulos?: boolean }> = ({ datos, sinSubtitulos }) => {
  const f = useCurrentFrame();
  const total = datos.duracionFrames;
  const volMusica = interpolate(f, [0, 30, total - 60, total], [0, 0.22, 0.22, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      <Fondo />
      <Polvo />
      {datos.escenas.map((e, i) => {
        const Comp = ESCENAS[e.tipo];
        const dur = Math.max(1, e.fin - e.inicio);
        const g = golpe(e);
        return (
          <Sequence key={i} from={e.inicio} durationInFrames={dur} name={`${e.tipo} ${e.datos[0] ?? ''}`}>
            {Comp && <Salida duracion={dur}><Comp datos={e.datos} duracion={dur} imagen={e.imagen} imagenes={e.imagenes} linea={e.linea} /></Salida>}
            {e.tipo !== 'PAUSA' && !e.auto && <Glitch />}
            {e.tipo !== 'PAUSA' && !e.auto && <Audio src={staticFile(e.tipo === 'TITULO' ? 'sfx/boom.mp3' : 'sfx/whoosh.mp3')} volume={0.5} />}
            {g !== null && g < dur && (
              <Sequence from={g}><Audio src={staticFile('sfx/golpe.mp3')} volume={0.7} /></Sequence>
            )}
          </Sequence>
        );
      })}
      <Pelicula />
      {!sinSubtitulos && <Subtitulos subs={datos.subtitulos} />}
      <Audio src={staticFile(datos.audio)} />
      <Audio src={staticFile(datos.musica)} volume={volMusica} loop />
    </AbsoluteFill>
  );
};
