<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    track2048GameOver,
    track2048ModeChange,
    track2048Restart,
    track2048Start,
    track2048ThemeChange,
    track2048Win,
    trackCrossToolClick,
} from '@/analytics';

const props = defineProps({
    siteUrl: { type: String, default: 'https://esquinagamers.com' },
    toolsUrl: { type: String, default: 'https://esquinaweb.com' },
    privacyUrl: { type: String, default: 'https://esquinagamers.com/privacy-policy/' },
    cookiesUrl: { type: String, default: 'https://esquinagamers.com/politica-de-cookies/' },
    siblings: {
        type: Object,
        default: () => ({
            blocks: 'https://esquinagamers.com/esquinablocks/',
            block: 'https://esquinaweb.com/esquinablock/',
            cut: 'https://esquinaweb.com/esquinacut/',
            qr: 'https://esquinaweb.com/esquinaqr/',
            img: 'https://esquinaweb.com/esquinaimg/',
            pdf: 'https://esquinaweb.com/esquinapdf/',
        }),
    },
    adsense: {
        type: Object,
        default: () => ({
            enabled: false,
            client: 'ca-pub-1852556021136727',
            slots: {
                gameOver: null,
                belowBoard: null,
                sideLeft: null,
                sideRight: null,
            },
        }),
    },
});

/** @typedef {'classic' | 'large' | 'expert'} GameMode */
/** @typedef {'dark' | 'colorful'} GameTheme */
/** @typedef {'playing' | 'won' | 'over'} RoundStatus */

const MODES = [
    { id: 'classic', label: 'Clásico', size: 4, hint: '4 × 4' },
    { id: 'large', label: 'Grande', size: 5, hint: '5 × 5' },
    { id: 'expert', label: 'Experto', size: 6, hint: '6 × 6' },
];

const THEMES = [
    { id: 'dark', label: 'Oscuro', hint: 'Neón cian' },
    { id: 'colorful', label: 'Colorido', hint: 'Candy / Block Blast' },
];

const SIBLING_LINKS = computed(() => [
    { id: 'blocks', label: 'Esquina Blocks', href: props.siblings.blocks },
    { id: 'block', label: 'Esquina Block', href: props.siblings.block },
    { id: 'cut', label: 'Esquina Cut', href: props.siblings.cut },
    { id: 'qr', label: 'Esquina QR', href: props.siblings.qr },
    { id: 'img', label: 'Esquina Img', href: props.siblings.img },
    { id: 'pdf', label: 'Esquina PDF', href: props.siblings.pdf },
].filter((l) => !!l.href));

const gameHost = ref(null);
/** @type {import('vue').Ref<import('phaser').Game | null>} */
const game = ref(null);
/** @type {null | (typeof import('./esquina2048/gameEvents') & typeof import('./esquina2048/createGame'))} */
let bridge = null;

const mode = ref(/** @type {GameMode} */ (readPrefMode()));
const theme = ref(/** @type {GameTheme} */ (readPrefTheme()));
const score = ref(0);
const bestScore = ref(readBest(mode.value));
const scoreGain = ref(0);
const phaserReady = ref(false);
const status = ref(/** @type {RoundStatus} */ ('playing'));
const isNewBest = ref(false);
const roundBestStart = ref(bestScore.value);
const soundMuted = ref(readMuted());
let gainTimer = 0;
let overSoundPlayed = false;
/** @type {null | typeof import('./esquina2048/sfx')} */
let sfx = null;

const modeMeta = computed(() => MODES.find((m) => m.id === mode.value) ?? MODES[0]);
const themeMeta = computed(() => THEMES.find((t) => t.id === theme.value) ?? THEMES[0]);
const isDark = computed(() => theme.value === 'dark');
const linkAccent = computed(() => (isDark.value ? 'text-cyan-300 hover:underline' : 'text-orange-700 hover:underline'));
const showGameOverAd = computed(
    () =>
        status.value === 'over'
        && props.adsense?.enabled
        && !!props.adsense?.slots?.gameOver,
);
const showBelowBoardAd = computed(
    () => props.adsense?.enabled && !!props.adsense?.slots?.belowBoard,
);
const gameOverAdKey = ref(0);
let belowBoardAdPushed = false;

function bestKey(m) {
    return `esquina2048.best.${m}`;
}

