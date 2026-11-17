/**
 * Sondeo del adaptador. No crea una sesión ONNX y no sube el nivel de calidad.
 * `unavailable`: no hay API o el adaptador vino vacío.
 * `failed`: la API existe y el pedido lanzó un error.
 *
 * @param {GPU | undefined | null} [gpu]
 * @returns {Promise<'available' | 'unavailable' | 'failed'>}
 */
export async function probeWebGpu(gpu) {
    const target = arguments.length === 0 ? globalThis.navigator?.gpu : gpu;
    if (!target || typeof target.requestAdapter !== 'function') return 'unavailable';

    try {
        const adapter = await target.requestAdapter();
        return adapter ? 'available' : 'unavailable';
    } catch {
        return 'failed';
    }
}

/**
 * @param {{ InferenceSession: { create: Function } }} ort
 * @param {ArrayBuffer} buffer
 */
export function createWebGpuSession(ort, buffer) {
    return ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
    });
}
