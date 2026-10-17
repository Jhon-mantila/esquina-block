/**
 * GA4 (gtag.js) — único punto de tracking de Esquina Block / Cut / QR.
 * Solo envía eventos si gtag existe. En localhost hace falta GA4_DEBUG=true.
 */
import { router } from '@inertiajs/vue3';

function isLocalHost() {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.local');
}

function canTrack() {
    if (typeof window.gtag !== 'function') return false;
    if (window.__GA4_DEBUG__ === true) return true;
    return !isLocalHost();
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [params]
 */
export function trackEvent(eventName, params = {}) {
    if (!canTrack()) return;
    window.gtag('event', eventName, params);
}

/**
 * @param {'block'|'cut'} tool
 */
export function trackGenerarPdf(tool) {
    trackEvent('generate_pdf', { tool });
}

/**
 * @param {'block'|'cut'} tool
 * @param {string} [fileName]
 */
export function trackDescargarPdf(tool, fileName = '') {
    trackEvent('file_download', {
        tool,
        file_name: fileName,
        file_extension: 'pdf',
    });
}

/**
 * @param {'block'|'cut'} tool
 * @param {number} count
 */
export function trackSubirImagen(tool, count = 1) {
    trackEvent('upload_image', {
        tool,
        image_count: Number(count) || 1,
    });
}

/**
 * @param {'block'|'cut'|'qr'} fromTool
 * @param {'block'|'cut'|'qr'} toTool
 */
export function trackCrossToolClick(fromTool, toTool) {
    trackEvent('cross_tool_click', {
        from_tool: fromTool,
        to_tool: toTool,
        link_url: window.location.href,
    });
}

/**
 * @param {'url'|'wifi'|'vcard'|'email'|'sms'} qrType
 */
export function trackQrType(qrType) {
    trackEvent('qr_type_select', {
        tool: 'qr',
        qr_type: qrType,
    });
}

/**
 * @param {'png'|'svg'} extension
 * @param {string} [qrType]
 */
export function trackDescargarQr(extension, qrType = '') {
    trackEvent('file_download', {
        tool: 'qr',
        file_name: `esquinaqr.${extension}`,
        file_extension: extension,
        qr_type: qrType,
    });
}

export function trackSubirLogoQr() {
    trackEvent('upload_image', {
        tool: 'qr',
        image_count: 1,
        asset: 'logo',
    });
}

function trackPageView() {
    trackEvent('page_view', {
        page_path: window.location.pathname,
        page_location: window.location.href,
        page_title: document.title,
    });
}

// Disponible para enlaces Blade (footer Block ↔ Cut).
window.esquinaTrackCrossToolClick = trackCrossToolClick;

router.on('navigate', () => {
    trackPageView();
});

// Primera carga (Inertia no dispara navigate al montar).
if (document.readyState === 'complete') {
    trackPageView();
} else {
    window.addEventListener('load', trackPageView, { once: true });
}
