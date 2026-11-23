<?php

/*
| Datos SEO de Esquina Eraser. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'Esquina Eraser — Quitar objetos de una foto en el navegador',

    'description' => 'Borra personas, objetos y textos de una foto con IA en tu navegador. Pinta la zona y descárgala en PNG. Sin subir la imagen al servidor.',

    'keywords' => 'quitar objeto de foto, borrar persona de imagen, eliminar texto de foto, borrador IA, inpainting online',

    'og_title' => 'Esquina Eraser — Quitar objetos de una foto',

    'og_description' => 'Pinta lo que quieres borrar. La foto no sale de tu navegador.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_bg_url' => 'https://esquinaweb.com/esquinabg/',

    'sibling_upscale_url' => 'https://esquinaweb.com/esquinaupscale/',

    'sibling_img_url' => 'https://esquinaweb.com/esquinaimg/',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

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
            'q' => '¿Es gratis Esquina Eraser?',
            'a' => 'Sí. No hace falta registrarse ni pagar para quitar un objeto y descargar el PNG.',
        ],
        [
            'q' => '¿La foto se sube a un servidor?',
            'a' => 'No. La imagen se procesa en tu navegador. Al servidor solo se pide el modelo de IA, la primera vez que lo usas.',
        ],
        [
            'q' => '¿Qué formatos acepta?',
            'a' => 'JPG, PNG o WebP. El resultado se descarga en PNG.',
        ],
        [
            'q' => '¿Recupera lo que había detrás del objeto?',
            'a' => 'No. El modelo inventa un relleno plausible a partir de lo que hay alrededor. El resto de la foto se queda en su resolución original.',
        ],
        [
            'q' => '¿Por qué tarda la primera vez?',
            'a' => 'Hay que descargar el modelo, unos 199 MB. Después queda guardado en el navegador y no se vuelve a bajar.',
        ],
        [
            'q' => '¿Funciona sin una tarjeta gráfica?',
            'a' => 'Sí. Si el navegador no puede usar la GPU, el mismo modelo se ejecuta en el procesador. Tarda más.',
        ],
    ],

];
