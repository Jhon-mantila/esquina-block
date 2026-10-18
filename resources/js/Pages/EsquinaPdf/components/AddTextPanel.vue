<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { trackDescargarPdf, trackGenerarPdf, trackSubirImagen } from '@/analytics';
import {
    clearPdfDraft,
    fromStoredFile,
    loadPdfDraft,
    packTextOverlays,
    savePdfDraft,
    toStoredFile,
    unpackTextOverlays,
} from '../pdfDraftStore.js';
import DraftRestoreBanner from './DraftRestoreBanner.vue';
import PdfPreview from './PdfPreview.vue';
import PdfUploader from './PdfUploader.vue';
import TextOverlayEditor from './TextOverlayEditor.vue';

const MAX_BYTES = 40 * 1024 * 1024;

const file = ref(null);
const fileName = ref('');
const sourceBuffer = shallowRef(null);
const pdf = shallowRef(null);
const pageCount = ref(0);
const pageNumber = ref(1);
const overlays = ref([]);
const selectedId = ref(null);
const error = ref('');
const loading = ref(false);
const busy = ref(false);
const progress = ref(0);
const imageInput = ref(null);
const restoreOffer = ref(null);
/** 'select' | 'draw' */
const tool = ref('select');
const inkColor = ref('#111827');
const inkWidth = ref(2.5);

let nextId = 1;
let saveTimer = null;
let skipSave = false;

const selected = computed(() => overlays.value.find((o) => o.id === selectedId.value) || null);

const canDownload = computed(
    () => !busy.value && !loading.value && !!sourceBuffer.value && overlays.value.length > 0,
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
    pageNumber.value = 1;
    overlays.value.forEach((o) => {
        if (o.previewUrl) URL.revokeObjectURL(o.previewUrl);
    });
    overlays.value = [];
    selectedId.value = null;
}

onBeforeUnmount(() => {
    destroyPdf();
});

async function openPdfFile(pdfFile, { track = true } = {}) {
    if (pdfFile.size > MAX_BYTES) {
        error.value = 'El PDF supera 40 MB.';
        return false;
    }

    loading.value = true;
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
        pageNumber.value = 1;
        if (track) trackSubirImagen('pdf', 1);
        return true;
    } catch (e) {
        error.value = e?.message || 'No se pudo leer el PDF.';
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
    clearPdfDraft('text');
}

function scheduleSave() {
    if (skipSave || restoreOffer.value || loading.value) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (restoreOffer.value || !file.value) {
            if (!file.value && !restoreOffer.value) await clearPdfDraft('text');
            return;
        }
        try {
            const packed = await packTextOverlays(overlays.value);
            await savePdfDraft('text', {
                file: toStoredFile(file.value, fileName.value, 'application/pdf'),
                pageNumber: pageNumber.value,
                selectedId: selectedId.value,
                ...packed,
            });
        } catch {
            /* ignore */
        }
    }, 800);
}

watch([file, overlays, pageNumber, selectedId], scheduleSave, { deep: true });

async function acceptRestore() {
    const draft = restoreOffer.value;
    if (!draft?.file?.blob) return;
    skipSave = true;
    restoreOffer.value = null;
    error.value = '';
    try {
        const pdfFile = fromStoredFile(draft.file);
        const ok = await openPdfFile(pdfFile, { track: false });
        if (!ok) return;
        const restored = await unpackTextOverlays(draft);
        overlays.value = restored;
        const maxId = restored.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0);
        nextId = maxId + 1;
        const pages = pageCount.value || 1;
        pageNumber.value = Math.min(Math.max(1, Number(draft.pageNumber) || 1), pages);
        selectedId.value = restored.some((o) => o.id === draft.selectedId)
            ? draft.selectedId
            : (restored[0]?.id ?? null);
    } finally {
        skipSave = false;
        scheduleSave();
    }
}

async function dismissRestore() {
    restoreOffer.value = null;
    await clearPdfDraft('text');
}

