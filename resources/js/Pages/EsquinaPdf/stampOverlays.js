import fontkit from '@pdf-lib/fontkit';
import { LineCapStyle, PDFDocument, PDFString, rgb, StandardFonts } from 'pdf-lib';
import { isBundledFont, loadBundledFont, normalizeLinkUrl } from './bundledFonts.js';

function hexToRgb(hex) {
    const raw = String(hex || '#000000').replace('#', '');
    const full = raw.length === 3
        ? raw.split('').map((c) => c + c).join('')
        : raw.padEnd(6, '0').slice(0, 6);
    const n = Number.parseInt(full, 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function resolveStandardFont(family, bold, italic) {
    const f = family || 'Helvetica';
    if (f === 'Times') {
        if (bold && italic) return StandardFonts.TimesBoldItalic;
        if (bold) return StandardFonts.TimesBold;
        if (italic) return StandardFonts.TimesItalic;
        return StandardFonts.TimesRoman;
    }
    if (f === 'Courier') {
        if (bold && italic) return StandardFonts.CourierBoldOblique;
        if (bold) return StandardFonts.CourierBold;
        if (italic) return StandardFonts.CourierOblique;
        return StandardFonts.Courier;
    }
    if (bold && italic) return StandardFonts.HelveticaBoldOblique;
    if (bold) return StandardFonts.HelveticaBold;
    if (italic) return StandardFonts.HelveticaOblique;
    return StandardFonts.Helvetica;
}

function addLinkAnnotation(page, { x, y, width, height, url }) {
    const href = normalizeLinkUrl(url);
    if (!href) return;

    const link = page.doc.context.register(
        page.doc.context.obj({
            Type: 'Annot',
            Subtype: 'Link',
            Rect: [x, y, x + width, y + height],
            Border: [0, 0, 0],
            A: {
                Type: 'Action',
                S: 'URI',
                URI: PDFString.of(href),
            },
        }),
    );
    page.node.addAnnot(link);
}

/**
 * Estampa textos e imágenes sobre un PDF (con enlaces opcionales).
 *
 * @param {ArrayBuffer} source
 * @param {Array<object>} overlays
 */
export async function stampOverlaysOnPdf(source, overlays) {
    const doc = await PDFDocument.load(source, { ignoreEncryption: false });
    doc.registerFontkit(fontkit);
    const standardCache = new Map();
    const fileCache = new Map();

    async function embedBytes(key, bytes) {
        if (!fileCache.has(key)) {
            // Copia: FontFace u otros usos pueden transferir/detach el buffer original.
            const data = bytes instanceof Uint8Array
                ? bytes.slice(0)
                : new Uint8Array(bytes.slice(0));
            fileCache.set(key, await doc.embedFont(data));
        }
        return fileCache.get(key);
    }

    async function getFont(overlay) {
        if (overlay.fontFamily === 'custom' && overlay.fontBytes) {
            const key = overlay.fontKey || overlay.fontName || 'custom';
            try {
                return await embedBytes(`custom:${key}`, overlay.fontBytes);
            } catch {
                throw new Error(
                    `No se pudo usar la fuente «${overlay.fontName || 'personalizada'}». Prueba un TTF u OTF.`,
                );
            }
        }

        if (isBundledFont(overlay.fontFamily)) {
            const packed = await loadBundledFont(overlay.fontFamily, !!overlay.bold);
            try {
                return await embedBytes(`bundled:${packed.fontKey}`, packed.bytes);
            } catch {
                throw new Error(`No se pudo incrustar la tipografía ${overlay.fontFamily}.`);
            }
        }

        const std = resolveStandardFont(overlay.fontFamily, overlay.bold, overlay.italic);
        if (!standardCache.has(std)) {
            standardCache.set(std, await doc.embedFont(std));
        }
        return standardCache.get(std);
    }

    for (const overlay of overlays) {
        const pageIndex = overlay.pageIndex ?? 0;
        if (pageIndex < 0 || pageIndex >= doc.getPageCount()) continue;
        const page = doc.getPage(pageIndex);
        const { width: pw, height: ph } = page.getSize();

        if (overlay.type === 'text') {
            const text = String(overlay.text || '');
            if (!text.trim()) continue;

            const font = await getFont(overlay);
            const size = Number(overlay.fontSize) || 16;
            const color = hexToRgb(overlay.color);
            const lineHeight = size * 1.25;
            const boxLeft = (Number(overlay.xNorm) || 0) * pw;
            const boxTop = (Number(overlay.yNorm) || 0) * ph;
            const boxWidth = Math.max(size, (Number(overlay.widthNorm) || 0.55) * pw);
            const align = overlay.align || 'left';
            const lines = text.replace(/\r\n/g, '\n').split('\n');
            let minX = Infinity;
            let maxX = 0;
            let minY = Infinity;
            let maxY = 0;

            lines.forEach((line, i) => {
                const lineW = font.widthOfTextAtSize(line, size);
                let x = boxLeft;
                if (align === 'center') x = boxLeft + (boxWidth - lineW) / 2;
                else if (align === 'right') x = boxLeft + boxWidth - lineW;

                const y = ph - boxTop - size * 0.85 - i * lineHeight;
                if (y < 0) return;

                page.drawText(line, {
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                    size,
                    font,
                    color,
                });

                if (overlay.underline && line.length) {
                    const underlineY = Math.max(0, y - size * 0.08);
                    page.drawLine({
                        start: { x: Math.max(0, x), y: underlineY },
                        end: { x: Math.max(0, x) + lineW, y: underlineY },
                        thickness: Math.max(0.6, size * 0.06),
                        color,
                    });
                }

                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x + lineW);
                minY = Math.min(minY, y - size * 0.15);
                maxY = Math.max(maxY, y + size);
            });

            if (overlay.linkUrl && Number.isFinite(minX)) {
                addLinkAnnotation(page, {
                    x: minX,
                    y: minY,
                    width: Math.max(8, maxX - minX),
                    height: Math.max(8, maxY - minY),
                    url: overlay.linkUrl,
                });
            }
            continue;
        }

        if (overlay.type === 'shape') {
            drawShapeOnPage(page, overlay, pw, ph);
            continue;
        }

        if (overlay.type === 'ink') {
            drawInkOnPage(page, overlay, pw, ph);
            continue;
        }

        if (overlay.type === 'image' && overlay.bytes) {
            let embedded;
            const mime = overlay.mime || 'image/png';
            try {
                if (mime === 'image/png') {
                    embedded = await doc.embedPng(overlay.bytes);
                } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
                    embedded = await doc.embedJpg(overlay.bytes);
                } else {
                    embedded = await embedViaCanvas(doc, overlay.bytes, mime);
                }
            } catch {
                embedded = await embedViaCanvas(doc, overlay.bytes, mime);
            }

            const w = Math.max(8, (Number(overlay.widthNorm) || 0.25) * pw);
            const h = Math.max(8, (Number(overlay.heightNorm) || 0.2) * ph);
            const x = (Number(overlay.xNorm) || 0) * pw;
            const top = (Number(overlay.yNorm) || 0) * ph;
            const y = ph - top - h;
            page.drawImage(embedded, {
                x: Math.max(0, x),
                y: Math.max(0, y),
                width: w,
                height: h,
            });

            if (overlay.linkUrl) {
                addLinkAnnotation(page, {
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                    width: w,
                    height: h,
                    url: overlay.linkUrl,
                });
            }
        }
    }

    return doc.save({ useObjectStreams: false });
}

