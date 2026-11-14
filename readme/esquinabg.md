# Esquina BG

Quita el fondo de fotos (JPG, PNG, WebP) **en el navegador**, con modelos ONNX y un fallback ligero.

- **URL:** [https://esquinaweb.com/esquinabg/](https://esquinaweb.com/esquinabg/)
- **Local:** `http://127.0.0.1:8000/esquinabg/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Eliminación de fondo con IA (ONNX Runtime Web / WASM).
- Tres calidades en la UI (Rápido / Equilibrado / Alta).
- Editor de máscara (pincel mantener/borrar) tras el resultado.
- Descarga PNG transparente.
- La imagen **no se sube** al servidor; los modelos se cargan desde tu propio `public/` (o caché).

## Modelos ONNX

Definidos en `resources/js/Pages/EsquinaBG/models.js`. Archivos en `public/models/esquinabg/` (no van en git; ~90 MB).

| UI | Archivo local | Origen / notas | Tamaño aprox. |
| --- | --- | --- | --- |
| **Rápido** (`basic`) | `u2netp.onnx` | rembg / U²-Net pequeño | ~4.4 MB |
| **Equilibrado** (`balanced`) | `isnet-quantized.onnx` | rembg **silueta** (se guarda con ese nombre) | ~43 MB |
| **Alta calidad** (`high`) | `rmbg-quantized.onnx` | BRIA RMBG-1.4 cuantizado (Hugging Face) | ~44 MB |

Descarga:

```bash
bash scripts/fetch-bg-models.sh
```

Detalle de archivos junto a los modelos: [`public/models/esquinabg/README.md`](../public/models/esquinabg/README.md).

### Pipeline de inferencia

1. Intento con el modelo ONNX elegido (worker).
2. Si falla → fallback **bordercut** (rápido, sin red neuronal).
3. Retoque opcional de máscara en el cliente.

Librerías: `onnxruntime-web`, `bordercut`.

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinabg.blade.php` |
| Página Vue | `resources/js/Pages/EsquinaBG/Index.vue` |
| Modelos / ORT | `resources/js/Pages/EsquinaBG/models.js`, `onnxRemove.js`, `removeBackgroundClient.js` |
| Worker | `resources/js/Pages/EsquinaBG/background-removal.worker.js` |
| Config | `config/esquinabg.php` |
| Controlador | `app/Http/Controllers/EsquinaBGController.php` |

## Eventos GA4 (`tool` / `tool_page`: `bg`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: bg` |
| `upload_image` | Subir imagen | `tool: bg`, `image_count: 1` |
| `process_image` | Fondo quitado con éxito | `tool: bg`, `model`, `image_width`, `image_height` |
| `file_download` | PNG transparente | `tool: bg`, `file_extension: png` |
| `cross_tool_click` | Footer | `from_tool: bg`, `to_tool` |
