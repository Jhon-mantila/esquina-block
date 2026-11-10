/**
 * Prefijo del Alias Apache (/esquinabg, etc.) para assets bajo public/.
 * @param {string} [pathname]
 */
export function getToolBase(pathname = typeof window !== 'undefined' ? window.location.pathname : '') {
    const match = pathname.match(
        /^\/(esquinablock|esquinacut|esquinaqr|esquinapdf|esquinaimg|esquinabg|esquina2048|esquinablocks)(?=\/|$)/,
    );
    return match ? match[0] : '';
}

/**
 * Resuelve URLs emitidas por Vite (`/build/...`) bajo el Alias de la herramienta.
 * Acepta rutas relativas o URLs absolutas (p. ej. new URL(..., import.meta.url).href).
 * @param {string} url
 */
export function resolveViteAssetUrl(url) {
    if (!url || url.startsWith('blob:')) return url;

    try {
        if (/^https?:\/\//i.test(url)) {
            const u = new URL(url);
            if (u.pathname.startsWith('/build/')) {
                return `${u.origin}${getToolBase()}${u.pathname}${u.search}${u.hash}`;
            }
            return url;
        }
    } catch {
        // seguir con lógica de path
    }

    if (url.startsWith('/build/')) {
        return `${getToolBase()}${url}`;
    }

    return url;
}

/**
 * @param {string} absolutePath path desde public/, p.ej. `/models/esquinabg/u2netp.onnx`
 */
export function resolvePublicUrl(absolutePath) {
    const path = absolutePath.startsWith('/') ? absolutePath : `/${absolutePath}`;
    return `${getToolBase()}${path}`;
}
