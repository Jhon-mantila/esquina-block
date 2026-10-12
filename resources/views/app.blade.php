@php
    $seo = config('esquinablock');
    $canonical = rtrim(config('app.url'), '/').'/';
    $ogImage = $canonical.$seo['og_image'];

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebApplication',
                'name' => 'Esquina Block',
                'url' => $canonical,
                'description' => $seo['description'],
                'applicationCategory' => 'DesignApplication',
                'operatingSystem' => 'Web',
                'browserRequirements' => 'Requiere JavaScript y un navegador moderno.',
                'inLanguage' => 'es',
                'isAccessibleForFree' => true,
                'image' => $ogImage,
                'offers' => ['@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'USD'],
                'featureList' => [
                    'Divide una imagen en hasta 10 × 10 hojas',
                    'Papel A4 y Carta, vertical u horizontal',
                    'Márgenes, solapamiento y marcas de corte',
                    'Descarga en PDF sin marca de agua',
                    'Procesamiento local: la imagen no se sube a ningún servidor',
                ],
                'publisher' => ['@type' => 'Organization', 'name' => 'EsquinaWeb', 'url' => 'https://esquinaweb.com'],
            ],
            [
                '@type' => 'FAQPage',
                'mainEntity' => array_map(fn ($faq) => [
                    '@type' => 'Question',
                    'name' => $faq['q'],
                    'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq['a']],
                ], $seo['faqs']),
            ],
        ],
    ];

    $sizes = collect([2, 3, 4, 5, 6])->map(fn ($n) => [
        'grid' => "{$n} × {$n}",
        'sheets' => $n * $n,
        // Hoja A4 vertical con margen de 5 mm (área útil 200 × 287 mm) y solapamiento de 5 mm.
        'size' => str_replace('.', ',', round(($n * 195 + 5) / 10, 1)).' × '.str_replace('.', ',', round(($n * 282 + 5) / 10, 1)).' cm',
    ]);
