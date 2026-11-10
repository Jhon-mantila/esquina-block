@php
    $seo = config('esquinablocks');
    $adsense = $seo['adsense'] ?? [];
    $canonical = rtrim($seo['site_url'], '/').$seo['canonical_path'];
    $adsenseOn = ! empty($adsense['enabled']);
    $hasAnySlot = collect($adsense['slots'] ?? [])->filter()->isNotEmpty();
@endphp
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        <title inertia>{{ $seo['title'] }}</title>
        <meta name="description" content="{{ $seo['description'] }}">
        <meta name="robots" content="index, follow">
        <link rel="canonical" href="{{ $canonical }}">
        <meta name="theme-color" content="#070b16">

        <meta property="og:type" content="website">
        <meta property="og:locale" content="es_ES">
        <meta property="og:site_name" content="EsquinaGamers">
        <meta property="og:title" content="{{ $seo['og_title'] }}">
        <meta property="og:description" content="{{ $seo['og_description'] }}">
        <meta property="og:url" content="{{ $canonical }}">
        <meta name="twitter:card" content="summary">
        <meta name="twitter:title" content="{{ $seo['og_title'] }}">
        <meta name="twitter:description" content="{{ $seo['og_description'] }}">

        @include('partials.ga4', [
            'ga4Id' => config('services.ga4.gamers_measurement_id'),
        ])

        @if ($adsenseOn && $hasAnySlot)
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={{ $adsense['client'] }}" crossorigin="anonymous"></script>
        @endif

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-950 font-sans text-slate-100 antialiased">
        @inertia

        @include('partials.side-ads', [
            'adsense' => $adsense,
            'contentMaxRem' => 48,
        ])
    </body>
</html>
