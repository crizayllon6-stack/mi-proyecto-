---
name: nuevo-video
description: Crea un video completo de misterios sin resolver para el canal de YouTube: elige el caso, investiga, escribe el guion con etiquetas de escena, verifica cada dato y prepara título, miniatura y descripción. Úsalo cuando el usuario pida un video, un guion o un caso nuevo.
---

# Nuevo video de misterio

Canal en español de **misterios sin resolver**. Sin cara, voz de Loquendo (app Voz de Soria).
Cada video dura ~10 minutos (1 400–1 600 palabras narradas). El usuario tiene poco tiempo:
entrégale todo listo, no le hagas preguntas salvo que sea imprescindible.

Argumento opcional: el caso a tratar. Si no hay, elige tú.

## 1. Elegir el caso
- Busca en la web misterios sin resolver reales con fuentes confiables (prensa, archivos, documentos oficiales).
- Revisa `videos/` para no repetir casos.
- Prefiere casos poco contados en español, con un detalle visual o perturbador fácil de resumir en una frase.
- Escoge 1 y anota en una línea por qué.

## 2. Investigar
Reúne fechas, lugares (con coordenadas), personas (nombre, edad, rol, estado), documentos y frases oficiales,
y las teorías principales. Guarda las URLs.

## 3. Escribir `videos/<slug>/guion.md`
`<slug>` en minúsculas con guiones, ej. `paso-dyatlov`.

Formato (cada etiqueta empieza una escena que dura hasta la siguiente; la voz NO lee las etiquetas):

```
---
titulo: El paso Diátlov
miniatura: CORTARON LA TIENDA DESDE DENTRO
etiqueta: SIN RESOLVER
imagen_miniatura: (opcional, nombre de archivo en imagenes/)
---
[TITULO: EL PASO DIÁTLOV | Nueve excursionistas. Ninguna explicación.]
Texto narrado...
[MAPA: Montes Urales, Rusia | 61.75, 59.46]
[FECHA: 1 de febrero de 1959 | Noche del incidente]
[FICHA: Nombre | 23 años | Rol | MUERTO | foto.jpg]
[DOC: Título del documento | Frase textual clave]
[TEXTO: Pregunta o frase impactante corta]
[IMAGEN: archivo.jpg | Pie de foto]
[PAUSA: 1.5]
```

Reglas del guion:
- **Gancho en las primeras 2 frases**: el detalle más inquietante del caso, sin contexto.
- Estructura: gancho → contexto → los hechos en orden → lo que no encaja → teorías (de la más débil a la más fuerte) → cierre abierto que invite a comentar.
- Usa `[TITULO: ...]` para separar partes (se convierten en capítulos de YouTube).
- Cambia de escena cada 15–40 segundos de narración (unas 40–100 palabras). Ningún tramo largo sin etiqueta.
- Frases cortas, ritmo de suspenso. Nada de relleno ni frases genéricas de IA.
- Pensado para voz sintética: evita paréntesis, siglas raras y frases de más de 25 palabras.
- Si hay nombres extranjeros, crea `videos/<slug>/pronunciacion.txt` con líneas `Dyatlov = Diátlov`.
- Las etiquetas `[IMAGEN]` sólo si el usuario tendrá esa imagen; si no, usa MAPA/FECHA/FICHA/DOC/TEXTO.

## 4. Verificar (paso independiente)
Relee el guion como si fueras otra persona escéptica. Para **cada** afirmación concreta (fecha, cifra, nombre,
cita, causa), búscala de nuevo en una fuente distinta. Marca en `videos/<slug>/verificacion.md`:
✅ confirmado (con URL) · ⚠️ dudoso · ❌ falso. Corrige o elimina del guion todo lo ⚠️/❌.
Las teorías se presentan como teorías, nunca como hechos.

## 5. Paquete `videos/<slug>/paquete.md`
- 5 títulos (máx. 60 caracteres), llamativos pero **verdaderos**. Marca tu favorito.
- 3 textos de miniatura (máx. 5 palabras).
- Descripción: 2 líneas gancho + resumen + fuentes.
- 15 etiquetas.
- Recordatorio: marcar "contenido alterado o sintético" si aplica.

## 6. Preparar
Ejecuta `cd editor && node scripts/preparar.mjs ../videos/<slug>` para generar `voz.txt`.
Muestra al usuario: el caso elegido, el título favorito y los pasos siguientes:
1. Pegar `voz.txt` en Voz de Soria y guardar el audio como `videos/<slug>/voz.wav` (o .mp3).
2. Ejecutar `cd editor && npm run render -- ../videos/<slug>`.
