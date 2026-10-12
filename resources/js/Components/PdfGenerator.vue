<script setup>
defineProps({
    disabled: { type: Boolean, default: false },
    generating: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
    pages: { type: Number, required: true },
    posterSize: { type: String, default: null },
    quality: { type: Object, default: null },
    done: { type: Boolean, default: false },
    error: { type: String, default: null },
});

defineEmits(['generate']);
</script>

<template>
    <div class="space-y-4">
        <dl class="grid grid-cols-2 gap-3 text-sm">
            <div class="rounded-lg bg-slate-50 p-3">
                <dt class="text-slate-500">Hojas a imprimir</dt>
                <dd class="text-lg font-semibold text-slate-900">{{ pages }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
                <dt class="text-slate-500">Tamaño del póster</dt>
                <dd class="text-lg font-semibold text-slate-900">{{ posterSize ?? '—' }}</dd>
            </div>
            <div v-if="quality" class="col-span-2 flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <dt class="text-slate-500">Calidad de impresión</dt>
                <dd
                    class="rounded-full px-2.5 py-0.5 text-sm font-semibold"
                    :class="{
                        'bg-emerald-100 text-emerald-800': quality.level === 'high',
                        'bg-blue-100 text-blue-800': quality.level === 'medium',
                        'bg-amber-100 text-amber-900': quality.level === 'low',
                        'bg-red-100 text-red-800': quality.level === 'very-low',
                    }"
                >
                    {{ quality.label }} · {{ quality.dpi }} DPI
                </dd>
            </div>
        </dl>

        <p
            v-if="quality && (quality.level === 'low' || quality.level === 'very-low')"
            class="rounded-lg p-3 text-xs"
            :class="quality.level === 'very-low' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'"
        >
            Tu imagen se verá pixelada a este tamaño. Usa menos hojas o una imagen con más resolución (lo ideal son 100 DPI o más).
        </p>

        <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="{
                'bg-blue-600 hover:bg-blue-700': !disabled && !generating,
                'cursor-wait bg-blue-600': generating,
                'cursor-not-allowed bg-slate-300': disabled && !generating,
            }"
            :disabled="disabled || generating"
            :aria-busy="generating"
            @click="$emit('generate')"
        >
            <svg v-if="generating" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            {{ generating ? `Generando PDF… ${progress}%` : 'Descargar PDF' }}
        </button>

        <div v-if="generating" class="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
        </div>

        <p v-if="disabled" class="text-center text-xs text-slate-500">Sube una imagen para activar la descarga.</p>
        <p v-else-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error }}</p>
        <p v-else-if="done && !generating" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
            ¡Listo! Tu PDF se descargó. Si no lo ves, revisa la carpeta de descargas.
        </p>
    </div>
</template>
