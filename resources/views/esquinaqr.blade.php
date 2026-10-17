@php
    $seo = config('esquinaqr');
    $canonical = rtrim(str_replace('/esquinablock', '/esquinaqr', config('app.url')), '/').'/';
    $ogImage = $canonical.$seo['og_image'];

    $schema = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'SoftwareApplication',
                'name' => 'EsquinaQR',
                'description' => 'Generador de códigos QR personalizados con colores, formas y logo. Wi-Fi, vCard, email y SMS. Gratis, en español, sin registro.',
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
                    'QR para URL, Wi-Fi, vCard, email y SMS',
                    'Colores, degradados, formas y logo central',
                    'Descarga en PNG y SVG',
                    'Procesamiento local: tus datos no se envían al servidor',
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

        @if (config('esquinaqr.adsense.enabled'))
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ config('esquinaqr.adsense.client') }}" crossorigin="anonymous"></script>
        @endif

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased">
        <header class="border-b border-slate-200 bg-white">
            <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <a href="{{ $canonical }}" class="flex items-center gap-2 font-bold text-slate-900">
                    <span class="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white" aria-hidden="true">QR</span>
                    EsquinaQR
                </a>
                <a href="https://esquinaweb.com" class="text-sm text-slate-500 hover:text-blue-700">esquinaweb.com</a>
            </div>
        </header>

        <main>
            <section class="mx-auto max-w-2xl px-4 pt-8 text-center sm:pt-12">
                <h1 class="text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
                    EsquinaQR — Generador de códigos QR personalizados gratis (Wi-Fi, vCard, URL)
                </h1>
                <p class="mt-3 text-pretty text-slate-600">
                    Crea códigos QR con <strong>formas</strong>, <strong>colores</strong> y tu
                    <strong>logo</strong>. Genera QR para Wi-Fi, contactos, emails y SMS.
                    Descarga en <strong>PNG</strong> o <strong>SVG</strong>.
                    100&nbsp;% <strong>gratis</strong>, sin registro y sin enviar tus datos a ningún servidor.
                </p>
            </section>

            <div class="mt-8 min-h-[600px]">
                @inertia
                <noscript>
                    <p class="mx-auto max-w-2xl rounded-lg bg-amber-50 p-4 text-center text-amber-900">
                        EsquinaQR necesita JavaScript para generar el código QR en tu navegador. Actívalo para usar la herramienta.
                    </p>
                </noscript>
            </div>

            @include('partials.ad', ['position' => 'after_tool', 'class' => 'mt-14'])

            <div class="mx-auto max-w-3xl space-y-14 px-4 py-14 sm:py-20">
                <section id="como-funciona" aria-labelledby="como-funciona-titulo">
                    <h2 id="como-funciona-titulo" class="text-2xl font-bold text-slate-900">Cómo funciona EsquinaQR</h2>
                    <ol class="mt-6 grid gap-4 sm:grid-cols-3">
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">1</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Elige el tipo de QR</h3>
                            <p class="mt-1 text-sm text-slate-600">URL, Wi-Fi, contacto, email o SMS. Completa los datos en el formulario.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">2</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Personaliza el diseño</h3>
                            <p class="mt-1 text-sm text-slate-600">Colores, forma, puntos, esquinas y logo. La vista previa se actualiza al instante.</p>
                        </li>
                        <li class="rounded-2xl border border-slate-200 bg-white p-5">
                            <span class="grid h-8 w-8 place-items-center rounded-full bg-blue-600 font-semibold text-white">3</span>
                            <h3 class="mt-3 font-semibold text-slate-900">Descarga PNG o SVG</h3>
                            <p class="mt-1 text-sm text-slate-600">Úsalo en web, impresión o material promocional. Sin caducidad.</p>
                        </li>
                    </ol>
                </section>

                <section id="para-que-sirve" aria-labelledby="para-que-sirve-titulo">
                    <h2 id="para-que-sirve-titulo" class="text-2xl font-bold text-slate-900">¿Para qué sirve EsquinaQR?</h2>
                    <p class="mt-3 text-slate-700">
                        EsquinaQR es un generador de códigos QR online en español, pensado para uso diario
                        en negocios, eventos y casa:
                    </p>
                    <ul class="mt-4 list-disc space-y-2 pl-5 text-slate-700">
                        <li>Compartir tu web, carta digital o enlace de pago con un QR con tu marca</li>
                        <li>QR de Wi-Fi para clientes, oficina o visitas en casa</li>
                        <li>Tarjeta de contacto (vCard / MECARD) para networking</li>
                        <li>Atajos a email o SMS con asunto y mensaje precargados</li>
                        <li>Material impreso: flyers, tarjetas, stickers y señalética</li>
                    </ul>
                </section>

                <section id="qr-wifi" aria-labelledby="qr-wifi-titulo">
                    <h2 id="qr-wifi-titulo" class="text-2xl font-bold text-slate-900">Cómo crear un QR para Wi-Fi</h2>
                    <ol class="mt-6 list-decimal space-y-3 pl-5 text-slate-700 marker:font-semibold marker:text-blue-700">
                        <li>Elige el tipo <strong>Wi-Fi</strong> en la herramienta.</li>
                        <li>Escribe el <strong>nombre de la red (SSID)</strong> y la <strong>contraseña</strong>.</li>
                        <li>Selecciona la seguridad (<strong>WPA/WPA2</strong>, WEP o sin contraseña).</li>
                        <li>Personaliza colores o logo si quieres y descarga en PNG o SVG.</li>
                    </ol>
                    <p class="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                        <strong>Consejo:</strong> imprime el SVG a buen tamaño y colócalo cerca del router o en la mesa.
                        Quien lo escanee se conectará sin teclear la clave.
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
                EsquinaQR es un generador gratuito de códigos QR de
                <a href="https://esquinaweb.com" class="text-blue-700 hover:underline">esquinaweb.com</a>.
                Tus datos nunca salen de tu dispositivo.
            </p>
            <p class="mt-2">
                También prueba
                <a href="{{ $seo['sibling_block_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('qr','block')">Esquina Block</a>
                y
                <a href="{{ $seo['sibling_cut_url'] }}" class="text-blue-700 hover:underline" onclick="window.esquinaTrackCrossToolClick?.('qr','cut')">Esquina Cut</a>.
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
