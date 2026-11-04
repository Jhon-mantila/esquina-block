<?php

/*
| Datos SEO de Esquina BG. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'Esquina BG — Quitar fondo de imágenes gratis online',

    'description' => 'Quita el fondo de tus fotos JPG, PNG o WebP en el navegador. Sin subir archivos al servidor. Elige calidad según tu PC. Gratis y en español.',

    'keywords' => 'quitar fondo, eliminar fondo imagen, fondo transparente, png transparente, quitar fondo online gratis, remover fondo foto, recortar fondo imagen',

    'og_title' => 'Esquina BG — Quitar fondo de imágenes gratis',

    'og_description' => 'Elimina el fondo de fotos en tu navegador. Sin subir archivos. Gratis.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_cut_url' => 'https://esquinaweb.com/esquinacut/',

    'sibling_qr_url' => 'https://esquinaweb.com/esquinaqr/',

    'sibling_img_url' => 'https://esquinaweb.com/esquinaimg/',

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
            'q' => '¿Es gratis Esquina BG?',
            'a' => 'Sí, completamente gratis. No requiere registro ni pagar por descargas.',
        ],
        [
            'q' => '¿Mis imágenes se suben a un servidor?',
            'a' => 'No. El proceso ocurre solo en tu navegador. Tus fotos no salen de tu dispositivo.',
        ],
        [
            'q' => '¿Qué formatos acepta?',
            'a' => 'Puedes subir JPG, PNG o WebP. El resultado se descarga como PNG con fondo transparente.',
        ],
        [
            'q' => '¿Qué calidad debo elegir?',
            'a' => 'En la mayoría de PCs basta con Equilibrado. Si tu equipo es modesto, usa Rápido. Alta Calidad solo en PCs potentes.',
        ],
        [
            'q' => '¿Por qué una opción aparece deshabilitada?',
            'a' => 'Para no saturar tu memoria. Si el PC no da para un modo, verás “Requiere un PC más potente” y puedes usar uno más ligero.',
        ],
        [
            'q' => '¿Funciona en el móvil?',
            'a' => 'Sí, pero en móviles o portátiles antiguos conviene el modo Rápido. El proceso puede tardar más si la foto es grande.',
        ],
    ],

];
