<?php

/*
| Catálogo único del menú y del footer de EsquinaWeb.
| Añadir una herramienta aquí la muestra en los dos. Los juegos de
| esquinagamers.com no van en esta lista.
*/

return [

    'privacy_url' => 'https://esquinaweb.com/politica-de-privacidad/',

    'cookies_url' => 'https://esquinaweb.com/politica-de-cookies/',

    'tools' => [
        [
            'id' => 'block',
            'name' => 'Esquina Block',
            'hint' => 'Póster en hojas',
            'path' => '/esquinablock/',
            'file' => 'esquinablock.svg',
        ],
        [
            'id' => 'cut',
            'name' => 'Esquina Cut',
            'hint' => 'Plantillas de corte',
            'path' => '/esquinacut/',
            'file' => 'esquinacut.svg',
        ],
        [
            'id' => 'qr',
            'name' => 'Esquina QR',
            'hint' => 'Códigos QR',
            'path' => '/esquinaqr/',
            'file' => 'esquinaqr.svg',
        ],
        [
            'id' => 'img',
            'name' => 'Esquina Img',
            'hint' => 'Comprimir imágenes',
            'path' => '/esquinaimg/',
            'file' => 'esquinaimg.svg',
        ],
        [
            'id' => 'pdf',
            'name' => 'Esquina PDF',
            'hint' => 'Editar PDFs',
            'path' => '/esquinapdf/',
            'file' => 'esquinapdf.svg',
        ],
        [
            'id' => 'bg',
            'name' => 'Esquina BG',
            'hint' => 'Quitar fondo',
            'path' => '/esquinabg/',
            'file' => 'esquinabg.svg',
        ],
        [
            'id' => 'upscale',
            'name' => 'Esquina Upscale',
            'hint' => 'Ampliar imágenes',
            'path' => '/esquinaupscale/',
            'file' => 'esquinaupscale.svg',
        ],
        [
            'id' => 'eraser',
            'name' => 'Esquina Eraser',
            'hint' => 'Quitar objetos',
            'path' => '/esquinaeraser/',
            'file' => 'esquinaeraser.svg',
        ],
    ],

];
