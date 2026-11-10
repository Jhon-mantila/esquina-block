/**
 * Formas de piezas (coordenadas relativas [col, row] desde (0,0)).
 * Estilo Block Blast: líneas, cuadrados, L, T, etc.
 */

/** @typedef {{ id: string, cells: [number, number][], colorIndex: number }} PieceDef */

/** Catálogo base (sin color; el color se asigna al generar). */
const SHAPE_CATALOG = [
    // Monomino / domino / tromino
    { id: 'o1', cells: [[0, 0]] },
    { id: 'i2', cells: [[0, 0], [1, 0]] },
    { id: 'i3', cells: [[0, 0], [1, 0], [2, 0]] },
    { id: 'v3', cells: [[0, 0], [0, 1], [1, 1]] },
    // Tetrominos
    { id: 'i4', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { id: 'o4', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { id: 't4', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    { id: 'l4', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { id: 'j4', cells: [[1, 0], [1, 1], [1, 2], [0, 2]] },
    { id: 's4', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    { id: 'z4', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    // Pentominos / variantes frecuentes en Block Blast
    { id: 'i5', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { id: 'p5', cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] },
    { id: 'u5', cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
    { id: 'plus', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
    { id: 'bigL', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
    { id: 'corner', cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]] },
    { id: 'tall2', cells: [[0, 0], [0, 1]] },
    { id: 'tall3', cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'square9', cells: [
        [0, 0], [1, 0], [2, 0],
        [0, 1], [1, 1], [2, 1],
        [0, 2], [1, 2], [2, 2],
    ] },
];

/**
 * @param {[number, number][]} cells
 * @returns {{ w: number, h: number, cells: [number, number][] }}
 */
export function normalizeCells(cells) {
    let minX = Infinity;
    let minY = Infinity;
    for (const [x, y] of cells) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
    }
    const shifted = cells.map(([x, y]) => /** @type {[number, number]} */ ([x - minX, y - minY]));
    let maxX = 0;
    let maxY = 0;
    for (const [x, y] of shifted) {
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { w: maxX + 1, h: maxY + 1, cells: shifted };
}

/**
 * Rota 90° sentido horario.
 * @param {[number, number][]} cells
 */
export function rotateCells(cells) {
    const rotated = cells.map(([x, y]) => /** @type {[number, number]} */ ([y, -x]));
    return normalizeCells(rotated).cells;
}

/**
 * @param {number} [maxColor=7]
 * @returns {PieceDef}
 */
export function randomPiece(maxColor = 7) {
    const shape = SHAPE_CATALOG[Math.floor(Math.random() * SHAPE_CATALOG.length)];
    let cells = shape.cells.map(([x, y]) => /** @type {[number, number]} */ ([x, y]));
    const turns = Math.floor(Math.random() * 4);
    for (let i = 0; i < turns; i += 1) {
        cells = rotateCells(cells);
    }
    const { cells: normalized } = normalizeCells(cells);
    return {
        id: `${shape.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        cells: normalized,
        colorIndex: 1 + Math.floor(Math.random() * Math.max(1, maxColor)),
    };
}

/**
 * Genera las 3 piezas de la bandeja.
 * @param {number} [count=3]
 * @param {number} [maxColor=7]
 * @returns {(PieceDef | null)[]}
 */
export function dealTray(count = 3, maxColor = 7) {
    return Array.from({ length: count }, () => randomPiece(maxColor));
}

/**
 * Bounding box de una pieza.
 * @param {PieceDef} piece
 */
export function pieceBounds(piece) {
    return normalizeCells(piece.cells);
}
