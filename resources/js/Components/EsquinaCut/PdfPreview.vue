<script setup>
import { computed } from 'vue';
import TemplatePreview from './TemplatePreview.vue';

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
    generating: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    disabled: { type: Boolean, default: false },
    /** Si es false, solo muestra el botón y el resumen (la vista previa va en otro sitio). */
    showCanvas: { type: Boolean, default: true },
});

defineEmits(['generate', 'reset']);

const imageCount = computed(() => props.images.length);
const perPage = computed(() => props.cols * props.rows);
const pages = computed(() => (imageCount.value ? Math.ceil(imageCount.value / perPage.value) : 0));
const paperLabel = computed(() => (props.paper === 'letter' ? 'Carta' : 'A4'));
const orientationLabel = computed(() => (props.orientation === 'landscape' ? 'horizontal' : 'vertical'));
</script>

<template>
    <section class="space-y-4" aria-labelledby="pdf-preview-titulo">
        <h3 id="pdf-preview-titulo" class="font-semibold text-slate-900">Generar PDF</h3>

        <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-slate-50 px-3 py-2">
                <dt class="text-slate-500">Imágenes</dt>
                <dd class="font-semibold text-slate-900">{{ imageCount }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
                <dt class="text-slate-500">Por página</dt>
                <dd class="font-semibold text-slate-900">{{ perPage }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
                <dt class="text-slate-500">Páginas</dt>
                <dd class="font-semibold text-slate-900">{{ pages || '—' }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 px-3 py-2">
                <dt class="text-slate-500">Papel</dt>
                <dd class="font-semibold text-slate-900">{{ paperLabel }} · {{ orientationLabel }}</dd>
            </div>
        </dl>

        <TemplatePreview
            v-if="showCanvas"
            :images="images"
            :cols="cols"
            :rows="rows"
            :paper="paper"
            :orientation="orientation"
            :title="title"
            :subtitle="subtitle"
            :title-on="titleOn"
            :margin="margin"
            :gap="gap"
            :page-numbers="pageNumbers"
            :cell-grid="cellGrid"
            :cell-grid-style="cellGridStyle"
            :cell-grid-color="cellGridColor"
            :border="border"
        />

        <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="disabled || !imageCount || generating"
            :aria-busy="generating"
            @click="$emit('generate')"
        >
            <svg v-if="generating" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ generating ? `Generando… ${progress}%` : 'Generar PDF' }}
        </button>

        <div v-if="generating" class="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
        </div>

        <p class="text-xs text-slate-500">
            Máximo 60 imágenes y 5 páginas. El PDF se descarga como
            <code class="rounded bg-slate-100 px-1">esquina-cut-AAAA-MM-DD.pdf</code>.
        </p>

        <button
            type="button"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="disabled || generating"
            @click="$emit('reset')"
        >
            Reiniciar todo
        </button>
    </section>
</template>
