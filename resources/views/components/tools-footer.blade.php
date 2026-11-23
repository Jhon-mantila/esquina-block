@props(['current' => 'block'])

@php
    $tools = \App\Support\EsquinaTools::listed();
@endphp

<footer class="border-t border-slate-200 bg-white" data-tools-footer>
    <div class="mx-auto max-w-6xl px-4 py-8">
        @isset($summary)
            <p class="mx-auto max-w-2xl text-center text-sm leading-6 text-slate-500">
                {{ $summary }}
            </p>
        @endisset

        <nav class="mt-6" aria-label="Otras herramientas">
            <ul class="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                @foreach ($tools as $tool)
                    <li>
                        @if ($tool['id'] === $current)
                            <div class="tools-footer__tile is-current" aria-current="page">
                                <span class="tools-footer__icon inline-grid h-10 w-10 shrink-0">
                                    {!! \App\Support\EsquinaTools::inlineIcon($tool['file'], 'h-full w-full block') !!}
                                </span>
                                <span class="min-w-0">
                                    <span class="block text-sm font-semibold text-slate-900">{{ $tool['name'] }}</span>
                                    <span class="mt-0.5 block text-xs text-slate-500">{{ $tool['hint'] }}</span>
                                    <span class="mt-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">Aquí</span>
                                </span>
                            </div>
                        @else
                            <a
                                href="{{ $tool['url'] }}"
                                class="tools-footer__tile"
                                onclick="window.esquinaTrackCrossToolClick?.('{{ $current }}','{{ $tool['id'] }}')"
                            >
                                <span class="tools-footer__icon inline-grid h-10 w-10 shrink-0">
                                    {!! \App\Support\EsquinaTools::inlineIcon($tool['file'], 'h-full w-full block') !!}
                                </span>
                                <span class="min-w-0">
                                    <span class="block text-sm font-semibold text-slate-900">{{ $tool['name'] }}</span>
                                    <span class="mt-0.5 block text-xs text-slate-500">{{ $tool['hint'] }}</span>
                                </span>
                            </a>
                        @endif
                    </li>
                @endforeach
            </ul>
        </nav>

        @isset($note)
            <p class="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-slate-500">
                {{ $note }}
            </p>
        @endisset

        <p class="mt-4 text-center text-sm text-slate-500">
            <a href="{{ config('esquina_tools.privacy_url') }}" class="hover:text-blue-700 hover:underline">Política de privacidad</a>
            <span aria-hidden="true"> · </span>
            <a href="{{ config('esquina_tools.cookies_url') }}" class="hover:text-blue-700 hover:underline">Política de cookies</a>
        </p>
    </div>
</footer>

<style>
    .tools-footer__tile {
        display: flex;
        height: 100%;
        align-items: flex-start;
        gap: 0.5rem;
        border-radius: 0.5rem;
        padding: 0.5rem;
        text-align: left;
        transition: background-color .12s ease, box-shadow .12s ease;
    }
    .tools-footer__tile.is-current {
        background: #eff6ff;
        box-shadow: inset 0 0 0 1px #bfdbfe;
    }
    a.tools-footer__tile:hover,
    a.tools-footer__tile:focus-visible {
        background: #dbeafe;
        box-shadow: inset 0 0 0 1px #93c5fd;
        outline: none;
    }
    a.tools-footer__tile:hover .tools-footer__icon,
    a.tools-footer__tile:focus-visible .tools-footer__icon {
        transform: scale(1.06);
    }
    .tools-footer__icon {
        transition: transform .12s ease;
    }
    @media (prefers-reduced-motion: reduce) {
        .tools-footer__tile,
        .tools-footer__icon {
            transition: none;
        }
        a.tools-footer__tile:hover .tools-footer__icon,
        a.tools-footer__tile:focus-visible .tools-footer__icon {
            transform: none;
        }
    }
</style>
