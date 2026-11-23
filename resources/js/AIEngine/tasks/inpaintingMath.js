/**
 * Recorte, máscara y composición del inpainting.
 * El modelo ve solo la zona marcada, a su tamaño fijo. El resto de la foto no se toca.
 */

/**
 * @param {Uint8Array | Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 */
function channelsOf(data, width, height) {
    return data.length === width * height ? 1 : 4;
}

/**
 * @param {Uint8Array | Uint8ClampedArray} data
 * @param {number} width
 * @param {number} index
 * @param {number} channels
 */
function sample(data, width, index, channels) {
    return channels === 1 ? data[index] : data[index * 4];
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @param {number} minPadding
 * @param {number} paddingRatio
 */
function expandBox(box, imageWidth, imageHeight, minPadding, paddingRatio) {
    const pad = Math.max(minPadding, Math.round(Math.max(box.width, box.height) * paddingRatio));
    const x = Math.max(0, box.x - pad);
    const y = Math.max(0, box.y - pad);
    const right = Math.min(imageWidth, box.x + box.width + pad);
    const bottom = Math.min(imageHeight, box.y + box.height + pad);
    return { x, y, width: right - x, height: bottom - y };
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} a
 * @param {{ x: number, y: number, width: number, height: number }} b
 * @param {number} gap
 */
function overlaps(a, b, gap) {
    return a.x <= b.x + b.width + gap
        && b.x <= a.x + a.width + gap
        && a.y <= b.y + b.height + gap
        && b.y <= a.y + a.height + gap;
}

/**
 * @param {Array<{ x: number, y: number, width: number, height: number }>} boxes
 * @param {number} gap
 */
function mergeBoxes(boxes, gap) {
    /** @type {Array<{ x: number, y: number, width: number, height: number }>} */
    let current = boxes.map((box) => ({ ...box }));
    let changed = true;
    while (changed) {
        changed = false;
        /** @type {Array<{ x: number, y: number, width: number, height: number }>} */
        const next = [];
        current.forEach((box) => {
            const hit = next.find((other) => overlaps(box, other, gap));
            if (!hit) {
                next.push(box);
                return;
            }
            const x = Math.min(hit.x, box.x);
            const y = Math.min(hit.y, box.y);
            const right = Math.max(hit.x + hit.width, box.x + box.width);
            const bottom = Math.max(hit.y + hit.height, box.y + box.height);
            hit.x = x;
            hit.y = y;
            hit.width = right - x;
            hit.height = bottom - y;
            changed = true;
        });
        current = next;
    }
    return current;
}

/**
 * Zonas a procesar. Cada caja incluye contexto alrededor de la selección
 * y se recorta al borde de la foto.
 *
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array | Uint8ClampedArray} data
 * @param {{
 *   threshold?: number,
 *   minArea?: number,
 *   minPadding?: number,
 *   paddingRatio?: number,
 *   mergeGap?: number,
 * }} [options]
 */
export function planRegions(width, height, data, options = {}) {
    if (!width || !height || !data?.length) return [];

    const channels = channelsOf(data, width, height);
    const threshold = options.threshold ?? 16;
    const minArea = options.minArea ?? 4;
    const minPadding = options.minPadding ?? 48;
    const paddingRatio = options.paddingRatio ?? 0.75;
    const mergeGap = options.mergeGap ?? 24;
    const seen = new Uint8Array(width * height);
    /** @type {Array<{ x: number, y: number, width: number, height: number }>} */
    const boxes = [];

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const start = y * width + x;
            if (seen[start] || sample(data, width, start, channels) <= threshold) continue;

            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;
            let area = 0;
            /** @type {number[]} */
            const queue = [start];
            seen[start] = 1;

            /**
             * @param {number} next
             */
            const visit = (next) => {
                if (seen[next]) return;
                if (sample(data, width, next, channels) <= threshold) return;
                seen[next] = 1;
                queue.push(next);
            };

            while (queue.length) {
                const index = queue.pop();
                const cx = index % width;
                const cy = (index - cx) / width;
                area += 1;
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                if (cx > 0) visit(index - 1);
                if (cx + 1 < width) visit(index + 1);
                if (cy > 0) visit(index - width);
                if (cy + 1 < height) visit(index + width);
            }

            if (area >= minArea) {
                boxes.push({
                    x: minX,
                    y: minY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1,
                });
            }
        }
    }

    const expanded = boxes.map((box) => expandBox(box, width, height, minPadding, paddingRatio));
    return mergeBoxes(expanded, mergeGap);
}

/**
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image
 * @param {{ x: number, y: number, width: number, height: number }} region
 */
export function cropRgba(image, region) {
    const out = new Uint8ClampedArray(region.width * region.height * 4);
    for (let row = 0; row < region.height; row += 1) {
        const src = ((region.y + row) * image.width + region.x) * 4;
        out.set(image.data.subarray(src, src + region.width * 4), row * region.width * 4);
    }
    return out;
}

/**
 * Máscara de un canal, alineada con el recorte.
 *
 * @param {{ width: number, height: number, data: Uint8Array | Uint8ClampedArray }} mask
 * @param {{ x: number, y: number, width: number, height: number }} region
 */
export function cropMask(mask, region) {
    const channels = channelsOf(mask.data, mask.width, mask.height);
    const out = new Uint8Array(region.width * region.height);
    for (let row = 0; row < region.height; row += 1) {
        for (let col = 0; col < region.width; col += 1) {
            const index = (region.y + row) * mask.width + region.x + col;
            out[row * region.width + col] = sample(mask.data, mask.width, index, channels);
        }
    }
    return out;
}

/**
 * @param {Uint8ClampedArray} dest
 * @param {number} destWidth
 * @param {Uint8ClampedArray | ArrayLike<number>} patch
 * @param {{ x: number, y: number, width: number, height: number }} region
 */
