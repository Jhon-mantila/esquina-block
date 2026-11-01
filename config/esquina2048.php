<?php

return [

    'title' => 'Esquina 2048 — Juego 2048 gratis online',

    'description' => 'Juega al 2048 en el navegador: modos 4×4, 5×5 y 6×6, temas oscuro y colorido. Gratis, sin registro y con récord guardado en tu dispositivo.',

    'og_title' => 'Esquina 2048 — Juego 2048 gratis',

    'og_description' => 'Clásico, grande o experto. Teclado en PC y gestos en móvil. Elige tema oscuro o colorido.',

    'site_url' => 'https://esquinagamers.com',

    'canonical_path' => '/esquina2048/',

    'tools_url' => 'https://esquinaweb.com',

    'sibling_block_url' => 'https://esquinaweb.com/esquinablock/',

    'sibling_cut_url' => 'https://esquinaweb.com/esquinacut/',

    'sibling_qr_url' => 'https://esquinaweb.com/esquinaqr/',

    'sibling_img_url' => 'https://esquinaweb.com/esquinaimg/',

    'sibling_pdf_url' => 'https://esquinaweb.com/esquinapdf/',

    'privacy_url' => 'https://esquinagamers.com/privacy-policy/',

    'cookies_url' => 'https://esquinagamers.com/politica-de-cookies/',

    /*
    |--------------------------------------------------------------------------
    | Google AdSense (mismo ca-pub; slots "Esquina gamers" reutilizables)
    |--------------------------------------------------------------------------
    */
    'adsense' => [
        'enabled' => (bool) env('ADSENSE_ENABLED', env('APP_ENV') === 'production'),
        'client' => env('ADSENSE_CLIENT', 'ca-pub-1852556021136727'),
        'slots' => [
            'game_over' => env('ADSENSE_SLOT_GAMERS_GAME_OVER', env('ADSENSE_SLOT_2048_GAME_OVER')),
            'below_board' => env('ADSENSE_SLOT_GAMERS_BELOW_BOARD', env('ADSENSE_SLOT_2048_BELOW_BOARD')),
            'side_left' => env('ADSENSE_SLOT_GAMERS_SIDE_LEFT'),
            'side_right' => env('ADSENSE_SLOT_GAMERS_SIDE_RIGHT'),
        ],
    ],

];
