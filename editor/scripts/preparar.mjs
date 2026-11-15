// Uso:  node scripts/preparar.mjs ../videos/mi-caso [--voz-prueba]
//
// 1. Lee guion.md y crea voz.txt (el texto limpio para pegar en Loquendo / Voz de Soria).
// 2. Si en la carpeta hay un audio (voz.wav / voz.mp3 / ...), lo sincroniza con las escenas
//    y deja todo listo para renderizar.
//    Con --voz-prueba genera una voz robótica de prueba (espeak-ng) para ver el resultado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { leerGuion, textoParaVoz } from './guion.mjs';

const FPS = 30;
const EDITOR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function preparar(carpeta, { vozPrueba = false, sinVoz = false, hasta = null } = {}) {
  carpeta = path.resolve(carpeta);
  const slug = path.basename(carpeta).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const guionPath = path.join(carpeta, 'guion.md');
  if (!fs.existsSync(guionPath)) throw new Error(`No encuentro ${guionPath}`);

  const { meta, escenas } = leerGuion(fs.readFileSync(guionPath, 'utf8'));
  const pron = leerPronunciacion(carpeta);
  for (const e of escenas) e.voz = textoParaVoz(e.narracion, pron);

  // ---- voz.txt ----
  const vozTxt = escenas
    .map((e) => (e.tipo === 'PAUSA' ? '...' : e.voz))
    .filter(Boolean)
    .join('\n\n');
  fs.writeFileSync(path.join(carpeta, 'voz.txt'), vozTxt + '\n');
  const palabras = (vozTxt.match(/\S+/g) || []).length;
  console.log(`✔ voz.txt listo (${palabras} palabras ≈ ${(palabras / 150).toFixed(1)} min de video)`);

  // ---- audio ----
  const salidaPublic = path.join(EDITOR, 'public', 'proyecto', slug);
  fs.rmSync(salidaPublic, { recursive: true, force: true });
  fs.mkdirSync(salidaPublic, { recursive: true });

  let tiempos; // [inicio, fin] en segundos por escena
  let audioPath;
  if (vozPrueba) {
    ({ tiempos, audioPath } = vozDePrueba(escenas, salidaPublic));
  } else if (sinVoz) {
    ({ tiempos, audioPath } = tiemposSinVoz(escenas, salidaPublic));
  } else {
    const encontrado = ['voz.wav', 'voz.mp3', 'voz.m4a', 'voz.ogg', 'audio.wav', 'audio.mp3']
      .map((f) => path.join(carpeta, f)).find((f) => fs.existsSync(f));
    if (!encontrado) {
      console.log('→ Ahora genera el audio con voz.txt y guárdalo en la carpeta como voz.wav o voz.mp3');
      return null;
    }
    audioPath = path.join(salidaPublic, 'voz.wav');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', encontrado, '-ac', '1', '-ar', '44100', audioPath]);
    tiempos = sincronizar(escenas, audioPath);
  }
  let duracion = duracionAudio(audioPath) + 2.5; // colita final
  let n = escenas.length;
  if (hasta && hasta < duracion) {
    // Sólo los primeros `hasta` segundos (para pruebas rápidas)
    duracion = hasta;
    n = Math.max(1, tiempos.filter(([a]) => a < hasta).length);
    escenas.splice(n);
    tiempos.splice(n);
    tiempos[n - 1][1] = Math.min(tiempos[n - 1][1], hasta);
    const recorte = audioPath + '.tmp.wav';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', audioPath, '-t', String(hasta), recorte]);
    fs.renameSync(recorte, audioPath);
    console.log(`  (recortado a los primeros ${hasta} s)`);
  }

  // ---- música ----
  const musicaOrigen = ['musica.mp3', 'musica.wav', 'musica.m4a'].map((f) => path.join(carpeta, f))
    .find((f) => fs.existsSync(f));
  const musicaDestino = path.join(salidaPublic, 'musica.mp3');
  if (musicaOrigen) fs.copyFileSync(musicaOrigen, musicaDestino);
  else generarAmbiente(musicaDestino, duracion);

  // ---- imágenes ----
  const buscarImagen = (nombre) => {
    if (!nombre) return null;
    for (const dir of [path.join(carpeta, 'imagenes'), carpeta]) {
      const p = path.join(dir, nombre);
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, path.join(salidaPublic, path.basename(p)));
        return `proyecto/${slug}/${path.basename(p)}`;
      }
    }
    console.warn(`  ⚠ no encontré la imagen "${nombre}" (uso un relleno)`);
    return null;
  };

  const escenasFinal = escenas.map((e, i) => {
    const datos = e.datos;
    let imagen = null;
    let imagenes = [];
    if (e.tipo === 'IMAGEN') {
      // [IMAGEN: a.jpg, b.jpg | pie]  → varias fotos que se van alternando
      imagenes = (datos[0] ?? '').split(',').map((x) => buscarImagen(x.trim())).filter(Boolean);
      imagen = imagenes[0] ?? null;
    }
    if (e.tipo === 'FICHA') imagen = buscarImagen(datos[4]);
    return {
      tipo: e.tipo,
      datos,
      imagen,
      imagenes,
      inicio: Math.round(tiempos[i][0] * FPS),
      fin: Math.round((i === escenas.length - 1 ? duracion : tiempos[i][1]) * FPS),
    };
  });

  const subtitulos = [];
  escenas.forEach((e, i) => {
    if (!e.narracion) return;
    subtitulos.push(...trozos(e.narracion, tiempos[i][0], tiempos[i][1]).filter((s) => s.inicio < duracion));
  });

  const imagenMiniatura = buscarImagen(meta.imagen_miniatura);
  const datos = {
    slug,
    fps: FPS,
    duracionFrames: Math.ceil(duracion * FPS),
    titulo: meta.titulo ?? slug,
    miniatura: {
      texto: meta.miniatura ?? meta.titulo ?? '',
      etiqueta: meta.etiqueta ?? 'SIN RESOLVER',
      imagen: imagenMiniatura,
      mapa: escenasFinal.find((e) => e.tipo === 'MAPA')?.datos ?? null,
    },
    audio: `proyecto/${slug}/voz.wav`,
    musica: `proyecto/${slug}/musica.mp3`,
    escenas: escenasFinal,
    subtitulos: subtitulos.map((s) => ({
      texto: s.texto,
      inicio: Math.round(s.inicio * FPS),
      fin: Math.round(s.fin * FPS),
    })),
  };
  fs.writeFileSync(path.join(salidaPublic, 'datos.json'), JSON.stringify(datos, null, 1));
  fs.writeFileSync(path.join(EDITOR, 'public', 'proyecto', 'actual.json'), JSON.stringify(datos));
  generarEfectos();
  escribirCapitulos(carpeta, escenasFinal);
  console.log(`✔ Sincronizado: ${escenasFinal.length} escenas, ${(duracion / 60).toFixed(1)} min`);
  return { datos, carpeta };
}

