import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInferenceHandler } from './handler.js';

function posted(handler) {
    const messages = [];
    return {
        messages,
        send(message) {
            return handler(message, (out) => messages.push(out));
        },
    };
}

test('si WebGPU no crea la sesión, el handler prueba wasm y reporta wasm', async () => {
    const tried = [];
    const handler = createInferenceHandler({
        async loadBuffer() {
            return new ArrayBuffer(2);
        },
        async createSession(_buffer, provider) {
            tried.push(provider);
            if (provider === 'webgpu') throw new Error('webgpu device lost');
            return { id: 'session' };
        },
        async run() {
            return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
        },
    });
    const { messages, send } = posted(handler);

    await send({
        type: 'load',
        id: 7,
        token: 's1',
        model: { id: 'demo', task: 'background-removal' },
        providers: ['webgpu', 'wasm'],
    });

    assert.deepEqual(tried, ['webgpu', 'wasm']);
    assert.deepEqual(messages.at(-1), { type: 'loaded', id: 7, token: 's1', provider: 'wasm' });
});

test('si todos los proveedores fallan, el mensaje no incluye el error de ONNX', async () => {
    const handler = createInferenceHandler({
        async loadBuffer() {
            return new ArrayBuffer(2);
        },
        async createSession() {
            throw new Error('onnxruntime-web CompileError');
        },
        async run() {
            throw new Error('unused');
        },
    });
    const { messages, send } = posted(handler);

    await send({
        type: 'load',
        id: 3,
        token: 's2',
        model: { id: 'demo' },
        providers: ['wasm'],
    });

    const error = messages.at(-1);
    assert.equal(error.type, 'error');
    assert.equal(error.message.includes('CompileError'), false);
    assert.equal(error.message.includes('onnxruntime'), false);
});

test('release elimina la sesión y un run posterior no la reutiliza', async () => {
    let released = false;
    const handler = createInferenceHandler({
        async loadBuffer() {
            return new ArrayBuffer(1);
        },
        async createSession() {
            return {
                release() {
                    released = true;
                },
            };
        },
        async run() {
            return { width: 1, height: 1, data: new Uint8ClampedArray(4) };
        },
    });
    const { messages, send } = posted(handler);

    await send({
        type: 'load',
        id: 1,
        token: 's3',
        model: { id: 'demo' },
        providers: ['wasm'],
    });
    await send({ type: 'release', id: 2, token: 's3' });
    await send({
        type: 'run',
        id: 4,
        token: 's3',
        image: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
    });

    assert.equal(released, true);
    assert.equal(messages.at(-1).type, 'error');
});
