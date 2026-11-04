import wasmFile from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmMjs from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
// ?worker&url fuerza a Vite a EMPAQUETAR el worker (si no, copia el .js crudo y falla).
import workerUrl from './background-removal.worker.js?worker&url';
import { getToolBase, resolveViteAssetUrl } from './toolBase.js';
import { resizeImageForProcessing } from './resizeImage.js';

/** @typedef {'basic' | 'balanced' | 'high'} ModelId */

let worker = null;
let ready = false;
/** @type {Array<() => void>} */
let readyWaiters = [];
/** @type {Array<(err: Error) => void>} */
let readyRejecters = [];
let seq = 0;

/** @type {Map<number, { resolve: Function, reject: Function, onProgress?: Function }>} */
const pending = new Map();

/**
 * ORT espera nombres fijos; Vite los hashea. Pasamos URLs absolutas al archivo real.
 * @returns {{ wasm: string, mjs: string }}
 */
function buildWasmPaths() {
    const wasm = toAbsoluteUrl(resolveViteAssetUrl(wasmFile));
    const mjs = toAbsoluteUrl(resolveViteAssetUrl(wasmMjs));
    return { wasm, mjs };
}

/** @param {string} url */
function toAbsoluteUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (typeof window === 'undefined') return url;
    return new URL(url, window.location.origin).href;
}

function failReady(err) {
    readyRejecters.splice(0).forEach((fn) => fn(err));
    readyWaiters.splice(0);
}

function ensureWorker() {
    if (worker) return worker;

    // Prefijo /esquinabg para el Alias Apache/local
    const workerHref = resolveViteAssetUrl(workerUrl);

    worker = new Worker(workerHref, { type: 'module' });

    worker.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'ready') {
            ready = true;
            readyWaiters.splice(0).forEach((fn) => fn());
            readyRejecters.splice(0);
            return;
        }

        const job = pending.get(msg.id);
        if (!job) return;

        if (msg.type === 'progress') {
            job.onProgress?.(msg.percent, msg.message);
            return;
        }

        pending.delete(msg.id);
        if (msg.type === 'done') {
            job.resolve({
                blob: msg.blob,
                width: msg.width,
                height: msg.height,
                usedModel: msg.usedModel,
                notice: msg.notice || null,
            });
            return;
        }

        if (msg.type === 'error') {
            job.reject(new Error(msg.message || 'Error al procesar.'));
        }
    };

    worker.onerror = (err) => {
        const detail = err?.message || err?.filename || '';
        const message = detail
            ? `No se pudo iniciar el procesamiento (${detail}).`
            : 'No se pudo iniciar el procesamiento en segundo plano.';
        const error = new Error(message);
        failReady(error);
        pending.forEach((job) => job.reject(error));
        pending.clear();
        try {
            worker?.terminate();
        } catch {
            // ignore
        }
        worker = null;
        ready = false;
    };

    worker.postMessage({
        type: 'init',
        toolBase: getToolBase(),
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        wasmPaths: buildWasmPaths(),
    });

    return worker;
}

function waitReady(timeoutMs = 20000) {
    if (ready) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const idx = readyWaiters.indexOf(onOk);
            if (idx >= 0) readyWaiters.splice(idx, 1);
            const ridx = readyRejecters.indexOf(onFail);
            if (ridx >= 0) readyRejecters.splice(ridx, 1);
            reject(new Error('El procesador tardó demasiado en arrancar. Recarga la página e inténtalo de nuevo.'));
        }, timeoutMs);

        function onOk() {
            clearTimeout(timer);
            resolve();
        }
        function onFail(err) {
            clearTimeout(timer);
            reject(err);
        }

        readyWaiters.push(onOk);
        readyRejecters.push(onFail);
    });
}

/**
 * @param {Blob} imageBlob
 * @param {ModelId} modelId
 * @param {{ onProgress?: (percent: number, message: string) => void }} [opts]
 */
export async function removeBackgroundInWorker(imageBlob, modelId, opts = {}) {
    ensureWorker();
    await waitReady();

    opts.onProgress?.(3, 'Redimensionando…');
    const { bitmap, width, height, resized } = await resizeImageForProcessing(imageBlob);

    const id = ++seq;
    const resultPromise = new Promise((resolve, reject) => {
        pending.set(id, {
            resolve,
            reject,
            onProgress: opts.onProgress,
        });
    });

    worker.postMessage(
        {
            type: 'remove',
            id,
            modelId,
            bitmap,
            width,
            height,
            resized,
        },
        [bitmap],
    );

    return resultPromise;
}
