<?php

/*
| Datos SEO de Esquina Upscale. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'Esquina Upscale — Ampliar imágenes con IA en el navegador',

    'description' => 'Aumenta la resolución de tus fotos JPG, PNG o WebP con superresolución neuronal en el navegador. Sin subir archivos al servidor. Gratis y en español.',

    'keywords' => 'ampliar imagen, aumentar resolución foto, superresolución, upscale imagen online, mejorar calidad foto, ampliar jpg png',

    'og_title' => 'Esquina Upscale — Ampliar imágenes con IA',

    'og_description' => 'Amplía fotos 4× en tu navegador. Sin subir archivos. Gratis.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_bg_url' => 'https://esquinaweb.com/esquinabg/',

    'sibling_img_url' => 'https://esquinaweb.com/esquinaimg/',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

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
            'q' => '¿Es gratis Esquina Upscale?',
            'a' => 'Sí, completamente gratis. No requiere registro ni pagar por descargas.',
        ],
        [
            'q' => '¿Mis imágenes se suben a un servidor?',
            'a' => 'No. El proceso ocurre solo en tu navegador. Tus fotos no salen de tu dispositivo.',
        ],
        [
            'q' => '¿Qué formatos acepta?',
            'a' => 'Puedes subir JPG, PNG o WebP. El resultado se descarga en PNG o JPEG.',
        ],
        [
            'q' => '¿Cuánto aumenta la imagen?',
            'a' => 'Los modelos amplían 4 veces el ancho y 4 veces el alto. No es un estirado convencional: una red neuronal reconstruye el detalle.',
        ],
        [
            'q' => '¿Qué calidad debo elegir?',
            'a' => 'Ligero es el modo por defecto y el más rápido. Si quieres más detalle, ábrelo en Opciones avanzadas: Alta calidad tarda varios minutos.',
        ],
        [
            'q' => '¿Por qué una opción aparece deshabilitada?',
            'a' => 'Para no saturar la memoria. Si el equipo no da para Alta calidad, verás “Requiere un PC más potente”. Ligero sigue disponible.',
        ],
    ],

];
