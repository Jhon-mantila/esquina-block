/**
 * Un solo LaMa. El grafo es el de toolsmonk/lama-webgpu: la exportación de
 * Carve/LaMa-ONNX con los cambios que permiten ejecutarlo en WebGPU.
 * Pesos de advimman/lama, Apache-2.0.
 *
 * Entradas fijas: image float32 [1, 3, 512, 512] en 0..1,
 * mask float32 [1, 1, 512, 512] con 1 = rellenar.
 * Salida: output float32 [1, 3, 512, 512] en 0..255, según la ficha del modelo.
 */

export const INPAINTING_MODELS = [
    {
        id: 'inpainting-lama',
        task: 'inpainting',
        tier: 'basic',
        version: '1.0.0',
        format: 'onnx',
        file: 'lama_webgpu.onnx',
        sourceName: 'lama-webgpu',
        providers: ['webgpu', 'wasm'],
        modelUrl: '/models/esquinaeraser/lama_webgpu.onnx',
        remoteUrl: 'https://huggingface.co/toolsmonk/lama-webgpu/resolve/main/lama_webgpu.onnx',
        inputSize: 512,
        feather: 12,
        outputMax: 255,
        requirements: { memory: 'high' },
        license: 'Apache-2.0',
        sha256: '75ddeeb344ca4603b261b09fce0e9323e17872042907f5ee205c9875464c8e3b',
        legacyCacheKey: null,
    },
];