function readBest(m) {
    try {
        const n = Number(localStorage.getItem(bestKey(m)));
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
        return 0;
    }
}

function writeBest(m, value) {
    try {
        localStorage.setItem(bestKey(m), String(value));
    } catch {
        /* ignore quota */
    }
}

function readPrefMode() {
    try {
        const v = localStorage.getItem('esquina2048.mode');
        if (v === 'classic' || v === 'large' || v === 'expert') return v;
    } catch {
        /* ignore */
    }
    return 'classic';
}

function readPrefTheme() {
    try {
        const v = localStorage.getItem('esquina2048.theme');
        if (v === 'dark' || v === 'colorful') return v;
    } catch {
        /* ignore */
    }
    return 'dark';
}

function writePref(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* ignore */
    }
}

function readMuted() {
    try {
        return localStorage.getItem('esquina2048.muted') === '1';
    } catch {
        return false;
    }
}

async function ensureSfx() {
    if (!sfx) {
        sfx = await import('./esquina2048/sfx');
    }
    return sfx;
}

function keepAudioAlive() {
    if (sfx) {
        sfx.unlockAudio();
        return;
    }
    ensureSfx().then((api) => api.unlockAudio()).catch(() => {});
}

function triggerGameOverSound() {
    if (overSoundPlayed || soundMuted.value) return;
    overSoundPlayed = true;
    if (sfx) {
        sfx.playGameOver();
        return;
    }
    ensureSfx()
        .then((api) => {
            api.unlockAudio();
            return api.playGameOver();
        })
        .catch(() => {});
}

function destroyGame() {
    if (game.value) {
        game.value.destroy(true);
        game.value = null;
    }
    phaserReady.value = false;
}

function beginRoundTracking() {
    isNewBest.value = false;
    roundBestStart.value = bestScore.value;
    overSoundPlayed = false;
}

function applyBest(nextScore) {
    if (nextScore > bestScore.value) {
        bestScore.value = nextScore;
        writeBest(mode.value, nextScore);
        if (nextScore > roundBestStart.value) {
            isNewBest.value = true;
        }
        bridge?.gameEvents.emit(bridge.EVENTS.BEST, {
            best: nextScore,
            mode: mode.value,
        });
    }
}

function flashGain(gained) {
    if (!gained || gained <= 0) return;
    scoreGain.value = gained;
    window.clearTimeout(gainTimer);
    gainTimer = window.setTimeout(() => {
        scoreGain.value = 0;
    }, 700);
}

/** @param {number | { score: number, gained?: number, won?: boolean, over?: boolean, winDismissed?: boolean }} payload */
function onPhaserScore(payload) {
    const nextScore = typeof payload === 'number' ? payload : Number(payload?.score) || 0;
    const gained = typeof payload === 'number' ? 0 : Number(payload?.gained) || 0;
    const over = typeof payload === 'object' && payload?.over === true;
    const won = typeof payload === 'object' && payload?.won === true;
    const winDismissed = typeof payload === 'object' && payload?.winDismissed === true;

    score.value = nextScore;
    applyBest(nextScore);
    flashGain(gained);

    if (over) {
        if (status.value !== 'over') {
            gameOverAdKey.value += 1;
        }
        status.value = 'over';
        triggerGameOverSound();
    } else if (won && !winDismissed && status.value !== 'over') {
        status.value = 'won';
    } else if (!over) {
        status.value = 'playing';
    }
}

function onPhaserWin() {
    if (status.value !== 'over') {
        status.value = 'won';
        track2048Win(mode.value, score.value);
    }
}

function onPhaserGameOver(payload) {
    const nextScore = Number(payload?.score);
    if (Number.isFinite(nextScore)) {
        score.value = nextScore;
        applyBest(nextScore);
    }
    gameOverAdKey.value += 1;
    status.value = 'over';
    triggerGameOverSound();
    track2048GameOver(mode.value, Number.isFinite(nextScore) ? nextScore : score.value, isNewBest.value);
}

