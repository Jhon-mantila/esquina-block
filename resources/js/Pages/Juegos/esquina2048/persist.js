import { MODE_SIZE } from './engine';
import { STORAGE } from './gameEvents';

const DRAFT_VERSION = 2;

/**
 * @param {string} mode
 */
export function draftKey(mode) {
    return `${STORAGE.draftPrefix}${mode}`;
}

/**
 * @param {unknown} data
 * @param {string} mode
 * @returns {null | { mode: string, grid: number[][], score: number, won: boolean, over: boolean, winDismissed: boolean }}
 */
export function normalizeDraft(data, mode) {
    if (!data || typeof data !== 'object') return null;
    const d = /** @type {Record<string, unknown>} */ (data);
    // Acepta v1 (sin winDismissed) y v2
    if (d.v !== 1 && d.v !== DRAFT_VERSION) return null;
    if (d.mode !== mode) return null;

    const size = MODE_SIZE[mode];
    if (!size || !Array.isArray(d.grid) || d.grid.length !== size) return null;

    /** @type {number[][]} */
    const grid = [];
    for (let r = 0; r < size; r += 1) {
        const row = d.grid[r];
        if (!Array.isArray(row) || row.length !== size) return null;
        grid.push(row.map((n) => {
            const v = Number(n);
            return Number.isFinite(v) && v >= 0 ? v : 0;
        }));
    }

    const score = Number(d.score);
    const won = d.won === true;
    // Partidas viejas con victoria ya mostrada: no volver a bloquear con el aviso
    const winDismissed = d.winDismissed === true || (d.v === 1 && won && d.over !== true);

    return {
        mode,
        grid,
        score: Number.isFinite(score) && score >= 0 ? score : 0,
        won,
        over: d.over === true,
        winDismissed,
    };
}

/**
 * @param {string} mode
 */
export function loadDraft(mode) {
    try {
        const raw = localStorage.getItem(draftKey(mode));
        if (!raw) return null;
        return normalizeDraft(JSON.parse(raw), mode);
    } catch {
        return null;
    }
}

/**
 * @param {{ mode: string, grid: number[][], score: number, won: boolean, over: boolean, winDismissed?: boolean }} match
 */
export function saveDraft(match) {
    if (!match?.mode || !Array.isArray(match.grid)) return;
    try {
        localStorage.setItem(
            draftKey(match.mode),
            JSON.stringify({
                v: DRAFT_VERSION,
                mode: match.mode,
                grid: match.grid,
                score: match.score,
                won: !!match.won,
                over: !!match.over,
                winDismissed: !!match.winDismissed,
                savedAt: Date.now(),
            }),
        );
    } catch {
        /* ignore quota / private mode */
    }
}

/**
 * @param {string} mode
 */
export function clearDraft(mode) {
    try {
        localStorage.removeItem(draftKey(mode));
    } catch {
        /* ignore */
    }
}
