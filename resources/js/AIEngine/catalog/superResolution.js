/**
 * Superresolución neuronal. Los dos archivos son exportaciones ONNX de pesos
 * oficiales de xinntao/Real-ESRGAN (BSD-3-Clause, © Xintao Wang).
 * No hay un tercer modelo general, más pequeño y con la misma licencia,
 * así que no existe nivel equilibrado.
 */

export const SUPER_RESOLUTION_MODELS = [
    {
        id: 'super-resolution-basic',
        task: 'super-resolution',
        tier: 'basic',
        version: '1.0.0',
        format: 'onnx',
        file: 'realesr-general-x4v3.onnx',
        sourceName: 'realesr-general-x4v3',
        providers: ['wasm'],
        modelUrl: '/models/esquinaupscale/realesr-general-x4v3.onnx',
        remoteUrl: 'https://huggingface.co/CoderViking/realesr-general-x4v3-onnx/resolve/main/realesr-general-x4v3.onnx',
        scale: 4,
        tileSize: 128,
        overlap: 8,
        maxInputEdge: 768,
        layout: 'nchw-rgb-01',
        requirements: { memory: 'low' },
        license: 'BSD-3-Clause',
        legacyCacheKey: null,
    },
    {
        id: 'super-resolution-high',
        task: 'super-resolution',
        tier: 'high',
        version: '1.0.0',
        format: 'onnx',
        file: 'realesrgan-x4plus.onnx',
        sourceName: 'RealESRGAN_x4plus',
        providers: ['wasm'],
        modelUrl: '/models/esquinaupscale/realesrgan-x4plus.onnx',
        remoteUrl: 'https://huggingface.co/othytenk/realesrgan-x4plus/resolve/main/realesrgan_x4plus.onnx',
        scale: 4,
        tileSize: 96,
        overlap: 12,
        maxInputEdge: 1024,
        layout: 'nchw-rgb-01',
        requirements: { memory: 'high' },
        license: 'BSD-3-Clause',
        legacyCacheKey: null,
    },
];
