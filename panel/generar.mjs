// Genera Panel.html: todo el sistema en una página (Inicio, Casos, Ranking, Títulos, Avance, Videos).
// Uso:  node panel/generar.mjs [--abrir]
// Todo local: no instala nada ni sube nada a internet.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esc, inline, md } from './md.mjs';
import { PASOS, leerListas, leerVideos } from './datos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const titVisible = (v) => (v.tituloElegido && !/pendiente/i.test(v.tituloElegido) ? v.tituloElegido : v.titulo);
const url = (...p) => p.join('/').split('/').map(encodeURIComponent).join('/');

// Botón que copia un texto para pegarlo en Claude Code
const copiar = (texto, etiqueta, clase = '') =>
  `<button class="btn ${clase}" data-copiar="${esc(texto)}">${etiqueta}</button>`;

// ---------- Qué te toca hacer en cada paso ----------
function accion(v) {
  const c = v.caso;
  switch (v.actual) {
    case 'titulo': return { tu: 'Elige el título y la miniatura (pestaña Títulos).',
      btn: copiar(`/nuevo-video Para ${v.nombre} elijo el título número ? y la miniatura número ? (cambia los ? por los números)`, '📋 Copiar "elijo título…"') };
    case 'guion': case 'verificado': case 'estilo': return { tu: 'Claude está escribiendo y revisando el guion. Si se detuvo, pídele que siga.',
      btn: copiar(`/nuevo-video Sigue con el video ${v.nombre}`, '📋 Copiar "sigue"') };
    case 'aprobado': return { tu: 'Lee el guion (abajo) y apruébalo o pide cambios.',
      btn: copiar(`/nuevo-video Apruebo el guion de ${v.nombre}, sigue.`, '📋 Copiar "apruebo el guion"') };
    case 'fotos': return { tu: 'Claude está buscando fotos reales del caso. Si se detuvo, pídele que siga.',
      btn: copiar(`/nuevo-video Busca las fotos de ${v.nombre} y sigue`, '📋 Copiar "busca las fotos"') };
    case 'voz': return { tu: `Copia el texto, pégalo en Voz de Soria y guarda el audio como <code>${esc(v.carpeta)}/voz.wav</code> (o voz.mp3). <b>El video y los Shorts se arman solos</b> en cuanto dejes la voz.`,
      btn: v.vozTxt ? copiar(v.vozTxt, '🎙️ Copiar texto para Loquendo', 'grande') : '' };
    case 'video': case 'shorts': return v.error ? { tu: `⚠️ Falló el armado del video. Pásale el aviso a Claude para que lo arregle.`,
      btn: copiar(`/nuevo-video Falló el armado de ${v.nombre}, revisa videos/${v.nombre}/salida/armado.log y arréglalo`, '📋 Copiar "falló el armado"') }
      : { tu: 'Ya está la voz: el video y los Shorts se están armando solos (mira la barra en Inicio). Si no avanza, abre el Panel con Abrir Fabrica.bat o pídeselo a Claude.',
      btn: copiar(`/nuevo-video Ya dejé la voz de ${v.nombre}. Arma el video y los Shorts.`, '📋 Copiar "arma el video"') };
    case 'publicado': return { tu: 'Súbelo a YouTube (pestaña Videos: título y descripción listos para copiar).',
      btn: copiar(`/nuevo-video Ya publiqué ${v.nombre}`, '📋 Copiar "ya lo publiqué"') };
    default: return { tu: `¡${esc(c)} está terminado y publicado!`, btn: '' };
  }
}

// ---------- Guion con etiquetas de escena resaltadas ----------
function guionHtml(txt = '') {
  const cuerpo = txt.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return cuerpo.split('\n').map((l) => {
    if (!l.trim()) return '';
    const t = esc(l).replace(/\[([A-ZÁÉÍÓÚ]+)(?::\s*([^\]]*))?\]/g,
      (_, tipo, d) => `<span class="tag t-${tipo.toLowerCase()}">${tipo}${d ? ' · ' + d : ''}</span>`);
    return `<p>${t}</p>`;
  }).join('');
}

