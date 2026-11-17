# Esquina Upscale

Amplía fotos (JPG, PNG, WebP) **en el navegador** con superresolución neuronal ONNX.

- **URL prevista:** [https://esquinaweb.com/esquinaupscale/](https://esquinaweb.com/esquinaupscale/)
- **Local:** `http://127.0.0.1:8010/esquinaupscale/`
- **Dominio:** EsquinaWeb

## Qué hace

- Subir o arrastrar una imagen y ver el tamaño original.
- El modo por defecto es Ligero. Alta calidad y Automático están en opciones avanzadas.
- Ampliar 4× con Real-ESRGAN (no es un redimensionado convencional).
- Comparar original y resultado.
- Descargar PNG o JPEG.
- La imagen no se envía al servidor. Si la foto es muy grande, se reduce el lado de entrada antes de la red y se avisa.

## Modelos

Definidos en `resources/js/AIEngine/catalog/superResolution.js`. Archivos en `public/models/esquinaupscale/`.

| UI | Archivo | Red | Tamaño aprox. |
| --- | --- | --- | --- |
| Ligero | `realesr-general-x4v3.onnx` | SRVGGNetCompact | 4,9 MB |
| Alta calidad | `realesrgan-x4plus.onnx` | RRDBNet | 67 MB |

No hay nivel equilibrado: no apareció un tercer modelo general, compatible y con licencia clara.

```bash
bash scripts/fetch-upscale-models.sh
```

Licencia de los pesos: BSD-3-Clause, xinntao/Real-ESRGAN.

## Código

| Pieza | Ruta |
| --- | --- |
| Página Vue | `resources/js/Pages/EsquinaUpscale/Index.vue` |
| Cliente | `resources/js/Pages/EsquinaUpscale/upscaleClient.js` |
| Bloques | `resources/js/AIEngine/tasks/superResolutionMath.js` |
| Vista Blade | `resources/views/esquinaupscale.blade.php` |
| Config | `config/esquinaupscale.php` |

En el servidor hace falta el alias `/esquinaupscale` hacia `public/`, igual que el resto de herramientas.
