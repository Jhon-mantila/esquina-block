/**
 * Contornos de corte alrededor de una imagen (fuera de sus píxeles).
 * Silueta: figura general (alfa suavizado), no el detalle del borde.
 * Si la imagen es opaca, usa el rectángulo del dibujo.
 */

const silhouetteCache = new WeakMap();

function applyStrokeStyle(ctx, border, dpr) {
    ctx.strokeStyle = border.color || '#000000';
    ctx.lineWidth = Math.max(1, (border.thickness || 1) * dpr);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (border.style === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
    else if (border.style === 'dotted') ctx.setLineDash([2 * dpr, 3 * dpr]);
    else ctx.setLineDash([]);
}

function isOn(mask, width, height, x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return mask[y * width + x] === 1;
}

/**
 * Contorno exterior con vecindario de Moore (sentido horario).
 */
function mooreContour(mask, width, height) {
    let sx = -1;
    let sy = -1;
    outer: for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (!isOn(mask, width, height, x, y)) continue;
            if (
                !isOn(mask, width, height, x - 1, y)
                || !isOn(mask, width, height, x + 1, y)
                || !isOn(mask, width, height, x, y - 1)
                || !isOn(mask, width, height, x, y + 1)
            ) {
                sx = x;
                sy = y;
                break outer;
            }
        }
    }
    if (sx < 0) return null;

    const dx = [0, 1, 1, 1, 0, -1, -1, -1];
    const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

    const points = [];
    let x = sx;
    let y = sy;
    let dir = 4;
    const limit = width * height * 4;

    for (let step = 0; step < limit; step += 1) {
        points.push([x + 0.5, y + 0.5]);

        const start = (dir + 6) % 8;
        let found = -1;
        for (let i = 0; i < 8; i += 1) {
            const d = (start + i) % 8;
            const nx = x + dx[d];
            const ny = y + dy[d];
            if (isOn(mask, width, height, nx, ny)) {
                found = d;
                break;
            }
        }
        if (found < 0) break;

        x += dx[found];
        y += dy[found];
        dir = found;

        if (x === sx && y === sy && points.length > 4) break;
    }

    return points.length > 12 ? points : null;
}

/** Desenfoque de caja separable sobre canal alfa (0–255). */
function blurAlpha(src, width, height, radius) {
    const r = Math.max(1, radius | 0);
    const tmp = new Float32Array(width * height);
    const out = new Float32Array(width * height);
    const span = r * 2 + 1;

    for (let y = 0; y < height; y += 1) {
        let sum = 0;
        for (let x = -r; x <= r; x += 1) {
            sum += src[y * width + Math.min(width - 1, Math.max(0, x))];
        }
        for (let x = 0; x < width; x += 1) {
            tmp[y * width + x] = sum / span;
            const leave = src[y * width + Math.min(width - 1, Math.max(0, x - r))];
            const enter = src[y * width + Math.min(width - 1, Math.max(0, x + r + 1))];
            sum += enter - leave;
        }
    }

    for (let x = 0; x < width; x += 1) {
        let sum = 0;
        for (let y = -r; y <= r; y += 1) {
            sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
        }
        for (let y = 0; y < height; y += 1) {
            out[y * width + x] = sum / span;
            const leave = tmp[Math.min(height - 1, Math.max(0, y - r)) * width + x];
            const enter = tmp[Math.min(height - 1, Math.max(0, y + r + 1)) * width + x];
            sum += enter - leave;
        }
    }

    return out;
}

function smoothClosed(points, passes = 1) {
    if (points.length < 4) return points;
    let pts = points;
    for (let p = 0; p < passes; p += 1) {
        const next = new Array(pts.length);
        for (let i = 0; i < pts.length; i += 1) {
            const a = pts[(i - 1 + pts.length) % pts.length];
            const b = pts[i];
            const c = pts[(i + 1) % pts.length];
            next[i] = [(a[0] + b[0] * 2 + c[0]) / 4, (a[1] + b[1] * 2 + c[1]) / 4];
        }
        pts = next;
    }
    return pts;
}

/**
 * Contorno de la figura (no del detalle): alfa desenfocado + umbral.
 * Puntos normalizados respecto al tamaño de la imagen (pueden salir un poco de 0–1).
 */
