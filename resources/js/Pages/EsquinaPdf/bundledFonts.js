/** Tipografías empaquetadas en /fonts/pdf/ (SIL OFL / Apache). */

export const BUNDLED_FONTS = [
    { id: 'roboto', label: 'Roboto', regular: 'roboto-400.ttf', bold: 'roboto-700.ttf' },
    { id: 'open-sans', label: 'Open Sans', regular: 'open-sans-400.ttf', bold: 'open-sans-700.ttf' },
    { id: 'montserrat', label: 'Montserrat', regular: 'montserrat-400.ttf', bold: 'montserrat-700.ttf' },
    { id: 'lato', label: 'Lato', regular: 'lato-400.ttf', bold: 'lato-700.ttf' },
    { id: 'poppins', label: 'Poppins', regular: 'poppins-400.ttf', bold: 'poppins-700.ttf' },
];

export const STANDARD_FONTS = [
    { id: 'Helvetica', label: 'Helvetica' },
    { id: 'Times', label: 'Times' },
    { id: 'Courier', label: 'Courier' },
];

const bytesCache = new Map();
const faceCache = new Set();

function appBasePrefix() {
    const match = window.location.pathname.match(
        /^\/(esquinablock|esquinacut|esquinaqr|esquinapdf)(?=\/|$)/,
    );
    return match ? match[0] : '';
}

export function bundledFontUrl(fileName) {
    return `${appBasePrefix()}/fonts/pdf/${fileName}`;
}

export function isBundledFont(family) {
    return BUNDLED_FONTS.some((f) => f.id === family);
}

export function getBundledFontMeta(family) {
    return BUNDLED_FONTS.find((f) => f.id === family) || null;
}

/**
 * Carga bytes TTF y registra FontFace para la vista previa.
 * @returns {Promise<{ bytes: ArrayBuffer, fontKey: string }>}
 */
export async function loadBundledFont(family, bold = false) {
    const meta = getBundledFontMeta(family);
    if (!meta) throw new Error('Tipografía no encontrada.');

    const file = bold && meta.bold ? meta.bold : meta.regular;
    const cacheKey = `${family}:${bold ? '700' : '400'}`;
    if (bytesCache.has(cacheKey)) {
        return bytesCache.get(cacheKey);
    }

    const res = await fetch(bundledFontUrl(file));
    if (!res.ok) throw new Error(`No se pudo cargar la tipografía ${meta.label}.`);
    const fetched = await res.arrayBuffer();
    // Dos copias: una para FontFace (puede detach) y otra estable para pdf-lib.
    const forPdf = fetched.slice(0);
    const forPreview = fetched.slice(0);
    const fontKey = `esquina-${family}-${bold ? 'b' : 'r'}`;

    if (!faceCache.has(fontKey)) {
        const face = new FontFace(fontKey, forPreview);
        await face.load();
        document.fonts.add(face);
        faceCache.add(fontKey);
    }

    const packed = { bytes: forPdf, fontKey, fontName: file };
    bytesCache.set(cacheKey, packed);
    return packed;
}

export function normalizeLinkUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    return `https://${value}`;
}
