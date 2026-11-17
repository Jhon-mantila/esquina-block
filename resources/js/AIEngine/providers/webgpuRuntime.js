import * as ort from 'onnxruntime-web/webgpu';
import { createWebGpuSession } from './webgpu.js';
import { configureWasm } from './wasm.js';

/**
 * El build WebGPU sigue necesitando los WASM JSEP. Las rutas llegan ya resueltas
 * desde el hilo principal para que funcionen bajo el alias de Apache.
 *
 * @param {ArrayBuffer} buffer
 * @param {{ wasm?: string, mjs?: string }} wasmPaths
 */
export async function createSession(buffer, wasmPaths) {
    configureWasm(ort, wasmPaths);
    return createWebGpuSession(ort, buffer);
}
