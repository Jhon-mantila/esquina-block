<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import GridPreview from '@/Components/GridPreview.vue';
import GridSettings from '@/Components/GridSettings.vue';
import ImageUploader from '@/Components/ImageUploader.vue';
import PdfGenerator from '@/Components/PdfGenerator.vue';
import { useBlockPoster } from '@/Composables/useBlockPoster.js';
import { createDemoFile } from '@/demoImage.js';

const settings = reactive({
    cols: 3,
    rows: 3,
    paper: 'a4',
    orientation: 'landscape',
    margin: 'small',
    overlap: 5,
    cutMarks: true,
});

const {
    file,
    image,
    imageUrl,
    isDemo,
    loading,
    error,
    layout,
    posterSize,
    quality,
    suggestedRows,
    generating,
    progress,
    pdfError,
    pdfDone,
    load,
    clear,
    download,
} = useBlockPoster(settings);

const pages = computed(() => settings.cols * settings.rows);

const preparingDemo = ref(true);
const picker = ref(null);
const draggingOver = ref(false);

function openPicker() {
    picker.value?.click();
}

function onPick(event) {
    const selected = event.target.files?.[0];
    if (selected) load(selected);
    event.target.value = '';
}

function onDragOver() {
    if (imageUrl.value && !generating.value) draggingOver.value = true;
}

function onDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) draggingOver.value = false;
}

function onDrop(event) {
    draggingOver.value = false;
    const selected = event.dataTransfer.files?.[0];
    if (selected) load(selected);
}

async function showDemo() {
    preparingDemo.value = true;
    try {
        const demo = await createDemoFile();
        // El usuario pudo soltar su propia imagen mientras se generaba el ejemplo.
        if (!image.value && !loading.value) await load(demo, { demo: true });
    } finally {
        preparingDemo.value = false;
    }
}

onMounted(showDemo);
</script>

<template>
    <div class="mx-auto max-w-6xl px-4">
        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section
                class="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6"
                @dragover.prevent="onDragOver"
                @dragleave="onDragLeave"
                @drop.prevent="onDrop"
            >
                <div class="mb-4 flex items-center justify-between gap-3">
                    <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                        {{ imageUrl ? 'Previsualización' : 'Sube tu imagen' }}
                        <span v-if="isDemo" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Ejemplo</span>
                    </h2>
                    <button
                        v-if="imageUrl && !isDemo"
                        type="button"
                        class="text-sm font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                        :disabled="generating"
                        @click="openPicker"
                    >
                        Cambiar imagen
                    </button>
                </div>

                <input ref="picker" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPick" />

                <template v-if="imageUrl">
                    <div
                        v-if="isDemo"
                        class="mb-3 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div class="text-sm text-blue-900">
                            <p>Esta es una <strong>imagen de ejemplo</strong>. Sube la tuya o arrástrala aquí.</p>
                            <p class="mt-1 text-xs text-blue-800/80">JPG, PNG o WebP · máximo 20 MB · Tu imagen no sale de tu dispositivo.</p>
                        </div>
                        <div class="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                            <button
                                type="button"
                                class="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                @click="openPicker"
                            >
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                Subir mi imagen
                            </button>
                            <button type="button" class="text-center text-xs font-medium text-blue-700 hover:underline" @click="clear">
                                Quitar ejemplo
                            </button>
                        </div>
                    </div>

                    <GridPreview :image="image" :layout="layout" />

                    <div
                        v-if="suggestedRows"
                        class="mt-3 flex flex-col gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <span>Tu imagen deja espacio en blanco. Con {{ suggestedRows }} {{ suggestedRows === 1 ? 'fila' : 'filas' }} aprovecharás mejor el papel.</span>
                        <button
                            type="button"
                            class="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            :disabled="generating"
                            @click="settings.rows = suggestedRows"
                        >
                            Usar {{ suggestedRows }} {{ suggestedRows === 1 ? 'fila' : 'filas' }}
                        </button>
                    </div>
                </template>
                <p v-else-if="loading || preparingDemo" class="rounded-xl bg-slate-100 py-16 text-center text-sm text-slate-500">
                    {{ preparingDemo ? 'Preparando ejemplo…' : 'Cargando imagen…' }}
                </p>
                <template v-else>
                    <ImageUploader @select="load" />
                    <p class="mt-3 text-center text-sm text-slate-500">
                        ¿No tienes una imagen a mano?
                        <button type="button" class="font-medium text-blue-700 hover:underline" @click="showDemo">Ver un ejemplo</button>
                    </p>
                </template>

                <p v-if="error" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>

                <p v-if="file && !isDemo" class="mt-3 truncate text-xs text-slate-500">{{ file.name }}</p>

                <div
                    v-if="draggingOver"
                    class="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-50/90 text-lg font-semibold text-blue-800"
                >
                    Suelta tu imagen para usarla
                </div>
            </section>

            <div class="space-y-6">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                        Configura la cuadrícula
                    </h2>
                    <GridSettings v-model="settings" :disabled="generating" />
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">3</span>
                        Descarga e imprime
                    </h2>
                    <PdfGenerator
                        :disabled="!imageUrl"
                        :generating="generating"
                        :progress="progress"
                        :pages="pages"
                        :poster-size="posterSize"
                        :quality="quality"
                        :done="pdfDone"
                        :error="pdfError"
                        @generate="download"
                    />
                    <p class="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                        <strong>Importante:</strong> imprime a escala 100 % («tamaño real»), sin «ajustar a página».
                    </p>
                </section>
            </div>
        </div>
    </div>
</template>
