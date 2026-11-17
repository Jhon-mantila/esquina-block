import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKGROUND_REMOVAL_MODELS } from '../catalog/backgroundRemoval.js';
import { EsquinaAI } from './engine.js';

function profile(tier, extra = {}) {
    return { tier, webgpu: 'unavailable', ramGb: 8, cores: 8, ...extra };
}

function createRunner(hooks = {}) {
    const loaded = [];
    const released = [];
    let seq = 0;
    return {
        loaded,
        released,
        runner: {
            async load(model, providers) {
                loaded.push({ tier: model.tier, providers: [...providers] });
                if (hooks.load) return hooks.load(model, providers, ++seq);
                return { token: ++seq, provider: providers[0], tier: model.tier };
            },
            async run(handle, input) {
                if (hooks.run) return hooks.run(handle, input);
                return { width: input.width, height: input.height, data: input.data };
            },
            async release(handle) {
                released.push(handle.token);
            },
        },
    };
}

test('si el modelo arranca no baja de calidad', async () => {
    const { runner, loaded } = createRunner();
    const ai = await EsquinaAI.create({
        profile: profile('high'),
        runner,
    });

    const session = await ai.open({ task: 'background-removal', quality: 'auto' });

    assert.deepEqual(loaded.map((item) => item.tier), ['high']);
    assert.deepEqual(loaded[0].providers, ['wasm']);
    assert.equal(session.tier, 'high');
    assert.equal(session.provider, 'wasm');
    assert.equal(session.fellBack, false);
    assert.equal(session.notice, null);
});

test('si alta no arranca el siguiente intento es básico y el aviso no cita ONNX', async () => {
    const { runner, loaded } = createRunner({
        load(model, providers, token) {
            if (model.tier === 'high') {
                throw new Error('onnxruntime-web failed to create WebGPU session');
            }
            return { token, provider: providers[0], tier: model.tier };
        },
    });
    const ai = await EsquinaAI.create({
        profile: profile('high'),
        runner,
    });

    const session = await ai.open({ task: 'background-removal', quality: 'high' });

    assert.deepEqual(loaded.map((item) => item.tier), ['high', 'basic']);
    assert.equal(loaded.some((item) => item.tier === 'balanced'), false);
    assert.equal(session.tier, 'basic');
    assert.equal(session.fellBack, true);
    assert.equal(session.notice.includes('onnx'), false);
    assert.equal(session.notice.includes('WebGPU'), false);
});

test('WebGPU en el perfil no se añade a los modelos que solo declaran wasm', async () => {
    const { runner, loaded } = createRunner();
    const ai = await EsquinaAI.create({
        profile: profile('basic', { webgpu: 'available', ramGb: 2, cores: 2 }),
        runner,
    });

    const session = await ai.open({ task: 'background-removal', quality: 'auto' });
    assert.deepEqual(loaded[0].providers, ['wasm']);
    assert.equal(session.provider, 'wasm');
});

test('si ningún modelo arranca el error público oculta el fallo interno', async () => {
    const { runner } = createRunner({
        load() {
            throw new Error('Aborted(CompileError) at ort-wasm-simd-threaded.wasm');
        },
    });
    const ai = await EsquinaAI.create({
        profile: profile('basic', { ramGb: 2, cores: 2 }),
        runner,
    });

    await assert.rejects(
        () => ai.open({ task: 'background-removal', quality: 'auto' }),
        (err) => {
            assert.equal(err.code, 'model-failed');
            assert.equal(err.message.includes('CompileError'), false);
            assert.equal(err.message.includes('wasm'), false);
            return true;
        },
    );
});

test('un equipo limitado no llega a cargar el modelo de alta calidad', async () => {
    const { runner, loaded } = createRunner();
    const ai = await EsquinaAI.create({
        profile: profile('basic', { ramGb: 2, cores: 2 }),
        runner,
    });

    await assert.rejects(
        () => ai.open({ task: 'background-removal', quality: 'high' }),
        (err) => err.code === 'quality-unavailable',
    );
    assert.equal(loaded.length, 0);
});

test('cambiar de modelo en la misma tarea libera la sesión anterior', async () => {
    const { runner, released } = createRunner();
    const ai = await EsquinaAI.create({
        profile: profile('high'),
        runner,
    });

    await ai.open({ task: 'background-removal', quality: 'basic' });
    const second = await ai.open({ task: 'background-removal', quality: 'high' });
    assert.deepEqual(released, [1]);
    await second.release();
    assert.deepEqual(released, [1, 2]);
});

test('dos tareas conservan su propia sesión', async () => {
    const models = [
        ...BACKGROUND_REMOVAL_MODELS,
        {
            id: 'super-resolution-basic',
            task: 'super-resolution',
            tier: 'basic',
            version: '1.0.0',
            format: 'onnx',
            file: 'pending.onnx',
            providers: ['wasm'],
            modelUrl: '/models/esquinaupscale/pending.onnx',
            license: 'unreviewed',
            legacyCacheKey: null,
        },
    ];
    const { runner, released } = createRunner();
    const ai = await EsquinaAI.create({
        profile: profile('basic', { ramGb: 2, cores: 2 }),
        models,
        runner,
    });

    await ai.open({ task: 'background-removal', quality: 'basic' });
    await ai.open({ task: 'super-resolution', quality: 'basic' });
    assert.deepEqual(released, []);
});

test('si la ejecución falla, reintenta con el básico y no con el equilibrado', async () => {
    const loaded = [];
    let runs = 0;
    const ai = await EsquinaAI.create({
        profile: profile('high'),
        runner: {
            async load(model, providers) {
                loaded.push(model.tier);
                return { token: loaded.length, provider: providers[0], tier: model.tier };
            },
            async run(handle, input) {
                runs += 1;
                if (handle.tier !== 'basic') {
                    throw new Error('onnxruntime session.run failed');
                }
                return { width: input.width, height: input.height, data: input.data };
            },
            async release() {},
        },
    });
    const session = await ai.open({ task: 'background-removal', quality: 'high' });
    const output = await session.run({
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([1, 2, 3, 255]),
    });

    assert.deepEqual(loaded, ['high', 'basic']);
    assert.equal(runs, 2);
    assert.equal(session.tier, 'basic');
    assert.equal(session.fellBack, true);
    assert.equal(output.width, 1);
    assert.equal(session.notice.includes('onnx'), false);
});
