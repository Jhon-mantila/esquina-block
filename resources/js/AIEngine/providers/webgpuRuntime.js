import * as ort from 'onnxruntime-web/webgpu';
import { createWebGpuSession } from './webgpu.js';
import { configureWasm, createWasmSession } from './wasm.js';

/**
 * Build WebGPU de onnxruntime-web 1.31. También puede crear sesiones WASM.
 * Los binarios son los asyncify, no los del worker WASM de Esquina BG y Upscale.
 * Las rutas llegan ya resueltas desde el hilo principal.
 *
 * @param {{ wasm?: string, mjs?: string }} wasmPaths
 */
export function configure(wasmPaths) {
    configureWasm(ort, wasmPaths);
}

/**
 * @param {ArrayBuffer} buffer
 * @param {string} provider
 */
export function createSession(buffer, provider) {
    if (provider === 'webgpu') return createWebGpuSession(ort, buffer);
    if (provider === 'wasm') return createWasmSession(ort, buffer);
    throw new Error('Proveedor no disponible.');
}

export { ort };
