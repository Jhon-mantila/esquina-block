<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
    sourceUrl: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['selection']);

/** @typedef {'paint' | 'erase'} BrushMode */

const mode = ref(/** @type {BrushMode} */ ('paint'));
const brushSize = ref(36);
const ready = ref(false);
const painting = ref(false);
const cursorVisible = ref(false);
const cursorCss = ref({ x: 0, y: 0, r: 18 });
const canUndo = ref(false);
const canRedo = ref(false);

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const zoom = ref(1);
const baseDisplay = ref({ w: 0, h: 0 });

/** @type {import('vue').Ref<HTMLCanvasElement | null>} */
const viewRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const stageRef = ref(null);

let rgbCanvas = null;
let maskCanvas = null;
let tintCanvas = null;
let rgbCtx = null;
let maskCtx = null;
let tintCtx = null;
let viewCtx = null;
let imgW = 0;
let imgH = 0;
let lastPoint = null;

/** @type {ImageData[]} */
const undoStack = [];
/** @type {ImageData[]} */
const redoStack = [];
const MAX_UNDO = 20;

const canZoomIn = computed(() => zoom.value < ZOOM_MAX - 1e-6);
const canZoomOut = computed(() => zoom.value > ZOOM_MIN + 1e-6);
const zoomLabel = computed(() => `${Math.round(zoom.value * 100)}%`);
const canvasDisplayStyle = computed(() => {
    const w = baseDisplay.value.w * zoom.value;
    const h = baseDisplay.value.h * zoom.value;
    if (!w || !h) return {};
    return { width: `${w}px`, height: `${h}px` };
});

/**
 * @param {string} url
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        img.src = url;
    });
}

function syncHistoryFlags() {
    canUndo.value = undoStack.length > 0;
    canRedo.value = redoStack.length > 0;
}

function pushUndo() {
    if (!maskCtx || !imgW) return;
    undoStack.push(maskCtx.getImageData(0, 0, imgW, imgH));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    syncHistoryFlags();
}

function undo() {
    if (!undoStack.length || !maskCtx) return;
    redoStack.push(maskCtx.getImageData(0, 0, imgW, imgH));
    maskCtx.putImageData(undoStack.pop(), 0, 0);
    syncHistoryFlags();
    redraw();
    reportSelection();
}

function redo() {
    if (!redoStack.length || !maskCtx) return;
    undoStack.push(maskCtx.getImageData(0, 0, imgW, imgH));
    maskCtx.putImageData(redoStack.pop(), 0, 0);
    syncHistoryFlags();
    redraw();
    reportSelection();
}

function clearMask() {
    if (!maskCtx || props.disabled) return;
    pushUndo();
    maskCtx.clearRect(0, 0, imgW, imgH);
    redraw();
    reportSelection();
}

function redraw() {
    if (!viewCtx || !rgbCanvas || !maskCanvas || !tintCtx || !tintCanvas) return;
    viewCtx.clearRect(0, 0, imgW, imgH);
    viewCtx.drawImage(rgbCanvas, 0, 0);
    tintCtx.clearRect(0, 0, imgW, imgH);
    tintCtx.globalCompositeOperation = 'source-over';
    tintCtx.fillStyle = 'rgba(37, 99, 235, 0.45)';
    tintCtx.fillRect(0, 0, imgW, imgH);
    tintCtx.globalCompositeOperation = 'destination-in';
    tintCtx.drawImage(maskCanvas, 0, 0);
    tintCtx.globalCompositeOperation = 'source-over';
    viewCtx.drawImage(tintCanvas, 0, 0);
}

function fitBase() {
    const stage = stageRef.value;
    if (!stage || !imgW || !imgH) return;
    const maxW = Math.max(280, stage.clientWidth);
    const maxH = 520;
    const scale = Math.min(maxW / imgW, maxH / imgH, 1);
    baseDisplay.value = { w: Math.max(1, imgW * scale), h: Math.max(1, imgH * scale) };
}

async function mountSource(url) {
    await nextTick();
    ready.value = false;
    undoStack.length = 0;
    redoStack.length = 0;
    syncHistoryFlags();
    zoom.value = 1;
    if (!url) {
        imgW = 0;
        imgH = 0;
        emit('selection', false);
        return;
    }

    const image = await loadImage(url);
    imgW = image.naturalWidth || image.width;
    imgH = image.naturalHeight || image.height;

    rgbCanvas = document.createElement('canvas');
    maskCanvas = document.createElement('canvas');
    tintCanvas = document.createElement('canvas');
    rgbCanvas.width = maskCanvas.width = tintCanvas.width = imgW;
    rgbCanvas.height = maskCanvas.height = tintCanvas.height = imgH;
    rgbCtx = rgbCanvas.getContext('2d', { willReadFrequently: true });
    maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    tintCtx = tintCanvas.getContext('2d');
    viewCtx = viewRef.value?.getContext('2d');
    if (!rgbCtx || !maskCtx || !tintCtx || !viewCtx) {
        throw new Error('No se pudo preparar el lienzo.');
    }

    const view = viewRef.value;
    view.width = imgW;
    view.height = imgH;
    rgbCtx.drawImage(image, 0, 0, imgW, imgH);
    maskCtx.clearRect(0, 0, imgW, imgH);
    fitBase();
    redraw();
    ready.value = true;
    emit('selection', false);
}

function reportSelection() {
    emit('selection', hasSelection());
}

function hasSelection() {
    if (!maskCtx || !imgW) return false;
    const raw = maskCtx.getImageData(0, 0, imgW, imgH).data;
    for (let index = 3; index < raw.length; index += 4) {
        if (raw[index] > 16) return true;
    }
    return false;
}

function exportFrame() {
    if (!rgbCtx || !maskCtx || !imgW) return null;
    const rgba = new Uint8ClampedArray(rgbCtx.getImageData(0, 0, imgW, imgH).data);
    const raw = maskCtx.getImageData(0, 0, imgW, imgH).data;
    const mask = new Uint8Array(imgW * imgH);
    for (let index = 0, pixel = 0; index < mask.length; index += 1, pixel += 4) {
        mask[index] = raw[pixel + 3];
    }
    return { width: imgW, height: imgH, rgba, mask };
}

/**
 * @param {PointerEvent} event
 */
