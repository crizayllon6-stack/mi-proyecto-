// Uso:  node scripts/shorts.mjs ../videos/mi-caso [--sin-voz | --voz-prueba] [--cuantos 3] [--solo 1]
//
// Saca Shorts verticales (máx. 58 s) del video largo:
//   <carpeta>/salida/short-1.mp4, short-2.mp4, short-3.mp4
// Cada Short empieza en una escena con gancho (el inicio del video, un [TEXTO] o un [TITULO])
// y termina en un cambio de escena, para que no corte una frase a la mitad.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { opcionesDeArgs, preparar } from './preparar.mjs';

const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const valor = (n, d) => (args.includes(n) ? parseInt(args[args.indexOf(n) + 1], 10) : d);
const carpeta = args.find((a, i) => !a.startsWith('--') && !['--cuantos', '--solo', '--hasta'].includes(args[i - 1]));
if (!carpeta) {
  console.log('Uso: node scripts/shorts.mjs <carpeta-del-video> [--sin-voz] [--cuantos 3] [--solo 1]');
  process.exit(1);
}

export function elegirTramos(datos, cuantos = 3) {
  const { escenas, fps, duracionFrames: total } = datos;
  const MAX = 58 * fps, MIN = 25 * fps;
  const candidatas = escenas
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => i === 0 || e.tipo === 'TEXTO' || e.tipo === 'TITULO');
  const metas = [0, 0.4, 0.7, 0.25, 0.55, 0.85].slice(0, cuantos);
  const elegidos = [];
  for (const m of metas) {
    const objetivo = m * total;
    const libres = candidatas.filter(({ e }) =>
      e.inicio + MIN < total && elegidos.every((x) => e.inicio >= x.fin || e.inicio + MAX <= x.inicio));
    if (!libres.length) break;
    const { e, i } = libres.sort((a, b) => Math.abs(a.e.inicio - objetivo) - Math.abs(b.e.inicio - objetivo))[0];
    // termina en el último cambio de escena que quepa en 58 s
    const cortes = escenas.slice(i).map((x) => x.fin).filter((f) => f - e.inicio <= MAX && f - e.inicio >= MIN);
    const fin = cortes.length ? Math.max(...cortes) : Math.min(e.inicio + MAX, total);
    const textoEnTramo = escenas.slice(i).find((x) => x.tipo === 'TEXTO' && x.inicio < fin);
    const delTitulo = e.tipo === 'TITULO' ? (e.datos[1] || e.datos[0]) : null;
    const gancho = i === 0 ? datos.miniatura.texto
      : (delTitulo ?? textoEnTramo?.datos[0] ?? e.datos[0] ?? datos.miniatura.texto);
    elegidos.push({ inicio: e.inicio, fin, gancho });
  }
  return elegidos.sort((a, b) => a.inicio - b.inicio);
}

const listo = preparar(carpeta, opcionesDeArgs(process.argv));
if (!listo) process.exit(0);
const { datos } = listo;
const tramos = elegirTramos(datos, valor('--cuantos', 3));
const solo = valor('--solo', null);

const navegadores = [process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-linux64/chrome-headless-shell']
  .filter(Boolean).filter((p) => fs.existsSync(p));
const browserExecutable = navegadores[0] ?? null;

console.log('… empaquetando el editor');
const serveUrl = await bundle({ entryPoint: path.join(EDITOR, 'src', 'index.ts'), publicDir: path.join(EDITOR, 'public') });
const salida = path.join(path.resolve(carpeta), 'salida');
fs.mkdirSync(salida, { recursive: true });

const fmt = (f) => `${Math.floor(f / datos.fps / 60)}:${String(Math.floor(f / datos.fps) % 60).padStart(2, '0')}`;
const lista = [];
for (const [k, t] of tramos.entries()) {
  const n = k + 1;
  lista.push(`short-${n}.mp4  ${fmt(t.inicio)}–${fmt(t.fin)}  "${t.gancho}"`);
  if (solo && solo !== n) continue;
  const inputProps = { datos, ...t };
  const comp = await selectComposition({ serveUrl, id: 'Short', inputProps, browserExecutable });
  await renderMedia({
    serveUrl, composition: comp, inputProps, browserExecutable, codec: 'h264', crf: 20,
    concurrency: Math.max(1, os.cpus().length - 1),
    outputLocation: path.join(salida, `short-${n}.mp4`),
  });
  console.log(`✔ short-${n}.mp4  (${fmt(t.inicio)} a ${fmt(t.fin)})  gancho: ${t.gancho}`);
}
fs.writeFileSync(path.join(salida, 'shorts.txt'), lista.join('\n') + '\n');
