@php
    $ga4Id = config('services.ga4.measurement_id');
    $ga4Debug = (bool) config('services.ga4.debug');
    $ga4Ready = $ga4Id && $ga4Id !== 'G-XXXXXXXXXX';
@endphp

@if ($ga4Ready && (app()->environment('production') || $ga4Debug))
    <script async src="https://www.googletagmanager.com/gtag/js?id={{ $ga4Id }}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.__GA4_DEBUG__ = @json($ga4Debug);
        gtag('js', new Date());
        gtag('config', @json($ga4Id), {
            send_page_view: false,
            anonymize_ip: true,
            @if ($ga4Debug)
            debug_mode: true,
            @endif
        });
    </script>
@endif
