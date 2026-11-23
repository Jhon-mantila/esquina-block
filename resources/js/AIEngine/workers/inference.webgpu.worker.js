import { loadModelBuffer } from '../cache/modelCache.js';
import { PUBLIC_MODEL_ERROR } from '../core/errors.js';
import { configure, createSession, ort } from '../providers/webgpuRuntime.js';
import { dispatchTask } from '../tasks/dispatch.js';
import { createInferenceHandler } from './handler.js';

const handle = createInferenceHandler({
    async loadBuffer(model, onStatus) {
        const result = await loadModelBuffer(model, { onStatus });
        return result.buffer;
    },
    async createSession(buffer, provider) {
        return createSession(buffer, provider);
    },
    async run(session, model, image, onStatus) {
        return dispatchTask(ort, session, model, image, onStatus);
    },
});

self.onmessage = (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'init') {
        configure(message.wasmPaths);
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
