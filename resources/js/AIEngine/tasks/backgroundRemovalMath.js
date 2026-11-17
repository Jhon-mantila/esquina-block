/**
 * Normalización de los modelos actuales de EsquinaBG.
 * `u2net` cubre U²-Net y silueta. `rmbg` cubre RMBG-1.4.
 *
 * @param {Uint8ClampedArray | Uint8Array | ArrayLike<number>} rgba
 * @param {number} size
 * @param {'u2net' | 'rmbg'} kind
 */
export function normalizeSquare(rgba, size, kind) {
    const float = new Float32Array(3 * size * size);

    if (kind === 'rmbg') {
        for (let i = 0, p = 0; i < size * size; i += 1, p += 4) {
            float[i] = rgba[p] / 255 - 0.5;
            float[i + size * size] = rgba[p + 1] / 255 - 0.5;
            float[i + 2 * size * size] = rgba[p + 2] / 255 - 0.5;
        }
        return float;
    }

    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    for (let i = 0, p = 0; i < size * size; i += 1, p += 4) {
        float[i] = (rgba[p] / 255 - mean[0]) / std[0];
        float[i + size * size] = (rgba[p + 1] / 255 - mean[1]) / std[1];
        float[i + 2 * size * size] = (rgba[p + 2] / 255 - mean[2]) / std[2];
    }
    return float;
}

/**
 * @param {ArrayLike<number>} maskData
 * @param {number} size
 * @param {number} outW
 * @param {number} outH
 */
export function upsampleMask(maskData, size, outW, outH) {
    const src = new Float32Array(maskData);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < src.length; i += 1) {
        const value = src[i];
        if (value < min) min = value;
        if (value > max) max = value;
    }
    const range = max - min || 1;
    for (let i = 0; i < src.length; i += 1) {
        src[i] = (src[i] - min) / range;
    }

    const out = new Float32Array(outW * outH);
    for (let y = 0; y < outH; y += 1) {
        const sy = ((y + 0.5) * size) / outH - 0.5;
        const y0 = Math.max(0, Math.min(size - 1, Math.floor(sy)));
        const y1 = Math.max(0, Math.min(size - 1, y0 + 1));
        const fy = sy - y0;
        for (let x = 0; x < outW; x += 1) {
            const sx = ((x + 0.5) * size) / outW - 0.5;
            const x0 = Math.max(0, Math.min(size - 1, Math.floor(sx)));
            const x1 = Math.max(0, Math.min(size - 1, x0 + 1));
            const fx = sx - x0;
            const v00 = src[y0 * size + x0];
            const v01 = src[y0 * size + x1];
            const v10 = src[y1 * size + x0];
            const v11 = src[y1 * size + x1];
            out[y * outW + x] = v00 * (1 - fx) * (1 - fy)
                + v01 * fx * (1 - fy)
                + v10 * (1 - fx) * fy
                + v11 * fx * fy;
        }
    }
    return out;
}

/**
 * @param {Uint8ClampedArray | Uint8Array} pixels
 * @param {ArrayLike<number>} mask
 */
export function applyMask(pixels, mask) {
    for (let i = 0, p = 0; i < mask.length; i += 1, p += 4) {
        pixels[p + 3] = Math.round(Math.max(0, Math.min(1, mask[i])) * 255);
    }
}
