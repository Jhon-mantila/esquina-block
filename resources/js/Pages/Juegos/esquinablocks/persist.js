import { GRID_SIZE } from './board';
import { STORAGE } from './gameEvents';

const DRAFT_VERSION = 1;

/**
 * @param {unknown} data
 * @returns {null | {
 *   grid: number[][],
 *   tray: (null | { id: string, cells: [number, number][], colorIndex: number })[],
 *   score: number,
 *   over: boolean,
 * }}
 */
export function normalizeDraft(data) {
    if (!data || typeof data !== 'object') return null;
    const d = /** @type {Record<string, unknown>} */ (data);
    if (d.v !== DRAFT_VERSION) return null;
    if (!Array.isArray(d.grid) || d.grid.length !== GRID_SIZE) return null;

    /** @type {number[][]} */
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r += 1) {
        const row = d.grid[r];
        if (!Array.isArray(row) || row.length !== GRID_SIZE) return null;
        grid.push(row.map((n) => {
            const v = Number(n);
            return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        }));
    }

    if (!Array.isArray(d.tray) || d.tray.length !== 3) return null;
    const tray = d.tray.map((item) => {
        if (item == null) return null;
        if (typeof item !== 'object') return null;
        const p = /** @type {Record<string, unknown>} */ (item);
        if (!Array.isArray(p.cells) || !p.cells.length) return null;
        const cells = [];
        for (const cell of p.cells) {
            if (!Array.isArray(cell) || cell.length < 2) return null;
            cells.push(/** @type {[number, number]} */ ([Number(cell[0]), Number(cell[1])]));
        }
        const colorIndex = Number(p.colorIndex);
        return {
            id: typeof p.id === 'string' ? p.id : `restored-${Math.random().toString(36).slice(2, 8)}`,
            cells,
            colorIndex: Number.isFinite(colorIndex) && colorIndex > 0 ? colorIndex : 1,
        };
    });

    const score = Number(d.score);
    return {
        grid,
        tray,
        score: Number.isFinite(score) && score >= 0 ? score : 0,
        over: d.over === true,
    };
}

export function loadDraft() {
    try {
        const raw = localStorage.getItem(STORAGE.draft);
        if (!raw) return null;
        return normalizeDraft(JSON.parse(raw));
    } catch {
        return null;
    }
}

/**
 * @param {{
 *   grid: number[][],
 *   tray: (null | { id: string, cells: [number, number][], colorIndex: number })[],
 *   score: number,
 *   over: boolean,
 * }} match
 */
export function saveDraft(match) {
    if (!match?.grid || !Array.isArray(match.tray)) return;
    try {
        localStorage.setItem(
            STORAGE.draft,
            JSON.stringify({
                v: DRAFT_VERSION,
                grid: match.grid,
                tray: match.tray,
                score: match.score,
                over: !!match.over,
            }),
        );
    } catch {
        /* ignore quota */
    }
}

export function clearDraft() {
    try {
        localStorage.removeItem(STORAGE.draft);
    } catch {
        /* ignore */
    }
}
