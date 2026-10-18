<script setup>
import { computed, ref } from 'vue';
import {
    BUNDLED_FONTS,
    isBundledFont,
    loadBundledFont,
    STANDARD_FONTS,
} from '../bundledFonts.js';

const props = defineProps({
    overlay: { type: Object, default: null },
    disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update', 'remove', 'error']);

const fontInput = ref(null);
const loadingFont = ref(false);

const ALIGNS = [
    { id: 'left', label: 'Izquierda' },
    { id: 'center', label: 'Centro' },
    { id: 'right', label: 'Derecha' },
];

const SHAPE_LABELS = {
    square: 'Cuadrado',
    rect: 'Rectángulo',
    circle: 'Círculo',
    triangle: 'Triángulo',
};

const fontSelectValue = computed(() => {
    const o = props.overlay;
    if (!o) return 'Helvetica';
    if (o.fontFamily === 'custom') return 'custom';
    return o.fontFamily || 'Helvetica';
});

const isCustom = computed(() => props.overlay?.fontFamily === 'custom');
const isBundled = computed(() => isBundledFont(props.overlay?.fontFamily));
const shapeLabel = computed(() => SHAPE_LABELS[props.overlay?.shape] || 'Figura');
const hasFill = computed(() => {
    const c = props.overlay?.fillColor;
    return !!c && c !== 'transparent';
});

async function onFontFamilyChange(event) {
    const value = event.target.value;
    if (value === 'custom') return;

    if (isBundledFont(value)) {
        loadingFont.value = true;
        try {
            const packed = await loadBundledFont(value, !!props.overlay?.bold);
            emit('update', {
                fontFamily: value,
                fontKey: packed.fontKey,
                fontBytes: null,
                fontName: '',
                italic: false,
            });
        } catch (e) {
            emit('error', e?.message || 'No se pudo cargar la tipografía.');
        } finally {
            loadingFont.value = false;
        }
        return;
    }

    emit('update', {
        fontFamily: value,
        fontBytes: null,
        fontName: '',
        fontKey: '',
    });
}

async function toggleBold() {
    const next = !props.overlay.bold;
    if (isBundledFont(props.overlay.fontFamily)) {
        loadingFont.value = true;
        try {
            const packed = await loadBundledFont(props.overlay.fontFamily, next);
            emit('update', { bold: next, fontKey: packed.fontKey });
        } catch (e) {
            emit('error', e?.message || 'No se pudo cargar la tipografía en negrita.');
        } finally {
            loadingFont.value = false;
        }
        return;
    }
    emit('update', { bold: next });
}

async function onFontFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const ok = /\.(ttf|otf)$/i.test(file.name)
        || file.type === 'font/ttf'
        || file.type === 'font/otf'
        || file.type === 'application/font-sfnt';
    if (!ok) {
        emit('error', 'Usa un archivo de fuente TTF u OTF.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        emit('error', 'La fuente supera 5 MB.');
        return;
    }

    try {
        const bytes = await file.arrayBuffer();
        const fontKey = `custom-${Date.now()}`;
        const face = new FontFace(fontKey, bytes);
        await face.load();
        document.fonts.add(face);
        emit('update', {
            fontFamily: 'custom',
            fontBytes: bytes,
            fontName: file.name,
            fontKey,
            bold: false,
            italic: false,
        });
    } catch {
        emit('error', 'No se pudo cargar esa fuente. Prueba otro TTF/OTF.');
    }
}

function clearCustomFont() {
    emit('update', {
        fontFamily: 'Helvetica',
        fontBytes: null,
        fontName: '',
        fontKey: '',
    });
}

function toggleFill() {
    if (hasFill.value) {
        emit('update', { fillColor: 'transparent' });
    } else {
        emit('update', { fillColor: props.overlay.fillColor && props.overlay.fillColor !== 'transparent'
            ? props.overlay.fillColor
            : '#93c5fd' });
    }
}
</script>

<template>
    <div v-if="!overlay" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
        Selecciona un texto, imagen, figura o trazo en la vista previa para editarlo.
    </div>

    <div v-else-if="overlay.type === 'text'" class="space-y-3">
        <label class="block text-sm font-medium text-slate-700">
            Texto
            <textarea
                rows="3"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                :value="overlay.text"
                :disabled="disabled"
                @input="emit('update', { text: $event.target.value })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Enlace (opcional)
            <input
                type="url"
                placeholder="https://ejemplo.com"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                :value="overlay.linkUrl || ''"
                :disabled="disabled"
                @input="emit('update', { linkUrl: $event.target.value })"
            />
        </label>

        <div>
            <p class="mb-1.5 text-sm font-medium text-slate-700">Estilo</p>
            <div class="flex flex-wrap gap-1.5">
                <button
                    type="button"
                    class="rounded-md border px-2.5 py-1.5 text-sm font-bold"
                    :class="overlay.bold ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700'"
                    :disabled="disabled || isCustom || loadingFont"
                    title="Negrita"
                    @click="toggleBold"
                >
                    N
                </button>
                <button
                    type="button"
                    class="rounded-md border px-2.5 py-1.5 text-sm italic"
                    :class="overlay.italic ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700'"
                    :disabled="disabled || isCustom || isBundled"
                    title="Cursiva"
                    @click="emit('update', { italic: !overlay.italic })"
                >
                    C
                </button>
                <button
                    type="button"
                    class="rounded-md border px-2.5 py-1.5 text-sm underline"
                    :class="overlay.underline ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700'"
                    :disabled="disabled"
                    title="Subrayado"
                    @click="emit('update', { underline: !overlay.underline })"
                >
                    S
                </button>
            </div>
        </div>

        <div>
            <p class="mb-1.5 text-sm font-medium text-slate-700">Alineación</p>
            <div class="grid grid-cols-3 gap-1.5">
                <button
                    v-for="a in ALIGNS"
                    :key="a.id"
                    type="button"
                    class="rounded-md border px-2 py-1.5 text-xs font-semibold"
                    :class="(overlay.align || 'left') === a.id
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-300 bg-white text-slate-700'"
                    :disabled="disabled"
                    @click="emit('update', { align: a.id })"
                >
                    {{ a.label }}
                </button>
            </div>
        </div>

        <label class="block text-sm font-medium text-slate-700">
            Tipografía
            <select
                class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                :value="fontSelectValue"
                :disabled="disabled || loadingFont"
                @change="onFontFamilyChange"
            >
                <optgroup label="Estándar PDF">
                    <option v-for="f in STANDARD_FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
                </optgroup>
                <optgroup label="Más tipografías">
                    <option v-for="f in BUNDLED_FONTS" :key="f.id" :value="f.id">{{ f.label }}</option>
                </optgroup>
                <option v-if="isCustom" value="custom">
                    Personalizada: {{ overlay.fontName || 'archivo' }}
                </option>
            </select>
            <span v-if="loadingFont" class="mt-1 block text-[11px] text-slate-500">Cargando tipografía…</span>
        </label>

        <div class="flex flex-col gap-1.5">
            <button
                type="button"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50"
                :disabled="disabled"
                @click="fontInput?.click()"
            >
                Usar tipografía de mi PC (TTF/OTF)
            </button>
            <input
                ref="fontInput"
                type="file"
                accept=".ttf,.otf,font/ttf,font/otf"
                class="hidden"
                @change="onFontFile"
            />
            <button
                v-if="isCustom"
                type="button"
                class="text-left text-xs font-medium text-blue-700 hover:underline"
                :disabled="disabled"
                @click="clearCustomFont"
            >
                Volver a tipografías de la lista
            </button>
        </div>

        <label class="block text-sm font-medium text-slate-700">
            Ancho del párrafo ({{ Math.round((overlay.widthNorm || 0.55) * 100) }}%)
            <input
                type="range"
                min="15"
                max="95"
                class="mt-1 w-full"
                :value="Math.round((overlay.widthNorm || 0.55) * 100)"
                :disabled="disabled"
                @input="emit('update', { widthNorm: Number($event.target.value) / 100 })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Tamaño ({{ overlay.fontSize }} pt)
            <input
                type="range"
                min="10"
                max="72"
                class="mt-1 w-full"
                :value="overlay.fontSize"
                :disabled="disabled"
                @input="emit('update', { fontSize: Number($event.target.value) })"
            />
        </label>
        <label class="block text-sm font-medium text-slate-700">
            Color
            <input
                type="color"
                class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 bg-white p-1"
                :value="overlay.color"
                :disabled="disabled"
                @input="emit('update', { color: $event.target.value })"
            />
        </label>
        <p class="text-[11px] text-slate-500">También puedes arrastrar las esquinas azules en la vista previa.</p>
        <button
            type="button"
            class="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="disabled"
            @click="emit('remove')"
        >
            Quitar este texto
        </button>
    </div>

    <div v-else-if="overlay.type === 'ink'" class="space-y-3">
        <p class="text-sm font-medium text-slate-800">Trazo / firma</p>
        <label class="block text-sm font-medium text-slate-700">
            Color
            <input
                type="color"
                class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 bg-white p-1"
                :value="overlay.color || '#111827'"
                :disabled="disabled"
                @input="emit('update', { color: $event.target.value })"
            />
        </label>
        <label class="block text-sm font-medium text-slate-700">
            Grosor ({{ overlay.strokeWidth || 2.5 }} pt)
            <input
                type="range"
                min="1"
                max="16"
                step="0.5"
                class="mt-1 w-full"
                :value="overlay.strokeWidth ?? 2.5"
                :disabled="disabled"
                @input="emit('update', { strokeWidth: Number($event.target.value) })"
            />
        </label>
        <p class="text-[11px] text-slate-500">Puedes mover o redimensionar el trazo con las esquinas azules.</p>
        <button
            type="button"
            class="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="disabled"
            @click="emit('remove')"
        >
            Quitar este trazo
        </button>
    </div>

    <div v-else-if="overlay.type === 'shape'" class="space-y-3">
        <p class="text-sm font-medium text-slate-800">{{ shapeLabel }}</p>

        <label class="flex items-center justify-between gap-2 text-sm font-medium text-slate-700">
            Relleno
            <button
                type="button"
                class="rounded-md border px-2.5 py-1 text-xs font-semibold"
                :class="hasFill ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-600'"
                :disabled="disabled"
                @click="toggleFill"
            >
                {{ hasFill ? 'Con relleno' : 'Sin relleno' }}
            </button>
        </label>

        <label v-if="hasFill" class="block text-sm font-medium text-slate-700">
            Color de relleno
            <input
                type="color"
                class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 bg-white p-1"
                :value="overlay.fillColor === 'transparent' ? '#93c5fd' : (overlay.fillColor || '#93c5fd')"
                :disabled="disabled"
                @input="emit('update', { fillColor: $event.target.value })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Color del borde
            <input
                type="color"
                class="mt-1 h-10 w-full cursor-pointer rounded border border-slate-300 bg-white p-1"
                :value="overlay.strokeColor || '#111827'"
                :disabled="disabled"
                @input="emit('update', { strokeColor: $event.target.value })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Grosor del borde ({{ overlay.strokeWidth || 2 }} pt)
            <input
                type="range"
                min="0"
                max="24"
                step="1"
                class="mt-1 w-full"
                :value="overlay.strokeWidth ?? 2"
                :disabled="disabled"
                @input="emit('update', { strokeWidth: Number($event.target.value) })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Opacidad ({{ Math.round((overlay.fillOpacity ?? 1) * 100) }}%)
            <input
                type="range"
                min="10"
                max="100"
                class="mt-1 w-full"
                :value="Math.round((overlay.fillOpacity ?? 1) * 100)"
                :disabled="disabled"
                @input="emit('update', { fillOpacity: Number($event.target.value) / 100 })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Ancho ({{ Math.round((overlay.widthNorm || 0) * 100) }}%)
            <input
                type="range"
                min="4"
                max="90"
                class="mt-1 w-full"
                :value="Math.round((overlay.widthNorm || 0.22) * 100)"
                :disabled="disabled"
                @input="emit('update', { widthNorm: Number($event.target.value) / 100 })"
            />
        </label>
        <label
            v-if="overlay.shape !== 'square' && overlay.shape !== 'circle'"
            class="block text-sm font-medium text-slate-700"
        >
            Alto ({{ Math.round((overlay.heightNorm || 0) * 100) }}%)
            <input
                type="range"
                min="4"
                max="90"
                class="mt-1 w-full"
                :value="Math.round((overlay.heightNorm || 0.18) * 100)"
                :disabled="disabled"
                @input="emit('update', { heightNorm: Number($event.target.value) / 100 })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Enlace (opcional)
            <input
                type="url"
                placeholder="https://ejemplo.com"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                :value="overlay.linkUrl || ''"
                :disabled="disabled"
                @input="emit('update', { linkUrl: $event.target.value })"
            />
        </label>

        <p class="text-[11px] text-slate-500">Arrastra las esquinas azules para agrandar o reducir.</p>

        <button
            type="button"
            class="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="disabled"
            @click="emit('remove')"
        >
            Quitar esta figura
        </button>
    </div>

    <div v-else class="space-y-3">
        <p class="truncate text-sm text-slate-600">{{ overlay.name || 'Imagen' }}</p>

        <label class="block text-sm font-medium text-slate-700">
            Enlace (opcional)
            <input
                type="url"
                placeholder="https://ejemplo.com"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                :value="overlay.linkUrl || ''"
                :disabled="disabled"
                @input="emit('update', { linkUrl: $event.target.value })"
            />
        </label>

        <label class="block text-sm font-medium text-slate-700">
            Ancho ({{ Math.round((overlay.widthNorm || 0) * 100) }}% de la página)
            <input
                type="range"
                min="5"
                max="90"
                class="mt-1 w-full"
                :value="Math.round((overlay.widthNorm || 0.25) * 100)"
                :disabled="disabled"
                @input="emit('update', { widthNorm: Number($event.target.value) / 100 })"
            />
        </label>
        <label class="block text-sm font-medium text-slate-700">
            Alto ({{ Math.round((overlay.heightNorm || 0) * 100) }}% de la página)
            <input
                type="range"
                min="5"
                max="90"
                class="mt-1 w-full"
                :value="Math.round((overlay.heightNorm || 0.2) * 100)"
                :disabled="disabled"
                @input="emit('update', { heightNorm: Number($event.target.value) / 100 })"
            />
        </label>
        <p class="text-[11px] text-slate-500">También puedes arrastrar las esquinas azules en la vista previa.</p>
        <button
            type="button"
            class="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="disabled"
            @click="emit('remove')"
        >
            Quitar esta imagen
        </button>
    </div>
</template>
