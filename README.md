# Esquina Block

Herramienta web gratuita para **dividir una imagen en varias hojas A4 o Carta e imprimir un póster gigante** (estilo *block poster* / *rasterbator*). El usuario sube una imagen, elige filas y columnas, ve la previsualización y descarga un PDF listo para imprimir.

- **Producción:** https://esquinaweb.com/esquinablock
- **Proyecto de:** [EsquinaWeb](https://esquinaweb.com)

## Características

- Subida por arrastrar y soltar o con clic (JPG, PNG y WebP, máximo 20 MB).
- Imagen de ejemplo precargada, que se puede quitar y volver a mostrar.
- Cuadrícula de 1 a 10 columnas y de 1 a 10 filas, papel A4 o Carta, orientación vertical u horizontal y márgenes ninguno, pequeño (5 mm) o mediano (10 mm).
- Solapamiento opcional entre hojas (5 o 10 mm) y marcas de corte, para pegar las hojas sin huecos.
- Previsualización en `<canvas>` con líneas de corte, franjas de solapamiento, numeración de hojas y hojas en blanco.
- Tamaño final del póster en cm, calidad de impresión estimada en DPI y sugerencia de filas para no desperdiciar papel.
- PDF con una hoja por página, número de hoja y barra de progreso, sin marca de agua. El archivo se llama `block-poster-AAAA-MM-DD.pdf`.

### Privacidad

**Todo el procesamiento ocurre en el navegador** (Canvas API y jsPDF). La imagen nunca se sube al servidor: no hay base de datos, ni login, ni almacenamiento de archivos. Laravel solo sirve la página y no crea cookies: la sesión y la protección CSRF están desactivadas en `bootstrap/app.php` porque no hay formularios.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Laravel 12 (PHP 8.2+) |
| Puente | Inertia.js 3 + Ziggy 2 |
| Frontend | Vue 3 (JavaScript) + Tailwind CSS 4 |
| Build | Vite 7 |
| PDF | jsPDF 4 (se carga solo al pulsar «Descargar PDF») |

## Estructura

```
app/Http/Controllers/EsquinaBlockController.php   Único controlador: devuelve la vista Inertia
routes/web.php                                    Única ruta: "/" (nombre: esquinablock)
resources/views/app.blade.php                     HTML base (título, meta, SEO)
resources/js/
├── app.js                                        Arranque de Vue + Inertia + Ziggy
├── demoImage.js                                  Genera la imagen de ejemplo con Canvas
├── Pages/EsquinaBlock/Index.vue                  Página principal: une todos los bloques
├── Components/
│   ├── ImageUploader.vue                         Zona de subida
│   ├── GridSettings.vue                          Formulario de configuración
│   ├── SegmentedControl.vue                      Selector de botones (A4 | Carta…)
│   ├── GridPreview.vue                           Previsualización en canvas
│   └── PdfGenerator.vue                          Resumen, botón de descarga y progreso
└── Composables/useBlockPoster.js                 Lógica: cálculo de la cuadrícula, corte con Canvas, PDF y validaciones
```

Todas las medidas internas están en **milímetros**. `computeLayout()` no usa el DOM, así que se puede probar directamente con Node.

## Desarrollo local

### Requisitos

- PHP 8.2+ con las extensiones `mbstring`, `xml`, `curl`, `zip` y `fileinfo`
- Composer 2
- Node.js 20+ y npm

### Instalación

```bash
git clone https://github.com/Jhon-mantila/esquina-block.git
cd esquina-block
composer install
cp .env.example .env
php artisan key:generate
npm install
```

### Levantar el proyecto simulando el subdirectorio

En producción la app vive en `/esquinablock`, no en la raíz. Para reproducirlo en local se usa la carpeta `.dev-root/` (ignorada por git), que contiene un enlace a `public/` con ese nombre:

```bash
mkdir -p .dev-root && ln -sfn ../public .dev-root/esquinablock
```

Luego, en dos terminales:

```bash
php -S 127.0.0.1:8000 -t .dev-root   # servidor PHP
npm run dev                          # Vite con recarga en caliente
```

Abre http://localhost:8000/esquinablock/

> Si prefieres no usar Vite en modo desarrollo, compila una vez con `npm run build` y deja solo el servidor PHP.

### Pruebas

```bash
php artisan test
```

La prueba de humo comprueba que la página carga y devuelve el componente `EsquinaBlock/Index`.

## Despliegue en el VPS (Apache + WordPress)

La app vive **fuera** de `public_html`. Solo su carpeta `public/` se expone en `/esquinablock` mediante una directiva `Alias`, de modo que WordPress sigue funcionando igual en la raíz del dominio.

### 1. Clonar e instalar

```bash
cd /var/www
git clone https://github.com/Jhon-mantila/esquina-block.git
cd esquina-block
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

### 2. Configurar `.env` de producción

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://esquinaweb.com/esquinablock
LOG_LEVEL=error
```

El resto de valores de `.env.example` ya vienen preparados: sin base de datos, caché en archivos y SSR de Inertia desactivado.

### 3. Compilar el frontend

Si el servidor tiene Node.js:

```bash
npm ci && npm run build
```

Si no lo tiene (es el caso del VPS actual), compila en local y sube la carpeta `public/build/`:

```bash
npm run build
rsync -az --delete public/build/ root@2.24.217.27:/var/www/esquina-block/public/build/
```

### 4. Permisos y cachés

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan event:cache
```

> **No uses `php artisan route:cache` ni `php artisan optimize`.** Con la app en un subdirectorio, la caché de rutas de Laravel recorta la barra final de `/esquinablock/` y la página principal responde *405 Method Not Allowed*. Con una sola ruta, esa caché no aporta nada.

### 5. Apache

Dentro del `<VirtualHost *:443>` de esquinaweb.com:

```apache
Alias /esquinablock /var/www/esquina-block/public

<Directory /var/www/esquina-block/public>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>

# Los archivos de build llevan hash en el nombre: se pueden cachear un año.
<Directory /var/www/esquina-block/public/build>
    Header set Cache-Control "public, max-age=31536000, immutable"
</Directory>
```

Hace falta `mod_headers` (`sudo a2enmod headers`).

Activa `mod_rewrite` si no lo está y recarga Apache:

```bash
sudo a2enmod rewrite
sudo apachectl configtest && sudo systemctl reload apache2
```

Con Apache 2.4.58 no hace falta `RewriteBase` en `public/.htaccess`: las rutas internas (por ejemplo `/esquinablock/up`) funcionan con el `.htaccess` por defecto de Laravel.

### Actualizar a una nueva versión

En local, tras hacer `git push`:

```bash
npm run build
rsync -az --delete public/build/ root@2.24.217.27:/var/www/esquina-block/public/build/
```

En el servidor:

```bash
cd /var/www/esquina-block
git pull
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan optimize:clear
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan event:cache
```

## AdSense

El script de AdSense (`ca-pub-1852556021136727`) se carga **solo con `APP_ENV=production`**, para no generar tráfico inválido en desarrollo. Con eso funcionan los anuncios automáticos configurados para esquinaweb.com en el panel de AdSense. El `ads.txt` ya está en la raíz del dominio (lo sirve WordPress).

Además hay bloques manuales que solo aparecen si se configura su ID de bloque en el `.env`:

| Variable | Ubicación | Valor en producción |
|---|---|---|
| `ADSENSE_SLOT_AFTER_TOOL` | Bajo la herramienta | `1409541666` |
| `ADSENSE_SLOT_BEFORE_FAQ` | Antes de las preguntas frecuentes | `5157214983` |
| `ADSENSE_SLOT_SIDE_LEFT` | Lateral izquierdo fijo | `7223965968` |
| `ADSENSE_SLOT_SIDE_RIGHT` | Lateral derecho fijo | `3401190893` |

Los laterales son verticales (160 × 600, o 300 × 600 desde 1800 px de ancho) y solo se crean en pantallas de al menos 1536 × 800 px, donde caben en el hueco a los lados del contenido sin taparlo.

Los formatos de superposición (pantalla completa, laterales y anclado) vienen de los anuncios automáticos. En el panel de AdSense, la zona superior de `/esquinablock` está excluida para que no aparezca un banner encima del título.

Para desactivar AdSense en producción: `ADSENSE_ENABLED=false`. Tras cambiar el `.env`, ejecutar `php artisan config:cache`.

## Pendiente

- [x] Contenido SEO: meta description, schema.org `WebApplication` y `FAQPage`, sección «Cómo funciona», guía para armar el póster y preguntas frecuentes.
- [x] AdSense.
- [ ] Enlace desde el artículo [Block Posters: Convierte imágenes en carteles gigantes](https://esquinaweb.com/block-posters-convierte-imagenes-en-carteles-gigantes/) hacia la herramienta.
- [ ] Fase 2: efectos artísticos (semitono, esténcil…).

## Licencia

Código propiedad de EsquinaWeb. Todos los derechos reservados.
