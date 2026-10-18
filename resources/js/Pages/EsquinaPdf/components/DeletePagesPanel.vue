<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { trackDescargarPdf, trackGenerarPdf, trackSubirImagen } from '@/analytics';
import {
    clearPdfDraft,
    fromStoredFile,
    loadPdfDraft,
    savePdfDraft,
    toStoredFile,
} from '../pdfDraftStore.js';
import DraftRestoreBanner from './DraftRestoreBanner.vue';
import PageManager from './PageManager.vue';
import PdfUploader from './PdfUploader.vue';

const MAX_BYTES = 40 * 1024 * 1024;

const file = ref(null);
const fileName = ref('');
const sourceBuffer = shallowRef(null);
/** Documento pdf.js: NUNCA reactivo (Proxy rompe campos privados #…). */
const pdf = shallowRef(null);
const pageCount = ref(0);
const selected = ref([]);
const error = ref('');
const loading = ref(false);
const busy = ref(false);
const progress = ref(0);
const restoreOffer = ref(null);

let saveTimer = null;
let skipSave = false;

const canDownload = computed(
    () =>
        !busy.value
        && !loading.value
        && pageCount.value > 0
        && selected.value.length > 0
        && selected.value.length < pageCount.value,
);

async function destroyPdf() {
    if (pdf.value) {
        try {
            await pdf.value.destroy();
        } catch {
            // ignore
        }
        pdf.value = null;
    }
    sourceBuffer.value = null;
    pageCount.value = 0;
    selected.value = [];
}

onBeforeUnmount(() => {
    destroyPdf();
});

async function openPdfFile(pdfFile, { selectedPages = [], track = true } = {}) {
    if (pdfFile.size > MAX_BYTES) {
        error.value = 'El PDF supera 40 MB. Prueba con uno más pequeño.';
        return false;
    }

    loading.value = true;
    busy.value = false;
    progress.value = 0;
    await destroyPdf();

    try {
        const buffer = await pdfFile.arrayBuffer();
        const forLib = buffer.slice(0);
        const { loadPdfDocument } = await import('../pdfjsClient.js');
        const doc = await loadPdfDocument(buffer);
        file.value = pdfFile;
        fileName.value = pdfFile.name;
        sourceBuffer.value = forLib;
        pdf.value = markRaw(doc);
        pageCount.value = doc.numPages;
        const maxIdx = doc.numPages - 1;
        selected.value = (selectedPages || [])
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 0 && n <= maxIdx);
        if (track) trackSubirImagen('pdf', 1);
        if (doc.numPages === 0) {
            error.value = 'Este PDF no tiene páginas.';
        } else if (doc.numPages === 1) {
            error.value = 'Este PDF solo tiene una página; no se puede eliminar sin dejar el documento vacío.';
        }
        return true;
    } catch (e) {
        error.value = e?.message || 'No se pudo leer el PDF. Puede estar dañado o protegido.';
        await destroyPdf();
        file.value = null;
        fileName.value = '';
        return false;
    } finally {
        loading.value = false;
    }
}

async function onSelectFiles(files) {
    error.value = '';
    const pdfFile = files.find((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!pdfFile) {
        error.value = 'Solo se acepta un archivo PDF.';
        return;
    }
    await openPdfFile(pdfFile);
}

function clearFile() {
    destroyPdf();
    file.value = null;
    fileName.value = '';
    error.value = '';
    progress.value = 0;
    clearPdfDraft('delete');
}

function scheduleSave() {
    if (skipSave || restoreOffer.value || loading.value) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (restoreOffer.value || !file.value) {
            if (!file.value && !restoreOffer.value) await clearPdfDraft('delete');
            return;
        }
        try {
            await savePdfDraft('delete', {
                file: toStoredFile(file.value, fileName.value, 'application/pdf'),
                selected: [...selected.value],
            });
        } catch {
            /* ignore */
        }
    }, 700);
}

watch([file, selected], scheduleSave, { deep: true });

