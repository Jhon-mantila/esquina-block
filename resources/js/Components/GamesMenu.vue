<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getToolBase } from '@/Pages/EsquinaBG/toolBase';
import { trackCrossToolClick } from '@/analytics';

const props = defineProps({
    current: {
        type: String,
        required: true,
        validator: (v) => v === '2048' || v === 'blocks',
    },
    isDark: { type: Boolean, default: true },
});

const open = ref(false);
const rootEl = ref(/** @type {HTMLElement | null} */ (null));

const GAMES = [
    {
        id: '2048',
        name: 'Esquina 2048',
        hint: 'Une fichas hasta 2048',
        path: '/esquina2048/',
        file: 'esquina2048.svg',
    },
    {
        id: 'blocks',
        name: 'Esquina Blocks',
        hint: 'Puzzle de bloques 8×8',
        path: '/esquinablocks/',
        file: 'esquinablocks.svg',
    },
];

const origin = computed(() => {
    if (typeof window === 'undefined') return 'https://esquinagamers.com';
    return window.location.origin;
});

const games = computed(() => GAMES.map((g) => ({
    ...g,
    url: `${origin.value}${g.path}`,
})));

const active = computed(() => games.value.find((g) => g.id === props.current) ?? games.value[0]);

function iconUrl(file) {
    const base = getToolBase();
    return `${base}/images/games/${file}`;
}

function setOpen(next) {
    open.value = next;
}

function onTriggerClick(e) {
    e.preventDefault();
    setOpen(!open.value);
}

function onDocClick(e) {
    if (!rootEl.value?.contains(/** @type {Node} */ (e.target))) setOpen(false);
}

function onKeydown(e) {
    if (e.key === 'Escape') setOpen(false);
}

function onSelect(toId) {
    if (toId === props.current) return;
    trackCrossToolClick(props.current, toId);
}

onMounted(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
    <nav
        ref="rootEl"
        class="games-menu relative z-[110]"
        :class="{ 'is-open': open, 'is-dark': isDark }"
        aria-label="Juegos EsquinaGamers"
    >
        <button
            type="button"
            class="games-menu__trigger flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 font-bold transition focus:outline-none focus-visible:ring-2"
            :class="isDark
                ? 'text-slate-100 hover:bg-slate-800/80 focus-visible:ring-cyan-400'
                : 'text-slate-900 hover:bg-orange-100/80 focus-visible:ring-orange-400'"
            :aria-expanded="open"
            aria-haspopup="true"
            aria-controls="games-menu-panel"
            id="games-menu-trigger"
            @click="onTriggerClick"
        >
            <span class="games-menu__icon inline-grid h-8 w-8 shrink-0 overflow-hidden rounded-md">
                <img :src="iconUrl(active.file)" :alt="''" width="32" height="32" class="h-full w-full object-cover" decoding="async">
            </span>
            <span class="text-left leading-tight">
                <span
                    class="block text-[10px] font-semibold tracking-wide uppercase"
                    :class="isDark ? 'text-cyan-300/90' : 'text-orange-600'"
                >EsquinaGamers</span>
                <span class="block text-sm sm:text-base">{{ active.name }}</span>
            </span>
            <svg
                class="games-menu__chevron h-4 w-4 transition-transform duration-200"
                :class="isDark ? 'text-slate-500' : 'text-orange-400'"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
            >
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
        </button>

        <div
            id="games-menu-panel"
            class="games-menu__panel absolute left-0 z-[200] mt-2 w-72 origin-top-left rounded-xl border p-2 shadow-xl"
            :class="isDark
                ? 'border-cyan-900/60 bg-slate-950 shadow-black/40'
                : 'border-orange-200 bg-[#fff7ed] shadow-orange-200/50'"
            role="menu"
            aria-labelledby="games-menu-trigger"
        >
            <p
                class="px-2 pb-1.5 pt-1 text-[11px] font-semibold tracking-wide uppercase"
                :class="isDark ? 'text-slate-500' : 'text-orange-700/60'"
            >
                Juegos
            </p>
            <ul class="space-y-0.5">
                <li v-for="game in games" :key="game.id" role="none">
                    <a
                        :href="game.url"
                        role="menuitem"
                        class="games-menu__item flex items-center gap-3 rounded-lg px-2 py-2"
                        :class="[
                            game.id === current ? 'is-current' : '',
                            isDark ? 'is-dark-item' : 'is-light-item',
                        ]"
                        :aria-current="game.id === current ? 'page' : undefined"
                        @click="onSelect(game.id)"
                    >
                        <span class="games-menu__icon inline-grid h-10 w-10 shrink-0 overflow-hidden rounded-lg transition-transform duration-150">
                            <img :src="iconUrl(game.file)" alt="" width="40" height="40" class="h-full w-full object-cover" decoding="async">
                        </span>
                        <span class="min-w-0">
                            <span
                                class="block text-sm font-semibold"
                                :class="isDark ? 'text-slate-100' : 'text-slate-900'"
                            >{{ game.name }}</span>
                            <span
                                class="block truncate text-xs"
                                :class="isDark ? 'text-slate-400' : 'text-slate-500'"
                            >{{ game.hint }}</span>
                        </span>
                        <span
                            v-if="game.id === current"
                            class="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            :class="isDark ? 'bg-cyan-500 text-slate-950' : 'bg-orange-500 text-white'"
                        >Aquí</span>
                    </a>
                </li>
            </ul>
        </div>
    </nav>
</template>

<style scoped>
.games-menu__panel {
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
    pointer-events: none;
}
.games-menu__panel::before {
    content: '';
    position: absolute;
    top: -0.6rem;
    left: 0;
    right: 0;
    height: 0.6rem;
}
.games-menu.is-open .games-menu__panel,
.games-menu:hover .games-menu__panel,
.games-menu:focus-within .games-menu__panel {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}
.games-menu.is-open .games-menu__chevron,
.games-menu:hover .games-menu__chevron,
.games-menu:focus-within .games-menu__chevron {
    transform: rotate(180deg);
}
.games-menu__item {
    transition: background-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
}
.games-menu__item.is-dark-item.is-current {
    background: rgba(8, 51, 68, 0.85);
    box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.35);
}
.games-menu__item.is-light-item.is-current {
    background: #ffedd5;
    box-shadow: inset 0 0 0 1px #fdba74;
}
.games-menu__item.is-dark-item:hover,
.games-menu__item.is-dark-item:focus-visible {
    background: rgba(14, 116, 144, 0.35);
    box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.45);
    outline: none;
}
.games-menu__item.is-light-item:hover,
.games-menu__item.is-light-item:focus-visible {
    background: #fed7aa;
    box-shadow: inset 0 0 0 1px #fb923c;
    outline: none;
}
.games-menu__item:hover .games-menu__icon,
.games-menu__item:focus-visible .games-menu__icon {
    transform: scale(1.06);
}
</style>
