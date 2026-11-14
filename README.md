# Esquina (monorepo)

Un solo proyecto Laravel + Inertia + Vue sirve las **herramientas** de [esquinaweb.com](https://esquinaweb.com) y los **juegos** de [esquinagamers.com](https://esquinagamers.com). Cada URL es un Alias Apache (o symlink local) a la misma carpeta `public/`.

Documentación detallada por producto → carpeta [`readme/`](readme/).

## Herramientas (EsquinaWeb)

| Producto | Ruta | Resumen | Doc |
| --- | --- | --- | --- |
| **Esquina Block** | `/esquinablock/` | Divide una imagen en hojas A4/Carta para un póster gigante (PDF). | [readme/esquinablock.md](readme/esquinablock.md) |
| **Esquina Cut** | `/esquinacut/` | Plantillas imprimibles con grid y contornos de corte. | [readme/esquinacut.md](readme/esquinacut.md) |
| **EsquinaQR** | `/esquinaqr/` | QR personalizados (URL, Wi‑Fi, vCard…) en PNG/SVG. | [readme/esquinaqr.md](readme/esquinaqr.md) |
| **Esquina PDF** | `/esquinapdf/` | Unir, borrar páginas, texto e imágenes→PDF. | [readme/esquinapdf.md](readme/esquinapdf.md) |
| **Esquina Img** | `/esquinaimg/` | Comprimir, convertir y redimensionar imágenes. | [readme/esquinaimg.md](readme/esquinaimg.md) |
| **Esquina BG** | `/esquinabg/` | Quitar fondo (ONNX: u2netp, silueta, RMBG) + pincel de máscara. | [readme/esquinabg.md](readme/esquinabg.md) |

Producción: `https://esquinaweb.com/<ruta>/`

## Juegos (EsquinaGamers)

| Producto | Ruta | Resumen | Doc |
| --- | --- | --- | --- |
| **Esquina 2048** | `/esquina2048/` | 2048 con modos 4×4 / 5×5 / 6×6 y temas. | [readme/esquina2048.md](readme/esquina2048.md) |
| **Esquina Blocks** | `/esquinablocks/` | Puzzle tipo Block Blast (tablero 8×8, Phaser). | [readme/esquinablocks.md](readme/esquinablocks.md) |

Producción: `https://esquinagamers.com/<ruta>/`

## Privacidad

En las herramientas, el procesamiento es **en el navegador**. No hay login ni base de datos de usuario; Laravel sirve la página. Sesión/CSRF desactivados donde no hacen falta.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | Laravel 12 (PHP 8.2+) |
| Puente | Inertia.js 3 + Ziggy |
| Frontend | Vue 3 + Tailwind CSS 4 |
| Build | Vite 7 |
| Juegos | Phaser 3 |
| BG | ONNX Runtime Web + modelos en `public/models/esquinabg/` |

## Desarrollo local

```bash
composer install
cp .env.example .env && php artisan key:generate
npm install
npm run build          # o npm run dev en otra terminal
PORT=8000 ./dev-serve.sh
```

Abre p. ej. [http://127.0.0.1:8000/esquinablock/](http://127.0.0.1:8000/esquinablock/) (índice en `/`).

> Usa `127.0.0.1` si Docker/WSL rompe `localhost`. No uses `php artisan serve` (no simula los Alias).

Modelos de Esquina BG (opcionales en local):

```bash
bash scripts/fetch-bg-models.sh
```

Pruebas: `php artisan test`

## Despliegue (resumen)

- Código en `/var/www/esquina-block`; WordPress sigue en la raíz del dominio.
- Apache: `Alias /esquinablock|… /var/www/esquina-block/public` (tools en esquinaweb; juegos en esquinagamers).
- Script local: `deploy.sh` (no versionado; plantilla `deploy.sh.example`). Juegos: `scripts/fix-2048-vps.sh`.
- **No** uses `php artisan route:cache` ni `optimize` (rompe las rutas bajo Alias).

## AdSense

- Script solo con `APP_ENV=production` (o `ADSENSE_ENABLED=true`).
- Bloques manuales: `ADSENSE_SLOT_AFTER_TOOL`, `BEFORE_FAQ`, `SIDE_*` (tools) y `ADSENSE_SLOT_GAMERS_*` (juegos).
- Para probar solo Auto ads (sin bloques fijos): `ADSENSE_MANUAL_UNITS=false` y luego `php artisan config:cache`.

## Google Analytics 4

- Tools: `GA4_MEASUREMENT_ID` · Juegos: `GA4_GAMERS_MEASUREMENT_ID`
- Código: `resources/js/analytics.js` + `resources/views/partials/ga4.blade.php`
- Eventos por producto: ver cada archivo en [`readme/`](readme/)
- Local: `GA4_DEBUG=true` + ID real

## Licencia

Código propiedad de EsquinaWeb / EsquinaGamers. Todos los derechos reservados.