export function opcionesDeArgs(argv) {
  const i = argv.indexOf('--hasta');
  return {
    vozPrueba: argv.includes('--voz-prueba'),
    sinVoz: argv.includes('--sin-voz'),
    hasta: i > -1 ? parseFloat(argv[i + 1]) : null,
  };
}

function leerPronunciacion(carpeta) {
  // pronunciacion.txt:  Dyatlov = Diátlov   (una por línea)
  const p = path.join(carpeta, 'pronunciacion.txt');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const l of fs.readFileSync(p, 'utf8').split('\n')) {
    const [a, b] = l.split('=').map((s) => s?.trim());
    if (a && b) out[a] = b;
  }
  return out;
}

function duracionAudio(f) {
  return parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', f]).toString());
}

// Reparte el audio entre escenas según el largo del texto y ajusta los cortes a los silencios reales.
function sincronizar(escenas, audio) {
  const total = duracionAudio(audio);
  // ffmpeg escribe el resultado en stderr
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', audio, '-af',
    'silencedetect=noise=-32dB:d=0.25', '-f', 'null', '-']).stderr.toString();
  const silencios = [];
  let ini = null;
  for (const l of log.split('\n')) {
    const a = l.match(/silence_start: ([\d.]+)/);
    const b = l.match(/silence_end: ([\d.]+)/);
    if (a) ini = parseFloat(a[1]);
    if (b && ini !== null) { silencios.push((ini + parseFloat(b[1])) / 2); ini = null; }
  }

  const peso = (e) => (e.tipo === 'PAUSA' ? (parseFloat(e.datos[0]) || 1) * 14 : e.voz.length);
  const pesos = escenas.map(peso);
  const suma = pesos.reduce((a, b) => a + b, 0) || 1;
  const cortes = [0];
  let acc = 0;
  for (let i = 0; i < escenas.length - 1; i++) {
    acc += pesos[i];
    let t = (acc / suma) * total;
    if (pesos[i + 1] > 0 && pesos[i] > 0) {
      const cerca = silencios.filter((s) => Math.abs(s - t) < 1.8 && s > cortes.at(-1) + 0.3)
        .sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0];
      if (cerca !== undefined) t = cerca;
    }
    cortes.push(Math.max(t, cortes.at(-1)));
  }
  cortes.push(total);
  return repartirVacias(escenas, cortes.slice(0, -1).map((c, i) => [c, cortes[i + 1]]));
}

