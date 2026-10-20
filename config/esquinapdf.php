<?php

/*
| Datos SEO de Esquina PDF. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'Esquina PDF — Une, divide, edita y añade texto a tus PDFs gratis',

    'description' => 'Une PDFs, elimina páginas, añade texto sobre tus documentos y convierte imágenes a PDF. Todo en tu navegador, sin subir archivos a ningún servidor. Gratis y en español.',

    'keywords' => 'unir pdf, eliminar paginas pdf, añadir texto pdf, imagenes a pdf, editor pdf online, pdf gratis, unir pdf online, pdf en el navegador',

    'og_title' => 'Esquina PDF — Une, edita y convierte PDFs gratis',

    'og_description' => 'Une PDFs, elimina páginas, añade texto y convierte imágenes a PDF. Todo en tu navegador, sin subir archivos.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_cut_url' => 'https://esquinaweb.com/esquinacut/',

    'sibling_qr_url' => 'https://esquinaweb.com/esquinaqr/',

    'sibling_img_url' => 'https://esquinaweb.com/esquinaimg/',

    'privacy_url' => 'https://esquinaweb.com/politica-de-privacidad/',

    'cookies_url' => 'https://esquinaweb.com/politica-de-cookies/',

    'adsense' => [
        'enabled' => (bool) env('ADSENSE_ENABLED', env('APP_ENV') === 'production'),
        'client' => env('ADSENSE_CLIENT', 'ca-pub-1852556021136727'),
        'slots' => [
            'after_tool' => env('ADSENSE_SLOT_AFTER_TOOL'),
            'before_faq' => env('ADSENSE_SLOT_BEFORE_FAQ'),
            'side_left' => env('ADSENSE_SLOT_SIDE_LEFT'),
            'side_right' => env('ADSENSE_SLOT_SIDE_RIGHT'),
        ],
    ],

    'faqs' => [
        [
            'q' => '¿Es gratis Esquina PDF?',
            'a' => 'Sí, completamente gratis. No requiere registro ni pagar por descargas.',
        ],
        [
            'q' => '¿Mis PDFs se suben a un servidor?',
            'a' => 'No. La unión, edición y conversión ocurren solo en tu navegador. Tus archivos no salen de tu dispositivo.',
        ],
        [
            'q' => '¿Qué puedo hacer con Esquina PDF?',
            'a' => 'Unir varios PDFs, eliminar páginas, añadir textos encima de un PDF y convertir imágenes JPG o PNG a PDF.',
        ],
        [
            'q' => '¿Hay límite de tamaño o de páginas?',
            'a' => 'Depende de la memoria de tu navegador. Para PDFs muy grandes, trabaja por partes o cierra otras pestañas.',
        ],
    ],

];
