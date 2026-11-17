import wasmFile from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import workerUrl from './inference.worker.js?worker&url';
import { EngineError } from '../core/errors.js';
import { getToolBase, resolveViteAssetUrl } from '../../Pages/EsquinaBG/toolBase.js';

/**
 * @param {string} url
 */
function toAbsoluteUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === 'undefined') return url;
    return new URL(url, window.location.origin).href;
}

/**
 * @param {string} url
 */
function assetUrl(url) {
    return toAbsoluteUrl(resolveViteAssetUrl(url));
}

/**
 * El worker real. Las pruebas del motor inyectan otro runner y no cargan este archivo.
 *
 * @param {{ resolvePublicUrl?: (path: string) => string }} [options]
 */
export function createWorkerRunner(options = {}) {
    const resolvePublicUrl = options.resolvePublicUrl ?? ((path) => {
        const rooted = path.startsWith('/') ? path : `/${path}`;
        return toAbsoluteUrl(`${getToolBase()}${rooted}`);
    });

    /** @type {Worker | null} */
    let worker = null;
    /** @type {Promise<void> | null} */
    let ready = null;
    /** @type {((error: Error) => void) | null} */
    let rejectReady = null;
    let seq = 0;
    /** @type {Map<number, { resolve: Function, reject: Function, onStatus?: Function }>} */
    const pending = new Map();

    function failAll(error) {
        pending.forEach((job) => job.reject(error));
        pending.clear();
        rejectReady?.(error);
        rejectReady = null;
        try {
            worker?.terminate();
        } catch {
            // El worker ya estaba cerrado.
        }
        worker = null;
        ready = null;
    }

    function ensure() {
        if (worker && ready) return;

        worker = new Worker(assetUrl(workerUrl), { type: 'module' });
        ready = new Promise((resolve, reject) => {
            rejectReady = reject;
            const timeout = setTimeout(() => {
                reject(new EngineError(
                    'worker-timeout',
                    'No se pudo preparar el modelo. Inténtalo de nuevo.',
                ));
            }, 20000);

            worker.addEventListener('message', function onReady(event) {
                if (event.data?.type !== 'ready') return;
                clearTimeout(timeout);
                rejectReady = null;
                worker?.removeEventListener('message', onReady);
                resolve();
            });
        });
        ready.catch(() => {
            try {
                worker?.terminate();
            } catch {
                // El worker ya estaba cerrado.
            }
            worker = null;
            ready = null;
        });

        worker.onmessage = (event) => {
            const message = event.data;
            if (!message || message.type === 'ready') return;

            if (message.type === 'status') {
                pending.get(message.id)?.onStatus?.(message.status);
                return;
            }

            const job = pending.get(message.id);
            if (!job) return;
            pending.delete(message.id);

            if (message.type === 'error') {
                job.reject(new EngineError(message.code || 'model-failed', message.message));
                return;
            }
            job.resolve(message);
        };

        worker.onerror = () => {
            failAll(new EngineError(
                'worker-failed',
                'No se pudo preparar el modelo. Inténtalo de nuevo.',
            ));
        };

        worker.postMessage({
            type: 'init',
            wasmPaths: {
                wasm: assetUrl(wasmFile),
                mjs: assetUrl(wasmMjs),
            },
        });
    }

    /**
     * @param {object} payload
     */
    async function call(payload) {
        ensure();
        await ready;
        const id = ++seq;
        const token = payload.token ?? `m${id}`;
        const result = new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject, onStatus: payload.onStatus });
        });
        const { onStatus, ...rest } = payload;
        void onStatus;
        worker.postMessage({ ...rest, id, token });
        return result;
    }

    return {
        /**
         * @param {object} model
         * @param {string[]} providers
         * @param {{ onStatus?: Function }} [opts]
         */
        async load(model, providers, opts = {}) {
            const message = await call({
                type: 'load',
                model: {
                    ...model,
                    resolvedUrl: resolvePublicUrl(model.modelUrl),
                },
                providers,
                onStatus: opts.onStatus,
            });
            return { token: message.token, provider: message.provider, tier: model.tier };
        },

        /**
         * @param {{ token: string }} handle
         * @param {{ width: number, height: number, data: Uint8ClampedArray }} input
         * @param {{ onStatus?: Function }} [opts]
         */
        async run(handle, input, opts = {}) {
            const message = await call({
                type: 'run',
                token: handle.token,
                image: {
                    width: input.width,
                    height: input.height,
                    data: input.data,
                },
                onStatus: opts.onStatus,
            });
            return {
                width: message.width,
                height: message.height,
                data: message.data,
            };
        },

        /**
         * @param {{ token: string }} handle
         */
        async release(handle) {
            await call({ type: 'release', token: handle.token });
        },
    };
}
