<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';

const props = defineProps({
    pdf: { type: Object, required: true },
    pageNumber: { type: Number, required: true },
    selected: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle']);

const root = ref(null);
const canvas = ref(null);
const loading = ref(true);
const failed = ref(false);
const failMsg = ref('');
let observer = null;
let rendered = false;

async function render() {
    if (rendered || !canvas.value || !props.pdf) return;
    loading.value = true;
    failed.value = false;
    failMsg.value = '';
    try {
        const { renderPageToCanvas } = await import('../pdfjsClient.js');
        // toRaw: evita Proxy de Vue sobre el PDFDocumentProxy de pdf.js.
        await renderPageToCanvas(toRaw(props.pdf), props.pageNumber, canvas.value, 168);
        rendered = true;
    } catch (e) {
        failed.value = true;
        failMsg.value = e?.message || 'No se pudo dibujar la página';
        console.warn('[Esquina PDF] miniatura', props.pageNumber, e);
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await nextTick();
    observer = new IntersectionObserver(
        (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                render();
                observer?.disconnect();
            }
        },
        { rootMargin: '120px', threshold: 0 },
    );
    if (root.value) {
        observer.observe(root.value);
        // Si ya está visible, algunos navegadores no disparan el observer al instante.
        const rect = root.value.getBoundingClientRect();
        if (rect.width > 0 && rect.top < window.innerHeight + 120 && rect.bottom > -120) {
            render();
            observer.disconnect();
        }
    }
});

onBeforeUnmount(() => {
    observer?.disconnect();
});

watch(
    () => props.pdf,
    () => {
        rendered = false;
        render();
    },
);
</script>

<template>
    <button
        ref="root"
        type="button"
        class="group relative w-full overflow-hidden rounded-xl border text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="selected
            ? 'border-red-400 bg-red-50/40 opacity-60'
            : 'border-slate-200 bg-white hover:border-blue-300'"
        :disabled="disabled"
        :aria-pressed="selected"
        :aria-label="selected
            ? `Página ${pageNumber}, marcada para eliminar`
            : `Página ${pageNumber}, clic para marcar`"
        @click="emit('toggle')"
    >
        <div class="relative aspect-[3/4] w-full bg-slate-100">
            <canvas ref="canvas" class="mx-auto block h-full max-h-full w-auto max-w-full object-contain" />
            <p
                v-if="loading"
                class="absolute inset-0 grid place-items-center text-xs text-slate-500"
            >
                …
            </p>
            <p
                v-else-if="failed"
                class="absolute inset-0 grid place-items-center px-2 text-center text-[11px] leading-snug text-red-600"
            >
                {{ failMsg || 'Sin vista previa' }}
            </p>
            <div
                v-if="selected"
                class="pointer-events-none absolute inset-0 bg-red-500/15"
                aria-hidden="true"
            />
            <span
                v-if="selected"
                class="absolute right-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
            >
                Quitar
            </span>
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-2 py-1.5">
            <span class="text-xs font-semibold text-slate-700">Pág. {{ pageNumber }}</span>
            <span
                class="grid h-5 w-5 place-items-center rounded border text-[10px]"
                :class="selected
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-slate-300 bg-white text-transparent'"
                aria-hidden="true"
            >
                ✓
            </span>
        </div>
    </button>
</template>
