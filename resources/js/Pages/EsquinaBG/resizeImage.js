/** Lado máximo antes de enviar al Worker (ahorra RAM). */
export const MAX_PROCESS_EDGE = 1024;

/**
 * Redimensiona un File/Blob manteniendo proporción si el lado mayor supera maxEdge.
 * @param {Blob} blob
 * @param {number} [maxEdge]
 * @returns {Promise<{ bitmap: ImageBitmap, width: number, height: number, resized: boolean }>}
 */
export async function resizeImageForProcessing(blob, maxEdge = MAX_PROCESS_EDGE) {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);

    if (longest <= maxEdge) {
        return { bitmap, width, height, resized: false };
    }

    const scale = maxEdge / longest;
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        bitmap.close();
        throw new Error('No se pudo preparar el canvas para redimensionar.');
    }
    ctx.drawImage(bitmap, 0, 0, tw, th);
    bitmap.close();

    const out = await createImageBitmap(canvas);
    return { bitmap: out, width: tw, height: th, resized: true };
}
