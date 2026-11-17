/**
 * Modelos de quitar fondo que ya usa EsquinaBG.
 * El equilibrado es silueta (rembg); el archivo conserva el nombre histórico.
 * Licencias sin transcribir: hay que leerlas en el origen antes de publicarlas.
 */

/** @type {const} */
export const BACKGROUND_REMOVAL_MODELS = [
    {
        id: 'background-removal-basic',
        task: 'background-removal',
        tier: 'basic',
        version: '1.0.0',
        format: 'onnx',
        file: 'u2netp.onnx',
        providers: ['wasm'],
        modelUrl: '/models/esquinabg/u2netp.onnx',
        remoteUrl: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
        inputSize: 320,
        kind: 'u2net',
        requirements: { memory: 'low' },
        license: 'unreviewed',
        legacyCacheKey: 'esquinabg:u2netp.onnx',
    },
    {
        id: 'background-removal-balanced',
        task: 'background-removal',
        tier: 'balanced',
        version: '1.0.0',
        format: 'onnx',
        file: 'isnet-quantized.onnx',
        sourceName: 'silueta',
        providers: ['wasm'],
        modelUrl: '/models/esquinabg/isnet-quantized.onnx',
        remoteUrl: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
        inputSize: 320,
        kind: 'u2net',
        requirements: { memory: 'medium' },
        license: 'unreviewed',
        legacyCacheKey: 'esquinabg:isnet-quantized.onnx',
    },
    {
        id: 'background-removal-high',
        task: 'background-removal',
        tier: 'high',
        version: '1.0.0',
        format: 'onnx',
        file: 'rmbg-quantized.onnx',
        providers: ['wasm'],
        modelUrl: '/models/esquinabg/rmbg-quantized.onnx',
        remoteUrl: 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx',
        inputSize: 1024,
        kind: 'rmbg',
        requirements: { memory: 'high' },
        license: 'unreviewed',
        legacyCacheKey: 'esquinabg:rmbg-quantized.onnx',
    },
];
