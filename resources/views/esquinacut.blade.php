@php
    $seo = config('esquinacut');
    $canonical = rtrim(str_replace('/esquinablock', '/esquinacut', config('app.url')), '/').'/';
    $ogImage = $canonical.$seo['og_image'];
    $maxImages = (int) ($seo['max_images'] ?? 60);

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'SoftwareApplication',
                'name' => 'Esquina Cut',
                'description' => 'Generador de plantillas imprimibles en PDF con contornos de corte configurables. Gratis, en español, sin registro.',
                'url' => $canonical,
                'applicationCategory' => 'DesignApplication',
                'operatingSystem' => 'Web',
                'offers' => [
                    '@type' => 'Offer',
                    'price' => '0',
                    'priceCurrency' => 'USD',
                ],
                'inLanguage' => 'es',
                'isAccessibleForFree' => true,
                'featureList' => [
                    "Hasta {$maxImages} imágenes en un PDF",
                    'Plantillas imprimibles con contornos de corte',
                    'Cuadrícula configurable (columnas y filas)',
                    'Papel A4 y Carta, vertical u horizontal',
                    'Procesamiento local: las imágenes no se suben a ningún servidor',
                ],
                'publisher' => [
                    '@type' => 'Organization',
                    'name' => 'EsquinaWeb',
                    'url' => 'https://esquinaweb.com',
                ],
            ],
            [
                '@type' => 'FAQPage',
                'mainEntity' => array_map(fn ($faq) => [
                    '@type' => 'Question',
                    'name' => $faq['q'],
                    'acceptedAnswer' => [
                        '@type' => 'Answer',
                        'text' => $faq['a'],
                    ],
                ], $seo['faqs']),
            ],
        ],
    ];