function pestanaInicio(listas, videos) {
  const enProceso = videos.filter((v) => v.actual && v.actual !== 'publicado');
  const actual = enProceso[0];
  const listos = videos.filter((v) => v.actual === 'publicado').length;
  const publicados = videos.filter((v) => !v.actual).length;
  const totalCasos = listas.reduce((a, l) => a + l.casos.length, 0);
  let bloque = '';
  if (actual) {
    const a = accion(actual);
    const hechos = PASOS.filter((p) => actual.hecho[p.id]).length;
    bloque = `<div class="resumen"><small>Video en curso</small><b>${esc(titVisible(actual))}</b>
      <small>${esc(actual.caso)} · paso ${PASOS.findIndex((p) => p.id === actual.actual) + 1} de ${PASOS.length}: ${esc(PASOS.find((p) => p.id === actual.actual).nombre)}</small>
      <div class="prog"><i style="width:${Math.round((hechos / PASOS.length) * 100)}%"></i></div>
      <div class="tu"><b>Te toca:</b> ${a.tu}</div><div class="acc">${a.btn}
      <button class="btn sec" data-ir="avance">Ver avance</button></div></div>`;
  }
  return `<h1>Fábrica de Casos</h1>
  <p class="lead">Crímenes y misterios sin resolver reales. Todo se maneja hablando con Claude Code: los botones copian
  el mensaje, tú lo pegas en Claude y él hace el trabajo. Este panel se actualiza solo.</p>
  <div id="cargas"></div>
  ${bloque}
  <div class="acc">
    ${copiar('/nuevo-video Busca casos nuevos', '🔍 Buscar casos nuevos', 'grande')}
    ${copiar('/nuevo-video Busca casos nuevos sobre ', '🎯 Buscar casos de un tema…')}
    ${actual ? copiar(`/nuevo-video Sigue con el video ${actual.nombre}`, '▶️ Seguir con el video en curso') : ''}
  </div>
  <div class="stats">
    <div class="stat"><b>${totalCasos}</b><span>casos propuestos</span></div>
    <div class="stat"><b>${enProceso.length}</b><span>videos en proceso</span></div>
    <div class="stat"><b>${listos}</b><span>listos para subir</span></div>
    <div class="stat"><b>${publicados}</b><span>publicados</span></div>
  </div>
  <h2>Cómo funciona</h2>
  <div class="pasos mini">
    <div class="paso"><div class="mk">1</div><div class="pt"><b>Elige un caso</b><span>Claude busca 15 casos y les pone puntaje. Tú eliges en Casos.</span></div></div>
    <div class="paso"><div class="mk">2</div><div class="pt"><b>Elige título y miniatura</b><span>Antes de escribir, para que el guion cumpla lo que promete.</span></div></div>
    <div class="paso"><div class="mk">3</div><div class="pt"><b>Aprueba el guion</b><span>Escrito para retener, verificado dato por dato y pulido para Loquendo.</span></div></div>
    <div class="paso"><div class="mk">4</div><div class="pt"><b>Pon la voz</b><span>Copias el texto, lo pegas en Voz de Soria y guardas el audio.</span></div></div>
    <div class="paso"><div class="mk">5</div><div class="pt"><b>Video y Shorts solos</b><span>El editor arma el video de 10 min, la miniatura y 3 Shorts.</span></div></div>
  </div>`;
}

