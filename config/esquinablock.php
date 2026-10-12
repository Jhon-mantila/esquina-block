<?php

/*
| Textos SEO de la página. Las preguntas frecuentes alimentan a la vez la
| sección visible y el JSON-LD FAQPage, así que deben coincidir siempre.
*/

return [

    'title' => 'Esquina Block — Divide tu imagen en hojas para imprimir un póster',

    'description' => 'Divide tu imagen en hojas A4 o Carta y descarga gratis un PDF listo para imprimir tu póster gigante. Sin registro y sin subir tu foto a ningún servidor.',

    'og_image' => 'images/og-esquina-block.jpg',

    'review_url' => 'https://esquinaweb.com/block-posters-convierte-imagenes-en-carteles-gigantes/',

    'faqs' => [
        [
            'q' => '¿Esquina Block es gratis?',
            'a' => 'Sí. Es totalmente gratis, no necesitas registrarte y el PDF no lleva marca de agua.',
        ],
        [
            'q' => '¿Mi imagen se sube a algún servidor?',
            'a' => 'No. Todo el proceso (dividir la imagen y crear el PDF) ocurre dentro de tu navegador. Tu foto nunca sale de tu dispositivo y no guardamos ningún archivo.',
        ],
        [
            'q' => '¿Cómo imprimo una imagen grande en varias hojas?',
            'a' => 'Sube tu imagen, elige cuántas columnas y filas quieres, descarga el PDF e imprímelo a escala 100 %. Después recorta los márgenes por las marcas de corte y pega las hojas en orden siguiendo su número.',
        ],
        [
            'q' => '¿Qué tamaño tendrá mi póster?',
            'a' => 'Depende del número de hojas, del papel y de la proporción de tu imagen. La herramienta te muestra la medida exacta en centímetros antes de descargar. Como referencia, 3 × 3 hojas A4 dan un póster de hasta 59 × 85 cm y 4 × 4 hojas, de hasta 79 × 113 cm.',
        ],
        [
            'q' => '¿Qué resolución necesita mi imagen?',
            'a' => 'Para que no se vea pixelada conviene tener al menos 100 DPI, es decir, unos 40 píxeles por cada centímetro de póster. Por ejemplo, para un póster de 1 metro de ancho lo ideal es una imagen de 4000 píxeles de ancho o más. Esquina Block te avisa si la calidad será baja.',
        ],
        [
            'q' => '¿Por qué tengo que imprimir a escala 100 %?',
            'a' => 'Si la impresora usa «Ajustar a página», reduce cada hoja un poco y las piezas dejan de encajar. Elige «Tamaño real» o «Escala 100 %» en el diálogo de impresión.',
        ],
        [
            'q' => '¿Para qué sirve el solapamiento entre hojas?',
            'a' => 'Repite una franja de 5 o 10 mm de imagen en el borde de las hojas vecinas. Así puedes montar una hoja sobre otra, pegarlas con facilidad y evitar que quede una línea blanca entre ellas.',
        ],
        [
            'q' => '¿Funciona en el móvil?',
            'a' => 'Sí. Funciona en el navegador de cualquier móvil, tablet u ordenador. Puedes imprimir el PDF desde el propio móvil o enviarlo a tu ordenador.',
        ],
        [
            'q' => '¿Es una alternativa a Block Posters o Rasterbator?',
            'a' => 'Sí. Esquina Block hace lo mismo que estas herramientas, pero está en español, es gratuita y procesa la imagen sin subirla a internet.',
        ],
    ],

];
