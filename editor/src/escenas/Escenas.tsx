import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, F, escribir } from '../estilo';
import { Camara } from '../efectos';

type P = { datos: string[]; duracion: number; imagen?: string | null; imagenes?: string[] };
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- TITULO: título grande con glitch ----------
export const Titulo: React.FC<P> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const g = interpolate(f, [0, 18], [1, 0], clamp);
  const jx = (random(`tx${f}`) - 0.5) * 30 * g;
  const sep = 14 * g + 2;
  const linea = interpolate(f, [10, 30], [0, 900], clamp);
  return (
    <Camara duracion={duracion} hasta={1.1}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontFamily: F.titulo, fontSize: 210, color: C.texto, letterSpacing: 8, lineHeight: 0.9,
          transform: `translateX(${jx}px)`, opacity: interpolate(f, [0, 4], [0, 1], clamp), textAlign: 'center',
          textShadow: `${sep}px 0 rgba(255,0,40,0.8), ${-sep}px 0 rgba(0,220,255,0.7), 0 0 60px rgba(208,16,30,0.5)` }}>
          {datos[0]}
        </div>
        <div style={{ width: linea, height: 5, background: C.rojo, margin: '26px 0', boxShadow: `0 0 25px ${C.rojo}` }} />
        <div style={{ fontFamily: F.maquina, fontSize: 52, color: C.gris }}>
          {escribir(datos[1] ?? '', f, 1.3, 26)}
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- FECHA: fecha que se escribe + línea de tiempo ----------
export const Fecha: React.FC<P> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const letras = (datos[0] ?? '').toUpperCase().split('');
  const linea = interpolate(f, [0, 35], [0, 1], clamp);
  return (
    <Camara duracion={duracion} hasta={1.06}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontFamily: F.normal, color: C.rojo, fontSize: 34, letterSpacing: 14, marginBottom: 10,
          opacity: interpolate(f, [0, 10], [0, 1], clamp) }}>● REGISTRO</div>
        <div style={{ display: 'flex', fontFamily: F.titulo, fontSize: 150, color: C.texto }}>
          {letras.map((l, i) => {
            const s = spring({ frame: f - 6 - i * 1.5, fps, config: { damping: 12, stiffness: 160 } });
            return (
              <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: s,
                transform: `translateY(${(1 - s) * -60}px)` }}>{l}</span>
            );
          })}
        </div>
        <svg width={1400} height={90} style={{ marginTop: 20 }}>
          <line x1={0} y1={45} x2={1400 * linea} y2={45} stroke={C.gris} strokeWidth={3} />
          {new Array(15).fill(0).map((_, i) => (i / 14 <= linea ? (
            <line key={i} x1={i * 100} x2={i * 100} y1={i === 7 ? 15 : 33} y2={i === 7 ? 75 : 57}
              stroke={i === 7 ? C.rojo : C.gris} strokeWidth={i === 7 ? 6 : 3} />
          ) : null))}
          {linea > 0.5 && <circle cx={700} cy={45} r={14 + 4 * Math.sin(f / 5)} fill={C.rojo} />}
        </svg>
        <div style={{ fontFamily: F.maquina, fontSize: 44, color: C.amarillo, marginTop: 16 }}>
          {escribir(datos[1] ?? '', f, 1.2, 30)}
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- Sello que cae con golpe ----------
const Sello: React.FC<{ texto: string; desde: number; rot?: number; tam?: number; color?: string }> = ({
  texto, desde, rot = -14, tam = 90, color = C.rojo,
}) => {
  const f = useCurrentFrame();
  if (f < desde) return null;
  const t = interpolate(f - desde, [0, 6], [0, 1], clamp);
  const sacudida = f - desde < 8 ? (random(`se${f}`) - 0.5) * 12 : 0;
  return (
    <div style={{ fontFamily: F.titulo, fontSize: tam, color, border: `8px solid ${color}`, padding: '0 28px',
      letterSpacing: 6, transform: `rotate(${rot}deg) scale(${3 - 2 * t}) translate(${sacudida}px, ${sacudida}px)`,
      opacity: t * 0.88, mixBlendMode: 'multiply', borderRadius: 10 }}>{texto}</div>
  );
};

