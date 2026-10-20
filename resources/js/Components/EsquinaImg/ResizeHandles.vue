<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';

const props = defineProps({
    src: { type: String, required: true },
    naturalWidth: { type: Number, required: true },
    naturalHeight: { type: Number, required: true },
    width: { type: [Number, String], default: '' },
    height: { type: [Number, String], default: '' },
    keepAspect: { type: Boolean, default: true },
    maxDimension: { type: Number, default: 8192 },
    disabled: { type: Boolean, default: false },
    /** compact = lateral; spacious = columna principal */
    layout: { type: String, default: 'spacious' },
});

const emit = defineEmits(['update:width', 'update:height', 'update:keepAspect', 'dragging']);

const stageRef = ref(null);
const stageSize = reactive({ width: 0, height: 0 });

/** @type {import('vue').Ref<null | { handle: string, startX: number, startY: number, startW: number, startH: number, aspect: number }>} */
const drag = ref(null);

/** Margen para asas + etiqueta (px). */
const STAGE_PAD = 36;

const HANDLES = [
    { id: 'nw', cursor: 'nwse-resize', style: { left: '0%', top: '0%' } },
    { id: 'n', cursor: 'ns-resize', style: { left: '50%', top: '0%' } },
    { id: 'ne', cursor: 'nesw-resize', style: { left: '100%', top: '0%' } },
    { id: 'e', cursor: 'ew-resize', style: { left: '100%', top: '50%' } },
    { id: 'se', cursor: 'nwse-resize', style: { left: '100%', top: '100%' } },
    { id: 's', cursor: 'ns-resize', style: { left: '50%', top: '100%' } },
    { id: 'sw', cursor: 'nesw-resize', style: { left: '0%', top: '100%' } },
    { id: 'w', cursor: 'ew-resize', style: { left: '0%', top: '50%' } },
];

function clampDim(n) {
    return Math.min(props.maxDimension, Math.max(16, Math.round(n)));
}

function parseDim(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return clampDim(n);
}

const targetPx = computed(() => ({
    width: parseDim(props.width, props.naturalWidth),
    height: parseDim(props.height, props.naturalHeight),
}));

/**
 * Escala fija según el tamaño ORIGINAL encajado en el escenario.
 * Así al reducir se ve el marco más pequeño (como en Word), y al ampliar crece.
 */
const pxScale = computed(() => {
    const availW = Math.max(40, stageSize.width - STAGE_PAD * 2);
    const availH = Math.max(40, stageSize.height - STAGE_PAD * 2);
    const iw = props.naturalWidth || 1;
    const ih = props.naturalHeight || 1;
    if (!availW || !availH) return 1;
    // Si el objetivo es más grande que el original, también debe caber.
    const refW = Math.max(iw, targetPx.value.width);
    const refH = Math.max(ih, targetPx.value.height);
    return Math.min(availW / refW, availH / refH);
});

const originBox = computed(() => {
    const scale = pxScale.value;
    const w = (props.naturalWidth || 1) * scale;
    const h = (props.naturalHeight || 1) * scale;
    return {
        left: (stageSize.width - w) / 2,
        top: (stageSize.height - h) / 2,
        width: w,
        height: h,
    };
});

const frameStyle = computed(() => {
    const scale = pxScale.value;
    const tw = Math.max(64, targetPx.value.width * scale);
    const th = Math.max(64, targetPx.value.height * scale);
    // Centrado en el escenario (más claro que anclar a una esquina).
    return {
        left: `${(stageSize.width - tw) / 2}px`,
        top: `${(stageSize.height - th) / 2}px`,
        width: `${tw}px`,
        height: `${th}px`,
    };
});

const originGhostStyle = computed(() => ({
    left: `${originBox.value.left}px`,
    top: `${originBox.value.top}px`,
    width: `${originBox.value.width}px`,
    height: `${originBox.value.height}px`,
}));

