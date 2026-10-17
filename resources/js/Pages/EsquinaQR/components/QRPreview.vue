<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { buildQrOptions } from '../buildQrOptions.js';

const props = defineProps({
    data: { type: String, default: '' },
    qrStyle: { type: Object, required: true },
});

const host = ref(null);
const error = ref('');
/** @type {import('qr-code-styling').default | null} */
let qrInstance = null;
let refreshToken = 0;

function payload() {
    return (props.data || '').trim();
}

async function refresh() {
    const token = ++refreshToken;
    error.value = '';

    if (!host.value) return;

    if (!payload()) {
        host.value.replaceChildren();
        qrInstance = null;
        return;
    }

    try {
        const options = await buildQrOptions(payload(), props.qrStyle, { type: 'canvas' });
        if (token !== refreshToken || !host.value) return;

        const { default: QRCodeStyling } = await import('qr-code-styling');
        if (token !== refreshToken || !host.value) return;

        host.value.replaceChildren();
        qrInstance = new QRCodeStyling(options);
        qrInstance.append(host.value);
    } catch (e) {
        if (token !== refreshToken) return;
        error.value = e?.message || 'No se pudo generar el código QR.';
    }
}

onMounted(refresh);
onBeforeUnmount(() => {
    refreshToken += 1;
    qrInstance = null;
    host.value?.replaceChildren();
});

watch(
    () => props.data,
    () => {
        refresh();
    },
);

watch(
    () => props.qrStyle,
    () => {
        refresh();
    },
    { deep: true },
);
</script>

<template>
    <div class="flex flex-col items-center">
        <div
            class="grid w-full max-w-[320px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"
            :class="{ 'bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]': qrStyle.transparentBg }"
            aria-label="Vista previa del código QR"
        >
            <div ref="host" class="qr-host [&_canvas]:max-w-full [&_canvas]:h-auto" />
        </div>
        <p v-if="error" class="mt-2 text-center text-sm text-amber-800" role="status">{{ error }}</p>
    </div>
</template>
