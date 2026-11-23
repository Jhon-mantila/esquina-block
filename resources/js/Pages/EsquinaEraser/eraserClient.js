import { EsquinaAI, INPAINTING_MODELS } from '@/AIEngine';
import { blitRgba, cropMask, cropRgba, planRegions } from '@/AIEngine/tasks/inpaintingMath.js';
import { resolvePublicUrl } from '../EsquinaBG/toolBase.js';

/** @type {Promise<object> | null} */
let aiPromise = null;
/** @type {object | null} */
let session = null;

function getAi() {
    if (!aiPromise) {
        aiPromise = EsquinaAI.create({
            models: INPAINTING_MODELS,
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

export async function releaseEraserSession() {
    const current = session;
    session = null;
    try {
        await current?.release();
    } catch {
        // La sesión ya no estaba viva.
    }
}

/**
 * @param {{ width: number, height: number, rgba: Uint8ClampedArray, mask: Uint8Array }} frame
 * @param {{ onStatus?: (status: { phase: string, loaded?: number, total?: number }) => void }} [opts]
 */
export async function eraseWithEngine(frame, opts = {}) {
    const onStatus = opts.onStatus ?? (() => {});
    const regions = planRegions(frame.width, frame.height, frame.mask);
    if (regions.length === 0) {
        throw new Error('Pinta encima de lo que quieres quitar.');
    }

    const ram = typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number'
        ? navigator.deviceMemory
        : null;
    if (ram != null && ram < 4) {
        throw new Error('Este equipo tiene poca memoria para quitar objetos. Prueba en un ordenador con al menos 4 GB.');
    }

    const ai = await getAi();
    if (!session) {
        session = await ai.open({
            task: 'inpainting',
            quality: 'auto',
            onStatus,
        });
    }

    const output = new Uint8ClampedArray(frame.rgba);
    const image = { width: frame.width, height: frame.height, data: frame.rgba };
    const mask = { width: frame.width, height: frame.height, data: frame.mask };

    for (let index = 0; index < regions.length; index += 1) {
        const region = regions[index];
        onStatus({ phase: 'preparing', loaded: index, total: regions.length });
        const patch = await session.run({
            width: region.width,
            height: region.height,
            data: cropRgba(image, region),
            mask: {
                width: region.width,
                height: region.height,
                data: cropMask(mask, region),
            },
        }, { onStatus, transfer: true });
        blitRgba(output, frame.width, patch.data, region);
    }

    const blob = await pixelsToPng({ width: frame.width, height: frame.height, data: output });
    /** @type {string | null} */
    let notice = null;
    if (session.provider === 'wasm' && ai.profile?.webgpu === 'available') {
        notice = 'La GPU no pudo completar el proceso. Se usó el modo compatible.';
    } else if (session.provider !== 'webgpu') {
        notice = 'En este navegador el proceso va sin GPU y puede tardar más.';
    }

    return {
        blob,
        width: frame.width,
        height: frame.height,
        provider: session.provider,
        notice,
    };
}
