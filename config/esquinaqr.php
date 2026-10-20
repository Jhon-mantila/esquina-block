<?php

/*
| Datos SEO de EsquinaQR. Las FAQ alimentan la sección visible y el JSON-LD FAQPage.
*/

return [

    'title' => 'EsquinaQR — Generador de códigos QR personalizados gratis (Wi-Fi, vCard, URL)',

    'description' => 'Crea códigos QR con formas, colores y tu logo. Genera QR para Wi-Fi, contactos, emails y SMS. Descarga en PNG o SVG. 100% gratis y sin registro.',

    'keywords' => 'generador qr, codigo qr personalizado, qr wifi, qr vcard, qr con logo, qr gratis, descargar qr png svg, generador codigo qr online',

    'og_title' => 'EsquinaQR — Generador de códigos QR personalizados gratis',

    'og_description' => 'Crea códigos QR con colores, formas y tu logo. Wi-Fi, contacto, email y SMS. Descarga PNG o SVG.',

    'og_image' => 'images/og-esquina-block.jpg',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_cut_url' => 'https://esquinaweb.com/esquinacut/',

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
            'q' => '¿Es gratis EsquinaQR?',
            'a' => 'Sí, completamente gratis. No requiere registro ni pagar por descargas. Puedes crear tantos códigos QR como necesites.',
        ],
        [
            'q' => '¿Puedo usar mi logo?',
            'a' => 'Sí. Sube un PNG, SVG, JPG o WebP al centro del QR y ajusta tamaño, margen y radio de esquinas. Recomendamos corrección de errores Q o H para que se escanee bien con logo.',
        ],
        [
            'q' => '¿Cómo hago un QR para mi Wi-Fi?',
            'a' => 'Elige el tipo Wi-Fi, escribe el nombre de la red (SSID), la contraseña y el tipo de seguridad (WPA/WPA2, WEP o sin contraseña). Quien escanee el código podrá conectarse sin escribir la clave a mano.',
        ],
        [
            'q' => '¿Los QR caducan?',
            'a' => 'No. EsquinaQR genera códigos estáticos: los datos van dentro del propio QR. No usamos acortadores ni enlaces que expiren. Mientras la gente pueda escanearlo, seguirá funcionando.',
        ],
        [
            'q' => '¿Mis datos se envían a un servidor?',
            'a' => 'No. La generación y el diseño ocurren solo en tu navegador. Tus textos, contraseñas Wi-Fi, contactos y logos no se suben a EsquinaWeb.',
        ],
        [
            'q' => '¿En qué formato puedo descargar el QR?',
            'a' => 'Puedes descargar PNG en alta resolución (1024×1024), ideal para redes y presentaciones, o SVG vectorial, ideal para impresión y diseño.',
        ],
    ],

];
