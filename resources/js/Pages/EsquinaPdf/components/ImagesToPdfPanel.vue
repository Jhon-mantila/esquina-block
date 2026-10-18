<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { trackDescargarPdf, trackGenerarPdf, trackSubirImagen } from '@/analytics';
import ImageUploader from '@/Components/EsquinaCut/ImageUploader.vue';
import {
    clearPdfDraft,
    fromStoredFile,
    loadPdfDraft,
    savePdfDraft,
    toStoredFile,
} from '../pdfDraftStore.js';
import DraftRestoreBanner from './DraftRestoreBanner.vue';

const MAX_FILES = 120;
const MAX_BYTES = 10 * 1024 * 1024;

const items = ref([]);
const error = ref('');
const busy = ref(false);
const progress = ref(0);
const dragFrom = ref(null);
const dragOver = ref(null);
const restoreOffer = ref(null);

const page = reactive({
    paper: 'a4',
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
});

let nextId = 1;
let saveTimer = null;
let skipSave = false;

const canConvert = computed(() => items.value.length >= 1 && !busy.value);
const showCustomSize = computed(() => page.paper === 'custom');
const showOrientation = computed(() => page.paper !== 'image');

function revokeAll() {
    items.value.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
}

onBeforeUnmount(revokeAll);

async function onSelectFiles(files) {
    error.value = '';
    const images = files.filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
        || /\.(jpe?g|png|webp)$/i.test(f.name),
    );
    if (!images.length) {
        error.value = 'Solo se aceptan JPG, PNG o WebP.';
        return;
    }

    const room = MAX_FILES - items.value.length;
    if (room <= 0) {
        error.value = `Máximo ${MAX_FILES} imágenes (una por página).`;
        return;
    }

    const accepted = images.slice(0, room);
    const skipped = [];
    const added = [];

    for (const file of accepted) {
        if (file.size > MAX_BYTES) {
            skipped.push(file.name);
            continue;
        }
        added.push({
            id: nextId++,
            file,
            name: file.name,
            mime: file.type || 'image/jpeg',
            previewUrl: URL.createObjectURL(file),
        });
    }

    if (skipped.length) {
        error.value = `Algunas imágenes superan 10 MB: ${skipped.join(', ')}`;
    } else if (images.length > room) {
        error.value = `Solo cabían ${room} más (máximo ${MAX_FILES}).`;
    }

    if (added.length) {
        items.value = [...items.value, ...added];
        trackSubirImagen('pdf', added.length);
    }
}

function removeAt(index) {
    const [removed] = items.value.splice(index, 1);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    items.value = [...items.value];
}

function clearAll() {
    revokeAll();
    items.value = [];
    error.value = '';
    progress.value = 0;
    clearPdfDraft('images');
}

function scheduleSave() {
    if (skipSave || restoreOffer.value) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (restoreOffer.value) return;
        try {
            if (!items.value.length) {
                await clearPdfDraft('images');
                return;
            }
            await savePdfDraft('images', {
                files: items.value.map((item) =>
                    toStoredFile(item.file, item.name, item.mime || item.file.type),
                ),
                page: { ...page },
            });
        } catch {
            /* ignore */
        }
    }, 700);
}

watch([items, page], scheduleSave, { deep: true });

async function acceptRestore() {
    const draft = restoreOffer.value;
    if (!draft?.files?.length) return;
    skipSave = true;
    restoreOffer.value = null;
    try {
        revokeAll();
        items.value = draft.files.map((stored) => {
            const file = fromStoredFile(stored);
            return {
                id: nextId++,
                file,
                name: file.name,
                mime: file.type || 'image/jpeg',
                previewUrl: URL.createObjectURL(file),
            };
        });
        if (draft.page) {
            Object.assign(page, {
                paper: draft.page.paper || 'a4',
                orientation: draft.page.orientation || 'portrait',
                widthMm: draft.page.widthMm ?? 210,
                heightMm: draft.page.heightMm ?? 297,
            });
        }
        error.value = '';
    } finally {
        skipSave = false;
        scheduleSave();
    }
}

