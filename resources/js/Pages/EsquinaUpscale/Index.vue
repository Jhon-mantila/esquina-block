<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { allowedTiers, classifyDevice } from '@/AIEngine';
import { trackEvent, trackSubirImagen } from '@/analytics';
import { releaseUpscaleSession, upscaleWithEngine } from './upscaleClient.js';

const props = defineProps({
    siblings: {
        type: Object,
        default: () => ({
            bg: 'https://esquinaweb.com/esquinabg/',
            img: 'https://esquinaweb.com/esquinaimg/',
        }),
    },
});

/** @typedef {'auto' | 'basic' | 'high'} QualityId */

const QUALITY_OPTIONS = [
    {
        id: /** @type {QualityId} */ ('basic'),
        label: 'Ligero',
        hint: 'Por defecto. Modelo compacto y más rápido.',
    },
    {
        id: /** @type {QualityId} */ ('high'),
        label: 'Alta calidad',
        hint: 'Más detalle. Tarda varios minutos.',
    },
    {
        id: /** @type {QualityId} */ ('auto'),
        label: 'Automático',
        hint: 'Según el equipo. En un PC potente usa Alta calidad.',
    },
];

const INPUT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
const INPUT_FORMATS_HINT = 'JPG, PNG o WebP';

function currentProfile() {
    const ramGb = typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number'
        ? navigator.deviceMemory
        : null;
    const cores = typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 2;
    const tier = classifyDevice({ ramGb, cores });
    return { tier, allowed: allowedTiers(tier) };
}

const device = ref(currentProfile());
const selectedQuality = ref(/** @type {QualityId} */ ('basic'));
const advancedOpen = ref(false);

/** @type {import('vue').Ref<File|null>} */
const sourceFile = ref(null);
const sourceUrl = ref('');
const sourceName = ref('');
const sourceWidth = ref(0);
const sourceHeight = ref(0);

const resultUrl = ref('');
const resultBlob = ref(/** @type {Blob|null} */ (null));
const resultWidth = ref(0);
const resultHeight = ref(0);

const busy = ref(false);
const downloading = ref(false);
/** @type {import('vue').Ref<number | null>} */
const workRatio = ref(null);
const error = ref('');
const notice = ref('');
const dragging = ref(false);

/** @type {import('vue').Ref<HTMLInputElement|null>} */
const fileInput = ref(null);

const siblingLinks = computed(() => ({
    bg: props.siblings?.bg || 'https://esquinaweb.com/esquinabg/',
    img: props.siblings?.img || 'https://esquinaweb.com/esquinaimg/',
}));

const hasSource = computed(() => !!sourceUrl.value);
const hasResult = computed(() => !!resultUrl.value);
const canProcess = computed(() => hasSource.value && !busy.value);
const canDownload = computed(() => !!resultBlob.value && !busy.value);
const selectedLabel = computed(() => (
    QUALITY_OPTIONS.find((item) => item.id === selectedQuality.value)?.label || 'Ligero'
));

function isQualityAllowed(/** @type {QualityId} */ id) {
    if (id === 'auto' || id === 'basic') return true;
    return !!device.value.allowed[id];
}

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
    resultUrl.value = '';
    resultBlob.value = null;
    resultWidth.value = 0;
    resultHeight.value = 0;
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
    trackSubirImagen('upscale', 1);
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

function selectQuality(/** @type {QualityId} */ id) {
    if (!isQualityAllowed(id)) return;
    selectedQuality.value = id;
}

/**
 * @param {{ phase?: string, loaded?: number, total?: number }} status
 */
function onEngineStatus(status) {
    if (status?.phase === 'downloading') {
        downloading.value = true;
        workRatio.value = typeof status.total === 'number' && status.total > 0
            ? status.loaded / status.total
            : null;
        return;
    }
    if (status?.phase === 'preparing' && typeof status.total === 'number' && status.total > 1) {
        downloading.value = false;
        workRatio.value = status.loaded / status.total;
        return;
    }
    if (status?.phase === 'available' || status?.phase === 'ready' || status?.phase === 'error') {
        downloading.value = false;
        workRatio.value = null;
    }
}

async function onUpscale() {
    if (!hasSource.value) {
        openPicker();
        return;
    }
    if (!canProcess.value || !sourceFile.value) return;

    error.value = '';
    notice.value = '';
    clearResult();
    busy.value = true;
    downloading.value = false;
    workRatio.value = null;

    try {
        const result = await upscaleWithEngine(
            sourceFile.value,
            selectedQuality.value,
            { onStatus: onEngineStatus },
        );
        resultBlob.value = result.blob;
        resultUrl.value = URL.createObjectURL(result.blob);
        resultWidth.value = result.width;
        resultHeight.value = result.height;
        notice.value = result.notice || '';
        trackEvent('process_image', {
            tool: 'upscale',
            model: result.usedModel,
            image_width: sourceWidth.value,
            image_height: sourceHeight.value,
        });
    } catch (err) {
        error.value = err instanceof Error
            ? err.message
            : 'No se pudo ampliar la imagen. Inténtalo de nuevo.';
    } finally {
        busy.value = false;
        downloading.value = false;
        workRatio.value = null;
    }
}

/**
 * @param {'png' | 'jpeg'} type
 */
