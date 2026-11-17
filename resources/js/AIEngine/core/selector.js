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
    const resolved = quality === 'auto' ? profile.tier : quality;
    if (!allowed[resolved]) {
        throw new EngineError('quality-unavailable', 'Esta calidad no está disponible en este equipo.');
    }

    const model = taskModels.find((item) => item.tier === resolved);
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
