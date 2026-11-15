# Fábrica de Casos — crímenes y misterios sin resolver

## Cómo empezar (cada día)
**Doble clic en `Abrir Fabrica.bat`.** Se abre el **Panel** en el navegador y Claude Code en una ventana.
En el Panel ves los casos, el ranking, los títulos, el avance de cada video y los videos terminados.
Los botones copian un mensaje: lo pegas en Claude Code y él hace el trabajo. El Panel se actualiza solo.

El flujo, con paradas donde **tú decides**:
1. Claude busca 15 casos y les pone puntaje → **eliges el caso**.
2. Te propone 10 títulos y 3 miniaturas → **eliges**.
3. Escribe el guion, lo verifica y lo pule para Loquendo → **lo apruebas**.
4. Busca fotos reales del caso → **las revisas**.
5. **Pones la voz** (botón "Copiar texto para Loquendo").
6. El editor arma el video, la miniatura y 3 Shorts → **lo subes**.

---

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

## Shorts
```
cd editor
npm run shorts -- ../videos/<caso>
```
Saca 3 Shorts verticales (máx. 58 s) con gancho arriba y subtítulos grandes.

**Instalar en tu compu:** ver [INSTALAR.md](INSTALAR.md).

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
| `[EVIDENCIA: objeto \| título \| detalle]` | El objeto dibujado como reconstrucción (coche, carta, libro…) |
| `[NOTA: línea / línea \| pie \| real]` | Carta, mensaje o código escrito a mano |
| `[LINEA: momento \| qué pasó]` | Línea de tiempo que va creciendo |

## Probar sin grabar voz
```
cd editor
npm run render -- ../videos/<caso> --sin-voz --hasta 60
```
`--sin-voz` calcula los tiempos como si hablara Loquendo (sin audio). `--hasta 60` hace sólo el primer minuto.
`--voz-prueba` usa una voz robótica (necesita espeak-ng, sólo Linux).

## Instalar en tu compu (una sola vez)
1. Instala [Node.js](https://nodejs.org) (versión 20 o más) y [FFmpeg](https://ffmpeg.org/download.html) (que funcione el comando `ffmpeg`).
2. `cd editor && npm install`
3. Para ver y ajustar las animaciones en vivo: `npm run estudio`

Los colores y fuentes del canal están en `editor/src/estilo.ts`.
