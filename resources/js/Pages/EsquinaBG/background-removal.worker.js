/**
 * Web Worker: quitar fondo sin bloquear la UI.
 * 1) Intenta ONNX del modelo pedido
 * 2) Si falla → modelo basic
 * 3) Si falla → bordercut (instantáneo)
 */
import { removeBackground } from 'bordercut';
import { toImageData } from './imageDataUtil.js';
import { configureOrt, removeBackgroundOnnx } from './onnxRemove.js';

/** @type {string} */
let publicResolverPrefix = '';
/** @type {string} */
let pageOrigin = '';

/** @param {string} path */
function resolvePublic(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    const rooted = `${publicResolverPrefix}${p}`;
    // URL absoluta: el Worker a veces resuelve mal las rutas relativas.
    if (pageOrigin) {
        return `${pageOrigin}${rooted}`;
    }
    return rooted;
}

/**
 * @param {ImageBitmap} bitmap
 * @returns {ImageData}
 */
function bitmapToImageData(bitmap) {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No se pudo leer la imagen en el worker.');
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<Blob>}
 */
async function imageDataToPngBlob(imageData) {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el PNG.');
    ctx.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
}

/**
 * @param {ImageData} imageData
 */
function runBordercut(imageData) {
    // Copia: bordercut no debe mutar el buffer original (sirve para reintentos ONNX).
    const rgba = new Uint8ClampedArray(imageData.data);
    const result = removeBackground(
        {
            width: imageData.width,
            height: imageData.height,
            data: rgba,
        },
        {
            tolerance: 46,
            edgeProtection: 58,
            feather: 2,
            cleanup: 1,
            protectCenter: true,
            recoverPaleSubject: true,
            interiorBackground: false,
        },
    );
    // result.image es PixelImage { width, height, data }, no el buffer directo.
    return toImageData(
        result.image.data,
        result.image.width || imageData.width,
        result.image.height || imageData.height,
    );
}

/**
 * @param {number} id
 * @param {number} percent
 * @param {string} message
 */
function progress(id, percent, message) {
    self.postMessage({ type: 'progress', id, percent, message });
}

/**
 * @param {MessageEvent} event
 */
self.onmessage = async (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'init') {
        publicResolverPrefix = msg.toolBase || '';
        pageOrigin = msg.origin || self.location?.origin || '';
        configureOrt(msg.wasmPaths || '');
        self.postMessage({ type: 'ready' });
        return;
    }

    if (msg.type !== 'remove') return;

    const { id, modelId, bitmap } = msg;
    /** @type {string|null} */
    let notice = null;
    /** @type {import('./models.js').ModelId | 'instant'} */
    let usedModel = modelId;

    try {
        progress(id, 2, 'Leyendo imagen…');
        const imageData = bitmapToImageData(bitmap);
        bitmap.close?.();

        let out = null;

        // 1) Modelo pedido
        try {
            progress(id, 8, 'Cargando calidad seleccionada…');
            out = await removeBackgroundOnnx(
                imageData,
                modelId,
                resolvePublic,
                (pct, m) => progress(id, pct, m),
            );
            usedModel = modelId;
        } catch (primaryErr) {
            const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
            // 2) Fallback a básico
            if (modelId !== 'basic') {
                notice = 'No se pudo usar la calidad elegida. Probando modo básico…';
                progress(id, 20, notice);
                try {
                    out = await removeBackgroundOnnx(
                        imageData,
                        'basic',
                        resolvePublic,
                        (pct, m) => progress(id, Math.max(20, pct), m),
                    );
                    usedModel = 'basic';
                    notice = 'Tu dispositivo no pudo cargar el modelo de alta calidad. Se ha usado el modo básico.';
                } catch (basicErr) {
                    // 3) bordercut
                    const basicMsg = basicErr instanceof Error ? basicErr.message : String(basicErr);
                    notice = `Tu dispositivo no pudo cargar el modelo de IA. Se usó el modo rápido local. (${basicMsg || primaryMsg})`;
                    progress(id, 50, 'Usando modo rápido…');
                    out = runBordercut(imageData);
                    usedModel = 'instant';
                }
            } else {
                notice = `Tu dispositivo no pudo cargar el modelo de IA. Se usó el modo rápido local. (${primaryMsg})`;
                progress(id, 50, 'Usando modo rápido…');
                out = runBordercut(imageData);
                usedModel = 'instant';
            }
        }

        progress(id, 97, 'Generando PNG…');
        const blob = await imageDataToPngBlob(out);
        progress(id, 100, 'Listo');
        self.postMessage({
            type: 'done',
            id,
            blob,
            width: out.width,
            height: out.height,
            usedModel,
            notice,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo quitar el fondo.';
        self.postMessage({ type: 'error', id, message });
    }
};