// Escenas sin narración (p. ej. [MAPA] justo antes de [FECHA]) comparten el tiempo de la siguiente.
function repartirVacias(escenas, tiempos) {
  const t = tiempos.map((x) => [...x]);
  let i = 0;
  while (i < escenas.length) {
    if (escenas[i].voz || escenas[i].tipo === 'PAUSA') { i++; continue; }
    let j = i;
    while (j < escenas.length && !escenas[j].voz && escenas[j].tipo !== 'PAUSA') j++;
    if (j >= escenas.length) break;
    const [a, b] = t[j];
    const n = j - i + 1;
    // las vacías se quedan al menos 2.5 s, pero nunca más de la mitad del bloque
    const paso = Math.min(Math.max((b - a) / n, 2.5), (b - a) / 2 / (n - 1));
    for (let k = 0; k < n - 1; k++) t[i + k] = [a + paso * k, a + paso * (k + 1)];
    t[j] = [a + paso * (n - 1), b];
    i = j + 1;
  }
  return t;
}

// Corta la narración en frases cortas para los subtítulos.
function trozos(texto, inicio, fin) {
  const palabras = texto.replace(/\s+/g, ' ').trim().split(' ');
  const grupos = [];
  let g = [];
  for (const p of palabras) {
    g.push(p);
    if (g.length >= 6 || (g.length >= 3 && /[.,;:?!…]$/.test(p))) { grupos.push(g.join(' ')); g = []; }
  }
  if (g.length) grupos.push(g.join(' '));
  const largo = grupos.reduce((a, s) => a + s.length + 4, 0);
  let t = inicio;
  return grupos.map((s) => {
    const d = ((s.length + 4) / largo) * (fin - inicio);
    const r = { texto: s, inicio: t, fin: t + d };
    t += d;
    return r;
  });
}

// Sin audio: estima los tiempos con la velocidad típica de Loquendo (~2.6 palabras por segundo)
// y deja un audio en silencio, para ver el ritmo del video antes de grabar la voz.
function tiemposSinVoz(escenas, dir) {
  const PPS = 2.6;
  const tiempos = [];
  let t = 0.6;
  for (const e of escenas) {
    let d = 0;
    if (e.tipo === 'PAUSA') d = parseFloat(e.datos[0]) || 1;
    else if (e.voz) d = (e.voz.match(/\S+/g) || []).length / PPS + 0.45;
    tiempos.push([t, t + d]);
    t += d;
  }
  const audioPath = path.join(dir, 'voz.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
    '-t', String(t), audioPath]);
  return { tiempos: repartirVacias(escenas, tiempos), audioPath };
}

