---
name: nuevo-video
description: Crea un video completo de misterios sin resolver para el canal de YouTube: propone casos para que el usuario elija, investiga, escribe el guion con etiquetas de escena, verifica cada dato y prepara título, miniatura y descripción. Úsalo cuando el usuario pida un video, un guion o un caso nuevo.
---

# Nuevo video de misterio

Canal en español de **misterios sin resolver**. Sin cara, voz de Loquendo (app Voz de Soria).
Cada video dura ~10 minutos (1 400–1 600 palabras narradas). El usuario tiene poco tiempo:
sé breve. **El usuario decide el tema**: nunca elijas el caso por él.

Argumento opcional: el caso o tema. Ejemplos: `/nuevo-video el caso de Elisa Lam`,
`/nuevo-video algo de desapariciones en el mar`, `/nuevo-video` (sin nada).

## 1. Elegir el caso (el usuario elige)
- **Si el argumento es un caso concreto**: confírmalo en una línea y pasa al paso 2.
- **Si es un tema general o no hay argumento**:
  1. **Buscador de ideas**: busca en la web 6–8 misterios sin resolver reales (del tema pedido, si lo hay)
     con fuentes confiables. Revisa `videos/` para no repetir casos.
  2. **Analista viral**: para cada uno busca qué tanto se ha contado ya en YouTube en español
     (videos existentes, si alguno explotó) y si tiene un detalle perturbador fácil de resumir en una frase.
  3. **Selector**: muéstrale al usuario una tabla con las 5 mejores opciones y **para ahí, espera su respuesta**:

| # | Caso | Gancho en una frase | Competencia en español | Fuentes | Puntaje /10 |
|---|---|---|---|---|---|

     Marca tu recomendada con ⭐ y di en una línea por qué. El usuario responde con el número
     (o pide otras opciones).

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
