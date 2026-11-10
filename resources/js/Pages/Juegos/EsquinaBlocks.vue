<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    trackBlocksGameOver,
    trackBlocksRestart,
    trackBlocksStart,
    trackBlocksThemeChange,
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
            game2048: 'https://esquinagamers.com/esquina2048/',
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

/** @typedef {'dark' | 'colorful'} GameTheme */

const STORAGE_THEME = 'esquinablocks.theme';
const STORAGE_BEST = 'esquinablocks.best';

const THEMES = [
    { id: /** @type {GameTheme} */ ('dark'), label: 'Oscuro', hint: 'Neón / gaming' },
    { id: /** @type {GameTheme} */ ('colorful'), label: 'Colorido', hint: 'Estilo Block Blast' },
];

const SIBLING_LINKS = computed(() => [
    { id: '2048', label: 'Esquina 2048', href: props.siblings.game2048 },
    { id: 'block', label: 'Esquina Block', href: props.siblings.block },
    { id: 'cut', label: 'Esquina Cut', href: props.siblings.cut },
    { id: 'qr', label: 'Esquina QR', href: props.siblings.qr },
    { id: 'img', label: 'Esquina Img', href: props.siblings.img },
    { id: 'pdf', label: 'Esquina PDF', href: props.siblings.pdf },
].filter((l) => !!l.href));

const gameHost = ref(/** @type {HTMLElement | null} */ (null));
/** @type {import('vue').Ref<import('phaser').Game | null>} */
const game = ref(null);
/** @type {null | (typeof import('./esquinablocks/gameEvents') & typeof import('./esquinablocks/createGame'))} */
let bridge = null;

/** @typedef {'playing' | 'over'} RoundStatus */

const theme = ref(/** @type {GameTheme} */ (readTheme()));
const score = ref(0);
const bestScore = ref(readBest());
const scoreGain = ref(0);
const phaserReady = ref(false);
const status = ref(/** @type {RoundStatus} */ ('playing'));
const isNewBest = ref(false);
const gameOverAdKey = ref(0);
const soundMuted = ref(readMuted());
let gainTimer = 0;
let belowBoardAdPushed = false;
let roundBestStart = 0;
let overSoundPlayed = false;
/** @type {null | typeof import('./esquinablocks/sfx')} */
let sfx = null;

const themeMeta = computed(() => THEMES.find((t) => t.id === theme.value) ?? THEMES[0]);
const isDark = computed(() => theme.value === 'dark');
const linkAccent = computed(() => (isDark.value ? 'text-cyan-300 hover:underline' : 'text-orange-700 hover:underline'));
const showBelowBoardAd = computed(
    () => props.adsense?.enabled && !!props.adsense?.slots?.belowBoard,
);
const showGameOverAd = computed(
    () => status.value === 'over' && props.adsense?.enabled && !!props.adsense?.slots?.gameOver,
);

function readTheme() {
    try {
        const v = localStorage.getItem(STORAGE_THEME);
        if (v === 'dark' || v === 'colorful') return v;
    } catch {
        /* ignore */
    }
    return 'dark';
}

function readBest() {
    try {
        const n = Number(localStorage.getItem(STORAGE_BEST));
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
        return 0;
    }
}

function writeBest(value) {
    try {
        localStorage.setItem(STORAGE_BEST, String(value));
    } catch {
        /* ignore */
    }
}

function writeTheme(value) {
    try {
        localStorage.setItem(STORAGE_THEME, value);
    } catch {
        /* ignore */
    }
}

function readMuted() {
    try {
        return localStorage.getItem('esquinablocks.muted') === '1';
    } catch {
        return false;
    }
}

async function ensureSfx() {
    if (!sfx) sfx = await import('./esquinablocks/sfx');
    return sfx;
}

function keepAudioAlive() {
    if (sfx) {
        sfx.unlockAudio();
        return;
    }
    ensureSfx().then((api) => api.unlockAudio()).catch(() => {});
}

/**
 * @param {number} next
 * @param {number} [gain=0]
 */
function applyScore(next, gain = 0) {
    score.value = Math.max(0, Number(next) || 0);
    if (gain > 0) {
        scoreGain.value = gain;
        window.clearTimeout(gainTimer);
        gainTimer = window.setTimeout(() => {
            scoreGain.value = 0;
        }, 700);
    }
    if (score.value > bestScore.value) {
        bestScore.value = score.value;
        writeBest(bestScore.value);
        if (score.value > roundBestStart) isNewBest.value = true;
    }
}

function beginRound() {
    isNewBest.value = false;
    roundBestStart = bestScore.value;
    status.value = 'playing';
}

/** @param {{ score?: number, gain?: number } | undefined} payload */
function onPhaserScore(payload) {
    const next = Number(payload?.score);
    const gain = Number(payload?.gain) || 0;
    if (Number.isFinite(next)) applyScore(next, gain);
}

/** @param {{ score?: number, theme?: string, over?: boolean, restored?: boolean } | undefined} payload */
function onPhaserReady(payload) {
    phaserReady.value = true;
    const next = Number(payload?.score);
    if (Number.isFinite(next)) applyScore(next, 0);
    status.value = payload?.over ? 'over' : 'playing';
    if (payload?.restored) {
        isNewBest.value = false;
        roundBestStart = bestScore.value;
    }
    if (payload?.over) {
        triggerGameOverSound();
    }
}

/** @param {{ lines?: number, gain?: number } | undefined} payload */
function onPhaserClear(payload) {
    const lines = Number(payload?.lines) || 0;
    keepAudioAlive();
    if (!sfx) {
        ensureSfx().then((api) => {
            if (lines > 0) api.playClear(lines);
            else api.playPlace();
        }).catch(() => {});
        return;
    }
    if (lines > 0) sfx.playClear(lines);
    else sfx.playPlace();
}