/** @param {{ score?: number, won?: boolean, over?: boolean, winDismissed?: boolean, restored?: boolean } | undefined} payload */
function onPhaserReady(payload) {
    phaserReady.value = true;
    if (!payload || typeof payload !== 'object') return;

    const nextScore = Number(payload.score);
    if (Number.isFinite(nextScore)) {
        score.value = nextScore;
        applyBest(nextScore);
    }

    if (payload.over) status.value = 'over';
    else if (payload.won && !payload.winDismissed) status.value = 'won';
    else status.value = 'playing';

    // Al restaurar, no marcar "nuevo récord" solo por cargar la partida.
    if (payload.restored) {
        isNewBest.value = false;
        roundBestStart.value = bestScore.value;
    }
}

function onContinueAfterWin() {
    if (status.value !== 'won') return;
    status.value = 'playing';
    bridge?.gameEvents.emit(bridge.EVENTS.DISMISS_WIN);
}

async function ensureBridge() {
    if (!bridge) {
        const [eventsMod, createMod] = await Promise.all([
            import('./esquina2048/gameEvents'),
            import('./esquina2048/createGame'),
        ]);
        bridge = { ...eventsMod, ...createMod };
        bridge.gameEvents.on(bridge.EVENTS.SCORE, onPhaserScore);
        bridge.gameEvents.on(bridge.EVENTS.WIN, onPhaserWin);
        bridge.gameEvents.on(bridge.EVENTS.GAME_OVER, onPhaserGameOver);
        bridge.gameEvents.on(bridge.EVENTS.READY, onPhaserReady);
    }
    return bridge;
}

async function mountGame() {
    if (!gameHost.value) return;
    destroyGame();
    const api = await ensureBridge();
    game.value = api.createGame(gameHost.value, {
        mode: mode.value,
        theme: theme.value,
    });
}

function onModeChange(next) {
    if (mode.value === next) return;
    mode.value = next;
    writePref('esquina2048.mode', next);
    bestScore.value = readBest(next);
    score.value = 0;
    scoreGain.value = 0;
    status.value = 'playing';
    beginRoundTracking();
    track2048ModeChange(next);
    bridge?.gameEvents.emit(bridge.EVENTS.SET_MODE, next);
}

function onThemeChange(next) {
    if (theme.value === next) return;
    theme.value = next;
    writePref('esquina2048.theme', next);
    track2048ThemeChange(next);
    bridge?.gameEvents.emit(bridge.EVENTS.SET_THEME, next);
}

function onRestart() {
    score.value = 0;
    scoreGain.value = 0;
    status.value = 'playing';
    beginRoundTracking();
    track2048Restart(mode.value);
    bridge?.gameEvents.emit(bridge.EVENTS.RESTART);
}

async function onToggleSound() {
    const api = await ensureSfx();
    const next = !soundMuted.value;
    soundMuted.value = next;
    api.setMuted(next);
    if (!next) {
        await api.unlockAudio();
        // Prueba rápida al activar, para confirmar que se oye
        overSoundPlayed = false;
        api.playGameOver();
        overSoundPlayed = false;
    }
}

onMounted(async () => {
    beginRoundTracking();
    track2048Start(mode.value, theme.value);
    await ensureSfx();
    await nextTick();
    await mountGame();
    requestAnimationFrame(() => {
        game.value?.scale?.refresh();
    });
    window.addEventListener('pointerdown', keepAudioAlive, { capture: true, passive: true });
    window.addEventListener('keydown', keepAudioAlive, { capture: true });

    if (showBelowBoardAd.value && !belowBoardAdPushed) {
        belowBoardAdPushed = true;
        await nextTick();
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
            /* ignore */
        }
    }
});

onBeforeUnmount(() => {
    window.clearTimeout(gainTimer);
    window.removeEventListener('pointerdown', keepAudioAlive, true);
    window.removeEventListener('keydown', keepAudioAlive, true);
    if (bridge) {
        bridge.gameEvents.off(bridge.EVENTS.SCORE, onPhaserScore);
        bridge.gameEvents.off(bridge.EVENTS.WIN, onPhaserWin);
        bridge.gameEvents.off(bridge.EVENTS.GAME_OVER, onPhaserGameOver);
        bridge.gameEvents.off(bridge.EVENTS.READY, onPhaserReady);
    }
    destroyGame();
});

watch(isDark, async () => {
    await nextTick();
    game.value?.scale?.refresh();
});

watch(showGameOverAd, async (show) => {
    if (!show) return;
    await nextTick();
    try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
        /* AdSense puede fallar en local / blockers */
    }
});
</script>

