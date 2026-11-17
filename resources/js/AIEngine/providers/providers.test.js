import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureWasm, createWasmSession } from './wasm.js';
import { createWebGpuSession, probeWebGpu } from './webgpu.js';

test('sin API WebGPU el sondeo queda en unavailable', async () => {
    assert.equal(await probeWebGpu(undefined), 'unavailable');
});

test('un adaptador nulo no cuenta como WebGPU disponible', async () => {
    assert.equal(await probeWebGpu({ requestAdapter: async () => null }), 'unavailable');
});

test('un adaptador creado deja WebGPU en available', async () => {
    assert.equal(await probeWebGpu({ requestAdapter: async () => ({ name: 'adapter' }) }), 'available');
});

test('si el sondeo lanza, WebGPU queda en failed', async () => {
    assert.equal(
        await probeWebGpu({
            requestAdapter: async () => {
                throw new Error('gpu process crashed');
            },
        }),
        'failed',
    );
});

test('wasm usa un hilo, SIMD y las rutas que le pasan', () => {
    const ort = { env: { wasm: {} } };
    configureWasm(ort, {
        wasm: 'https://esquinaweb.test/build/ort.wasm',
        mjs: 'https://esquinaweb.test/build/ort.mjs',
    });
    assert.equal(ort.env.wasm.numThreads, 1);
    assert.equal(ort.env.wasm.simd, true);
    assert.equal(ort.env.wasm.proxy, false);
    assert.deepEqual(ort.env.wasm.wasmPaths, {
        wasm: 'https://esquinaweb.test/build/ort.wasm',
        mjs: 'https://esquinaweb.test/build/ort.mjs',
    });
});

test('la sesión wasm pide el proveedor wasm', async () => {
    let options;
    const ort = {
        InferenceSession: {
            async create(_buffer, next) {
                options = next;
                return { provider: 'wasm' };
            },
        },
    };
    const session = await createWasmSession(ort, new ArrayBuffer(4));
    assert.equal(session.provider, 'wasm');
    assert.deepEqual(options.executionProviders, ['wasm']);
});

test('la sesión WebGPU pide el proveedor webgpu', async () => {
    let options;
    const ort = {
        InferenceSession: {
            async create(_buffer, next) {
                options = next;
                return { provider: 'webgpu' };
            },
        },
    };
    const session = await createWebGpuSession(ort, new ArrayBuffer(4));
    assert.equal(session.provider, 'webgpu');
    assert.deepEqual(options.executionProviders, ['webgpu']);
});
