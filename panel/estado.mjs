// Marca tareas en curso para que el Panel muestre una barra de avance.
// Uso:  node panel/estado.mjs inicio <tipo> "<tarea>" <minutos>
//       node panel/estado.mjs fin <tipo>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const JSONP = path.join(DIR, 'estado.json');
const [accion, tipo, tarea, minutos] = process.argv.slice(2);
if (!['inicio', 'fin'].includes(accion) || !tipo) {
  console.log('Uso: node panel/estado.mjs inicio <tipo> "<tarea>" <minutos>  |  node panel/estado.mjs fin <tipo>');
  process.exit(1);
}
let datos = { tareas: [] };
try { datos = JSON.parse(fs.readFileSync(JSONP, 'utf8')); } catch {}
if (accion === 'inicio') {
  datos.tareas = datos.tareas.filter((t) => t.tipo !== tipo);
  datos.tareas.unshift({ tipo, tarea: tarea ?? tipo, activo: true, inicio: Date.now(), estimadoMin: Number(minutos) || 10 });
} else {
  for (const t of datos.tareas) if (t.tipo === tipo && t.activo) { t.activo = false; t.fin = Date.now(); }
}
datos.tareas = datos.tareas.slice(0, 12);
fs.writeFileSync(JSONP, JSON.stringify(datos));
fs.writeFileSync(path.join(DIR, 'estado.js'), `window.PANEL_ESTADO=${JSON.stringify(datos)};\n`);
console.log(`✔ ${accion} ${tipo}`);