function vozDePrueba(escenas, dir) {
  const partes = [];
  const tiempos = [];
  let t = 0.6;
  const silencio = (seg, nombre) => {
    const f = path.join(dir, nombre);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
      `anullsrc=r=22050:cl=mono`, '-t', String(seg), f]);
    return f;
  };
  partes.push(silencio(0.6, 'sil0.wav'));
  escenas.forEach((e, i) => {
    if (e.tipo === 'PAUSA') {
      const s = parseFloat(e.datos[0]) || 1;
      partes.push(silencio(s, `p${i}.wav`));
      tiempos.push([t, t + s]); t += s; return;
    }
    if (!e.voz) { tiempos.push([t, t]); return; }
    const f = path.join(dir, `p${i}.wav`);
    execFileSync('espeak-ng', ['-v', 'es-419', '-s', '150', '-p', '35', '-w', f, e.voz]);
    const d = duracionAudio(f);
    partes.push(f, silencio(0.45, `s${i}.wav`));
    tiempos.push([t, t + d + 0.45]); t += d + 0.45;
  });
  const lista = path.join(dir, 'lista.txt');
  fs.writeFileSync(lista, partes.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  const audioPath = path.join(dir, 'voz.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista,
    '-ac', '1', '-ar', '44100', audioPath]);
  for (const p of [...partes, lista]) fs.rmSync(p, { force: true });
  return { tiempos: repartirVacias(escenas, tiempos), audioPath };
}

// Ambiente de suspenso sintetizado (para cuando no hay musica.mp3 en la carpeta).
function generarAmbiente(destino, segundos) {
  const d = Math.ceil(segundos);
  const filtro = [
    `sine=f=55:d=${d}[a]`, `sine=f=82.4:d=${d}[b]`, `sine=f=110.6:d=${d}[c]`,
    `anoisesrc=d=${d}:c=brown:a=0.35,lowpass=f=300[n]`,
    `[a][b][c][n]amix=inputs=4:weights=1 0.6 0.35 0.5,tremolo=f=0.12:d=0.5,` +
      `aecho=0.8:0.7:900|1400:0.35|0.25,afade=t=in:d=4,afade=t=out:st=${Math.max(d - 4, 0)}:d=4,volume=1.6`,
  ].join(';');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-filter_complex', filtro, '-ac', '2',
    '-b:a', '160k', destino]);
}

// Efectos de sonido sintetizados (whoosh, golpe de sello, boom del título).
function generarEfectos() {
  const dir = path.join(EDITOR, 'public', 'sfx');
  fs.mkdirSync(dir, { recursive: true });
  const efectos = {
    'whoosh.mp3': `anoisesrc=d=0.9:c=pink:a=0.8,bandpass=f=900:w=1.4,afade=t=in:d=0.35,afade=t=out:st=0.4:d=0.5,volume=1.4`,
    'golpe.mp3': `sine=f=65:d=0.6,afade=t=out:d=0.6,volume=3[a];anoisesrc=d=0.12:c=brown:a=0.9,lowpass=f=1200[b];[a][b]amix=inputs=2,volume=2.5`,
    'boom.mp3': `sine=f=42:d=2.5,afade=t=out:d=2.5,volume=3[a];anoisesrc=d=2.5:c=brown:a=0.6,lowpass=f=200,afade=t=out:d=2.5[b];[a][b]amix=inputs=2,aecho=0.8:0.6:300:0.4,volume=2.5`,
  };
  for (const [nombre, filtro] of Object.entries(efectos)) {
    const f = path.join(dir, nombre);
    if (fs.existsSync(f)) continue;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-filter_complex', filtro, '-ac', '2', f]);
  }
}

function escribirCapitulos(carpeta, escenas) {
  const fmt = (f) => {
    const s = Math.floor(f / FPS);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const caps = escenas.filter((e) => e.tipo === 'TITULO').map((e) => `${fmt(e.inicio)} ${e.datos[0]}`);
  if (caps.length) {
    if (!caps[0].startsWith('0:00')) caps.unshift('0:00 Introducción');
    fs.writeFileSync(path.join(carpeta, 'capitulos.txt'), caps.join('\n') + '\n');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const carpeta = process.argv[2];
  if (!carpeta) {
    console.log('Uso: node scripts/preparar.mjs <carpeta-del-video> [--voz-prueba]');
    process.exit(1);
  }
  preparar(carpeta, opcionesDeArgs(process.argv));
}