<template>
    <div
        class="min-h-dvh"
        :class="isDark
            ? 'bg-[#070b16] text-slate-100'
            : 'bg-[#fff1e6] text-slate-900'"
    >
        <header
            class="border-b"
            :class="isDark
                ? 'border-cyan-900/50 bg-slate-950/80'
                : 'border-orange-200/90 bg-[#fff7ed]/90'"
        >
            <div class="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
                <div>
                    <p
                        class="text-[11px] font-semibold tracking-wide uppercase"
                        :class="isDark ? 'text-cyan-300' : 'text-orange-600'"
                    >
                        EsquinaGamers
                    </p>
                    <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Esquina 2048</h1>
                </div>
                <a
                    :href="siteUrl"
                    class="text-sm font-medium underline-offset-2 hover:underline"
                    :class="isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-orange-700'"
                >
                    esquinagamers.com
                </a>
            </div>
        </header>

        <main class="mx-auto max-w-3xl px-4 py-6 sm:py-8">
            <p class="mb-5 text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
                Une fichas iguales hasta llegar a 2048. En PC usa las flechas o WASD; en el móvil desliza el dedo sobre el tablero.
            </p>

            <div class="mb-4 grid grid-cols-[1fr_1fr_auto] items-stretch gap-3">
                <div
                    class="relative flex min-h-[5.5rem] flex-col items-center justify-center rounded-2xl px-4 py-3 text-center shadow-sm"
                    :class="isDark
                        ? 'bg-slate-900/90 ring-1 ring-cyan-800/60'
                        : 'bg-white ring-1 ring-orange-200'"
                >
                    <p class="text-[11px] font-semibold tracking-wide uppercase opacity-70">Puntos</p>
                    <p class="mt-0.5 text-2xl font-bold tabular-nums">{{ score }}</p>
                    <span
                        v-if="scoreGain > 0"
                        class="pointer-events-none absolute top-2 right-3 text-sm font-bold tabular-nums"
                        :class="isDark ? 'text-cyan-300' : 'text-orange-600'"
                        aria-hidden="true"
                    >
                        +{{ scoreGain }}
                    </span>
                </div>
                <div
                    class="relative flex min-h-[5.5rem] flex-col items-center justify-center rounded-2xl px-4 py-3 text-center shadow-sm"
                    :class="isDark
                        ? 'bg-slate-900/90 ring-1 ring-cyan-800/60'
                        : 'bg-white ring-1 ring-orange-200'"
                >
                    <p class="text-[11px] font-semibold tracking-wide uppercase opacity-70">Récord</p>
                    <p class="mt-0.5 text-2xl font-bold tabular-nums">{{ bestScore }}</p>
                    <span
                        v-if="isNewBest && status !== 'playing'"
                        class="absolute -top-2 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                        :class="isDark ? 'bg-cyan-400 text-slate-950' : 'bg-orange-500 text-white'"
                    >
                        Nuevo
                    </span>
                </div>
                <div class="flex w-[7.25rem] min-h-[5.5rem] flex-col gap-2 sm:w-32">
                    <button
                        type="button"
                        class="flex flex-1 items-center justify-center rounded-2xl px-2 text-sm font-semibold transition"
                        :class="isDark
                            ? 'bg-cyan-600 text-slate-950 hover:bg-cyan-500'
                            : 'bg-orange-500 text-white hover:bg-orange-600'"
                        @click="onRestart"
                    >
                        Reiniciar
                    </button>
                    <button
                        type="button"
                        class="flex flex-1 items-center justify-center rounded-2xl px-2 text-sm font-semibold transition ring-1"
                        :class="isDark
                            ? 'bg-slate-900 text-cyan-200 ring-cyan-800/60 hover:ring-cyan-500'
                            : 'bg-white text-orange-800 ring-orange-200 hover:ring-orange-400'"
                        :aria-pressed="soundMuted"
                        :aria-label="soundMuted ? 'Activar sonido' : 'Silenciar sonido'"
                        :title="soundMuted ? 'Sonido apagado' : 'Sonido encendido'"
                        @click="onToggleSound"
                    >
                        {{ soundMuted ? 'Sonido: off' : 'Sonido: on' }}
                    </button>
                </div>
            </div>

            <div
                v-if="status === 'won' || status === 'over'"
                class="mb-4"
                role="status"
                aria-live="polite"
            >
                <div
                    v-if="status === 'won'"
                    class="rounded-2xl px-4 py-4"
                    :class="isDark
                        ? 'bg-cyan-950/80 text-cyan-50 ring-1 ring-cyan-700/60'
                        : 'bg-amber-100 text-amber-950 ring-1 ring-amber-300'"
                >
                    <p class="text-base font-bold">¡Llegaste a 2048!</p>
                    <p class="mt-1 text-sm opacity-90">
                        Puedes seguir sumando para fichas más altas.
                        <span v-if="isNewBest"> También hay récord nuevo en este modo.</span>
                    </p>
                    <button
                        type="button"
                        class="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition"
                        :class="isDark
                            ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                            : 'bg-orange-500 text-white hover:bg-orange-600'"
                        @click="onContinueAfterWin"
                    >
                        Continuar jugando
                    </button>
                </div>

                <div
                    v-else
                    class="rounded-2xl px-4 py-4"
                    :class="isDark
                        ? 'bg-rose-950/80 text-rose-50 ring-1 ring-rose-700/50'
                        : 'bg-rose-100 text-rose-950 ring-1 ring-rose-300'"
                >
                    <p class="text-base font-bold">Fin de la partida</p>
                    <div class="mt-3 grid grid-cols-2 gap-3 text-center">
                        <div
                            class="rounded-xl px-3 py-2"
                            :class="isDark ? 'bg-black/25' : 'bg-white/70'"
                        >
                            <p class="text-[11px] font-semibold tracking-wide uppercase opacity-70">Puntos</p>
                            <p class="text-xl font-bold tabular-nums">{{ score }}</p>
                        </div>
                        <div
                            class="rounded-xl px-3 py-2"
                            :class="isDark ? 'bg-black/25' : 'bg-white/70'"
                        >
                            <p class="text-[11px] font-semibold tracking-wide uppercase opacity-70">Récord</p>
                            <p class="text-xl font-bold tabular-nums">{{ bestScore }}</p>
                        </div>
                    </div>
                    <p
                        v-if="isNewBest"
                        class="mt-3 text-sm font-semibold"
                        :class="isDark ? 'text-cyan-200' : 'text-orange-800'"
                    >
                        ¡Nuevo récord en modo {{ modeMeta.label }}!
                    </p>
                    <p v-else class="mt-3 text-sm opacity-90">
                        Buena ronda. ¿Otra partida?
                    </p>
                    <button
                        type="button"
                        class="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition"
                        :class="isDark
                            ? 'bg-cyan-400 text-slate-950 hover:bg-cyan-300'
                            : 'bg-orange-500 text-white hover:bg-orange-600'"
                        @click="onRestart"
                    >
                        Jugar de nuevo
                    </button>

                    <aside
                        v-if="showGameOverAd"
                        :key="gameOverAdKey"
                        class="mt-4"
                        aria-label="Publicidad"
                    >
                        <p
                            class="mb-1 text-center text-[11px] font-semibold tracking-wide uppercase"
                            :class="isDark ? 'text-rose-200/70' : 'text-rose-800/60'"
                        >
                            Publicidad
                        </p>
                        <ins
                            class="adsbygoogle block min-h-[100px] w-full"
                            style="display:block"
                            :data-ad-client="adsense.client"
                            :data-ad-slot="adsense.slots.gameOver"
                            data-ad-format="auto"
                            data-full-width-responsive="true"
                        />
                    </aside>
                </div>
            </div>

            <div class="mb-5 grid gap-4 sm:grid-cols-2 sm:items-start">
                <section aria-labelledby="modo-titulo">
                    <h2 id="modo-titulo" class="mb-2 text-sm font-semibold">Modo de juego</h2>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Elegir tamaño del tablero">
                        <button
                            v-for="m in MODES"
                            :key="m.id"
                            type="button"
                            class="rounded-xl px-3 py-2 text-left text-sm transition ring-1"
                            :class="mode === m.id
                                ? (isDark
                                    ? 'bg-cyan-600 text-slate-950 ring-cyan-300'
                                    : 'bg-orange-500 text-white ring-orange-400')
                                : (isDark
                                    ? 'bg-slate-900 text-slate-200 ring-slate-700 hover:ring-cyan-700'
                                    : 'bg-white text-slate-800 ring-orange-200 hover:ring-orange-400')"
                            :aria-pressed="mode === m.id"
                            @click="onModeChange(m.id)"
                        >
                            <span class="font-semibold">{{ m.label }}</span>
                            <span class="mt-0.5 block text-xs opacity-80">{{ m.hint }}</span>
                        </button>
                    </div>
                </section>

                <section aria-labelledby="tema-titulo">
                    <h2 id="tema-titulo" class="mb-2 text-sm font-semibold">Estilo visual</h2>
                    <div class="flex flex-wrap gap-2" role="group" aria-label="Elegir tema">
                        <button
                            v-for="t in THEMES"
                            :key="t.id"
                            type="button"
                            class="rounded-xl px-3 py-2 text-left text-sm transition ring-1"
                            :class="theme === t.id
                                ? (isDark
                                    ? 'bg-cyan-600 text-slate-950 ring-cyan-300'
                                    : 'bg-orange-500 text-white ring-orange-400')
                                : (isDark
                                    ? 'bg-slate-900 text-slate-200 ring-slate-700 hover:ring-cyan-700'
                                    : 'bg-white text-slate-800 ring-orange-200 hover:ring-orange-400')"
                            :aria-pressed="theme === t.id"
                            @click="onThemeChange(t.id)"
                        >
                            <span class="font-semibold">{{ t.label }}</span>
                            <span class="mt-0.5 block text-xs opacity-80">{{ t.hint }}</span>
                        </button>
                    </div>
                </section>
            </div>

            <div
                id="game-container"
                ref="gameHost"
                class="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-lg ring-1"
                :class="isDark
                    ? 'bg-[#111827] ring-cyan-800/50'
                    : 'bg-[#ffe0c2] ring-orange-300'"
                style="aspect-ratio: 1 / 1"
                role="application"
                :aria-label="`Tablero ${modeMeta.hint}, tema ${themeMeta.label}`"
            >
                <p
                    v-if="!phaserReady"
                    class="absolute inset-0 grid place-items-center text-sm"
                    :class="isDark ? 'text-slate-500' : 'text-orange-400'"
                >
                    Cargando tablero…
                </p>
            </div>

            <p class="mt-4 text-center text-xs" :class="isDark ? 'text-slate-500' : 'text-orange-800/60'">
                Modo {{ modeMeta.label }} · Tema {{ themeMeta.label }} · Partida y récord se guardan en este dispositivo
            </p>

            <aside
                v-if="showBelowBoardAd"
                class="mx-auto mt-8 w-full max-w-md"
                aria-label="Publicidad"
            >
                <p
                    class="mb-1 text-center text-[11px] font-semibold tracking-wide uppercase"
                    :class="isDark ? 'text-slate-500' : 'text-orange-800/50'"
                >
                    Publicidad
                </p>
                <ins
                    class="adsbygoogle block min-h-[100px] w-full"
                    style="display:block"
                    :data-ad-client="adsense.client"
                    :data-ad-slot="adsense.slots.belowBoard"
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                />
            </aside>
        </main>

        <footer
            class="mt-8 border-t px-4 py-8 text-center text-sm"
            :class="isDark ? 'border-cyan-950 text-slate-500' : 'border-orange-200 text-slate-500'"
        >
            <p>
                Esquina 2048 es un juego gratuito de
                <a
                    :href="siteUrl"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                >esquinagamers.com</a>.
                La partida en curso y el récord se guardan solo en tu dispositivo.
            </p>
            <p class="mt-3">
                También prueba las herramientas de
                <a
                    :href="toolsUrl"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                >esquinaweb.com</a>:
            </p>
            <p class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <a
                    v-for="link in SIBLING_LINKS"
                    :key="link.id"
                    :href="link.href"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                    @click="trackCrossToolClick('2048', link.id)"
                >{{ link.label }}</a>
            </p>
            <p class="mt-3">
                <a
                    :href="privacyUrl"
                    class="underline-offset-2 hover:underline"
                    :class="isDark ? 'hover:text-cyan-300' : 'hover:text-orange-700'"
                >Política de privacidad</a>
                <span aria-hidden="true"> · </span>
                <a
                    :href="cookiesUrl"
                    class="underline-offset-2 hover:underline"
                    :class="isDark ? 'hover:text-cyan-300' : 'hover:text-orange-700'"
                >Política de cookies</a>
            </p>
        </footer>
    </div>
</template>
