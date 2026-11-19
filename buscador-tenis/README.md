# Buscador de Tenis

Página para el celular: cargas un chat de WhatsApp exportado ("Incluir archivos"), sacas foto a un tenis y te dice
si aparece, con el % de parecido y el chat donde está. Todo se procesa en el celular (IndexedDB), nada se sube.

Publicada como artifact: https://claude.ai/artifact/Xpa8mAAR2WviZACvVQTYW4

## Cómo funciona
- Reconocimiento de imágenes: MediaPipe Image Embedder (MobileNet V3 large) de @mediapipe/tasks-vision 1.2.2.
- Compara la foto (entera y recortada al centro) con cada foto del chat por similitud coseno.
- Lee el .txt del chat (formato Android y iPhone) para saber de qué mensaje es cada foto.

## Archivos pesados (no están en git)
Para volver a publicar, bájalos aquí:
```
npm pack @mediapipe/tasks-vision@1.2.2 && tar xzf mediapipe-tasks-vision-1.2.2.tgz
cp package/wasm/vision_wasm_internal.wasm .
curl -o embedder.tflite https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_large/float32/1/mobilenet_v3_large.tflite
base64 -w0 embedder.tflite > modelo-embedder.b64.txt
```
Se publican junto a index.html: `vision_wasm_internal.wasm` (application/wasm) y `modelo-embedder.b64.txt`.
