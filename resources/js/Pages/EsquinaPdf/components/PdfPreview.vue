<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';

const props = defineProps({
    pdf: { type: Object, default: null },
    pageNumber: { type: Number, default: 1 },
    overlays: { type: Array, default: () => [] },
    selectedId: { type: [Number, String], default: null },
    maxWidth: { type: Number, default: 560 },
    /** 'select' | 'draw' */
    tool: { type: String, default: 'select' },
    inkColor: { type: String, default: '#111827' },
    inkWidth: { type: Number, default: 2.5 },
});

const emit = defineEmits(['select-overlay', 'update-overlay', 'page-size', 'add-ink']);

const canvas = ref(null);
const stage = ref(null);
const loading = ref(false);
const error = ref('');
const viewW = ref(0);
const viewH = ref(0);
const scaleFactor = ref(1);
const liveStroke = ref(null);

const RESIZE_HANDLES = [
    { id: 'nw', cursor: 'nwse-resize' },
    { id: 'ne', cursor: 'nesw-resize' },
    { id: 'sw', cursor: 'nesw-resize' },
    { id: 'se', cursor: 'nwse-resize' },
];

let drag = null;
let drawSession = null;
let paintToken = 0;

async function waitForCanvas(tries = 12) {
    for (let i = 0; i < tries; i += 1) {
        if (canvas.value) return canvas.value;
        await nextTick();
        await new Promise((r) => requestAnimationFrame(r));
    }
    return canvas.value;
}

async function paint() {
    if (!props.pdf) return;

    const token = ++paintToken;
    loading.value = true;
    error.value = '';

    const el = await waitForCanvas();
    if (!el || token !== paintToken) return;

    try {
        const { renderPageToCanvas } = await import('../pdfjsClient.js');
        if (token !== paintToken) return;

        const info = await renderPageToCanvas(
            toRaw(props.pdf),
            props.pageNumber,
            el,
            props.maxWidth,
        );
        if (token !== paintToken) return;

        viewW.value = info.width;
        viewH.value = info.height;
        scaleFactor.value = info.scale || (info.width / Math.max(info.pageWidth, 1));
        emit('page-size', {
            width: viewW.value,
            height: viewH.value,
            scale: scaleFactor.value,
            pageWidth: info.pageWidth,
            pageHeight: info.pageHeight,
        });
    } catch (e) {
        if (token !== paintToken) return;
        error.value = e?.message || 'No se pudo mostrar la página';
        console.warn('[Esquina PDF] preview', e);
    } finally {
        if (token === paintToken) loading.value = false;
    }
}

watch(
    () => [props.pdf, props.pageNumber, props.maxWidth],
    () => {
        paint();
    },
);

onMounted(() => {
    paint();
});

onBeforeUnmount(() => {
    paintToken += 1;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointermove', onDrawMove);
    window.removeEventListener('pointerup', onDrawUp);
});

const pageOverlays = () =>
    props.overlays.filter((o) => (o.pageIndex ?? 0) === props.pageNumber - 1);

function overlayBox(overlay) {
    if (overlay.type === 'ink' && Array.isArray(overlay.points) && overlay.points.length) {
        // Si ya tiene caja explícita, usarla; si no, calcular.
        if (Number.isFinite(Number(overlay.widthNorm)) && Number.isFinite(Number(overlay.heightNorm))) {
            return {
                x: Number(overlay.xNorm) || 0,
                y: Number(overlay.yNorm) || 0,
                w: Math.max(0.01, Number(overlay.widthNorm)),
                h: Math.max(0.01, Number(overlay.heightNorm)),
            };
        }
    }

    const x = Number(overlay.xNorm) || 0;
    const y = Number(overlay.yNorm) || 0;
    let w = Number(overlay.widthNorm);
    let h = Number(overlay.heightNorm);

    if (overlay.type === 'text') {
        w = Number.isFinite(w) ? w : 0.55;
        const lines = String(overlay.text || 'Texto').split('\n').length;
        const fontPx = (Number(overlay.fontSize) || 16) * scaleFactor.value;
        h = Number.isFinite(h) ? h : Math.min(0.9, ((fontPx * 1.35 * lines) + 8) / Math.max(viewH.value, 1));
    } else if (overlay.type === 'shape' && overlay.shape === 'square') {
        w = Number.isFinite(w) ? w : 0.22;
        const sidePx = w * viewW.value;
        h = sidePx / Math.max(viewH.value, 1);
    } else if (overlay.type === 'shape' && overlay.shape === 'circle') {
        w = Number.isFinite(w) ? w : 0.22;
        const sidePx = w * viewW.value;
        h = sidePx / Math.max(viewH.value, 1);
    } else {
        w = Number.isFinite(w) ? w : 0.25;
        h = Number.isFinite(h) ? h : 0.2;
    }

    return { x, y, w, h };
}

