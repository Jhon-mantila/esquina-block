import { PDFDocument } from 'pdf-lib';

/**
 * Elimina páginas (índices 0-based). Borra de mayor a menor.
 * @param {ArrayBuffer} source
 * @param {number[]} removeIndices
 * @returns {Promise<Uint8Array>}
 */
export async function removePdfPages(source, removeIndices) {
    if (!removeIndices.length) {
        throw new Error('Selecciona al menos una página para eliminar.');
    }

    const doc = await PDFDocument.load(source, { ignoreEncryption: false });
    const total = doc.getPageCount();

    if (removeIndices.length >= total) {
        throw new Error('No puedes eliminar todas las páginas. Debe quedar al menos una.');
    }

    const unique = [...new Set(removeIndices)]
        .filter((i) => Number.isInteger(i) && i >= 0 && i < total)
        .sort((a, b) => b - a);

    if (!unique.length) {
        throw new Error('Las páginas seleccionadas no son válidas.');
    }

    for (const index of unique) {
        doc.removePage(index);
    }

    return doc.save({ useObjectStreams: false });
}

export function deletePagesFilename() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `esquina-pdf-sin-paginas-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}