function pointFromEvent(event) {
    const canvas = viewRef.value;
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * imgW,
        y: ((event.clientY - rect.top) / rect.height) * imgH,
    };
}

/**
 * @param {number} x
 * @param {number} y
 */
function stamp(x, y) {
    if (!maskCtx) return;
    maskCtx.globalCompositeOperation = mode.value === 'erase' ? 'destination-out' : 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize.value / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.globalCompositeOperation = 'source-over';
}

/**
 * @param {{ x: number, y: number }} from
 * @param {{ x: number, y: number }} to
 */
function stroke(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.max(1, brushSize.value / 4);
    const count = Math.max(1, Math.ceil(distance / step));
    for (let index = 0; index <= count; index += 1) {
        const t = index / count;
        stamp(from.x + dx * t, from.y + dy * t);
    }
}

/**
 * @param {PointerEvent} event
 */
function moveCursor(event) {
    const canvas = viewRef.value;
    if (!canvas || !imgW) return;
    const canvasRect = canvas.getBoundingClientRect();
    cursorCss.value = {
        x: event.clientX,
        y: event.clientY,
        r: (brushSize.value / 2) * (canvasRect.width / imgW),
    };
}

/**
 * @param {PointerEvent} event
 */
function onPointerDown(event) {
    if (!ready.value || props.disabled || !viewRef.value) return;
    viewRef.value.setPointerCapture(event.pointerId);
    painting.value = true;
    cursorVisible.value = true;
    pushUndo();
    const point = pointFromEvent(event);
    lastPoint = point;
    stamp(point.x, point.y);
    redraw();
    moveCursor(event);
}

/**
 * @param {PointerEvent} event
 */
function onPointerMove(event) {
    if (!ready.value) return;
    cursorVisible.value = true;
    moveCursor(event);
    if (!painting.value || !lastPoint) return;
    const point = pointFromEvent(event);
    stroke(lastPoint, point);
    lastPoint = point;
    redraw();
}

function onPointerUp() {
    if (!painting.value) return;
    painting.value = false;
    lastPoint = null;
    reportSelection();
}

function setZoom(next) {
    zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
}

function openSource(url) {
    mountSource(url || '').catch(() => {
        ready.value = false;
        emit('selection', false);
    });
}

watch(() => props.sourceUrl, (url) => {
    openSource(url);
});

onMounted(() => {
    if (props.sourceUrl && !ready.value) openSource(props.sourceUrl);
});

onBeforeUnmount(() => {
    rgbCanvas = null;
    maskCanvas = null;
    tintCanvas = null;
});

defineExpose({ exportFrame, hasSelection, clearMask });
</script>

<template>
    <div>
        <div class="mb-3 flex flex-wrap items-center gap-2">
            <button
                type="button"
                class="rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="mode === 'paint' ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'"
                :disabled="disabled"
                @click="mode = 'paint'"
            >
                Pincel
            </button>
            <button
                type="button"
                class="rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="mode === 'erase' ? 'bg-slate-800 text-white' : 'border border-slate-300 bg-white text-slate-700'"
                :disabled="disabled"
                @click="mode = 'erase'"
            >
                Borrar selección
            </button>
            <label class="flex items-center gap-2 text-sm text-slate-600">
                Tamaño
                <input
                    v-model.number="brushSize"
                    type="range"
                    min="8"
                    max="120"
                    :disabled="disabled"
                >
            </label>
            <button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" :disabled="disabled || !canUndo" @click="undo">Deshacer</button>
            <button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" :disabled="disabled || !canRedo" @click="redo">Rehacer</button>
            <button type="button" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40" :disabled="disabled || !ready" @click="clearMask">Limpiar</button>
            <span class="ml-auto flex items-center gap-1">
                <button type="button" class="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-40" :disabled="!canZoomOut" @click="setZoom(zoom - 0.25)">−</button>
                <span class="w-12 text-center text-sm text-slate-600">{{ zoomLabel }}</span>
                <button type="button" class="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-40" :disabled="!canZoomIn" @click="setZoom(zoom + 0.25)">+</button>
            </span>
        </div>

        <div
            ref="stageRef"
            class="relative max-h-[36rem] overflow-auto rounded-xl border border-slate-200 bg-slate-100"
            @pointerleave="cursorVisible = false"
        >
            <canvas
                ref="viewRef"
                class="block touch-none"
                :style="canvasDisplayStyle"
                @pointerdown.prevent="onPointerDown"
                @pointermove.prevent="onPointerMove"
                @pointerup="onPointerUp"
                @pointercancel="onPointerUp"
            />
            <div
                v-show="cursorVisible && ready"
                class="pointer-events-none fixed z-20 rounded-full border-2 border-blue-700"
                :style="{
                    left: `${cursorCss.x - cursorCss.r}px`,
                    top: `${cursorCss.y - cursorCss.r}px`,
                    width: `${cursorCss.r * 2}px`,
                    height: `${cursorCss.r * 2}px`,
                }"
            />
        </div>
        <p class="mt-2 text-sm text-slate-500">Pinta encima de la persona, el objeto o el texto que quieres quitar.</p>
    </div>
</template>
