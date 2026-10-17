const STORAGE_KEY = 'esquinaqr.draft.v1';
const MAX_LOGO_CHARS = 900_000; // ~0.9 MB en base64; evita saturar localStorage

/**
 * @returns {{ type: string, data: Record<string, unknown>, style: Record<string, unknown> } | null}
 */
export function loadQrDraft() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.type || !parsed.data || !parsed.style) return null;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * @param {{ type: string, data: Record<string, unknown>, style: Record<string, unknown> }} draft
 */
export function saveQrDraft(draft) {
    try {
        const style = { ...draft.style };
        // No persistir errores de UI ni logos enormes.
        style.logoError = '';
        if (String(style.logoSrc || '').length > MAX_LOGO_CHARS) {
            style.logoSrc = '';
            style.logoName = '';
        }

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                type: draft.type,
                data: draft.data,
                style,
                savedAt: Date.now(),
            }),
        );
    } catch {
        // QuotaExceeded u otros: silencioso.
    }
}

export function clearQrDraft() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
