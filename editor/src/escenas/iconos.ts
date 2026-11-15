// Dibujos de líneas (viewBox 0 0 200 200) para las reconstrucciones de objetos.
// Cada dibujo es una lista de trazos; el editor los va "dibujando" uno tras otro.
const circ = (cx: number, cy: number, r: number) =>
  `M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy}`;

export const ICONOS: Record<string, string[]> = {
  coche: [
    'M20 130 L20 106 Q22 95 40 92 L62 90 Q76 62 100 60 L130 60 Q150 62 160 88 L178 94 Q186 98 186 110 L186 130',
    'M74 130 H136', 'M20 130 H36', 'M174 130 H186',
    'M70 90 Q80 72 100 69 L112 69 L112 90 Z', 'M120 69 L130 69 Q144 71 151 90 L120 90 Z',
    circ(55, 132, 18), circ(155, 132, 18), circ(55, 132, 6), circ(155, 132, 6), 'M10 152 H190',
  ],
  carta: ['M25 55 H175 V145 H25 Z', 'M25 55 L100 108 L175 55', 'M25 145 L82 96', 'M175 145 L118 96', 'M140 70 H165 V92 H140 Z'],
  papel: ['M50 25 H135 L155 45 V175 H50 Z', 'M135 25 V45 H155', 'M65 70 H140', 'M65 90 H140', 'M65 110 H140', 'M65 130 H140', 'M65 150 H110'],
  libro: ['M30 50 Q65 40 100 55 Q135 40 170 50 V155 Q135 145 100 160 Q65 145 30 155 Z', 'M100 55 V160',
    'M45 70 Q70 64 88 72', 'M45 90 Q70 84 88 92', 'M45 110 Q70 104 88 112', 'M112 72 Q130 64 155 70', 'M112 92 Q130 84 155 90'],
  telefono: ['M40 155 L55 98 H145 L160 155 Z', 'M35 72 Q100 42 165 72 L160 90 Q140 82 135 82 L65 82 Q60 82 40 90 Z',
    circ(100, 125, 20), circ(100, 125, 6), 'M85 82 V98', 'M115 82 V98'],
  maleta: ['M30 75 H170 V160 H30 Z', 'M80 75 V58 H120 V75', 'M62 75 V160', 'M138 75 V160', 'M30 100 H170'],
  llave: [circ(60, 100, 26), circ(60, 100, 9), 'M86 100 H172', 'M150 100 V120', 'M164 100 V115', 'M136 100 V113'],
  reloj: [circ(100, 108, 60), circ(100, 108, 4), 'M100 108 V68', 'M100 108 L130 120', 'M100 52 V60', 'M100 156 V164',
    'M44 108 H52', 'M148 108 H156', 'M100 48 V38', 'M90 38 H110'],
  periodico: ['M35 45 H165 V160 H35 Z', 'M50 62 H150', 'M50 72 H150', 'M50 90 H95 V130 H50 Z',
    'M105 90 H150', 'M105 100 H150', 'M105 110 H150', 'M105 120 H150', 'M50 142 H150', 'M50 150 H130'],
  casa: ['M30 165 V95 L100 42 L170 95 V165 Z', 'M20 102 L100 38 L180 102', 'M88 165 V125 H112 V165',
    'M50 110 H76 V132 H50 Z', 'M124 110 H150 V132 H124 Z', 'M130 66 V44 H146 V78', 'M10 165 H190'],
  barco: ['M22 120 H178 L156 156 H44 Z', 'M68 120 V94 H126 V120', 'M80 94 V104 H92 V94', 'M100 94 V40',
    'M100 44 L140 70 L100 76', 'M15 168 Q35 160 55 168 T95 168 T135 168 T175 168'],
  avion: ['M30 105 Q100 92 170 100 Q180 104 170 108 Q100 116 30 105 Z', 'M88 102 L72 58 H92 L118 102',
    'M88 107 L74 148 H94 L118 107', 'M38 104 L26 78 H42 L56 102', 'M170 100 V93', circ(150, 103, 3)],
  faro: ['M80 168 L88 72 H112 L120 168 Z', 'M85 72 V52 H115 V72', 'M82 52 L100 36 L118 52', 'M84 110 H116',
    'M82 138 H118', 'M120 58 L172 42', 'M120 66 L172 80', 'M80 58 L28 42', 'M80 66 L28 80', 'M60 168 H140'],
  radio: ['M30 72 H170 V156 H30 Z', circ(78, 114, 26), circ(78, 114, 12), circ(136, 100, 9), circ(136, 132, 9),
    'M140 72 L170 32', 'M30 156 V166 M170 156 V166'],
  huella: ['M78 42 Q112 32 118 74 Q122 104 100 116 Q80 114 76 82 Z', 'M84 136 Q100 124 114 136 Q118 162 100 168 Q84 162 84 136 Z',
    'M88 60 H108', 'M86 76 H112', 'M86 92 H110'],
  cigarrillo: ['M28 108 H150 V124 H28 Z', 'M150 108 H176 V124 H150 Z', 'M40 100 Q30 85 45 72 Q58 60 48 45',
    'M60 100 Q52 88 62 78'],
  frasco: ['M85 38 H115 V60 Q140 75 140 100 V165 H60 V100 Q60 75 85 60 Z', 'M80 30 H120 V38 H80 Z',
    'M70 112 H130 V145 H70 Z', 'M88 122 L112 136', 'M112 122 L88 136'],
  camara: ['M32 72 H168 V152 H32 Z', circ(100, 112, 30), circ(100, 112, 14), 'M70 72 L80 56 H120 L130 72',
    'M140 84 H156 V94 H140 Z'],
  dinero: ['M28 70 H172 V140 H28 Z', 'M36 78 H164 V132 H36 Z', circ(100, 105, 20), 'M100 93 V117',
    'M46 88 H60', 'M140 122 H154'],
  tienda: ['M20 160 L100 50 L180 160 Z', 'M100 50 V160', 'M100 160 L78 118', 'M100 160 L122 118', 'M10 160 H190'],
  herramienta: ['M100 26 V118', 'M86 26 H114', 'M86 26 V40 H114 V26', 'M78 118 H122 V146 Q100 170 78 146 Z'],
  anillo: [circ(100, 120, 42), circ(100, 120, 30), 'M86 78 L100 56 L114 78 Z', 'M86 78 H114'],
  desconocido: ['M70 70 Q70 40 100 40 Q130 40 130 68 Q130 90 104 100 V122', circ(104, 148, 4)],
};