/** ASCII "x" — el signo × a veces no se ve (tofu / glifo roto). */
const dimLabel = computed(() => `${targetPx.value.width} x ${targetPx.value.height} px`);
const isSpacious = computed(() => props.layout !== 'compact');
const showOriginGhost = computed(() => {
    const t = targetPx.value;
    return t.width !== props.naturalWidth || t.height !== props.naturalHeight;
});

function measureStage() {
    const el = stageRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    stageSize.width = rect.width;
    stageSize.height = rect.height;
}

let resizeObserver = null;

onMounted(async () => {
    await nextTick();
    measureStage();
    if (typeof ResizeObserver !== 'undefined' && stageRef.value) {
        resizeObserver = new ResizeObserver(() => measureStage());
        resizeObserver.observe(stageRef.value);
    } else {
        window.addEventListener('resize', measureStage);
    }
});

onBeforeUnmount(() => {
    endDrag();
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    } else {
        window.removeEventListener('resize', measureStage);
    }
});

watch(
    () => [props.src, props.naturalWidth, props.naturalHeight, props.layout],
    async () => {
        await nextTick();
        measureStage();
    },
);

function applySize(nextW, nextH) {
    emit('update:width', String(clampDim(nextW)));
    emit('update:height', String(clampDim(nextH)));
}

/**
 * @param {PointerEvent} event
 * @param {string} handle
 */
