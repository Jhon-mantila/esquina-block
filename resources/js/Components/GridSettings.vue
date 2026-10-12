<script setup>
import SegmentedControl from './SegmentedControl.vue';

defineProps({
    disabled: { type: Boolean, default: false },
});

const settings = defineModel({ type: Object, required: true });

const paperOptions = [
    { value: 'a4', label: 'A4' },
    { value: 'letter', label: 'Carta' },
];

const orientationOptions = [
    { value: 'portrait', label: 'Vertical' },
    { value: 'landscape', label: 'Horizontal' },
];

const marginOptions = [
    { value: 'none', label: 'Ninguno' },
    { value: 'small', label: 'Pequeño' },
    { value: 'medium', label: 'Mediano' },
];

const overlapOptions = [
    { value: 0, label: 'No' },
    { value: 5, label: '5 mm' },
    { value: 10, label: '10 mm' },
];

const gridFields = [
    { key: 'cols', label: 'Columnas (ancho)' },
    { key: 'rows', label: 'Filas (alto)' },
];

function clamp(value) {
    return Math.min(10, Math.max(1, Math.round(Number(value) || 1)));
}
</script>

<template>
    <fieldset :disabled="disabled" class="space-y-5 transition disabled:opacity-60">
        <div v-for="field in gridFields" :key="field.key">
            <div class="mb-2 flex items-center justify-between">
                <label :for="`range-${field.key}`" class="text-sm font-medium text-slate-700">{{ field.label }}</label>
                <input
                    type="number"
                    min="1"
                    max="10"
                    :value="settings[field.key]"
                    :aria-label="field.label"
                    class="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    @change="settings[field.key] = clamp($event.target.value); $event.target.value = settings[field.key]"
                />
            </div>
            <input
                :id="`range-${field.key}`"
                v-model.number="settings[field.key]"
                type="range"
                min="1"
                max="10"
                class="w-full accent-blue-600"
            />
        </div>

        <SegmentedControl v-model="settings.paper" legend="Tamaño de papel" name="paper" :options="paperOptions" />
        <SegmentedControl v-model="settings.orientation" legend="Orientación de cada hoja" name="orientation" :options="orientationOptions" />
        <div>
            <SegmentedControl v-model="settings.margin" legend="Márgenes" name="margin" :options="marginOptions" />
            <p v-if="settings.margin === 'none'" class="mt-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                La mayoría de impresoras domésticas no imprimen hasta el borde: perderás unos milímetros de imagen en cada hoja y no habrá marcas de corte ni número de hoja.
            </p>
        </div>

        <div>
            <SegmentedControl v-model="settings.overlap" legend="Solapamiento entre hojas" name="overlap" :options="overlapOptions" />
            <p class="mt-1.5 text-xs text-slate-500">Repite un borde de imagen entre hojas vecinas para pegarlas sin huecos.</p>
        </div>

        <label class="flex items-center gap-3" :class="settings.margin === 'none' ? 'opacity-50' : 'cursor-pointer'">
            <input v-model="settings.cutMarks" type="checkbox" class="h-4 w-4 rounded accent-blue-600" :disabled="settings.margin === 'none'" />
            <span class="text-sm text-slate-700">Imprimir marcas de corte</span>
        </label>
    </fieldset>
</template>
