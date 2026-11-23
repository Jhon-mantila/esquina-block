# Esquina Eraser

Quita personas, objetos o textos de una foto **en el navegador**.

- **URL prevista:** [https://esquinaweb.com/esquinaeraser/](https://esquinaweb.com/esquinaeraser/)
- **Local:** `http://127.0.0.1:8000/esquinaeraser/`
- **Dominio:** EsquinaWeb

## Qué hace

- Subir o arrastrar una imagen y ver su tamaño.
- Pintar la zona que se quiere quitar, con pincel, borrador, deshacer, rehacer y zoom.
- Procesar solo el recorte de esa zona. El resto de la foto conserva su resolución.
- Comparar antes y después, y descargar PNG.
- La foto no se envía al servidor. El modelo se descarga de tu propio `public/` la primera vez que hace falta. Si ahí no está, el navegador lo pide a Hugging Face, igual que Esquina BG y Esquina Upscale.

El relleno es una reconstrucción plausible. No recupera los píxeles que estaban detrás del objeto.

## Modelo

Definido en `resources/js/AIEngine/catalog/inpainting.js`. Archivo en `public/models/esquinaeraser/`.

| Archivo | Red | Tamaño | SHA256 |
| --- | --- | --- | --- |
| `lama_webgpu.onnx` | LaMa fp32, grafo reescrito para WebGPU | 209 033 286 bytes | `75ddeeb344ca4603b261b09fce0e9323e17872042907f5ee205c9875464c8e3b` |

Origen: pesos [advimman/lama](https://github.com/advimman/lama), Apache-2.0. Exportación [Carve/LaMa-ONNX](https://huggingface.co/Carve/LaMa-ONNX), reescrita en [toolsmonk/lama-webgpu](https://huggingface.co/toolsmonk/lama-webgpu).

Entradas fijas, leídas del archivo:

- `image`, float32 `[1, 3, 512, 512]`, valores de 0 a 1.
- `mask`, float32 `[1, 1, 512, 512]`. 1 es la zona a rellenar.
- `output`, float32 `[1, 3, 512, 512]`, valores de 0 a 255 según la ficha del modelo.
- Opset 17.

No hay variantes Basic, Balanced y High. Es un solo modelo.

```bash
bash scripts/fetch-eraser-models.sh
```

## Proveedores

El catálogo declara `webgpu` y, si ese procesamiento falla, `wasm`.

- Con GPU, el worker importa `onnxruntime-web/webgpu` y los binarios `asyncify`.
- Esquina BG y Esquina Upscale siguen en el worker que importa `onnxruntime-web/wasm`.
- Si el proceso terminó en WASM teniendo la GPU disponible, la página avisa que se usó el modo compatible. No anuncia WebGPU por el simple hecho de que el navegador la tenga.

Hace falta un navegador con WebGPU (Chrome o Edge actuales) para el camino rápido. Sin WebGPU se usa WASM, más lento. Con menos de 4 GB de memoria declarada por el navegador, la herramienta no arranca el modelo.

## Código

| Pieza | Ruta |
| --- | --- |
| Página Vue | `resources/js/Pages/EsquinaEraser/Index.vue` |
| Pincel | `resources/js/Pages/EsquinaEraser/MaskPainter.vue` |
| Cliente | `resources/js/Pages/EsquinaEraser/eraserClient.js` |
| Recortes | `resources/js/AIEngine/tasks/inpaintingMath.js` |
| Inferencia | `resources/js/AIEngine/tasks/inpainting.js` |
| Worker WebGPU | `resources/js/AIEngine/workers/inference.webgpu.worker.js` |
| Vista Blade | `resources/views/esquinaeraser.blade.php` |
| Config | `config/esquinaeraser.php` |

En el servidor hace falta el alias `/esquinaeraser` hacia `public/`.

## AdSense

Usa la misma configuración que el resto de herramientas de EsquinaWeb. Los datos están en `config/esquinaeraser.php`: `ADSENSE_ENABLED` (o `APP_ENV=production`), `ADSENSE_CLIENT` y los slots `ADSENSE_SLOT_AFTER_TOOL`, `ADSENSE_SLOT_BEFORE_FAQ`, `ADSENSE_SLOT_SIDE_LEFT` y `ADSENSE_SLOT_SIDE_RIGHT`. El script y los bloques se insertan desde `resources/views/esquinaeraser.blade.php` junto con `partials/ad.blade.php` y `partials/side-ads.blade.php`.

## Eventos GA4 (`tool` / `tool_page`: `eraser`)

Misma medición que las otras herramientas: `GA4_MEASUREMENT_ID`, `resources/views/partials/ga4.blade.php` y `resources/js/analytics.js`. En local hace falta `GA4_DEBUG=true` y un ID real.

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: eraser` |
| `upload_image` | Subir imagen | `tool: eraser`, `image_count: 1` |
| `process_image` | Objeto quitado con éxito | `tool: eraser`, `model` (`webgpu` o `wasm`), `image_width`, `image_height` |
| `file_download` | PNG final | `tool: eraser`, `file_extension: png` |
| `cross_tool_click` | Footer | `from_tool: eraser`, `to_tool` |

## Pruebas

Lógica del motor, sin navegador:

```bash
npm run test:ai
php artisan test --filter=test_esquina_eraser_carga_correctamente
```

En el navegador, antes de dar el modelo por compatible, conviene probar al menos:

1. Fondo uniforme.
2. Persona sobre un fondo complejo.
3. Objeto pequeño y objeto grande.
4. Texto.
5. Objeto junto al borde.
6. Foto grande y foto no cuadrada.
7. Una selección irregular y varias zonas a la vez.
8. Chrome con WebGPU y Chrome sin WebGPU.
9. Que Esquina BG y Esquina Upscale sigan abriendo.

Estas pruebas de imagen todavía no están automatizadas: el modelo pesa unos 199 MB y la sesión WebGPU solo se puede comprobar en un navegador.

## Limitaciones

- La primera descarga son unos 199 MB.
- Cada zona se reduce a 512×512 para la red y luego vuelve al tamaño del recorte. Una mancha muy grande pierde detalle en el relleno.
- WASM en un solo hilo puede tardar bastante.
- El borde se suaviza al pegar el recorte. Un patrón muy fino puede notarse.
