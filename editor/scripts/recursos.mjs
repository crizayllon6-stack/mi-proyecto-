// Uso:  node scripts/recursos.mjs ../videos/mi-caso
//
// Lee videos/<caso>/recursos.json y baja fotos libres de Wikimedia Commons:
//   videos/<caso>/imagenes/<id>_1.jpg ...
//   videos/<caso>/creditos.txt  (para la descripción de YouTube)
//   videos/<caso>/creditos.json
//
// recursos.json:
// [ { "id": "playa", "busquedas": ["Somerton Park beach"], "debe": ["somerton"], "excluir": ["painting"], "max": 3 } ]
import fs from 'node:fs';
import path from 'node:path';

const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';
const AGENTE = 'FabricaDeCasos/1.0 (uso personal; editor de videos)';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, intentos = 4) {
  for (let i = 0; i < intentos; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': AGENTE } });
    if (r.status === 429 || r.status >= 500) { await esperar(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
    return r;
  }
  throw new Error(`Wikimedia no responde (demasiadas peticiones). Prueba en unos minutos.`);
}

const limpiarHtml = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ¿El resultado es del caso? Todas las palabras de `debe` (con alternativas a|b) y ninguna de `excluir`.
export function sirve(texto, debe = [], excluir = []) {
  const t = normal(texto);
  return debe.every((d) => d.split('|').some((x) => t.includes(normal(x.trim()))))
    && !excluir.some((x) => t.includes(normal(x)));
}

async function buscar(q) {
  const u = new URL(API);
  Object.entries({
    action: 'query', format: 'json', generator: 'search', gsrsearch: `${q} filetype:bitmap`,
    gsrnamespace: '6', gsrlimit: '25', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1920', origin: '*',
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await pedir(u)).json();
  return Object.values(j.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

// Guarda sólo los créditos de las fotos que siguen existiendo (si borraste alguna, sale de la lista).
export function guardarCreditos(carpeta, creditos) {
  const dirImg = path.join(carpeta, 'imagenes');
  const vigentes = creditos.filter((c) => fs.existsSync(path.join(dirImg, c.archivo)));
  fs.writeFileSync(path.join(carpeta, 'creditos.json'), JSON.stringify(vigentes, null, 1));
  fs.writeFileSync(path.join(carpeta, 'creditos.txt'),
    vigentes.map((c) => `${c.titulo} — ${c.autor} — ${c.licencia} — ${c.origen}`).join('\n') + '\n');
  return vigentes;
}

export async function bajarRecursos(carpeta) {
  carpeta = path.resolve(carpeta);
  const lista = JSON.parse(fs.readFileSync(path.join(carpeta, 'recursos.json'), 'utf8'));
  const dirImg = path.join(carpeta, 'imagenes');
  fs.mkdirSync(dirImg, { recursive: true });
  const credPath = path.join(carpeta, 'creditos.json');
  const creditos = fs.existsSync(credPath) ? JSON.parse(fs.readFileSync(credPath, 'utf8')) : [];
  const yaBajados = new Set(creditos.map((c) => c.origen));

  for (const r of lista) {
    const max = r.max ?? 3;
    let n = creditos.filter((c) => c.id === r.id).length;
    for (const q of r.busquedas ?? []) {
      if (n >= max) break;
      let paginas = [];
      try { paginas = await buscar(q); } catch (e) { console.warn(`  ⚠ ${q}: ${e.message}`); continue; }
      for (const p of paginas) {
        if (n >= max) break;
        const info = p.imageinfo?.[0];
        if (!info || !/image\/(jpeg|png)/.test(info.mime) || info.width < 700) continue;
        if (yaBajados.has(info.descriptionurl)) continue;
        const meta = info.extmetadata ?? {};
        const texto = `${p.title} ${limpiarHtml(meta.ImageDescription?.value)} ${limpiarHtml(meta.ObjectName?.value)}`;
        if (!sirve(texto, r.debe, r.excluir)) continue;
        const licencia = limpiarHtml(meta.LicenseShortName?.value) || 'ver página';
        if (/fair use|non-free/i.test(licencia)) continue;
        n++;
        const ext = info.mime === 'image/png' ? 'png' : 'jpg';
        let k = 1;
        while (fs.existsSync(path.join(dirImg, `${r.id}_${k}.jpg`)) || fs.existsSync(path.join(dirImg, `${r.id}_${k}.png`))) k++;
        const archivo = `${r.id}_${k}.${ext}`;
        const img = await pedir(info.thumburl ?? info.url);
        fs.writeFileSync(path.join(dirImg, archivo), Buffer.from(await img.arrayBuffer()));
        creditos.push({
          id: r.id, archivo, titulo: p.title.replace(/^File:/, ''),
          autor: limpiarHtml(meta.Artist?.value) || 'desconocido', licencia, origen: info.descriptionurl,
        });
        yaBajados.add(info.descriptionurl);
        console.log(`  ✔ ${archivo}  ←  ${p.title}`);
        await esperar(400);
      }
    }
    if (n === 0) console.warn(`  ⚠ sin fotos para "${r.id}"`);
  }
  const vigentes = guardarCreditos(carpeta, creditos);
  console.log(`✔ ${vigentes.length} fotos en ${path.join(carpeta, 'imagenes')}`);
  return vigentes;
}

if (process.argv[1] && process.argv[1].endsWith('recursos.mjs')) {
  const carpeta = process.argv[2];
  if (!carpeta) { console.log('Uso: node scripts/recursos.mjs <carpeta-del-video>'); process.exit(1); }
  if (process.argv.includes('--solo-creditos')) {
    // Después de borrar fotos a mano: rehace creditos.txt sin bajar nada
    const c = path.resolve(carpeta);
    const json = path.join(c, 'creditos.json');
    const v = guardarCreditos(c, fs.existsSync(json) ? JSON.parse(fs.readFileSync(json, 'utf8')) : []);
    console.log(`✔ creditos.txt con ${v.length} fotos`);
    process.exit(0);
  }
  await bajarRecursos(carpeta);
}
