import { PDFDocument } from 'pdf-lib';

/** Tamaños en puntos PDF (72 dpi). */
export const PAPER_SIZES = {
    a4: { width: 595.28, height: 841.89, label: 'A4' },
    letter: { width: 612, height: 792, label: 'Carta' },
};

const MM_TO_PT = 72 / 25.4;
const MIN_MM = 40;
const MAX_MM = 1200;

/**
 * @param {number} mm
 * @returns {number}
 */
export function mmToPt(mm) {
    return Number(mm) * MM_TO_PT;
}

/**
 * @param {{ paper: string, orientation?: string, widthMm?: number, heightMm?: number, margin?: number }} options
 * @param {{ width: number, height: number }} [imageSize]
 * @returns {{ pageW: number, pageH: number, margin: number, fitImage: boolean }}
 */
export function resolvePageSize(options, imageSize) {
    const margin = options.margin ?? 36;
    const landscape = options.orientation === 'landscape';

    if (options.paper === 'image' && imageSize) {
        return {
            pageW: imageSize.width,
            pageH: imageSize.height,
            margin: 0,
            fitImage: true,
        };
    }

    if (options.paper === 'custom') {
        const wMm = clamp(Number(options.widthMm) || 210, MIN_MM, MAX_MM);
        const hMm = clamp(Number(options.heightMm) || 297, MIN_MM, MAX_MM);
        let pageW = mmToPt(wMm);
        let pageH = mmToPt(hMm);
        if (landscape && pageW < pageH) {
            [pageW, pageH] = [pageH, pageW];
        } else if (!landscape && pageW > pageH) {
            // Respeta orientación: vertical = alto mayor si el usuario no lo invirtió a propósito.
            // No forzar swap si ya puso ancho > alto a propósito en vertical.
        }
        return { pageW, pageH, margin, fitImage: false };
    }

    const paper = PAPER_SIZES[options.paper] || PAPER_SIZES.a4;
    const pageW = landscape ? paper.height : paper.width;
    const pageH = landscape ? paper.width : paper.height;
    return { pageW, pageH, margin, fitImage: false };
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

/**
 * @param {{ bytes: ArrayBuffer, mime: string }[]} images
 * @param {{ paper: 'a4'|'letter'|'custom'|'image', orientation?: 'portrait'|'landscape', widthMm?: number, heightMm?: number, margin?: number }} options
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function imagesToPdfBytes(images, options, onProgress) {
    if (!images.length) {
        throw new Error('Añade al menos una imagen.');
    }

    const out = await PDFDocument.create();
    const total = images.length;

    for (let i = 0; i < images.length; i += 1) {
        const { bytes, mime } = images[i];
        let embedded;
        try {
            if (mime === 'image/png') {
                embedded = await out.embedPng(bytes);
            } else if (mime === 'image/jpeg' || mime === 'image/jpg') {
                embedded = await out.embedJpg(bytes);
            } else {
                embedded = await embedViaCanvas(out, bytes, mime || 'image/png');
            }
        } catch {
            embedded = await embedViaCanvas(out, bytes, mime || 'image/jpeg');
        }

        const { pageW, pageH, margin, fitImage } = resolvePageSize(options, {
            width: embedded.width,
            height: embedded.height,
        });

        const page = out.addPage([pageW, pageH]);

        if (fitImage) {
            page.drawImage(embedded, { x: 0, y: 0, width: pageW, height: pageH });
        } else {
            const maxW = Math.max(pageW - margin * 2, 1);
            const maxH = Math.max(pageH - margin * 2, 1);
            const scale = Math.min(maxW / embedded.width, maxH / embedded.height);
            const w = embedded.width * scale;
            const h = embedded.height * scale;
            const x = (pageW - w) / 2;
            const y = (pageH - h) / 2;
            page.drawImage(embedded, { x, y, width: w, height: h });
        }

        onProgress?.(i + 1, total);
    }

    return out.save({ useObjectStreams: false });
}

async function embedViaCanvas(pdfDoc, bytes, mime) {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    try {
        const img = await loadHtmlImage(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngBytes = await canvasToPngBytes(canvas);
        return pdfDoc.embedPng(pngBytes);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function loadHtmlImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo leer una de las imágenes.'));
        img.src = src;
    });
}

function canvasToPngBytes(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('No se pudo convertir la imagen.'));
                    return;
                }
                blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
            },
            'image/png',
        );
    });
}

export function imagesPdfFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `esquina-pdf-imagenes-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}
