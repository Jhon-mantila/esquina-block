import { EngineError } from '../core/errors.js';

export const MODEL_CACHE_NAME = 'esquina-ai-models-v1';
export const LEGACY_MODEL_CACHE_NAME = 'esquinabg-models-v1';

/**
 * @param {{ id: string, version: string }} model
 */
export function modelCacheKey(model) {
    return `${model.id}@${model.version}`;
}

/**
 * @param {{ legacyCacheKey?: string | null, file?: string }} model
 */
export function legacyModelCacheKey(model) {
    if (model.legacyCacheKey) return model.legacyCacheKey;
    if (!model.file) return null;
    return `esquinabg:${model.file}`;
}

/**
 * @param {Cache} cache
 * @param {string} key
 * @param {ArrayBuffer} buffer
 */
async function storeBuffer(cache, key, buffer) {
    await cache.put(key, new Response(buffer.slice(0), {
        headers: { 'Content-Type': 'application/octet-stream' },
    }));
}

/**
 * @param {Response} response
 * @param {(status: { phase: string, loaded?: number, total?: number }) => void} onStatus
 */
async function readBody(response, onStatus) {
    const totalHeader = response.headers.get('content-length');
    const total = totalHeader ? Number(totalHeader) : NaN;
    if (!response.body || !Number.isFinite(total) || total <= 0) {
        onStatus({ phase: 'downloading' });
        return response.arrayBuffer();
    }

    const reader = response.body.getReader();
    /** @type {Uint8Array[]} */
    const chunks = [];
    let loaded = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        onStatus({ phase: 'downloading', loaded, total });
    }

    const out = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return out.buffer;
}

/**
 * Caché nueva, luego la de EsquinaBG, luego el mismo origen y al final la URL remota.
 * El resultado queda en la caché nueva.
 *
 * @param {{
 *   id: string,
 *   version: string,
 *   modelUrl?: string,
 *   resolvedUrl?: string,
 *   remoteUrl?: string,
 *   legacyCacheKey?: string | null,
 *   file?: string,
 * }} model
 * @param {{
 *   fetch?: typeof fetch,
 *   caches?: CacheStorage,
 *   resolvePublicUrl?: (path: string) => string,
 *   onStatus?: (status: { phase: string, loaded?: number, total?: number }) => void,
 * }} [options]
 */
export async function loadModelBuffer(model, options = {}) {
    const fetchImpl = options.fetch ?? globalThis.fetch;
    const cachesImpl = options.caches ?? globalThis.caches;
    const onStatus = options.onStatus ?? (() => {});
    const resolvePublicUrl = options.resolvePublicUrl ?? ((path) => path);
    const localUrl = model.resolvedUrl || resolvePublicUrl(model.modelUrl || '');
    const key = modelCacheKey(model);
    const legacyKey = legacyModelCacheKey(model);

    /** @type {Cache | null} */
    let cache = null;
    try {
        cache = await cachesImpl.open(MODEL_CACHE_NAME);
        const cached = await cache.match(key);
        if (cached) {
            onStatus({ phase: 'available' });
            return { buffer: await cached.arrayBuffer(), source: 'cache' };
        }
    } catch {
        cache = null;
    }

    if (legacyKey) {
        try {
            const legacy = await cachesImpl.open(LEGACY_MODEL_CACHE_NAME);
            const legacyHit = await legacy.match(legacyKey);
            if (legacyHit) {
                const buffer = await legacyHit.arrayBuffer();
                if (cache) {
                    try {
                        await storeBuffer(cache, key, buffer);
                    } catch {
                        // La cuota llena no impide usar el archivo ya leído.
                    }
                }
                onStatus({ phase: 'available' });
                return { buffer, source: 'legacy' };
            }
        } catch {
            // Sin Cache API heredada se sigue con la red.
        }
    }

    let response = await fetchImpl(localUrl, { credentials: 'same-origin' });
    let source = 'origin';
    if (!response.ok && model.remoteUrl) {
        response = await fetchImpl(model.remoteUrl, { mode: 'cors' });
        source = 'remote';
    }
    if (!response.ok) {
        onStatus({ phase: 'error' });
        throw new EngineError(
            'model-fetch-failed',
            'No se pudo descargar el modelo. Inténtalo de nuevo.',
        );
    }

    const buffer = await readBody(response, onStatus);
    if (cache) {
        try {
            await storeBuffer(cache, key, buffer);
        } catch {
            // Seguimos con el buffer en memoria.
        }
    }
    return { buffer, source };
}
