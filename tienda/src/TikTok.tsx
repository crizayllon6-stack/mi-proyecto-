import React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type Palabra = { texto: string; inicio: number; fin: number }; // en frames
export type Datos = {
  src: string;
  fps: number;
  duracionFrames: number;
  vertical: boolean;
  cortes: number[];   // frames donde cambia la toma
  golpes: number[];   // frames con zoom de golpe (palabras clave)
  palabras: Palabra[];
  opciones: {
    zoomCortes: boolean; zoomLento: boolean; transiciones: boolean;
    colorActiva: string; color: string; porBloque: number; tamano: number; altura: number;
  };
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- Subtítulos estilo TikTok ----------
function bloques(palabras: Palabra[], porBloque: number, fps: number) {
  const out: Palabra[][] = [];
  let b: Palabra[] = [];
  for (const p of palabras) {
    const ultima = b[b.length - 1];
    const pausa = ultima ? p.inicio - ultima.fin > fps * 0.5 : false;
    const corta = ultima && /[.,;:?!¿¡]$/.test(ultima.texto);
    if (b.length && (b.length >= porBloque || pausa || corta)) { out.push(b); b = []; }
    b.push(p);
  }
  if (b.length) out.push(b);
  return out;
}

const Subtitulos: React.FC<{ datos: Datos }> = ({ datos }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const o = datos.opciones;
  const lista = React.useMemo(() => bloques(datos.palabras, o.porBloque, fps), [datos.palabras, o.porBloque, fps]);
  const actual = lista.find((b) => f >= b[0].inicio && f < Math.max(b[b.length - 1].fin, b[0].inicio + 6) + 4);
  if (!actual) return null;
  const pop = spring({ frame: f - actual[0].inicio, fps, config: { damping: 12, stiffness: 240 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: height * o.altura, width: '88%', display: 'flex', flexWrap: 'wrap',
        justifyContent: 'center', columnGap: o.tamano * 0.38, rowGap: 6,
        transform: `translateY(-50%) scale(${0.7 + 0.3 * pop})`, lineHeight: 1.1 }}>
        {actual.map((p, i) => {
          const activa = f >= p.inicio && f < p.fin + 2;
          return (
            <span key={i} style={{
              fontFamily: 'Montserrat, Arial Black, sans-serif', fontWeight: 900, fontSize: o.tamano,
              textTransform: 'uppercase', color: activa ? o.colorActiva : o.color,
              WebkitTextStroke: '14px #000', paintOrder: 'stroke fill',
              textShadow: '0 8px 18px rgba(0,0,0,0.55)', display: 'inline-block',
              transform: activa ? 'scale(1.12) rotate(-2deg)' : 'none',
            }}>{p.texto.replace(/[.,;:]+$/, '')}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Transiciones en cada corte (van rotando para que no aburra) ----------
const TIPOS = ['flash', 'barrido', 'pop', 'glitch', 'sacudida'] as const;
function transicion(f: number, cortes: number[]) {
  // devuelve el efecto activo cerca de un corte: desde 2 frames antes hasta 8 después
  for (let i = 0; i < cortes.length; i++) {
    const d = f - cortes[i];
    if (d >= -2 && d <= 8) return { tipo: TIPOS[i % TIPOS.length], d, i };
  }
  return null;
}

export const TikTok: React.FC<{ datos: Datos }> = ({ datos }) => {
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const o = datos.opciones;
  const src = staticFile(datos.src);

  // zoom: alterna en cada toma + golpes en palabras clave + acercamiento lento
  const toma = datos.cortes.filter((c) => c <= f).length;
  const inicioToma = toma ? datos.cortes[toma - 1] : 0;
  const finToma = datos.cortes[toma] ?? datos.duracionFrames;
  let zoom = 1;
  if (o.zoomCortes && toma % 2 === 1) zoom *= 1.13;
  if (o.zoomLento) zoom *= interpolate(f, [inicioToma, finToma], [1, 1.05], clamp);
  // golpe: sube rápido y baja suave
  for (const g of datos.golpes) {
    const d = f - g;
    if (d >= 0 && d < 20) zoom *= 1 + 0.12 * interpolate(d, [0, 3, 20], [0, 1, 0], clamp);
  }

  const t = o.transiciones ? transicion(f, datos.cortes) : null;
  let extra = '';
  let filtro = '';
  let flash = 0;
  if (t) {
    const k = interpolate(t.d, [-2, 0, 8], [0.4, 1, 0], clamp);
    if (t.tipo === 'flash') flash = k * 0.75;
    if (t.tipo === 'barrido') { extra = `translateX(${(t.i % 2 ? 1 : -1) * k * 160}px)`; filtro = `blur(${k * 14}px)`; }
    if (t.tipo === 'pop') { zoom *= 1 + k * 0.25; filtro = `blur(${k * 8}px)`; }
    if (t.tipo === 'sacudida') extra = `translate(${(random(`x${f}`) - 0.5) * 50 * k}px, ${(random(`y${f}`) - 0.5) * 50 * k}px) rotate(${(random(`r${f}`) - 0.5) * 6 * k}deg)`;
    if (t.tipo === 'glitch') filtro = `saturate(${1 + k * 2}) hue-rotate(${k * 40}deg)`;
  }

  const capa: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: `scale(${zoom}) ${extra}`, transformOrigin: '50% 42%', filter: filtro || undefined,
  };

  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {datos.vertical ? (
        <OffthreadVideo src={src} style={capa} />
      ) : (
        <>
          {/* video horizontal: fondo borroso + video al centro */}
          <OffthreadVideo src={src} muted style={{ width: '100%', height: '100%', objectFit: 'cover',
            filter: 'blur(40px) brightness(0.45)', transform: 'scale(1.2)' }} />
          <AbsoluteFill style={{ justifyContent: 'center' }}>
            <div style={{ width, height: (width * 9) / 16, overflow: 'hidden' }}>
              <OffthreadVideo src={src} style={capa} />
            </div>
          </AbsoluteFill>
        </>
      )}
      {t?.tipo === 'glitch' && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {new Array(6).fill(0).map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${random(`g${i}${f}`) * 100}%`,
              height: `${2 + random(`h${i}${f}`) * 6}%`, mixBlendMode: 'screen',
              background: i % 2 ? 'rgba(255,0,60,0.45)' : 'rgba(0,230,255,0.4)',
              transform: `translateX(${(random(`gx${i}${f}`) - 0.5) * 140}px)`,
              opacity: interpolate(t.d, [-2, 0, 8], [0.3, 1, 0], clamp) }} />
          ))}
        </AbsoluteFill>
      )}
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
      <Subtitulos datos={datos} />
    </AbsoluteFill>
  );
};
