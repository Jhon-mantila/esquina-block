<?php

return [

    'title' => 'Esquina Blocks — Puzzle de bloques gratis online',

    'description' => 'Coloca bloques en un tablero 8×8, completa filas y columnas y suma puntos. Juego tipo Block Blast gratis, con temas oscuro y colorido. Sin registro.',

    'og_title' => 'Esquina Blocks — Puzzle de bloques gratis',

    'og_description' => 'Arrastra piezas al tablero, elimina líneas y bate tu récord. Tema oscuro o colorido.',

    'site_url' => 'https://esquinagamers.com',

    'canonical_path' => '/esquinablocks/',

    'tools_url' => 'https://esquinaweb.com',

    'sibling_2048_url' => 'https://esquinagamers.com/esquina2048/',

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