function onHandleDown(event, handle) {
    if (props.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const el = event.currentTarget;
    if (el instanceof Element) {
        el.setPointerCapture?.(event.pointerId);
    }
    drag.value = {
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startW: targetPx.value.width,
        startH: targetPx.value.height,
        // Proporción actual del marco (si desbloqueaste, distorsionaste y volviste a candar).
        aspect: targetPx.value.width / Math.max(1, targetPx.value.height),
    };
    emit('dragging', true);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(event) {
    const state = drag.value;
    if (!state) return;
    const scale = pxScale.value || 1;
    const dx = (event.clientX - state.startX) / scale;
    const dy = (event.clientY - state.startY) / scale;
    const h = state.handle;

    let w = state.startW;
    let ht = state.startH;

    const isEdgeN = h === 'n';
    const isEdgeS = h === 's';
    const isEdgeE = h === 'e';
    const isEdgeW = h === 'w';
    const east = h.includes('e');
    const west = h.includes('w');
    const south = h.includes('s');
    const north = h.includes('n');

    if (east || isEdgeE) w = state.startW + dx;
    if (west || isEdgeW) w = state.startW - dx;
    if (south || isEdgeS) ht = state.startH + dy;
    if (north || isEdgeN) ht = state.startH - dy;

    if (props.keepAspect) {
        const aspect = state.aspect;
        const corner = h.length === 2;
        if (corner) {
            const candW = clampDim(w);
            const fromW = { width: candW, height: clampDim(candW / aspect) };
            const candH = clampDim(ht);
            const fromH = { width: clampDim(candH * aspect), height: candH };
            const pickW = Math.abs(candW - state.startW) >= Math.abs(candH - state.startH);
            w = pickW ? fromW.width : fromH.width;
            ht = pickW ? fromW.height : fromH.height;
        } else if (isEdgeE || isEdgeW) {
            w = clampDim(w);
            ht = clampDim(w / aspect);
        } else {
            ht = clampDim(ht);
            w = clampDim(ht * aspect);
        }
    }

    applySize(w, ht);
}

function endDrag() {
    if (!drag.value) return;
    drag.value = null;
    emit('dragging', false);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
}

function onPointerUp() {
    endDrag();
}

function resetToOriginal() {
    if (props.disabled) return;
    emit('update:width', '');
    emit('update:height', '');
}

function toggleLock() {
    if (props.disabled) return;
    emit('update:keepAspect', !props.keepAspect);
}
</script>

<template>
    <div
        class="rounded-2xl border border-slate-200 bg-white"
        :class="isSpacious ? 'p-4 sm:p-5' : 'p-3'"
    >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-900">Ajusta el tamaño</p>
                <p class="text-xs text-slate-500">
                    <template v-if="keepAspect">
                        Candado puesto: redimensiona de forma uniforme (como en GIMP).
                    </template>
                    <template v-else>
                        Candado abierto: puedes estirar ancho y alto por separado.
                    </template>
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-40"
                    :class="keepAspect
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'"
                    :disabled="disabled"
                    :aria-pressed="keepAspect"
                    :title="keepAspect ? 'Proporción bloqueada (clic para liberar)' : 'Proporción libre (clic para bloquear)'"
                    @click="toggleLock"
                >
                    <!-- Candado cerrado / abierto -->
                    <svg
                        v-if="keepAspect"
                        class="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V7a4.5 4.5 0 1 0-9 0v3.5M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                    </svg>
                    <svg
                        v-else
                        class="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V7a4.5 4.5 0 0 0-8.66-1.7M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                    </svg>
                    {{ keepAspect ? 'Proporción fija' : 'Libre' }}
                </button>
                <span
                    class="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold tabular-nums text-blue-900"
                >
                    {{ dimLabel }}
                </span>
                <button
                    type="button"
                    class="text-sm font-medium text-blue-700 hover:underline disabled:opacity-40"
                    :disabled="disabled"
                    @click="resetToOriginal"
                >
                    Tamaño original
                </button>
            </div>
        </div>

        <div
            ref="stageRef"
            class="relative select-none overflow-visible rounded-xl bg-slate-100 ring-1 ring-slate-200"
            :class="[
                disabled ? 'pointer-events-none opacity-60' : '',
                isSpacious
                    ? 'min-h-[340px] h-[min(56vh,520px)] sm:min-h-[400px]'
                    : 'aspect-square',
            ]"
        >
            <div
                class="pointer-events-none absolute inset-4 rounded-lg opacity-70"
                style="
                    background-image:
                        linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
                        linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
                        linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
                    background-size: 16px 16px;
                    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
                "
            />

            <!-- Fantasma del tamaño original -->
            <div
                v-if="showOriginGhost"
                class="pointer-events-none absolute border border-dashed border-slate-400/80"
                :style="originGhostStyle"
            >
                <span
                    class="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                >
                    Original {{ naturalWidth }} x {{ naturalHeight }}
                </span>
            </div>

            <!-- Marco activo (la imagen es el objeto, como en Word) -->
            <div
                class="absolute box-border border-[3px] border-blue-600 bg-white shadow-lg"
                :class="drag ? 'border-blue-700' : ''"
                :style="frameStyle"
            >
                <img
                    :src="src"
                    alt="Redimensionar"
                    class="pointer-events-none h-full w-full object-fill"
                    draggable="false"
                    @load="measureStage"
                />

                <div
                    class="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[110%] whitespace-nowrap rounded-md bg-blue-700 px-3 py-1.5 font-mono text-sm font-bold tabular-nums tracking-wide text-white shadow-lg ring-2 ring-white"
                >
                    {{ dimLabel }}
                </div>

                <button
                    v-for="handle in HANDLES"
                    :key="handle.id"
                    type="button"
                    class="absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none"
                    :style="{ ...handle.style, cursor: handle.cursor }"
                    :aria-label="`Asa ${handle.id}: ${dimLabel}`"
                    :disabled="disabled"
                    @pointerdown="onHandleDown($event, handle.id)"
                >
                    <!-- Zona táctil ~44×44; asa visible grande -->
                    <span class="flex h-12 w-12 items-center justify-center">
                        <span
                            class="block rounded-md border-[3px] border-blue-700 bg-white shadow-md transition"
                            :class="[
                                isSpacious ? 'h-6 w-6' : 'h-5 w-5',
                                drag?.handle === handle.id ? 'scale-110 bg-blue-100' : '',
                            ]"
                        />
                    </span>
                </button>
            </div>
        </div>

        <p class="mt-3 text-xs leading-relaxed text-slate-500">
            El candado funciona como en GIMP: cerrado = escala uniforme; abierto = mueves cada lado a gusto.
            También puedes escribir el tamaño exacto en el lateral.
        </p>
    </div>
</template>
