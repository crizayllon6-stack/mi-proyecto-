# Fábrica de videos de misterios

Sistema para hacer videos de **misterios sin resolver** para YouTube casi sin editar.

## Cómo se hace un video (≈ 25 min de tu tiempo)

1. **Guion** – en Claude Code escribe `/nuevo-video` (o `/nuevo-video el caso de ...`).
   Claude elige el caso, investiga, escribe el guion, verifica los datos y te deja:
   - `videos/<caso>/guion.md` – guion con las escenas
   - `videos/<caso>/voz.txt` – **el texto para pegar en Voz de Soria**
   - `videos/<caso>/paquete.md` – títulos, textos de miniatura, descripción y etiquetas
2. **Voz** – pega `voz.txt` en Voz de Soria y guarda el audio en la misma carpeta como `voz.wav` o `voz.mp3`.
3. **Editar** (automático):
   ```
   cd editor
   npm run render -- ../videos/<caso>
   ```
   Te deja `videos/<caso>/salida/video.mp4` y `miniatura.png`.
4. **Subir** – revisa el video y súbelo a YouTube con un título de `paquete.md` y los capítulos de `capitulos.txt`.

## Extras opcionales en la carpeta del caso
| Archivo | Para qué |
|---|---|
| `musica.mp3` | Tu música de fondo (si no hay, se genera un ambiente de suspenso) |
| `imagenes/` | Fotos para las escenas `[IMAGEN: foto.jpg]` y `[FICHA: ... | foto.jpg]` |
| `pronunciacion.txt` | Arreglar cómo lee la voz un nombre: `Dyatlov = Diátlov` |

## Escenas disponibles en el guion
| Etiqueta | Qué se ve |
|---|---|
| `[TITULO: TEXTO \| subtítulo]` | Título gigante con glitch (también crea un capítulo) |
| `[MAPA: Lugar \| lat, lon]` | Globo terráqueo que gira y hace zoom al lugar |
| `[FECHA: fecha \| detalle]` | Fecha animada con línea de tiempo |
| `[FICHA: Nombre \| edad \| rol \| ESTADO \| foto.jpg]` | Expediente de la persona con sello |
| `[DOC: Documento \| frase]` | Documento clasificado con frase resaltada |
| `[TEXTO: frase]` | Frase de máquina de escribir |
| `[IMAGEN: foto.jpg \| pie]` | Foto con movimiento lento |
| `[PAUSA: segundos]` | Silencio dramático |

## Probar sin grabar voz
```
cd editor
npm run render -- ../videos/prueba-dyatlov --voz-prueba
```
Usa una voz robótica (espeak-ng) sólo para ver cómo queda.

## Instalar en tu compu (una sola vez)
1. Instala [Node.js](https://nodejs.org) (versión 20 o más) y [FFmpeg](https://ffmpeg.org/download.html) (que funcione el comando `ffmpeg`).
2. `cd editor && npm install`
3. Para ver y ajustar las animaciones en vivo: `npm run estudio`

Los colores y fuentes del canal están en `editor/src/estilo.ts`.
