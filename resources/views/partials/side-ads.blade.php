@php
    $adsense = $adsense ?? (
        str_contains(request()->getBasePath(), 'esquinacut')
            ? config('esquinacut.adsense')
            : config('esquinablock.adsense')
    );
    $sideSlots = array_filter([
        'left' => $adsense['slots']['side_left'] ?? null,
        'right' => $adsense['slots']['side_right'] ?? null,
    ]);
@endphp

@if ($adsense['enabled'] && $sideSlots)
    {{--
        Anuncios verticales fijos en los huecos a ambos lados del contenido (max-w-6xl = 72rem).
        Se crean solo si hay sitio al cargar: un <ins> oculto haría fallar a AdSense
        y se quedaría con el push() de otro bloque. Si luego la ventana se estrecha,
        las clases min-[1536px]:block los ocultan para que no tapen la herramienta.
    --}}
    <script>
        (() => {
            // Con menos de 800 px de alto, el lateral derecho chocaría con el botón «Volver arriba».
            if (!matchMedia('(min-width: 1536px) and (min-height: 800px)').matches) return;

            const width = innerWidth >= 1800 ? 300 : 160;
            const slots = @json($sideSlots);

            for (const [side, slot] of Object.entries(slots)) {
                const aside = document.createElement('aside');
                aside.setAttribute('aria-label', 'Publicidad');
                aside.className = 'fixed top-20 z-10 hidden min-[1536px]:block';
                aside.style[side] = `calc((100vw - 72rem) / 4 - ${width / 2}px)`;
                aside.innerHTML = '<p class="mb-1 text-center text-[11px] uppercase tracking-wide text-slate-400">Publicidad</p>';

                const ins = document.createElement('ins');
                ins.className = 'adsbygoogle';
                ins.style.cssText = `display:inline-block;width:${width}px;height:600px`;
                ins.dataset.adClient = @json($adsense['client']);
                ins.dataset.adSlot = slot;

                aside.append(ins);
                document.body.append(aside);
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        })();
    </script>
@endif
