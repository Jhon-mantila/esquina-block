import { buildQrOptions } from './buildQrOptions.js';

const DOWNLOAD_SIZE = 1024;

/**
 * @param {string} data
 * @param {Record<string, unknown>} style
 * @param {'png'|'svg'} extension
 */
export async function downloadQr(data, style, extension) {
    const payload = String(data || '').trim();
    if (!payload) {
        throw new Error('Completa los datos del QR antes de descargar.');
    }

    const { default: QRCodeStyling } = await import('qr-code-styling');
    const options = await buildQrOptions(payload, style, {
        size: DOWNLOAD_SIZE,
        type: extension === 'svg' ? 'svg' : 'canvas',
    });

    const qr = new QRCodeStyling(options);
    await qr.download({
        name: 'esquinaqr',
        extension,
    });
}