onMounted(async () => {
    const draft = await loadPdfDraft('text');
    if (draft?.file?.blob) {
        restoreOffer.value = draft;
    }
});

function addText() {
    tool.value = 'select';
    const id = nextId++;
    overlays.value = [
        ...overlays.value,
        {
            id,
            type: 'text',
            pageIndex: pageNumber.value - 1,
            xNorm: 0.12,
            yNorm: 0.12,
            text: 'Tu texto aquí',
            fontSize: 18,
            color: '#111827',
            fontFamily: 'Helvetica',
            bold: false,
            italic: false,
            underline: false,
            align: 'left',
            widthNorm: 0.55,
            heightNorm: 0.08,
            fontBytes: null,
            fontName: '',
            fontKey: '',
            linkUrl: '',
        },
    ];
    selectedId.value = id;
}

const SHAPE_PRESETS = {
    square: { widthNorm: 0.2, heightNorm: 0.2 },
    rect: { widthNorm: 0.32, heightNorm: 0.16 },
    circle: { widthNorm: 0.2, heightNorm: 0.2 },
    triangle: { widthNorm: 0.24, heightNorm: 0.2 },
};

function addShape(shape) {
    tool.value = 'select';
    const preset = SHAPE_PRESETS[shape] || SHAPE_PRESETS.rect;
    const id = nextId++;
    overlays.value = [
        ...overlays.value,
        {
            id,
            type: 'shape',
            shape,
            pageIndex: pageNumber.value - 1,
            xNorm: 0.18,
            yNorm: 0.18,
            widthNorm: preset.widthNorm,
            heightNorm: preset.heightNorm,
            fillColor: '#93c5fd',
            strokeColor: '#1e3a8a',
            strokeWidth: 2,
            fillOpacity: 1,
            linkUrl: '',
        },
    ];
    selectedId.value = id;
}

function togglePencil() {
    tool.value = tool.value === 'draw' ? 'select' : 'draw';
    if (tool.value === 'draw') {
        selectedId.value = null;
    }
}

function onAddInk(payload) {
    const id = nextId++;
    overlays.value = [
        ...overlays.value,
        {
            id,
            type: 'ink',
            pageIndex: payload.pageIndex ?? pageNumber.value - 1,
            xNorm: payload.xNorm,
            yNorm: payload.yNorm,
            widthNorm: payload.widthNorm,
            heightNorm: payload.heightNorm,
            points: payload.points || [],
            color: payload.color || inkColor.value,
            strokeWidth: payload.strokeWidth ?? inkWidth.value,
        },
    ];
    selectedId.value = id;
}

function pickImage() {
    tool.value = 'select';
    imageInput.value?.click();
}

async function onImagePicked(event) {
    const imgFile = [...(event.target.files || [])].find((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        || /\.(jpe?g|png|webp)$/i.test(f.name),
    );
    event.target.value = '';
    if (!imgFile) {
        error.value = 'Elige una imagen JPG, PNG o WebP.';
        return;
    }
    if (imgFile.size > 8 * 1024 * 1024) {
        error.value = 'La imagen supera 8 MB.';
        return;
    }

    error.value = '';
    const bytes = await imgFile.arrayBuffer();
    const previewUrl = URL.createObjectURL(imgFile);
    const id = nextId++;

    let widthNorm = 0.35;
    let heightNorm = 0.25;
    try {
        const dims = await readImageSize(previewUrl);
        const ratio = dims.height / Math.max(dims.width, 1);
        heightNorm = Math.min(0.8, widthNorm * ratio);
    } catch {
        // defaults
    }

    overlays.value = [
        ...overlays.value,
        {
            id,
            type: 'image',
            pageIndex: pageNumber.value - 1,
            xNorm: 0.15,
            yNorm: 0.15,
            widthNorm,
            heightNorm,
            bytes,
            mime: imgFile.type || 'image/png',
            previewUrl,
            name: imgFile.name,
            linkUrl: '',
        },
    ];
    selectedId.value = id;
    trackSubirImagen('pdf', 1);
}

function readImageSize(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = src;
    });
}

