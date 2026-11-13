// Uso:  node scripts/render.mjs ../videos/mi-caso [--voz-prueba | --sin-voz] [--hasta 60] [--solo-miniatura] [--rapido]
//
// Prepara el guion + audio y renderiza:
//   <carpeta>/salida/video.mp4
//   <carpeta>/salida/miniatura.png
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { opcionesDeArgs, preparar } from './preparar.mjs';

const EDITOR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const carpeta = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--hasta');
if (!carpeta) {
  console.log('Uso: node scripts/render.mjs <carpeta-del-video> [--voz-prueba | --sin-voz] [--hasta 60] [--solo-miniatura] [--rapido]');
  process.exit(1);
}

const listo = preparar(carpeta, opcionesDeArgs(process.argv));
if (!listo) process.exit(0);
const { datos } = listo;

// En la nube usamos el Chromium ya instalado; en tu compu Remotion descarga el suyo solo.
const navegadores = [process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-linux64/chrome-headless-shell']
  .filter(Boolean).filter((p) => fs.existsSync(p));
const browserExecutable = navegadores[0] ?? null;

console.log('… empaquetando el editor');
const serveUrl = await bundle({ entryPoint: path.join(EDITOR, 'src', 'index.ts'), publicDir: path.join(EDITOR, 'public') });
const inputProps = { datos };
const salida = path.join(path.resolve(carpeta), 'salida');
fs.mkdirSync(salida, { recursive: true });

const mini = await selectComposition({ serveUrl, id: 'Miniatura', inputProps, browserExecutable });
await renderStill({ serveUrl, composition: mini, inputProps, browserExecutable,
  output: path.join(salida, 'miniatura.png') });
console.log('✔ miniatura.png');
if (args.includes('--solo-miniatura')) process.exit(0);

const comp = await selectComposition({ serveUrl, id: 'Video', inputProps, browserExecutable });
let ultimo = -1;
const inicio = Date.now();
await renderMedia({
  serveUrl, composition: comp, inputProps, browserExecutable,
  codec: 'h264',
  crf: args.includes('--rapido') ? 28 : 18,
  concurrency: Math.max(1, os.cpus().length - 1),
  outputLocation: path.join(salida, 'video.mp4'),
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 20);
    if (p !== ultimo) { ultimo = p; process.stdout.write(`\r  renderizando ${Math.round(progress * 100)}%   `); }
  },
});
console.log(`\n✔ video.mp4 listo en ${((Date.now() - inicio) / 60000).toFixed(1)} min → ${salida}`);
