<script setup>
import { trackSubirLogoQr } from '@/analytics';
import { validateLogoFile } from '../validateQr.js';

const props = defineProps({
    modelValue: { type: Object, required: true },
});

const emit = defineEmits(['update:modelValue']);

const fieldClass =
    'mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

const colorClass =
    'h-8 w-11 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5';

const sectionClass = 'rounded-xl border border-slate-200 bg-slate-50/70 p-3';
const titleClass = 'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500';

const DOT_TYPES = [
    { id: 'square', label: 'Cuadrado' },
    { id: 'dots', label: 'Puntos' },
    { id: 'rounded', label: 'Redondeado' },
    { id: 'extra-rounded', label: 'Muy redondeado' },
    { id: 'classy', label: 'Classy' },
    { id: 'classy-rounded', label: 'Classy redondeado' },
];

const CORNER_SQUARE_TYPES = [
    { id: 'square', label: 'Cuadrado' },
    { id: 'dot', label: 'Círculo' },
    { id: 'extra-rounded', label: 'Redondeado' },
];

const CORNER_DOT_TYPES = [
    { id: 'square', label: 'Cuadrado' },
    { id: 'dot', label: 'Círculo' },
];

function patch(partial) {
    Object.assign(props.modelValue, partial);
    emit('update:modelValue', props.modelValue);
}

function onLogoPick(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const logoError = validateLogoFile(file);
    if (logoError) {
        patch({ logoError });
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
        patch({ logoError: 'No se pudo leer el archivo del logo.' });
    };
    reader.onload = () => {
        trackSubirLogoQr();
        patch({
            logoSrc: String(reader.result || ''),
            logoName: file.name,
            logoError: '',
        });
    };
    reader.readAsDataURL(file);
}

function clearLogo() {
    patch({ logoSrc: '', logoName: '', logoError: '' });
}
</script>

