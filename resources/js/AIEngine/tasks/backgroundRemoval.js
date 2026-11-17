import { applyMask, normalizeSquare, upsampleMask } from './backgroundRemovalMath.js';

/**
 * Estira la imagen al cuadrado de entrada, igual que el preproceso actual de EsquinaBG.
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image
 * @param {number} size
 */
function resizeToSquare(image, size) {
    if (image.width === size && image.height === size) {
        return image.data;
    }

    const src = new OffscreenCanvas(image.width, image.height);
    const srcCtx = src.getContext('2d');
    if (!srcCtx) throw new Error('Canvas no disponible en el worker.');
    srcCtx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);

    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible en el worker.');
    ctx.drawImage(src, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
}

/**
 * @param {{ Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown }} ort
 * @param {{ inputNames: string[], outputNames: string[], run: Function }} session
 * @param {{ inputSize: number, kind: 'u2net' | 'rmbg' }} model
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image
 */
export async function runBackgroundRemoval(ort, session, model, image) {
    const resized = resizeToSquare(image, model.inputSize);
    const float = normalizeSquare(resized, model.inputSize, model.kind);
    const tensor = new ort.Tensor('float32', float, [1, 3, model.inputSize, model.inputSize]);
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    const outputs = await session.run({ [inputName]: tensor });
    const out = outputs[outputName];
    const maskSize = model.inputSize;
    const maskData = out.data;
    const flat = maskData.length >= maskSize * maskSize
        ? maskData.slice(maskData.length - maskSize * maskSize)
        : maskData;
    const mask = upsampleMask(flat, maskSize, image.width, image.height);
    const pixels = new Uint8ClampedArray(image.data);
    applyMask(pixels, mask);
    return { width: image.width, height: image.height, data: pixels };
}
