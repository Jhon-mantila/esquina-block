<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { trackEvent, trackSubirImagen } from '@/analytics';
import { eraseWithEngine, releaseEraserSession } from './eraserClient.js';
import MaskPainter from './MaskPainter.vue';

const props = defineProps({
    siblings: {
        type: Object,
        default: () => ({
            bg: 'https://esquinaweb.com/esquinabg/',
            upscale: 'https://esquinaweb.com/esquinaupscale/',
            img: 'https://esquinaweb.com/esquinaimg/',
        }),
    },
});

const INPUT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const INPUT_FORMATS_HINT = 'JPG, PNG o WebP';

/** @type {import('vue').Ref<HTMLInputElement | null>} */
const fileInput = ref(null);
/** @type {import('vue').Ref<InstanceType<typeof MaskPainter> | null>} */
const painter = ref(null);

const sourceName = ref('');
const workingUrl = ref('');
const sourceWidth = ref(0);
const sourceHeight = ref(0);
const beforeUrl = ref('');
const resultUrl = ref('');
const resultBlob = ref(/** @type {Blob | null} */ (null));
const hasSelection = ref(false);
const busy = ref(false);
const downloading = ref(false);
/** @type {import('vue').Ref<number | null>} */
const workRatio = ref(null);
const error = ref('');
const notice = ref('');
const modelNote = ref('');
const dragging = ref(false);
const compare = ref(50);

const siblingLinks = computed(() => ({
    bg: props.siblings?.bg || 'https://esquinaweb.com/esquinabg/',
    upscale: props.siblings?.upscale || 'https://esquinaweb.com/esquinaupscale/',
    img: props.siblings?.img || 'https://esquinaweb.com/esquinaimg/',
}));

const hasSource = computed(() => !!workingUrl.value);
const hasResult = computed(() => !!resultUrl.value);
const canProcess = computed(() => hasSource.value && hasSelection.value && !busy.value);
const canDownload = computed(() => !!resultBlob.value && !busy.value);

function isAcceptedImage(file) {
    return (
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name)
    );
}

function revokeUrl(url) {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

function clearResult() {
    revokeUrl(resultUrl.value);
    if (beforeUrl.value && beforeUrl.value !== workingUrl.value) revokeUrl(beforeUrl.value);
    resultUrl.value = '';
    beforeUrl.value = '';
    resultBlob.value = null;
    compare.value = 50;
}

function clearSource() {
    revokeUrl(workingUrl.value);
    workingUrl.value = '';
    sourceName.value = '';
    sourceWidth.value = 0;
    sourceHeight.value = 0;
    hasSelection.value = false;
    error.value = '';
    notice.value = '';
    clearResult();
}

function readImageSize(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
        });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = src;
    });
}

async function loadFile(file) {
    if (!file || !isAcceptedImage(file)) {
        error.value = `Formato no válido. Usa ${INPUT_FORMATS_HINT}.`;
        return;
    }

    error.value = '';
    notice.value = '';
    clearSource();
    const url = URL.createObjectURL(file);
    const size = await readImageSize(url);
    sourceName.value = file.name || 'imagen';
    sourceWidth.value = size.width;
    sourceHeight.value = size.height;
    workingUrl.value = url;
    trackSubirImagen('eraser', 1);
}

function onPickFiles(files) {
    const file = files?.[0];
    if (file) loadFile(file);
}

function onInputChange(event) {
    const files = [...(event.target.files || [])];
    if (files.length) onPickFiles(files);
    event.target.value = '';
}

function onDrop(event) {
    dragging.value = false;
    if (busy.value) return;
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length) onPickFiles(files);
}

function openPicker() {
    if (busy.value) return;
    fileInput.value?.click();
}

/**
 * @param {{ phase?: string, loaded?: number, total?: number }} status
 */
function onEngineStatus(status) {
    if (status?.phase === 'downloading') {
        downloading.value = true;
        const ratio = typeof status.total === 'number' && status.total > 0
            ? status.loaded / status.total
            : null;
        workRatio.value = ratio;
        modelNote.value = ratio == null
            ? 'Descargando el modelo…'
            : `Descargando el modelo… ${Math.round(ratio * 100)}%`;
        return;
    }
    if (status?.phase === 'available') {
        downloading.value = false;
        workRatio.value = null;
        modelNote.value = 'El modelo ya está en este navegador.';
        return;
    }
    if (status?.phase === 'preparing') {
        downloading.value = false;
        if (typeof status.total === 'number' && status.total > 1) {
            workRatio.value = status.loaded / status.total;
            modelNote.value = `Quitando lo pintado… ${status.loaded + 1} de ${status.total}`;
            return;
        }
        modelNote.value = 'Quitando lo pintado…';
    }
}

async function onErase() {
    const frame = painter.value?.exportFrame?.();
    if (!frame || !painter.value?.hasSelection?.()) {
        error.value = 'Pinta encima de lo que quieres quitar.';
        return;
    }

    error.value = '';
    notice.value = '';
    clearResult();
    busy.value = true;
    downloading.value = false;
    workRatio.value = null;

    try {
        beforeUrl.value = workingUrl.value;
        const result = await eraseWithEngine(frame, { onStatus: onEngineStatus });
        resultBlob.value = result.blob;
        resultUrl.value = URL.createObjectURL(result.blob);
        notice.value = result.notice || '';
        if (!modelNote.value) modelNote.value = 'El modelo ya está en este navegador.';
        trackEvent('process_image', {
            tool: 'eraser',
            model: result.provider,
            image_width: frame.width,
            image_height: frame.height,
        });
    } catch (err) {
        beforeUrl.value = '';
        error.value = err instanceof Error
            ? err.message
            : 'No se pudo quitar lo pintado. Inténtalo de nuevo.';
    } finally {
        busy.value = false;
        downloading.value = false;
        workRatio.value = null;
    }
}

