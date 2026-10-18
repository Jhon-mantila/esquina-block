<script setup>
import { ref } from 'vue';

const props = defineProps({
    images: { type: Array, default: () => [] },
    cols: { type: Number, default: 3 },
    rows: { type: Number, default: 3 },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['remove', 'move-up', 'move-down', 'clear-all', 'reorder']);

const dragFrom = ref(null);
const dragOver = ref(null);

function pageOf(index) {
    const perPage = Math.max(1, props.cols * props.rows);
    return Math.floor(index / perPage) + 1;
}

function isPageStart(index) {
    const perPage = Math.max(1, props.cols * props.rows);
    return index > 0 && index % perPage === 0;
}

function onDragStart(index, event) {
    if (event.target.closest('button')) {
        event.preventDefault();
        return;
    }
    dragFrom.value = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
}

function onDragOver(index, event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOver.value = index;
}

function onDrop(index, event) {
    event.preventDefault();
    const from = dragFrom.value ?? Number(event.dataTransfer.getData('text/plain'));
    dragFrom.value = null;
    dragOver.value = null;
    if (Number.isInteger(from) && from !== index) {
        emit('reorder', from, index);
    }
}

function onDragEnd() {
    dragFrom.value = null;
    dragOver.value = null;
}
</script>

<template>
    <section aria-labelledby="lista-imagenes-titulo">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="lista-imagenes-titulo" class="font-semibold text-slate-900">
                Orden en la hoja
                <span class="font-normal text-slate-500">
                    ({{ images.length }} · {{ cols }}×{{ rows }})
                </span>
            </h3>
            <button
                v-if="images.length"
                type="button"
                class="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
                :disabled="disabled"
                @click="$emit('clear-all')"
            >
                Eliminar todas
            </button>
        </div>

        <p v-if="!images.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay imágenes. Sube varias para armar tu plantilla.
        </p>

        <div
            v-else
            class="rounded-xl border border-slate-200 bg-white p-3"
        >
            <ul class="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
                <template v-for="(image, index) in images" :key="image.id">
                    <li
                        v-if="isPageStart(index)"
                        class="flex w-6 shrink-0 flex-col items-center justify-center gap-1 self-stretch text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                        aria-hidden="true"
                        :title="`Página ${pageOf(index)}`"
                    >
                        <span class="w-px flex-1 bg-slate-200" />
                        P{{ pageOf(index) }}
                        <span class="w-px flex-1 bg-slate-200" />
                    </li>
                    <li
                        :draggable="!disabled"
                        class="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200 transition"
                        :class="[
                            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
                            dragOver === index ? 'ring-2 ring-blue-500' : '',
                            dragFrom === index ? 'opacity-50' : '',
                        ]"
                        :title="`${image.name} · posición ${index + 1}`"
                        @dragstart="onDragStart(index, $event)"
                        @dragover="onDragOver(index, $event)"
                        @drop="onDrop(index, $event)"
                        @dragend="onDragEnd"
                    >
                        <img
                            v-if="image.previewUrl"
                            :src="image.previewUrl"
                            :alt="image.name"
                            class="pointer-events-none h-full w-full object-contain p-1"
                            draggable="false"
                        />
                        <div v-else class="grid h-full place-items-center text-xs text-slate-400">IMG</div>

                        <span
                            class="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        >
                            {{ index + 1 }}
                        </span>

                        <div
                            class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 bg-gradient-to-t from-slate-900/60 to-transparent p-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                        >
                            <div class="flex gap-0.5">
                                <button
                                    type="button"
                                    class="rounded bg-white/95 p-1 text-slate-700 shadow-sm hover:bg-white disabled:opacity-40"
                                    :disabled="disabled || index === 0"
                                    :aria-label="`Subir ${image.name}`"
                                    @click="$emit('move-up', index)"
                                >
                                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                </button>
                                <button
                                    type="button"
                                    class="rounded bg-white/95 p-1 text-slate-700 shadow-sm hover:bg-white disabled:opacity-40"
                                    :disabled="disabled || index === images.length - 1"
                                    :aria-label="`Bajar ${image.name}`"
                                    @click="$emit('move-down', index)"
                                >
                                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                </button>
                            </div>
                            <button
                                type="button"
                                class="rounded bg-white/95 p-1 text-red-600 shadow-sm hover:bg-white disabled:opacity-40"
                                :disabled="disabled"
                                :aria-label="`Eliminar ${image.name}`"
                                @click="$emit('remove', index)"
                            >
                                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 7h12M9 7V5h6v2m-7 0 1 12h6l1-12" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            </button>
                        </div>
                    </li>
                </template>
            </ul>
            <p class="mt-2 text-xs text-slate-500">
                Una fila · desliza horizontalmente · arrastra para reordenar.
            </p>
        </div>
    </section>
</template>
