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

test('si WebGPU procesa mal, el handler crea la sesión wasm y devuelve ese proveedor', async () => {
    const created = [];
    let runs = 0;
    const handler = createInferenceHandler({
        async loadBuffer() {
            return new ArrayBuffer(4);
        },
        async createSession(_buffer, provider) {
            created.push(provider);
            return { id: provider };
        },
        async run(session) {
            runs += 1;
            if (session.id === 'webgpu') throw new Error('kernel failed');
            return { width: 2, height: 2, data: new Uint8ClampedArray(16) };
        },
    });
    const { messages, send } = posted(handler);

    await send({
        type: 'load',
        id: 1,
        token: 's4',
        model: { id: 'lama', task: 'inpainting' },
        providers: ['webgpu', 'wasm'],
    });
    await send({
        type: 'run',
        id: 2,
        token: 's4',
        image: { width: 2, height: 2, data: new Uint8ClampedArray(16) },
        mask: { width: 2, height: 2, data: new Uint8Array(4) },
    });

    assert.deepEqual(created, ['webgpu', 'wasm']);
    assert.equal(runs, 2);
    const result = messages.at(-1);
    assert.equal(result.type, 'result');
    assert.equal(result.provider, 'wasm');
    assert.equal(result.width, 2);
});

test('la máscara viaja junto a la imagen', async () => {
    /** @type {object | null} */
    let seen = null;
    const handler = createInferenceHandler({
        async loadBuffer() {
            return new ArrayBuffer(1);
        },
        async createSession() {
            return { id: 'wasm' };
        },
        async run(_session, _model, image) {
            seen = image;
            return { width: image.width, height: image.height, data: image.data };
        },
    });
    const { send } = posted(handler);
    const mask = new Uint8Array([0, 255]);

    await send({
        type: 'load',
        id: 1,
        token: 's5',
        model: { id: 'lama' },
        providers: ['wasm'],
    });
    await send({
        type: 'run',
        id: 2,
        token: 's5',
        image: { width: 2, height: 1, data: new Uint8ClampedArray(8) },
        mask: { width: 2, height: 1, data: mask },
    });

    assert.equal(seen.mask.data, mask);
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
