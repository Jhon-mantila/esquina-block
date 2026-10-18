<script setup>
import { ref } from 'vue';

defineProps({
    count: { type: Number, default: 0 },
    max: { type: Number, default: 30 },
    multiple: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    hint: { type: String, default: 'PDF · máximo 25 MB cada uno' },
});

const emit = defineEmits(['select']);

const input = ref(null);
const dragging = ref(false);

function onChange(event) {
    const files = [...(event.target.files || [])];
    if (files.length) emit('select', files);
    event.target.value = '';
}

function onDrop(event) {
    dragging.value = false;
    if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
    const files = [...(event.dataTransfer.files || [])];
    if (files.length) emit('select', files);
}
</script>

<template>
    <div
        role="button"
        tabindex="0"
        aria-label="Subir PDFs"
        :aria-disabled="disabled ? 'true' : 'false'"
        class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :class="[
            disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60' : 'cursor-pointer',
            !disabled && dragging ? 'border-blue-500 bg-blue-50' : '',
            !disabled && !dragging ? 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50' : '',
        ]"
        @click="!disabled && input?.click()"
        @keydown.enter.prevent="!disabled && input?.click()"
        @keydown.space.prevent="!disabled && input?.click()"
        @dragover.prevent="!disabled && (dragging = true)"
        @dragleave.prevent="dragging = false"
        @drop.prevent.stop="onDrop"
    >
        <svg class="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        <p class="mt-3 font-semibold text-slate-800">
            <span class="hidden sm:inline">Arrastra tus PDFs aquí o </span>
            <span class="text-blue-700 underline">elige archivos</span>
        </p>
        <p class="mt-1 text-sm text-slate-500">{{ hint }}</p>
        <p v-if="multiple" class="mt-1 text-sm font-medium text-slate-700">
            {{ count }} PDF{{ count === 1 ? '' : 's' }} (máximo {{ max }})
        </p>
        <p class="mt-3 text-xs text-slate-400">Tus archivos no salen de tu dispositivo: todo se procesa en tu navegador.</p>

        <input
            ref="input"
            type="file"
            accept="application/pdf,.pdf"
            :multiple="multiple"
            class="hidden"
            :disabled="disabled"
            @change="onChange"
        />
    </div>
</template>
