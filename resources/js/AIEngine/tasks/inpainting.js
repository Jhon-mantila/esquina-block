import {
    featherComposite,
    maskToPlane,
    planesToRgba,
    resizeMaskNearest,
    rgbaToImagePlanes,
} from './inpaintingMath.js';

/**
 * @param {Uint8ClampedArray} data
 * @param {number} sw
 * @param {number} sh
 * @param {number} dw
 * @param {number} dh
 * @param {boolean} smooth
 */
function resizeRgba(data, sw, sh, dw, dh, smooth) {
    if (sw === dw && sh === dh) return data;

    const src = new OffscreenCanvas(sw, sh);
    const srcCtx = src.getContext('2d');
    if (!srcCtx) throw new Error('Canvas no disponible en el worker.');
    srcCtx.putImageData(new ImageData(data, sw, sh), 0, 0);

    const canvas = new OffscreenCanvas(dw, dh);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible en el worker.');
    ctx.imageSmoothingEnabled = smooth;
    ctx.drawImage(src, 0, 0, dw, dh);
    return ctx.getImageData(0, 0, dw, dh).data;
}

/**
 * @param {string[]} names
 * @param {string} preferred
 * @param {number} index
 */
function tensorName(names, preferred, index) {
    if (names?.includes(preferred)) return preferred;
    return names?.[index] ?? preferred;
}

/**
 * @param {{ Tensor: new (type: string, data: Float32Array, dims: number[]) => { dispose?: () => void } }} ort
 * @param {{ inputNames: string[], outputNames: string[], run: Function }} session
 * @param {{ inputSize?: number, feather?: number, outputMax?: number }} model
 * @param {{
 *   width: number,
 *   height: number,
 *   data: Uint8ClampedArray,
 *   mask?: { width: number, height: number, data: Uint8Array | Uint8ClampedArray },
 * }} image
 * @param {Function} [onStatus]
 */
export async function runInpainting(ort, session, model, image, onStatus = () => {}) {
    const mask = image.mask;
    if (!mask?.data) throw new Error('Máscara ausente.');
    if (mask.width !== image.width || mask.height !== image.height) {
        throw new Error('La máscara no coincide con la imagen.');
    }

    const size = model.inputSize || 512;
    onStatus({ phase: 'preparing' });

    const maskPlaneSource = mask.data.length === image.width * image.height
        ? mask.data
        : maskToChannel(mask.data, image.width, image.height);
    let painted = false;
    for (let index = 0; index < maskPlaneSource.length; index += 1) {
        if (maskPlaneSource[index] >= 128) {
            painted = true;
            break;
        }
    }
    if (!painted) throw new Error('No hay zona seleccionada.');

    const resizedImage = resizeRgba(image.data, image.width, image.height, size, size, true);
    const resizedMask = resizeMaskNearest(maskPlaneSource, image.width, image.height, size, size);
    const imageTensor = new ort.Tensor('float32', rgbaToImagePlanes(resizedImage, size, size), [1, 3, size, size]);
    const maskTensor = new ort.Tensor('float32', maskToPlane(resizedMask, size, size), [1, 1, size, size]);

    const feeds = {
        [tensorName(session.inputNames, 'image', 0)]: imageTensor,
        [tensorName(session.inputNames, 'mask', 1)]: maskTensor,
    };

    let outputTensor;
    try {
        const outputs = await session.run(feeds);
        const outputName = tensorName(session.outputNames, 'output', 0);
        outputTensor = outputs[outputName];
        const expected = 3 * size * size;
        if (!outputTensor?.data || outputTensor.data.length < expected) {
            throw new Error('Salida de inpainting inesperada.');
        }

        const generatedSquare = planesToRgba(outputTensor.data, size, size, model.outputMax ?? 255);
        const generated = resizeRgba(generatedSquare, size, size, image.width, image.height, true);
        const blended = featherComposite(
            image.data,
            generated,
            maskPlaneSource,
            image.width,
            image.height,
            model.feather ?? 12,
        );
        return { width: image.width, height: image.height, data: blended };
    } finally {
        imageTensor.dispose?.();
        maskTensor.dispose?.();
        outputTensor?.dispose?.();
    }
}

/**
 * @param {Uint8ClampedArray | Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 */
function maskToChannel(rgba, width, height) {
    const out = new Uint8Array(width * height);
    for (let index = 0, pixel = 0; index < out.length; index += 1, pixel += 4) {
        out[index] = rgba[pixel];
    }
    return out;
}
