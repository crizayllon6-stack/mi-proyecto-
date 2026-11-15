---
name: nuevo-video
description: Fábrica de casos. Produce un video de crimen o misterio sin resolver REAL paso a paso con paradas para que el usuario decida: buscar casos y ranking, elegir caso, elegir título y miniatura, guion, verificación, estilo, aprobar; luego el usuario pone la voz y el video y los Shorts se arman solos. Úsalo cuando el usuario pida casos, un video nuevo, seguir con un video o lo que copie desde el Panel.
---

# Fábrica de casos: producir un video paso a paso

Canal en español de **crímenes y misterios sin resolver reales** (y muy poco de otros casos reales impactantes).
Voz: Loquendo (app Voz de Soria) a partir de `voz.txt`. Video de ~10 minutos. El usuario trabaja mucho:
en cada PARADA resume en pocas líneas, en texto simple, y espera su respuesta. Nunca elijas por él salvo
que pida **modo automático** (entonces eliges lo recomendado y lo anotas en `ficha.md` para que pueda cambiarlo).

Tú coordinas: lanzas un agente por paso (Agent con su `subagent_type`) y no avanzas de una PARADA sin su visto bueno.
Antes de cada paso largo marca el avance en el Panel:
`node panel/estado.mjs inicio <tipo> "<tarea>" <minutos estimados>` y al terminar `node panel/estado.mjs fin <tipo>`.
Al final de cada paso regenera el Panel: `node panel/generar.mjs`.

## Dónde estamos
Si el usuario pide "seguir" o pega algo del Panel, mira `videos/<caso>/ficha.md` (sección Estado) y sigue desde
el primer paso sin marcar.

## 1. Buscar casos + ranking (automático)
- Lanza `cazador-casos` → `Ideas/casos_AAAA-MM-DD.md` (si el usuario dio un tema, pásaselo).
- Apenas termine, SIN preguntar, lanza `analista-viralidad` sobre esa lista → `Ideas/ranking_casos_<mismo sufijo>.md`.
- **PARADA 1: el usuario elige el caso.** Muestra el top 3 (título, puntaje, mayor riesgo) y dile que puede ver
  todos en el Panel, pestaña Casos/Ranking. Si el usuario ya trae un caso concreto, sáltate este paso.

## 2. Crear la carpeta del caso
`videos/<nombre-interno>/ficha.md` con este formato exacto (el Panel lo lee):
```
# <título gancho del caso>
- Caso: <nombre real del caso>
- Origen: Ideas/casos_X.md #N
- Título elegido: (pendiente)
- Miniatura elegida: (pendiente)

## Estado
- [x] Caso elegido
- [ ] Título y miniatura elegidos
- [ ] Guion escrito
- [ ] Datos verificados
- [ ] Estilo revisado
- [ ] Guion aprobado
- [ ] Fotos listas
- [ ] Publicado
```
Copia en `investigacion.md` lo que el cazador ya encontró del caso (resumen, giro, fuentes).

## 3. Título primero
Lanza `empaquetador` en modo "título primero" → `paquete.md`.
**PARADA 2: el usuario elige título y miniatura** (puede elegir por número o escribir el suyo).
Anótalos en `ficha.md` y marca `[x] Título y miniatura elegidos`.

## 4. Guion
Lanza `guionista` con la carpeta. Marca `[x] Guion escrito`.

## 5. Verificación
Lanza `verificador` con la carpeta. Marca `[x] Datos verificados`.

## 6. Estilo
Lanza `editor-estilo` con la carpeta. Marca `[x] Estilo revisado`.

**PARADA 3: el usuario aprueba el guion.** Dile en 4–6 líneas: el gancho, cuántos datos se corrigieron
(lo importante de `verificacion.md`), palabras y minutos. Que lo lea en el Panel (pestaña Avance → Leer guion).
Si pide cambios, hazlos (o relanza el agente que corresponda). Con su visto bueno marca `[x] Guion aprobado`
y sigue sin parar hasta el paso 8.

## 7. Fotos, paquete final y texto para la voz (sin parar)
- Lanza `buscador-recursos` con la carpeta: baja 20–40 fotos reales del caso, pone las clave en el guion y deja
  el resto para que el editor las vaya pasando solas en las escenas largas (así el video no se ve lento).
  Marca `[x] Fotos listas`. Avísale cuántas fotos hay y que puede verlas en el Panel; NO esperes su respuesta.
- Lanza `empaquetador` en modo "final".
- Regenera `voz.txt`: `cd editor && node scripts/preparar.mjs ../videos/<caso>`.

## 8. Voz (la hace el usuario)
Dile: en el Panel, botón **Copiar texto para Loquendo** → pegarlo en Voz de Soria → guardar el audio como
`videos/<caso>/voz.wav` (o `.mp3`). **No tiene que hacer nada más.**

## 9. Video, Shorts y kit para CapCut (automático)
Con el Panel abierto (`Abrir Fabrica.bat`), el vigilante (`panel/vigilar.mjs`) detecta la voz y arma solo el video,
la miniatura, los 3 Shorts y `salida/capcut/` (video sin subtítulos, voz, música, efectos, fotos, subtítulos .srt
y hoja de edición con los tiempos, para que el usuario agregue lo suyo en CapCut). En el Panel se ve la barra de avance. Si el usuario no abrió el Panel o te pide
armarlo, hazlo tú:
```
cd editor
npm run render -- ../videos/<caso>
npm run shorts -- ../videos/<caso>
npm run render -- ../videos/<caso> --solo-limpio
```
Si falló (existe `salida/error.txt`), lee `salida/armado.log`, arréglalo, borra `error.txt` y vuelve a armar.

## 10. Publicado
Cuando el usuario diga que lo subió, marca `[x] Publicado`.

## Reglas
- Nunca prometas visitas ni "viralidad".
- Datos reales y verificados; títulos llamativos pero verdaderos; nadie señalado como culpable sin condena.
- Sin violencia gráfica (apto para anunciantes).
- No instales programas ni publiques nada sin permiso.
- Texto para copiar y pegar: en texto plano, sin Markdown.