async function acceptRestore() {
    const draft = restoreOffer.value;
    if (!draft?.file?.blob) return;
    skipSave = true;
    restoreOffer.value = null;
    error.value = '';
    try {
        const pdfFile = fromStoredFile(draft.file);
        await openPdfFile(pdfFile, { selectedPages: draft.selected || [], track: false });
    } finally {
        skipSave = false;
        scheduleSave();
    }
}

async function dismissRestore() {
    restoreOffer.value = null;
    await clearPdfDraft('delete');
}

onMounted(async () => {
    const draft = await loadPdfDraft('delete');
    if (draft?.file?.blob) {
        restoreOffer.value = draft;
    }
});

async function onDeleteDownload() {
    if (!canDownload.value || !sourceBuffer.value) return;
    error.value = '';
    busy.value = true;
    progress.value = 10;
    trackGenerarPdf('pdf');

    try {
        const [{ downloadPdfBytes }, { deletePagesFilename, removePdfPages }] = await Promise.all([
            import('../mergePdfs.js'),
            import('../deletePages.js'),
        ]);
        progress.value = 40;
        const bytes = await removePdfPages(sourceBuffer.value.slice(0), selected.value);
        progress.value = 90;
        const name = deletePagesFilename();
        downloadPdfBytes(bytes, name);
        trackDescargarPdf('pdf', name);
        progress.value = 100;
    } catch (e) {
        error.value = e?.message || 'No se pudo generar el PDF.';
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <div>
    <DraftRestoreBanner
        v-if="restoreOffer"
        :saved-at="restoreOffer.savedAt"
        :summary="`PDF «${restoreOffer.file?.name || 'documento'}» con páginas marcadas`"
        @restore="acceptRestore"
        @dismiss="dismissRestore"
    />

    <div v-if="!file && !restoreOffer" class="mx-auto max-w-xl">
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                Sube un PDF
            </h2>
            <PdfUploader
                :count="0"
                :max="1"
                :multiple="false"
                :disabled="loading || busy"
                hint="Un PDF · máximo 40 MB"
                @select="onSelectFiles"
            />
            <p v-if="loading" class="mt-3 text-sm text-slate-500">Cargando páginas…</p>
            <p v-if="error" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                {{ error }}
            </p>
        </section>
    </div>

    <div
        v-else-if="file"
        class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
    >
        <section
            class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
        >
            <div class="mb-4 flex items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                    <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                    Páginas
                </h2>
                <button
                    type="button"
                    class="text-sm font-medium text-red-700 hover:underline disabled:text-slate-400"
                    :disabled="busy || loading"
                    @click="clearFile"
                >
                    Quitar archivo
                </button>
            </div>

            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p class="truncate font-medium">{{ fileName }}</p>
                <p class="text-xs text-slate-500">{{ pageCount }} página{{ pageCount === 1 ? '' : 's' }}</p>
            </div>

            <p v-if="loading" class="mb-4 text-sm text-slate-500">Cargando páginas…</p>

            <p v-if="error" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                {{ error }}
            </p>

            <PageManager
                v-model:selected="selected"
                :pdf="pdf"
                :page-count="pageCount"
                :disabled="busy || loading"
            />
        </section>

        <aside class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                Eliminar y descargar
            </h2>
            <p class="mb-2 text-sm text-slate-600">
                Marcadas:
                <strong>{{ selected.length }}</strong>
                de
                <strong>{{ pageCount || 0 }}</strong>
            </p>
            <p class="mb-4 text-xs text-slate-500">
                Las miniaturas marcadas se quitarán del PDF final. Debe quedar al menos una página.
            </p>
            <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="!canDownload"
                @click="onDeleteDownload"
            >
                <span v-if="busy">Generando… {{ progress }}%</span>
                <span v-else>Eliminar seleccionadas y descargar</span>
            </button>
            <div
                v-if="busy"
                class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                :aria-valuenow="progress"
                aria-valuemin="0"
                aria-valuemax="100"
            >
                <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
            </div>
        </aside>
    </div>
    </div>
</template>
