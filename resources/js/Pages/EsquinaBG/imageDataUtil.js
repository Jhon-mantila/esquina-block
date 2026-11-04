/**
 * Crea ImageData de forma compatible en Workers (evita el error
 * "not of type 'ImageDataSettings'" del constructor new ImageData(...)).
 *
 * @param {ArrayLike<number>|ArrayBuffer|Uint8Array|Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @returns {ImageData}
 */
export function toImageData(pixels, width, height) {
    // Acepta buffer RGBA o PixelImage { width, height, data } (bordercut).
    let raw = pixels;
    let wIn = width;
    let hIn = height;
    if (
        pixels
        && typeof pixels === 'object'
        && !(pixels instanceof ArrayBuffer)
        && !(ArrayBuffer.isView(pixels))
        && 'data' in pixels
    ) {
        raw = /** @type {{ data: ArrayLike<number>, width?: number, height?: number }} */ (pixels).data;
        wIn = /** @type {{ width?: number }} */ (pixels).width ?? width;
        hIn = /** @type {{ height?: number }} */ (pixels).height ?? height;
    }

    const w = Math.max(1, Math.floor(Number(wIn)) || 1);
    const h = Math.max(1, Math.floor(Number(hIn)) || 1);
    const expected = w * h * 4;

    let src;
    if (raw instanceof Uint8ClampedArray) {
        src = raw;
    } else if (raw instanceof Uint8Array) {
        src = new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength);
    } else if (raw instanceof ArrayBuffer) {
        src = new Uint8ClampedArray(raw);
    } else if (raw == null) {
        throw new Error('No hay datos de imagen para componer el resultado.');
    } else {
        src = new Uint8ClampedArray(/** @type {ArrayLike<number>} */ (raw));
    }

    if (src.length < expected) {
        throw new Error(`Datos de imagen incompletos (${src.length} < ${expected}).`);
    }
    if (src.length > expected) {
        src = src.subarray(0, expected);
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        // Último recurso: constructor clásico
        return new ImageData(new Uint8ClampedArray(src), w, h);
    }
    const imageData = ctx.createImageData(w, h);
    imageData.data.set(src);
    return imageData;
}
