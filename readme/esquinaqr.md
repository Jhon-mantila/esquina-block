# EsquinaQR

Generador de códigos QR personalizados (URL, Wi‑Fi, vCard, email, SMS) con colores, formas y logo opcional.

- **URL:** [https://esquinaweb.com/esquinaqr/](https://esquinaweb.com/esquinaqr/)
- **Local:** `http://127.0.0.1:8000/esquinaqr/`
- **Dominio:** EsquinaWeb
- **Doc general:** [../README.md](../README.md)

## Qué hace

- Tipos: URL, Wi‑Fi, contacto, email, SMS.
- Estilos (formas/colores) y logo en el centro.
- Descarga PNG o SVG.
- Generación **en el navegador**.

## Código principal

| Pieza | Ruta |
| --- | --- |
| Vista Blade | `resources/views/esquinaqr.blade.php` |
| Página Vue | `resources/js/Pages/EsquinaQR/` |
| Config | `config/esquinaqr.php` |
| Controlador | `app/Http/Controllers/EsquinaQRController.php` |

## Eventos GA4 (`tool` / `tool_page`: `qr`)

| Evento | Cuándo | Parámetros clave |
| --- | --- | --- |
| `page_view` | Carga / navegación | `tool_page: qr` |
| `qr_type_select` | Cambiar tipo de QR | `tool: qr`, `qr_type` |
| `upload_image` | Subir logo | `tool: qr`, `asset: logo` |
| `file_download` | PNG o SVG | `tool: qr`, `file_extension`, `qr_type` |
| `cross_tool_click` | Footer | `from_tool: qr`, `to_tool` |
