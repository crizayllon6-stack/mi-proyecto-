// Markdown simple → HTML (títulos, listas, tablas, negritas, enlaces, código). Sin dependencias.
export const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export function inline(t) {
  let e = esc(t);
  e = e.replace(/`([^`]+)`/g, '<code>$1</code>');
  e = e.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  e = e.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  e = e.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  e = e.replace(/(^|[\s(])(https?:\/\/[^\s<)|]+)/g, '$1<a href="$2" target="_blank" rel="noopener">enlace</a>');
  return e;
}

export function md(txt = '') {
  const out = [];
  let lista = null, tabla = false, primera = true, codigo = false, parrafo = [];
  const cerrarParrafo = () => { if (parrafo.length) { out.push(`<p>${parrafo.map(inline).join('<br>')}</p>`); parrafo = []; } };
  const cerrarLista = () => { if (lista) { out.push(`</${lista}>`); lista = null; } };
  const cerrarTabla = () => { if (tabla) { out.push('</tbody></table></div>'); tabla = false; } };
  for (const l of txt.replace(/\r/g, '').split('\n')) {
    if (l.trim().startsWith('```')) {
      cerrarParrafo(); cerrarLista(); cerrarTabla();
      out.push(codigo ? '</pre>' : '<pre>'); codigo = !codigo; continue;
    }
    if (codigo) { out.push(esc(l)); continue; }
    const item = l.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/);
    const esTabla = /^\s*\|/.test(l);
    if (!item) cerrarLista();
    if (!esTabla) cerrarTabla();
    if (esTabla) {
      cerrarParrafo();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue;
      const celdas = l.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      if (!tabla) { out.push('<div class="tw"><table><thead>'); tabla = true; primera = true; }
      if (primera) { out.push(`<tr>${celdas.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>`); primera = false; }
      else out.push(`<tr>${celdas.map((c) => `<td>${c}</td>`).join('')}</tr>`);
      continue;
    }
    if (item) {
      cerrarParrafo();
      const tipo = item[1] ? 'ol' : 'ul';
      if (lista !== tipo) { cerrarLista(); out.push(`<${tipo}>`); lista = tipo; }
      out.push(`<li>${inline(item[2].replace(/^\[( |x)\]\s*/, (_, x) => (x === 'x' ? '✅ ' : '⬜ ')))}</li>`);
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { cerrarParrafo(); const n = Math.min(4, h[1].length + 1); out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }
    if (/^\s*>/.test(l)) { cerrarParrafo(); out.push(`<blockquote>${inline(l.replace(/^\s*>\s?/, ''))}</blockquote>`); continue; }
    if (!l.trim()) { cerrarParrafo(); continue; }
    parrafo.push(l);
  }
  cerrarParrafo(); cerrarLista(); cerrarTabla();
  if (codigo) out.push('</pre>');
  return out.join('\n');
}