function continueEditing() {
    if (!resultBlob.value) return;
    const next = URL.createObjectURL(resultBlob.value);
    if (workingUrl.value !== beforeUrl.value) revokeUrl(workingUrl.value);
    workingUrl.value = next;
    hasSelection.value = false;
}

function download() {
    if (!resultBlob.value) return;
    const base = (sourceName.value || 'imagen').replace(/\.[^.]+$/, '');
    const name = `${base}-sin-objeto.png`;
    const url = URL.createObjectURL(resultBlob.value);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    trackEvent('file_download', {
        tool: 'eraser',
        file_name: name,
        file_extension: 'png',
    });
}

onBeforeUnmount(() => {
    clearSource();
    releaseEraserSession();
});
</script>

<template>
    <div class="mx-auto max-w-3xl px-4 pb-4">
        <div
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            @dragover.prevent="!busy && (dragging = true)"
            @dragleave.prevent="dragging = false"
            @drop.prevent.stop="onDrop"
        >
            <input
                ref="fileInput"
                type="file"
                class="hidden"
                :accept="INPUT_ACCEPT"
                :disabled="busy"
                @change="onInputChange"
            >

            <div v-if="!hasSource" class="text-center">
                <button
                    type="button"
                    class="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-12 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    :class="dragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-white'"
                    :disabled="busy"
                    @click="openPicker"
                >
                    <span class="grid h-14 w-14 place-items-center rounded-full bg-blue-600 text-white" aria-hidden="true">
                        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                            <rect x="3.5" y="5" width="11" height="13" rx="1.5" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.5 19 13.5l-3 3H12.5L12 6.5z" />
                        </svg>
                    </span>
                    <span class="mt-4 text-lg font-bold text-slate-900">Quitar un objeto</span>
                    <span class="mt-2 text-sm text-slate-600">Arrastra una foto aquí o haz clic para elegirla</span>
                    <span class="mt-1 text-xs text-slate-500">{{ INPUT_FORMATS_HINT }} · se procesa en tu navegador</span>
                </button>
            </div>

            <div v-else class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-900">{{ sourceName }}</p>
                        <p v-if="sourceWidth && sourceHeight" class="text-sm text-slate-500">
                            {{ sourceWidth }}×{{ sourceHeight }} px
                        </p>
                    </div>
                    <button
                        type="button"
                        class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        :disabled="busy"
                        @click="openPicker"
                    >
                        Cambiar imagen
                    </button>
                </div>

                <MaskPainter
                    ref="painter"
                    :source-url="workingUrl"
                    :disabled="busy"
                    @selection="hasSelection = $event"
                />

                <button
                    type="button"
                    class="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!canProcess"
                    @click="onErase"
                >
                    <span v-if="busy && downloading">Preparando el modelo…</span>
                    <span v-else-if="busy">Quitando lo pintado…</span>
                    <span v-else>Quitar lo pintado</span>
                </button>

                <p v-if="modelNote" class="text-sm text-slate-500">{{ modelNote }}</p>
                <div
                    v-if="downloading || (busy && workRatio !== null)"
                    class="h-1 overflow-hidden rounded-full bg-slate-200"
                    role="status"
                    :aria-label="downloading ? 'Descargando el modelo' : 'Quitando lo pintado'"
                >
                    <div
                        v-if="workRatio !== null"
                        class="h-full bg-blue-600"
                        :style="{ width: `${Math.round(workRatio * 100)}%` }"
                    />
                    <div v-else class="h-full animate-pulse bg-blue-600/70" />
                </div>

                <div v-if="hasResult" class="space-y-3">
                    <p class="text-sm font-semibold text-slate-800">Antes y después</p>
                    <div class="relative inline-block max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <img :src="resultUrl" alt="Foto sin lo pintado" class="block max-h-96 max-w-full">
                        <img
                            :src="beforeUrl"
                            alt=""
                            class="pointer-events-none absolute top-0 left-0 h-full w-full object-fill"
                            :style="{ clipPath: `inset(0 ${100 - compare}% 0 0)` }"
                        >
                    </div>
                    <label class="flex items-center gap-3 text-sm text-slate-600">
                        Comparar
                        <input v-model.number="compare" type="range" min="0" max="100" class="w-full">
                    </label>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                            :disabled="!canDownload"
                            @click="download"
                        >
                            Descargar PNG
                        </button>
                        <button
                            type="button"
                            class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                            :disabled="busy"
                            @click="continueEditing"
                        >
                            Seguir editando
                        </button>
                    </div>
                </div>
            </div>

            <p v-if="error" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {{ error }}
            </p>
            <p v-if="notice" class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                {{ notice }}
            </p>
        </div>

        <p class="mt-4 text-center text-xs text-slate-500">
            La foto se procesa en tu navegador. El modelo rellena la zona pintada; no recupera lo que había detrás.
            También puedes usar
            <a :href="siblingLinks.bg" class="text-blue-700 hover:underline">Esquina BG</a>
            o
            <a :href="siblingLinks.upscale" class="text-blue-700 hover:underline">Esquina Upscale</a>.
        </p>
    </div>
</template>
