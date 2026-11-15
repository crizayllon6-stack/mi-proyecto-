// Lee el estado de la fábrica desde las carpetas Ideas/ y videos/.
import fs from 'node:fs';
import path from 'node:path';

const leer = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/^﻿/, '') : null);
const fecha = (p) => fs.statSync(p).mtime;

// ---------- Ideas ----------
export function leerListas(raiz) {
  const dir = path.join(raiz, 'Ideas');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^casos_.*\.md$/.test(f))
    .map((f) => {
      const sufijo = f.replace(/^casos_|\.md$/g, '');
      const txt = leer(path.join(dir, f));
      const rankingTxt = leer(path.join(dir, `ranking_casos_${sufijo}.md`));
      return {
        archivo: `Ideas/${f}`, sufijo, modificado: fecha(path.join(dir, f)),
        intro: txt.split(/\n## \d+\./)[0].replace(/^# .*\n/, ''),
        casos: leerCasos(txt), ranking: rankingTxt, puntajes: rankingTxt ? leerPuntajes(rankingTxt) : {},
      };
    })
    .sort((a, b) => b.modificado - a.modificado);
}

function leerCasos(txt) {
  const casos = [];
  const partes = txt.split(/\n(?=## \d+\.)/).slice(1);
  for (const p of partes) {
    const m = p.match(/^## (\d+)\.\s*(.*)/);
    if (!m) continue;
    const campos = {};
    let ultimo = null;
    for (const l of p.split('\n').slice(1)) {
      const c = l.match(/^\s*-\s*([^:]{2,40}):\s*(.*)$/);
      if (c) { ultimo = c[1].trim(); campos[ultimo] = c[2].trim(); }
      else if (ultimo && l.trim() && !l.startsWith('#')) campos[ultimo] += ' ' + l.trim();
    }
    const buscar = (...claves) => {
      for (const k of Object.keys(campos)) {
        const n = k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (claves.some((c) => n.startsWith(c))) return campos[k];
      }
      return '';
    };
    casos.push({
      n: Number(m[1]), titulo: m[2].trim(), campos,
      resumen: buscar('resumen'), giro: buscar('giro'), material: buscar('material'),
      interno: buscar('nombre interno').replace(/`/g, '').trim(),
    });
  }
  return casos;
}

// Primera tabla del ranking: | Caso | Título | ... | Total |
function leerPuntajes(txt) {
  const out = {};
  const filas = txt.split('\n').filter((l) => /^\s*\|/.test(l));
  if (filas.length < 3) return out;
  const cab = filas[0].split('|').map((c) => c.trim().toLowerCase());
  const iCaso = cab.findIndex((c) => c.startsWith('caso') || c === '#');
  const iTotal = cab.findIndex((c) => c.startsWith('total'));
  if (iCaso < 0 || iTotal < 0) return out;
  let puesto = 0;
  for (const f of filas.slice(2)) {
    const c = f.split('|').map((x) => x.trim());
    const n = parseInt(c[iCaso], 10);
    const total = parseFloat((c[iTotal] ?? '').replace(/\*/g, '').replace(',', '.'));
    if (!isNaN(n) && !isNaN(total)) out[n] = { total, puesto: ++puesto };
  }
  return out;
}

// ---------- Videos ----------
export const PASOS = [
  { id: 'caso', nombre: 'Caso elegido' },
  { id: 'titulo', nombre: 'Título y miniatura elegidos' },
  { id: 'guion', nombre: 'Guion escrito' },
  { id: 'verificado', nombre: 'Datos verificados' },
  { id: 'estilo', nombre: 'Estilo revisado' },
  { id: 'aprobado', nombre: 'Guion aprobado' },
  { id: 'fotos', nombre: 'Fotos listas' },
  { id: 'voz', nombre: 'Voz grabada' },
  { id: 'video', nombre: 'Video armado' },
  { id: 'shorts', nombre: 'Shorts' },
  { id: 'publicado', nombre: 'Publicado' },
];

export function leerVideos(raiz) {
  const dir = path.join(raiz, 'videos');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('prueba') && !d.name.startsWith('_'))
    .map((d) => leerVideo(raiz, d.name))
    .filter(Boolean)
    .sort((a, b) => b.modificado - a.modificado);
}

function leerVideo(raiz, nombre) {
  const c = path.join(raiz, 'videos', nombre);
  const arch = (f) => path.join(c, f);
  const ficha = leer(arch('ficha.md'));
  const guion = leer(arch('guion.md'));
  if (!ficha && !guion) return null;
  const marcas = {};
  for (const m of (ficha ?? '').matchAll(/^\s*-\s*\[(x| )\]\s*(.+)$/gim)) marcas[m[2].trim().toLowerCase()] = m[1] === 'x';
  const campo = (k) => (ficha ?? '').match(new RegExp(`^\\s*-\\s*${k}:\\s*(.*)$`, 'im'))?.[1]?.trim() ?? '';
  const meta = {};
  const fm = (guion ?? '').match(/^---\n([\s\S]*?)\n---/);
  if (fm) for (const l of fm[1].split('\n')) { const x = l.match(/^(\w+)\s*:\s*(.*)$/); if (x) meta[x[1]] = x[2].trim(); }
  const voz = ['voz.wav', 'voz.mp3', 'voz.m4a', 'voz.ogg'].find((f) => fs.existsSync(arch(f)));
  const dirImg = arch('imagenes');
  const imagenes = fs.existsSync(dirImg) ? fs.readdirSync(dirImg).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
  const salida = arch('salida');
  const enSalida = (f) => fs.existsSync(path.join(salida, f));
  const shorts = fs.existsSync(salida) ? fs.readdirSync(salida).filter((f) => /^short-\d+\.mp4$/.test(f)).sort() : [];
  const palabras = leer(arch('voz.txt'))?.match(/\S+/g)?.length ?? 0;
  const tiene = (k) => marcas[k] === true;

  const hecho = {
    caso: true,
    titulo: tiene('título y miniatura elegidos') || tiene('titulo y miniatura elegidos') || (!ficha && !!meta.titulo),
    guion: tiene('guion escrito') || !!guion,
    verificado: tiene('datos verificados') || fs.existsSync(arch('verificacion.md')),
    estilo: tiene('estilo revisado') || fs.existsSync(arch('cambios_estilo.md')),
    aprobado: tiene('guion aprobado'),
    fotos: tiene('fotos listas'),
    voz: !!voz,
    video: enSalida('video.mp4'),
    shorts: shorts.length > 0,
    publicado: tiene('publicado'),
  };
  const actual = PASOS.find((p) => !hecho[p.id])?.id ?? null;
  return {
    nombre, carpeta: `videos/${nombre}`, modificado: fecha(guion ? arch('guion.md') : arch('ficha.md')),
    titulo: (ficha ?? '').match(/^#\s+(.*)$/m)?.[1]?.trim() || meta.titulo || nombre,
    caso: campo('Caso') || meta.titulo || nombre, origen: campo('Origen'),
    tituloElegido: campo('Título elegido') || campo('Titulo elegido'),
    miniaturaElegida: campo('Miniatura elegida') || meta.miniatura || '',
    meta, ficha, guion, hecho, actual, palabras,
    paquete: leer(arch('paquete.md')), verificacion: leer(arch('verificacion.md')),
    estilo: leer(arch('cambios_estilo.md')), retencion: leer(arch('retencion.md')),
    vozTxt: leer(arch('voz.txt')), voz, imagenes, creditos: leer(arch('creditos.txt')),
    capitulos: leer(arch('capitulos.txt')), shorts,
    video: enSalida('video.mp4') ? 'salida/video.mp4' : null,
    miniatura: enSalida('miniatura.png') ? 'salida/miniatura.png' : null,
  };
}
