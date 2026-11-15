import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, escribir } from '../estilo';
import { Camara } from '../efectos';
import { iconoPara } from './iconos';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const MANO = '"Reenie Beanie", "Segoe Print", cursive';

const Etiqueta: React.FC<{ texto: string; color?: string }> = ({ texto, color = C.amarillo }) => (
  <div style={{ display: 'inline-block', fontFamily: F.normal, fontSize: 24, letterSpacing: 6, color,
    border: `2px solid ${color}`, padding: '4px 14px', borderRadius: 4 }}>{texto}</div>
);

// ---------- EVIDENCIA: el objeto dibujado (reconstrucción) o su foto real ----------
// [EVIDENCIA: objeto | título | detalle | foto.jpg]
export const Evidencia: React.FC<{ datos: string[]; duracion: number; imagen?: string | null }> = ({ datos, duracion, imagen }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [objeto = '', titulo = '', detalle = ''] = datos;
  const trazos = iconoPara(objeto);
  const entra = spring({ frame: f, fps, config: { damping: 15 } });
  const dibujo = Math.min(55, duracion * 0.45);
  const numero = String(Math.floor(random(objeto + titulo) * 90) + 10);
  return (
    <Camara duracion={duracion} hasta={1.06}>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 90 }}>
        {/* bolsa de evidencia */}
        <div style={{ width: 640, height: 720, background: 'linear-gradient(160deg, #d9c9a3, #b9a57a)', borderRadius: 10,
          boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 0 60px rgba(90,60,20,0.35)', position: 'relative',
          transform: `translateY(${(1 - entra) * 700}px) rotate(${-3 + entra}deg)`, padding: 34 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.normal, color: '#5a1010',
            fontSize: 30, letterSpacing: 4, borderBottom: '3px solid #5a1010', paddingBottom: 8 }}>
            <span>EVIDENCIA</span><span>Nº {numero}</span>
          </div>
          <div style={{ position: 'absolute', left: 50, right: 50, top: 110, bottom: 60, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>
            {imagen ? (
              <div style={{ width: '100%', height: '100%', background: '#f4efe4', padding: 16, transform: 'rotate(2deg)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                <Img src={staticFile(imagen)} style={{ width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'sepia(0.3) contrast(1.1)' }} />
              </div>
            ) : (
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                {trazos.map((d, i) => {
                  const ini = (i / trazos.length) * dibujo;
                  const p = interpolate(f, [ini + 8, ini + 8 + dibujo / trazos.length + 6], [1, 0], clamp);
                  return <path key={i} d={d} pathLength={1} fill="none" stroke="#2a1d10" strokeWidth={3.2}
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={p} />;
                })}
              </svg>
            )}
          </div>
          {/* hilo y etiqueta colgante */}
          <svg width="200" height="120" style={{ position: 'absolute', right: -120, top: 30 }}>
            <path d="M0 30 Q60 10 110 40" fill="none" stroke="#e8e0cc" strokeWidth={3} />
            <rect x="105" y="25" width="80" height="50" rx="6" fill="#f2ead7" transform="rotate(14 145 50)" />
          </svg>
        </div>
        {/* texto */}
        <div style={{ width: 760, opacity: interpolate(f, [10, 22], [0, 1], clamp) }}>
          <Etiqueta texto={imagen ? 'FOTO REAL' : 'RECONSTRUCCIÓN'} color={imagen ? C.texto : C.amarillo} />
          <div style={{ fontFamily: F.titulo, fontSize: 110, color: C.texto, lineHeight: 1, marginTop: 22,
            textShadow: '0 0 40px rgba(0,0,0,0.9)' }}>{escribir(titulo.toUpperCase(), f, 1.4, 14)}</div>
          <div style={{ width: interpolate(f, [20, 40], [0, 420], clamp), height: 5, background: C.rojo, margin: '22px 0' }} />
          <div style={{ fontFamily: F.maquina, fontSize: 44, color: C.gris, lineHeight: 1.3 }}>
            {escribir(detalle, f, 1.3, 30)}
          </div>
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- NOTA: carta, mensaje o código escrito a mano ----------
// [NOTA: línea 1 / línea 2 / línea 3 | pie | real]
export const Nota: React.FC<{ datos: string[]; duracion: number }> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineas = (datos[0] ?? '').split('/').map((l) => l.trim()).filter(Boolean);
  const pie = datos[1] ?? '';
  const real = /real|original|transcrip/i.test(datos[2] ?? '');
  const entra = spring({ frame: f, fps, config: { damping: 16 } });
  const porLinea = Math.max(12, Math.min(40, (duracion * 0.6) / Math.max(1, lineas.length)));
  const largo = Math.max(...lineas.map((l) => l.length), 8);
  const tam = Math.min(120, 1500 / (largo * 0.48));
  return (
    <Camara duracion={duracion} desde={1} hasta={1.14}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 1300, minHeight: 600, maxHeight: 760, padding: '60px 90px', position: 'relative', marginBottom: 60,
          background: `repeating-linear-gradient(180deg, transparent 0, transparent ${tam * 1.05 - 2}px, rgba(70,90,140,0.25) ${tam * 1.05 - 2}px, rgba(70,90,140,0.25) ${tam * 1.05}px), linear-gradient(135deg, #efe6cf, #d8c9a6)`,
          boxShadow: '0 30px 90px rgba(0,0,0,0.85), inset 0 0 90px rgba(120,90,40,0.35)',
          transform: `translateY(${(1 - entra) * -800}px) rotate(${-1.5 + random(pie) * 3}deg)` }}>
          {lineas.map((l, i) => {
            const ini = 12 + i * porLinea;
            const p = interpolate(f, [ini, ini + porLinea * 0.9], [0, 100], clamp);
            return (
              <div key={i} style={{ fontFamily: MANO, fontSize: tam, lineHeight: 1.05, color: '#23252e',
                letterSpacing: 4, whiteSpace: 'nowrap', clipPath: `inset(0 ${100 - p}% 0 0)`,
                transform: `rotate(${(random(l) - 0.5) * 2}deg)` }}>{l}</div>
            );
          })}
          <div style={{ position: 'absolute', right: 30, top: 24, transform: 'rotate(6deg)' }}>
            <Etiqueta texto={real ? 'TRANSCRIPCIÓN' : 'RECONSTRUCCIÓN'} color={C.rojo} />
          </div>
        </div>
        {pie && (
          <div style={{ position: 'absolute', left: 230, top: 70, background: C.rojo, color: '#fff',
            fontFamily: F.normal, fontSize: 36, padding: '8px 22px', letterSpacing: 2 }}>
            {escribir(pie.toUpperCase(), f, 1.5, 16)}
          </div>
        )}
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- LINEA: línea de tiempo que va creciendo ----------
// [LINEA: momento | qué pasó]   (el editor recuerda todas las anteriores)
export type PuntoLinea = { momento: string; evento: string };
export const Linea: React.FC<{ datos: string[]; duracion: number; linea?: { puntos: PuntoLinea[]; actual: number } }> = ({
  datos, duracion, linea,
}) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const puntos = linea?.puntos ?? [{ momento: datos[0] ?? '', evento: datos[1] ?? '' }];
  const actual = linea?.actual ?? 0;
  const PASO = 420, X0 = 360, Y = 470;
  const xDe = (i: number) => X0 + i * PASO;
  const desp = (i: number) => Math.min(0, width * 0.62 - xDe(i));
  const mover = spring({ frame: f - 4, fps, config: { damping: 18 } });
  const dx = interpolate(mover, [0, 1], [desp(Math.max(0, actual - 1)), desp(actual)]);
  const crece = interpolate(f, [8, 26], [0, 1], clamp);
  const aparece = spring({ frame: f - 20, fps, config: { damping: 12 } });
  const visibles = puntos.slice(0, actual + 1);
  return (
    <Camara duracion={duracion} hasta={1.05}>
      <AbsoluteFill>
        <div style={{ position: 'absolute', left: 120, top: 110, fontFamily: F.normal, color: C.rojo, fontSize: 30,
          letterSpacing: 10 }}>● LÍNEA DE TIEMPO</div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 99999, height: '100%', transform: `translateX(${dx}px)` }}>
          {/* línea base */}
          <div style={{ position: 'absolute', left: 0, top: Y - 2, height: 4, background: '#3d4652',
            width: xDe(Math.max(0, actual - 1)) + (actual > 0 ? PASO * crece : 0) }} />
          {visibles.map((p, i) => {
            const esActual = i === actual;
            const x = xDe(i);
            const s = esActual ? aparece : 1;
            const arriba = i % 2 === 0;
            return (
              <div key={i}>
                <div style={{ position: 'absolute', left: x - 18, top: Y - 18, width: 36, height: 36, borderRadius: '50%',
                  background: esActual ? C.rojo : '#5b6573', transform: `scale(${s})`,
                  boxShadow: esActual ? `0 0 ${20 + 10 * Math.sin(f / 5)}px ${C.rojo}` : 'none', border: '4px solid #0b0e12' }} />
                <div style={{ position: 'absolute', left: x - 200, width: 400, textAlign: 'center',
                  top: arriba ? Y - (esActual ? 150 : 110) : Y + 40, opacity: esActual ? s : 0.55,
                  fontFamily: F.titulo, fontSize: esActual ? 76 : 44, color: esActual ? C.texto : C.gris, lineHeight: 1 }}>
                  {p.momento}
                </div>
                {!esActual && (
                  <div style={{ position: 'absolute', left: x - 180, width: 360, textAlign: 'center',
                    top: arriba ? Y + 34 : Y - 96, fontFamily: F.maquina, fontSize: 24, color: '#6d7783', opacity: 0.8 }}>
                    {p.evento.length > 46 ? p.evento.slice(0, 44) + '…' : p.evento}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* tarjeta del momento actual */}
        <div style={{ position: 'absolute', left: '50%', bottom: 230, transform: `translate(-50%, ${(1 - aparece) * 60}px)`,
          opacity: aparece, width: 1300, background: 'rgba(5,8,12,0.88)', borderLeft: `8px solid ${C.rojo}`,
          padding: '26px 36px', fontFamily: F.maquina, fontSize: 50, color: C.texto, lineHeight: 1.25 }}>
          {escribir(puntos[actual]?.evento ?? '', f, 1.4, 26)}
        </div>
      </AbsoluteFill>
    </Camara>
  );
};
