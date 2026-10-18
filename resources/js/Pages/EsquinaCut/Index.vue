<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { trackDescargarPdf, trackGenerarPdf, trackSubirImagen } from '@/analytics';
import BorderControls from '@/Components/EsquinaCut/BorderControls.vue';
import GridControls from '@/Components/EsquinaCut/GridControls.vue';
import ImageList from '@/Components/EsquinaCut/ImageList.vue';
import ImageUploader from '@/Components/EsquinaCut/ImageUploader.vue';
import PageControls from '@/Components/EsquinaCut/PageControls.vue';
import PdfPreview from '@/Components/EsquinaCut/PdfPreview.vue';
import TemplatePreview from '@/Components/EsquinaCut/TemplatePreview.vue';
import {
    clearCutDraft,
    formatStorageBytes,
    getCutStorageBytes,
    loadCutDraft,
    saveCutDraft,
} from '@/Composables/cutStore.js';
import { suggestGridForPages } from '@/Composables/renderCutPage.js';
import { MAX_IMAGES, useCutImages } from '@/Composables/useCutImages.js';
import { generateCutPdf, CUT_MAX_PAGES } from '@/Composables/useCutPdf.js';
import { createDemoCutFiles } from '@/demoCut.js';

const {
    images,
    addFiles,
    removeAt,
    move,
    moveUp,
    moveDown,
    clear,
    replaceAll,
} = useCutImages();

const error = ref('');
const isDemo = ref(false);
const preparingDemo = ref(true);
const picker = ref(null);
const restoreOffer = ref(null);
const storageLabel = ref('0 KB');
let saveTimer = 0;

const grid = reactive({
    cols: 3,
    rows: 3,
});

const border = reactive({
    shape: 'silhouette',
    style: 'dashed',
    thickness: 2,
    color: '#000000',
    padding: 4,
});

const page = reactive({
    title: 'Plantilla de ejemplo',
    subtitle: 'Lista para imprimir y recortar',
    titleOn: 'all',
    paper: 'a4',
    orientation: 'portrait',
    margin: 'small',
    gap: 8,
    pageNumbers: false,
    cellGrid: true,
    cellGridStyle: 'solid',
    cellGridColor: '#D1D5DB',
    persist: true,
});

const generating = ref(false);
const progress = ref(0);

const perPage = computed(() => grid.cols * grid.rows);
const estimatedPages = computed(() => (images.value.length ? Math.ceil(images.value.length / perPage.value) : 0));
const suggestedGrid = computed(() => {
    if (estimatedPages.value <= CUT_MAX_PAGES) return null;
    return suggestGridForPages(images.value.length, CUT_MAX_PAGES);
});

function showErrors(errors) {
    error.value = errors.join(' ');
}

function onSelectFiles(files) {
    error.value = '';
    if (isDemo.value) {
        clear();
        isDemo.value = false;
        page.title = '';
        page.subtitle = '';
    }
    trackSubirImagen('cut', files.length);
    const { errors } = addFiles(files);
    if (errors.length) showErrors(errors);
    scheduleSave();
}

function openPicker() {
    picker.value?.click();
}

function onPick(event) {
    const files = [...(event.target.files || [])];
    if (files.length) onSelectFiles(files);
    event.target.value = '';
}

function removeImage(index) {
    removeAt(index);
    if (!images.value.length) isDemo.value = false;
    scheduleSave();
}

async function clearAll() {
    clear();
    isDemo.value = false;
    error.value = '';
    await clearCutDraft();
    storageLabel.value = '0 KB';
}

function resetDefaults() {
    Object.assign(grid, { cols: 3, rows: 3 });
    Object.assign(border, { shape: 'silhouette', style: 'dashed', thickness: 2, color: '#000000', padding: 4 });
    Object.assign(page, {
        title: '',
        subtitle: '',
        titleOn: 'all',
        paper: 'a4',
        orientation: 'portrait',
        margin: 'small',
        gap: 8,
        pageNumbers: false,
        cellGrid: true,
        cellGridStyle: 'solid',
        cellGridColor: '#D1D5DB',
        persist: true,
    });
}

async function confirmReset() {
    if (!images.value.length && !page.title && !page.subtitle && !isDemo.value) return;
    if (!window.confirm('¿Seguro que quieres borrar todas las imágenes y configuración?')) return;
    await clearAll();
    resetDefaults();
}

function applySuggestedGrid() {
    if (!suggestedGrid.value) return;
    grid.cols = suggestedGrid.value.cols;
    grid.rows = suggestedGrid.value.rows;
    error.value = '';
    scheduleSave();
}

