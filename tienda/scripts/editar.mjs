// Editor de videos de la tienda para TikTok.
// Uso:  node scripts/editar.mjs                 → edita todos los videos nuevos de la carpeta entrada/
//       node scripts/editar.mjs entrada/mi.mp4  → edita sólo ese
// Resultado en listos/:  <nombre>_tiktok.mp4  y  <nombre>.srt
//
// Pasos: detecta los cortes → escucha el audio (Whisper) → elige zooms y transiciones → arma el video vertical.
// Si Whisper se equivoca en una palabra: corrige trabajo/<nombre>/palabras.json y vuelve a correrlo.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config.json'), 'utf8'));
const FPS = 30;
const EXT = /\.(mp4|mov|m4v|mkv|webm)$/i;
const ENTRADA = path.join(RAIZ, 'entrada');
const LISTOS = path.join(RAIZ, 'listos');
const TRABAJO = path.join(RAIZ, 'trabajo');
for (const d of [ENTRADA, LISTOS, TRABAJO]) fs.mkdirSync(d, { recursive: true });

const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

// ---------- 1. Datos del video ----------
function datosVideo(archivo) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', archivo]).toString());
  const v = j.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error('el archivo no tiene video');
  const rot = Math.abs(parseInt(v.tags?.rotate ?? v.side_data_list?.find((x) => x.rotation !== undefined)?.rotation ?? 0, 10));
  let [w, h] = [v.width, v.height];
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  return {
    ancho: w, alto: h, vertical: h >= w,
    duracion: parseFloat(j.format.duration),
    tieneAudio: j.streams.some((s) => s.codec_type === 'audio'),
  };
}

