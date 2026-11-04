<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { trackEvent, trackSubirImagen } from '@/analytics';
import { detectDeviceTier } from './detectDeviceTier.js';
import MaskBrushEditor from './MaskBrushEditor.vue';
import { removeBackgroundInWorker } from './removeBackgroundClient.js';

const props = defineProps({
    siblings: {
        type: Object,
        default: () => ({
            block: 'https://esquinaweb.com/esquinablock/',
            cut: 'https://esquinaweb.com/esquinacut/',
            qr: 'https://esquinaweb.com/esquinaqr/',
            img: 'https://esquinaweb.com/esquinaimg/',
            pdf: 'https://esquinaweb.com/esquinapdf/',
        }),
    },
});

/** @typedef {'basic' | 'balanced' | 'high'} ModelId */

const MODEL_OPTIONS = [
    {
        id: /** @type {ModelId} */ ('basic'),
        label: 'Rápido (Fondos simples)',
        hint: 'Ideal para fondos lisos o PCs modestos.',
    },
    {
        id: /** @type {ModelId} */ ('balanced'),
        label: 'Equilibrado (Recomendado)',
        hint: 'Buen detalle en la mayoría de fotos.',
    },
    {
        id: /** @type {ModelId} */ ('high'),
        label: 'Alta Calidad (Detallado)',
        hint: 'Más precisión en pelo y bordes finos.',
    },
];

const INPUT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const INPUT_FORMATS_HINT = 'JPG, PNG o WebP';

const device = ref(detectDeviceTier());
const selectedModel = ref(/** @type {ModelId} */ (device.value.defaultModel));
const advancedOpen = ref(false);

/** @type {import('vue').Ref<File|null>} */
const sourceFile = ref(null);
const sourceUrl = ref('');
const sourceName = ref('');
const sourceWidth = ref(0);
const sourceHeight = ref(0);

/** Resultado con fondo transparente (descarga / vista previa). */
const resultUrl = ref('');
const resultBlob = ref(/** @type {Blob|null} */ (null));
/** PNG base del worker (estable para el editor de pincel). */
const baseResultUrl = ref('');

const busy = ref(false);
const progress = ref(0);
const error = ref('');
const notice = ref('');
const dragging = ref(false);

/** @type {import('vue').Ref<HTMLInputElement|null>} */
const fileInput = ref(null);

const siblingLinks = computed(() => ({
    block: props.siblings?.block || 'https://esquinaweb.com/esquinablock/',
    cut: props.siblings?.cut || 'https://esquinaweb.com/esquinacut/',
    qr: props.siblings?.qr || 'https://esquinaweb.com/esquinaqr/',
    img: props.siblings?.img || 'https://esquinaweb.com/esquinaimg/',
    pdf: props.siblings?.pdf || 'https://esquinaweb.com/esquinapdf/',
}));

const hasSource = computed(() => !!sourceUrl.value);
const hasResult = computed(() => !!resultUrl.value);
const canProcess = computed(() => hasSource.value && !busy.value);
const canDownload = computed(() => !!resultBlob.value && !busy.value);

const selectedModelLabel = computed(() => {
    const opt = MODEL_OPTIONS.find((m) => m.id === selectedModel.value);
    return opt?.label || 'Equilibrado';
});

function isModelAllowed(/** @type {ModelId} */ id) {
    return !!device.value.allowed[id];
}

function isAcceptedImage(file) {
    return (
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
        || /\.(jpe?g|png|webp)$/i.test(file.name)
    );
}

