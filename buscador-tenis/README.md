# Buscador de Tenis

Página para el celular: cargas un chat de WhatsApp exportado ("Incluir archivos"), sacas foto a un tenis (o
varias, de distintos ángulos) y te dice si aparece, con el % y el chat donde está. Todo se procesa en el celular
(IndexedDB), nada se sube.

Publicada como artifact: https://claude.ai/artifact/Xpa8mAAR2WviZACvVQTYW4

## IA
- **SigLIP B/16-224** de Google (torre de imagen), convertida a ONNX a mano desde el checkpoint de big_vision
  (`herramientas/convertir.py`, comprobada contra una versión en numpy) y cuantizada a int8
  (`herramientas/cuantizar.py`, ~96 MB). Reconoce el mismo objeto desde otro ángulo.
- Corre con onnxruntime-web 1.23.2 (wasm, 1 hilo). La primera vez el celular baja ~130 MB y la guarda en IndexedDB.
- Preparación: foto a 224x224, colores a [-1, 1]. Vector de 768 normalizado; similitud coseno.
- El % se calibra frente a todas las fotos del chat (cuánto se destaca), más un mínimo si la similitud es alta.

## Rehacer los archivos pesados (no están en git)
```
curl -o siglip_b16.npz https://storage.googleapis.com/big_vision/siglip/webli_en_b16_224_63724782.npz
pip install numpy onnx onnxruntime
python herramientas/convertir.py siglip_b16.npz siglip_img.onnx
python herramientas/cuantizar.py siglip_img.onnx siglip_img_q8.onnx
mkdir -p ia && base64 -w0 siglip_img_q8.onnx | split -b 14500000 -d -a 2 --additional-suffix=.txt - ia/siglip-q8-parte-
npm pack onnxruntime-web@1.23.2 && tar xzf onnxruntime-web-1.23.2.tgz && cp package/dist/ort-wasm-simd-threaded.wasm .
```
Se publican junto a index.html: `ort-wasm-simd-threaded.wasm` (application/wasm) y `ia/siglip-q8-parte-NN.txt`
(máx. 64 MB por publicación: en varias tandas).
