/**
 * Paletas visuales Esquina Blocks.
 * dark = neón / gaming · colorful = Block Blast
 */

/** @typedef {{
 *   id: 'dark' | 'colorful',
 *   canvas: string,
 *   boardBg: number,
 *   boardStroke: number,
 *   emptyCell: number,
 *   emptyStroke: number,
 *   trayBg: number,
 *   trayStroke: number,
 *   hint: string,
 *   fontFamily: string,
 *   blocks: number[],
 * }} ThemeDef */

/** @type {Record<'dark' | 'colorful', ThemeDef>} */
export const THEMES = {
    dark: {
        id: 'dark',
        canvas: '#070b16',
        boardBg: 0x0f172a,
        boardStroke: 0x22d3ee,
        emptyCell: 0x1e293b,
        emptyStroke: 0x334155,
        trayBg: 0x111827,
        trayStroke: 0x334155,
        hint: '#94a3b8',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        blocks: [0x22d3ee, 0xa78bfa, 0xf472b6, 0x34d399, 0xfbbf24, 0x60a5fa, 0xfb7185],
    },
    colorful: {
        id: 'colorful',
        canvas: '#ffe8d6',
        boardBg: 0xfff7ed,
        boardStroke: 0xfb923c,
        emptyCell: 0xffedd5,
        emptyStroke: 0xfdba74,
        trayBg: 0xfffbeb,
        trayStroke: 0xfdba74,
        hint: '#9a3412',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        blocks: [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316, 0x06b6d4],
    },
};

/**
 * @param {string} id
 * @returns {ThemeDef}
 */
export function resolveTheme(id) {
    return THEMES[id === 'colorful' ? 'colorful' : 'dark'];
}
