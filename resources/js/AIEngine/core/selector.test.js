import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKGROUND_REMOVAL_MODELS } from '../catalog/backgroundRemoval.js';
import { fallbackModel, providerPlan, selectModel } from './selector.js';

function profile(tier, extra = {}) {
    return {
        tier,
        webgpu: 'unavailable',
        ramGb: 8,
        cores: 8,
        ...extra,
    };
}

function select(quality, tier, extra = {}) {
    return selectModel({
        models: BACKGROUND_REMOVAL_MODELS,
        task: 'background-removal',
        quality,
        profile: profile(tier, extra.profile),
        image: extra.image,
    });
}

test('en automático un equipo limitado recibe el modelo básico', () => {
    const result = select('auto', 'basic');
    assert.equal(result.model.tier, 'basic');
    assert.equal(result.model.file, 'u2netp.onnx');
    assert.equal(result.allowed.high, false);
});

test('en automático un equipo intermedio recibe equilibrado y puede pedir alta', () => {
    const auto = select('auto', 'balanced');
    assert.equal(auto.model.tier, 'balanced');
    assert.equal(auto.model.sourceName, 'silueta');
    assert.equal(auto.allowed.high, true);

    const manual = select('high', 'balanced');
    assert.equal(manual.model.tier, 'high');
    assert.equal(manual.model.file, 'rmbg-quantized.onnx');
});

test('un equipo limitado no puede elegir alta calidad', () => {
    assert.throws(
        () => select('high', 'basic'),
        (err) => {
            assert.equal(err.code, 'quality-unavailable');
            assert.equal(err.message.includes('onnx'), false);
            assert.equal(err.message.includes('webgpu'), false);
            return true;
        },
    );
});

test('WebGPU disponible no sube la calidad y estos modelos siguen en wasm', () => {
    const result = select('auto', 'balanced', { profile: { webgpu: 'available' } });
    assert.equal(result.model.tier, 'balanced');
    assert.deepEqual(result.providers, ['wasm']);
});

test('el tamaño de la imagen no cambia el modelo de quitar fondo', () => {
    const small = select('auto', 'high', { image: { width: 64, height: 64 } });
    const large = select('auto', 'high', { image: { width: 8000, height: 6000 } });
    assert.equal(small.model.id, large.model.id);
});

test('el catálogo declara wasm, licencia sin revisar y una URL remota por modelo', () => {
    const remoteByTier = {
        basic: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
        balanced: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx',
        high: 'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx',
    };
    for (const model of BACKGROUND_REMOVAL_MODELS) {
        assert.equal(model.task, 'background-removal');
        assert.deepEqual(model.providers, ['wasm']);
        assert.equal(model.license, 'unreviewed');
        assert.equal(model.remoteUrl, remoteByTier[model.tier]);
        assert.equal(model.modelUrl, `/models/esquinabg/${model.file}`);
    }
});

test('un plan con WebGPU lo intenta solo si el adaptador está disponible', () => {
    const model = { providers: ['webgpu', 'wasm'] };
    assert.deepEqual(providerPlan(model, { webgpu: 'available' }), ['webgpu', 'wasm']);
    assert.deepEqual(providerPlan(model, { webgpu: 'failed' }), ['wasm']);
    assert.deepEqual(providerPlan(model, { webgpu: 'unavailable' }), ['wasm']);
});

test('un modelo solo wasm no anuncia WebGPU aunque el equipo la tenga', () => {
    assert.deepEqual(
        providerPlan({ providers: ['wasm'] }, { webgpu: 'available' }),
        ['wasm'],
    );
});

test('si alta falla el siguiente modelo es el básico, no el equilibrado', () => {
    const high = BACKGROUND_REMOVAL_MODELS.find((model) => model.tier === 'high');
    const next = fallbackModel(BACKGROUND_REMOVAL_MODELS, 'background-removal', high);
    assert.equal(next.tier, 'basic');
});

test('el modelo básico no tiene un nivel inferior', () => {
    const basic = BACKGROUND_REMOVAL_MODELS.find((model) => model.tier === 'basic');
    assert.equal(fallbackModel(BACKGROUND_REMOVAL_MODELS, 'background-removal', basic), null);
});
