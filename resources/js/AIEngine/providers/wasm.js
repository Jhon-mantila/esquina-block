/**
 * Un hilo: no exige COOP/COEP ni SharedArrayBuffer.
 * @param {{ env: { wasm: Record<string, unknown> } }} ort
 * @param {string | { wasm?: string, mjs?: string } | undefined} wasmPaths
 */
export function configureWasm(ort, wasmPaths) {
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
 * @param {{ InferenceSession: { create: Function } }} ort
 * @param {ArrayBuffer} buffer
 */
export function createWasmSession(ort, buffer) {
    return ort.InferenceSession.create(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
    });
}