function shapeBox(overlay, pw, ph) {
    let w = Math.max(8, (Number(overlay.widthNorm) || 0.22) * pw);
    let h = Math.max(8, (Number(overlay.heightNorm) || 0.18) * ph);
    if (overlay.shape === 'square' || overlay.shape === 'circle') {
        // Lado en puntos según el ancho normalizado (igual que la vista previa).
        const side = Math.max(8, (Number(overlay.widthNorm) || 0.22) * pw);
        w = side;
        h = side;
    }
    const x = (Number(overlay.xNorm) || 0) * pw;
    const top = (Number(overlay.yNorm) || 0) * ph;
    const y = ph - top - h;
    return { x: Math.max(0, x), y: Math.max(0, y), w, h };
}

function drawShapeOnPage(page, overlay, pw, ph) {
    const { x, y, w, h } = shapeBox(overlay, pw, ph);
    const strokeWidth = Math.max(0, Number(overlay.strokeWidth) || 0);
    const strokeColor = hexToRgb(overlay.strokeColor || '#111827');
    const fillRaw = overlay.fillColor;
    const hasFill = fillRaw && fillRaw !== 'transparent';
    const fillColor = hasFill ? hexToRgb(fillRaw) : undefined;
    const opacity = clamp01(overlay.fillOpacity ?? 1);
    const borderOpacity = 1;

    const common = {
        borderWidth: strokeWidth,
        borderColor: strokeWidth > 0 ? strokeColor : undefined,
        borderOpacity,
        color: fillColor,
        opacity: hasFill ? opacity : undefined,
    };

    if (overlay.shape === 'circle') {
        page.drawEllipse({
            x: x + w / 2,
            y: y + h / 2,
            xScale: w / 2,
            yScale: h / 2,
            ...common,
        });
    } else if (overlay.shape === 'triangle') {
        // Path en coords locales (0,0 abajo-izquierda del path space de pdf-lib drawSvgPath).
        const path = `M ${w / 2} ${h} L ${w} 0 L 0 0 Z`;
        page.drawSvgPath(path, {
            x,
            y,
            borderWidth: strokeWidth,
            borderColor: strokeWidth > 0 ? strokeColor : undefined,
            borderOpacity,
            color: fillColor,
            opacity: hasFill ? opacity : undefined,
        });
    } else {
        // rect / square
        page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            ...common,
        });
    }

    if (overlay.linkUrl) {
        addLinkAnnotation(page, {
            x,
            y,
            width: w,
            height: h,
            url: overlay.linkUrl,
        });
    }
}