// Palabra del guion → dibujo
const SINONIMOS: [RegExp, string][] = [
  [/coche|auto(m[oó]vil)?\b|carro|camioneta|veh[ií]culo|taxi/, 'coche'],
  [/carta|sobre|correo|postal/, 'carta'],
  [/nota|papel|mensaje|hoja|c[oó]digo|recibo|ticket|billete de tren/, 'papel'],
  [/libro|diario|cuaderno|agenda|biblia/, 'libro'],
  [/tel[eé]fono|llamada/, 'telefono'],
  [/maleta|valija|equipaje|bolso|mochila/, 'maleta'],
  [/llave/, 'llave'],
  [/reloj/, 'reloj'],
  [/peri[oó]dico|noticia|prensa|revista/, 'periodico'],
  [/casa|granja|caba[ñn]a|edificio|hotel|habitaci[oó]n/, 'casa'],
  [/barco|bote|lancha|buque/, 'barco'],
  [/avi[oó]n|avioneta|vuelo/, 'avion'],
  [/faro/, 'faro'],
  [/radio|transmisi[oó]n|grabaci[oó]n/, 'radio'],
  [/huella|pisada|zapato|bota/, 'huella'],
  [/cigarr|colilla|tabaco/, 'cigarrillo'],
  [/botella|frasco|veneno|pastilla|medicina/, 'frasco'],
  [/c[aá]mara|foto/, 'camara'],
  [/dinero|billete|monedero|cartera|dólar|libra/, 'dinero'],
  [/tienda de campa|carpa|campamento/, 'tienda'],
  [/pala|herramienta|hacha|martillo/, 'herramienta'],
  [/anillo|joya|collar/, 'anillo'],
];

export function iconoPara(objeto = ''): string[] {
  const o = objeto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const directo = ICONOS[o];
  if (directo) return directo;
  const hit = SINONIMOS.find(([re]) => re.test(o.normalize('NFC')) || re.test(objeto.toLowerCase()));
  return ICONOS[hit?.[1] ?? 'desconocido'];
}
