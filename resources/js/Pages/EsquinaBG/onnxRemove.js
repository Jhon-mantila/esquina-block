import * as ort from 'onnxruntime-web/wasm';
import { toImageData } from './imageDataUtil.js';
import { MODELS } from './models.js';
import { loadModelBuffer } from './modelCache.js';

/** @type {Map<string, import('onnxruntime-web').InferenceSession>} */
const sessions = new Map();

/**
 * @param {string | { wasm?: string, mjs?: string }} wasmPaths
 *   - string: carpeta (debe contener nombres sin hash de ORT)
 *   - object: URLs absolutas al .wasm / .mjs (recomendado con Vite)
 */
export function configureOrt(wasmPaths) {
    // 1 hilo: no exige COOP/COEP (SharedArrayBuffer) y va mejor en PCs modestos.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = false;

    if (!wasmPaths) return;

    if (typeof wasmPaths === 'string') {
        ort.env.wasm.wasmPaths = wasmPaths.endsWith('/') ? wasmPaths : `${wasmPaths}/`;
        return;
    }

    /** @type {{ wasm?: string, mjs?: string }} */
    const paths = {};
    if (wasmPaths.wasm) paths.wasm = wasmPaths.wasm;
    if (wasmPaths.mjs) paths.mjs = wasmPaths.mjs;
    ort.env.wasm.wasmPaths = paths;
}

/**
 * @param {ImageData} imageData
 * @param {number} size
 * @param {'u2net' | 'rmbg'} kind
 */
function preprocess(imageData, size, kind) {
    const { width, height } = imageData;
    const src = new OffscreenCanvas(width, height);
    const sctx = src.getContext('2d');
    if (!sctx) throw new Error('Canvas no disponible en el worker.');
    sctx.putImageData(imageData, 0, 0);

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible en el worker.');
    ctx.drawImage(src, 0, 0, size, size);
    const resized = ctx.getImageData(0, 0, size, size);
    const float = new Float32Array(3 * size * size);

    if (kind === 'rmbg') {
        // mean 0.5, std 1.0
        for (let i = 0, p = 0; i < size * size; i += 1, p += 4) {
            float[i] = resized.data[p] / 255 - 0.5;
            float[i + size * size] = resized.data[p + 1] / 255 - 0.5;
            float[i + 2 * size * size] = resized.data[p + 2] / 255 - 0.5;
        }
    } else {
        // u2net / silueta: ImageNet-ish
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];
        for (let i = 0, p = 0; i < size * size; i += 1, p += 4) {
            float[i] = (resized.data[p] / 255 - mean[0]) / std[0];
            float[i + size * size] = (resized.data[p + 1] / 255 - mean[1]) / std[1];
            float[i + 2 * size * size] = (resized.data[p + 2] / 255 - mean[2]) / std[2];
        }
    }

    return new ort.Tensor('float32', float, [1, 3, size, size]);
}

/**
 * @param {Float32Array|ArrayLike<number>} maskData
 * @param {number} size
 * @param {number} outW
 * @param {number} outH
 */
function upsampleMask(maskData, size, outW, outH) {
    const src = new Float32Array(maskData);
    // normalize 0..1
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < src.length; i += 1) {
        const v = src[i];
        if (v < min) min = v;
        if (v > max) max = v;
    }
    const range = max - min || 1;
    for (let i = 0; i < src.length; i += 1) {
        src[i] = (src[i] - min) / range;
    }

    const out = new Float32Array(outW * outH);
    for (let y = 0; y < outH; y += 1) {
        const sy = ((y + 0.5) * size) / outH - 0.5;
        const y0 = Math.max(0, Math.min(size - 1, Math.floor(sy)));
        const y1 = Math.max(0, Math.min(size - 1, y0 + 1));
        const fy = sy - y0;
        for (let x = 0; x < outW; x += 1) {
            const sx = ((x + 0.5) * size) / outW - 0.5;
            const x0 = Math.max(0, Math.min(size - 1, Math.floor(sx)));
            const x1 = Math.max(0, Math.min(size - 1, x0 + 1));
            const fx = sx - x0;
            const v00 = src[y0 * size + x0];
            const v01 = src[y0 * size + x1];
            const v10 = src[y1 * size + x0];
            const v11 = src[y1 * size + x1];
            out[y * outW + x] =
                v00 * (1 - fx) * (1 - fy)
                + v01 * fx * (1 - fy)
                + v10 * (1 - fx) * fy
                + v11 * fx * fy;
        }
    }
    return out;
}

/**
 * @param {import('./models.js').ModelId} modelId
 * @param {(path: string) => string} resolvePublic
 * @param {(pct: number, msg: string) => void} onProgress
 */
async function getSession(modelId, resolvePublic, onProgress) {
    const cached = sessions.get(modelId);
    if (cached) return cached;

    const buffer = await loadModelBuffer(modelId, resolvePublic, onProgress);
    onProgress(45, 'Iniciando el motor…');
    try {
        const session = await ort.InferenceSession.create(buffer, {
            executionProviders: ['wasm'],
            graphOptimizationLevel: 'all',
        });
        sessions.set(modelId, session);
        return session;
    } catch (err) {
        sessions.delete(modelId);
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`No se pudo iniciar el motor de IA (${detail}).`);
    }
}

/**
 * Aplica la máscara al ImageData (alpha).
 * @param {ImageData} imageData
 * @param {Float32Array} mask 0..1
 */
function applyMask(imageData, mask) {
    const { data } = imageData;
    for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
        data[p + 3] = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
    }
}

/**
 * @param {ImageData} imageData
 * @param {import('./models.js').ModelId} modelId
 * @param {(path: string) => string} resolvePublic
 * @param {(pct: number, msg: string) => void} [onProgress]
 * @returns {Promise<ImageData>}
 */
export async function removeBackgroundOnnx(imageData, modelId, resolvePublic, onProgress = () => {}) {
    const model = MODELS[modelId];
    if (!model) throw new Error('Modelo desconocido.');

    const session = await getSession(modelId, resolvePublic, onProgress);
    onProgress(55, 'Analizando la imagen…');

    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const tensor = preprocess(imageData, model.inputSize, model.kind);

    onProgress(70, 'Quitando el fondo…');
    const outputs = await session.run({ [inputName]: tensor });
    const out = outputs[outputName];
    const maskSize = model.inputSize;
    const maskData = out.data;
    // Algunas salidas son [1,1,H,W] o [1,H,W]
    const flat = maskData.length >= maskSize * maskSize
        ? maskData.slice(maskData.length - maskSize * maskSize)
        : maskData;

    onProgress(88, 'Aplicando el recorte…');
    const mask = upsampleMask(flat, maskSize, imageData.width, imageData.height);
    const result = toImageData(imageData.data, imageData.width, imageData.height);
    applyMask(result, mask);
    onProgress(95, 'Casi listo…');
    return result;
}

export function disposeOnnxSessions() {
    sessions.clear();
}
