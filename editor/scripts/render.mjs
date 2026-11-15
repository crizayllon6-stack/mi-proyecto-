// Uso:  node scripts/render.mjs ../videos/mi-caso [--voz-prueba | --sin-voz] [--hasta 60] [--solo-miniatura] [--rapido]
//        [--limpio]  también hace capcut/video_sin_subtitulos.mp4   [--solo-limpio] sólo ese
//
// Prepara el guion + audio y renderiza:
//   <carpeta>/salida/video.mp4
//   <carpeta>/salida/miniatura.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { opcionesDeArgs, preparar } from './preparar.mjs';

const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

escribirKit(datos, path.resolve(carpeta), salida);
console.log('✔ kit para CapCut en salida/capcut');

if (args.includes('--solo-limpio')) {
  await renderVideo({ ...inputProps, sinSubtitulos: true }, path.join(salida, 'capcut', 'video_sin_subtitulos.mp4'));
  process.exit(0);
}

const mini = await selectComposition({ serveUrl, id: 'Miniatura', inputProps, browserExecutable });
await renderStill({ serveUrl, composition: mini, inputProps, browserExecutable,
  output: path.join(salida, 'miniatura.png') });
console.log('✔ miniatura.png');
if (args.includes('--solo-miniatura')) process.exit(0);

async function renderVideo(props, destino) {
  const comp = await selectComposition({ serveUrl, id: 'Video', inputProps: props, browserExecutable });
  let ultimo = -1;
  const inicio = Date.now();
  await renderMedia({
    serveUrl, composition: comp, inputProps: props, browserExecutable,
    codec: 'h264',
    crf: args.includes('--rapido') ? 28 : 18,
    concurrency: Math.max(1, os.cpus().length - 1),
    outputLocation: destino,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== ultimo) { ultimo = p; process.stdout.write(`\r  renderizando ${Math.round(progress * 100)}%   `); }
    },
  });
  console.log(`\n✔ ${path.basename(destino)} listo en ${((Date.now() - inicio) / 60000).toFixed(1)} min → ${path.dirname(destino)}`);
}

await renderVideo(inputProps, path.join(salida, 'video.mp4'));
if (args.includes('--limpio')) {
  await renderVideo({ ...inputProps, sinSubtitulos: true }, path.join(salida, 'capcut', 'video_sin_subtitulos.mp4'));
}

// ---------- Kit para editar en CapCut ----------
function escribirKit(datos, carpeta, salida) {
  const kit = path.join(salida, 'capcut');
  fs.mkdirSync(kit, { recursive: true });
  const pub = (f) => path.join(EDITOR, 'public', f);
  if (fs.existsSync(pub(datos.audio))) fs.copyFileSync(pub(datos.audio), path.join(kit, 'voz.wav'));
  if (fs.existsSync(pub(datos.musica))) fs.copyFileSync(pub(datos.musica), path.join(kit, 'musica_fondo.mp3'));
  const sfx = path.join(kit, 'efectos');
  fs.mkdirSync(sfx, { recursive: true });
  for (const f of ['whoosh.mp3', 'golpe.mp3', 'boom.mp3']) if (fs.existsSync(pub('sfx/' + f))) fs.copyFileSync(pub('sfx/' + f), path.join(sfx, f));
  const imgs = path.join(carpeta, 'imagenes');
  if (fs.existsSync(imgs)) {
    fs.mkdirSync(path.join(kit, 'fotos'), { recursive: true });
    for (const f of fs.readdirSync(imgs)) fs.copyFileSync(path.join(imgs, f), path.join(kit, 'fotos', f));
  }
  if (fs.existsSync(path.join(carpeta, 'creditos.txt'))) fs.copyFileSync(path.join(carpeta, 'creditos.txt'), path.join(kit, 'creditos.txt'));

  const fps = datos.fps;
  const hms = (f, ms = false) => {
    const t = f / fps, h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    const base = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return ms ? `${base},${String(Math.round((t % 1) * 1000)).padStart(3, '0')}` : base.replace(/^00:/, '');
  };
  fs.writeFileSync(path.join(kit, 'subtitulos.srt'),
    datos.subtitulos.map((s, i) => `${i + 1}\n${hms(s.inicio, true)} --> ${hms(s.fin, true)}\n${s.texto}\n`).join('\n'));

  const queSeVe = (e) => {
    const fotos = (e.imagenes?.length ? e.imagenes : e.imagen ? [e.imagen] : []).map((x) => path.basename(x));
    switch (e.tipo) {
      case 'IMAGEN': return `Foto: ${fotos.join(', ') || e.datos[0]}${e.datos[1] ? ` (pie: ${e.datos[1]})` : ''}${e.auto ? ' · automática' : ''}`;
      case 'MAPA': return `Mapa: ${e.datos[0]}`;
      case 'FECHA': return `Fecha: ${e.datos.filter(Boolean).join(' · ')}`;
      case 'FICHA': return `Expediente: ${e.datos.slice(0, 4).filter(Boolean).join(' · ')}`;
      case 'DOC': return `Documento: ${e.datos.filter(Boolean).join(' · ')}`;
      case 'TEXTO': return `Texto en pantalla: ${e.datos[0]}`;
      case 'TITULO': return `Título: ${e.datos.filter(Boolean).join(' · ')}`;
      case 'EVIDENCIA': return `${fotos.length ? 'Evidencia (foto)' : 'Reconstrucción dibujada'}: ${e.datos.slice(0, 3).filter(Boolean).join(' · ')}`;
      case 'NOTA': return `Nota escrita a mano: ${e.datos[0]}`;
      case 'LINEA': return `Línea de tiempo: ${e.datos.filter(Boolean).join(' · ')}`;
      default: return 'Pausa';
    }
  };
  const filas = datos.escenas.map((e) =>
    `| ${hms(e.inicio)} | ${hms(e.fin)} | ${queSeVe(e).replace(/\|/g, '/')} | ${(e.texto ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 140)} |`);
  fs.writeFileSync(path.join(kit, 'hoja_de_edicion.md'), `# Hoja de edición: ${datos.titulo}

Tiempos del video final. Úsalos en CapCut para poner tus propias fotos, clips o efectos encima.

| Desde | Hasta | Qué se ve | Qué dice la voz |
|---|---|---|---|
${filas.join('\n')}

## Archivos de esta carpeta
- video_sin_subtitulos.mp4: el video armado SIN subtítulos (si lo pediste), para meter tus propios textos.
- voz.wav: la voz sola. musica_fondo.mp3: la música sola. efectos/: los sonidos (whoosh, golpe, boom).
- subtitulos.srt: los subtítulos, se importan en CapCut (Texto → Importar subtítulos).
- fotos/: las fotos reales del caso. creditos.txt: autores y licencias (van en la descripción).
`);
}
