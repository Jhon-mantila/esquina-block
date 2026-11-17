import { EsquinaAI } from '@/AIEngine';
import { removeBackground } from 'bordercut';
import { toImageData } from './imageDataUtil.js';
import { resizeImageForProcessing } from './resizeImage.js';
import { resolvePublicUrl } from './toolBase.js';

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
    if (!ctx) throw new Error('No se pudo crear el PNG.');
    const pixels = image.data instanceof Uint8ClampedArray
        ? image.data
        : new Uint8ClampedArray(image.data);
    ctx.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo crear el PNG.');
    return blob;
}

/**
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image
 */
function runBordercut(image) {
    const rgba = new Uint8ClampedArray(image.data);
    const result = removeBackground(
        {
            width: image.width,
            height: image.height,
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
    const out = toImageData(
        result.image.data,
        result.image.width || image.width,
        result.image.height || image.height,
    );
    return { width: out.width, height: out.height, data: out.data };
}

export async function releaseBackgroundSession() {
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
export async function removeBackgroundWithEngine(imageBlob, quality, opts = {}) {
    const onStatus = opts.onStatus ?? (() => {});
    const ai = await getAi();
    const { bitmap } = await resizeImageForProcessing(imageBlob);
    const image = bitmapToPixels(bitmap);

    try {
        const openedNow = !session || sessionQuality !== quality;
        if (openedNow) {
            session = await ai.open({
                task: 'background-removal',
                quality,
                onStatus,
            });
            sessionQuality = quality;
        }

        const fellBackBefore = session.fellBack;
        const output = await session.run(image, { onStatus });
        const blob = await pixelsToPng(output);
        const notice = openedNow || session.fellBack !== fellBackBefore
            ? session.notice
            : null;

        return {
            blob,
            width: output.width,
            height: output.height,
            usedModel: session.tier,
            notice,
        };
    } catch {
        await releaseBackgroundSession();
        try {
            const output = runBordercut(image);
            const blob = await pixelsToPng(output);
            return {
                blob,
                width: output.width,
                height: output.height,
                usedModel: 'instant',
                notice: 'No se pudo usar el modelo de IA. Se usó el modo rápido.',
            };
        } catch {
            throw new Error('No se pudo quitar el fondo. Inténtalo de nuevo.');
        }
    }
}
