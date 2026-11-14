# Esquina Cut

Genera plantillas imprimibles en PDF con tus imágenes en grid y contornos de corte (rectángulo, círculo o silueta).

- **URL:** [https://esquinaweb.com/esquinacut/](https://esquinaweb.com/esquinacut/)
- **Local:** `http://127.0.0.1:8000/esquinacut/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Varias imágenes en una hoja, grid configurable.
- Contornos de corte; silueta conviene con PNG transparente.
- PDF listo para imprimir y recortar.
- Procesamiento **en el navegador**.

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinacut.blade.php` |
| Página Vue | `resources/js/Pages/EsquinaCut/Index.vue` |
| Config | `config/esquinacut.php` |
| Controlador | `app/Http/Controllers/EsquinaCutController.php` |

## Eventos GA4 (`tool` / `tool_page`: `cut`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: cut` |
| `upload_image` | Subir o añadir imágenes | `tool: cut`, `image_count` |
| `generate_pdf` | Generar PDF | `tool: cut` |
| `file_download` | PDF generado | `tool: cut`, `file_extension: pdf` |
| `cross_tool_click` | Footer | `from_tool: cut`, `to_tool` |
