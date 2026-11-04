<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
    /** URL del original (para recuperar zonas borradas del todo). */
    sourceUrl: { type: String, required: true },
    /** URL del PNG con transparencia (máscara inicial). */
    resultUrl: { type: String, required: true },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:blob']);

/** @typedef {'keep' | 'erase'} BrushMode */

const mode = ref(/** @type {BrushMode} */ ('keep'));
const brushSize = ref(28);
const ready = ref(false);
const painting = ref(false);
const cursorVisible = ref(false);
/** Posición del anillo en CSS px relativos al wrapper. */
const cursorCss = ref({ x: 0, y: 0, r: 14 });

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const zoom = ref(1);
/** Tamaño CSS base (1×) del canvas al caber en el stage. */
const baseDisplay = ref({ w: 0, h: 0 });

/** @type {import('vue').Ref<HTMLCanvasElement|null>} */
const viewRef = ref(null);
/** @type {import('vue').Ref<HTMLElement|null>} */
const stageRef = ref(null);

/** Lienzos de trabajo (no montados). */
let rgbCanvas = null;
let maskCanvas = null;
let viewCanvas = null;
let rgbCtx = null;
let maskCtx = null;
let viewCtx = null;
let imgW = 0;
let imgH = 0;

/** @type {ImageData[]} */
const undoStack = [];
const MAX_UNDO = 20;

const canUndo = computed(() => undoStack.length > 0);
const canZoomIn = computed(() => zoom.value < ZOOM_MAX - 1e-6);
const canZoomOut = computed(() => zoom.value > ZOOM_MIN + 1e-6);
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);

const canvasDisplayStyle = computed(() => {
    const w = baseDisplay.value.w * zoom.value;
    const h = baseDisplay.value.h * zoom.value;
    if (!w || !h) {
        return { maxWidth: '100%', maxHeight: '24rem', height: 'auto', width: 'auto' };
    }
    return {
        width: `${w}px`,
        height: `${h}px`,
        maxWidth: 'none',
        maxHeight: 'none',
    };
});

const ringClass = computed(() =>
    mode.value === 'keep'
        ? 'border-emerald-600 bg-emerald-400/25'
        : 'border-rose-600 bg-rose-400/25',
);

const checkerStyle = {
    backgroundImage:
        'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
    backgroundColor: '#f8fafc',
};

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen para retocar.'));
        img.src = url;
    });
}

function pushUndo() {
    if (!maskCtx || !imgW || !imgH) return;
    const snap = maskCtx.getImageData(0, 0, imgW, imgH);
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function redrawView() {
    if (!viewCtx || !rgbCanvas || !maskCanvas) return;
    viewCtx.clearRect(0, 0, imgW, imgH);
    viewCtx.drawImage(rgbCanvas, 0, 0);
    viewCtx.globalCompositeOperation = 'destination-in';
    viewCtx.drawImage(maskCanvas, 0, 0);
    viewCtx.globalCompositeOperation = 'source-over';
}

async function emitBlob() {
    if (!viewCanvas) return;
    const blob = await new Promise((resolve) => {
        viewCanvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (blob) emit('update:blob', blob);
}

/**
 * Calcula el tamaño CSS a 1× para que la imagen quepa en el stage.
 */
function updateBaseDisplay() {
    const stage = stageRef.value;
    if (!stage || !imgW || !imgH) return;
    const maxW = Math.max(1, stage.clientWidth);
    const maxH = 384; // ~max-h-96
    const fit = Math.min(1, maxW / imgW, maxH / imgH);
    baseDisplay.value = {
        w: Math.max(1, Math.round(imgW * fit)),
        h: Math.max(1, Math.round(imgH * fit)),
    };
}

/**
 * Escala CSS ↔ píxeles del canvas (incluye zoom vía tamaño CSS).
 * @returns {{ scaleX: number, scaleY: number, rect: DOMRect } | null}
 */
function canvasMetrics() {
    const canvas = viewRef.value;
    if (!canvas || !canvas.width || !canvas.height) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
        scaleX: canvas.width / rect.width,
        scaleY: canvas.height / rect.height,
        rect,
    };
}

/**
 * @param {number} next
 */
function setZoom(next) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
    zoom.value = clamped;
}

function zoomIn() {
    setZoom(zoom.value + ZOOM_STEP);
}

function zoomOut() {
    setZoom(zoom.value - ZOOM_STEP);
}

function resetZoom() {
    setZoom(1);
}

/**
 * Ctrl/Cmd + rueda para acercar/alejar hacia el cursor.
 * @param {WheelEvent} event
 */
function onWheel(event) {
    if (props.disabled || !ready.value) return;
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const stage = stageRef.value;
    if (!stage) return;

    const prevZoom = zoom.value;
    const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((prevZoom + delta) * 100) / 100));
    if (nextZoom === prevZoom) return;

    const rect = stage.getBoundingClientRect();
    const mx = event.clientX - rect.left + stage.scrollLeft;
    const my = event.clientY - rect.top + stage.scrollTop;
    const ratio = nextZoom / prevZoom;

    zoom.value = nextZoom;
    nextTick(() => {
        stage.scrollLeft = mx * ratio - (event.clientX - rect.left);
        stage.scrollTop = my * ratio - (event.clientY - rect.top);
    });
}

