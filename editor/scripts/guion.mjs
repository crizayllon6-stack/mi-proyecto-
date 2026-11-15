// Lee un guion.md con etiquetas de escena y lo convierte en datos.
//
// Formato:
//   ---
//   titulo: El paso Diátlov
//   miniatura: NADIE SABE QUÉ LOS MATÓ
//   ---
//   [TITULO: EL PASO DIÁTLOV | Nueve muertos. Ninguna explicación.]
//   Texto que lee la voz...
//   [MAPA: Montes Urales, Rusia | 61.75, 59.46]
//   [FECHA: 1 de febrero de 1959 | Montes Urales]
//   [FICHA: Ígor Diátlov | 23 años | Líder del grupo | MUERTO | foto.jpg]
//   [DOC: Informe oficial | Una fuerza irresistible]
//   [TEXTO: ¿Por qué cortaron la tienda desde dentro?]
//   [IMAGEN: archivo.jpg | Pie de foto opcional]
//   [PAUSA: 1.5]
//   [EVIDENCIA: coche | Un coche en Glenelg | El libro estaba en el asiento trasero | foto.jpg]
//   [NOTA: línea 1 / línea 2 | pie | real]
//   [LINEA: 6:30 | Encuentran el cuerpo en la playa]
//
// Cada etiqueta empieza una escena que dura hasta la siguiente.

const TIPOS = ['TITULO', 'MAPA', 'FECHA', 'FICHA', 'DOC', 'TEXTO', 'IMAGEN', 'PAUSA', 'EVIDENCIA', 'NOTA', 'LINEA'];

export function leerGuion(texto) {
  let meta = {};
  let cuerpo = texto.replace(/\r/g, '');
  const fm = cuerpo.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    for (const linea of fm[1].split('\n')) {
      const m = linea.match(/^(\w+)\s*:\s*(.*)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    cuerpo = cuerpo.slice(fm[0].length);
  }

  const escenas = [];
  let actual = { tipo: 'TEXTO', datos: [''], narracion: '', implicita: true };
  const re = /\[([A-ZÁÉÍÓÚ]+)\s*(?::\s*([^\]]*))?\]/g;
  let ultimo = 0;
  let m;
  const cerrar = (hasta) => {
    actual.narracion += cuerpo.slice(ultimo, hasta);
  };
  while ((m = re.exec(cuerpo))) {
    const tipo = m[1].normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!TIPOS.includes(tipo)) continue;
    cerrar(m.index);
    escenas.push(actual);
    actual = {
      tipo,
      datos: (m[2] ?? '').split('|').map((s) => s.trim()),
      narracion: '',
    };
    ultimo = m.index + m[0].length;
  }
  cerrar(cuerpo.length);
  escenas.push(actual);

  const limpias = escenas
    .map((e) => ({ ...e, narracion: limpiarNarracion(e.narracion) }))
    .filter((e) => !(e.implicita && !e.narracion));
  return { meta, escenas: limpias };
}

function limpiarNarracion(t) {
  return t
    .split('\n')
    .filter((l) => !l.trim().startsWith('#') && !l.trim().startsWith('//'))
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- Texto para la voz (Loquendo / Voz de Soria) ----------

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos',
  'setecientos', 'ochocientos', 'novecientos'];

export function numeroALetras(n) {
  n = Math.floor(n);
  if (n < 30) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
  }
  if (n === 100) return 'cien';
  if (n < 1000) {
    const c = Math.floor(n / 100), r = n % 100;
    return CENTENAS[c] + (r ? ' ' + numeroALetras(r) : '');
  }
  if (n < 1_000_000) {
    const mi = Math.floor(n / 1000), r = n % 1000;
    const pre = mi === 1 ? 'mil' : numeroALetras(mi).replace(/uno$/, 'un') + ' mil';
    return pre + (r ? ' ' + numeroALetras(r) : '');
  }
  const mm = Math.floor(n / 1_000_000), r = n % 1_000_000;
  const pre = mm === 1 ? 'un millón' : numeroALetras(mm).replace(/uno$/, 'un') + ' millones';
  return pre + (r ? ' ' + numeroALetras(r) : '');
}

const ABREVIATURAS = [
  [/\bDr\.\s/g, 'doctor '], [/\bDra\.\s/g, 'doctora '], [/\bSr\.\s/g, 'señor '], [/\bSra\.\s/g, 'señora '],
  [/\bEE\.?\s?UU\.?/g, 'Estados Unidos'], [/\bkm\b/g, 'kilómetros'], [/\bkg\b/g, 'kilos'],
  [/\b(\d+)\s?m\b/g, '$1 metros'], [/\bFBI\b/g, 'efe be i'], [/\bCIA\b/g, 'ce i a'], [/\bKGB\b/g, 'ka ge be'],
  [/\bURSS\b/g, 'Unión Soviética'], [/\bOVNI\b/gi, 'ovni'], [/%/g, ' por ciento'], [/&/g, ' y '],
  [/°C/g, ' grados'], [/°/g, ' grados'], [/\bs\. ?XX\b/g, 'siglo veinte'], [/\bs\. ?XIX\b/g, 'siglo diecinueve'],
];

// Convierte el texto narrado en algo que una voz sintética lea bien.
export function textoParaVoz(t, pronunciacion = {}) {
  let s = t;
  for (const [palabra, como] of Object.entries(pronunciacion)) {
    s = s.replace(new RegExp(`\\b${palabra}\\b`, 'g'), como);
  }
  for (const [re, rep] of ABREVIATURAS) s = s.replace(re, rep);
  s = s.replace(/\*\*|__|\*|_/g, '');
  s = s.replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, (x) => x.replace(/\./g, ''));
  s = s.replace(/(\d+),(\d+)/g, (_, a, b) => `${numeroALetras(+a)} coma ${numeroALetras(+b)}`);
  s = s.replace(/\d+/g, (x) => numeroALetras(+x));
  s = s.replace(/[“”«»"]/g, '').replace(/—|–/g, ', ').replace(/\s+([,.;:?!])/g, '$1');
  return s.trim();
}

export function contarPalabras(t) {
  return (t.match(/\S+/g) || []).length;
}
