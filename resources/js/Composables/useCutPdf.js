import {
    drawCutPage,
    loadHtmlImages,
    paperSizeMm,
} from '@/Composables/renderCutPage.js';

const MAX_PAGES = 5;
const DPI = 150;

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function pdfFileName() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `esquina-cut-${y}-${m}-${day}.pdf`;
}

function canvasToJpeg(canvas, quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('No se pudo exportar la página'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            },
            'image/jpeg',
            quality,
        );
    });
}

/**
 * Genera y descarga el PDF de Esquina Cut.
 * @returns {Promise<void>}
 */
export async function generateCutPdf(
    {
        images,
        cols,
        rows,
        paper,
        orientation,
        title,
        subtitle,
        titleOn,
        margin,
        gap,
        pageNumbers,
        cellGrid,
        cellGridStyle,
        cellGridColor,
        border,
    },
    onProgress = () => {},
) {
    const perPage = cols * rows;
    const totalPages = Math.ceil(images.length / perPage);
    if (!images.length) throw new Error('Sube al menos una imagen.');
    if (totalPages > MAX_PAGES) {
        throw new Error(`Con este grid serían ${totalPages} páginas. El máximo es ${MAX_PAGES}. Ajusta la cuadrícula.`);
    }

    onProgress(2);
    const imageMap = await loadHtmlImages(images);
    onProgress(8);

    const { w: pageWmm, h: pageHmm } = paperSizeMm(paper, orientation);
    const pxW = Math.round((pageWmm / 25.4) * DPI);
    const pxH = Math.round((pageHmm / 25.4) * DPI);
    const dpr = DPI / 96;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: paper,
        compress: true,
    });

    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
        if (pageIndex > 0) doc.addPage(paper, orientation);

        const start = pageIndex * perPage;
        const pageImages = images.slice(start, start + perPage);
        const showTitle = Boolean(title || subtitle) && (titleOn !== 'first' || pageIndex === 0);

        ctx.clearRect(0, 0, pxW, pxH);
        drawCutPage(ctx, canvas, {
            pageWmm,
            pageHmm,
            cols,
            rows,
            marginKey: margin,
            gapMm: gap,
            title,
            subtitle,
            showTitle,
            pageNumbers,
            pageIndex,
            totalPages,
            cellGrid,
            cellGridStyle,
            cellGridColor,
            border,
            pageImages,
            imageMap,
            dpr,
            gapScale: 0.35,
        });

        const dataUrl = await canvasToJpeg(canvas);
        doc.addImage(dataUrl, 'JPEG', 0, 0, pageWmm, pageHmm, `pagina-${pageIndex + 1}`, 'FAST');

        onProgress(Math.round(10 + ((pageIndex + 1) / totalPages) * 85));
        await nextFrame();
    }

    canvas.width = canvas.height = 0;
    doc.save(pdfFileName());
    onProgress(100);
}

export { MAX_PAGES as CUT_MAX_PAGES };
