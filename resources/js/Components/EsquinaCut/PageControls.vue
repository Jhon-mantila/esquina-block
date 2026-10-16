<script setup>
import SegmentedControl from '@/Components/SegmentedControl.vue';

const settings = defineModel({ type: Object, required: true });

defineProps({
    disabled: { type: Boolean, default: false },
    storageLabel: { type: String, default: '—' },
});

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
    { value: 'large', label: 'Grande' },
];

const titlePagesOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'first', label: 'Solo la primera' },
];

const gridLineOptions = [
    { value: 'solid', label: 'Línea fina' },
    { value: 'dotted', label: 'Punteada' },
];
</script>

<template>
    <fieldset :disabled="disabled" class="space-y-5 transition disabled:opacity-60">
        <legend class="sr-only">Página y título</legend>

        <div class="space-y-3">
            <h3 class="text-sm font-semibold text-slate-900">Título opcional</h3>
            <div>
                <label for="cut-titulo" class="mb-1.5 block text-sm font-medium text-slate-700">Título</label>
                <input
                    id="cut-titulo"
                    v-model="settings.title"
                    type="text"
                    maxlength="80"
                    placeholder="Ej. Stickers primavera"
                    class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
            </div>
            <div>
                <label for="cut-subtitulo" class="mb-1.5 block text-sm font-medium text-slate-700">Subtítulo</label>
                <input
                    id="cut-subtitulo"
                    v-model="settings.subtitle"
                    type="text"
                    maxlength="120"
                    placeholder="Opcional"
                    class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
            </div>
            <SegmentedControl
                v-model="settings.titleOn"
                legend="Mostrar título en"
                name="title-on"
                :options="titlePagesOptions"
            />
        </div>

        <div class="space-y-3 border-t border-slate-100 pt-5">
            <h3 class="text-sm font-semibold text-slate-900">Página</h3>
            <SegmentedControl v-model="settings.paper" legend="Tamaño de papel" name="cut-paper" :options="paperOptions" />
            <SegmentedControl v-model="settings.orientation" legend="Orientación" name="cut-orientation" :options="orientationOptions" />
            <SegmentedControl v-model="settings.margin" legend="Márgenes externos" name="cut-margin" :options="marginOptions" />

            <div>
                <label for="cell-gap" class="mb-1.5 block text-sm font-medium text-slate-700">
                    Espacio entre celdas ({{ settings.gap }} px)
                </label>
                <input id="cell-gap" v-model.number="settings.gap" type="range" min="0" max="20" class="w-full accent-blue-600" />
            </div>

            <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="settings.pageNumbers" type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Numeración de página («Página X de Y»)
            </label>
        </div>

        <div class="space-y-3 border-t border-slate-100 pt-5">
            <h3 class="text-sm font-semibold text-slate-900">Cuadrícula entre celdas</h3>
            <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="settings.cellGrid" type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Dibujar líneas entre celdas
            </label>
            <template v-if="settings.cellGrid">
                <SegmentedControl v-model="settings.cellGridStyle" legend="Estilo de la cuadrícula" name="cell-grid-style" :options="gridLineOptions" />
                <div>
                    <label for="cell-grid-color" class="mb-1.5 block text-sm font-medium text-slate-700">Color</label>
                    <div class="flex items-center gap-3">
                        <input
                            id="cell-grid-color"
                            v-model="settings.cellGridColor"
                            type="color"
                            class="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
                        />
                        <span class="text-sm text-slate-600">{{ settings.cellGridColor }}</span>
                    </div>
                </div>
            </template>
        </div>

        <div class="space-y-2 border-t border-slate-100 pt-5">
            <h3 class="text-sm font-semibold text-slate-900">Guardado local</h3>
            <label class="flex items-start gap-2 text-sm text-slate-700">
                <input v-model="settings.persist" type="checkbox" class="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>
                    Guardar mi progreso en este navegador
                    <span class="block text-xs text-slate-500">Las imágenes no salen de tu dispositivo. Se borran solas a los 7 días.</span>
                </span>
            </label>
            <p class="text-xs text-slate-500">Uso de almacenamiento: {{ storageLabel }}</p>
        </div>
    </fieldset>
</template>
