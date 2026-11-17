import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKGROUND_REMOVAL_MODELS } from '../catalog/backgroundRemoval.js';
import {
    LEGACY_MODEL_CACHE_NAME,
    MODEL_CACHE_NAME,
    legacyModelCacheKey,
    loadModelBuffer,
    modelCacheKey,
} from './modelCache.js';

const basic = BACKGROUND_REMOVAL_MODELS.find((model) => model.tier === 'basic');

function memoryCaches(initial = {}) {
    const stores = new Map();
    const ensure = (name) => {
        if (!stores.has(name)) stores.set(name, new Map());
        return stores.get(name);
    };
    for (const [name, entries] of Object.entries(initial)) {
        const map = ensure(name);
        for (const [key, buffer] of Object.entries(entries)) {
            map.set(key, buffer);
        }
    }
    return {
        async open(name) {
            const map = ensure(name);
            return {
                async match(key) {
                    if (!map.has(key)) return undefined;
                    return new Response(map.get(key).slice(0));
                },
                async put(key, response) {
                    map.set(key, await response.arrayBuffer());
                },
            };
        },
        snapshot(name) {
            return stores.get(name) ?? new Map();
        },
    };
}

function bytes(values) {
    return Uint8Array.from(values).buffer;
}

test('la clave nueva usa id y versión, y la heredada conserva el nombre de EsquinaBG', () => {
    assert.equal(modelCacheKey(basic), `${basic.id}@${basic.version}`);
    assert.equal(legacyModelCacheKey(basic), 'esquinabg:u2netp.onnx');
    assert.equal(MODEL_CACHE_NAME, 'esquina-ai-models-v1');
    assert.equal(LEGACY_MODEL_CACHE_NAME, 'esquinabg-models-v1');
});

test('si el modelo ya está en la caché nueva no se descarga', async () => {
    const stored = bytes([9, 8, 7]);
    const fetches = [];
    const statuses = [];
    const caches = memoryCaches({
        [MODEL_CACHE_NAME]: { [modelCacheKey(basic)]: stored },
    });

    const result = await loadModelBuffer(basic, {
        caches,
        fetch: async (url) => {
            fetches.push(url);
            return new Response(null, { status: 404 });
        },
        onStatus: (status) => statuses.push(status),
    });

    assert.equal(fetches.length, 0);
    assert.equal(result.source, 'cache');
    assert.deepEqual(new Uint8Array(result.buffer), new Uint8Array(stored));
    assert.equal(statuses.some((status) => status.phase === 'downloading'), false);
    assert.equal(statuses.at(-1)?.phase, 'available');
});

test('si está en la caché de EsquinaBG se copia a la nueva y no se descarga', async () => {
    const stored = bytes([4, 5, 6]);
    const fetches = [];
    const caches = memoryCaches({
        [LEGACY_MODEL_CACHE_NAME]: { [legacyModelCacheKey(basic)]: stored },
    });

    const result = await loadModelBuffer(basic, {
        caches,
        fetch: async (url) => {
            fetches.push(String(url));
            return new Response(null, { status: 404 });
        },
    });

    assert.equal(fetches.length, 0);
    assert.equal(result.source, 'legacy');
    const copied = caches.snapshot(MODEL_CACHE_NAME).get(modelCacheKey(basic));
    assert.deepEqual(new Uint8Array(copied), new Uint8Array(stored));
});

test('el mismo origen tiene prioridad sobre la URL remota', async () => {
    const local = bytes([1, 1, 1]);
    const seen = [];
    const caches = memoryCaches();
    const result = await loadModelBuffer(
        { ...basic, resolvedUrl: 'https://esquinaweb.test/models/esquinabg/u2netp.onnx' },
        {
            caches,
            fetch: async (url) => {
                seen.push(String(url));
                if (String(url).includes('esquinaweb.test')) {
                    return new Response(local.slice(0), { status: 200 });
                }
                return new Response(bytes([9]), { status: 200 });
            },
        },
    );

    assert.deepEqual(seen, ['https://esquinaweb.test/models/esquinabg/u2netp.onnx']);
    assert.equal(result.source, 'origin');
    assert.deepEqual(
        new Uint8Array(caches.snapshot(MODEL_CACHE_NAME).get(modelCacheKey(basic))),
        new Uint8Array(local),
    );
});

test('si falta en la VPS lo pide al remoto, informa la descarga y lo guarda', async () => {
    const remote = bytes([2, 3, 4, 5]);
    const statuses = [];
    const caches = memoryCaches();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array(remote));
            controller.close();
        },
    });

    const result = await loadModelBuffer(
        { ...basic, resolvedUrl: 'https://esquinaweb.test/models/esquinabg/u2netp.onnx' },
        {
            caches,
            fetch: async (url) => {
                if (String(url).includes('esquinaweb.test')) {
                    return new Response(null, { status: 404 });
                }
                return new Response(stream, {
                    status: 200,
                    headers: { 'Content-Length': String(remote.byteLength) },
                });
            },
            onStatus: (status) => statuses.push(status),
        },
    );

    assert.equal(result.source, 'remote');
    assert.equal(statuses.some((status) => (
        status.phase === 'downloading'
        && status.loaded === remote.byteLength
        && status.total === remote.byteLength
    )), true);
    assert.deepEqual(
        new Uint8Array(caches.snapshot(MODEL_CACHE_NAME).get(modelCacheKey(basic))),
        new Uint8Array(remote),
    );
});

test('si no hay forma de obtener el modelo el mensaje no lleva códigos internos', async () => {
    await assert.rejects(
        () => loadModelBuffer(
            { ...basic, resolvedUrl: 'https://esquinaweb.test/models/esquinabg/u2netp.onnx' },
            {
                caches: memoryCaches(),
                fetch: async () => new Response(null, { status: 503 }),
            },
        ),
        (err) => {
            assert.equal(err.code, 'model-fetch-failed');
            assert.equal(err.message.includes('503'), false);
            assert.equal(err.message.includes('onnx'), false);
            return true;
        },
    );
});
