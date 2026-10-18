@php
    $adsense = $adsense ?? (
        str_contains(request()->getBasePath(), 'esquinacut')
            ? config('esquinacut.adsense')
            : (str_contains(request()->getBasePath(), 'esquinaqr')
                ? config('esquinaqr.adsense')
                : (str_contains(request()->getBasePath(), 'esquinapdf')
                    ? config('esquinapdf.adsense')
                    : config('esquinablock.adsense')))
    );
    $adSlot = $adsense['slots'][$position] ?? null;
@endphp

@if ($adsense['enabled'] && $adSlot)
    <aside class="mx-auto max-w-3xl px-4 {{ $class ?? '' }}" aria-label="Publicidad">
        <p class="mb-1 text-center text-[11px] uppercase tracking-wide text-slate-400">Publicidad</p>
        <ins class="adsbygoogle block min-h-[280px]"
             data-ad-client="{{ $adsense['client'] }}"
             data-ad-slot="{{ $adSlot }}"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </aside>
@endif
