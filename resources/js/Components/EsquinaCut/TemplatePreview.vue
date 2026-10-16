<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    drawCutPage,
    loadHtmlImages,
    paperSizeMm,
} from '@/Composables/renderCutPage.js';

const props = defineProps({
    images: { type: Array, default: () => [] },
    cols: { type: Number, required: true },
    rows: { type: Number, required: true },
    paper: { type: String, required: true },
    orientation: { type: String, required: true },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    titleOn: { type: String, default: 'all' },
    margin: { type: String, default: 'small' },
    gap: { type: Number, default: 8 },
    pageNumbers: { type: Boolean, default: false },
    cellGrid: { type: Boolean, default: true },
    cellGridStyle: { type: String, default: 'solid' },
    cellGridColor: { type: String, default: '#D1D5DB' },
    border: { type: Object, required: true },
});

const wrapper = ref(null);
const canvas = ref(null);
const pageIndex = ref(0);
const loaded = ref(new Map());
let frame = 0;
let observer = null;

const perPage = computed(() => props.cols * props.rows);
const totalPages = computed(() => (props.images.length ? Math.ceil(props.images.length / perPage.value) : 0));

const paperSize = computed(() => paperSizeMm(props.paper, props.orientation));

const showTitle = computed(() => {
    if (!props.title && !props.subtitle) return false;
    if (props.titleOn === 'first') return pageIndex.value === 0;
    return true;
});

watch(
    () => props.images.map((i) => i.previewUrl).join('|'),
    () => {
        pageIndex.value = 0;
        loadImages();
    },
);

watch(
    () => [
        props.cols,
        props.rows,
        props.paper,
        props.orientation,
        props.title,
        props.subtitle,
        props.titleOn,
        props.margin,
        props.gap,
        props.pageNumbers,
        props.cellGrid,
        props.cellGridStyle,
        props.cellGridColor,
        props.border,
        pageIndex.value,
    ],
    scheduleDraw,
    { deep: true },
);

function scheduleDraw() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
}

async function loadImages() {
    loaded.value = await loadHtmlImages(props.images);
    scheduleDraw();
}

function draw() {
    const el = canvas.value;
    const wrap = wrapper.value;
    if (!el || !wrap) return;

    const { w: pageW, h: pageH } = paperSize.value;
    const aspect = pageW / pageH;
    const cssWidth = Math.min(wrap.clientWidth, 420);
    const cssHeight = cssWidth / aspect;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    el.style.width = `${cssWidth}px`;
    el.style.height = `${cssHeight}px`;
    el.width = Math.round(cssWidth * dpr);
    el.height = Math.round(cssHeight * dpr);

    const ctx = el.getContext('2d');
    const start = pageIndex.value * perPage.value;
    const pageImages = props.images.slice(start, start + perPage.value);

    drawCutPage(ctx, el, {
        pageWmm: pageW,
        pageHmm: pageH,
        cols: props.cols,
        rows: props.rows,
        marginKey: props.margin,
        gapMm: props.gap,
        title: props.title,
        subtitle: props.subtitle,
        showTitle: showTitle.value,
        pageNumbers: props.pageNumbers,
        pageIndex: pageIndex.value,
        totalPages: totalPages.value,
        cellGrid: props.cellGrid,
        cellGridStyle: props.cellGridStyle,
        cellGridColor: props.cellGridColor,
        border: props.border,
        pageImages,
        imageMap: loaded.value,
        dpr,
        gapScale: 0.35,
    });
}

onMounted(() => {
    observer = new ResizeObserver(scheduleDraw);
    if (wrapper.value) observer.observe(wrapper.value);
    loadImages();
});

onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
});

function prevPage() {
    pageIndex.value = Math.max(0, pageIndex.value - 1);
}

function nextPage() {
    pageIndex.value = Math.min(Math.max(0, totalPages.value - 1), pageIndex.value + 1);
}
</script>

<template>
    <div class="space-y-3">
        <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-slate-700">Vista previa</p>
            <div v-if="totalPages > 1" class="flex items-center gap-2 text-sm">
                <button
                    type="button"
                    class="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    :disabled="pageIndex <= 0"
                    aria-label="Página anterior"
                    @click="prevPage"
                >
                    ←
                </button>
                <span class="tabular-nums text-slate-600">{{ pageIndex + 1 }} / {{ totalPages }}</span>
                <button
                    type="button"
                    class="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                    :disabled="pageIndex >= totalPages - 1"
                    aria-label="Página siguiente"
                    @click="nextPage"
                >
                    →
                </button>
            </div>
        </div>

        <div
            ref="wrapper"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white p-3"
        >
            <canvas
                v-if="images.length"
                ref="canvas"
                class="mx-auto block max-w-full bg-white shadow-sm"
                role="img"
                :aria-label="`Vista previa de la página ${pageIndex + 1}`"
            />
            <p v-else class="px-4 py-16 text-center text-sm text-slate-500">
                Sube imágenes para ver cómo quedará tu plantilla.
            </p>
        </div>
    </div>
</template>