export function blitRgba(dest, destWidth, patch, region) {
    const pixels = patch instanceof Uint8ClampedArray ? patch : new Uint8ClampedArray(patch);
    for (let row = 0; row < region.height; row += 1) {
        const destIndex = ((region.y + row) * destWidth + region.x) * 4;
        const srcIndex = row * region.width * 4;
        dest.set(pixels.subarray(srcIndex, srcIndex + region.width * 4), destIndex);
    }
}

/**
 * @param {Uint8Array | Uint8ClampedArray} mask
 * @param {number} sw
 * @param {number} sh
 * @param {number} dw
 * @param {number} dh
 */
export function resizeMaskNearest(mask, sw, sh, dw, dh) {
    if (sw === dw && sh === dh) return mask;
    const out = new Uint8Array(dw * dh);
    for (let y = 0; y < dh; y += 1) {
        const sy = Math.min(sh - 1, Math.floor(((y + 0.5) * sh) / dh));
        for (let x = 0; x < dw; x += 1) {
            const sx = Math.min(sw - 1, Math.floor(((x + 0.5) * sw) / dw));
            out[y * dw + x] = mask[sy * sw + sx];
        }
    }
    return out;
}

/**
 * RGB de 0 a 1, planos NCHW.
 *
 * @param {Uint8ClampedArray | ArrayLike<number>} rgba
 * @param {number} width
 * @param {number} height
 */
export function rgbaToImagePlanes(rgba, width, height) {
    const plane = width * height;
    const out = new Float32Array(3 * plane);
    for (let index = 0, pixel = 0; index < plane; index += 1, pixel += 4) {
        out[index] = rgba[pixel] / 255;
        out[plane + index] = rgba[pixel + 1] / 255;
        out[2 * plane + index] = rgba[pixel + 2] / 255;
    }
    return out;
}

/**
 * 1 = zona a rellenar, 0 = zona que se conserva.
 *
 * @param {Uint8Array | Uint8ClampedArray} mask
 * @param {number} width
 * @param {number} height
 */
export function maskToPlane(mask, width, height) {
    const channels = channelsOf(mask, width, height);
    const out = new Float32Array(width * height);
    for (let index = 0; index < out.length; index += 1) {
        out[index] = sample(mask, width, index, channels) >= 128 ? 1 : 0;
    }
    return out;
}

/**
 * @param {ArrayLike<number>} data
 * @param {number} width
 * @param {number} height
 * @param {number} [outputMax]
 */
export function planesToRgba(data, width, height, outputMax = 255) {
    const plane = width * height;
    const factor = 255 / (outputMax || 255);
    const out = new Uint8ClampedArray(plane * 4);
    for (let index = 0, pixel = 0; index < plane; index += 1, pixel += 4) {
        out[pixel] = clampByte(data[index] * factor);
        out[pixel + 1] = clampByte(data[plane + index] * factor);
        out[pixel + 2] = clampByte(data[2 * plane + index] * factor);
        out[pixel + 3] = 255;
    }
    return out;
}

/**
 * @param {number} value
 */
function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * @param {Float32Array} src
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
function boxBlur(src, width, height, radius) {
    if (radius <= 0) return src;
    const horizontal = new Float32Array(src.length);
    const out = new Float32Array(src.length);
    const window = radius * 2 + 1;

    for (let y = 0; y < height; y += 1) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
            const x = Math.min(width - 1, Math.max(0, offset));
            sum += src[y * width + x];
        }
        for (let x = 0; x < width; x += 1) {
            horizontal[y * width + x] = sum / window;
            const removeX = Math.min(width - 1, Math.max(0, x - radius));
            const addX = Math.min(width - 1, Math.max(0, x + radius + 1));
            sum += src[y * width + addX] - src[y * width + removeX];
        }
    }

    for (let x = 0; x < width; x += 1) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset += 1) {
            const y = Math.min(height - 1, Math.max(0, offset));
            sum += horizontal[y * width + x];
        }
        for (let y = 0; y < height; y += 1) {
            out[y * width + x] = sum / window;
            const removeY = Math.min(height - 1, Math.max(0, y - radius));
            const addY = Math.min(height - 1, Math.max(0, y + radius + 1));
            sum += horizontal[addY * width + x] - horizontal[removeY * width + x];
        }
    }

    return out;
}

/**
 * Mezcla la reconstrucción solo donde la máscara lo pide.
 * El radio suaviza el borde para que no se vea el corte.
 *
 * @param {Uint8ClampedArray | ArrayLike<number>} original
 * @param {Uint8ClampedArray | ArrayLike<number>} generated
 * @param {Uint8Array | Uint8ClampedArray} mask
 * @param {number} width
 * @param {number} height
 * @param {number} [radius]
 */
export function featherComposite(original, generated, mask, width, height, radius = 8) {
    const channels = channelsOf(mask, width, height);
    const alpha = new Float32Array(width * height);
    for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = sample(mask, width, index, channels) >= 128 ? 1 : 0;
    }
    const blurred = boxBlur(alpha, width, height, radius);
    const out = new Uint8ClampedArray(width * height * 4);

    for (let index = 0, pixel = 0; index < alpha.length; index += 1, pixel += 4) {
        const cover = blurred[index];
        const keep = 1 - cover;
        out[pixel] = clampByte(original[pixel] * keep + generated[pixel] * cover);
        out[pixel + 1] = clampByte(original[pixel + 1] * keep + generated[pixel + 1] * cover);
        out[pixel + 2] = clampByte(original[pixel + 2] * keep + generated[pixel + 2] * cover);
        out[pixel + 3] = original[pixel + 3];
    }

    return out;
}
