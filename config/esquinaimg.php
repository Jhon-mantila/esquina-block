<?php

/*
| Datos SEO de Esquina Img. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'Esquina Img — Comprime y convierte imágenes gratis (JPG, PNG, WebP)',

    'description' => 'Comprime imágenes JPG, PNG, WebP, AVIF o JFIF, conviértelas a WebP o JPG y redimensiónalas en tu navegador. Sin subir archivos. Gratis y en español.',

    'keywords' => 'comprimir imagen, convertir a webp, convertir avif a jpg, redimensionar imagen, comprimir jpg online, convertir png a webp, optimizador de imagen, reducir peso imagen, comprimir fotos gratis',

    'og_title' => 'Esquina Img — Comprime y convierte imágenes gratis',

    'og_description' => 'Sube JPG, PNG, WebP, AVIF o JFIF; exporta a JPG, PNG o WebP. Sin subir archivos. Gratis.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_cut_url' => 'https://esquinaweb.com/esquinacut/',

    'sibling_qr_url' => 'https://esquinaweb.com/esquinaqr/',

    'sibling_pdf_url' => 'https://esquinaweb.com/esquinapdf/',

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
            'q' => '¿Es gratis Esquina Img?',
            'a' => 'Sí, completamente gratis. No requiere registro ni pagar por descargas.',
        ],
        [
            'q' => '¿Mis imágenes se suben a un servidor?',
            'a' => 'No. La compresión, conversión y el redimensionado ocurren solo en tu navegador. Tus archivos no salen de tu dispositivo.',
        ],
        [
            'q' => '¿Qué formatos acepta?',
            'a' => 'Puedes subir JPG, PNG, WebP, AVIF y JFIF. Como salida eliges JPG, PNG o WebP, con control de calidad en JPG y WebP. AVIF requiere un navegador reciente.',
        ],
        [
            'q' => '¿Puedo redimensionar varias imágenes al mismo tamaño?',
            'a' => 'Sí. Indica ancho y alto y marca “Mismo ancho y alto para todas”. Al procesar, todas salen con ese tamaño exacto.',
        ],
        [
            'q' => '¿Hay límite de archivos o de peso?',
            'a' => 'Hasta 40 imágenes por lote. Si alguna supera unos 30 MB verás un aviso: puede saturar la memoria del navegador. El borrador se guarda en tu equipo (IndexedDB).',
        ],
        [
            'q' => '¿Se pierde calidad al comprimir?',
            'a' => 'Depende de la calidad que elijas (por defecto 80%). Usa la vista previa Antes/Después para ajustar antes de descargar.',
        ],
    ],

];