const Silueta: React.FC = () => (
  <svg viewBox="0 0 100 120" width="100%" height="100%">
    <rect width="100" height="120" fill="#2a2a2a" />
    <circle cx="50" cy="45" r="22" fill="#111" />
    <path d="M10 120 Q12 78 50 76 Q88 78 90 120 Z" fill="#111" />
    <text x="50" y="112" textAnchor="middle" fontSize="8" fill="#666" fontFamily="monospace">SIN FOTO</text>
  </svg>
);

const papel: React.CSSProperties = {
  background: `linear-gradient(135deg, ${C.papel}, ${C.papelOscuro})`,
  boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 0 80px rgba(120,90,40,0.35)',
  color: C.tinta,
};

// ---------- FICHA: expediente de una persona ----------
export const Ficha: React.FC<P> = ({ datos, duracion, imagen }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: f, fps, config: { damping: 15 } });
  const [nombre = '', edad = '', rol = '', estado = ''] = datos;
  const campos: [string, string][] = [['NOMBRE', nombre], ['EDAD', edad], ['ROL', rol]];
  const sello = Math.min(Math.round(duracion * 0.45), 70);
  return (
    <Camara duracion={duracion} hasta={1.07}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...papel, width: 1250, height: 680, padding: 50, position: 'relative', display: 'flex', gap: 50,
          transform: `translateY(${(1 - entra) * 900}px) rotate(${-2 + entra * 1}deg)` }}>
          <div style={{ position: 'absolute', top: 18, left: 50, right: 50, display: 'flex',
            justifyContent: 'space-between', fontFamily: F.maquina, fontSize: 26, opacity: 0.7 }}>
            <span>EXPEDIENTE Nº {String(Math.floor(random(nombre) * 9000 + 1000))}</span><span>CONFIDENCIAL</span>
          </div>
          <div style={{ width: 360, height: 460, marginTop: 50, border: '10px solid #f7f2e6',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)', transform: 'rotate(-3deg)', overflow: 'hidden', flexShrink: 0 }}>
            {imagen ? <Img src={staticFile(imagen)} style={{ width: '100%', height: '100%', objectFit: 'cover',
              filter: 'grayscale(1) contrast(1.2)' }} /> : <Silueta />}
          </div>
          <div style={{ marginTop: 70, flex: 1 }}>
            {campos.map(([k, v], i) => (
              <div key={k} style={{ marginBottom: 34 }}>
                <div style={{ fontFamily: F.normal, fontSize: 26, letterSpacing: 5, opacity: 0.6 }}>{k}</div>
                <div style={{ fontFamily: F.maquina, fontSize: k === 'NOMBRE' ? 64 : 46, borderBottom: '2px solid rgba(0,0,0,0.3)',
                  minHeight: 60 }}>{escribir(v, f, 1.2, 12 + i * 14)}</div>
              </div>
            ))}
          </div>
          {estado && (
            <div style={{ position: 'absolute', right: 70, bottom: 60 }}>
              <Sello texto={estado} desde={sello} tam={110} />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- DOC: documento con partes tachadas y frase resaltada ----------
export const Doc: React.FC<P> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: f, fps, config: { damping: 16 } });
  const cita = datos[1] ?? '';
  const marca = interpolate(f, [20, 45], [0, 100], clamp);
  const lineas = new Array(9).fill(0).map((_, i) => i);
  return (
    <Camara duracion={duracion} desde={1} hasta={1.18}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...papel, width: 1000, padding: '60px 70px', position: 'relative',
          transform: `translateY(${(1 - entra) * -900}px) rotate(1.5deg)` }}>
          <div style={{ fontFamily: F.normal, fontSize: 28, letterSpacing: 8, opacity: 0.6 }}>DOCUMENTO</div>
          <div style={{ fontFamily: F.maquina, fontSize: 50, borderBottom: '3px solid #000', paddingBottom: 12, marginBottom: 30 }}>
            {datos[0]}
          </div>
          {lineas.map((i) => {
            const tachada = random(`d${i}`) > 0.55;
            const ancho = 55 + random(`w${i}`) * 45;
            if (i === 5) {
              return (
                <div key={i} style={{ fontFamily: F.maquina, fontSize: 52, margin: '22px 0', lineHeight: 1.3 }}>
                  <span style={{ background: `linear-gradient(90deg, ${C.amarillo} ${marca}%, transparent ${marca}%)`,
                    padding: '0 8px' }}>“{escribir(cita, f, 1.4, 8)}”</span>
                </div>
              );
            }
            return (
              <div key={i} style={{ height: 22, width: `${ancho}%`, margin: '14px 0',
                background: tachada ? '#0d0d0d' : 'rgba(0,0,0,0.18)', borderRadius: 2 }} />
            );
          })}
          <div style={{ position: 'absolute', right: -30, bottom: 70 }}>
            <Sello texto="CLASIFICADO" desde={Math.min(50, Math.round(duracion * 0.5))} rot={12} tam={80} />
          </div>
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- TEXTO: frase de máquina de escribir ----------
export const Texto: React.FC<P> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const texto = datos[0] ?? '';
  const vel = Math.max(0.8, texto.length / Math.max(20, duracion * 0.5));
  const visible = escribir(texto, f, vel, 4);
  const cursor = Math.floor(f / 15) % 2 === 0;
  // En escenas largas la frase sube y se achica para que la pantalla no se quede quieta
  const larga = duracion > 240;
  const sube = larga ? interpolate(f, [150, 190], [0, 1], clamp) : 0;
  return (
    <Camara duracion={duracion} hasta={larga ? 1.15 : 1.05}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 160 }}>
        {larga && sube > 0 && (
          <div style={{ position: 'absolute', top: 470, width: 900 * sube, height: 4, background: C.rojo,
            boxShadow: `0 0 20px ${C.rojo}`, opacity: 0.8 }} />
        )}
        <div style={{ fontFamily: F.maquina, fontSize: 88, color: C.texto, textAlign: 'center', lineHeight: 1.25,
          transform: `translateY(${-sube * 120}px) scale(${1 - sube * 0.3})`,
          textShadow: '0 0 30px rgba(0,0,0,0.9)' }}>
          {visible}<span style={{ color: C.rojo, opacity: cursor ? 1 : 0 }}>▌</span>
        </div>
      </AbsoluteFill>
    </Camara>
  );
};

