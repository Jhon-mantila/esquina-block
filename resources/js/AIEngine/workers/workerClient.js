import wasmFile from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import webgpuWasmFile from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import webgpuWasmMjs from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import workerUrl from './inference.worker.js?worker&url';
import webgpuWorkerUrl from './inference.webgpu.worker.js?worker&url';
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
 * Copia y transfiere. El original del llamador sigue usable si hay que reintentar.
 *
 * @param {Uint8Array | Uint8ClampedArray | undefined} typed
 */
function packPixels(typed) {
    if (!typed) return { view: typed, transfer: [] };
    if (typed instanceof Uint8ClampedArray) {
        const view = new Uint8ClampedArray(typed);
        return { view, transfer: [view.buffer] };
    }
    if (typed instanceof Uint8Array) {
        const view = new Uint8Array(typed);
        return { view, transfer: [view.buffer] };
    }
    return { view: typed, transfer: [] };
}

/**
 * El worker real. Las pruebas del motor inyectan otro runner y no cargan este archivo.
 * WebGPU vive en otro worker para no cambiar el WASM de Esquina BG y Esquina Upscale.
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
    /** @type {'wasm' | 'webgpu' | null} */
    let workerKind = null;
    /** @type {Promise<void> | null} */
    let ready = null;
    /** @type {((error: Error) => void) | null} */
    let rejectReady = null;
    let seq = 0;
    /** @type {object | null} */
    let loadedModel = null;
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
        workerKind = null;
        ready = null;
    }

    /**
     * @param {'wasm' | 'webgpu'} kind
     */
    function boot(kind) {
        if (worker && workerKind === kind && ready) return;

        if (worker) {
            try {
                worker.terminate();
            } catch {
                // El worker ya estaba cerrado.
            }
            worker = null;
            ready = null;
            workerKind = null;
        }

        workerKind = kind;
        const url = kind === 'webgpu' ? webgpuWorkerUrl : workerUrl;
        const wasmPaths = kind === 'webgpu'
            ? { wasm: assetUrl(webgpuWasmFile), mjs: assetUrl(webgpuWasmMjs) }
            : { wasm: assetUrl(wasmFile), mjs: assetUrl(wasmMjs) };

        worker = new Worker(assetUrl(url), { type: 'module' });
        ready = new Promise((resolve, reject) => {
            rejectReady = reject;
            const timeout = setTimeout(() => {
                reject(new EngineError(
                    'worker-timeout',
                    'No se pudo preparar el modelo. Inténtalo de nuevo.',
                ));
            }, kind === 'webgpu' ? 60000 : 20000);

            worker.addEventListener('message', function onReady(event) {
                if (event.data?.type !== 'ready') return;
                clearTimeout(timeout);
                rejectReady = null;
                worker?.removeEventListener('message', onReady);
                resolve();
            });
        });
        ready.catch(() => {
            if (workerKind !== kind) return;
            try {
                worker?.terminate();
            } catch {
                // El worker ya estaba cerrado.
            }
            worker = null;
            workerKind = null;
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

        worker.postMessage({ type: 'init', wasmPaths });
    }

    /**
     * @param {object} payload
     * @param {Transferable[]} [transferables]
     */
    async function call(payload, transferables = []) {
        if (!worker || !ready) {
            throw new EngineError('worker-failed', 'No se pudo preparar el modelo. Inténtalo de nuevo.');
        }
        await ready;
        const id = ++seq;
        const token = payload.token ?? `m${id}`;
        const result = new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject, onStatus: payload.onStatus });
        });
        const { onStatus, ...rest } = payload;
        void onStatus;
        worker.postMessage({ ...rest, id, token }, transferables);
        return result;
    }

    /**
     * @param {'wasm' | 'webgpu'} kind
     * @param {object} model
     * @param {string[]} providers
     * @param {{ onStatus?: Function }} opts
     */
    async function loadOn(kind, model, providers, opts) {
        boot(kind);
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
    }

    return {
        /**
         * @param {object} model
         * @param {string[]} providers
         * @param {{ onStatus?: Function }} [opts]
         */
        async load(model, providers, opts = {}) {
            loadedModel = model;
            const kind = providers.includes('webgpu') ? 'webgpu' : 'wasm';
            try {
                return await loadOn(kind, model, providers, opts);
            } catch (err) {
                if (kind !== 'webgpu') throw err;
                return loadOn('wasm', model, providers.filter((name) => name === 'wasm'), opts);
            }
        },

        /**
         * @param {{ token: string, provider?: string }} handle
         * @param {{
         *   width: number,
         *   height: number,
         *   data: Uint8ClampedArray,
         *   mask?: { width: number, height: number, data: Uint8Array | Uint8ClampedArray },
         * }} input
         * @param {{ onStatus?: Function, transfer?: boolean }} [opts]
         */
        async run(handle, input, opts = {}) {
            const send = async () => {
                /** @type {Transferable[]} */
                const transfer = [];
                const imagePacked = opts.transfer ? packPixels(input.data) : { view: input.data, transfer: [] };
                const maskPacked = opts.transfer ? packPixels(input.mask?.data) : { view: input.mask?.data, transfer: [] };
                transfer.push(...imagePacked.transfer, ...maskPacked.transfer);

                const message = await call({
                    type: 'run',
                    token: handle.token,
                    image: {
                        width: input.width,
                        height: input.height,
                        data: imagePacked.view,
                    },
                    mask: input.mask
                        ? {
                            width: input.mask.width,
                            height: input.mask.height,
                            data: maskPacked.view,
                        }
                        : undefined,
                    onStatus: opts.onStatus,
                }, transfer);

                if (message.provider) handle.provider = message.provider;
                return {
                    width: message.width,
                    height: message.height,
                    data: message.data,
                    provider: message.provider,
                };
            };

            try {
                return await send();
            } catch (err) {
                if (workerKind !== 'webgpu' || !loadedModel) throw err;
                const next = await loadOn('wasm', loadedModel, ['wasm'], opts);
                handle.token = next.token;
                handle.provider = next.provider;
                return send();
            }
        },

        /**
         * @param {{ token: string }} handle
         */
        async release(handle) {
            if (!worker || !ready) return;
            await call({ type: 'release', token: handle.token });
        },
    };
}
