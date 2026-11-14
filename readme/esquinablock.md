# Esquina Block

Divide una imagen en varias hojas A4 o Carta e imprime un póster gigante (estilo *block poster* / *rasterbator*).

- **URL:** [https://esquinaweb.com/esquinablock/](https://esquinaweb.com/esquinablock/)
- **Local:** `http://127.0.0.1:8000/esquinablock/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Subida por clic o arrastrar/soltar (JPG, PNG, WebP, máx. 20 MB).
- Cuadrícula 1–10 × 1–10, papel A4/Carta, orientación y márgenes.
- Solapamiento opcional y marcas de corte.
- Previsualización en canvas y PDF multi-página (jsPDF), sin marca de agua.
- Todo el procesamiento es **en el navegador** (la imagen no se sube al servidor).

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/app.blade.php` |
| Página Vue | `resources/js/Pages/EsquinaBlock/Index.vue` |
| Lógica póster | `resources/js/Composables/useBlockPoster.js` |
| Config SEO/AdSense | `config/esquinablock.php` |
| Controlador | `app/Http/Controllers/EsquinaBlockController.php` |

## Eventos GA4 (`tool` / `tool_page`: `block`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `page_path`, `tool_page: block` |
| `upload_image` | Subir o soltar imagen | `tool: block`, `image_count` |
| `generate_pdf` | Generar PDF | `tool: block` |
| `file_download` | Descarga PDF | `tool: block`, `file_extension: pdf` |
| `cross_tool_click` | Footer a otra tool | `from_tool: block`, `to_tool` |

Implementación: `resources/js/analytics.js`.
