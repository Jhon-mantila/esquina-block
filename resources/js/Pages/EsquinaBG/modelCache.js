import { MODELS, MODEL_CACHE_NAME, modelLocalUrl } from './models.js';

/**
 * Obtiene un ArrayBuffer del modelo: Cache API → mismo origen → URL remota.
 * @param {import('./models.js').ModelId} modelId
 * @param {(path: string) => string} resolvePublic
 * @param {(pct: number, msg: string) => void} [onProgress]
 * @returns {Promise<ArrayBuffer>}
 */
export async function loadModelBuffer(modelId, resolvePublic, onProgress = () => {}) {
    const model = MODELS[modelId];
    if (!model) throw new Error('Modelo desconocido.');

    const localUrl = modelLocalUrl(modelId, resolvePublic);
    const cacheKey = `esquinabg:${model.file}`;

    onProgress(5, 'Preparando el modelo…');

    try {
        const cache = await caches.open(MODEL_CACHE_NAME);
        const cached = await cache.match(cacheKey);
        if (cached) {
            onProgress(35, 'Modelo listo (caché)…');
            return cached.arrayBuffer();
        }

        // 1) Mismo origen (public/models/…)
        onProgress(10, 'Buscando modelo en este sitio…');
        let response = await fetch(localUrl, { credentials: 'same-origin' });
        if (!response.ok && model.remoteUrl) {
            onProgress(15, 'Descargando modelo (solo la primera vez)…');
            response = await fetch(model.remoteUrl, { mode: 'cors' });
        }

        if (!response.ok) {
            throw new Error(`No se pudo cargar el modelo (${response.status}).`);
        }

        const buffer = await response.arrayBuffer();
        try {
            await cache.put(cacheKey, new Response(buffer.slice(0), {
                headers: { 'Content-Type': 'application/octet-stream' },
            }));
        } catch {
            // Quota o privado: seguimos sin persistir.
        }

        onProgress(40, 'Modelo cargado…');
        return buffer;
    } catch (err) {
        // Si Cache API no existe, intenta fetch directo.
        onProgress(12, 'Descargando modelo…');
        let response = await fetch(localUrl, { credentials: 'same-origin' });
        if (!response.ok && model.remoteUrl) {
            response = await fetch(model.remoteUrl, { mode: 'cors' });
        }
        if (!response.ok) {
            const msg = err instanceof Error ? err.message : 'Error al cargar el modelo.';
            throw new Error(msg);
        }
        return response.arrayBuffer();
    }
}
