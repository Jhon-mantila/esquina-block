import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerReady = false;

/**
 * Vite emite `/build/assets/...`, pero las herramientas viven bajo Alias
 * (`/esquinapdf`, etc.). Prefijamos para que el worker no dé 404.
 */
function resolveAssetUrl(url) {
    if (!url || url.startsWith('blob:') || /^https?:\/\//i.test(url)) {
        return url;
    }
    if (!url.startsWith('/build/')) return url;

    const match = window.location.pathname.match(
        /^\/(esquinablock|esquinacut|esquinaqr|esquinapdf)(?=\/|$)/,
    );
    return match ? `${match[0]}${url}` : url;
}

function ensureWorker() {
    if (!workerReady) {
        GlobalWorkerOptions.workerSrc = resolveAssetUrl(workerSrc);
        workerReady = true;
    }
}

/**
 * @param {ArrayBuffer|Uint8Array} data
 * @returns {Promise<import('pdfjs-dist').PDFDocumentProxy>}
 */
export async function loadPdfDocument(data) {
    ensureWorker();
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const task = getDocument({ data: bytes.slice(0), useSystemFonts: true });
    return task.promise;
}

/**
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {number} pageNumber 1-based
 * @param {HTMLCanvasElement} canvas
 * @param {number} [maxWidth]
 */
/** Cola: pdf.js no tolera bien varios render() en paralelo sobre el mismo doc. */
let renderChain = Promise.resolve();

export function renderPageToCanvas(pdf, pageNumber, canvas, maxWidth = 160) {
    const job = renderChain.then(() => renderPageToCanvasNow(pdf, pageNumber, canvas, maxWidth));
    // Evita que un fallo tumbe la cola entera.
    renderChain = job.catch(() => {});
    return job;
}

async function renderPageToCanvasNow(pdf, pageNumber, canvas, maxWidth = 160) {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = maxWidth / Math.max(base.width, 1);
    const viewport = page.getViewport({ scale });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    // En pdf.js v6: usar `canvas` O `canvasContext` (+ canvas: null), no ambos.
    const task = page.render({
        canvas,
        viewport,
        intent: 'display',
        background: 'rgb(255,255,255)',
    });
    await task.promise;

    return {
        width: canvas.width,
        height: canvas.height,
        scale,
        pageWidth: base.width,
        pageHeight: base.height,
    };
}
