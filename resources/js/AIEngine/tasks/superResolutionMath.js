/**
 * Bloques con solape. El núcleo de cada bloque no se pisa con el siguiente,
 * y el solape solo sirve de contexto para que el modelo no deje costuras.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} tileSize
 * @param {number} overlap
 */
export function planTiles(width, height, tileSize, overlap) {
    const margin = Math.max(0, overlap);
    const inner = Math.max(1, tileSize - margin * 2);
    /** @type {Array<{ destX: number, destY: number, coreW: number, coreH: number, srcX: number, srcY: number, srcW: number, srcH: number, padLeft: number, padTop: number }>} */
    const tiles = [];

    for (let y = 0; y < height; y += inner) {
        for (let x = 0; x < width; x += inner) {
            const coreW = Math.min(inner, width - x);
            const coreH = Math.min(inner, height - y);
            const srcX = Math.max(0, x - margin);
            const srcY = Math.max(0, y - margin);
            const srcR = Math.min(width, x + coreW + margin);
            const srcB = Math.min(height, y + coreH + margin);
            tiles.push({
                destX: x,
                destY: y,
                coreW,
                coreH,
                srcX,
                srcY,
                srcW: srcR - srcX,
                srcH: srcB - srcY,
                padLeft: x - srcX,
                padTop: y - srcY,
            });
        }
    }

    return tiles;
}

/**
 * @param {Uint8ClampedArray | Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 */
export function rgbaToNchw(rgba, width, height) {
    const plane = width * height;
    const float = new Float32Array(3 * plane);
    for (let i = 0, p = 0; i < plane; i += 1, p += 4) {
        float[i] = rgba[p] / 255;
        float[i + plane] = rgba[p + 1] / 255;
        float[i + 2 * plane] = rgba[p + 2] / 255;
    }
    return float;
}

/**
 * @param {{ width: number, height: number, data: Uint8ClampedArray | Uint8Array }} image
 * @param {{ srcX: number, srcY: number, srcW: number, srcH: number }} tile
 */
export function cropRgba(image, tile) {
    const out = new Uint8ClampedArray(tile.srcW * tile.srcH * 4);
    for (let y = 0; y < tile.srcH; y += 1) {
        const src = ((tile.srcY + y) * image.width + tile.srcX) * 4;
        const dest = y * tile.srcW * 4;
        out.set(image.data.subarray(src, src + tile.srcW * 4), dest);
    }
    return out;
}

/**
 * @param {number} value
 */
function byte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Copia el núcleo ampliado y descarta el solape.
 *
 * @param {Uint8ClampedArray} output
 * @param {number} outW
 * @param {Float32Array | ArrayLike<number>} nchw
 * @param {number} tileW
 * @param {number} tileH
 * @param {{ destX: number, destY: number, coreW: number, coreH: number, padLeft: number, padTop: number }} tile
 * @param {number} scale
 */
export function writeRgbTile(output, outW, nchw, tileW, tileH, tile, scale) {
    const padL = tile.padLeft * scale;
    const padT = tile.padTop * scale;
    const copyW = tile.coreW * scale;
    const copyH = tile.coreH * scale;
    const destX = tile.destX * scale;
    const destY = tile.destY * scale;
    const plane = tileW * tileH;

    for (let y = 0; y < copyH; y += 1) {
        const sy = padT + y;
        if (sy < 0 || sy >= tileH) continue;
        for (let x = 0; x < copyW; x += 1) {
            const sx = padL + x;
            if (sx < 0 || sx >= tileW) continue;
            const source = sy * tileW + sx;
            const dest = ((destY + y) * outW + (destX + x)) * 4;
            output[dest] = byte(nchw[source] * 255);
            output[dest + 1] = byte(nchw[source + plane] * 255);
            output[dest + 2] = byte(nchw[source + plane * 2] * 255);
            output[dest + 3] = 255;
        }
    }
}

/**
 * El modelo no ve el alfa. Si la foto ya es opaca, no se toca.
 *
 * @param {Uint8ClampedArray | Uint8Array} source
 * @param {number} sourceW
 * @param {number} sourceH
 * @param {Uint8ClampedArray} output
 * @param {number} scale
 */
export function paintAlpha(source, sourceW, sourceH, output, scale) {
    let opaque = true;
    for (let i = 3; i < source.length; i += 4) {
        if (source[i] !== 255) {
            opaque = false;
            break;
        }
    }
    if (opaque) return;

    const outW = sourceW * scale;
    const outH = sourceH * scale;
    for (let y = 0; y < outH; y += 1) {
        const sy = Math.min(sourceH - 1, Math.floor(y / scale));
        for (let x = 0; x < outW; x += 1) {
            const sx = Math.min(sourceW - 1, Math.floor(x / scale));
            output[(y * outW + x) * 4 + 3] = source[(sy * sourceW + sx) * 4 + 3];
        }
    }
}
