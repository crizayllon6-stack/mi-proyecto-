// Colores y fuentes del canal. Cambia aquí y cambia en todos los videos.
export const C = {
  fondo: '#06080b',
  fondo2: '#10151b',
  rojo: '#d0101e',
  rojoOscuro: '#5c0a10',
  amarillo: '#f5c518',
  papel: '#e9dfc6',
  papelOscuro: '#c9b994',
  tinta: '#1b1712',
  texto: '#f2efe8',
  gris: '#8a949e',
};

export const F = {
  titulo: '"Bebas Neue", Impact, sans-serif',
  maquina: '"Special Elite", "Courier New", monospace',
  normal: 'Oswald, "Arial Narrow", sans-serif',
};

export type Escena = {
  tipo: 'TITULO' | 'MAPA' | 'FECHA' | 'FICHA' | 'DOC' | 'TEXTO' | 'IMAGEN' | 'PAUSA';
  datos: string[];
  imagen: string | null;
  inicio: number;
  fin: number;
};

export type Datos = {
  slug: string;
  fps: number;
  duracionFrames: number;
  titulo: string;
  miniatura: { texto: string; etiqueta: string; imagen: string | null; mapa: string[] | null };
  audio: string;
  musica: string;
  escenas: Escena[];
  subtitulos: { texto: string; inicio: number; fin: number }[];
};

// Texto que aparece letra por letra.
export const escribir = (texto: string, frame: number, velocidad = 1.6, retraso = 0) =>
  texto.slice(0, Math.max(0, Math.floor((frame - retraso) * velocidad)));