function revokeUrl(url) {
    if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function clearResult() {
    revokeUrl(resultUrl.value);
    if (baseResultUrl.value && baseResultUrl.value !== resultUrl.value) {
        revokeUrl(baseResultUrl.value);
    }
    resultUrl.value = '';
    baseResultUrl.value = '';
    resultBlob.value = null;
}

function clearSource() {
    revokeUrl(sourceUrl.value);
    sourceUrl.value = '';
    sourceFile.value = null;
    sourceName.value = '';
    sourceWidth.value = 0;
    sourceHeight.value = 0;
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

    sourceFile.value = file;
    sourceUrl.value = url;
    sourceName.value = file.name || 'imagen';
    sourceWidth.value = size.width;
    sourceHeight.value = size.height;
    trackSubirImagen('bg', 1);
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

function selectModel(/** @type {ModelId} */ id) {
    if (!isModelAllowed(id)) return;
    selectedModel.value = id;
}

async function onRemoveBackground() {
    if (!hasSource.value) {
        openPicker();
        return;
    }
    if (!canProcess.value || !sourceFile.value) return;

    error.value = '';
    notice.value = '';
    clearResult();

    busy.value = true;
    progress.value = 1;
    try {
        const result = await removeBackgroundInWorker(
            sourceFile.value,
            selectedModel.value,
            {
                onProgress(percent) {
                    progress.value = Math.max(0, Math.min(100, Math.round(percent)));
                },
            },
        );

        resultBlob.value = result.blob;
        const url = URL.createObjectURL(result.blob);
        baseResultUrl.value = url;
        resultUrl.value = url;
        notice.value = result.notice || '';
        progress.value = 100;
        trackEvent('process_image', {
            tool: 'bg',
            model: selectedModel.value,
            image_width: sourceWidth.value,
            image_height: sourceHeight.value,
        });
    } catch (err) {
        error.value = err instanceof Error
            ? err.message
            : 'No se pudo quitar el fondo. Prueba con una imagen más pequeña o el modo Rápido.';
        progress.value = 0;
    } finally {
        busy.value = false;
    }
}

/** @param {Blob} blob */
function onBrushBlob(blob) {
    if (!blob) return;
    // No tocar baseResultUrl: el editor sigue anclado al PNG del worker.
    if (resultUrl.value && resultUrl.value !== baseResultUrl.value) {
        revokeUrl(resultUrl.value);
    }
    resultBlob.value = blob;
    resultUrl.value = URL.createObjectURL(blob);
}

function downloadPng() {
    if (!resultBlob.value) return;
    const base = (sourceName.value || 'imagen').replace(/\.[^.]+$/, '');
    const name = `${base}-sin-fondo.png`;
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
        tool: 'bg',
        file_name: name,
        file_extension: 'png',
    });
}

onMounted(() => {
    device.value = detectDeviceTier();
    if (!isModelAllowed(selectedModel.value)) {
        selectedModel.value = device.value.defaultModel;
    }
});

onBeforeUnmount(() => {
    clearSource();
});
</script>

