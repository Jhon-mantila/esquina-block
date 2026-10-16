import { drawCutBorder } from '@/Composables/drawCutBorder.js';

export const PAPER_MM = {
    a4: { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 },
};

export const MARGIN_MM = {
    none: 0,
    small: 8,
    medium: 12,
    large: 18,
};

export function paperSizeMm(paper, orientation) {
    const base = PAPER_MM[paper] || PAPER_MM.a4;
    return orientation === 'landscape'
        ? { w: base.h, h: base.w }
        : { w: base.w, h: base.h };
}

function drawContain(ctx, img, x, y, w, h) {
    if (w <= 1 || h <= 1) {
        return { dx: x, dy: y, dw: Math.max(0, w), dh: Math.max(0, h) };
    }
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    return { dx, dy, dw, dh };
}

/**
 * Margen interno de la celda para que imagen + separación + grosor
 * del contorno de corte no se salgan ni se solapen con la vecina.
 */
function cellCutInset(border, dpr, cellW, cellH) {
    const base = 2 * dpr;
    if (!border || border.style === 'none') {
        return Math.min(base, Math.min(cellW, cellH) * 0.2);
    }
    const pad = Math.max(0, Number(border.padding) || 0) * dpr;
    const thickness = Math.max(1, Number(border.thickness) || 1) * dpr;
    // Mitad del trazo queda fuera del path; un poco extra por antialias / silueta.
    const needed = pad + thickness / 2 + base + (border.shape === 'circle' ? dpr : 0);
    const maxInset = Math.min(cellW, cellH) * 0.38;
    return Math.min(needed, maxInset);
}

/**
 * Dibuja una página de plantilla en un canvas ya dimensionado en píxeles.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number, height: number }} canvas
 * @param {object} opts
 */
export function drawCutPage(ctx, canvas, opts) {
    const {
        pageWmm,
        pageHmm,
        cols,
        rows,
        marginKey = 'small',
        gapMm = 8,
        title = '',
        subtitle = '',
        showTitle = false,
        pageNumbers = false,
        pageIndex = 0,
        totalPages = 1,
        cellGrid = true,
        cellGridStyle = 'solid',
        cellGridColor = '#D1D5DB',
        border,
        pageImages = [],
        imageMap = new Map(),
        dpr = 1,
        gapScale = 0.35,
    } = opts;

    const scale = (canvas.width / pageWmm);
    const margin = (MARGIN_MM[marginKey] ?? 8) * scale;
    const gap = Math.max(0, gapMm) * (dpr * gapScale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let contentTop = margin;
    let contentBottom = canvas.height - margin;

    if (showTitle) {
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        if (title) {
            ctx.font = `700 ${Math.round(14 * dpr)}px ui-sans-serif, system-ui, sans-serif`;
            ctx.fillText(title, canvas.width / 2, contentTop, canvas.width - margin * 2);
            contentTop += 18 * dpr;
        }
        if (subtitle) {
            ctx.fillStyle = '#475569';
            ctx.font = `500 ${Math.round(11 * dpr)}px ui-sans-serif, system-ui, sans-serif`;
            ctx.fillText(subtitle, canvas.width / 2, contentTop, canvas.width - margin * 2);
            contentTop += 16 * dpr;
        }
        contentTop += 8 * dpr;
    }

    if (pageNumbers) {
        contentBottom -= 16 * dpr;
    }

    const contentW = canvas.width - margin * 2;
    const contentH = Math.max(20, contentBottom - contentTop);
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const cellH = (contentH - gap * (rows - 1)) / rows;

    for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
            const i = r * cols + c;
            const x = margin + c * (cellW + gap);
            const y = contentTop + r * (cellH + gap);

            const item = pageImages[i];
            const img = item ? imageMap.get(item.id) : null;
            if (img) {
                const inset = cellCutInset(border, dpr, cellW, cellH);
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, cellW, cellH);
                ctx.clip();
                const box = drawContain(
                    ctx,
                    img,
                    x + inset,
                    y + inset,
                    cellW - inset * 2,
                    cellH - inset * 2,
                );
                drawCutBorder(ctx, img, box, border, dpr);
                ctx.restore();
            }
        }
    }

    if (cellGrid) {
        ctx.strokeStyle = cellGridColor || '#D1D5DB';
        ctx.lineWidth = Math.max(1, dpr);
        if (cellGridStyle === 'dotted') ctx.setLineDash([2 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        for (let c = 1; c < cols; c += 1) {
            const x = margin + c * (cellW + gap) - gap / 2;
            ctx.moveTo(Math.round(x) + 0.5, contentTop);
            ctx.lineTo(Math.round(x) + 0.5, contentTop + contentH);
        }
        for (let r = 1; r < rows; r += 1) {
            const y = contentTop + r * (cellH + gap) - gap / 2;
            ctx.moveTo(margin, Math.round(y) + 0.5);
            ctx.lineTo(margin + contentW, Math.round(y) + 0.5);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (pageNumbers && totalPages) {
        ctx.fillStyle = '#64748b';
        ctx.font = `500 ${Math.round(10 * dpr)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`Página ${pageIndex + 1} de ${totalPages}`, canvas.width / 2, canvas.height - margin / 2);
    }
}

export function loadHtmlImages(entries) {
    const map = new Map();
    return Promise.all(
        entries.map(
            (item) =>
                new Promise((resolve) => {
                    const src = item.previewUrl || item.src;
                    if (!src) {
                        resolve();
                        return;
                    }
                    const img = new Image();
                    img.onload = () => {
                        map.set(item.id, img);
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = src;
                }),
        ),
    ).then(() => map);
}

/** Sugiere cols/rows para caber en ≤ maxPages (máx 5×6). */
export function suggestGridForPages(imageCount, maxPages = 5, maxCols = 5, maxRows = 6) {
    if (imageCount <= 0) return { cols: 3, rows: 3 };
    const needed = Math.ceil(imageCount / maxPages);
    let best = null;
    for (let cols = 2; cols <= maxCols; cols += 1) {
        for (let rows = 2; rows <= maxRows; rows += 1) {
            const per = cols * rows;
            if (per < needed) continue;
            const pages = Math.ceil(imageCount / per);
            if (pages > maxPages) continue;
            const score = pages * 1000 + per; // prefer fewer pages, then denser
            if (!best || score < best.score) {
                best = { cols, rows, pages, per, score };
            }
        }
    }
    return best || { cols: maxCols, rows: maxRows, pages: Math.ceil(imageCount / (maxCols * maxRows)), per: maxCols * maxRows };
}
