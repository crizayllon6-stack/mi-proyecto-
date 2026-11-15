// Mira Ideas/ y videos/ cada 3 segundos. Si algo cambia, regenera Panel.html
// y el Panel abierto en el navegador se recarga solo. Lo arranca "Abrir Fabrica.bat".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generar } from './generar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  recorrer(path.join(RAIZ, 'videos'));
  return partes.join(';');
}

let ultima = firma();
generar();
const inicio = Date.now();
setInterval(() => {
  if (Date.now() - inicio > 16 * 3600 * 1000) process.exit(0); // se apaga solo después de 16 h
  const f = firma();
  if (f !== ultima) {
    ultima = f;
    try { generar(); } catch (e) { console.error('Panel:', e.message); }
  }
}, 3000);
