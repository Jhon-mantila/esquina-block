/**
 * Redondea las esquinas de una imagen (data URL) para el logo del QR.
 * @param {string} src
 * @param {number} radiusPx
 * @returns {Promise<string>}
 */
export function roundImageCorners(src, radiusPx) {
    if (!src || !radiusPx) return Promise.resolve(src || '');

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(src);
                return;
            }

            const r = Math.min(radiusPx, size / 2);
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.arcTo(size, 0, size, size, r);
            ctx.arcTo(size, size, 0, size, r);
            ctx.arcTo(0, size, 0, 0, r);
            ctx.arcTo(0, 0, size, 0, r);
            ctx.closePath();
            ctx.clip();

            const sx = ((img.naturalWidth || img.width) - size) / 2;
            const sy = ((img.naturalHeight || img.height) - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('No se pudo procesar el logo.'));
        img.src = src;
    });
}
