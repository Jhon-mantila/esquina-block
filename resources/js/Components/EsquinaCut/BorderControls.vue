<script setup>
import SegmentedControl from '@/Components/SegmentedControl.vue';

const settings = defineModel({ type: Object, required: true });

defineProps({
    disabled: { type: Boolean, default: false },
});

const shapeOptions = [
    { value: 'rect', label: 'Rectángulo' },
    { value: 'circle', label: 'Círculo' },
    { value: 'silhouette', label: 'Silueta' },
];

const styleOptions = [
    { value: 'solid', label: 'Sólida' },
    { value: 'dashed', label: 'Discontinua' },
    { value: 'dotted', label: 'Punteada' },
    { value: 'none', label: 'Ninguna' },
];
</script>

<template>
    <fieldset :disabled="disabled" class="space-y-4 transition disabled:opacity-60">
        <legend class="sr-only">Contorno de corte</legend>
        <SegmentedControl v-model="settings.shape" legend="Forma" name="border-shape" :options="shapeOptions" />
        <SegmentedControl v-model="settings.style" legend="Estilo de línea" name="border-style" :options="styleOptions" />

        <div class="grid gap-4 sm:grid-cols-2">
            <div>
                <label for="border-thickness" class="mb-1.5 block text-sm font-medium text-slate-700">
                    Grosor ({{ settings.thickness }} px)
                </label>
                <input
                    id="border-thickness"
                    v-model.number="settings.thickness"
                    type="range"
                    min="1"
                    max="5"
                    class="w-full accent-blue-600"
                    :disabled="settings.style === 'none'"
                />
            </div>
            <div>
                <label for="border-padding" class="mb-1.5 block text-sm font-medium text-slate-700">
                    Separación ({{ settings.padding }} px)
                </label>
                <input
                    id="border-padding"
                    v-model.number="settings.padding"
                    type="range"
                    min="0"
                    max="20"
                    class="w-full accent-blue-600"
                    :disabled="settings.style === 'none'"
                />
            </div>
        </div>

        <div>
            <label for="border-color" class="mb-1.5 block text-sm font-medium text-slate-700">Color del contorno</label>
            <div class="flex items-center gap-3">
                <input
                    id="border-color"
                    v-model="settings.color"
                    type="color"
                    class="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
                    :disabled="settings.style === 'none'"
                />
                <span class="text-sm text-slate-600">{{ settings.color }}</span>
            </div>
            <p class="mt-1.5 text-xs text-slate-500">
                La guía se dibuja alrededor de la imagen, sin tapar sus píxeles.
                <span v-if="settings.shape === 'silhouette'">
                    La silueta dibuja la figura general (no cada detalle del borde). Mejor con PNG transparente; si es opaca, se usa el rectángulo.
                </span>
            </p>
        </div>
    </fieldset>
</template>
