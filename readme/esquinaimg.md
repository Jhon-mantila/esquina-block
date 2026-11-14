# Esquina Img

Comprime, convierte y redimensiona imágenes (JPG, PNG, WebP, AVIF, JFIF) en el navegador.

- **URL:** [https://esquinaweb.com/esquinaimg/](https://esquinaweb.com/esquinaimg/)
- **Local:** `http://127.0.0.1:8000/esquinaimg/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Entrada: JPG, PNG, WebP, AVIF, JFIF.
- Salida: JPG, PNG o WebP (calidad configurable).
- Redimensionar (ancho/alto, mantener proporción, mismo tamaño exacto).
- Descarga individual o ZIP si hay varias.
- Procesamiento **en el navegador**.

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinaimg.blade.php` |
| Página Vue | `resources/js/Pages/EsquinaImg/Index.vue` |
| Config | `config/esquinaimg.php` |
| Controlador | `app/Http/Controllers/EsquinaImgController.php` |

## Eventos GA4 (`tool` / `tool_page`: `img`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: img` |
| `upload_image` | Subir imágenes | `tool: img`, `image_count` |
| `process_image` | Procesar con éxito | `tool: img`, `output_format`, `quality`, `resize_*` |
| `file_download` | Una imagen o ZIP | `tool: img`, `file_extension`, `image_count` (ZIP) |
| `cross_tool_click` | Footer | `from_tool: img`, `to_tool` |