@endphp
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ $seo['title'] }}</title>
        <meta name="description" content="{{ $seo['description'] }}">
        <meta name="keywords" content="{{ $seo['keywords'] }}">
        <meta name="robots" content="index, follow, max-image-preview:large">
        <link rel="canonical" href="{{ $canonical }}">
        <meta name="theme-color" content="#2563eb">
        <link rel="icon" href="{{ asset('favicon.svg') }}" type="image/svg+xml">

        <meta property="og:type" content="website">
        <meta property="og:locale" content="es_ES">
        <meta property="og:site_name" content="EsquinaWeb">
        <meta property="og:title" content="{{ $seo['og_title'] }}">
        <meta property="og:description" content="{{ $seo['og_description'] }}">
        <meta property="og:url" content="{{ $canonical }}">
        <meta property="og:image" content="{{ $ogImage }}">
        <meta name="twitter:card" content="summary_large_image">

        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>

        @include('partials.ga4')

        @if (config('esquinacut.adsense.enabled'))
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ config('esquinacut.adsense.client') }}" crossorigin="anonymous"></script>
        @endif

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <a href="{{ $canonical }}" class="flex items-center gap-2 font-bold text-slate-900">
                    <span class="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white" aria-hidden="true">EC</span>
                    Esquina Cut
                </a>
                <a href="https://esquinaweb.com" class="text-sm text-slate-500 hover:text-blue-700">esquinaweb.com</a>
            </div>
        </header>

        <main>
            <section class="mx-auto max-w-2xl px-4 pt-8 text-center sm:pt-12">
                <h1 class="text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
                    Esquina Cut — Crea plantillas imprimibles con contornos de corte
                </h1>
                <p class="mt-3 text-pretty text-slate-600">
                    Esquina Cut es un generador de <strong>plantillas imprimibles</strong> en español:
                    sube tus imágenes, organízalas en un grid y añade <strong>contornos de corte</strong>
                    (rectángulo, círculo o silueta). Descarga un <strong>PDF</strong> listo para imprimir
                    y recortar en casa. Todo ocurre en tu navegador: <strong>gratis</strong>,
                    <strong>sin registro</strong> y sin subir tus fotos a ningún servidor.
                    Ideal para hojas para recortar, stickers y material didáctico.
                </p>
            </section>

            <div class="mt-8 min-h-[600px]">
                @inertia
                <noscript>
                    <p class="mx-auto max-w-2xl rounded-lg bg-amber-50 p-4 text-center text-amber-900">
                        Esquina Cut necesita JavaScript para procesar tus imágenes dentro del navegador. Actívalo para usar la herramienta.
                    </p>
                </noscript>
            </div>

            @include('partials.ad', ['position' => 'after_tool', 'class' => 'mt-14'])

            <div class="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:py-20">
                <section id="como-funciona" aria-labelledby="como-funciona-titulo">
                    <h2 id="como-funciona-titulo" class="text-2xl font-bold text-slate-900">Cómo funciona Esquina Cut</h2>
                    <ol class="mt-6 grid gap-4 sm:grid-cols-3">
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">1</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Sube tus imágenes</h3>
                            <p class="mt-1 text-sm text-slate-600">Hasta {{ $maxImages }} a la vez (JPG, PNG o WebP). Se quedan en tu navegador.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">2</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Elige el grid y los contornos</h3>
                            <p class="mt-1 text-sm text-slate-600">Columnas × filas y contornos de corte (rectángulo, círculo o silueta). La vista previa se actualiza al instante.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">3</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Descarga el PDF</h3>
                            <p class="mt-1 text-sm text-slate-600">Un PDF listo para imprimir y recortar. Imprime a escala 100&nbsp;%.</p>
                        </li>
                    </ol>
                </section>

                <section id="para-que-sirve" aria-labelledby="para-que-sirve-titulo">
                    <h2 id="para-que-sirve-titulo" class="text-2xl font-bold text-slate-900">¿Para qué sirve Esquina Cut?</h2>
                    <p class="mt-3 text-slate-700">
                        Con Esquina Cut generas plantillas imprimibles y hojas para recortar a partir de tus propias imágenes:
                    </p>
                    <ul class="mt-4 list-disc space-y-2 pl-5 text-slate-700">
                        <li>Plantillas para manualidades y scrapbooking</li>
                        <li>Hojas de stickers caseros</li>
                        <li>Material didáctico para docencia</li>
                        <li>Decoración de fiestas temáticas</li>
                        <li>Tarjetas y etiquetas personalizadas</li>
                    </ul>
                </section>

                <section id="imprimir-recortar" aria-labelledby="imprimir-recortar-titulo">
                    <h2 id="imprimir-recortar-titulo" class="text-2xl font-bold text-slate-900">Cómo imprimir y recortar tu plantilla</h2>
                    <ol class="mt-6 list-decimal space-y-3 pl-5 text-slate-700 marker:font-semibold marker:text-blue-700">
                        <li><strong>Imprime a escala 100&nbsp;%.</strong> En el diálogo de impresión elige «Tamaño real» y desactiva «Ajustar a página».</li>
                        <li><strong>Usa papel adecuado.</strong> Para stickers, papel adhesivo o cartulina fina; para fichas, papel normal o fotográfico.</li>
                        <li><strong>Recorta por la guía.</strong> Sigue el contorno de corte de cada imagen con tijeras o cúter.</li>
                        <li><strong>Deja la separación.</strong> Si activaste separación, tendrás un pequeño margen blanco alrededor de la figura.</li>
                    </ol>
                    <p class="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                        <strong>Consejo:</strong> para silueta usa PNG con fondo transparente. Si la imagen es opaca, la herramienta usa un rectángulo.
                    </p>
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
                Esquina Cut es un generador gratuito de plantillas imprimibles de
                <a href="https://esquinaweb.com" class="text-blue-700 hover:underline">esquinaweb.com</a>.
                Tus imágenes nunca salen de tu dispositivo.
            </p>
            <p class="mt-2">
                ¿Quieres un póster gigante en varias hojas?
                Prueba <a href="{{ $seo['sibling_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('cut','block')">{{ $seo['sibling_label'] }}</a>.
            </p>
            <p class="mt-2">
                ¿Necesitas un código QR con logo y colores?
                Prueba <a href="{{ $seo['sibling_qr_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('cut','qr')">{{ $seo['sibling_qr_label'] }}</a>.
            </p>
            <p class="mt-2">
                ¿Quieres comprimir o convertir imágenes?
                Prueba <a href="{{ $seo['sibling_img_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('cut','img')">{{ $seo['sibling_img_label'] }}</a>.
            </p>
            <p class="mt-2">
                ¿Necesitas unir o editar PDFs?
                Prueba <a href="{{ $seo['sibling_pdf_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('cut','pdf')">{{ $seo['sibling_pdf_label'] }}</a>.
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
