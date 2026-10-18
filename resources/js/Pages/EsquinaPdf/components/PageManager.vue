<script setup>
import { computed } from 'vue';
import PageThumb from './PageThumb.vue';

const props = defineProps({
    pdf: { type: Object, default: null },
    pageCount: { type: Number, default: 0 },
    selected: { type: Array, default: () => [] },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:selected']);

const selectedSet = computed(() => new Set(props.selected));

const pages = computed(() =>
    Array.from({ length: props.pageCount }, (_, i) => i + 1),
);

function toggle(pageIndex0) {
    const next = new Set(props.selected);
    if (next.has(pageIndex0)) next.delete(pageIndex0);
    else next.add(pageIndex0);
    emit('update:selected', [...next].sort((a, b) => a - b));
}

function selectAll() {
    emit(
        'update:selected',
        Array.from({ length: props.pageCount }, (_, i) => i),
    );
}

function clearSelection() {
    emit('update:selected', []);
}
</script>

<template>
    <div>
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-slate-600">
                Páginas marcadas:
                <strong class="text-slate-900">{{ selected.length }}</strong>
                de
                <strong class="text-slate-900">{{ pageCount }}</strong>
            </p>
            <div class="flex gap-2 text-sm">
                <button
                    type="button"
                    class="font-medium text-blue-700 hover:underline disabled:text-slate-400"
                    :disabled="disabled || !pageCount"
                    @click="selectAll"
                >
                    Marcar todas
                </button>
                <button
                    type="button"
                    class="font-medium text-slate-600 hover:underline disabled:text-slate-400"
                    :disabled="disabled || !selected.length"
                    @click="clearSelection"
                >
                    Limpiar
                </button>
            </div>
        </div>

        <p v-if="!pdf || !pageCount" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Sube un PDF para ver las miniaturas de cada página.
        </p>

        <ul
            v-else
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
        >
            <li v-for="n in pages" :key="n">
                <PageThumb
                    :pdf="pdf"
                    :page-number="n"
                    :selected="selectedSet.has(n - 1)"
                    :disabled="disabled"
                    @toggle="toggle(n - 1)"
                />
            </li>
        </ul>
    </div>
</template>