<template>
    <div class="mx-auto max-w-3xl px-4 pb-4">
        <!-- Zona principal: progressive disclosure -->
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

            <!-- Sin imagen: drop zone + CTA grande -->
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
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                    </span>
                    <span class="mt-4 text-lg font-bold text-slate-900">Quitar Fondo a mi Imagen</span>
                    <span class="mt-2 text-sm text-slate-600">
                        Arrastra una foto aquí o haz clic para elegirla
                    </span>
                    <span class="mt-1 text-xs text-slate-500">{{ INPUT_FORMATS_HINT }} · sin subir al servidor</span>
                </button>
            </div>

            <!-- Con imagen: CTA + visor -->
            <div v-else class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-900">{{ sourceName }}</p>
                        <p class="text-sm text-slate-500">
                            <template v-if="sourceWidth && sourceHeight">{{ sourceWidth }}×{{ sourceHeight }} px · </template>
                            Modo: {{ selectedModelLabel }}
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            :disabled="busy"
                            @click="openPicker"
                        >
                            Cambiar imagen
                        </button>
                        <button
                            type="button"
                            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            :disabled="busy"
                            @click="clearSource"
                        >
                            Quitar
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    class="w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="!canProcess"
                    @click="onRemoveBackground"
                >
                    <span v-if="busy">Quitando fondo… {{ progress }}%</span>
                    <span v-else>Quitar Fondo a mi Imagen</span>
                </button>

                <!-- Visor lado a lado (antes del retoque) -->
                <div v-if="!hasResult" class="grid gap-4 sm:grid-cols-2">
                    <figure class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <figcaption class="border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Original
                        </figcaption>
                        <div class="flex min-h-[180px] items-center justify-center p-3">
                            <img
                                :src="sourceUrl"
                                :alt="`Original: ${sourceName}`"
                                class="max-h-72 w-auto max-w-full object-contain"
                            >
                        </div>
                    </figure>

                    <figure class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <figcaption class="border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            Sin fondo
                        </figcaption>
                        <div class="flex min-h-[180px] items-center justify-center p-3">
                            <p class="px-4 text-center text-sm text-slate-500">
                                Aquí verás el resultado con fondo transparente.
                            </p>
                        </div>
                    </figure>
                </div>

                <!-- Tras procesar: original + editor con pincel -->
                <div v-else class="space-y-4">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <figure class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <figcaption class="border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                Original
                            </figcaption>
                            <div class="flex min-h-[140px] items-center justify-center p-3">
                                <img
                                    :src="sourceUrl"
                                    :alt="`Original: ${sourceName}`"
                                    class="max-h-56 w-auto max-w-full object-contain"
                                >
                            </div>
                        </figure>
                        <figure class="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <figcaption class="border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                Vista previa
                            </figcaption>
                            <div
                                class="flex min-h-[140px] items-center justify-center p-3"
                                :style="{
                                    backgroundImage: 'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                                    backgroundColor: '#f8fafc',
                                }"
                            >
                                <img
                                    :src="resultUrl"
                                    :alt="`Sin fondo: ${sourceName}`"
                                    class="max-h-56 w-auto max-w-full object-contain"
                                >
                            </div>
                        </figure>
                    </div>

                    <MaskBrushEditor
                        :key="baseResultUrl"
                        :source-url="sourceUrl"
                        :result-url="baseResultUrl"
                        :disabled="busy"
                        @update:blob="onBrushBlob"
                    />
                </div>

                <button
                    type="button"
                    class="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!canDownload"
                    @click="downloadPng"
                >
                    Descargar PNG
                </button>
            </div>

            <p v-if="error" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {{ error }}
            </p>
            <p v-if="notice" class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                {{ notice }}
            </p>
        </div>

        <!-- Opciones avanzadas (ocultas por defecto) -->
        <div class="mt-4 rounded-2xl border border-slate-200 bg-white">
            <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                :aria-expanded="advancedOpen ? 'true' : 'false'"
                aria-controls="esquinabg-advanced"
                @click="advancedOpen = !advancedOpen"
            >
                <span>Opciones avanzadas</span>
                <span class="text-slate-400" aria-hidden="true">{{ advancedOpen ? '−' : '+' }}</span>
            </button>

            <div
                v-show="advancedOpen"
                id="esquinabg-advanced"
                class="border-t border-slate-200 px-4 py-4"
            >
                <p class="text-sm text-slate-600">
                    Elige la calidad. Las opciones que tu equipo no soporta quedan deshabilitadas.
                </p>
                <p class="mt-2 text-xs text-slate-500">
                    Detectado:
                    <template v-if="device.ramGb != null">~{{ device.ramGb }} GB RAM (máx. reportado por el navegador) · </template>
                    {{ device.cores }} núcleos · modo por defecto: {{ selectedModelLabel }}
                </p>

                <fieldset class="mt-4 space-y-3">
                    <legend class="sr-only">Calidad de procesamiento</legend>

                    <label
                        v-for="opt in MODEL_OPTIONS"
                        :key="opt.id"
                        class="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition"
                        :class="[
                            isModelAllowed(opt.id)
                                ? (selectedModel === opt.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-300')
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70',
                        ]"
                    >
                        <input
                            type="radio"
                            class="mt-1"
                            name="esquinabg-model"
                            :value="opt.id"
                            :checked="selectedModel === opt.id"
                            :disabled="!isModelAllowed(opt.id) || busy"
                            @change="selectModel(opt.id)"
                        >
                        <span class="min-w-0">
                            <span class="block font-semibold text-slate-900">{{ opt.label }}</span>
                            <span class="mt-0.5 block text-sm text-slate-600">{{ opt.hint }}</span>
                            <span
                                v-if="!isModelAllowed(opt.id)"
                                class="mt-1 block text-sm font-medium text-slate-500"
                            >
                                Requiere un PC más potente
                            </span>
                        </span>
                    </label>
                </fieldset>
            </div>
        </div>

        <p class="mt-4 text-center text-xs text-slate-500">
            Privacidad: la imagen se procesa en tu navegador.
            También puedes usar
            <a :href="siblingLinks.img" class="text-blue-700 hover:underline">Esquina Img</a>
            o
            <a :href="siblingLinks.pdf" class="text-blue-700 hover:underline">Esquina PDF</a>.
        </p>
    </div>
</template>
