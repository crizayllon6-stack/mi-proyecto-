import React, { useMemo } from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { geoContains, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import mundo from 'world-atlas/countries-50m.json';
import { C, F, escribir } from '../estilo';

const paises = (feature(mundo as any, (mundo as any).objects.countries) as any).features as any[];
const reticula = geoGraticule10();

export const leerCoordenadas = (txt?: string): [number, number] | null => {
  if (!txt) return null;
  const n = txt.split(',').map((s) => parseFloat(s));
  return n.length === 2 && n.every((x) => !isNaN(x)) ? [n[0], n[1]] : null;
};

// Globo terráqueo que gira y hace zoom hasta el lugar del caso.
export const Globo: React.FC<{ lat: number; lon: number; progreso: number; ancho: number; alto: number; f: number }> = ({
  lat, lon, progreso, ancho, alto, f,
}) => {
  const pais = useMemo(() => paises.find((p) => geoContains(p, [lon, lat])), [lat, lon]);
  const rot: [number, number] = [-(lon - 70 * (1 - progreso)), -(lat - 25 * (1 - progreso))];
  const escala = interpolate(progreso, [0, 1], [alto * 0.42, alto * 1.5]);
  const proy = geoOrthographic().rotate(rot).scale(escala).translate([ancho / 2, alto / 2]).clipAngle(90);
  const camino = geoPath(proy);
  const punto = proy([lon, lat]);
  return (
    <svg width={ancho} height={alto} style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="mar" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#14202b" />
          <stop offset="100%" stopColor="#070b10" />
        </radialGradient>
        <filter id="brillo"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>
      <path d={camino({ type: 'Sphere' }) ?? ''} fill="url(#mar)" stroke="#2c4152" strokeWidth={2} />
      <path d={camino(reticula) ?? ''} fill="none" stroke="#1d2c39" strokeWidth={1} />
      {paises.map((p, i) => (
        <path key={i} d={camino(p) ?? ''} fill={p === pais ? C.rojoOscuro : '#1c2731'}
          stroke={p === pais ? C.rojo : '#3d5163'} strokeWidth={p === pais ? 2 : 0.8} />
      ))}
      {pais && <path d={camino(pais) ?? ''} fill="none" stroke={C.rojo} strokeWidth={6} filter="url(#brillo)"
        opacity={0.6 + 0.3 * Math.sin(f / 6)} />}
      {punto && progreso > 0.85 && (
        <g transform={`translate(${punto[0]},${punto[1]})`}>
          {[0, 1, 2].map((k) => {
            const t = ((f + k * 15) % 45) / 45;
            return <circle key={k} r={10 + t * 90} fill="none" stroke={C.rojo} strokeWidth={3} opacity={1 - t} />;
          })}
          <circle r={11} fill={C.rojo} stroke="#fff" strokeWidth={3} />
        </g>
      )}
    </svg>
  );
};

export const Mapa: React.FC<{ datos: string[]; duracion: number }> = ({ datos, duracion }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [lat, lon] = leerCoordenadas(datos[1]) ?? [0, 0];
  const giro = Math.min(75, duracion * 0.55);
  const progreso = interpolate(f, [0, giro], [0, 1], {
    easing: Easing.inOut(Easing.cubic), extrapolateRight: 'clamp',
  });
  const etiquetaF = f - giro;
  const lugar = datos[0] ?? '';
  const coords = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}   ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'O'}`;
  return (
    <AbsoluteFill>
      <Globo lat={lat} lon={lon} progreso={progreso} ancho={width} alto={height} f={f} />
      {etiquetaF > 0 && (
        <div style={{ position: 'absolute', left: width / 2 + 60, top: height / 2 - 150,
          opacity: interpolate(etiquetaF, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(etiquetaF, [0, 10], [-30, 0], { extrapolateRight: 'clamp' })}px)` }}>
          <div style={{ width: interpolate(etiquetaF, [0, 12], [0, 520], { extrapolateRight: 'clamp' }), height: 4, background: C.rojo }} />
          <div style={{ background: 'rgba(5,8,12,0.85)', padding: '18px 28px', borderLeft: `6px solid ${C.rojo}` }}>
            <div style={{ fontFamily: F.normal, color: C.gris, fontSize: 26, letterSpacing: 6 }}>UBICACIÓN</div>
            <div style={{ fontFamily: F.titulo, color: C.texto, fontSize: 76, lineHeight: 1 }}>
              {escribir(lugar.toUpperCase(), etiquetaF, 1.2, 4)}
            </div>
            <div style={{ fontFamily: F.maquina, color: C.amarillo, fontSize: 30, marginTop: 8 }}>
              {escribir(coords, etiquetaF, 1.5, 14)}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
