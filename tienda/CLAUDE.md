# Editor de videos de la tienda de tenis (TikTok)

- Proyecto aparte del canal de misterios. Habla en español simple y corto; el usuario no es programador.
- El usuario graba y edita el video (cortes, orden y audio ya listos). Este editor sólo agrega: subtítulos
  automáticos (Whisper), zooms (en cortes, en palabras clave y lento), transiciones en los cortes y formato 9:16.
  Sin música, sin precios, sin textos de cierre.
- Uso: video en `entrada/` → `node scripts/editar.mjs` (o doble clic en `Editar videos.bat`) → `listos/`.
- `scripts/editar.mjs`: ffprobe → cortes (ffmpeg scene) → Whisper (`@remotion/install-whisper-cpp`, versión 1.5.5,
  modelo de `config.json`) → `trabajo/<nombre>/palabras.json` (editable) → render Remotion (`src/TikTok.tsx`).
- Ajustes en `config.json`. Si el usuario pide otro estilo de subtítulos, zooms o transiciones, cambia `src/TikTok.tsx`.
