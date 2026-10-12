<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

const props = defineProps({
    image: { type: Object, required: true },
    layout: { type: Object, required: true },
});

const PREVIEW_MAX_SIDE = 1600;

const wrapper = ref(null);
const canvas = ref(null);
const thumbnail = shallowRef(null);
let observer = null;
let frame = 0;

// Copia reducida de la imagen: redibujar una foto de 6000 px en cada cambio sería lento.
function buildThumbnail(image) {
    const ratio = Math.min(1, PREVIEW_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const small = document.createElement('canvas');
    small.width = Math.round(image.naturalWidth * ratio);
    small.height = Math.round(image.naturalHeight * ratio);
    small.getContext('2d').drawImage(image, 0, 0, small.width, small.height);
    return small;
}

function draw() {
    const el = canvas.value;
    if (!el || !wrapper.value || !thumbnail.value) return;

    const L = props.layout;
    const aspect = L.gridWidth / L.gridHeight;
    const maxHeight = Math.min(window.innerHeight * 0.6, 640);
    const cssWidth = Math.min(wrapper.value.clientWidth, maxHeight * aspect);
    const cssHeight = cssWidth / aspect;
    const dpr = window.devicePixelRatio || 1;

    el.style.width = `${cssWidth}px`;
    el.style.height = `${cssHeight}px`;
    el.width = Math.round(cssWidth * dpr);
    el.height = Math.round(cssHeight * dpr);

    const ctx = el.getContext('2d');
    const s = (cssWidth / L.gridWidth) * dpr;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, el.width, el.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(thumbnail.value, L.offsetX * s, L.offsetY * s, L.posterWidth * s, L.posterHeight * s);

    const { cols, rows } = L;

    for (const tile of L.tiles.filter((t) => t.empty)) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.fillRect(tile.x * s, tile.y * s, L.cellWidth * s, L.cellHeight * s);
    }

    // Franjas de solapamiento entre hojas vecinas.
    ctx.fillStyle = 'rgba(37, 99, 235, 0.28)';
    for (let c = 1; c < cols; c++) ctx.fillRect(c * L.stepX * s, 0, L.overlap * s, el.height);
    for (let r = 1; r < rows; r++) ctx.fillRect(0, r * L.stepY * s, el.width, L.overlap * s);

    // Líneas de corte: inicio de cada hoja y final de la anterior.
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.setLineDash(L.overlap > 0 ? [4 * dpr, 3 * dpr] : []);
    ctx.beginPath();
    for (let c = 1; c < cols; c++) {
        for (const x of new Set([c * L.stepX, c * L.stepX + L.overlap])) {
            ctx.moveTo(Math.round(x * s) + 0.5, 0);
            ctx.lineTo(Math.round(x * s) + 0.5, el.height);
        }
    }
    for (let r = 1; r < rows; r++) {
        for (const y of new Set([r * L.stepY, r * L.stepY + L.overlap])) {
            ctx.moveTo(0, Math.round(y * s) + 0.5);
            ctx.lineTo(el.width, Math.round(y * s) + 0.5);
        }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeRect(0.5, 0.5, el.width - 1, el.height - 1);

    // Número de cada hoja en el centro de su zona.
    const tileSize = Math.min(L.cellWidth, L.cellHeight) * s;
    const radius = Math.max(9 * dpr, Math.min(tileSize * 0.18, 22 * dpr));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(radius * 0.95)}px ui-sans-serif, system-ui, sans-serif`;

    for (const tile of L.tiles) {
        const cx = (tile.x + L.cellWidth / 2) * s;
        const cy = (tile.y + L.cellHeight / 2) * s;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = tile.empty ? 'rgba(100, 116, 139, 0.85)' : 'rgba(15, 23, 42, 0.78)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(tile.number), cx, cy + radius * 0.05);
    }
}

function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
}

watch(
    () => props.image,
    (image) => {
        thumbnail.value = buildThumbnail(image);
        scheduleDraw();
    },
    { immediate: true },
);

watch(() => props.layout, scheduleDraw);

onMounted(() => {
    observer = new ResizeObserver(scheduleDraw);
    observer.observe(wrapper.value);
    window.addEventListener('resize', scheduleDraw);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    window.removeEventListener('resize', scheduleDraw);
});
</script>

<template>
    <div class="rounded-xl bg-slate-100 p-3">
        <div ref="wrapper" class="flex justify-center">
            <canvas
                ref="canvas"
                class="max-w-full rounded-sm shadow"
                role="img"
                :aria-label="`Vista previa del póster dividido en ${layout.tiles.length} hojas`"
            />
        </div>

        <ul class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <li class="flex items-center gap-1.5">
                <span class="grid h-4 w-4 place-items-center rounded-full bg-slate-900/80 text-[9px] font-semibold text-white">1</span>
                Orden de las hojas
            </li>
            <li v-if="layout.overlap > 0" class="flex items-center gap-1.5">
                <span class="h-3 w-4 rounded-sm bg-blue-600/30" />
                Solapamiento ({{ layout.overlap }} mm)
            </li>
            <li v-if="layout.tiles.some((t) => t.empty)" class="flex items-center gap-1.5">
                <span class="h-3 w-4 rounded-sm bg-slate-400/50" />
                Hoja en blanco
            </li>
        </ul>
    </div>
</template>
