import { BACKGROUND_REMOVAL_MODELS } from '../catalog/backgroundRemoval.js';
import { collectCapabilities } from './capabilities.js';
import { FALLBACK_NOTICE, publicModelError } from './errors.js';
import { fallbackModel, providerPlan, selectModel } from './selector.js';

/**
 * @param {{
 *   models: object[],
 *   profile: { tier: string, webgpu?: string },
 *   runner: {
 *     load: Function,
 *     run: Function,
 *     release: Function,
 *   },
 * }} state
 */
function createApi(state) {
    const { models, profile, runner } = state;
    /** @type {Map<string, { release: () => Promise<void> }>} */
    const active = new Map();

    /**
     * @param {object} model
     * @param {Function} onStatus
     */
    async function attempt(model, onStatus) {
        const providers = providerPlan(model, profile);
        if (providers.length === 0) throw publicModelError();
        const handle = await runner.load(model, providers, { onStatus });
        if (!handle?.provider || !providers.includes(handle.provider)) {
            throw publicModelError();
        }
        return handle;
    }

    return {
        profile,

        /**
         * @param {{
         *   task: string,
         *   quality?: 'auto' | 'basic' | 'balanced' | 'high',
         *   onStatus?: Function,
         * }} request
         */
        async open(request) {
            const onStatus = request.onStatus ?? (() => {});
            const selection = selectModel({
                models,
                task: request.task,
                quality: request.quality ?? 'auto',
                profile,
            });

            let model = selection.model;
            let fellBack = false;
            /** @type {{ token?: number | string, provider: string, tier?: string }} */
            let handle;
            try {
                handle = await attempt(model, onStatus);
            } catch (err) {
                const next = fallbackModel(models, request.task, model);
                if (!next) throw publicModelError(err);
                try {
                    handle = await attempt(next, onStatus);
                    model = next;
                    fellBack = true;
                } catch (nextErr) {
                    throw publicModelError(nextErr);
                }
            }

            const session = {
                task: request.task,
                modelId: model.id,
                tier: model.tier,
                provider: handle.provider,
                fellBack,
                notice: fellBack ? FALLBACK_NOTICE : null,
                /**
                 * @param {{ width: number, height: number, data: Uint8ClampedArray }} input
                 * @param {{ onStatus?: Function }} [opts]
                 */
                async run(input, opts = {}) {
                    const report = opts.onStatus ?? onStatus;
                    try {
                        report({ phase: 'preparing' });
                        const output = await runner.run(handle, input, { onStatus: report });
                        report({ phase: 'ready' });
                        return output;
                    } catch (err) {
                        if (session.fellBack || session.tier === 'basic') {
                            report({ phase: 'error' });
                            throw publicModelError(err);
                        }
                        const next = fallbackModel(models, request.task, model);
                        if (!next) {
                            report({ phase: 'error' });
                            throw publicModelError(err);
                        }
                        try {
                            await runner.release(handle);
                        } catch {
                            // La sesión fallida no debe impedir el modelo básico.
                        }
                        try {
                            handle = await attempt(next, report);
                        } catch (loadErr) {
                            report({ phase: 'error' });
                            throw publicModelError(loadErr);
                        }
                        model = next;
                        session.modelId = next.id;
                        session.tier = next.tier;
                        session.provider = handle.provider;
                        session.fellBack = true;
                        session.notice = FALLBACK_NOTICE;
                        try {
                            report({ phase: 'preparing' });
                            const output = await runner.run(handle, input, { onStatus: report });
                            report({ phase: 'ready' });
                            return output;
                        } catch (runErr) {
                            report({ phase: 'error' });
                            throw publicModelError(runErr);
                        }
                    }
                },
                async release() {
                    await runner.release(handle);
                    if (active.get(request.task) === session) active.delete(request.task);
                },
            };

            const previous = active.get(request.task);
            active.set(request.task, session);
            if (previous) await previous.release();
            return session;
        },
    };
}

export const EsquinaAI = {
    /**
     * @param {{
     *   models?: object[],
     *   profile?: object,
     *   runner?: { load: Function, run: Function, release: Function },
     *   resolvePublicUrl?: (path: string) => string,
     * }} [options]
     */
    async create(options = {}) {
        const models = options.models ?? BACKGROUND_REMOVAL_MODELS;
        const profile = options.profile ?? await collectCapabilities();
        const runner = options.runner ?? await createDefaultRunner(options);
        return createApi({ models, profile, runner });
    },
};

/**
 * @param {{ resolvePublicUrl?: (path: string) => string }} options
 */
async function createDefaultRunner(options) {
    const { createWorkerRunner } = await import('../workers/workerClient.js');
    return createWorkerRunner({
        resolvePublicUrl: options.resolvePublicUrl,
    });
}