/**
 * @param {HTMLImageElement} sourceImg
 * @param {HTMLImageElement} resultImg
 */
function initBuffers(sourceImg, resultImg) {
    imgW = resultImg.naturalWidth || resultImg.width;
    imgH = resultImg.naturalHeight || resultImg.height;
    if (!imgW || !imgH) throw new Error('Dimensiones de resultado inválidas.');

    rgbCanvas = document.createElement('canvas');
    rgbCanvas.width = imgW;
    rgbCanvas.height = imgH;
    rgbCtx = rgbCanvas.getContext('2d', { willReadFrequently: true });

    maskCanvas = document.createElement('canvas');
    maskCanvas.width = imgW;
    maskCanvas.height = imgH;
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

    viewCanvas = viewRef.value;
    if (!viewCanvas || !rgbCtx || !maskCtx) throw new Error('No se pudo preparar el lienzo.');
    viewCanvas.width = imgW;
    viewCanvas.height = imgH;
    viewCtx = viewCanvas.getContext('2d', { willReadFrequently: true });
    if (!viewCtx) throw new Error('No se pudo preparar la vista.');

    rgbCtx.clearRect(0, 0, imgW, imgH);
    rgbCtx.drawImage(sourceImg, 0, 0, imgW, imgH);

    const tmp = document.createElement('canvas');
    tmp.width = imgW;
    tmp.height = imgH;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    if (!tctx) throw new Error('No se pudo leer la máscara.');
    tctx.clearRect(0, 0, imgW, imgH);
    tctx.drawImage(resultImg, 0, 0, imgW, imgH);
    const resultData = tctx.getImageData(0, 0, imgW, imgH);
    const maskData = maskCtx.createImageData(imgW, imgH);
    for (let i = 0; i < resultData.data.length; i += 4) {
        const a = resultData.data[i + 3];
        maskData.data[i] = 255;
        maskData.data[i + 1] = 255;
        maskData.data[i + 2] = 255;
        maskData.data[i + 3] = a;
    }
    maskCtx.putImageData(maskData, 0, 0);

    const colored = document.createElement('canvas');
    colored.width = imgW;
    colored.height = imgH;
    const cctx = colored.getContext('2d');
    if (cctx) {
        cctx.drawImage(resultImg, 0, 0, imgW, imgH);
        const cd = cctx.getImageData(0, 0, imgW, imgH);
        const od = rgbCtx.getImageData(0, 0, imgW, imgH);
        for (let i = 0; i < cd.data.length; i += 4) {
            if (cd.data[i + 3] < 8) {
                cd.data[i] = od.data[i];
                cd.data[i + 1] = od.data[i + 1];
                cd.data[i + 2] = od.data[i + 2];
                cd.data[i + 3] = 255;
            } else {
                cd.data[i + 3] = 255;
            }
        }
        rgbCtx.putImageData(cd, 0, 0);
    }

    undoStack.length = 0;
    zoom.value = 1;
    redrawView();
}

