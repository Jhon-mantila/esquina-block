<script setup>
defineProps({
    savedAt: { type: Number, default: 0 },
    summary: { type: String, default: 'Hay un borrador guardado en este navegador.' },
});

defineEmits(['restore', 'dismiss']);
</script>

<template>
    <div
        class="mb-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        role="status"
    >
        <div class="text-sm text-blue-900">
            <p class="font-semibold">Encontramos un borrador en este navegador</p>
            <p class="mt-0.5 text-blue-800/90">
                {{ summary }}
                <template v-if="savedAt">
                    · {{ new Date(savedAt).toLocaleString('es') }}
                </template>
            </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
            <button
                type="button"
                class="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                @click="$emit('restore')"
            >
                Restaurar
            </button>
            <button
                type="button"
                class="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
                @click="$emit('dismiss')"
            >
                Empezar de nuevo
            </button>
        </div>
    </div>
</template>
