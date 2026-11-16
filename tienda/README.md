# Editor de videos de la tienda (TikTok)

Pones tu video ya editado (con su audio) y te devuelve la versión para TikTok con:
- **Subtítulos automáticos** grandes, 3 palabras a la vez, la que se dice en amarillo.
- **Zoom en cada corte** (una toma normal, la siguiente más cerca), **zoom de golpe** en palabras clave
  ("nuevos", "oferta", "edición limitada"…) y **zoom lento** para que nunca se vea quieto.
- **Transiciones** en cada corte que van cambiando: destello, barrido, pop, glitch y sacudida.
- Formato vertical 9:16 (si el video es horizontal, lo pone al centro con el fondo borroso).

## Uso diario
1. Copia tu video a la carpeta **`entrada`**.
2. Doble clic en **`Editar videos.bat`**.
3. Se abre la carpeta **`listos`** con `<nombre>_tiktok.mp4` y `<nombre>.srt`.

La primera vez tarda más: descarga Whisper (la IA que escucha el audio, ~500 MB). Después ya no.

## Si los subtítulos tienen una palabra mal
Abre `trabajo\<nombre>\palabras.json`, corrige la palabra y vuelve a hacer doble clic
(borra antes el video de `listos` para que lo rehaga).

## Ajustes (`config.json`)
- `palabras_con_zoom`: las palabras que hacen zoom de golpe.
- `zoom_en_cortes`, `zoom_lento`, `transiciones`: `true` o `false`.
- `subtitulos`: colores, tamaño, palabras por bloque y altura en pantalla (0.66 = un poco abajo del centro).
- `modelo_whisper`: `small` (rápido). Si se equivoca mucho, pon `medium` (más preciso y más lento).
- `sensibilidad_cortes`: si detecta cortes de más, súbelo (0.4); si no detecta, bájalo (0.2).

## Instalar en la laptop (una sola vez)
Pídele a Claude Code en la laptop:
> Instala Git, Node.js LTS y FFmpeg si no están. Clona la rama claude/hola-pylyus de
> https://github.com/crizayllon6-stack/mi-proyecto-.git en Documentos, entra a la carpeta tienda,
> corre npm install y crea en mi Escritorio un acceso directo de "Editar videos.bat".
