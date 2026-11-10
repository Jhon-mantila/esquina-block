/**
 * GA4 (gtag.js) — tracking de Esquina Block / Cut / QR / PDF / Img / BG / 2048 / Blocks.
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
 * Contexto de página en cada evento (para filtrar en GA4 por ruta / herramienta).
 * @returns {Record<string, string>}
 */
function pageContext() {
    const path = window.location.pathname || '';
    let toolFromPath = '';
    if (path.includes('/esquinacut')) toolFromPath = 'cut';
    else if (path.includes('/esquinaqr')) toolFromPath = 'qr';
    else if (path.includes('/esquinapdf')) toolFromPath = 'pdf';
    else if (path.includes('/esquinablocks')) toolFromPath = 'blocks';
    else if (path.includes('/esquinablock')) toolFromPath = 'block';
    else if (path.includes('/esquinaimg')) toolFromPath = 'img';
    else if (path.includes('/esquinabg')) toolFromPath = 'bg';
    else if (path.includes('/esquina2048')) toolFromPath = '2048';

    return {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
        ...(toolFromPath ? { tool_page: toolFromPath } : {}),
    };
}

/**
 * @param {string} eventName
 * @param {Record<string, unknown>} [params]
 */
export function trackEvent(eventName, params = {}) {
    if (!canTrack()) return;
    window.gtag('event', eventName, {
        ...pageContext(),
        ...params,
    });
}

/**
 * @param {'block'|'cut'|'pdf'} tool
 */
export function trackGenerarPdf(tool) {
    trackEvent('generate_pdf', { tool });
}

/**
 * @param {'block'|'cut'|'pdf'} tool
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
 * @param {'block'|'cut'|'pdf'|'img'|'bg'} tool
 * @param {number} count
 */
export function trackSubirImagen(tool, count = 1) {
    trackEvent('upload_image', {
        tool,
        image_count: Number(count) || 1,
    });
}

/**
 * @param {'block'|'cut'|'qr'|'pdf'|'img'|'bg'|'2048'|'blocks'} fromTool
 * @param {'block'|'cut'|'qr'|'pdf'|'img'|'bg'|'2048'|'blocks'} toTool
 */
export function trackCrossToolClick(fromTool, toTool) {
    trackEvent('cross_tool_click', {
        from_tool: fromTool,
        to_tool: toTool,
        link_url: window.location.href,
    });
}

/**
 * @param {'classic'|'large'|'expert'|string} mode
 * @param {'dark'|'colorful'|string} theme
 */
export function track2048Start(mode, theme) {
    trackEvent('game_start', {
        tool: '2048',
        game_mode: mode,
        game_theme: theme,
    });
}

/**
 * @param {'classic'|'large'|'expert'|string} mode
 * @param {number} score
 * @param {boolean} [isNewBest=false]
 */
export function track2048GameOver(mode, score, isNewBest = false) {
    trackEvent('game_over', {
        tool: '2048',
        game_mode: mode,
        score: Number(score) || 0,
        is_new_best: isNewBest ? 1 : 0,
    });
}

/**
 * @param {'classic'|'large'|'expert'|string} mode
 * @param {number} score
 */
export function track2048Win(mode, score) {
    trackEvent('game_win', {
        tool: '2048',
        game_mode: mode,
        score: Number(score) || 0,
    });
}

/**
 * @param {'classic'|'large'|'expert'|string} mode
 */
export function track2048Restart(mode) {
    trackEvent('game_restart', {
        tool: '2048',
        game_mode: mode,
    });
}

/**
 * @param {'classic'|'large'|'expert'|string} mode
 */
export function track2048ModeChange(mode) {
    trackEvent('game_mode_change', {
        tool: '2048',
        game_mode: mode,
    });
}

/**
 * @param {'dark'|'colorful'|string} theme
 */
export function track2048ThemeChange(theme) {
    trackEvent('game_theme_change', {
        tool: '2048',
        game_theme: theme,
    });
}

/**
 * @param {'dark'|'colorful'|string} theme
 */
export function trackBlocksStart(theme) {
    trackEvent('game_start', {
        tool: 'blocks',
        game_theme: theme,
    });
}

/**
 * @param {number} score
 * @param {boolean} [isNewBest=false]
 */
export function trackBlocksGameOver(score, isNewBest = false) {
    trackEvent('game_over', {
        tool: 'blocks',
        score: Number(score) || 0,
        is_new_best: isNewBest ? 1 : 0,
    });
}

export function trackBlocksRestart() {
    trackEvent('game_restart', {
        tool: 'blocks',
    });
}

/**
 * @param {'dark'|'colorful'|string} theme
 */
export function trackBlocksThemeChange(theme) {
    trackEvent('game_theme_change', {
        tool: 'blocks',
        game_theme: theme,
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
