import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from './estilo';

// Fondo oscuro con niebla que se mueve despacio.
export const Fondo: React.FC = () => {
  const f = useCurrentFrame();
  const x1 = 30 + Math.sin(f / 200) * 15;
  const y1 = 40 + Math.cos(f / 260) * 10;
  const x2 = 70 + Math.cos(f / 230) * 15;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${x1}% ${y1}%, #1b2530 0%, transparent 55%),
          radial-gradient(ellipse at ${x2}% 70%, #22121a 0%, transparent 50%),
          linear-gradient(180deg, ${C.fondo2}, ${C.fondo})`,
      }}
    />
  );
};

// Partículas de polvo flotando.
export const Polvo: React.FC<{ cantidad?: number }> = ({ cantidad = 45 }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {new Array(cantidad).fill(0).map((_, i) => {
        const vel = 0.15 + random(`v${i}`) * 0.5;
        const x = (random(`x${i}`) * width + Math.sin(f / 60 + i) * 20) % width;
        const y = (((random(`y${i}`) * height - f * vel) % height) + height) % height;
        const s = 1 + random(`s${i}`) * 3;
        const o = 0.15 + random(`o${i}`) * 0.35 * (0.6 + 0.4 * Math.sin(f / 20 + i));
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s,
            borderRadius: '50%', background: '#fff', opacity: o, filter: 'blur(0.5px)' }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Grano de película + viñeta + leve parpadeo: el "look" del canal.
export const Pelicula: React.FC = () => {
  const f = useCurrentFrame();
  const parpadeo = 0.04 + random(`p${Math.floor(f / 2)}`) * 0.05;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.13, mixBlendMode: 'overlay' }}>
        <filter id="grano">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grano)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.85) 100%)' }} />
      <AbsoluteFill style={{ background: '#000', opacity: parpadeo }} />
      {/* rayas verticales de película vieja, a veces */}
      {random(`r${Math.floor(f / 6)}`) > 0.7 && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2,
          left: `${random(`rx${Math.floor(f / 6)}`) * 100}%`, background: 'rgba(255,255,255,0.08)' }} />
      )}
    </AbsoluteFill>
  );
};

// Corte con glitch al empezar cada escena.
export const Glitch: React.FC<{ duracion?: number }> = ({ duracion = 9 }) => {
  const f = useCurrentFrame();
  if (f >= duracion) return null;
  const fuerza = interpolate(f, [0, duracion], [1, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: '#fff', opacity: f < 2 ? 0.35 : 0 }} />
      {new Array(7).fill(0).map((_, i) => {
        const top = random(`gt${i}-${f}`) * 100;
        const h = 1 + random(`gh${i}-${f}`) * 7;
        const dx = (random(`gx${i}-${f}`) - 0.5) * 160 * fuerza;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${top}%`, height: `${h}%`,
            transform: `translateX(${dx}px)`, mixBlendMode: 'screen',
            background: i % 2 ? `rgba(255,0,40,${0.35 * fuerza})` : `rgba(0,220,255,${0.3 * fuerza})` }} />
        );
      })}
    </AbsoluteFill>
  );
};

// Hace que lo de adentro se acerque despacio (efecto cámara).
export const Camara: React.FC<{ desde?: number; hasta?: number; children: React.ReactNode; duracion: number }> = ({
  desde = 1, hasta = 1.08, children, duracion,
}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, duracion], [desde, hasta], { extrapolateRight: 'clamp' });
  const temblor = Math.sin(f / 7) * 1.5;
  return (
    <AbsoluteFill style={{ transform: `scale(${s}) translate(${temblor}px, ${Math.cos(f / 9) * 1.2}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// Salida suave al final de la escena.
export const Salida: React.FC<{ duracion: number; children: React.ReactNode }> = ({ duracion, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [duracion - 8, duracion], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