@endphp
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ $seo['title'] }}</title>
        <meta name="description" content="{{ $seo['description'] }}">
        <meta name="robots" content="index, follow, max-image-preview:large">
        <link rel="canonical" href="{{ $canonical }}">
        <meta name="theme-color" content="#2563eb">
        <link rel="icon" href="{{ asset('favicon.svg') }}" type="image/svg+xml">

        <meta property="og:type" content="website">
        <meta property="og:locale" content="es_ES">
        <meta property="og:site_name" content="EsquinaWeb">
        <meta property="og:title" content="{{ $seo['title'] }}">
        <meta property="og:description" content="{{ $seo['description'] }}">
        <meta property="og:url" content="{{ $canonical }}">
        <meta property="og:image" content="{{ $ogImage }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">

        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>

        @if (config('esquinablock.adsense.enabled'))
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ config('esquinablock.adsense.client') }}" crossorigin="anonymous"></script>
        @endif

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <a href="{{ $canonical }}" class="flex items-center gap-2 font-bold text-slate-900">
                    <span class="grid h-8 w-8 grid-cols-2 gap-0.5 rounded-md bg-blue-600 p-1.5" aria-hidden="true">
                        <span class="rounded-[2px] bg-white/90"></span><span class="rounded-[2px] bg-white/60"></span>
                        <span class="rounded-[2px] bg-white/60"></span><span class="rounded-[2px] bg-white/90"></span>
                    </span>
                    Esquina Block
                </a>
                <a href="https://esquinaweb.com" class="text-sm text-slate-500 hover:text-blue-700">esquinaweb.com</a>
            </div>
        </header>

        <main>
            <section class="mx-auto max-w-2xl px-4 pt-8 text-center sm:pt-12">
                <h1 class="text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
                    Divide tu imagen en hojas para imprimir un póster gigante
                </h1>
                <p class="mt-3 text-pretty text-slate-600">
                    Convierte cualquier foto en un <strong>block poster</strong>: elige en cuántas hojas A4 o Carta dividirla, revisa cómo queda y descarga un PDF listo para imprimir. Gratis, sin registro y sin subir tu imagen a ningún servidor.
                </p>
            </section>

            <div class="mt-8 min-h-[600px]">
                @inertia
                <noscript>
                    <p class="mx-auto max-w-2xl rounded-lg bg-amber-50 p-4 text-center text-amber-900">
                        Esquina Block necesita JavaScript para procesar tu imagen dentro del navegador. Actívalo para usar la herramienta.
                    </p>
                </noscript>
            </div>

            @include('partials.ad', ['position' => 'after_tool', 'class' => 'mt-14'])

            <div class="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:py-20">
                <section id="como-funciona" aria-labelledby="como-funciona-titulo">
                    <h2 id="como-funciona-titulo" class="text-2xl font-bold text-slate-900">Cómo hacer un póster con hojas A4 en 3 pasos</h2>
                    <ol class="mt-6 grid gap-4 sm:grid-cols-3">
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">1</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Sube tu imagen</h3>
                            <p class="mt-1 text-sm text-slate-600">Arrastra una foto JPG, PNG o WebP de hasta 20 MB. Se procesa en tu navegador, no en internet.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">2</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Elige las hojas</h3>
                            <p class="mt-1 text-sm text-slate-600">Ajusta columnas, filas, papel y márgenes. Verás al instante cómo se divide y cuánto medirá tu póster.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">3</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Descarga el PDF</h3>
                            <p class="mt-1 text-sm text-slate-600">Cada trozo va en una página numerada, con marcas de corte, lista para imprimir en casa.</p>
                        </li>
                    </ol>
                </section>

                <section id="armar-poster" aria-labelledby="armar-poster-titulo">
                    <h2 id="armar-poster-titulo" class="text-2xl font-bold text-slate-900">Cómo imprimir y armar tu póster</h2>
                    <ol class="mt-6 list-decimal space-y-3 pl-5 text-slate-700 marker:font-semibold marker:text-blue-700">
                        <li><strong>Imprime a escala 100 %.</strong> En el diálogo de impresión elige «Tamaño real» y desactiva «Ajustar a página»; si no, las piezas no encajarán.</li>
                        <li><strong>Ordena las hojas.</strong> Cada página lleva su número y su posición (fila y columna) en el margen inferior. Colócalas sobre una mesa como en la previsualización.</li>
                        <li><strong>Recorta los márgenes.</strong> Corta por las marcas grises de las esquinas. Una regla metálica y un cúter dan bordes más limpios que las tijeras.</li>
                        <li><strong>Une las hojas.</strong> Si usaste solapamiento, monta cada hoja sobre la anterior hasta que su borde coincida con la guía azul discontinua y la imagen quede alineada.</li>
                        <li><strong>Pega y cuelga.</strong> Usa pegamento en barra o cinta adhesiva por detrás. Para un póster más resistente, pégalo sobre una cartulina o un cartón pluma.</li>
                    </ol>
                    <p class="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                        <strong>Consejo:</strong> trabaja fila por fila. Une primero las hojas de cada fila y después pega las filas entre sí.
                    </p>
                </section>

                <section id="tamanos" aria-labelledby="tamanos-titulo">
                    <h2 id="tamanos-titulo" class="text-2xl font-bold text-slate-900">¿Qué tamaño tendrá mi póster?</h2>
                    <p class="mt-3 text-slate-700">
                        Tamaño máximo con hojas A4 en vertical, margen pequeño y 5 mm de solapamiento. La medida final depende de la proporción de tu imagen: la herramienta te la muestra exacta antes de descargar.
                    </p>
                    <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-600">
                                <tr>
                                    <th scope="col" class="px-4 py-3 font-semibold">Cuadrícula</th>
                                    <th scope="col" class="px-4 py-3 font-semibold">Hojas A4</th>
                                    <th scope="col" class="px-4 py-3 font-semibold">Tamaño máximo</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                @foreach ($sizes as $size)
                                    <tr>
                                        <td class="px-4 py-3">{{ $size['grid'] }}</td>
                                        <td class="px-4 py-3">{{ $size['sheets'] }}</td>
                                        <td class="px-4 py-3 font-medium text-slate-900">{{ $size['size'] }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </section>

                @include('partials.ad', ['position' => 'before_faq'])

                <section id="preguntas-frecuentes" aria-labelledby="faq-titulo">
                    <h2 id="faq-titulo" class="text-2xl font-bold text-slate-900">Preguntas frecuentes</h2>
                    <div class="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                        @foreach ($seo['faqs'] as $faq)
                            <details class="group p-5">
                                <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                                    {{ $faq['q'] }}
                                    <span class="inline-block shrink-0 text-xl leading-none text-blue-600 transition group-open:rotate-45" aria-hidden="true">+</span>
                                </summary>
                                <p class="mt-3 text-slate-700">{{ $faq['a'] }}</p>
                            </details>
                        @endforeach
                    </div>
                </section>
            </div>
        </main>

        <footer class="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
            <p>
                Esquina Block es una herramienta gratuita de <a href="https://esquinaweb.com" class="text-blue-700 hover:underline">esquinaweb.com</a>.
                Tus imágenes nunca salen de tu dispositivo.
            </p>
            <p class="mt-2">
                ¿Buscas otras opciones? Lee nuestra <a href="{{ $seo['review_url'] }}" class="text-blue-700 hover:underline">reseña de Block Posters</a>.
            </p>
            <p class="mt-2">
                <a href="{{ $seo['privacy_url'] }}" class="hover:text-blue-700 hover:underline">Política de privacidad</a>
                <span aria-hidden="true">·</span>
                <a href="{{ $seo['cookies_url'] }}" class="hover:text-blue-700 hover:underline">Política de cookies</a>
            </p>
        </footer>

        @include('partials.back-to-top')
        @include('partials.side-ads')
    </body>
</html>