async function download(type) {
    if (!resultBlob.value) return;
    const base = (sourceName.value || 'imagen').replace(/\.[^.]+$/, '');
    let blob = resultBlob.value;
    let extension = 'png';
    if (type === 'jpeg') {
        const bitmap = await createImageBitmap(resultBlob.value);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!jpeg) return;
        blob = jpeg;
        extension = 'jpg';
    }
    const name = `${base}-ampliada.${extension}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    trackEvent('file_download', {
        tool: 'upscale',
        file_name: name,
        file_extension: extension,
    });
}

onMounted(() => {
    device.value = currentProfile();
    if (!isQualityAllowed(selectedQuality.value)) selectedQuality.value = 'basic';
});

onBeforeUnmount(() => {
    clearSource();
    releaseUpscaleSession();
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
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                        </svg>
                    </span>
                    <span class="mt-4 text-lg font-bold text-slate-900">Ampliar mi imagen</span>
                    <span class="mt-2 text-sm text-slate-600">Arrastra una foto aquí o haz clic para elegirla</span>
                    <span class="mt-1 text-xs text-slate-500">{{ INPUT_FORMATS_HINT }} · ampliación 4× · sin subir al servidor</span>
                </button>
            </div>

            <div v-else class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-900">{{ sourceName }}</p>
                        <p class="text-sm text-slate-500">
                            <template v-if="sourceWidth && sourceHeight">{{ sourceWidth }}×{{ sourceHeight }} px · </template>
                            <template v-if="resultWidth && resultHeight">resultado {{ resultWidth }}×{{ resultHeight }} px · </template>
                            Modo: {{ selectedLabel }}
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
                    @click="onUpscale"
                >
                    <span v-if="busy">Ampliando…</span>
                    <span v-else>Ampliar 4×</span>
                </button>
                <div
                    v-if="downloading || (busy && workRatio !== null)"
                    class="h-1 overflow-hidden rounded-full bg-slate-200"
                    role="status"
                    :aria-label="downloading ? 'Preparando el modelo' : 'Ampliando la imagen'"
                >
                    <div
                        v-if="workRatio !== null"
                        class="h-full bg-blue-600"
                        :style="{ width: `${Math.round(workRatio * 100)}%` }"
                    />
                    <div v-else class="h-full animate-pulse bg-blue-600/70" />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
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
                            {{ hasResult ? 'Ampliada' : 'Resultado' }}
                        </figcaption>
                        <div class="flex min-h-[180px] items-center justify-center p-3">
                            <img
                                v-if="hasResult"
                                :src="resultUrl"
                                :alt="`Ampliada: ${sourceName}`"
                                class="max-h-72 w-auto max-w-full object-contain"
                            >
                            <p v-else class="px-4 text-center text-sm text-slate-500">
                                Aquí verás la imagen ampliada por el modelo.
                            </p>
                        </div>
                    </figure>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!canDownload"
                        @click="download('png')"
                    >
                        Descargar PNG
                    </button>
                    <button
                        type="button"
                        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!canDownload"
                        @click="download('jpeg')"
                    >
                        Descargar JPEG
                    </button>
                </div>
            </div>

            <p v-if="error" class="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {{ error }}
            </p>
            <p v-if="notice" class="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                {{ notice }}
            </p>
        </div>

        <div class="mt-4 rounded-2xl border border-slate-200 bg-white">
            <button
                type="button"
                class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                :aria-expanded="advancedOpen ? 'true' : 'false'"
                aria-controls="esquinaupscale-advanced"
                @click="advancedOpen = !advancedOpen"
            >
                <span>Opciones avanzadas</span>
                <span class="text-slate-400" aria-hidden="true">{{ advancedOpen ? '−' : '+' }}</span>
            </button>
            <div v-show="advancedOpen" id="esquinaupscale-advanced" class="border-t border-slate-200 px-4 py-4">
                <p class="text-sm text-slate-600">
                    Por defecto se usa Ligero, que termina antes. Alta calidad da más detalle y tarda varios minutos. Los dos modelos amplían 4×.
                </p>
                <fieldset class="mt-4 space-y-3">
                    <legend class="sr-only">Calidad de ampliación</legend>
                    <label
                        v-for="opt in QUALITY_OPTIONS"
                        :key="opt.id"
                        class="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition"
                        :class="[
                            isQualityAllowed(opt.id)
                                ? (selectedQuality === opt.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-blue-300')
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70',
                        ]"
                    >
                        <input
                            type="radio"
                            class="mt-1"
                            name="esquinaupscale-model"
                            :value="opt.id"
                            :checked="selectedQuality === opt.id"
                            :disabled="!isQualityAllowed(opt.id) || busy"
                            @change="selectQuality(opt.id)"
                        >
                        <span class="min-w-0">
                            <span class="block font-semibold text-slate-900">{{ opt.label }}</span>
                            <span class="mt-0.5 block text-sm text-slate-600">{{ opt.hint }}</span>
                            <span v-if="!isQualityAllowed(opt.id)" class="mt-1 block text-sm font-medium text-slate-500">
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
            <a :href="siblingLinks.bg" class="text-blue-700 hover:underline">Esquina BG</a>
            o
            <a :href="siblingLinks.img" class="text-blue-700 hover:underline">Esquina Img</a>.
        </p>
    </div>
</template>