<template>
    <div class="space-y-3 text-sm">
        <section :class="sectionClass">
            <h3 :class="titleClass">Forma y puntos</h3>
            <div class="grid gap-3 sm:grid-cols-2">
                <div>
                    <p class="font-medium text-slate-700">Forma global</p>
                    <div class="mt-1.5 flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            class="rounded-md px-2.5 py-1 text-xs font-medium"
                            :class="modelValue.shape === 'square' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'"
                            @click="patch({ shape: 'square' })"
                        >
                            Cuadrada
                        </button>
                        <button
                            type="button"
                            class="rounded-md px-2.5 py-1 text-xs font-medium"
                            :class="modelValue.shape === 'circle' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'"
                            @click="patch({ shape: 'circle' })"
                        >
                            Circular
                        </button>
                    </div>
                </div>
                <label class="block font-medium text-slate-700">
                    Estilo de puntos
                    <select
                        :class="fieldClass"
                        :value="modelValue.dotsType"
                        @change="patch({ dotsType: $event.target.value })"
                    >
                        <option v-for="item in DOT_TYPES" :key="item.id" :value="item.id">{{ item.label }}</option>
                    </select>
                </label>
            </div>
        </section>

        <section :class="sectionClass">
            <h3 :class="titleClass">Colores</h3>
            <div class="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                <label class="flex items-center gap-2 font-medium text-slate-700">
                    <input
                        type="color"
                        :class="colorClass"
                        :value="modelValue.dotsColor"
                        @input="patch({ dotsColor: $event.target.value })"
                    />
                    <span>Puntos</span>
                </label>
                <label
                    v-if="!modelValue.transparentBg"
                    class="flex items-center gap-2 font-medium text-slate-700"
                >
                    <input
                        type="color"
                        :class="colorClass"
                        :value="modelValue.background"
                        @input="patch({ background: $event.target.value })"
                    />
                    <span>Fondo</span>
                </label>
                <label
                    v-if="modelValue.useGradient"
                    class="flex items-center gap-2 font-medium text-slate-700"
                >
                    <input
                        type="color"
                        :class="colorClass"
                        :value="modelValue.gradientColor2"
                        @input="patch({ gradientColor2: $event.target.value })"
                    />
                    <span>Degradado</span>
                </label>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200/80 pt-2">
                <label class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <input
                        type="checkbox"
                        class="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        :checked="modelValue.useGradient"
                        @change="patch({ useGradient: $event.target.checked })"
                    />
                    Degradado lineal
                </label>
                <label class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <input
                        type="checkbox"
                        class="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        :checked="modelValue.transparentBg"
                        @change="patch({ transparentBg: $event.target.checked })"
                    />
                    Fondo transparente
                </label>
            </div>
            <label
                v-if="modelValue.useGradient"
                class="mt-2 block font-medium text-slate-700"
            >
                Ángulo {{ modelValue.gradientAngle }}°
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    class="mt-1 w-full"
                    :value="modelValue.gradientAngle"
                    @input="patch({ gradientAngle: Number($event.target.value) })"
                />
            </label>
        </section>

        <section :class="sectionClass">
            <h3 :class="titleClass">Logo</h3>
            <div class="flex gap-3">
                <div
                    class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white"
                >
                    <img
                        v-if="modelValue.logoSrc"
                        :src="modelValue.logoSrc"
                        alt="Logo cargado"
                        class="h-full w-full object-contain p-1"
                    />
                    <span v-else class="px-1 text-center text-[10px] leading-tight text-slate-400">Sin logo</span>
                </div>

                <div class="min-w-0 flex-1 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <label class="inline-flex cursor-pointer items-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                            {{ modelValue.logoSrc ? 'Cambiar' : 'Subir logo' }}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                                class="hidden"
                                @change="onLogoPick"
                            />
                        </label>
                        <button
                            v-if="modelValue.logoSrc"
                            type="button"
                            class="text-xs font-medium text-blue-700 hover:underline"
                            @click="clearLogo"
                        >
                            Quitar
                        </button>
                        <span
                            v-if="modelValue.logoSrc"
                            class="truncate text-xs text-slate-500"
                            :title="modelValue.logoName"
                        >
                            {{ modelValue.logoName || 'Logo listo' }}
                        </span>
                    </div>

                    <p
                        v-if="modelValue.logoError"
                        class="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900"
                        role="alert"
                    >
                        {{ modelValue.logoError }}
                    </p>

                    <template v-if="modelValue.logoSrc">
                        <div class="grid gap-2 border-t border-slate-200/80 pt-2 sm:grid-cols-3">
                            <label class="block font-medium text-slate-700">
                                Tamaño {{ Math.round(modelValue.logoSize * 100) }}%
                                <input
                                    type="range"
                                    min="0.15"
                                    max="0.45"
                                    step="0.01"
                                    class="mt-1 w-full"
                                    :value="modelValue.logoSize"
                                    @input="patch({ logoSize: Number($event.target.value) })"
                                />
                            </label>
                            <label class="block font-medium text-slate-700">
                                Margen {{ modelValue.logoMargin }}px
                                <input
                                    type="range"
                                    min="0"
                                    max="24"
                                    step="1"
                                    class="mt-1 w-full"
                                    :value="modelValue.logoMargin"
                                    @input="patch({ logoMargin: Number($event.target.value) })"
                                />
                            </label>
                            <label class="block font-medium text-slate-700">
                                Radio {{ modelValue.logoCornerRadius }}px
                                <input
                                    type="range"
                                    min="0"
                                    max="80"
                                    step="1"
                                    class="mt-1 w-full"
                                    :value="modelValue.logoCornerRadius"
                                    @input="patch({ logoCornerRadius: Number($event.target.value) })"
                                />
                            </label>
                        </div>
                        <label class="inline-flex items-center gap-1.5 font-medium text-slate-700">
                            <input
                                type="checkbox"
                                class="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                :checked="modelValue.hideBackgroundDots"
                                @change="patch({ hideBackgroundDots: $event.target.checked })"
                            />
                            Ocultar puntos detrás del logo
                        </label>
                    </template>
                    <p v-else class="text-xs text-slate-500">PNG, SVG, JPG o WebP · solo en tu navegador</p>
                </div>
            </div>
        </section>

        <section :class="sectionClass">
            <h3 :class="titleClass">Esquinas (ojos)</h3>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label class="block font-medium text-slate-700">
                    Marco
                    <select
                        :class="fieldClass"
                        :value="modelValue.cornersSquareType"
                        @change="patch({ cornersSquareType: $event.target.value })"
                    >
                        <option v-for="item in CORNER_SQUARE_TYPES" :key="item.id" :value="item.id">{{ item.label }}</option>
                    </select>
                </label>
                <label class="flex flex-col font-medium text-slate-700">
                    Color marco
                    <input
                        type="color"
                        :class="[colorClass, 'mt-1']"
                        :value="modelValue.cornersSquareColor"
                        @input="patch({ cornersSquareColor: $event.target.value })"
                    />
                </label>
                <label class="block font-medium text-slate-700">
                    Punto
                    <select
                        :class="fieldClass"
                        :value="modelValue.cornersDotType"
                        @change="patch({ cornersDotType: $event.target.value })"
                    >
                        <option v-for="item in CORNER_DOT_TYPES" :key="item.id" :value="item.id">{{ item.label }}</option>
                    </select>
                </label>
                <label class="flex flex-col font-medium text-slate-700">
                    Color punto
                    <input
                        type="color"
                        :class="[colorClass, 'mt-1']"
                        :value="modelValue.cornersDotColor"
                        @input="patch({ cornersDotColor: $event.target.value })"
                    />
                </label>
            </div>
        </section>

        <section :class="sectionClass">
            <h3 :class="titleClass">Tamaño y calidad</h3>
            <div class="grid gap-3 sm:grid-cols-3">
                <label class="block font-medium text-slate-700">
                    Corrección
                    <select
                        :class="fieldClass"
                        :value="modelValue.errorCorrection"
                        @change="patch({ errorCorrection: $event.target.value })"
                    >
                        <option value="L">L (~7%)</option>
                        <option value="M">M (~15%)</option>
                        <option value="Q">Q (~25%)</option>
                        <option value="H">H (~30%)</option>
                    </select>
                </label>
                <label class="block font-medium text-slate-700">
                    Tamaño {{ modelValue.size }}px
                    <input
                        type="range"
                        min="180"
                        max="360"
                        step="10"
                        class="mt-2 w-full"
                        :value="modelValue.size"
                        @input="patch({ size: Number($event.target.value) })"
                    />
                </label>
                <label class="block font-medium text-slate-700">
                    Margen {{ modelValue.margin }}px
                    <input
                        type="range"
                        min="0"
                        max="40"
                        step="1"
                        class="mt-2 w-full"
                        :value="modelValue.margin"
                        @input="patch({ margin: Number($event.target.value) })"
                    />
                </label>
            </div>
        </section>
    </div>
</template>