// ---------- IMAGEN: una o varias fotos reales con movimiento lento ----------
export const Imagen: React.FC<P> = ({ datos, duracion, imagen, imagenes }) => {
  const f = useCurrentFrame();
  const fotos = imagenes && imagenes.length ? imagenes : imagen ? [imagen] : [];
  const tramo = duracion / Math.max(1, fotos.length);
  const cruce = 12;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      {/* fondo: la misma foto, borrosa y oscura, para llenar la pantalla */}
      {fotos.map((src, i) => (
        <Img key={`b${i}`} src={staticFile(src)} style={{ position: 'absolute', width: '100%', height: '100%',
          objectFit: 'cover', filter: 'blur(40px) brightness(0.35) grayscale(0.5)', transform: 'scale(1.2)',
          opacity: interpolate(f, [i * tramo - cruce, i * tramo, (i + 1) * tramo - cruce, (i + 1) * tramo],
            [0, 1, 1, i === fotos.length - 1 ? 1 : 0], clamp) }} />
      ))}
      <div style={{ width: 1500, height: 860, overflow: 'hidden', border: '14px solid #e8e2d4', position: 'relative',
        boxShadow: '0 30px 90px rgba(0,0,0,0.9)', transform: 'rotate(-1deg)', background: '#222' }}>
        {fotos.length ? fotos.map((src, i) => {
          const local = f - i * tramo;
          const dir = random(src) > 0.5 ? 1 : -1;
          const s = interpolate(local, [0, tramo], [1.05, 1.2], clamp);
          const x = interpolate(local, [0, tramo], [0, 40 * dir], clamp);
          const o = i === 0 ? 1 : interpolate(local, [-cruce, 0], [0, 1], clamp);
          if (local < -cruce || local > tramo + cruce) return null;
          return (
            <Img key={i} src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', opacity: o, transform: `scale(${s}) translateX(${x}px)`,
              filter: 'sepia(0.3) contrast(1.12) brightness(0.92)' }} />
          );
        }) : (
          <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', fontFamily: F.maquina,
            color: '#777', fontSize: 40 }}>[ imagen: {datos[0]} ]</AbsoluteFill>
        )}
      </div>
      {datos[1] && (
        <div style={{ position: 'absolute', left: 230, bottom: 130, background: C.rojo, color: '#fff',
          fontFamily: F.normal, fontSize: 36, padding: '8px 22px', letterSpacing: 2 }}>
          {escribir(datos[1].toUpperCase(), f, 1.5, 10)}
        </div>
      )}
    </AbsoluteFill>
  );
};
