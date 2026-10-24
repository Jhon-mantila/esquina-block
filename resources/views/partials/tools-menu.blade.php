@php
    /**
     * Menú de herramientas EsquinaWeb.
     * @var string $current  block|cut|qr|img|pdf
     */
    $current = $current ?? 'block';

    $inlineToolIcon = static function (string $file, string $class): string {
        $path = public_path('images/tools/'.$file);
        if (! is_file($path)) {
            return '';
        }
        $svg = file_get_contents($path);
        $svg = preg_replace('/<\?xml[^>]*\?>/', '', $svg) ?? $svg;
        $svg = preg_replace('/<!--.*?-->/s', '', $svg) ?? $svg;
        $svg = preg_replace(
            '/<svg\b([^>]*)>/',
            '<svg$1 class="'.$class.'" aria-hidden="true" focusable="false">',
            $svg,
            1
        ) ?? $svg;

        return $svg;
    };

    // URLs relativas al host actual → en local navegan entre /esquina*/ y en prod a esquinaweb.com
    $origin = rtrim(request()->getSchemeAndHttpHost(), '/');

    $tools = [
        [
            'id' => 'block',
            'name' => 'Esquina Block',
            'hint' => 'Póster en hojas',
            'url' => $origin.'/esquinablock/',
            'file' => 'esquinablock.svg',
        ],
        [
            'id' => 'cut',
            'name' => 'Esquina Cut',
            'hint' => 'Plantillas de corte',
            'url' => $origin.'/esquinacut/',
            'file' => 'esquinacut.svg',
        ],
        [
            'id' => 'qr',
            'name' => 'Esquina QR',
            'hint' => 'Códigos QR',
            'url' => $origin.'/esquinaqr/',
            'file' => 'esquinaqr.svg',
        ],
        [
            'id' => 'img',
            'name' => 'Esquina Img',
            'hint' => 'Comprimir imágenes',
            'url' => $origin.'/esquinaimg/',
            'file' => 'esquinaimg.svg',
        ],
        [
            'id' => 'pdf',
            'name' => 'Esquina PDF',
            'hint' => 'Editar PDFs',
            'url' => $origin.'/esquinapdf/',
            'file' => 'esquinapdf.svg',
        ],
    ];

    $active = collect($tools)->firstWhere('id', $current) ?? $tools[0];
@endphp

<nav class="tools-menu relative z-[110]" aria-label="Herramientas EsquinaWeb" data-tools-menu>
    <button
        type="button"
        class="tools-menu__trigger flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 font-bold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-expanded="false"
        aria-haspopup="true"
        aria-controls="tools-menu-panel"
        id="tools-menu-trigger"
    >
        <span class="tools-menu__icon inline-grid h-8 w-8 shrink-0">
            {!! $inlineToolIcon($active['file'], 'h-full w-full block') !!}
        </span>
        <span>{{ $active['name'] }}</span>
        <svg class="tools-menu__chevron h-4 w-4 text-slate-400 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
        </svg>
    </button>

    <div
        id="tools-menu-panel"
        class="tools-menu__panel absolute left-0 z-[200] mt-2 w-72 origin-top-left rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/50"
        role="menu"
        aria-labelledby="tools-menu-trigger"
    >
        <p class="px-2 pb-1.5 pt-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">Herramientas</p>
        <ul class="space-y-0.5">
            @foreach ($tools as $tool)
                <li role="none">
                    <a
                        href="{{ $tool['url'] }}"
                        role="menuitem"
                        class="tools-menu__item flex items-center gap-3 rounded-lg px-2 py-2 {{ $tool['id'] === $current ? 'is-current' : '' }}"
                        @if ($tool['id'] === $current) aria-current="page" @endif
                        @if ($tool['id'] !== $current)
                            onclick="window.esquinaTrackCrossToolClick?.('{{ $current }}','{{ $tool['id'] }}')"
                        @endif
                    >
                        <span class="tools-menu__icon inline-grid h-10 w-10 shrink-0 transition-transform duration-150">
                            {!! $inlineToolIcon($tool['file'], 'h-full w-full block') !!}
                        </span>
                        <span class="min-w-0">
                            <span class="block text-sm font-semibold text-slate-900">{{ $tool['name'] }}</span>
                            <span class="block truncate text-xs text-slate-500">{{ $tool['hint'] }}</span>
                        </span>
                        @if ($tool['id'] === $current)
                            <span class="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">Aquí</span>
                        @endif
                    </a>
                </li>
            @endforeach
        </ul>
    </div>
</nav>

<style>
    .tools-menu__panel {
        z-index: 200;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-4px) scale(0.98);
        transition: opacity .15s ease, transform .15s ease, visibility .15s;
        pointer-events: none;
    }
    /* Puente invisibile para no cerrar al cruzar el hueco trigger → panel */
    .tools-menu__panel::before {
        content: '';
        position: absolute;
        top: -0.6rem;
        left: 0;
        right: 0;
        height: 0.6rem;
    }
    .tools-menu.is-open .tools-menu__panel,
    .tools-menu:hover .tools-menu__panel,
    .tools-menu:focus-within .tools-menu__panel {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        pointer-events: auto;
    }
    .tools-menu.is-open .tools-menu__chevron,
    .tools-menu:hover .tools-menu__chevron,
    .tools-menu:focus-within .tools-menu__chevron {
        transform: rotate(180deg);
    }
    .tools-menu__item {
        transition: background-color .12s ease, box-shadow .12s ease, transform .12s ease;
    }
    .tools-menu__item.is-current {
        background: #eff6ff;
        box-shadow: inset 0 0 0 1px #bfdbfe;
    }
    .tools-menu__item:hover,
    .tools-menu__item:focus-visible {
        background: #dbeafe;
        box-shadow: inset 0 0 0 1px #93c5fd;
        outline: none;
    }
    .tools-menu__item:hover .tools-menu__icon,
    .tools-menu__item:focus-visible .tools-menu__icon {
        transform: scale(1.06);
    }
    .tools-menu__item:hover .text-slate-900,
    .tools-menu__item:focus-visible .text-slate-900 {
        color: #1d4ed8;
    }
</style>

<script>
(() => {
    const nav = document.querySelector('[data-tools-menu]');
    if (!nav) return;
    const trigger = nav.querySelector('.tools-menu__trigger');
    if (!trigger) return;

    const setOpen = (open) => {
        nav.classList.toggle('is-open', open);
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(!nav.classList.contains('is-open'));
    });

    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });

    nav.addEventListener('mouseenter', () => trigger.setAttribute('aria-expanded', 'true'));
    nav.addEventListener('mouseleave', () => {
        if (!nav.classList.contains('is-open')) trigger.setAttribute('aria-expanded', 'false');
    });
})();
</script>