function updateSelected(patch) {
    if (!selectedId.value) return;
    overlays.value = overlays.value.map((o) =>
        o.id === selectedId.value ? { ...o, ...patch } : o,
    );
}

function updateOverlay(id, patch) {
    overlays.value = overlays.value.map((o) => (o.id === id ? { ...o, ...patch } : o));
}

function removeSelected() {
    const current = selected.value;
    if (!current) return;
    if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
    overlays.value = overlays.value.filter((o) => o.id !== current.id);
    selectedId.value = null;
}

async function onDownload() {
    if (!canDownload.value || !sourceBuffer.value) return;
    error.value = '';
    busy.value = true;
    progress.value = 15;
    trackGenerarPdf('pdf');

    try {
        const [{ downloadPdfBytes }, { stampOverlaysOnPdf, stampedFilename }] = await Promise.all([
            import('../mergePdfs.js'),
            import('../stampOverlays.js'),
        ]);
        progress.value = 45;
        const bytes = await stampOverlaysOnPdf(sourceBuffer.value.slice(0), overlays.value);
        progress.value = 90;
        const name = stampedFilename();
        downloadPdfBytes(bytes, name);
        trackDescargarPdf('pdf', name);
        progress.value = 100;
    } catch (e) {
        error.value = e?.message || 'No se pudo generar el PDF editado.';
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
        :summary="`PDF «${restoreOffer.file?.name || 'documento'}» con ${(restoreOffer.overlays || []).length} elemento(s)`"
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
            <p v-if="loading" class="mt-3 text-sm text-slate-500">Cargando…</p>
            <p v-if="error" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                {{ error }}
            </p>
        </section>
    </div>

    <div
        v-else-if="file"
        class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
    >
        <!-- 1 · Vista previa (izquierda, fija) -->
        <section
            class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:sticky lg:top-6"
        >
            <div class="mb-2 flex min-w-0 items-center gap-2">
                <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                <h2 class="shrink-0 text-sm font-semibold text-slate-900">Vista previa</h2>
                <p class="min-w-0 flex-1 truncate text-xs text-slate-500" :title="fileName">{{ fileName }}</p>
                <div
                    v-if="pageCount > 1"
                    class="flex shrink-0 items-center gap-0.5 text-[11px] text-slate-700"
                >
                    <button
                        type="button"
                        class="rounded px-1 py-0.5 hover:bg-slate-100 disabled:opacity-40"
                        :disabled="pageNumber <= 1 || busy"
                        aria-label="Página anterior"
                        @click="pageNumber -= 1"
                    >
                        ←
                    </button>
                    <span class="min-w-[2.75rem] text-center tabular-nums">{{ pageNumber }}/{{ pageCount }}</span>
                    <button
                        type="button"
                        class="rounded px-1 py-0.5 hover:bg-slate-100 disabled:opacity-40"
                        :disabled="pageNumber >= pageCount || busy"
                        aria-label="Página siguiente"
                        @click="pageNumber += 1"
                    >
                        →
                    </button>
                </div>
                <button
                    type="button"
                    class="shrink-0 text-xs font-medium text-red-700 hover:underline disabled:text-slate-400"
                    :disabled="busy || loading"
                    @click="clearFile"
                >
                    Quitar
                </button>
            </div>

            <PdfPreview
                :pdf="pdf"
                :page-number="pageNumber"
                :overlays="overlays"
                :selected-id="selectedId"
                :tool="tool"
                :ink-color="inkColor"
                :ink-width="inkWidth"
                @select-overlay="selectedId = $event"
                @update-overlay="updateOverlay"
                @add-ink="onAddInk"
            />

            <p v-if="error" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                {{ error }}
            </p>
        </section>

        <aside class="space-y-3">
            <!-- 2 · Herramientas -->
            <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <h2 class="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span class="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">2</span>
                    Añadir
                </h2>

                <div class="grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        class="rounded-md bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                        :disabled="busy || loading"
                        @click="addText"
                    >
                        Texto
                    </button>
                    <button
                        type="button"
                        class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                        :disabled="busy || loading"
                        @click="pickImage"
                    >
                        Imagen
                    </button>
                </div>
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="hidden"
                    @change="onImagePicked"
                />

                <div class="mt-2 flex items-center gap-1">
                    <button
                        type="button"
                        class="grid h-8 w-8 place-items-center rounded-md border text-sm disabled:opacity-50"
                        :class="tool === 'draw'
                            ? 'border-amber-500 bg-amber-100 text-amber-900'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-amber-400'"
                        :disabled="busy || loading"
                        title="Lápiz: dibujar o firmar"
                        aria-label="Lápiz"
                        :aria-pressed="tool === 'draw'"
                        @click="togglePencil"
                    >
                        ✎
                    </button>
                    <button
                        type="button"
                        class="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:border-blue-300 disabled:opacity-50"
                        :disabled="busy || loading"
                        title="Cuadrado"
                        aria-label="Cuadrado"
                        @click="addShape('square')"
                    >
                        ▢
                    </button>
                    <button
                        type="button"
                        class="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:border-blue-300 disabled:opacity-50"
                        :disabled="busy || loading"
                        title="Rectángulo"
                        aria-label="Rectángulo"
                        @click="addShape('rect')"
                    >
                        ▭
                    </button>
                    <button
                        type="button"
                        class="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:border-blue-300 disabled:opacity-50"
                        :disabled="busy || loading"
                        title="Círculo"
                        aria-label="Círculo"
                        @click="addShape('circle')"
                    >
                        ○
                    </button>
                    <button
                        type="button"
                        class="grid h-8 w-8 place-items-center rounded-md border border-slate-300 bg-white text-sm text-slate-700 hover:border-blue-300 disabled:opacity-50"
                        :disabled="busy || loading"
                        title="Triángulo"
                        aria-label="Triángulo"
                        @click="addShape('triangle')"
                    >
                        △
                    </button>
                </div>

                <div
                    v-if="tool === 'draw'"
                    class="mt-2 space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5"
                >
                    <label class="flex items-center justify-between gap-2 text-[11px] font-medium text-amber-950">
                        Color
                        <input
                            v-model="inkColor"
                            type="color"
                            class="h-6 w-10 cursor-pointer rounded border border-amber-300 bg-white p-0.5"
                            :disabled="busy"
                        />
                    </label>
                    <label class="block text-[11px] font-medium text-amber-950">
                        Grosor {{ inkWidth }}
                        <input
                            v-model.number="inkWidth"
                            type="range"
                            min="1"
                            max="12"
                            step="0.5"
                            class="mt-0.5 w-full"
                            :disabled="busy"
                        />
                    </label>
                    <button
                        type="button"
                        class="w-full rounded border border-amber-400 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                        @click="tool = 'select'"
                    >
                        Listo
                    </button>
                </div>
            </section>

            <!-- 3 · Editar -->
            <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <h2 class="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span class="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">3</span>
                    Editar selección
                </h2>
                <TextOverlayEditor
                    :overlay="selected"
                    :disabled="busy || !file"
                    @update="updateSelected"
                    @remove="removeSelected"
                    @error="error = $event"
                />
            </section>

            <!-- 4 · Descargar -->
            <section class="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <h2 class="mb-2.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <span class="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">4</span>
                    Descargar
                </h2>
                <p class="mb-2 text-xs text-slate-600">
                    {{ overlays.length }} elemento{{ overlays.length === 1 ? '' : 's' }} en el PDF
                </p>
                <button
                    type="button"
                    class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    :disabled="!canDownload"
                    @click="onDownload"
                >
                    <span v-if="busy">Generando… {{ progress }}%</span>
                    <span v-else>Descargar PDF</span>
                </button>
                <div
                    v-if="busy"
                    class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    :aria-valuenow="progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
                </div>
            </section>
        </aside>
    </div>
    </div>
</template>
