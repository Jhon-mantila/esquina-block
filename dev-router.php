<?php

/**
 * Router para el servidor embebido de PHP en local.
 *
 * Uso:
 *   php -S [::]:8000 -t .dev-root dev-router.php
 *   # o: npm run serve
 *
 * Sirve /esquinablock, /esquinacut y /esquinaqr como en producción (Alias Apache).
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if ($uri === '/esquinablock' || $uri === '/esquinacut' || $uri === '/esquinaqr') {
    header('Location: '.$uri.'/', true, 301);
    exit;
}

if ($uri === '/' || $uri === '') {
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Esquina local</title>';
    echo '<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5}';
    echo 'a{color:#2563eb;font-weight:600}</style></head><body>';
    echo '<h1>Servidor local</h1><p>Elige una herramienta:</p><ul>';
    echo '<li><a href="/esquinablock/">Esquina Block</a> — póster en varias hojas</li>';
    echo '<li><a href="/esquinacut/">Esquina Cut</a> — plantillas imprimibles con contornos de corte</li>';
    echo '<li><a href="/esquinaqr/">EsquinaQR</a> — generador de códigos QR</li>';
    echo '</ul></body></html>';

    return true;
}

if (! preg_match('#^/(esquinablock|esquinacut|esquinaqr)(/.*)?$#', $uri, $matches)) {
    http_response_code(404);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html lang="es"><body style="font-family:system-ui;margin:3rem">';
    echo '<p>404. Prueba <a href="/esquinablock/">/esquinablock/</a>, <a href="/esquinacut/">/esquinacut/</a> o <a href="/esquinaqr/">/esquinaqr/</a>.</p>';
    echo '</body></html>';

    return true;
}

$prefix = $matches[1];
$rest = $matches[2] ?? '/';
$public = __DIR__.'/public';
$doc = __DIR__.'/.dev-root/'.$prefix;

// Archivos estáticos (build, favicon, etc.) vía symlink en .dev-root.
if ($rest !== '/' && $rest !== '') {
    $static = $doc.$rest;
    if (is_file($static)) {
        return false;
    }
}

// Front controller Laravel con base path correcto.
$_SERVER['SCRIPT_NAME'] = '/'.$prefix.'/index.php';
$_SERVER['SCRIPT_FILENAME'] = $public.'/index.php';
chdir($public);
require $public.'/index.php';

return true;
