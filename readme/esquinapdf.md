# Esquina PDF

Une PDFs, elimina páginas, añade texto y convierte imágenes a PDF. Todo en el navegador.

- **URL:** [https://esquinaweb.com/esquinapdf/](https://esquinaweb.com/esquinapdf/)
- **Local:** `http://127.0.0.1:8000/esquinapdf/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace (paneles)

- Unir PDFs
- Eliminar páginas
- Añadir texto sobre el documento
- Imágenes → PDF

Los archivos **no se suben** al servidor.

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinapdf.blade.php` |
| Página / paneles | `resources/js/Pages/EsquinaPdf/` |
| Config | `config/esquinapdf.php` |
| Controlador | `app/Http/Controllers/EsquinaPdfController.php` |

## Eventos GA4 (`tool` / `tool_page`: `pdf`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: pdf` |
| `upload_image` | Subir PDF(s) o imágenes | `tool: pdf`, `image_count` |
| `generate_pdf` | Generar en un panel | `tool: pdf` |
| `file_download` | Descarga del resultado | `tool: pdf`, `file_extension: pdf` |
| `cross_tool_click` | Footer | `from_tool: pdf`, `to_tool` |