function styleFor(overlay) {
    const box = overlayBox(overlay);
    const left = box.x * viewW.value;
    const top = box.y * viewH.value;
    const width = box.w * viewW.value;
    const height = box.h * viewH.value;

    if (overlay.type === 'image' || overlay.type === 'shape' || overlay.type === 'ink') {
        return {
            left: `${left}px`,
            top: `${top}px`,
            width: `${Math.max(12, width)}px`,
            height: `${Math.max(12, height)}px`,
        };
    }

    let fontFamily = 'Helvetica, Arial, sans-serif';
    if (overlay.fontKey) {
        fontFamily = `"${overlay.fontKey}", sans-serif`;
    } else if (overlay.fontFamily === 'Times') {
        fontFamily = 'Times New Roman, Times, serif';
    } else if (overlay.fontFamily === 'Courier') {
        fontFamily = 'Courier New, monospace';
    }

    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(24, width)}px`,
        minHeight: `${Math.max(18, height)}px`,
        fontSize: `${(Number(overlay.fontSize) || 16) * scaleFactor.value}px`,
        color: overlay.color || '#111827',
        fontFamily,
        fontWeight: overlay.bold && !overlay.fontKey ? '700' : '400',
        fontStyle: overlay.italic ? 'italic' : 'normal',
        textDecoration: overlay.underline ? 'underline' : 'none',
        textAlign: overlay.align || 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };
}

function shapeInnerStyle(overlay) {
    const fill = overlay.fillColor || 'transparent';
    const stroke = overlay.strokeColor || '#111827';
    const sw = Math.max(1, Number(overlay.strokeWidth) || 2);
    const common = {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        border: `${sw}px solid ${stroke}`,
        background: fill === 'transparent' || fill === '' ? 'transparent' : fill,
        opacity: overlay.fillOpacity == null ? 1 : Number(overlay.fillOpacity),
    };

    if (overlay.shape === 'circle') {
        return { ...common, borderRadius: '50%' };
    }
    if (overlay.shape === 'triangle') {
        return {
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            opacity: overlay.fillOpacity == null ? 1 : Number(overlay.fillOpacity),
        };
    }
    return { ...common, borderRadius: '2px' };
}

function trianglePoints(overlay) {
    const sw = Math.max(1, Number(overlay.strokeWidth) || 2);
    return {
        points: '50,6 94,94 6,94',
        fill: overlay.fillColor && overlay.fillColor !== 'transparent' ? overlay.fillColor : 'none',
        stroke: overlay.strokeColor || '#111827',
        strokeWidth: sw,
    };
}

/** Puntos relativos (0–1) → cadena SVG en la caja. */
function inkPolyline(overlay) {
    const pts = overlay.points || [];
    if (!pts.length) return '';
    return pts
        .map((p) => `${(Number(p.x) || 0) * 100},${(Number(p.y) || 0) * 100}`)
        .join(' ');
}

function inkStrokePx(overlay) {
    const pt = Number(overlay.strokeWidth) || 2.5;
    return Math.max(1, pt * scaleFactor.value);
}

function stagePoint(event) {
    const rect = stage.value.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    return { x, y, stageW: rect.width, stageH: rect.height };
}

function onDrawDown(event) {
    if (props.tool !== 'draw' || !stage.value || !viewW.value) return;
    event.preventDefault();
    const p = stagePoint(event);
    drawSession = {
        points: [{ x: p.x, y: p.y }],
        stageW: p.stageW,
        stageH: p.stageH,
    };
    liveStroke.value = [...drawSession.points];
    window.addEventListener('pointermove', onDrawMove);
    window.addEventListener('pointerup', onDrawUp);
}

function onDrawMove(event) {
    if (!drawSession) return;
    const rect = stage.value?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const last = drawSession.points[drawSession.points.length - 1];
    const dx = (x - last.x) * rect.width;
    const dy = (y - last.y) * rect.height;
    // Suavizar: ignorar micromovimientos
    if (dx * dx + dy * dy < 2.25) return;
    drawSession.points.push({ x, y });
    liveStroke.value = [...drawSession.points];
}

function onDrawUp() {
    window.removeEventListener('pointermove', onDrawMove);
    window.removeEventListener('pointerup', onDrawUp);
    const session = drawSession;
    drawSession = null;
    liveStroke.value = null;
    if (!session?.points?.length) return;

    // Un toque: crear un puntito pequeño
    let points = session.points;
    if (points.length === 1) {
        const p = points[0];
        points = [
            { x: p.x, y: p.y },
            { x: p.x + 0.002, y: p.y + 0.002 },
        ];
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const padX = 0.004;
    const padY = 0.004;
    let minX = Math.min(...xs) - padX;
    let maxX = Math.max(...xs) + padX;
    let minY = Math.min(...ys) - padY;
    let maxY = Math.max(...ys) + padY;
    minX = clamp(minX, 0, 0.99);
    minY = clamp(minY, 0, 0.99);
    maxX = clamp(maxX, minX + 0.01, 1);
    maxY = clamp(maxY, minY + 0.01, 1);
    const w = maxX - minX;
    const h = maxY - minY;

    const rel = points.map((p) => ({
        x: clamp((p.x - minX) / w, 0, 1),
        y: clamp((p.y - minY) / h, 0, 1),
    }));

    emit('add-ink', {
        pageIndex: props.pageNumber - 1,
        xNorm: minX,
        yNorm: minY,
        widthNorm: w,
        heightNorm: h,
        points: rel,
        color: props.inkColor,
        strokeWidth: props.inkWidth,
    });
}

function livePolyline() {
    const pts = liveStroke.value || [];
    if (!pts.length || !viewW.value) return '';
    return pts
        .map((p) => `${p.x * viewW.value},${p.y * viewH.value}`)
        .join(' ');
}

function onMoveDown(overlay, event) {
    if (props.tool === 'draw') return;
    if (!stage.value || !viewW.value) return;
    if (event.target?.closest?.('[data-resize-handle]')) return;
    event.preventDefault();
    emit('select-overlay', overlay.id);
    const rect = stage.value.getBoundingClientRect();
    const box = overlayBox(overlay);
    drag = {
        mode: 'move',
        id: overlay.id,
        type: overlay.type,
        shape: overlay.shape,
        startX: event.clientX,
        startY: event.clientY,
        origX: box.x,
        origY: box.y,
        origW: box.w,
        origH: box.h,
        origFont: Number(overlay.fontSize) || 16,
        stageW: rect.width,
        stageH: rect.height,
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

function onResizeDown(overlay, handle, event) {
    if (props.tool === 'draw') return;
    if (!stage.value || !viewW.value) return;
    event.preventDefault();
    event.stopPropagation();
    emit('select-overlay', overlay.id);
    const rect = stage.value.getBoundingClientRect();
    const box = overlayBox(overlay);
    drag = {
        mode: 'resize',
        handle,
        id: overlay.id,
        type: overlay.type,
        shape: overlay.shape,
        startX: event.clientX,
        startY: event.clientY,
        origX: box.x,
        origY: box.y,
        origW: box.w,
        origH: box.h,
        origFont: Number(overlay.fontSize) || 16,
        stageW: rect.width,
        stageH: rect.height,
        lockSquare: overlay.type === 'shape' && overlay.shape === 'square',
        lockCircle: overlay.type === 'shape' && overlay.shape === 'circle',
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(event) {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.stageW;
    const dy = (event.clientY - drag.startY) / drag.stageH;

    if (drag.mode === 'move') {
        emit('update-overlay', drag.id, {
            xNorm: clamp(drag.origX + dx, 0, 0.98),
            yNorm: clamp(drag.origY + dy, 0, 0.98),
        });
        return;
    }

    let x = drag.origX;
    let y = drag.origY;
    let w = drag.origW;
    let h = drag.origH;
    const handle = drag.handle;

    if (handle.includes('e')) w = drag.origW + dx;
    if (handle.includes('w')) {
        w = drag.origW - dx;
        x = drag.origX + dx;
    }
    if (handle.includes('s')) h = drag.origH + dy;
    if (handle.includes('n')) {
        h = drag.origH - dy;
        y = drag.origY + dy;
    }

    const minW = 0.04;
    const minH = 0.03;

    if (w < minW) {
        if (handle.includes('w')) x = drag.origX + drag.origW - minW;
        w = minW;
    }
    if (h < minH) {
        if (handle.includes('n')) y = drag.origY + drag.origH - minH;
        h = minH;
    }

    if (drag.lockSquare || drag.lockCircle) {
        const sidePx = Math.max(w * drag.stageW, h * drag.stageH);
        w = sidePx / drag.stageW;
        h = sidePx / drag.stageH;
        if (handle.includes('w')) x = drag.origX + drag.origW - w;
        if (handle.includes('n')) y = drag.origY + drag.origH - h;
    }

    x = clamp(x, 0, 0.98);
    y = clamp(y, 0, 0.98);
    w = clamp(w, minW, 1 - x);
    h = clamp(h, minH, 1 - y);

    if (drag.type === 'text') {
        const scale = w / Math.max(drag.origW, 0.001);
        const fontSize = clamp(Math.round(drag.origFont * scale), 8, 120);
        emit('update-overlay', drag.id, {
            xNorm: x,
            yNorm: y,
            widthNorm: w,
            heightNorm: h,
            fontSize,
        });
        return;
    }

    emit('update-overlay', drag.id, {
        xNorm: x,
        yNorm: y,
        widthNorm: w,
        heightNorm: h,
    });
}

function onPointerUp() {
    drag = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function handleClass(id) {
    const base = 'absolute z-10 h-3 w-3 rounded-sm border-2 border-white bg-blue-600 shadow';
    const pos = {
        nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
        ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
        sw: '-left-1.5 -bottom-1.5 cursor-nesw-resize',
        se: '-right-1.5 -bottom-1.5 cursor-nwse-resize',
    };
    return `${base} ${pos[id]}`;
}
</script>

<template>
    <div class="relative inline-block max-w-full">
        <div
            ref="stage"
            class="relative mx-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            :class="tool === 'draw' ? 'cursor-crosshair ring-2 ring-amber-400' : ''"
            :style="viewW ? { width: `${viewW}px`, maxWidth: '100%' } : undefined"
        >
            <canvas ref="canvas" class="block max-w-full" />

            <div
                v-if="viewW && viewH"
                class="absolute left-0 top-0"
                :style="{ width: `${viewW}px`, height: `${viewH}px` }"
                :class="tool === 'draw' ? 'touch-none' : ''"
                @pointerdown="onDrawDown"
            >
                <div
                    v-for="overlay in pageOverlays()"
                    :key="overlay.id"
                    class="absolute select-none"
                    :class="[
                        tool === 'draw' ? 'pointer-events-none' : 'cursor-move',
                        'rounded border',
                        selectedId === overlay.id && tool !== 'draw'
                            ? 'border-blue-600 ring-2 ring-blue-400'
                            : 'border-dashed border-transparent',
                        selectedId === overlay.id && tool !== 'draw' && overlay.type !== 'ink'
                            ? 'border-slate-400/80'
                            : '',
                        overlay.type === 'text' ? 'bg-blue-50/40 px-1 py-0.5' : 'bg-transparent',
                        overlay.type === 'ink' && selectedId === overlay.id && tool !== 'draw'
                            ? 'border-blue-600'
                            : '',
                    ]"
                    :style="styleFor(overlay)"
                    @pointerdown.stop="onMoveDown(overlay, $event)"
                    @click.stop="tool !== 'draw' && emit('select-overlay', overlay.id)"
                >
                    <img
                        v-if="overlay.type === 'image'"
                        :src="overlay.previewUrl"
                        alt=""
                        class="pointer-events-none h-full w-full object-contain"
                        draggable="false"
                    />

                    <template v-else-if="overlay.type === 'shape'">
                        <svg
                            v-if="overlay.shape === 'triangle'"
                            class="pointer-events-none h-full w-full overflow-visible"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <polygon
                                :points="trianglePoints(overlay).points"
                                :fill="trianglePoints(overlay).fill"
                                :stroke="trianglePoints(overlay).stroke"
                                :stroke-width="trianglePoints(overlay).strokeWidth"
                                stroke-linejoin="round"
                            />
                        </svg>
                        <div
                            v-else
                            class="pointer-events-none"
                            :style="shapeInnerStyle(overlay)"
                        />
                    </template>

                    <svg
                        v-else-if="overlay.type === 'ink'"
                        class="pointer-events-none h-full w-full overflow-visible"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        <polyline
                            :points="inkPolyline(overlay)"
                            fill="none"
                            :stroke="overlay.color || '#111827'"
                            :stroke-width="inkStrokePx(overlay)"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            vector-effect="non-scaling-stroke"
                        />
                    </svg>

                    <span
                        v-else
                        class="pointer-events-none whitespace-pre-wrap break-words"
                    >
                        {{ overlay.text || 'Texto' }}
                    </span>

                    <span
                        v-if="overlay.linkUrl"
                        class="pointer-events-none absolute -right-1 -top-1 rounded bg-blue-600 px-1 text-[9px] font-bold text-white"
                        title="Tiene enlace"
                    >
                        🔗
                    </span>

                    <template v-if="selectedId === overlay.id && tool !== 'draw'">
                        <button
                            v-for="h in RESIZE_HANDLES"
                            :key="h.id"
                            type="button"
                            data-resize-handle
                            :aria-label="`Redimensionar ${h.id}`"
                            :class="handleClass(h.id)"
                            :style="{ cursor: h.cursor }"
                            @pointerdown.stop="onResizeDown(overlay, h.id, $event)"
                        />
                    </template>
                </div>

                <!-- Trazo en vivo -->
                <svg
                    v-if="liveStroke?.length"
                    class="pointer-events-none absolute inset-0"
                    :viewBox="`0 0 ${viewW} ${viewH}`"
                >
                    <polyline
                        :points="livePolyline()"
                        fill="none"
                        :stroke="inkColor"
                        :stroke-width="Math.max(1, inkWidth * scaleFactor)"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </div>

            <p
                v-if="loading"
                class="absolute inset-0 grid place-items-center bg-white/70 text-sm text-slate-500"
            >
                Cargando página…
            </p>
            <p
                v-else-if="error"
                class="absolute inset-0 grid place-items-center bg-white/80 px-4 text-center text-sm text-red-600"
            >
                {{ error }}
            </p>
        </div>
        <p v-if="tool === 'draw'" class="mt-2 text-center text-xs font-medium text-amber-800">
            Modo lápiz: dibuja o firma sobre la página. Pulsa de nuevo el lápiz para salir.
        </p>
    </div>
</template>