async function dismissRestore() {
    restoreOffer.value = null;
    await clearPdfDraft('images');
}

onMounted(async () => {
    const draft = await loadPdfDraft('images');
    if (draft?.files?.length) {
        restoreOffer.value = draft;
    }
});

function move(from, to) {
    if (from === to || from < 0 || to < 0 || from >= items.value.length || to >= items.value.length) return;
    const next = [...items.value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    items.value = next;
}

function moveUp(index) {
    if (index > 0) move(index, index - 1);
}

function moveDown(index) {
    if (index < items.value.length - 1) move(index, index + 1);
}

function onDragStart(index, event) {
    if (event.target.closest('button')) {
        event.preventDefault();
        return;
    }
    dragFrom.value = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index, event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOver.value = index;
}

function onDrop(index, event) {
    event.preventDefault();
    const from = dragFrom.value ?? Number(event.dataTransfer.getData('text/plain'));
    dragFrom.value = null;
    dragOver.value = null;
    if (Number.isInteger(from) && from !== index) {
        move(from, index);
    }
}

function onDragEnd() {
    dragFrom.value = null;
    dragOver.value = null;
}

function onPaperChange() {
    if (page.paper === 'a4') {
        page.widthMm = 210;
        page.heightMm = 297;
    } else if (page.paper === 'letter') {
        page.widthMm = 215.9;
        page.heightMm = 279.4;
    }
}

async function onConvert() {
    if (!canConvert.value) return;
    error.value = '';

    if (page.paper === 'custom') {
        const w = Number(page.widthMm);
        const h = Number(page.heightMm);
        if (!Number.isFinite(w) || !Number.isFinite(h) || w < 40 || h < 40 || w > 1200 || h > 1200) {
            error.value = 'Indica un tamaño personalizado entre 40 y 1200 mm.';
            return;
        }
    }

    busy.value = true;
    progress.value = 0;
    trackGenerarPdf('pdf');

    try {
        const [{ downloadPdfBytes }, { imagesPdfFilename, imagesToPdfBytes }] = await Promise.all([
            import('../mergePdfs.js'),
            import('../imagesToPdf.js'),
        ]);

        const payloads = await Promise.all(
            items.value.map(async (item) => ({
                bytes: await item.file.arrayBuffer(),
                mime: item.mime,
            })),
        );

        const bytes = await imagesToPdfBytes(
            payloads,
            {
                paper: page.paper,
                orientation: page.orientation,
                widthMm: page.widthMm,
                heightMm: page.heightMm,
            },
            (done, total) => {
                progress.value = Math.round((done / total) * 100);
            },
        );

        const name = imagesPdfFilename();
        downloadPdfBytes(bytes, name);
        trackDescargarPdf('pdf', name);
    } catch (e) {
        error.value = e?.message || 'No se pudo crear el PDF. Prueba con otras imágenes.';
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
        :summary="`${restoreOffer.files.length} imagen${restoreOffer.files.length === 1 ? '' : 'es'} listas para convertir`"
        @restore="acceptRestore"
        @dismiss="dismissRestore"
    />
    <div v-show="!restoreOffer" class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div class="mb-4 flex items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                    <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                    {{ items.length ? 'Tus imágenes' : 'Sube tus imágenes' }}
                </h2>
                <button
                    v-if="items.length"
                    type="button"
                    class="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                    :disabled="busy"
                    @click="clearAll"
                >
                    Quitar todas
                </button>
            </div>

            <ImageUploader
                :count="items.length"
                :max="MAX_FILES"
                :disabled="busy || items.length >= MAX_FILES"
                @select="onSelectFiles"
            />

            <p class="mt-2 text-xs text-slate-500">
                JPG, PNG o WebP · hasta {{ MAX_FILES }} páginas · 10 MB cada una
            </p>

            <p v-if="error" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                {{ error }}
            </p>

            <ul
                v-if="items.length"
                class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
            >
                <li
                    v-for="(item, index) in items"
                    :key="item.id"
                    draggable="true"
                    class="relative overflow-hidden rounded-xl border bg-slate-50 transition"
                    :class="dragOver === index ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'"
                    @dragstart="onDragStart(index, $event)"
                    @dragover="onDragOver(index, $event)"
                    @drop="onDrop(index, $event)"
                    @dragend="onDragEnd"
                >
                    <img :src="item.previewUrl" :alt="item.name" class="aspect-square w-full object-cover" />
                    <span class="absolute left-1.5 top-1.5 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {{ index + 1 }}
                    </span>
                    <div class="flex items-center justify-between gap-1 border-t border-slate-200 bg-white p-1">
                        <button
                            type="button"
                            class="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            :disabled="busy || index === 0"
                            aria-label="Subir"
                            @click="moveUp(index)"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                        </button>
                        <button
                            type="button"
                            class="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                            :disabled="busy || index === items.length - 1"
                            aria-label="Bajar"
                            @click="moveDown(index)"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </button>
                        <button
                            type="button"
                            class="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            :disabled="busy"
                            aria-label="Quitar"
                            @click="removeAt(index)"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </li>
            </ul>
        </section>

        <aside class="space-y-4 lg:sticky lg:top-6">
            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                    <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                    Página
                </h2>
                <label class="block text-sm font-medium text-slate-700">
                    Tamaño
                    <select
                        v-model="page.paper"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        :disabled="busy"
                        @change="onPaperChange"
                    >
                        <option value="a4">A4</option>
                        <option value="letter">Carta</option>
                        <option value="custom">Personalizado (mm)</option>
                        <option value="image">Según cada imagen</option>
                    </select>
                </label>

                <div v-if="showCustomSize" class="mt-3 grid grid-cols-2 gap-2">
                    <label class="block text-sm font-medium text-slate-700">
                        Ancho (mm)
                        <input
                            v-model.number="page.widthMm"
                            type="number"
                            min="40"
                            max="1200"
                            step="1"
                            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            :disabled="busy"
                        />
                    </label>
                    <label class="block text-sm font-medium text-slate-700">
                        Alto (mm)
                        <input
                            v-model.number="page.heightMm"
                            type="number"
                            min="40"
                            max="1200"
                            step="1"
                            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            :disabled="busy"
                        />
                    </label>
                </div>

                <label v-if="showOrientation" class="mt-3 block text-sm font-medium text-slate-700">
                    Orientación
                    <select
                        v-model="page.orientation"
                        class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        :disabled="busy"
                    >
                        <option value="portrait">Vertical</option>
                        <option value="landscape">Horizontal</option>
                    </select>
                </label>

                <p class="mt-3 text-xs text-slate-500">
                    <template v-if="page.paper === 'image'">
                        Cada página tendrá el tamaño exacto de su imagen.
                    </template>
                    <template v-else-if="page.paper === 'custom'">
                        Define el papel en milímetros (40–1200). Cada imagen se centra y ajusta.
                    </template>
                    <template v-else>
                        Cada imagen será una página, centrada y ajustada al papel.
                    </template>
                </p>
            </section>

            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                    <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">3</span>
                    Convertir
                </h2>
                <p class="mb-4 text-sm text-slate-600">
                    {{ items.length }} página{{ items.length === 1 ? '' : 's' }} → PDF
                </p>
                <button
                    type="button"
                    class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    :disabled="!canConvert"
                    @click="onConvert"
                >
                    <span v-if="busy">Convirtiendo… {{ progress }}%</span>
                    <span v-else>Convertir y descargar</span>
                </button>
                <div v-if="busy" class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
                    <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
                </div>
            </section>
        </aside>
    </div>
    </div>
</template>
