import { allowedTiers } from './capabilities.js';
import { EngineError } from './errors.js';

/**
 * Orden de proveedores para un modelo. WebGPU solo entra si el catálogo lo declara
 * y el sondeo del adaptador tuvo éxito.
 *
 * @param {{ providers?: string[] }} model
 * @param {{ webgpu?: string }} profile
 * @returns {string[]}
 */
export function providerPlan(model, profile) {
    const plan = [];
    for (const name of model.providers ?? []) {
        if (name === 'webgpu') {
            if (profile.webgpu === 'available') plan.push('webgpu');
            continue;
        }
        if (name === 'wasm') plan.push('wasm');
    }
    return plan;
}

/**
 * Si el modelo elegido no puede crearse, el siguiente intento es el básico.
 * No se prueba el nivel intermedio.
 *
 * @param {Array<{ task: string, tier: string }>} models
 * @param {string} task
 * @param {{ tier: string } | null | undefined} failed
 */
export function fallbackModel(models, task, failed) {
    if (!failed || failed.tier === 'basic') return null;
    return models.find((model) => model.task === task && model.tier === 'basic') ?? null;
}

/**
 * @param {{
 *   models: Array<{ task: string, tier: string, providers?: string[] }>,
 *   task: string,
 *   quality: 'auto' | 'basic' | 'balanced' | 'high',
 *   profile: { tier: 'basic' | 'balanced' | 'high', webgpu?: string },
 *   image?: { width: number, height: number },
 * }} input
 */
export function selectModel({ models, task, quality, profile, image }) {
    void image;

    const taskModels = models.filter((model) => model.task === task);
    if (taskModels.length === 0) {
        throw new EngineError('unknown-task', 'No hay un modelo disponible para esta herramienta.');
    }

    const allowed = allowedTiers(profile.tier);
    const preferred = quality === 'auto' ? profile.tier : quality;
    if (!allowed[preferred]) {
        throw new EngineError('quality-unavailable', 'Esta calidad no está disponible en este equipo.');
    }

    let resolved = preferred;
    let model = taskModels.find((item) => item.tier === resolved) ?? null;
    // Automático baja al siguiente modelo que sí exista. Una elección manual no cambia de nivel.
    if (!model && quality === 'auto') {
        const order = ['high', 'balanced', 'basic'];
        const start = order.indexOf(preferred);
        for (let index = start + 1; index < order.length; index += 1) {
            const tier = order[index];
            if (!allowed[tier]) continue;
            const candidate = taskModels.find((item) => item.tier === tier);
            if (!candidate) continue;
            model = candidate;
            resolved = tier;
            break;
        }
    }
    if (!model) {
        throw new EngineError('unknown-model', 'No hay un modelo para esta calidad.');
    }

    return {
        model,
        allowed,
        quality: resolved,
        providers: providerPlan(model, profile),
    };
}
