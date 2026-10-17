<script setup>
const props = defineProps({
    type: { type: String, required: true },
    modelValue: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['update:modelValue']);

const inputClass =
    'mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2';

function fieldClass(hasError) {
    return [
        inputClass,
        hasError
            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/30'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/30',
    ];
}

function onPatch(key, value) {
    Object.assign(props.modelValue, { [key]: value });
    emit('update:modelValue', props.modelValue);
}
</script>

<template>
    <div class="space-y-3 text-sm">
        <p
            v-if="errors.vcard"
            class="rounded-lg bg-amber-50 px-3 py-2 text-amber-900"
            role="alert"
        >
            {{ errors.vcard }}
        </p>

        <template v-if="type === 'url'">
            <label class="block font-medium text-slate-700">
                URL o texto
                <input
                    type="text"
                    :class="fieldClass(Boolean(errors.text))"
                    placeholder="https://esquinaweb.com"
                    :value="modelValue.text"
                    maxlength="1200"
                    @input="onPatch('text', $event.target.value)"
                />
                <span v-if="errors.text" class="mt-1 block text-xs text-amber-800">{{ errors.text }}</span>
            </label>
        </template>

        <template v-else-if="type === 'wifi'">
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block font-medium text-slate-700">
                    Nombre de la red (SSID)
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.wifiSsid))"
                        placeholder="MiWiFi"
                        autocomplete="off"
                        maxlength="32"
                        :value="modelValue.wifiSsid"
                        @input="onPatch('wifiSsid', $event.target.value)"
                    />
                    <span v-if="errors.wifiSsid" class="mt-1 block text-xs text-amber-800">{{ errors.wifiSsid }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Tipo de seguridad
                    <select
                        :class="fieldClass(false)"
                        :value="modelValue.wifiEncryption"
                        @change="onPatch('wifiEncryption', $event.target.value)"
                    >
                        <option value="WPA">WPA / WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Sin contraseña</option>
                    </select>
                </label>
                <label
                    v-if="modelValue.wifiEncryption !== 'nopass'"
                    class="block font-medium text-slate-700"
                >
                    Contraseña
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.wifiPassword))"
                        placeholder="Contraseña de la red"
                        autocomplete="off"
                        maxlength="63"
                        :value="modelValue.wifiPassword"
                        @input="onPatch('wifiPassword', $event.target.value)"
                    />
                    <span v-if="errors.wifiPassword" class="mt-1 block text-xs text-amber-800">{{ errors.wifiPassword }}</span>
                </label>
                <label
                    class="flex items-end gap-2 pb-1.5 font-medium text-slate-700"
                    :class="modelValue.wifiEncryption === 'nopass' ? 'sm:col-span-2' : ''"
                >
                    <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        :checked="modelValue.wifiHidden"
                        @change="onPatch('wifiHidden', $event.target.checked)"
                    />
                    Red oculta
                </label>
            </div>
        </template>

        <template v-else-if="type === 'vcard'">
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block font-medium text-slate-700">
                    Nombre
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.firstName))"
                        maxlength="80"
                        :value="modelValue.firstName"
                        @input="onPatch('firstName', $event.target.value)"
                    />
                    <span v-if="errors.firstName" class="mt-1 block text-xs text-amber-800">{{ errors.firstName }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Apellido
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.lastName))"
                        maxlength="80"
                        :value="modelValue.lastName"
                        @input="onPatch('lastName', $event.target.value)"
                    />
                    <span v-if="errors.lastName" class="mt-1 block text-xs text-amber-800">{{ errors.lastName }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Teléfono
                    <input
                        type="tel"
                        :class="fieldClass(Boolean(errors.phone))"
                        placeholder="+57 300 000 0000"
                        maxlength="32"
                        :value="modelValue.phone"
                        @input="onPatch('phone', $event.target.value)"
                    />
                    <span v-if="errors.phone" class="mt-1 block text-xs text-amber-800">{{ errors.phone }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Email
                    <input
                        type="email"
                        :class="fieldClass(Boolean(errors.email))"
                        placeholder="correo@ejemplo.com"
                        maxlength="120"
                        :value="modelValue.email"
                        @input="onPatch('email', $event.target.value)"
                    />
                    <span v-if="errors.email" class="mt-1 block text-xs text-amber-800">{{ errors.email }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Empresa
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.org))"
                        maxlength="80"
                        :value="modelValue.org"
                        @input="onPatch('org', $event.target.value)"
                    />
                    <span v-if="errors.org" class="mt-1 block text-xs text-amber-800">{{ errors.org }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Página web
                    <input
                        type="url"
                        :class="fieldClass(Boolean(errors.website))"
                        placeholder="https://"
                        maxlength="200"
                        :value="modelValue.website"
                        @input="onPatch('website', $event.target.value)"
                    />
                    <span v-if="errors.website" class="mt-1 block text-xs text-amber-800">{{ errors.website }}</span>
                </label>
            </div>
        </template>

        <template v-else-if="type === 'email'">
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block font-medium text-slate-700">
                    Correo destino
                    <input
                        type="email"
                        :class="fieldClass(Boolean(errors.emailTo))"
                        placeholder="destino@ejemplo.com"
                        maxlength="120"
                        :value="modelValue.emailTo"
                        @input="onPatch('emailTo', $event.target.value)"
                    />
                    <span v-if="errors.emailTo" class="mt-1 block text-xs text-amber-800">{{ errors.emailTo }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Asunto <span class="font-normal text-slate-400">(opcional)</span>
                    <input
                        type="text"
                        :class="fieldClass(Boolean(errors.emailSubject))"
                        maxlength="120"
                        :value="modelValue.emailSubject"
                        @input="onPatch('emailSubject', $event.target.value)"
                    />
                    <span v-if="errors.emailSubject" class="mt-1 block text-xs text-amber-800">{{ errors.emailSubject }}</span>
                </label>
                <label class="block font-medium text-slate-700 sm:col-span-2">
                    Mensaje <span class="font-normal text-slate-400">(opcional)</span>
                    <textarea
                        rows="2"
                        :class="fieldClass(Boolean(errors.emailBody))"
                        maxlength="400"
                        :value="modelValue.emailBody"
                        @input="onPatch('emailBody', $event.target.value)"
                    />
                    <span v-if="errors.emailBody" class="mt-1 block text-xs text-amber-800">{{ errors.emailBody }}</span>
                </label>
            </div>
        </template>

        <template v-else-if="type === 'sms'">
            <div class="grid gap-3 sm:grid-cols-2">
                <label class="block font-medium text-slate-700">
                    Número de teléfono
                    <input
                        type="tel"
                        :class="fieldClass(Boolean(errors.smsPhone))"
                        placeholder="+57 300 000 0000"
                        maxlength="32"
                        :value="modelValue.smsPhone"
                        @input="onPatch('smsPhone', $event.target.value)"
                    />
                    <span v-if="errors.smsPhone" class="mt-1 block text-xs text-amber-800">{{ errors.smsPhone }}</span>
                </label>
                <label class="block font-medium text-slate-700">
                    Mensaje <span class="font-normal text-slate-400">(opcional)</span>
                    <textarea
                        rows="2"
                        :class="fieldClass(Boolean(errors.smsBody))"
                        maxlength="160"
                        :value="modelValue.smsBody"
                        @input="onPatch('smsBody', $event.target.value)"
                    />
                    <span v-if="errors.smsBody" class="mt-1 block text-xs text-amber-800">{{ errors.smsBody }}</span>
                    <span class="mt-1 block text-xs text-slate-400">{{ (modelValue.smsBody || '').length }}/160</span>
                </label>
            </div>
        </template>
    </div>
</template>
