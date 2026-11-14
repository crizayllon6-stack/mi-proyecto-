# Instalar en tu laptop (Windows) — una sola vez

Tiempo: unos 20–30 minutos. Necesitas internet.

## 1. Instalar los programas
Abre **PowerShell** (botón Inicio → escribe `PowerShell` → Enter) y pega esto:

```
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Gyan.FFmpeg
```

Acepta todo lo que pregunte. Cuando termine, **cierra PowerShell y ábrelo de nuevo** (para que reconozca los programas).

Comprueba que todo quedó bien:
```
git --version
node --version
ffmpeg -version
```
Cada uno debe mostrar un número de versión. Si alguno dice "no se reconoce", avísale a Claude.

## 2. Descargar el proyecto
```
cd $HOME\Documents
git clone -b claude/hola-pylyus https://github.com/crizayllon6-stack/mi-proyecto-.git
cd mi-proyecto-\editor
npm install
```
(Si `git clone` te pide iniciar sesión en GitHub, inicia sesión con tu cuenta.)

## 3. Probar que funciona
```
npm run render -- ..\videos\prueba-dyatlov --sin-voz --hasta 20
```
Debe terminar con `✔ video.mp4 listo`. El video queda en
`Documents\mi-proyecto-\videos\prueba-dyatlov\salida\video.mp4`.

## 4. Abrir con Claude Code
Abre la app de Claude (escritorio) → Claude Code → abre la carpeta `Documents\mi-proyecto-`.
Desde ahí ya puedes pedir "haz un video nuevo", "arma el video de Somerton", etc.

---

# Uso diario

## Hacer un video
1. Abre `videos\<caso>\voz.txt`, copia todo y pégalo en **Voz de Soria**.
2. Guarda el audio en la misma carpeta con el nombre **`voz.wav`** (o `voz.mp3`).
3. En PowerShell, dentro de `mi-proyecto-\editor`:
   ```
   npm run render -- ..\videos\<caso>
   ```
4. Resultado: `videos\<caso>\salida\video.mp4` y `miniatura.png`.

## Hacer los Shorts del mismo caso
```
npm run shorts -- ..\videos\<caso>
```
Resultado: `short-1.mp4`, `short-2.mp4`, `short-3.mp4` en la carpeta `salida`.

## Casos listos para grabar
| Carpeta | Caso |
|---|---|
| `hombre-de-somerton` | El Hombre de Somerton |
| `faro-islas-flannan` | Los fareros de las islas Flannan |
| `piloto-valentich` | El piloto Frederick Valentich |
| `granja-hinterkaifeck` | La granja de Hinterkaifeck |

Títulos, descripción y etiquetas de cada uno: `videos\<caso>\paquete.md`.

## Traer lo último que hizo Claude en la nube
```
cd $HOME\Documents\mi-proyecto-
git pull
```
