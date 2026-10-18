<script setup>
import { onMounted, ref, watch } from 'vue';
import AddTextPanel from './components/AddTextPanel.vue';
import DeletePagesPanel from './components/DeletePagesPanel.vue';
import ImagesToPdfPanel from './components/ImagesToPdfPanel.vue';
import MergePdfsPanel from './components/MergePdfsPanel.vue';

const MODES = [
    { id: 'merge', label: 'Unir PDFs', short: 'Unir' },
    { id: 'delete', label: 'Eliminar páginas', short: 'Eliminar' },
    { id: 'text', label: 'Añadir texto/imagen', short: 'Añadir' },
    { id: 'images', label: 'Imágenes a PDF', short: 'Imágenes' },
];

const STORAGE_KEY = 'esquinapdf.mode.v1';

const mode = ref('merge');

function selectMode(id) {
    if (MODES.some((item) => item.id === id)) {
        mode.value = id;
    }
}

onMounted(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && MODES.some((item) => item.id === saved)) {
            mode.value = saved;
        }
    } catch {
        // localStorage no disponible
    }
});

watch(mode, (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // ignore
    }
});
</script>

<template>
    <div class="mx-auto max-w-6xl px-4 pb-16">
        <div
            class="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="tablist"
            aria-label="Modo de Esquina PDF"
        >
            <button
                v-for="item in MODES"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="mode === item.id"
                :aria-controls="`panel-${item.id}`"
                class="rounded-lg px-2 py-2.5 text-center text-sm font-semibold transition sm:px-3"
                :class="mode === item.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700'"
                @click="selectMode(item.id)"
            >
                <span class="sm:hidden">{{ item.short }}</span>
                <span class="hidden sm:inline">{{ item.label }}</span>
            </button>
        </div>

        <div
            v-show="mode === 'merge'"
            id="panel-merge"
            role="tabpanel"
            aria-label="Unir PDFs"
        >
            <MergePdfsPanel />
        </div>
        <div
            v-show="mode === 'delete'"
            id="panel-delete"
            role="tabpanel"
            aria-label="Eliminar páginas"
        >
            <DeletePagesPanel />
        </div>
        <div
            v-show="mode === 'text'"
            id="panel-text"
            role="tabpanel"
            aria-label="Añadir texto o imagen"
        >
            <AddTextPanel />
        </div>
        <div
            v-show="mode === 'images'"
            id="panel-images"
            role="tabpanel"
            aria-label="Imágenes a PDF"
        >
            <ImagesToPdfPanel />
        </div>
    </div>
</template>
