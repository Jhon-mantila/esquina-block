@php
    $isGamersGame = str_contains(request()->getBasePath(), 'esquina2048')
        || str_contains(request()->getPathInfo(), '/esquina2048')
        || str_contains(request()->getBasePath(), 'esquinablocks')
        || str_contains(request()->getPathInfo(), '/esquinablocks');

    $adsense = $adsense ?? (
        str_contains(request()->getBasePath(), 'esquinablocks') || str_contains(request()->getPathInfo(), '/esquinablocks')
            ? config('esquinablocks.adsense')
            : (str_contains(request()->getBasePath(), 'esquina2048') || str_contains(request()->getPathInfo(), '/esquina2048')
                ? config('esquina2048.adsense')
                : (str_contains(request()->getBasePath(), 'esquinacut')
                    ? config('esquinacut.adsense')
                    : (str_contains(request()->getBasePath(), 'esquinaqr')
                        ? config('esquinaqr.adsense')
                        : (str_contains(request()->getBasePath(), 'esquinapdf')
                            ? config('esquinapdf.adsense')
                            : (str_contains(request()->getBasePath(), 'esquinaimg')
                                ? config('esquinaimg.adsense')
                                : (str_contains(request()->getBasePath(), 'esquinabg')
                                    ? config('esquinabg.adsense')
                                    : config('esquinablock.adsense')))))))
    );
    // max-w-6xl = 72rem (herramientas); max-w-3xl = 48rem (juegos EsquinaGamers)
    $contentMaxRem = $contentMaxRem ?? ($isGamersGame ? 48 : 72);
    $sideSlots = array_filter([
        'left' => $adsense['slots']['side_left'] ?? null,
        'right' => $adsense['slots']['side_right'] ?? null,
    ]);
@endphp

@if (($adsense['enabled'] ?? false) && $sideSlots)
    {{--
        Anuncios verticales fijos en los huecos a ambos lados del contenido.
        Se crean solo si hay sitio al cargar: un <ins> oculto haría fallar a AdSense
        y se quedaría con el push() de otro bloque. Si luego la ventana se estrecha,
        las clases min-[1536px]:block los ocultan para que no tapen el contenido.
    --}}
    <script>
        (() => {
            // Con menos de 800 px de alto, el lateral derecho chocaría con el botón «Volver arriba».
            if (!matchMedia('(min-width: 1536px) and (min-height: 800px)').matches) return;

            const width = innerWidth >= 1800 ? 300 : 160;
            const contentMaxRem = {{ (int) $contentMaxRem }};
            const slots = @json($sideSlots);

            for (const [side, slot] of Object.entries(slots)) {
                const aside = document.createElement('aside');
                aside.setAttribute('aria-label', 'Publicidad');
                aside.className = 'fixed top-20 z-10 hidden min-[1536px]:block';
                aside.style[side] = `calc((100vw - ${contentMaxRem}rem) / 4 - ${width / 2}px)`;
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