function clamp01(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 1;
    return Math.min(1, Math.max(0, v));
}

function drawInkOnPage(page, overlay, pw, ph) {
    const pts = overlay.points || [];
    if (pts.length < 2) return;

    const boxX = (Number(overlay.xNorm) || 0) * pw;
    const boxTop = (Number(overlay.yNorm) || 0) * ph;
    const boxW = Math.max(4, (Number(overlay.widthNorm) || 0.1) * pw);
    const boxH = Math.max(4, (Number(overlay.heightNorm) || 0.1) * ph);
    const thickness = Math.max(0.5, Number(overlay.strokeWidth) || 2.5);
    const color = hexToRgb(overlay.color || '#111827');

    for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1];
        const b = pts[i];
        const x1 = boxX + (Number(a.x) || 0) * boxW;
        const y1 = ph - (boxTop + (Number(a.y) || 0) * boxH);
        const x2 = boxX + (Number(b.x) || 0) * boxW;
        const y2 = ph - (boxTop + (Number(b.y) || 0) * boxH);
        page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness,
            color,
            lineCap: LineCapStyle.Round,
        });
    }
}

async function embedViaCanvas(pdfDoc, bytes, mime) {
    const blob = new Blob([bytes], { type: mime || 'image/png' });
    const url = URL.createObjectURL(blob);
    try {
        const img = await loadHtmlImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const png = await canvasToPng(canvas);
        return pdfDoc.embedPng(png);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function loadHtmlImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo leer la imagen superpuesta.'));
        img.src = src;
    });
}

function canvasToPng(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('No se pudo convertir la imagen.'));
                return;
            }
            blob.arrayBuffer().then((b) => resolve(new Uint8Array(b))).catch(reject);
        }, 'image/png');
    });
}

export function stampedFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `esquina-pdf-editado-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}