function pestanaCasos(listas, videos) {
  if (!listas.length) return `<h1>Casos</h1><p class="lead">Todavía no hay listas. Pulsa "Buscar casos nuevos" en Inicio.</p>`;
  const elegidos = new Set(videos.map((v) => v.origen));
  return `<h1>Casos</h1><p class="lead">Toca un caso para ver el resumen, el giro, las fuentes y los riesgos.
  El número de color es el puntaje del analista (sobre 10). Elige uno con el botón y pégalo en Claude.</p>` +
  listas.map((l, li) => {
    const ordenados = [...l.casos].sort((a, b) => (l.puntajes[b.n]?.total ?? 0) - (l.puntajes[a.n]?.total ?? 0));
    return `<details class="lista" ${li === 0 ? 'open' : ''}><summary><h3>${esc(l.archivo)}</h3>
      <small>${l.casos.length} casos${l.ranking ? ' · con ranking' : ' · sin ranking todavía'}</small></summary>
      ${l.intro.trim() ? `<details class="doc"><summary>Patrones que funcionan (la investigación detrás)</summary><div class="md">${md(l.intro)}</div></details>` : ''}
      ${ordenados.map((c) => {
        const p = l.puntajes[c.n];
        const nivel = !p ? '' : p.total >= 7.5 ? 'alto' : p.total >= 6.5 ? 'medio' : 'bajo';
        const ya = [...elegidos].some((o) => o && o.includes(l.archivo) && new RegExp(`#${c.n}\\b`).test(o));
        const mat = (c.material.match(/MUCHO|MEDIO|POCO/i)?.[0] ?? '').toUpperCase();
        return `<details class="caso"><summary>
          <span class="nota ${nivel}">${p ? p.total.toFixed(1).replace('.', ',') : '–'}</span>
          <span class="ct"><b>${esc(c.titulo)}</b><small>${p ? `Puesto ${p.puesto}` : `Caso ${c.n}`}${mat ? ` · material ${mat.toLowerCase()}` : ''}${ya ? ' · ✅ elegido' : ''}</small></span></summary>
          <div class="md">${Object.entries(c.campos).map(([k, v]) => `<p><b>${esc(k)}:</b> ${inline(v)}</p>`).join('')}</div>
          <div class="acc">${copiar(`/nuevo-video Elijo el caso ${c.n} de ${l.archivo}: ${c.titulo}`, '✅ Elegir este')}</div>
        </details>`;
      }).join('')}</details>`;
  }).join('');
}

function pestanaRanking(listas) {
  const con = listas.filter((l) => l.ranking);
  if (!con.length) return `<h1>Ranking</h1><p class="lead">El analista todavía no puntuó ninguna lista.</p>`;
  return `<h1>Ranking</h1><p class="lead">Qué casos tienen más probabilidad relativa de funcionar, con datos reales de YouTube.
  Nadie puede garantizar visitas: es una comparación.</p>` +
    con.map((l, i) => `<details class="doc" ${i === 0 ? 'open' : ''}><summary>Ranking de ${esc(l.archivo)}</summary>
    <div class="md">${md(l.ranking.replace(/^# .*\n/, ''))}</div></details>`).join('');
}

function pestanaTitulos(videos) {
  const con = videos.filter((v) => v.paquete);
  if (!con.length) return `<h1>Títulos y miniaturas</h1><p class="lead">Aparecen cuando eliges un caso.</p>`;
  return `<h1>Títulos y miniaturas</h1><p class="lead">Elige por número y pégalo en Claude. También puedes escribir tu propio título.</p>` +
    con.map((v, i) => `<details class="doc" ${i === 0 ? 'open' : ''}><summary>${esc(v.caso)}
      ${v.tituloElegido && !/pendiente/i.test(v.tituloElegido) ? `<small> · elegido: ${esc(v.tituloElegido)}</small>` : ''}</summary>
      <div class="acc">${copiar(`/nuevo-video Para ${v.nombre} elijo el título número ? y la miniatura número ? (cambia los ? por los números)`, '📋 Copiar "elijo título… miniatura…"')}</div>
      <div class="md">${md(v.paquete)}</div></details>`).join('');
}

function pestanaAvance(videos) {
  if (!videos.length) return `<h1>Avance</h1><p class="lead">Todavía no hay videos en marcha.</p>`;
  return `<h1>Avance</h1><p class="lead">En qué paso va cada video y qué te toca hacer.</p>` +
    videos.map((v, i) => {
      const a = accion(v);
      const pasos = PASOS.map((p, k) => {
        const cls = v.hecho[p.id] ? 'hecha' : p.id === v.actual ? 'actual' : '';
        return `<div class="paso ${cls}"><div class="mk">${v.hecho[p.id] ? '✓' : k + 1}</div>
          <div class="pt"><b>${p.nombre}</b></div><div class="est">${v.hecho[p.id] ? 'Hecho' : p.id === v.actual ? 'Ahora' : ''}</div></div>`;
      }).join('');
      const fotos = v.imagenes.length ? `<details class="doc"><summary>Fotos (${v.imagenes.length})</summary><div class="fotos">
        ${v.imagenes.map((f) => `<figure><img loading="lazy" src="${url(v.carpeta, 'imagenes', f)}"><figcaption>${esc(f)}</figcaption></figure>`).join('')}
        </div>${v.creditos ? `<div class="md"><h4>Créditos</h4>${md(v.creditos.split('\n').filter(Boolean).map((x) => '- ' + x).join('\n'))}</div>` : ''}</details>` : '';
      return `<details class="video" ${i === 0 ? 'open' : ''}><summary><b>${esc(titVisible(v))}</b>
        <small>${esc(v.caso)} · ${v.actual ? esc(PASOS.find((p) => p.id === v.actual).nombre) : 'publicado'}${v.palabras ? ` · ${v.palabras} palabras ≈ ${(v.palabras / 150).toFixed(1).replace('.', ',')} min` : ''}</small></summary>
        <div class="tu"><b>Te toca:</b> ${a.tu}</div><div class="acc">${a.btn}
          ${v.vozTxt && v.actual !== 'voz' ? copiar(v.vozTxt, '🎙️ Copiar texto para Loquendo', 'sec') : ''}</div>
        <div class="pasos">${pasos}</div>
        ${v.guion ? `<details class="doc"><summary>Leer guion</summary><div class="guion">${guionHtml(v.guion)}</div></details>` : ''}
        ${v.verificacion ? `<details class="doc"><summary>Verificación de datos</summary><div class="md">${md(v.verificacion)}</div></details>` : ''}
        ${v.estilo ? `<details class="doc"><summary>Cambios de estilo</summary><div class="md">${md(v.estilo)}</div></details>` : ''}
        ${v.retencion ? `<details class="doc"><summary>Mapa de retención</summary><div class="md">${md(v.retencion)}</div></details>` : ''}
        ${fotos}
      </details>`;
    }).join('');
}

function descripcionDe(v) {
  const p = v.paquete ?? '';
  const pub = p.split(/\n## Publicaci[oó]n/i)[1];
  const base = pub ?? p.split(/\n## Descripci[oó]n/i)[1] ?? '';
  let d = base.split(/\n## /)[0].replace(/^[^\n]*\n/, '').trim();
  if (v.capitulos) d = d.replace(/\(capítulos?:[^)]*\)|\(pegar aquí[^)]*\)/i, v.capitulos.trim());
  return d.replace(/^\s*-?\s*T[ií]tulo:.*$/im, '').trim();
}

function pestanaVideos(videos) {
  const con = videos.filter((v) => v.video || v.miniatura || v.shorts.length);
  if (!con.length) return `<h1>Videos</h1><p class="lead">Aquí aparecen los videos cuando el editor los termine.</p>`;
  return `<h1>Videos</h1><p class="lead">Mira el resultado y súbelo a YouTube con el título y la descripción listos.</p>` +
    con.map((v) => {
      const titulo = titVisible(v);
      const desc = descripcionDe(v);
      return `<section class="vid"><h2>${esc(titulo)}</h2><small>${esc(v.caso)}</small>
        <div class="vg">${v.video ? `<video controls preload="metadata" src="${url(v.carpeta, v.video)}"${v.miniatura ? ` poster="${url(v.carpeta, v.miniatura)}"` : ''}></video>` : ''}
        ${v.miniatura ? `<img class="mini" src="${url(v.carpeta, v.miniatura)}">` : ''}</div>
        <div class="acc">${copiar(titulo, '📋 Copiar título')}${desc ? copiar(desc, '📋 Copiar descripción') : ''}
        ${v.capitulos ? copiar(v.capitulos.trim(), '📋 Copiar capítulos', 'sec') : ''}</div>
        ${v.capcut ? `<div class="tu"><b>Kit para CapCut:</b> en <code>${esc(v.carpeta)}/salida/capcut</code> tienes ${v.limpio ? 'el video sin subtítulos, ' : ''}la voz, la música, los efectos, las fotos, los subtítulos (.srt) y la hoja de edición con los tiempos.</div>` : ''}
        ${v.shorts.length ? `<h3>Shorts</h3><div class="shorts">${v.shorts.map((s) => `<video controls preload="metadata" src="${url(v.carpeta, 'salida', s)}"></video>`).join('')}</div>` : ''}
      </section>`;
    }).join('');
}

const CSS = `
:root{--bg:#140f1f;--card:#1f1830;--card2:#2a2142;--bd:#3a2f58;--tx:#efeaf8;--mut:#a79ac2;--ac:#f5a524;--ok:#34c38f;--bad:#ef6b6b;--roj:#e5484d}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 system-ui,'Segoe UI',sans-serif}
a{color:var(--ac)}code{background:var(--card2);padding:1px 6px;border-radius:6px;font-size:.9em}
header{position:sticky;top:0;z-index:5;background:rgba(20,15,31,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--bd)}
.hb{max-width:1000px;margin:auto;padding:0 16px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.logo{font-weight:700;font-size:1.1rem;padding:14px 0}.logo span{color:var(--roj)}
.tabs{display:flex;gap:2px;overflow-x:auto;max-width:100%}
.tabs button{background:none;border:0;border-bottom:2px solid transparent;color:var(--mut);font:inherit;font-weight:600;padding:16px 12px 14px;cursor:pointer;white-space:nowrap}
.tabs button:hover{color:var(--tx)}.tabs button.on{color:var(--tx);border-bottom-color:var(--ac)}
.tabs .n{background:var(--card2);border-radius:99px;padding:0 8px;font-size:.75rem;margin-left:6px;color:var(--mut)}
main{max-width:1000px;margin:auto;padding:26px 16px 80px}
h1{font-size:1.7rem;margin:0 0 6px}h2{font-size:1.25rem;margin:30px 0 12px}h3{margin:0}
.lead{color:var(--mut);margin:0 0 22px;max-width:660px}
.tab{display:none}.tab.on{display:block;animation:in .25s}@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.resumen{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px 20px;margin-bottom:18px}
.resumen b{font-size:1.15rem;display:block}.resumen small{color:var(--mut);display:block}
.prog{height:8px;background:var(--bg);border-radius:6px;margin-top:12px;overflow:hidden}.prog i{display:block;height:100%;background:var(--ok)}
.tu{margin-top:12px;background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:10px 14px}
.acc{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
.btn{background:var(--ac);color:#2a1a00;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer}
.btn:hover{filter:brightness(1.08)}.btn.sec{background:var(--card2);color:var(--tx);border:1px solid var(--bd)}
.btn.grande{font-size:1.05rem;padding:13px 20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px}
.stat{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px 16px}.stat b{font-size:1.7rem;display:block;line-height:1.2}.stat span{color:var(--mut);font-size:.85rem}
.pasos{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.paso{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:10px 14px}
.mk{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--card2);color:var(--mut);border:1px solid var(--bd)}
.pt{flex:1;min-width:0}.pt b{display:block}.pt span{color:var(--mut);font-size:.9rem}
.est{flex:none;font-size:.8rem;font-weight:600;color:var(--mut)}
.paso.hecha .mk{background:var(--ok);border-color:var(--ok);color:#06251a}.paso.hecha .est{color:var(--ok)}
.paso.actual{border-color:var(--ac);background:var(--card2)}.paso.actual .mk{background:var(--ac);border-color:var(--ac);color:#2a1a00}.paso.actual .est{color:var(--ac)}
details{border-radius:14px}summary{cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}
details.lista,details.video,details.doc{background:var(--card);border:1px solid var(--bd);padding:14px 18px;margin-bottom:14px}
details.lista>summary h3{display:inline}details.lista>summary small,details.video>summary small,details.doc summary small{color:var(--mut);display:block}
details.doc{background:var(--bg)}details.doc>summary{font-weight:700}
details.caso{background:var(--card2);border:1px solid var(--bd);margin:10px 0;padding:12px 14px}
details.caso>summary{display:flex;gap:12px;align-items:center}.ct{flex:1;min-width:0}.ct b{display:block}.ct small{color:var(--mut)}
.nota{flex:none;width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:1.1rem;background:var(--bg);color:var(--mut);border:1px solid var(--bd)}
.nota.alto{background:var(--ok);color:#06251a;border:0}.nota.medio{background:var(--ac);color:#2a1a00;border:0}.nota.bajo{background:#4a3b6b;color:var(--tx);border:0}
.md{overflow-wrap:anywhere}.md p{margin:8px 0}.md h2,.md h3,.md h4{margin:18px 0 8px}
.tw{overflow-x:auto;margin:12px 0}table{border-collapse:collapse;font-size:.88rem;min-width:100%}
th,td{border:1px solid var(--bd);padding:6px 8px;text-align:left;vertical-align:top}th{background:var(--card2)}
blockquote{border-left:3px solid var(--ac);margin:8px 0;padding:2px 12px;color:var(--mut)}pre{white-space:pre-wrap;background:var(--card2);padding:10px;border-radius:8px}
.guion p{margin:6px 0}.tag{display:inline-block;font-size:.8rem;font-weight:700;border-radius:6px;padding:2px 8px;background:#3a2f58;color:var(--tx)}
.t-titulo{background:var(--roj)}.t-mapa{background:#2c6e8f}.t-fecha{background:#7a5c12}.t-ficha{background:#6b4e2e}.t-doc{background:#5a5a2a}.t-texto{background:#444}.t-imagen{background:#2f6b4a}.t-pausa{background:#333;color:var(--mut)}
.fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:12px}
.fotos figure{margin:0}.fotos img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px}.fotos figcaption{font-size:.75rem;color:var(--mut)}
.vid{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px;margin-bottom:18px}.vid h2{margin:0}.vid small{color:var(--mut)}
.vg{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-top:12px}.vg video,.vg img{width:100%;border-radius:10px;background:#000}
.shorts{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.shorts video{width:100%;border-radius:10px;background:#000}
#cargas .carga{background:var(--card);border:1px solid var(--ac);border-radius:12px;padding:12px 16px;margin-bottom:12px}
#cargas .carga small{color:var(--mut)}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);opacity:0;background:var(--ok);color:#06251a;font-weight:700;padding:12px 20px;border-radius:12px;transition:.25s;max-width:90vw;text-align:center;z-index:9}
.toast.on{opacity:1;transform:translateX(-50%)}
@media (max-width:700px){.vg{grid-template-columns:1fr}h1{font-size:1.4rem}}
`;

const JS = `
(function(){
  var bs=[].slice.call(document.querySelectorAll('.tabs button')),ts=[].slice.call(document.querySelectorAll('.tab'));
  function ir(n){bs.forEach(function(b){b.classList.toggle('on',b.dataset.tab===n)});ts.forEach(function(t){t.classList.toggle('on',t.id==='t-'+n)});
    try{history.replaceState(null,'','#'+n)}catch(e){}window.scrollTo(0,0)}
  bs.forEach(function(b){b.onclick=function(){ir(b.dataset.tab)}});
  document.querySelectorAll('[data-ir]').forEach(function(b){b.onclick=function(){ir(b.dataset.ir)}});
  var h=(location.hash||'').slice(1);if(h&&document.getElementById('t-'+h))ir(h);
  var toast=document.getElementById('toast'),tm;
  function avisa(t){toast.textContent=t;toast.classList.add('on');clearTimeout(tm);tm=setTimeout(function(){toast.classList.remove('on')},4000)}
  function copia(t){
    if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);
    return new Promise(function(ok,no){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';
      document.body.appendChild(a);a.select();try{document.execCommand('copy')?ok():no()}catch(e){no()}document.body.removeChild(a)});
  }
  document.querySelectorAll('[data-copiar]').forEach(function(b){b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();
    copia(b.dataset.copiar).then(function(){avisa(b.dataset.copiar.length>300?'Texto copiado: pégalo en Voz de Soria':'Copiado: pégalo en Claude Code')},function(){avisa('No se pudo copiar')})})});
  // recordar qué estaba abierto y dónde estabas
  var dets=[].slice.call(document.querySelectorAll('details'));
  function guardar(){try{var ab=[];dets.forEach(function(d,i){if(d.open)ab.push(i)});sessionStorage.setItem('panel',JSON.stringify({y:scrollY,ab:ab}))}catch(e){}}
  try{var g=JSON.parse(sessionStorage.getItem('panel')||'null');if(g){dets.forEach(function(d,i){d.open=g.ab.indexOf(i)>=0});setTimeout(function(){scrollTo(0,g.y)},30)}}catch(e){}
  // tareas en curso (las marca panel/estado.mjs)
  var cg=document.getElementById('cargas');
  function pintar(lista){if(!cg)return;cg.innerHTML='';(lista||[]).filter(function(t){return t.activo}).forEach(function(t){
    var trans=Date.now()-t.inicio,pct=Math.min(95,Math.round(trans/(t.estimadoMin*60000)*100));
    var d=document.createElement('div');d.className='carga';
    d.innerHTML='<b>⏳ '+t.tarea+'</b><small> · lleva '+Math.round(trans/60000)+' min de ~'+t.estimadoMin+'</small><div class="prog"><i style="width:'+pct+'%"></i></div>';
    cg.appendChild(d)})}
  function cargar(src,fn){var s=document.createElement('script');s.src=src+'?t='+Date.now();s.onload=function(){s.remove();fn()};s.onerror=function(){s.remove()};document.head.appendChild(s)}
  function estado(){cargar('panel/estado.js',function(){pintar(window.PANEL_ESTADO&&window.PANEL_ESTADO.tareas)})}
  estado();setInterval(estado,3000);
  setInterval(function(){cargar('panel/version.js',function(){if(window.PANEL_VER&&window.PANEL_VER!==VER){guardar();location.reload()}})},3000);
})();
`;

export function generar() {
  const listas = leerListas(RAIZ);
  const videos = leerVideos(RAIZ);
  const enProceso = videos.filter((v) => v.actual && v.actual !== 'publicado').length;
  const conVideo = videos.filter((v) => v.video).length;
  const totalCasos = listas.reduce((a, l) => a + l.casos.length, 0);
  const pest = [
    ['inicio', 'Inicio', ''], ['casos', 'Casos', totalCasos], ['ranking', 'Ranking', ''],
    ['titulos', 'Títulos', ''], ['avance', 'Avance', enProceso], ['videos', 'Videos', conVideo],
  ];
  const cuerpo = {
    inicio: pestanaInicio(listas, videos), casos: pestanaCasos(listas, videos), ranking: pestanaRanking(listas),
    titulos: pestanaTitulos(videos), avance: pestanaAvance(videos), videos: pestanaVideos(videos),
  };
  const sinVer = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Fábrica de Casos</title><style>${CSS}</style></head><body>
<header><div class="hb"><div class="logo">🕵️ Fábrica de <span>Casos</span></div><nav class="tabs">
${pest.map(([id, n, c], i) => `<button data-tab="${id}" class="${i === 0 ? 'on' : ''}">${n}${c ? `<span class="n">${c}</span>` : ''}</button>`).join('')}
</nav></div></header><main>
${pest.map(([id], i) => `<section class="tab ${i === 0 ? 'on' : ''}" id="t-${id}">${cuerpo[id]}</section>`).join('\n')}
</main><div class="toast" id="toast"></div>`;
  const ver = createHash('md5').update(sinVer).digest('hex').slice(0, 12);
  const html = `${sinVer}<script>var VER="${ver}";${JS}</script></body></html>`;
  const destino = path.join(RAIZ, 'Panel.html');
  const anterior = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
  if (anterior !== html) {
    fs.writeFileSync(destino, html);
    fs.writeFileSync(path.join(RAIZ, 'panel', 'version.js'), `window.PANEL_VER=${JSON.stringify(ver)};\n`);
  }
  if (!fs.existsSync(path.join(RAIZ, 'panel', 'estado.js'))) fs.writeFileSync(path.join(RAIZ, 'panel', 'estado.js'), 'window.PANEL_ESTADO={tareas:[]};\n');
  return destino;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const destino = generar();
  console.log(`✔ Panel listo: ${destino}`);
  if (process.argv.includes('--abrir')) {
    if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', destino]);
    else if (process.platform === 'darwin') execFile('open', [destino]);
    else execFile('xdg-open', [destino], () => {});
  }
}