// ---------- 2. Cortes (donde cambia la toma) ----------
function detectarCortes(archivo) {
  const umbral = CONFIG.sensibilidad_cortes ?? 0.3;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', archivo, '-an', '-vf',
    `scale=320:-2,select='gt(scene,${umbral})',showinfo`, '-f', 'null', '-'], { maxBuffer: 1 << 28 });
  const tiempos = [...r.stderr.toString().matchAll(/pts_time:([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const cortes = [];
  for (const t of tiempos) if (t > 0.5 && (!cortes.length || t - cortes.at(-1) > 0.7)) cortes.push(t);
  return cortes;
}

// ---------- 3. Escuchar el audio (Whisper) ----------
async function transcribir(archivo, carpeta) {
  const guardado = path.join(carpeta, 'palabras.json');
  if (fs.existsSync(guardado)) {
    console.log('  · uso palabras.json (ya transcrito; bórralo para volver a escuchar)');
    return JSON.parse(fs.readFileSync(guardado, 'utf8'));
  }
  const wav = path.join(carpeta, 'audio.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', archivo, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const { installWhisperCpp, downloadWhisperModel, transcribe } = await import('@remotion/install-whisper-cpp');
  const whisperPath = path.join(RAIZ, 'whisper.cpp');
  const version = '1.5.5';
  const modelo = CONFIG.modelo_whisper ?? 'small';
  console.log('  · preparando Whisper (la primera vez descarga ~500 MB, después ya no)');
  await installWhisperCpp({ to: whisperPath, version, printOutput: false });
  await downloadWhisperModel({ model: modelo, folder: whisperPath, printOutput: false });
  console.log('  · escuchando el audio…');
  const res = await transcribe({
    inputPath: wav, whisperPath, whisperCppVersion: version, model: modelo, modelFolder: whisperPath,
    tokenLevelTimestamps: true, splitOnWord: true, language: CONFIG.idioma ?? 'es', printOutput: false,
  });
  const palabras = [];
  for (const item of res.transcription) {
    for (const tk of item.tokens) {
      const texto = tk.text.trim();
      if (!texto || /^\[_|^\[.*\]$/.test(texto)) continue;
      const nueva = /^\s/.test(tk.text) || !palabras.length;
      if (!nueva && palabras.length) { palabras.at(-1).texto += texto; palabras.at(-1).finMs = tk.offsets.to; continue; }
      palabras.push({ texto, inicioMs: tk.offsets.from, finMs: tk.offsets.to });
    }
  }
  fs.writeFileSync(guardado, JSON.stringify(palabras, null, 1));
  return palabras;
}

// ---------- 4. Subtítulos .srt ----------
function escribirSrt(palabras, destino) {
  const hms = (ms) => {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(Math.round(ms % 1000)).padStart(3, '0')}`;
  };
  const porBloque = CONFIG.subtitulos?.palabras_por_bloque ?? 3;
  const bloques = [];
  for (let i = 0; i < palabras.length; i += porBloque) bloques.push(palabras.slice(i, i + porBloque));
  fs.writeFileSync(destino, bloques.map((b, i) =>
    `${i + 1}\n${hms(b[0].inicioMs)} --> ${hms(b.at(-1).finMs)}\n${b.map((p) => p.texto).join(' ')}\n`).join('\n'));
}

// ---------- 5. Armar el video ----------
async function editar(archivo) {
  const base = path.basename(archivo).replace(EXT, '');
  const slug = base.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';
  const carpeta = path.join(TRABAJO, slug);
  const pub = path.join(carpeta, 'public');
  fs.mkdirSync(pub, { recursive: true });
  console.log(`\n▶ ${path.basename(archivo)}`);

  const info = datosVideo(archivo);
  console.log(`  · ${info.ancho}x${info.alto} · ${info.duracion.toFixed(1)} s · ${info.vertical ? 'vertical' : 'horizontal'}`);
  const cortes = detectarCortes(archivo);
  console.log(`  · ${cortes.length} cortes detectados`);
  const palabras = info.tieneAudio ? await transcribir(archivo, carpeta) : [];
  console.log(`  · ${palabras.length} palabras para los subtítulos`);

  // zooms de golpe en palabras clave (separados al menos 2,5 s y lejos de los cortes)
  const clave = new Set((CONFIG.palabras_con_zoom ?? []).map(normal));
  const golpes = [];
  for (const p of palabras) {
    const t = p.inicioMs / 1000;
    if (!clave.has(normal(p.texto))) continue;
    if (golpes.length && t - golpes.at(-1) < 2.5) continue;
    if (cortes.some((c) => Math.abs(c - t) < 0.4)) continue;
    golpes.push(t);
  }
  console.log(`  · ${golpes.length} zooms en palabras clave`);

  // el video original se enlaza (o copia) en la carpeta pública del editor
  const ext = path.extname(archivo).toLowerCase();
  const fuente = path.join(pub, `fuente${ext}`);
  fs.rmSync(fuente, { force: true });
  try { fs.linkSync(archivo, fuente); } catch { fs.copyFileSync(archivo, fuente); }

  const s = CONFIG.subtitulos ?? {};
  const datos = {
    src: `fuente${ext}`, fps: FPS, duracionFrames: Math.max(1, Math.round(info.duracion * FPS)), vertical: info.vertical,
    cortes: cortes.map((t) => Math.round(t * FPS)),
    golpes: golpes.map((t) => Math.round(t * FPS)),
    palabras: palabras.map((p) => ({ texto: p.texto, inicio: Math.round((p.inicioMs / 1000) * FPS), fin: Math.round((p.finMs / 1000) * FPS) })),
    opciones: {
      zoomCortes: CONFIG.zoom_en_cortes !== false, zoomLento: CONFIG.zoom_lento !== false,
      transiciones: CONFIG.transiciones !== false,
      colorActiva: s.color_activa ?? '#FFE600', color: s.color ?? '#FFFFFF',
      porBloque: s.palabras_por_bloque ?? 3, tamano: s.tamano ?? 84, altura: s.altura ?? 0.66,
    },
  };
  fs.writeFileSync(path.join(carpeta, 'plan.json'), JSON.stringify(datos, null, 1));
  if (palabras.length) escribirSrt(palabras, path.join(LISTOS, `${base}.srt`));

  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, selectComposition } = await import('@remotion/renderer');
  console.log('  · armando el video…');
  const serveUrl = await bundle({ entryPoint: path.join(RAIZ, 'src', 'index.ts'), publicDir: pub });
  const navegador = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-linux64/chrome-headless-shell']
    .filter(Boolean).find((p) => fs.existsSync(p)) ?? null;
  const inputProps = { datos };
  const comp = await selectComposition({ serveUrl, id: 'TikTok', inputProps, browserExecutable: navegador });
  const salida = path.join(LISTOS, `${base}_tiktok.mp4`);
  let ultimo = -1;
  const t0 = Date.now();
  await renderMedia({
    serveUrl, composition: comp, inputProps, browserExecutable: navegador, codec: 'h264', crf: 19,
    concurrency: Math.max(1, os.cpus().length - 1), outputLocation: salida,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== ultimo) { ultimo = p; process.stdout.write(`\r  · ${Math.round(progress * 100)}%   `); }
    },
  });
  console.log(`\n✔ Listo en ${((Date.now() - t0) / 60000).toFixed(1)} min → ${salida}`);
}

// ---------- Qué videos editar ----------
const args = process.argv.slice(2);
const lista = args.length
  ? args.map((a) => path.resolve(a))
  : fs.readdirSync(ENTRADA).filter((f) => EXT.test(f)).map((f) => path.join(ENTRADA, f)).filter((f) => {
    const hecho = path.join(LISTOS, `${path.basename(f).replace(EXT, '')}_tiktok.mp4`);
    return !fs.existsSync(hecho) || fs.statSync(hecho).mtimeMs < fs.statSync(f).mtimeMs;
  });
if (!lista.length) {
  console.log('No hay videos nuevos. Pon tus videos en la carpeta "entrada" y vuelve a abrir esto.');
  process.exit(0);
}
let fallos = 0;
for (const a of lista) {
  try { await editar(a); } catch (e) { fallos++; console.error(`\n✖ Falló ${path.basename(a)}: ${e.message}`); }
}
console.log(fallos ? `\nTerminó con ${fallos} error(es). Pásale el mensaje a Claude.` : '\nTodo listo. Tus videos están en la carpeta "listos".');
