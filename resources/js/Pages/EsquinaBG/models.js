/**
 * Definición de modelos (nombres amigables en la UI; archivos técnicos aquí).
 *
 * - basic: u2netp (~4.4 MB)
 * - balanced: silueta publicada como isnet-quantized.onnx (~43 MB) — tamaño del plan
 * - high: rmbg-quantized (~44 MB)
 *
 * @typedef {'basic' | 'balanced' | 'high'} ModelId
 * @typedef {'u2net' | 'rmbg'} ModelKind
 */

/** @type {Record<ModelId, {
 *   id: ModelId,
 *   file: string,
 *   kind: ModelKind,
 *   inputSize: number,
 *   remoteUrl?: string,
 * }>} */
export const MODELS = {
    basic: {
        id: 'basic',
        file: 'u2netp.onnx',
        kind: 'u2net',
        inputSize: 320,
    },
    balanced: {
        id: 'balanced',
        file: 'isnet-quantized.onnx',
        kind: 'u2net',
        inputSize: 320,
        remoteUrl: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
    },
    high: {
        id: 'high',
        file: 'rmbg-quantized.onnx',
        kind: 'rmbg',
        inputSize: 1024,
        remoteUrl: 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx',
    },
};

export const MODEL_CACHE_NAME = 'esquinabg-models-v1';

/**
 * @param {ModelId} id
 * @param {(path: string) => string} resolvePublic
 */
export function modelLocalUrl(id, resolvePublic) {
    const model = MODELS[id];
    return resolvePublic(`/models/esquinabg/${model.file}`);
}
