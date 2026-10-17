import { roundImageCorners } from './roundImageCorners.js';

/**
 * @param {string} data
 * @param {Record<string, unknown>} style
 * @param {{ size?: number, type?: 'canvas'|'svg' }} [overrides]
 */
export async function buildQrOptions(data, style, overrides = {}) {
    const s = style || {};
    const size = overrides.size ?? (Number(s.size) || 280);
    const drawType = overrides.type || 'canvas';
    const logoSrc = String(s.logoSrc || '');
    const logo = logoSrc
        ? await roundImageCorners(logoSrc, Number(s.logoCornerRadius) || 0)
        : '';

    /** @type {Record<string, unknown>} */
    const dotsOptions = {
        type: s.dotsType || 'square',
        color: s.dotsColor || '#0f172a',
    };

    if (s.useGradient) {
        dotsOptions.gradient = {
            type: 'linear',
            rotation: ((Number(s.gradientAngle) || 0) * Math.PI) / 180,
            colorStops: [
                { offset: 0, color: s.dotsColor || '#0f172a' },
                { offset: 1, color: s.gradientColor2 || '#2563eb' },
            ],
        };
    }

    return {
        width: size,
        height: size,
        type: drawType,
        shape: s.shape === 'circle' ? 'circle' : 'square',
        data: String(data || '').trim(),
        margin: Number(s.margin) || 0,
        image: logo || undefined,
        qrOptions: {
            errorCorrectionLevel: s.errorCorrection || 'Q',
        },
        imageOptions: {
            hideBackgroundDots: s.hideBackgroundDots !== false,
            imageSize: Number(s.logoSize) || 0.35,
            margin: Number(s.logoMargin) || 0,
            crossOrigin: 'anonymous',
        },
        dotsOptions,
        cornersSquareOptions: {
            type: s.cornersSquareType || 'square',
            color: s.cornersSquareColor || s.dotsColor || '#0f172a',
        },
        cornersDotOptions: {
            type: s.cornersDotType || 'square',
            color: s.cornersDotColor || s.dotsColor || '#0f172a',
        },
        backgroundOptions: {
            color: s.transparentBg ? 'transparent' : (s.background || '#ffffff'),
        },
    };
}
