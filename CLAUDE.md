# Proyecto: canal de YouTube de misterios sin resolver

- Habla siempre en español, simple y corto. El usuario no es programador y tiene poco tiempo (trabaja 10 h al día).
- Canal en español, sin cara; la voz la pone el usuario con Loquendo (app Voz de Soria).
- `/nuevo-video` (skill en `.claude/skills/nuevo-video`) crea guion + verificación + paquete.
- `editor/` es un proyecto Remotion que convierte `videos/<caso>/guion.md` + `voz.wav` en video:
  - `scripts/guion.mjs` lee las etiquetas `[TIPO: a | b]` y pasa el texto a formato para voz sintética.
  - `scripts/preparar.mjs` crea `voz.txt`, sincroniza escenas con el audio (peso por texto + silencios) y genera música/efectos si faltan.
  - `scripts/render.mjs` renderiza `salida/video.mp4` y `salida/miniatura.png`.
  - Escenas en `src/escenas/`, efectos de fondo en `src/efectos.tsx`, estilo del canal en `src/estilo.ts`.
- Antes de cambiar animaciones, prueba con `npm run render -- ../videos/prueba-dyatlov --voz-prueba` y revisa cuadros con ffmpeg.
- Los datos de los casos deben ser reales y verificados; los títulos llamativos pero verdaderos.
