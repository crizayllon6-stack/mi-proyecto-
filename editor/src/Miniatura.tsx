import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, F, type Datos } from './estilo';
import { Globo, leerCoordenadas } from './escenas/Mapa';

// Miniatura 1280x720: imagen o mapa de fondo, frase gigante y sello.
export const Miniatura: React.FC<{ datos: Datos }> = ({ datos }) => {
  const { texto, etiqueta, imagen, mapa } = datos.miniatura;
  const coords = leerCoordenadas(mapa?.[1]);
  const palabras = texto.toUpperCase().split(' ');
  // Parte la frase en 2 líneas y resalta la última palabra en amarillo
  const mitad = Math.ceil(palabras.length / 2);
  const l1 = palabras.slice(0, mitad).join(' ');
  const l2 = palabras.slice(mitad);
  const tam = Math.min(150, 1900 / Math.max(l1.length, l2.join(' ').length, 8));
  return (
    <AbsoluteFill style={{ background: C.fondo, overflow: 'hidden' }}>
      {imagen ? (
        <Img src={staticFile(imagen)} style={{ position: 'absolute', right: 0, width: '70%', height: '100%',
          objectFit: 'cover', filter: 'contrast(1.3) saturate(0.6) brightness(0.8)' }} />
      ) : coords ? (
        <div style={{ position: 'absolute', left: 420, top: 0 }}>
          <Globo lat={coords[0]} lon={coords[1]} progreso={1} zoom={0.9} ancho={1000} alto={720} f={20} />
        </div>
      ) : null}
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.95) 30%, rgba(0,0,0,0.2) 75%, rgba(80,0,0,0.4))' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.8))' }} />
      <div style={{ position: 'absolute', left: 50, top: 60, right: 380 }}>
        <div style={{ fontFamily: F.titulo, fontSize: tam, lineHeight: 0.92, color: '#fff',
          WebkitTextStroke: '3px #000', textShadow: '8px 8px 0 #000' }}>
          <div>{l1}</div>
          <div>
            {l2.map((p, i) => (
              <span key={i} style={{ color: i === l2.length - 1 ? C.amarillo : '#fff' }}>{p} </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 55, bottom: 60, fontFamily: F.titulo, fontSize: 70, color: '#fff',
        background: C.rojo, padding: '4px 26px', transform: 'rotate(-3deg)', boxShadow: '6px 6px 0 #000' }}>
        {etiqueta}
      </div>
      <svg style={{ position: 'absolute', left: coords && !imagen ? 790 : 900, top: 230 }} width={260} height={260}>
        <circle cx={130} cy={130} r={110} fill="none" stroke={C.rojo} strokeWidth={12} />
      </svg>
    </AbsoluteFill>
  );
};
