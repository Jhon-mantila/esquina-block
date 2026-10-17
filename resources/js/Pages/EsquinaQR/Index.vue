<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { buildQrPayload } from './buildQrPayload.js';
import { downloadQr } from './downloadQr.js';
import { clearQrDraft, loadQrDraft, saveQrDraft } from './qrDraft.js';
import { validateQr } from './validateQr.js';
import QRDataInput from './components/QRDataInput.vue';
import QRPreview from './components/QRPreview.vue';
import QRStyleControls from './components/QRStyleControls.vue';

const TYPES = [
    { id: 'url', label: 'URL / Texto' },
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'vcard', label: 'Contacto' },
    { id: 'email', label: 'Email' },
    { id: 'sms', label: 'SMS' },
];

const DEFAULT_DATA = {
    text: 'https://esquinaweb.com',
    wifiSsid: '',
    wifiPassword: '',
    wifiEncryption: 'WPA',
    wifiHidden: false,
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    org: '',
    website: '',
    emailTo: '',
    emailSubject: '',
    emailBody: '',
    smsPhone: '',
    smsBody: '',
};

const DEFAULT_STYLE = {
    shape: 'square',
    dotsType: 'rounded',
    dotsColor: '#0f172a',
    useGradient: false,
    gradientColor2: '#2563eb',
    gradientAngle: 0,
    background: '#ffffff',
    transparentBg: false,
    logoSrc: '',
    logoName: '',
    logoError: '',
    logoSize: 0.35,
    logoMargin: 6,
    logoCornerRadius: 0,
    hideBackgroundDots: true,
    cornersSquareType: 'square',
    cornersSquareColor: '#0f172a',
    cornersDotType: 'square',
    cornersDotColor: '#0f172a',
    errorCorrection: 'Q',
    size: 280,
    margin: 8,
};

const type = ref('url');
const data = reactive({ ...DEFAULT_DATA });
const style = reactive({ ...DEFAULT_STYLE });
const hydrated = ref(false);
const downloading = ref('');
const downloadError = ref('');

const validation = computed(() => validateQr(type.value, data));
const payload = computed(() => {
    if (!validation.value.valid) return '';
    return buildQrPayload(type.value, data);
});
const previewReady = computed(() => validation.value.valid && Boolean(payload.value));
const showHints = computed(() => !validation.value.valid);

function selectType(id) {
    type.value = id;
    downloadError.value = '';
}

async function onDownload(extension) {
    downloadError.value = '';
    if (!validation.value.valid) {
        downloadError.value = validation.value.messages[0] || 'Corrige los datos antes de descargar.';
        return;
    }
    if (downloading.value) return;

    downloading.value = extension;
    try {
        await downloadQr(payload.value, style, extension);
    } catch (e) {
        downloadError.value = e?.message || 'No se pudo descargar el QR. Prueba de nuevo.';
    } finally {
        downloading.value = '';
    }
}

function onReset() {
    type.value = 'url';
    downloadError.value = '';
    Object.assign(data, { ...DEFAULT_DATA });
    Object.assign(style, { ...DEFAULT_STYLE });
    clearQrDraft();
}

onMounted(() => {
    const draft = loadQrDraft();
    if (draft) {
        if (TYPES.some((item) => item.id === draft.type)) {
            type.value = draft.type;
        }
        Object.assign(data, { ...DEFAULT_DATA, ...draft.data });
        Object.assign(style, { ...DEFAULT_STYLE, ...draft.style, logoError: '' });
    }
    hydrated.value = true;
});

let saveTimer = 0;
watch(
    [type, data, style],
    () => {
        if (!hydrated.value) return;
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
            saveQrDraft({
                type: type.value,
                data: { ...data },
                style: { ...style },
            });
        }, 300);
    },
    { deep: true },
);
</script>

<template>
    <div class="mx-auto max-w-6xl px-4 pb-16">
        <div class="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Tipo de código QR">
            <button
                v-for="item in TYPES"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="type === item.id"
                class="rounded-lg px-3 py-2 text-sm font-semibold transition"
                :class="type === item.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'"
                @click="selectType(item.id)"
            >
                {{ item.label }}
            </button>
        </div>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div class="space-y-6">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <div class="mb-4 flex items-center justify-between gap-3">
                        <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                            <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                            Datos del QR
                        </h2>
                        <button
                            type="button"
                            class="text-sm font-medium text-blue-700 hover:underline"
                            @click="onReset"
                        >
                            Reiniciar
                        </button>
                    </div>
                    <QRDataInput v-model="data" :type="type" :errors="validation.errors" />
                </section>

                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                        Personalización
                    </h2>
                    <QRStyleControls v-model="style" />
                </section>
            </div>

            <aside class="space-y-4 lg:sticky lg:top-6">
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">3</span>
                        Vista previa
                    </h2>

                    <QRPreview
                        v-if="previewReady"
                        :data="payload"
                        :qr-style="style"
                    />
                    <p
                        v-else
                        class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500"
                    >
                        {{ showHints ? (validation.messages[0] || 'Completa los datos para ver el QR.') : 'Completa los datos para ver el QR.' }}
                    </p>

                    <div class="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            class="rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="!previewReady || Boolean(downloading)"
                            @click="onDownload('png')"
                        >
                            {{ downloading === 'png' ? 'Generando…' : 'Descargar PNG' }}
                        </button>
                        <button
                            type="button"
                            class="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            :disabled="!previewReady || Boolean(downloading)"
                            @click="onDownload('svg')"
                        >
                            {{ downloading === 'svg' ? 'Generando…' : 'Descargar SVG' }}
                        </button>
                    </div>
                    <p v-if="downloadError" class="mt-2 text-center text-sm text-amber-800" role="status">
                        {{ downloadError }}
                    </p>
                    <p v-else-if="previewReady" class="mt-3 text-center text-xs text-slate-500">
                        PNG a 1024×1024 · SVG vectorial para impresión
                    </p>
                    <p v-else class="mt-3 text-center text-xs text-slate-500">
                        Corrige los datos marcados para habilitar la descarga.
                    </p>
                    <p class="mt-2 text-center text-[11px] text-slate-400">
                        Tu configuración se guarda en este navegador.
                    </p>
                </section>
            </aside>
        </div>
    </div>
</template>
