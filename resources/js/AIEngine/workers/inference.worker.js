import * as ort from 'onnxruntime-web/wasm';
import { loadModelBuffer } from '../cache/modelCache.js';
import { PUBLIC_MODEL_ERROR } from '../core/errors.js';
import { configureWasm, createWasmSession } from '../providers/wasm.js';
import { runBackgroundRemoval } from '../tasks/backgroundRemoval.js';
import { runSuperResolution } from '../tasks/superResolution.js';
import { createInferenceHandler } from './handler.js';

const handle = createInferenceHandler({
    async loadBuffer(model, onStatus) {
        const result = await loadModelBuffer(model, { onStatus });
        return result.buffer;
    },
    async createSession(buffer, provider) {
        if (provider === 'wasm') return createWasmSession(ort, buffer);
        // Los modelos actuales solo declaran wasm. El proveedor WebGPU se
        // prueba en el motor, pero este worker no lo carga todavía.
        void provider;
        throw new Error('Proveedor no disponible.');
    },
    async run(session, model, image, onStatus) {
        if (model.task === 'background-removal') {
            return runBackgroundRemoval(ort, session, model, image);
        }
        if (model.task === 'super-resolution') {
            return runSuperResolution(ort, session, model, image, onStatus);
        }
        throw new Error('Tarea sin adaptador.');
    },
});

self.onmessage = (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'init') {
        configureWasm(ort, message.wasmPaths);
        self.postMessage({ type: 'ready' });
        return;
    }

    Promise.resolve(handle(message, (out) => self.postMessage(out))).catch(() => {
        self.postMessage({
            type: 'error',
            id: message.id,
            code: 'model-failed',
            message: PUBLIC_MODEL_ERROR,
        });
    });
};
