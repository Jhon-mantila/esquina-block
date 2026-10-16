<script setup>
import { ref } from 'vue';

defineProps({
    count: { type: Number, default: 0 },
    max: { type: Number, default: 60 },
    disabled: { type: Boolean, default: false },
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
        aria-label="Subir imágenes"
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
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p class="mt-3 font-semibold text-slate-800">
            <span class="hidden sm:inline">Arrastra tus imágenes aquí o </span>
            <span class="text-blue-700 underline">elige archivos</span>
        </p>
        <p class="mt-1 text-sm text-slate-500">JPG, PNG o WebP · máximo {{ max }} imágenes · 10 MB cada una</p>
        <p class="mt-1 text-sm font-medium text-slate-700">{{ count }} imágenes subidas (máximo {{ max }})</p>
        <p class="mt-3 text-xs text-slate-400">Tus imágenes no salen de tu dispositivo: todo se procesa en tu navegador.</p>

        <input
            ref="input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="hidden"
            :disabled="disabled"
            @change="onChange"
        />
    </div>
</template>
