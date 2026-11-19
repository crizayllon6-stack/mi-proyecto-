# Pendiente: clave "REVISAR PANEL"

Cuando el usuario diga **"REVISAR PANEL"**:

1. Si estás en la compu del usuario: haz commit y push de todo a la rama `claude/hola-pylyus`.
   Si estás en la nube: haz `git pull` de la rama `claude/hola-pylyus`.
2. Revisa el **panel nuevo que el usuario hizo en su compu** (el de "Panel de Casos.bat" o el que haya quedado)
   y comprueba que tenga todo lo acordado:
   - Pestañas Casos (con puntaje del ranking y botón "Elegir este") y Ranking (tabla + top 3).
   - Botón "Buscar casos nuevos" (cazador-casos + analista-viralidad automático).
   - Paradas donde el usuario decide: caso, título y miniatura, aprobar el guion.
   - Avance de cada video por pasos (lee `videos/<caso>/ficha.md`).
   - Botón "Copiar texto para Loquendo" (voz.txt).
   - Armado automático al dejar `voz.wav`: video, miniatura, 3 Shorts y kit CapCut, con barra de avance y aviso si falla.
   - Pestaña de videos terminados con botones para copiar título, descripción y capítulos.
   - Fotos del caso con créditos; se actualiza solo; se abre con doble clic desde el Escritorio.
3. Dile al usuario, en español simple y corto, qué está bien y qué falta, y dale el mensaje exacto
   para pedirle al Claude de su compu lo que falte.

Otros pendientes:
- Probar en Windows la descarga de fotos de Wikimedia (`editor/scripts/recursos.mjs`).
- Agregar escenas EVIDENCIA, NOTA y LINEA a los 4 guiones viejos (Somerton, Valentich, Flannan, Hinterkaifeck)
  cuando se trabajen.
- Verificar con una fuente las 5 líneas del código de Somerton antes de usarlas en una escena NOTA.

# Pendiente: clave "YA SUBÍ CLIP" (Buscador de Tenis)
El usuario va a subir desde su laptop el modelo CLIP en pedazos a `buscador-tenis/clip/clip.partNN`
(Xenova/clip-vit-base-patch32, onnx/vision_model_quantized.onnx). Cuando diga "ya subí CLIP":
1. `git pull`, revisa los pedazos (cada uno < 15 MB) y que juntos formen un .onnx válido.
2. Cambia el Buscador de Tenis (`buscador-tenis/index.html`) para usar CLIP con onnxruntime-web
   (wasm publicado junto a la página), uniendo los pedazos en el celular y guardando el modelo en IndexedDB.
   Preprocesado CLIP: 224x224, recorte al centro, media [0.48145466, 0.4578275, 0.40821073],
   desviación [0.26862954, 0.26130258, 0.27577711]. Normaliza el vector.
3. Los chats ya cargados se recalculan con CLIP desde sus miniaturas (guardar vector nuevo aparte).
4. Prueba, publica en el mismo artifact (https://claude.ai/artifact/Xpa8mAAR2WviZACvVQTYW4) y avisa.
