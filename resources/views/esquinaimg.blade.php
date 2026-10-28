@php
    $seo = config('esquinaimg');
    $canonical = rtrim(str_replace('/esquinablock', '/esquinaimg', config('app.url')), '/').'/';
    $ogImage = $canonical.$seo['og_image'];

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'SoftwareApplication',
                'name' => 'Esquina Img',
                'description' => 'Comprime, convierte y redimensiona imágenes (JPG, PNG, WebP, AVIF, JFIF) en el navegador. Gratis y sin subir archivos.',
                'url' => $canonical,
                'applicationCategory' => 'UtilitiesApplication',
                'operatingSystem' => 'Web',
                'offers' => [
                    '@type' => 'Offer',
                    'price' => '0',
                    'priceCurrency' => 'USD',
                ],
                'inLanguage' => 'es',
                'isAccessibleForFree' => true,
                'featureList' => [
                    'Comprimir imágenes JPG y WebP',
                    'Convertir entre JPG, PNG y WebP',
                    'Redimensionar imágenes con asas de tamaño',
                    'Descarga individual o ZIP',
                    'Procesamiento local: tus archivos no se envían al servidor',
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
            [
                '@type' => 'WebPage',
                'name' => $seo['og_title'],
                'description' => $seo['og_description'],
                'url' => $canonical,
                'inLanguage' => 'es',
                'isPartOf' => [
                    '@type' => 'WebSite',
                    'name' => 'EsquinaWeb',
                    'url' => 'https://esquinaweb.com',
                ],
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
        <link rel="icon" href="{{ asset('images/tools/esquinaimg.svg') }}" type="image/svg+xml">

        <meta property="og:type" content="website">
        <meta property="og:locale" content="es_ES">
        <meta property="og:site_name" content="EsquinaWeb">
        <meta property="og:title" content="{{ $seo['og_title'] }}">
        <meta property="og:description" content="{{ $seo['og_description'] }}">
        <meta property="og:url" content="{{ $canonical }}">
        <meta property="og:image" content="{{ $ogImage }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $seo['og_title'] }}">
        <meta name="twitter:description" content="{{ $seo['og_description'] }}">
        <meta name="twitter:image" content="{{ $ogImage }}">

        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>

        @include('partials.ga4')

        @if (config('esquinaimg.adsense.enabled'))
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ config('esquinaimg.adsense.client') }}" crossorigin="anonymous"></script>
        @endif

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased">
        <header class="relative z-[100] border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                @include('partials.tools-menu', ['current' => 'img'])
                <a href="https://esquinaweb.com" class="text-sm text-slate-500 hover:text-blue-700">esquinaweb.com</a>
            </div>
        </header>

        <main>
            <section class="mx-auto max-w-2xl px-4 pt-8 text-center sm:pt-12">
                <h1 class="text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
                    Esquina Img — Comprime y convierte imágenes gratis
                </h1>
                <p class="mt-3 text-pretty text-slate-600">
                    Comprime, convierte a WebP o JPG y redimensiona tus fotos.
                    Todo en tu navegador, <strong>sin subir archivos</strong> a ningún servidor.
                    Gratis y en español.
                </p>
            </section>

            <div class="mt-8 min-h-[400px]">
                @inertia
                <noscript>
                    <p class="mx-auto max-w-2xl rounded-lg bg-amber-50 p-4 text-center text-amber-900">
                        Esquina Img necesita JavaScript para procesar imágenes en tu navegador. Actívalo para usar la herramienta.
                    </p>
                </noscript>
            </div>

            @include('partials.ad', ['position' => 'after_tool', 'class' => 'mt-14'])

            <div class="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:py-20">
                <section id="como-funciona" aria-labelledby="como-funciona-titulo">
                    <h2 id="como-funciona-titulo" class="text-2xl font-bold text-slate-900">Cómo funciona Esquina Img</h2>
                    <ol class="mt-6 grid gap-4 sm:grid-cols-3">
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">1</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Sube tus imágenes</h3>
                            <p class="mt-1 text-sm text-slate-600">JPG, PNG, WebP, AVIF o JFIF. Hasta 40 archivos. El proceso no sale de tu dispositivo.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">2</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Ajusta y previsualiza</h3>
                            <p class="mt-1 text-sm text-slate-600">Formato, calidad, tamaño con asas (como en Word) y vista previa Antes/Después.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">3</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Descarga el resultado</h3>
                            <p class="mt-1 text-sm text-slate-600">Una a una o todas en un ZIP. Puedes restaurar el borrador si recargas la página.</p>
                        </li>
                    </ol>
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
                Esquina Img es una herramienta gratuita de
                <a href="https://esquinaweb.com" class="text-blue-700 hover:underline">esquinaweb.com</a>.
                Tus imágenes nunca salen de tu dispositivo.
            </p>
            <p class="mt-2">
                También prueba
                <a href="{{ $seo['sibling_pdf_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('img','pdf')">Esquina PDF</a>,
                <a href="{{ $seo['sibling_cut_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('img','cut')">Esquina Cut</a>,
                <a href="{{ $seo['sibling_block_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('img','block')">Esquina Block</a>
                y
                <a href="{{ $seo['sibling_qr_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('img','qr')">Esquina QR</a>.
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
