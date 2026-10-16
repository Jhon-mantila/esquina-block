<script setup>
import { computed } from 'vue';
import SegmentedControl from '@/Components/SegmentedControl.vue';

const settings = defineModel({ type: Object, required: true });

defineProps({
    disabled: { type: Boolean, default: false },
});

const colOptions = [2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }));
const rowOptions = [2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }));

const perPage = computed(() => settings.value.cols * settings.value.rows);
</script>

<template>
    <fieldset :disabled="disabled" class="space-y-4 transition disabled:opacity-60">
        <legend class="sr-only">Cuadrícula</legend>
        <SegmentedControl v-model="settings.cols" legend="Columnas" name="cut-cols" :options="colOptions" />
        <SegmentedControl v-model="settings.rows" legend="Filas" name="cut-rows" :options="rowOptions" />
        <p class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Cada página tendrá <strong>{{ perPage }}</strong> imágenes
            ({{ settings.cols }} columnas × {{ settings.rows }} filas).
        </p>
    </fieldset>
</template>
