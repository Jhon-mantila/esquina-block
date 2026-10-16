<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
    images: { type: Array, default: () => [] },
    cols: { type: Number, default: 3 },
    rows: { type: Number, default: 3 },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['remove', 'move-up', 'move-down', 'clear-all', 'reorder']);

const collapsed = ref(false);
const dragFrom = ref(null);
const dragOver = ref(null);

const perPage = computed(() => Math.max(1, props.cols * props.rows));
const gridCols = computed(() => Math.min(Math.max(2, props.cols), 5));

/** Con muchas imágenes, se recoge sola para no alargar el scroll. */
watch(
    () => props.images.length,
    (n, prev) => {
        if (n > perPage.value && (prev === undefined || prev <= perPage.value)) {
            collapsed.value = true;
        }
        if (n <= perPage.value) {
            collapsed.value = false;
        }
    },
    { immediate: true },
);

const previewCap = computed(() => gridCols.value * 2);
const visibleImages = computed(() =>
    collapsed.value ? props.images.slice(0, previewCap.value) : props.images,
);
const hiddenCount = computed(() =>
    collapsed.value ? Math.max(0, props.images.length - previewCap.value) : 0,
);

function pageOf(index) {
    return Math.floor(index / perPage.value) + 1;
}

function isPageStart(index) {
    return index > 0 && index % perPage.value === 0;
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
            <div class="flex flex-wrap items-center gap-2">
                <button
                    v-if="images.length > previewCap"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition"
                    :class="collapsed
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'border border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100'"
                    :aria-expanded="!collapsed"
                    @click="collapsed = !collapsed"
                >
                    <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        aria-hidden="true"
                    >
                        <path
                            v-if="collapsed"
                            d="M6 9l6 6 6-6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <path
                            v-else
                            d="M18 15l-6-6-6 6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    {{ collapsed ? `Desplegar todas (${images.length})` : 'Recoger' }}
                </button>
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
        </div>

        <p v-if="!images.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aún no hay imágenes. Sube varias para armar tu plantilla.
        </p>

        <div
            v-else
            class="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
        >
            <ul
                class="grid gap-2 sm:gap-3"
                :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }"
            >
                <template v-for="(image, index) in visibleImages" :key="image.id">
                    <li
                        v-if="isPageStart(index)"
                        class="col-span-full flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                        aria-hidden="true"
                    >
                        <span class="h-px flex-1 bg-slate-200" />
                        Página {{ pageOf(index) }}
                        <span class="h-px flex-1 bg-slate-200" />
                    </li>
                    <li
                        :draggable="!disabled"
                        class="group relative aspect-square overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200 transition"
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

            <button
                v-if="hiddenCount > 0"
                type="button"
                class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                @click="collapsed = false"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                +{{ hiddenCount }} más · Desplegar todas
            </button>
        </div>

        <div v-if="images.length" class="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-slate-500">
                Misma cuadrícula que la hoja ({{ cols }} columnas). Arrastra una miniatura para reordenar.
            </p>
            <button
                v-if="images.length > previewCap && !collapsed"
                type="button"
                class="inline-flex items-center gap-1 rounded-lg border border-blue-600 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                @click="collapsed = true"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M18 15l-6-6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Recoger lista
            </button>
        </div>
    </section>
</template>
