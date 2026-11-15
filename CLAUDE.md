# Fábrica de Casos: canal de YouTube de crímenes y misterios sin resolver

- Habla siempre en español, simple y corto. El usuario no es programador y tiene poco tiempo (trabaja 10 h al día).
- Canal en español, sin cara. Tema: **crímenes y misterios sin resolver REALES** (y muy poco de otros casos reales
  impactantes). La voz la pone el usuario con Loquendo (app Voz de Soria) pegando `voz.txt`.
- El usuario quiere **control**: elige el caso, el título y la miniatura, y aprueba el guion. No elijas por él
  salvo que pida "modo automático".

## Cómo se usa
- `Abrir Fabrica.bat` (doble clic): abre el **Panel** (`Panel.html`) y Claude Code. Los botones del Panel copian un
  mensaje que el usuario pega aquí.
- `/nuevo-video` (skill en `.claude/skills/nuevo-video`): el flujo completo con PARADAS. Síguelo siempre que el
  usuario pida casos, un video, "sigue", o pegue algo del Panel.
- Agentes (`.claude/agents`): `cazador-casos` → `analista-viralidad` → (usuario elige) → `empaquetador` (título primero)
  → (usuario elige) → `guionista` → `verificador` → `editor-estilo` → (usuario aprueba) → `buscador-recursos`
  → `empaquetador` (final).
- Estado de cada video: `videos/<caso>/ficha.md` (sección Estado con casillas). Marca las casillas al avanzar y
  regenera el Panel con `node panel/generar.mjs`. Barras de avance: `node panel/estado.mjs inicio|fin <tipo> ...`.

## Carpetas
- `Ideas/`: listas de casos (`casos_*.md`) y rankings (`ranking_casos_*.md`).
- `videos/<caso>/`: `ficha.md`, `paquete.md`, `investigacion.md`, `guion.md`, `verificacion.md`, `cambios_estilo.md`,
  `retencion.md`, `recursos.json`, `imagenes/`, `creditos.txt`, `voz.txt`, `voz.wav`, `salida/` (video, miniatura, Shorts).
- `editor/`: proyecto Remotion que arma el video.
  - `npm run render -- ../videos/<caso>` → `salida/video.mp4` + `miniatura.png` (`--sin-voz`, `--hasta 60` para pruebas).
  - `npm run shorts -- ../videos/<caso>` → `salida/short-1..3.mp4`.
  - `node scripts/recursos.mjs ../videos/<caso>` → fotos libres de Wikimedia + créditos.
  - Escenas en `src/escenas/`, efectos en `src/efectos.tsx`, estilo del canal en `src/estilo.ts`.
- `panel/`: generador del Panel (`generar.mjs`), vigilante (`vigilar.mjs`) y barras de avance (`estado.mjs`).
- `sistema-viejo/`: el sistema anterior del usuario (Fábrica Casos con CapCut). Solo de referencia; no lo modifiques.

## Reglas
- Datos reales y verificados; títulos llamativos pero verdaderos; nadie señalado como culpable sin condena.
- Sin violencia gráfica (apto para anunciantes). Solo imágenes libres y del caso real, con créditos.
- Nunca prometas visitas ni "viralidad".
- Texto para copiar y pegar: en texto plano, sin Markdown.
- No instales programas ni publiques nada sin permiso.
- Antes de cambiar animaciones, prueba con `npm run render -- ../videos/prueba-dyatlov --sin-voz --hasta 20`.