/** @param {{ score?: number } | undefined} payload */
function onPhaserGameOver(payload) {
    const next = Number(payload?.score);
    if (Number.isFinite(next)) applyScore(next, 0);
    status.value = 'over';
    gameOverAdKey.value += 1;
    trackBlocksGameOver(Number.isFinite(next) ? next : score.value, isNewBest.value);
    triggerGameOverSound();
}

function triggerGameOverSound() {
    if (overSoundPlayed || soundMuted.value) return;
    overSoundPlayed = true;
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

async function ensureBridge() {
    if (!bridge) {
        const [eventsMod, createMod] = await Promise.all([
            import('./esquinablocks/gameEvents'),
            import('./esquinablocks/createGame'),
        ]);
        bridge = { ...eventsMod, ...createMod };
        bridge.gameEvents.on(bridge.EVENTS.SCORE, onPhaserScore);
        bridge.gameEvents.on(bridge.EVENTS.READY, onPhaserReady);
        bridge.gameEvents.on(bridge.EVENTS.CLEAR, onPhaserClear);
        bridge.gameEvents.on(bridge.EVENTS.GAME_OVER, onPhaserGameOver);
    }
    return bridge;
}

async function mountGame() {
    if (!gameHost.value) return;
    destroyGame();
    try {
        const api = await ensureBridge();
        game.value = api.createGame(gameHost.value, {
            theme: theme.value,
        });
    } catch (err) {
        console.error('[EsquinaBlocks] no se pudo montar Phaser', err);
        phaserReady.value = false;
    }
}

function onThemeChange(/** @type {GameTheme} */ next) {
    if (theme.value === next) return;
    theme.value = next;
    writeTheme(next);
    trackBlocksThemeChange(next);
    bridge?.gameEvents.emit(bridge.EVENTS.SET_THEME, next);
}

function onRestart() {
    score.value = 0;
    scoreGain.value = 0;
    overSoundPlayed = false;
    beginRound();
    trackBlocksRestart();
    trackBlocksStart(theme.value);
    bridge?.gameEvents.emit(bridge.EVENTS.RESTART);
}

async function onToggleSound() {
    const api = await ensureSfx();
    const next = !soundMuted.value;
    soundMuted.value = next;
    api.setMuted(next);
    if (!next) {
        await api.unlockAudio();
        overSoundPlayed = false;
        api.playPlace();
    }
}

onMounted(async () => {
    bestScore.value = readBest();
    beginRound();
    trackBlocksStart(theme.value);
    await ensureSfx();
    await nextTick();
    await mountGame();
    requestAnimationFrame(() => {
        game.value?.scale?.refresh();
    });
    window.addEventListener('pointerdown', keepAudioAlive, { capture: true, passive: true });

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
    if (bridge) {
        bridge.gameEvents.off(bridge.EVENTS.SCORE, onPhaserScore);
        bridge.gameEvents.off(bridge.EVENTS.READY, onPhaserReady);
        bridge.gameEvents.off(bridge.EVENTS.CLEAR, onPhaserClear);
        bridge.gameEvents.off(bridge.EVENTS.GAME_OVER, onPhaserGameOver);
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
        /* ignore */
    }
});

defineExpose({ applyScore, onRestart, gameHost });
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
                    <h1 class="text-xl font-bold tracking-tight sm:text-2xl">Esquina Blocks</h1>
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
                Arrastra las piezas al tablero 8×8. Completa filas o columnas para eliminarlas y sumar puntos.
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
                v-if="status === 'over'"
                class="mb-4"
                role="status"
                aria-live="polite"
            >
                <div
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
                        ¡Nuevo récord!
                    </p>
                    <p v-else class="mt-3 text-sm opacity-90">
                        No cabe ninguna pieza. ¿Otra partida?
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

            <section class="mb-5" aria-labelledby="tema-titulo">
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

            <div
                id="game-container"
                ref="gameHost"
                class="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl shadow-lg ring-1 touch-none select-none"
                :class="isDark
                    ? 'bg-[#111827] ring-cyan-800/50'
                    : 'bg-[#ffe0c2] ring-orange-300'"
                style="aspect-ratio: 3 / 4; min-height: 22rem; touch-action: none; -webkit-user-select: none; user-select: none"
                role="application"
                :aria-label="`Tablero Esquina Blocks, tema ${themeMeta.label}`"
            >
                <p
                    v-if="!phaserReady"
                    class="absolute inset-0 z-10 grid place-items-center px-6 text-center text-sm"
                    :class="isDark ? 'text-slate-500' : 'text-orange-500'"
                >
                    Cargando tablero…
                </p>
            </div>

            <p class="mt-4 text-center text-xs" :class="isDark ? 'text-slate-500' : 'text-orange-800/60'">
                Tema {{ themeMeta.label }} · Partida y récord se guardan en este dispositivo
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
                Esquina Blocks es un juego gratuito de
                <a
                    :href="siteUrl"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                >esquinagamers.com</a>.
                La partida en curso y el récord se guardan solo en tu dispositivo.
            </p>
            <p class="mt-3">
                También prueba
                <a
                    :href="toolsUrl"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                >esquinaweb.com</a>
                y nuestros juegos en esquinagamers.com.
            </p>
            <p class="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <a
                    v-for="link in SIBLING_LINKS"
                    :key="link.id"
                    :href="link.href"
                    class="font-medium underline-offset-2"
                    :class="linkAccent"
                    @click="trackCrossToolClick('blocks', link.id)"
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