async function setupFromUrls() {
    ready.value = false;
    cursorVisible.value = false;
    if (!props.sourceUrl || !props.resultUrl || !viewRef.value) return;
    try {
        const [sourceImg, resultImg] = await Promise.all([
            loadImage(props.sourceUrl),
            loadImage(props.resultUrl),
        ]);
        initBuffers(sourceImg, resultImg);
        await nextTick();
        updateBaseDisplay();
        ready.value = true;
        requestAnimationFrame(() => updateBaseDisplay());
        await emitBlob();
    } catch (err) {
        ready.value = false;
        console.error(err);
    }
}

watch(
    () => [props.sourceUrl, props.resultUrl],
    async () => {
        await nextTick();
        await setupFromUrls();
    },
);

/** @type {(() => void) | null} */
let removeListeners = null;

onMounted(async () => {
    await nextTick();
    await setupFromUrls();
    const onResize = () => {
        updateBaseDisplay();
    };
    window.addEventListener('resize', onResize);
    // passive: false para poder bloquear el zoom de página con Ctrl + rueda
    const stage = stageRef.value;
    stage?.addEventListener('wheel', onWheel, { passive: false });
    removeListeners = () => {
        window.removeEventListener('resize', onResize);
        stage?.removeEventListener('wheel', onWheel);
    };
});

/**
 * @param {PointerEvent} event
 * @returns {{ x: number, y: number } | null} coordenadas en píxeles del canvas
 */
function canvasPoint(event) {
    const m = canvasMetrics();
    if (!m) return null;
    return {
        x: (event.clientX - m.rect.left) * m.scaleX,
        y: (event.clientY - m.rect.top) * m.scaleY,
    };
}

/**
 * Actualiza el anillo visual del pincel.
 * Mismas coords CSS que stamp (rect del canvas), para que el clic coincida.
 * @param {PointerEvent} event
 */
function updateCursorRing(event) {
    const m = canvasMetrics();
    if (!m) {
        cursorVisible.value = false;
        return;
    }
    const x = event.clientX - m.rect.left;
    const y = event.clientY - m.rect.top;
    const rCss = (brushSize.value / 2) / ((m.scaleX + m.scaleY) / 2);
    cursorCss.value = { x, y, r: Math.max(6, rCss) };
    cursorVisible.value = true;
}

/**
 * @param {number} x
 * @param {number} y
 */
function stamp(x, y) {
    if (!maskCtx || props.disabled || !ready.value) return;
    const r = Math.max(1, brushSize.value / 2);
    maskCtx.save();
    maskCtx.beginPath();
    maskCtx.arc(x, y, r, 0, Math.PI * 2);
    maskCtx.closePath();
    if (mode.value === 'keep') {
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = '#ffffff';
        maskCtx.fill();
    } else {
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.fillStyle = '#000000';
        maskCtx.fill();
    }
    maskCtx.restore();
    redrawView();
}

/** @param {PointerEvent} event */
function onPointerDown(event) {
    if (props.disabled || !ready.value) return;
    event.preventDefault();
    viewRef.value?.setPointerCapture?.(event.pointerId);
    pushUndo();
    painting.value = true;
    updateCursorRing(event);
    const pt = canvasPoint(event);
    if (pt) stamp(pt.x, pt.y);
}

/** @param {PointerEvent} event */
function onPointerMove(event) {
    if (props.disabled || !ready.value) return;
    updateCursorRing(event);
    if (!painting.value) return;
    event.preventDefault();
    const pt = canvasPoint(event);
    if (pt) stamp(pt.x, pt.y);
}

async function endStroke(event) {
    if (event?.type === 'pointerleave' && !painting.value) {
        cursorVisible.value = false;
        return;
    }
    if (!painting.value) return;
    painting.value = false;
    await emitBlob();
}