async function onGenerate() {
    if (generating.value || !images.value.length) return;
    if (estimatedPages.value > CUT_MAX_PAGES) {
        error.value = `Con este grid serían ${estimatedPages.value} páginas (máximo ${CUT_MAX_PAGES}). Ajusta la cuadrícula o usa el ajuste automático.`;
        return;
    }

    trackGenerarPdf('cut');
    generating.value = true;
    progress.value = 0;
    error.value = '';

    try {
        await generateCutPdf(
            {
                images: images.value,
                cols: grid.cols,
                rows: grid.rows,
                paper: page.paper,
                orientation: page.orientation,
                title: page.title,
                subtitle: page.subtitle,
                titleOn: page.titleOn,
                margin: page.margin,
                gap: page.gap,
                pageNumbers: page.pageNumbers,
                cellGrid: page.cellGrid,
                cellGridStyle: page.cellGridStyle,
                cellGridColor: page.cellGridColor,
                border: { ...border },
            },
            (value) => {
                progress.value = value;
            },
        );
        trackDescargarPdf('cut', 'esquinacut.pdf');
    } catch (e) {
        error.value = e?.message || 'No pudimos generar el PDF. Prueba con menos imágenes o un grid más denso.';
    } finally {
        generating.value = false;
    }
}

async function refreshStorageLabel() {
    const bytes = await getCutStorageBytes();
    storageLabel.value = formatStorageBytes(bytes);
}

function scheduleSave() {
    if (restoreOffer.value || preparingDemo.value) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (restoreOffer.value || preparingDemo.value) return;
        try {
            await saveCutDraft({
                images: images.value,
                grid,
                border,
                page,
                isDemo: isDemo.value,
            });
            await refreshStorageLabel();
        } catch {
            /* ignore quota errors */
        }
    }, 600);
}

watch([images, grid, border, page], scheduleSave, { deep: true });

async function acceptRestore() {
    const draft = restoreOffer.value;
    if (!draft) return;
    preparingDemo.value = true;
    restoreOffer.value = null;
    try {
        replaceAll(draft.files);
        isDemo.value = false;
        if (draft.grid) Object.assign(grid, draft.grid);
        if (draft.border) Object.assign(border, draft.border);
        if (draft.page) Object.assign(page, draft.page);
        error.value = '';
        await refreshStorageLabel();
    } finally {
        preparingDemo.value = false;
    }
}

async function dismissRestore() {
    restoreOffer.value = null;
    await clearCutDraft();
    storageLabel.value = '0 KB';
    await showDemo();
}

async function showDemo() {
    preparingDemo.value = true;
    error.value = '';
    try {
        const files = await createDemoCutFiles();
        if (images.value.length && !isDemo.value) return;
        replaceAll(files, { demo: true });
        isDemo.value = true;
        Object.assign(grid, { cols: 3, rows: 3 });
        Object.assign(border, { shape: 'silhouette', style: 'dashed', thickness: 2, color: '#000000', padding: 6 });
        page.title = 'Plantilla de ejemplo';
        page.subtitle = 'Lista para imprimir y recortar';
        page.paper = 'a4';
        page.orientation = 'portrait';
    } catch {
        error.value = 'No se pudo preparar el ejemplo. Sube tus propias imágenes.';
    } finally {
        preparingDemo.value = false;
    }
}

onMounted(async () => {
    const draft = await loadCutDraft();
    if (draft?.files?.length) {
        preparingDemo.value = false;
        restoreOffer.value = draft;
        await refreshStorageLabel();
        return;
    }
    await showDemo();
});
</script>