export function getSilhouettePoints(img) {
    if (silhouetteCache.has(img)) return silhouetteCache.get(img);

    const maxSide = 160;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const iw = Math.max(16, Math.round(img.naturalWidth * scale));
    const ih = Math.max(16, Math.round(img.naturalHeight * scale));

    // Radio ~6–8 %: cierra huecos pequeños y redondea la figura tipo sticker.
    const blurR = Math.max(4, Math.round(Math.min(iw, ih) * 0.07));
    const margin = blurR * 2 + 2;
    const w = iw + margin * 2;
    const h = ih + margin * 2;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, margin, margin, iw, ih);
    const { data } = ctx.getImageData(0, 0, w, h);

    const alpha = new Float32Array(w * h);
    let transparent = 0;
    let opaque = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        const a = data[i + 3];
        alpha[p] = a;
        if (a > 20) opaque += 1;
        else transparent += 1;
    }

    if (transparent < iw * ih * 0.02 || opaque < 16) {
        silhouetteCache.set(img, null);
        return null;
    }

    // Dos pasadas de blur para una figura más “de burbuja”.
    let soft = blurAlpha(alpha, w, h, blurR);
    soft = blurAlpha(soft, w, h, Math.max(2, Math.round(blurR * 0.6)));

    const mask = new Uint8Array(w * h);
    const threshold = 28;
    for (let i = 0; i < soft.length; i += 1) {
        mask[i] = soft[i] > threshold ? 1 : 0;
    }

    const contour = mooreContour(mask, w, h);
    if (!contour) {
        silhouetteCache.set(img, null);
        return null;
    }

    // Pocos puntos: contorno de figura, no de cada recoveco.
    const target = 64;
    const stride = Math.max(1, Math.floor(contour.length / target));
    let points = [];
    for (let i = 0; i < contour.length; i += stride) {
        points.push([
            (contour[i][0] - margin) / iw,
            (contour[i][1] - margin) / ih,
        ]);
    }
    points = smoothClosed(points, 2);

    if (points.length > 2) {
        const first = points[0];
        const last = points[points.length - 1];
        if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.02) {
            points.push([first[0], first[1]]);
        }
    }

    silhouetteCache.set(img, points);
    return points;
}

/**
 * Aplica la separación del usuario alejándose del centroide.
 */
function expandSilhouette(points, padPx, boxW, boxH) {
    if (!padPx || padPx <= 0 || !points.length) return points;

    let cx = 0;
    let cy = 0;
    for (const [x, y] of points) {
        cx += x;
        cy += y;
    }
    cx /= points.length;
    cy /= points.length;

    return points.map(([nx, ny]) => {
        const dx = (nx - cx) * boxW;
        const dy = (ny - cy) * boxH;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.5) return [nx, ny];
        const s = (dist + padPx) / dist;
        return [cx + (nx - cx) * s, cy + (ny - cy) * s];
    });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource|null} img
 * @param {{dx:number,dy:number,dw:number,dh:number}} box
 * @param {object} border
 * @param {number} dpr
 */
export function drawCutBorder(ctx, img, box, border, dpr = 1) {
    if (!border || border.style === 'none') return;

    const pad = (border.padding || 0) * dpr;
    const thickness = Math.max(1, (border.thickness || 1) * dpr);

    ctx.save();
    applyStrokeStyle(ctx, border, dpr);

    if (border.shape === 'circle') {
        const x = box.dx - pad;
        const y = box.dy - pad;
        const w = box.dw + pad * 2;
        const h = box.dh + pad * 2;
        const r = Math.min(w, h) / 2;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
        ctx.stroke();
    } else if (border.shape === 'silhouette' && img) {
        const base = getSilhouettePoints(img);
        if (!base) {
            const x = box.dx - pad;
            const y = box.dy - pad;
            const w = box.dw + pad * 2;
            const h = box.dh + pad * 2;
            ctx.strokeRect(x + thickness / 2, y + thickness / 2, w - thickness, h - thickness);
        } else {
            const points = expandSilhouette(base, pad, box.dw, box.dh);
            ctx.beginPath();
            points.forEach(([nx, ny], i) => {
                const px = box.dx + nx * box.dw;
                const py = box.dy + ny * box.dh;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
        }
    } else {
        const x = box.dx - pad;
        const y = box.dy - pad;
        const w = box.dw + pad * 2;
        const h = box.dh + pad * 2;
        ctx.strokeRect(x + thickness / 2, y + thickness / 2, w - thickness, h - thickness);
    }

    ctx.restore();
}
