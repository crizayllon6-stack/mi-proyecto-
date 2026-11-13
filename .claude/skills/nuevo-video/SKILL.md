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

## 3. Escribir el guion → agente `guionista`
Lanza el agente **guionista** (Agent, subagent_type "guionista") pasándole: el caso, TODA la investigación
con sus fuentes, y la ruta `videos/<slug>/guion.md` (`<slug>` en minúsculas con guiones, ej. `paso-dyatlov`).
Él conoce el formato de escenas y las reglas de retención. Guarda su mapa de retención en
`videos/<slug>/retencion.md`.

## 4. Verificar → agente `verificador`
Lanza el agente **verificador** (Agent, subagent_type "verificador") con la ruta del guion.
Es independiente a propósito: no le pases tu investigación, que busque por su cuenta.
Si marca muchos ❌, vuelve a pedirle al guionista que reescriba esa parte.

Si hay nombres extranjeros, crea `videos/<slug>/pronunciacion.txt` con líneas `Dyatlov = Diátlov`.

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
