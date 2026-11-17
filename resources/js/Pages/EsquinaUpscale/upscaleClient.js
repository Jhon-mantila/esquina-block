import { EsquinaAI, SUPER_RESOLUTION_MODELS } from '@/AIEngine';
import { resolvePublicUrl } from '../EsquinaBG/toolBase.js';

/** @typedef {'auto' | 'basic' | 'balanced' | 'high'} QualityId */

/** @type {Promise<object> | null} */
let aiPromise = null;
/** @type {object | null} */
let session = null;
/** @type {QualityId | null} */
let sessionQuality = null;

function getAi() {
    if (!aiPromise) {
        aiPromise = EsquinaAI.create({
            models: SUPER_RESOLUTION_MODELS,
            resolvePublicUrl(path) {
                const relative = resolvePublicUrl(path);
                if (typeof window === 'undefined') return relative;
                return new URL(relative, window.location.origin).href;
            },
        });
    }
    return aiPromise;
}

/**
 * @param {ImageBitmap} bitmap
 * @param {number} maxEdge
 */
async function fitEdge(bitmap, maxEdge) {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge) return { bitmap, resized: false };

    const scale = maxEdge / longest;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close?.();
        throw new Error('No se pudo preparar la imagen.');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return { bitmap: await createImageBitmap(canvas), resized: true };
}

/**
 * @param {ImageBitmap} bitmap
 */
function bitmapToPixels(bitmap) {
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        bitmap.close?.();
        throw new Error('No se pudo leer la imagen.');
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const image = ctx.getImageData(0, 0, width, height);
    return { width, height, data: image.data };
}

/**
 * @param {{ width: number, height: number, data: Uint8ClampedArray | ArrayLike<number> }} image
 */
async function pixelsToPng(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear la imagen.');
    const pixels = image.data instanceof Uint8ClampedArray
        ? image.data
        : new Uint8ClampedArray(image.data);
    ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo crear la imagen.');
    return blob;
}

export async function releaseUpscaleSession() {
    const current = session;
    session = null;
    sessionQuality = null;
    try {
        await current?.release();
    } catch {
        // La sesión ya no estaba viva.
    }
}

/**
 * @param {Blob} imageBlob
 * @param {QualityId} quality
 * @param {{ onStatus?: (status: { phase: string, loaded?: number, total?: number }) => void }} [opts]
 */
export async function upscaleWithEngine(imageBlob, quality, opts = {}) {
    const onStatus = opts.onStatus ?? (() => {});
    const ai = await getAi();
    const openedNow = !session || sessionQuality !== quality;
    if (openedNow) {
        session = await ai.open({
            task: 'super-resolution',
            quality,
            onStatus,
        });
        sessionQuality = quality;
    }

    const model = SUPER_RESOLUTION_MODELS.find((item) => item.id === session.modelId);
    const source = await createImageBitmap(imageBlob);
    const fitted = await fitEdge(source, model?.maxInputEdge ?? 768);
    const image = bitmapToPixels(fitted.bitmap);
    const fellBackBefore = session.fellBack;
    const output = await session.run(image, { onStatus });
    const blob = await pixelsToPng(output);

    /** @type {string[]} */
    const notes = [];
    if ((openedNow || session.fellBack !== fellBackBefore) && session.notice) {
        notes.push(session.notice);
    }
    if (fitted.resized) {
        notes.push(`La foto era muy grande. Se amplió a partir de ${image.width}×${image.height} px.`);
    }

    return {
        blob,
        width: output.width,
        height: output.height,
        usedModel: session.tier,
        scale: model?.scale ?? 4,
        notice: notes.join(' ') || null,
    };
}
