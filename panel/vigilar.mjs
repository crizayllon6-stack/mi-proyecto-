// Lo arranca "Abrir Fabrica.bat" y queda trabajando en segundo plano:
//  1. Mira Ideas/ y videos/ cada 3 segundos y regenera Panel.html (el Panel abierto se recarga solo).
//  2. Cuando dejas la voz (voz.wav / voz.mp3) en la carpeta de un caso, ARMA SOLO el video, los Shorts
//     y el kit para CapCut (salida/capcut).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generar } from './generar.mjs';
import { marcar } from './estado.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIDEOS = path.join(RAIZ, 'videos');
const EDITOR = path.join(RAIZ, 'editor');
const VOCES = ['voz.wav', 'voz.mp3', 'voz.m4a', 'voz.ogg'];

function firma() {
  const partes = [];
  const recorrer = (d, prof = 0) => {
    if (!fs.existsSync(d) || prof > 3) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') recorrer(p, prof + 1); continue; }
      try { const s = fs.statSync(p); partes.push(`${p}|${s.size}|${s.mtimeMs}`); } catch {}
    }
  };
  recorrer(path.join(RAIZ, 'Ideas'));
  recorrer(VIDEOS);
  return partes.join(';');
}

// ---------- Armado automático ----------
const tamanos = new Map(); // voz → tamaño visto la vez anterior (para saber si ya terminó de guardarse)
let ocupado = false;

const mtime = (p) => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0);

function pendientes() {
  if (!fs.existsSync(VIDEOS)) return [];
  const out = [];
  for (const d of fs.readdirSync(VIDEOS, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('prueba')) continue;
    const c = path.join(VIDEOS, d.name);
    if (!fs.existsSync(path.join(c, 'guion.md'))) continue;
    const voz = VOCES.map((f) => path.join(c, f)).find((f) => fs.existsSync(f));
    if (!voz) continue;
    const tam = fs.statSync(voz).size;
    const antes = tamanos.get(voz);
    tamanos.set(voz, tam);
    if (antes !== tam || tam < 10000) continue; // todavía se está guardando
    const tVoz = mtime(voz);
    const salida = path.join(c, 'salida');
    const hecho = Math.min(mtime(path.join(salida, 'video.mp4')), mtime(path.join(salida, 'short-1.mp4')));
    const fallo = mtime(path.join(salida, 'error.txt'));
    if (hecho > tVoz || fallo > tVoz) continue; // ya armado con esta voz (o falló: hay que avisar a Claude)
    out.push({ nombre: d.name, carpeta: c });
  }
  return out;
}

function correr(script, carpeta, log, extra = []) {
  return new Promise((ok, no) => {
    const p = spawn(process.execPath, [path.join('scripts', script), carpeta, ...extra], { cwd: EDITOR });
    p.stdout.on('data', (b) => fs.appendFileSync(log, b));
    p.stderr.on('data', (b) => fs.appendFileSync(log, b));
    p.on('close', (code) => (code === 0 ? ok() : no(new Error(`${script} terminó con error ${code}`))));
  });
}

async function armar({ nombre, carpeta }) {
  ocupado = true;
  const salida = path.join(carpeta, 'salida');
  fs.mkdirSync(salida, { recursive: true });
  const log = path.join(salida, 'armado.log');
  fs.writeFileSync(log, `Armado automático ${new Date().toLocaleString()}\n`);
  fs.rmSync(path.join(salida, 'error.txt'), { force: true });
  try {
    marcar('inicio', 'video', `Armando el video de ${nombre}`, 20);
    generar();
    await correr('render.mjs', carpeta, log);
    marcar('fin', 'video');
    marcar('inicio', 'shorts', `Haciendo los 3 Shorts de ${nombre}`, 10);
    generar();
    await correr('shorts.mjs', carpeta, log);
    marcar('fin', 'shorts');
    marcar('inicio', 'capcut', `Kit para CapCut (video sin subtítulos) de ${nombre}`, 20);
    generar();
    await correr('render.mjs', carpeta, log, ['--solo-limpio']);
    marcar('fin', 'capcut');
  } catch (e) {
    marcar('fin', 'video'); marcar('fin', 'shorts'); marcar('fin', 'capcut');
    fs.writeFileSync(path.join(salida, 'error.txt'),
      `${e.message}\nRevisa ${log}\nDile a Claude: "Falló el armado de ${nombre}, revisa salida/armado.log"\n`);
  }
  ocupado = false;
  generar();
}

// ---------- Bucle ----------
let ultima = firma();
generar();
const inicio = Date.now();
setInterval(() => {
  if (!ocupado && Date.now() - inicio > 16 * 3600 * 1000) process.exit(0); // se apaga solo después de 16 h
  if (!ocupado) {
    const [siguiente] = pendientes();
    if (siguiente) armar(siguiente);
  }
  const f = firma();
  if (f !== ultima) {
    ultima = f;
    try { generar(); } catch (e) { console.error('Panel:', e.message); }
  }
}, 3000);
