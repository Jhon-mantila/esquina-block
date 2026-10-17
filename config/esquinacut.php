<?php

/*
| Textos SEO de Esquina Cut. Marca: "Esquina Cut". Keywords: plantillas,
| plantillas imprimibles, contornos de corte, etc. Las FAQ alimentan la
| sección visible y el JSON-LD FAQPage; deben coincidir siempre.
*/

return [

    'title' => 'Esquina Cut — Genera plantillas imprimibles con contornos de corte',

    'description' => 'Crea plantillas imprimibles en PDF con tus imágenes organizadas en grid y contornos de corte. Gratis, en español y sin subir tus imágenes a ningún servidor.',

    'keywords' => 'plantillas imprimibles, generar plantillas pdf, contornos de corte, hojas para recortar, plantillas gratis, dividir imágenes en pdf',

    'og_title' => 'Esquina Cut — Genera plantillas imprimibles gratis',

    'og_description' => 'Sube tus imágenes, elige el grid y añade contornos de corte. Descarga un PDF listo para imprimir.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_label' => 'Esquina Block',

    'sibling_qr_url' => 'https://esquinaweb.com/esquinaqr/',

    'sibling_qr_label' => 'EsquinaQR — generador de códigos QR personalizados',

    'privacy_url' => 'https://esquinaweb.com/politica-de-privacidad/',

    'cookies_url' => 'https://esquinaweb.com/politica-de-cookies/',

    /*
    | Mismo publisher y mismos bloques que Esquina Block (mismo .env).
    | El script habilita también los anuncios automáticos del dominio.
    */
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

    /*
    | Límite real de la herramienta (useCutImages). Las FAQ y el copy SEO
    | deben coincidir con este número.
    */
    'max_images' => 60,

    'faqs' => [
        [
            'q' => '¿Es gratis Esquina Cut?',
            'a' => 'Sí, completamente gratis. No requiere registro ni subir tus imágenes a ningún servidor.',
        ],
        [
            'q' => '¿Puedo usar Esquina Cut sin conexión?',
            'a' => 'Una vez cargada la página, todo el procesamiento ocurre en tu navegador. Puedes desconectarte después de cargar la página.',
        ],
        [
            'q' => '¿Qué formatos de imagen acepta?',
            'a' => 'JPG, PNG y WebP. Máximo 60 imágenes por plantilla.',
        ],
        [
            'q' => '¿Puedo elegir el tamaño del papel?',
            'a' => 'Sí. Actualmente soporta A4 y Carta (Letter), en orientación vertical u horizontal.',
        ],
        [
            'q' => '¿Mis imágenes se suben a algún servidor?',
            'a' => 'No. Todo el procesamiento es local, en tu navegador. Tus imágenes nunca salen de tu dispositivo.',
        ],
    ],

];
