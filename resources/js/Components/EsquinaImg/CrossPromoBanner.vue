<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { trackCrossToolClick } from '@/analytics';

/** Solo dura la pestaña (al recargar o procesar de nuevo puede volver). */
const SESSION_KEY = 'esquinaimg.crosspromo.dismissed.session';
const SHOW_DELAY_MS = 700;

const props = defineProps({
    pdfUrl: { type: String, default: 'https://esquinaweb.com/esquinapdf/' },
    cutUrl: { type: String, default: 'https://esquinaweb.com/esquinacut/' },
    blockUrl: { type: String, default: 'https://esquinaweb.com/esquinablock/' },
    qrUrl: { type: String, default: 'https://esquinaweb.com/esquinaqr/' },
    /** true cuando hay imágenes en el espacio de trabajo. */
    active: { type: Boolean, default: false },
    /** Se incrementa al terminar un proceso → reabre el aviso aunque lo hubieras cerrado. */
    nudge: { type: Number, default: 0 },
});

const open = ref(false);
let showTimer = null;

function clearLegacyDismiss() {
    try {
        localStorage.removeItem('esquinaimg.crosspromo.dismissed');
        localStorage.removeItem('esquinaimg.crosspromo.dismissed.v2');
    } catch {
        /* ignore */
    }
}

function isDismissed() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
        return false;
    }
}

function clearDismiss() {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        /* ignore */
    }
}

function syncVisibility() {
    if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
    }

    if (!props.active) {
        open.value = false;
        return;
    }

    if (isDismissed()) {
        open.value = false;
        return;
    }

    showTimer = setTimeout(() => {
        showTimer = null;
        if (props.active && !isDismissed()) {
            open.value = true;
        }
    }, SHOW_DELAY_MS);
}

onMounted(() => {
    clearLegacyDismiss();
    syncVisibility();
});

watch(() => props.active, syncVisibility);

watch(
    () => props.nudge,
    (n, prev) => {
        if (n > 0 && n !== prev) {
            clearDismiss();
            syncVisibility();
        }
    },
);

onBeforeUnmount(() => {
    if (showTimer) clearTimeout(showTimer);
});

function dismiss() {
    open.value = false;
    try {
        sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
        /* private mode */
    }
}

function go(toTool) {
    trackCrossToolClick('img', toTool);
}
</script>

<template>
    <Teleport to="body">
        <Transition name="cross-promo">
            <aside
                v-if="open"
                class="fixed bottom-4 left-1/2 z-[60] w-[min(100%-2rem,22rem)] -translate-x-1/2 overflow-hidden rounded-2xl border-2 border-amber-400 bg-slate-900 p-4 text-white shadow-2xl shadow-black/40 sm:bottom-6 sm:left-6 sm:translate-x-0"
                role="dialog"
                aria-labelledby="cross-promo-titulo"
                aria-describedby="cross-promo-desc"
            >
                <div
                    class="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/50 via-transparent to-amber-400/20"
                    aria-hidden="true"
                />

                <button
                    type="button"
                    class="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
                    aria-label="Cerrar aviso"
                    @click="dismiss"
                >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>

                <div class="relative">
                    <p class="inline-flex items-center rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">
                        Siguiente paso
                    </p>
                    <p id="cross-promo-titulo" class="mt-2 pr-8 text-base font-bold text-white">
                        ¿Y ahora qué?
                    </p>
                    <p id="cross-promo-desc" class="mt-1 text-xs leading-snug text-blue-100">
                        Tus imágenes están listas. Sigue con PDF o plantillas para imprimir.
                    </p>

                    <div class="mt-3 flex flex-col gap-2">
                        <a
                            :href="pdfUrl"
                            class="rounded-lg bg-amber-400 px-3 py-2.5 text-center text-sm font-bold text-slate-900 hover:bg-amber-300"
                            @click="go('pdf')"
                        >
                            Esquina PDF — imágenes a PDF
                        </a>
                        <a
                            :href="cutUrl"
                            class="rounded-lg border border-white/40 bg-white/15 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/25"
                            @click="go('cut')"
                        >
                            Esquina Cut — imprimir y cortar
                        </a>
                    </div>

                    <p class="mt-3 text-center text-[11px] text-blue-200">
                        <a
                            :href="blockUrl"
                            class="font-medium text-amber-300 hover:underline"
                            @click="go('block')"
                        >Block</a>
                        ·
                        <a
                            :href="qrUrl"
                            class="font-medium text-amber-300 hover:underline"
                            @click="go('qr')"
                        >QR</a>
                    </p>
                </div>
            </aside>
        </Transition>
    </Teleport>
</template>

<style scoped>
.cross-promo-enter-active,
.cross-promo-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}
.cross-promo-enter-from,
.cross-promo-leave-to {
    opacity: 0;
    transform: translateY(12px);
}
</style>
