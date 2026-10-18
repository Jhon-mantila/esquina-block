import { PDFDocument } from 'pdf-lib';

/**
 * Une varios ArrayBuffer de PDF en el orden dado.
 * @param {ArrayBuffer[]} sources
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Uint8Array>}
 */
export async function mergePdfBuffers(sources, onProgress) {
    if (!sources.length) {
        throw new Error('Añade al menos un PDF para unir.');
    }

    const out = await PDFDocument.create();
    const total = sources.length;

    for (let i = 0; i < sources.length; i += 1) {
        let src;
        try {
            src = await PDFDocument.load(sources[i], { ignoreEncryption: false });
        } catch {
            throw new Error(
                `No se pudo leer el PDF ${i + 1}. Puede estar dañado o protegido con contraseña.`,
            );
        }
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((page) => out.addPage(page));
        onProgress?.(i + 1, total);
    }

    return out.save({ useObjectStreams: false });
}

export function downloadPdfBytes(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function mergeFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `esquina-pdf-unido-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}