function onPointerEnter(event) {
    if (props.disabled || !ready.value) return;
    updateCursorRing(event);
}

function undo() {
    if (!maskCtx || !undoStack.length) return;
    const prev = undoStack.pop();
    maskCtx.putImageData(prev, 0, 0);
    redrawView();
    emitBlob();
}

async function resetMask() {
    undoStack.length = 0;
    await setupFromUrls();
}

onBeforeUnmount(() => {
    removeListeners?.();
    removeListeners = null;
    rgbCanvas = null;
    maskCanvas = null;
    viewCanvas = null;
    rgbCtx = null;
    maskCtx = null;
    viewCtx = null;
    undoStack.length = 0;
});
</script>

<template>
    <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
            <p class="mr-auto text-sm font-semibold text-slate-800">Retocar con pincel</p>
            <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                :class="mode === 'keep'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                :disabled="disabled || !ready"
                @click="mode = 'keep'"
            >
                Recuperar
            </button>
            <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
                :class="mode === 'erase'
                    ? 'bg-rose-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
                :disabled="disabled || !ready"
                @click="mode = 'erase'"
            >
                Borrar
            </button>
            <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                :disabled="disabled || !ready || !canUndo"
                @click="undo"
            >
                Deshacer
            </button>
            <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                :disabled="disabled || !ready"
                @click="resetMask"
            >
                Restablecer
            </button>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label class="flex min-w-[12rem] flex-1 items-center gap-3">
                <span class="shrink-0">Tamaño</span>
                <input
                    v-model.number="brushSize"
                    type="range"
                    min="6"
                    max="80"
                    step="1"
                    class="w-full accent-blue-600"
                    :disabled="disabled || !ready"
                >
                <span class="w-8 shrink-0 tabular-nums text-slate-500">{{ brushSize }}</span>
            </label>

            <div class="flex items-center gap-1">
                <span class="mr-1 shrink-0">Zoom</span>
                <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Alejar"
                    :disabled="disabled || !ready || !canZoomOut"
                    @click="zoomOut"
                >
                    −
                </button>
                <button
                    type="button"
                    class="min-w-[3.5rem] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Restablecer zoom"
                    :disabled="disabled || !ready"
                    @click="resetZoom"
                >
                    {{ zoomLabel }}
                </button>
                <button
                    type="button"
                    class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    title="Acercar"
                    :disabled="disabled || !ready || !canZoomIn"
                    @click="zoomIn"
                >
                    +
                </button>
            </div>
        </div>

        <p class="text-xs text-slate-500">
            El círculo muestra el área del pincel.
            <template v-if="mode === 'keep'"> Verde = recuperar.</template>
            <template v-else> Rojo = borrar.</template>
            Usa + / − o Ctrl + rueda para acercar.
        </p>

        <div
            ref="stageRef"
            class="max-h-96 overflow-auto rounded-xl border border-slate-200"
            :style="checkerStyle"
        >
            <div class="relative inline-block min-w-full text-center">
                <div class="relative inline-block">
                    <canvas
                        ref="viewRef"
                        class="relative z-0 block touch-none"
                        :class="disabled ? 'cursor-not-allowed opacity-60' : 'cursor-none'"
                        :style="canvasDisplayStyle"
                        @pointerdown="onPointerDown"
                        @pointermove="onPointerMove"
                        @pointerup="endStroke"
                        @pointercancel="endStroke"
                        @pointerenter="onPointerEnter"
                        @pointerleave="endStroke"
                    />

                    <!-- Anillo del pincel: contorno verde (recuperar) / rojo (borrar) -->
                    <div
                        v-show="cursorVisible && !disabled && ready"
                        class="pointer-events-none absolute z-10 rounded-full border-[3px] ring-1 ring-white"
                        :class="ringClass"
                        :style="{
                            width: `${cursorCss.r * 2}px`,
                            height: `${cursorCss.r * 2}px`,
                            left: `${cursorCss.x}px`,
                            top: `${cursorCss.y}px`,
                            transform: 'translate(-50%, -50%)',
                        }"
                        aria-hidden="true"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
