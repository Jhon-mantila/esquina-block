/**
 * Paletas visuales Esquina 2048 (paso 6).
 * dark = neón / gaming · colorful = Block Blast / candy
 */

/** @typedef {{ bg: number, fg: string, edge?: number }} TileStyle */
/** @typedef {{
 *   id: 'dark' | 'colorful',
 *   canvas: string,
 *   boardBg: number,
 *   boardStroke: number,
 *   emptyCell: number,
 *   emptyStroke: number,
 *   overlayDim: number,
 *   overlayPlateOver: number,
 *   overlayPlateWin: number,
 *   overlayStrokeOver: number,
 *   overlayStrokeWin: number,
 *   overlayTitle: string,
 *   overlaySub: string,
 *   tiles: Record<number, TileStyle>,
 *   tileFallback: TileStyle,
 *   fontFamily: string,
 * }} ThemeDef */

/** @type {Record<'dark' | 'colorful', ThemeDef>} */
export const THEMES = {
    dark: {
        id: 'dark',
        canvas: '#070b16',
        boardBg: 0x111827,
        boardStroke: 0x22d3ee,
        emptyCell: 0x1e293b,
        emptyStroke: 0x334155,
        overlayDim: 0x020617,
        overlayPlateOver: 0x7f1d1d,
        overlayPlateWin: 0x0e7490,
        overlayStrokeOver: 0xf87171,
        overlayStrokeWin: 0x22d3ee,
        overlayTitle: '#f8fafc',
        overlaySub: '#a5f3fc',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        tiles: {
            2: { bg: 0x334155, fg: '#e2e8f0', edge: 0x64748b },
            4: { bg: 0x0e7490, fg: '#ecfeff', edge: 0x22d3ee },
            8: { bg: 0x1d4ed8, fg: '#dbeafe', edge: 0x60a5fa },
            16: { bg: 0x6d28d9, fg: '#ede9fe', edge: 0xa78bfa },
            32: { bg: 0xa21caf, fg: '#fce7f3', edge: 0xe879f9 },
            64: { bg: 0xbe185d, fg: '#ffe4e6', edge: 0xfb7185 },
            128: { bg: 0x047857, fg: '#d1fae5', edge: 0x34d399 },
            256: { bg: 0xca8a04, fg: '#fef9c3', edge: 0xfacc15 },
            512: { bg: 0xc2410c, fg: '#ffedd5', edge: 0xfb923c },
            1024: { bg: 0xdc2626, fg: '#fee2e2', edge: 0xf87171 },
            2048: { bg: 0xf59e0b, fg: '#422006', edge: 0xfde68a },
            4096: { bg: 0xec4899, fg: '#fdf2f8', edge: 0xf9a8d4 },
            8192: { bg: 0x06b6d4, fg: '#083344', edge: 0x67e8f9 },
        },
        tileFallback: { bg: 0xf8fafc, fg: '#0f172a', edge: 0xcbd5e1 },
    },
    colorful: {
        id: 'colorful',
        canvas: '#fff1e6',
        boardBg: 0xffe0c2,
        boardStroke: 0xfb923c,
        emptyCell: 0xfff7ed,
        emptyStroke: 0xfed7aa,
        overlayDim: 0x431407,
        overlayPlateOver: 0xb91c1c,
        overlayPlateWin: 0xea580c,
        overlayStrokeOver: 0xfca5a5,
        overlayStrokeWin: 0xfde68a,
        overlayTitle: '#fffbeb',
        overlaySub: '#ffedd5',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        tiles: {
            // Candy / Block Blast: saturados + borde más claro
            2: { bg: 0x7dd3fc, fg: '#0c4a6e', edge: 0xbae6fd },
            4: { bg: 0x86efac, fg: '#14532d', edge: 0xbbf7d0 },
            8: { bg: 0xfdba74, fg: '#7c2d12', edge: 0xfed7aa },
            16: { bg: 0xfca5a5, fg: '#7f1d1d', edge: 0xfecaca },
            32: { bg: 0xc4b5fd, fg: '#4c1d95', edge: 0xddd6fe },
            64: { bg: 0xf9a8d4, fg: '#9d174d', edge: 0xfbcfe8 },
            128: { bg: 0x5eead4, fg: '#115e59', edge: 0x99f6e4 },
            256: { bg: 0xfde047, fg: '#713f12', edge: 0xfef08a },
            512: { bg: 0x60a5fa, fg: '#1e3a8a', edge: 0x93c5fd },
            1024: { bg: 0xa3e635, fg: '#365314', edge: 0xd9f99d },
            2048: { bg: 0xf97316, fg: '#fff7ed', edge: 0xfdba74 },
            4096: { bg: 0xe879f9, fg: '#4a044e', edge: 0xf0abfc },
            8192: { bg: 0x38bdf8, fg: '#0c4a6e', edge: 0x7dd3fc },
        },
        tileFallback: { bg: 0x9a3412, fg: '#fff7ed', edge: 0xc2410c },
    },
};

/**
 * @param {string} id
 * @returns {ThemeDef}
 */
export function resolveTheme(id) {
    return THEMES[id === 'colorful' ? 'colorful' : 'dark'];
}

/**
 * @param {ThemeDef} theme
 * @param {number} value
 * @returns {TileStyle}
 */
export function tileStyleFor(theme, value) {
    return theme.tiles[value] || theme.tileFallback;
}
