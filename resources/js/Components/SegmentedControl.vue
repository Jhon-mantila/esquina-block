<script setup>
defineProps({
    legend: { type: String, required: true },
    name: { type: String, required: true },
    options: { type: Array, required: true },
});

const model = defineModel({ required: true });
</script>

<template>
    <fieldset>
        <legend class="mb-2 text-sm font-medium text-slate-700">{{ legend }}</legend>
        <div class="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-slate-100 p-1">
            <label
                v-for="option in options"
                :key="option.value"
                class="cursor-pointer rounded-md px-2 py-1.5 text-center text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500"
                :class="model === option.value ? 'bg-white font-semibold text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            >
                <input v-model="model" type="radio" class="sr-only" :name="name" :value="option.value" />
                {{ option.label }}
            </label>
        </div>
    </fieldset>
</template>