<template>
    <div class="mx-auto max-w-6xl px-4 pb-16">
        <div
            v-if="restoreOffer"
            class="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            role="status"
        >
            <div class="text-sm text-blue-900">
                <p class="font-semibold">Encontramos un borrador en este navegador</p>
                <p class="mt-0.5 text-blue-800/90">
                    {{ restoreOffer.files.length }} imágenes guardadas el
                    {{ new Date(restoreOffer.savedAt).toLocaleString('es') }}.
                </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
                <button
                    type="button"
                    class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    @click="acceptRestore"
                >
                    Restaurar
                </button>
                <button
                    type="button"
                    class="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
                    @click="dismissRestore"
                >
                    Empezar de nuevo
                </button>
            </div>
        </div>

        <p
            v-if="error"
            class="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="status"
        >
            {{ error }}
        </p>

        <!--
            Igual que Esquina Block (preview a la izquierda).
            Sección 1 hace scroll; sección 2 (vista previa) queda sticky.
        -->
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div class="flex flex-col gap-6">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                            <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                            {{ images.length ? 'Tus imágenes' : 'Sube tus imágenes' }}
                            <span v-if="isDemo" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Ejemplo</span>
                        </h2>
                        <button
                            v-if="images.length && !isDemo"
                            type="button"
                            class="text-sm font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                            :disabled="generating"
                            @click="openPicker"
                        >
                            Añadir más
                        </button>
                    </div>

                    <input
                        ref="picker"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        class="hidden"
                        @change="onPick"
                    />

                    <div
                        v-if="isDemo"
                        class="mb-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div class="text-sm text-blue-900">
                            <p>Esta es una <strong>hoja de ejemplo</strong> (9 stickers en 3 × 3). Sube las tuyas o arrástralas abajo.</p>
                            <p class="mt-1 text-xs text-blue-800/80">JPG, PNG o WebP · máximo 60 · 10 MB cada una · No salen de tu dispositivo.</p>
                        </div>
                        <div class="flex shrink-0 flex-col gap-2 sm:items-end">
                            <button
                                type="button"
                                class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                @click="openPicker"
                            >
                                Subir mis imágenes
                            </button>
                            <button type="button" class="text-sm font-medium text-blue-700 hover:underline" @click="clearAll">
                                Quitar ejemplo
                            </button>
                        </div>
                    </div>

                    <p
                        v-if="preparingDemo"
                        class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
                    >
                        Preparando ejemplo…
                    </p>

                    <template v-else-if="!restoreOffer || images.length">
                        <ImageUploader
                            v-if="!isDemo"
                            :count="images.length"
                            :max="MAX_IMAGES"
                            :disabled="generating"
                            @select="onSelectFiles"
                        />
                        <p v-if="!images.length" class="mt-3 text-center text-sm text-slate-500">
                            ¿No tienes imágenes a mano?
                            <button type="button" class="font-medium text-blue-700 hover:underline" @click="showDemo">
                                Ver un ejemplo
                            </button>
                        </p>
                        <div v-if="images.length" class="mt-4">
                            <ImageList
                                :images="images"
                                :cols="grid.cols"
                                :rows="grid.rows"
                                :disabled="generating"
                                @remove="removeImage"
                                @move-up="moveUp"
                                @move-down="moveDown"
                                @reorder="move"
                                @clear-all="clearAll"
                            />
                        </div>
                    </template>
                </section>

                <section
                    v-if="images.length && !preparingDemo"
                    class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6"
                >
                    <h2 class="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                        Vista previa
                    </h2>
                    <TemplatePreview
                        :images="images"
                        :cols="grid.cols"
                        :rows="grid.rows"
                        :paper="page.paper"
                        :orientation="page.orientation"
                        :title="page.title"
                        :subtitle="page.subtitle"
                        :title-on="page.titleOn"
                        :margin="page.margin"
                        :gap="page.gap"
                        :page-numbers="page.pageNumbers"
                        :cell-grid="page.cellGrid"
                        :cell-grid-style="page.cellGridStyle"
                        :cell-grid-color="page.cellGridColor"
                        :border="border"
                    />
                    <p class="mt-2 text-xs text-slate-500">
                        Se actualiza al cambiar cuadrícula, contorno o papel.
                    </p>
                </section>
            </div>

            <div class="space-y-6">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">3</span>
                        Cuadrícula
                    </h2>
                    <GridControls v-model="grid" :disabled="generating" />
                    <div
                        v-if="estimatedPages > CUT_MAX_PAGES"
                        class="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900"
                    >
                        <p>
                            Con este grid necesitarías <strong>{{ estimatedPages }}</strong> páginas
                            (máximo {{ CUT_MAX_PAGES }}).
                        </p>
                        <button
                            v-if="suggestedGrid"
                            type="button"
                            class="mt-2 inline-flex items-center rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-900"
                            @click="applySuggestedGrid"
                        >
                            Ajustar a {{ suggestedGrid.cols }}×{{ suggestedGrid.rows }}
                            ({{ suggestedGrid.pages }} pág.)
                        </button>
                    </div>
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">4</span>
                        Contorno de corte
                    </h2>
                    <BorderControls v-model="border" :disabled="generating" />
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">5</span>
                        Página y título
                    </h2>
                    <PageControls v-model="page" :disabled="generating" :storage-label="storageLabel" />
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">6</span>
                        Descarga
                    </h2>
                    <PdfPreview
                        :images="images"
                        :cols="grid.cols"
                        :rows="grid.rows"
                        :paper="page.paper"
                        :orientation="page.orientation"
                        :title="page.title"
                        :subtitle="page.subtitle"
                        :title-on="page.titleOn"
                        :margin="page.margin"
                        :gap="page.gap"
                        :page-numbers="page.pageNumbers"
                        :cell-grid="page.cellGrid"
                        :cell-grid-style="page.cellGridStyle"
                        :cell-grid-color="page.cellGridColor"
                        :border="border"
                        :generating="generating"
                        :progress="progress"
                        :disabled="estimatedPages > CUT_MAX_PAGES"
                        :show-canvas="false"
                        @generate="onGenerate"
                        @reset="confirmReset"
                    />
                </section>
            </div>
        </div>
    </div>
</template>
