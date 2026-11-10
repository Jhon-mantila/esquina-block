/**
 * Formas de piezas (coordenadas relativas [col, row] desde (0,0)).
 * Estilo Block Blast: líneas, cuadrados, L, T, etc.
 * dealTray con tablero usa sesgo suave hacia limpiezas múltiples.
 */

import {
    GRID_SIZE,
    canPlace,
    canPlaceAnywhere,
    clearLines,
    findFullLines,
    placePiece,
} from './board';

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

const DEAL_ATTEMPTS = 42;
const FILLER_CHANCE = 0.48;
const PURE_RANDOM_CHANCE = 0.16;

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
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function cloneGrid(grid) {
    return grid.map((row) => row.slice());
}

/**
 * @param {number} [maxColor=7]
 * @returns {number}
 */
function randomColor(maxColor = 7) {
    return 1 + Math.floor(Math.random() * Math.max(1, maxColor));
}

/**
 * @param {string} shapeId
 * @param {[number, number][]} cells
 * @param {number} maxColor
 * @returns {PieceDef}
 */
function makePiece(shapeId, cells, maxColor) {
    return {
        id: `${shapeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        cells,
        colorIndex: randomColor(maxColor),
    };
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
    return makePiece(shape.id, normalized, maxColor);
}

/**
 * @param {PieceDef} piece
 * @returns {PieceDef}
 */
function clonePiece(piece) {
    return {
        id: `${piece.id.split('-')[0]}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        cells: piece.cells.map(([x, y]) => /** @type {[number, number]} */ ([x, y])),
        colorIndex: piece.colorIndex,
    };
}

/**
 * @param {[number, number][]} cells absolute [col, row]
 */
function isConnected(cells) {
    if (cells.length <= 1) return true;
    const key = (c, r) => `${c},${r}`;
    const set = new Set(cells.map(([c, r]) => key(c, r)));
    const start = cells[0];
    const seen = new Set([key(start[0], start[1])]);
    const queue = [start];
    while (queue.length) {
        const [c, r] = queue.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc;
            const nr = r + dr;
            const k = key(nc, nr);
            if (!set.has(k) || seen.has(k)) continue;
            seen.add(k);
            queue.push([nc, nr]);
        }
    }
    return seen.size === cells.length;
}

/**
 * Piezas que rellenan huecos de filas/columnas casi llenas (1–3 vacíos conectados).
 * @param {number[][]} grid
 * @param {number} maxColor
 * @returns {PieceDef[]}
 */
function gapFillerPieces(grid, maxColor) {
    /** @type {PieceDef[]} */
    const out = [];
    const pushFrom = (empties, tag) => {
        if (empties.length < 1 || empties.length > 3) return;
        if (!isConnected(empties)) return;
        const { cells } = normalizeCells(empties);
        const piece = makePiece(`gap-${tag}`, cells, maxColor);
        if (canPlaceAnywhere(grid, piece)) out.push(piece);
    };

    for (let r = 0; r < GRID_SIZE; r += 1) {
        /** @type {[number, number][]} */
        const empties = [];
        for (let c = 0; c < GRID_SIZE; c += 1) {
            if (grid[r][c] === 0) empties.push([c, r]);
        }
        pushFrom(empties, `row${r}`);
    }

    for (let c = 0; c < GRID_SIZE; c += 1) {
        /** @type {[number, number][]} */
        const empties = [];
        for (let r = 0; r < GRID_SIZE; r += 1) {
            if (grid[r][c] === 0) empties.push([c, r]);
        }
        pushFrom(empties, `col${c}`);
    }

    return out;
}

/**
 * Mejor número de líneas que puede limpiar una pieza en una sola colocación.
 * @param {number[][]} grid
 * @param {PieceDef} piece
 * @returns {{ best: number, placeable: boolean }}
 */
function bestClearForPiece(grid, piece) {
    let best = 0;
    let placeable = false;

    for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
            if (!canPlace(grid, piece, col, row)) continue;
            placeable = true;
            const next = cloneGrid(grid);
            placePiece(next, piece, col, row);
            const lines = findFullLines(next);
            const n = lines.rows.length + lines.cols.length;
            if (n > best) best = n;
            if (best >= 4) return { best, placeable };
        }
    }

    return { best, placeable };
}

/**
 * Simulación golosa: coloca cada pieza donde más limpia (si empata, cualquier hueco).
 * @param {number[][]} grid
 * @param {PieceDef[]} tray
 */
function chainClearScore(grid, tray) {
    const ranked = tray
        .map((piece, index) => ({ piece, index, ...bestClearForPiece(grid, piece) }))
        .sort((a, b) => b.best - a.best || a.index - b.index);

    let board = cloneGrid(grid);
    let totalLines = 0;
    let multiHits = 0;

    for (const { piece } of ranked) {
        let bestN = -1;
        /** @type {{ col: number, row: number } | null} */
        let bestPos = null;

        for (let row = 0; row < GRID_SIZE; row += 1) {
            for (let col = 0; col < GRID_SIZE; col += 1) {
                if (!canPlace(board, piece, col, row)) continue;
                const next = cloneGrid(board);
                placePiece(next, piece, col, row);
                const lines = findFullLines(next);
                const n = lines.rows.length + lines.cols.length;
                if (n > bestN) {
                    bestN = n;
                    bestPos = { col, row };
                } else if (bestPos == null) {
                    bestN = n;
                    bestPos = { col, row };
                }
            }
        }

        if (!bestPos) continue;
        placePiece(board, piece, bestPos.col, bestPos.row);
        const lines = findFullLines(board);
        const n = lines.rows.length + lines.cols.length;
        if (n > 0) {
            clearLines(board, lines);
            totalLines += n;
            if (n >= 2) multiHits += 1;
        }
    }

    return { totalLines, multiHits };
}

/**
 * @param {number[][]} grid
 * @param {PieceDef[]} tray
 */
function scoreTray(grid, tray) {
    let score = 0;
    let placeableCount = 0;
    let maxClear = 0;

    for (const piece of tray) {
        const { best, placeable } = bestClearForPiece(grid, piece);
        if (placeable) placeableCount += 1;
        maxClear = Math.max(maxClear, best);
        score += best * 12;
        if (best >= 2) score += 40;
        if (best >= 3) score += 65;
        if (best >= 4) score += 85;
    }

    if (placeableCount === 0) return -1000;
    if (placeableCount < tray.length) score -= (tray.length - placeableCount) * 28;

    const chain = chainClearScore(grid, tray);
    score += chain.totalLines * 10;
    score += chain.multiHits * 55;
    if (maxClear >= 2) score += 20;

    return score;
}

/**
 * @param {PieceDef[]} tray
 */
function shuffleInPlace(tray) {
    for (let i = tray.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = tray[i];
        tray[i] = tray[j];
        tray[j] = tmp;
    }
    return tray;
}

/**
 * @param {number[][]} grid
 */
function filledCount(grid) {
    let n = 0;
    for (let r = 0; r < GRID_SIZE; r += 1) {
        for (let c = 0; c < GRID_SIZE; c += 1) {
            if (grid[r][c] !== 0) n += 1;
        }
    }
    return n;
}

/**
 * Genera las 3 piezas de la bandeja.
 * Si hay `grid`, sesga hacia bandejas con más potencial de dobles/triples.
 *
 * @param {number} [count=3]
 * @param {number} [maxColor=7]
 * @param {number[][] | null} [grid=null]
 * @returns {(PieceDef | null)[]}
 */
export function dealTray(count = 3, maxColor = 7, grid = null) {
    const randomTray = () => Array.from({ length: count }, () => randomPiece(maxColor));

    if (!grid) return randomTray();

    // Tablero casi vacío: poco que sesgar; más azar natural.
    if (filledCount(grid) < 10) return randomTray();

    const fillers = gapFillerPieces(grid, maxColor);
    /** @type {PieceDef[] | null} */
    let bestTray = null;
    let bestScore = -Infinity;

    for (let i = 0; i < DEAL_ATTEMPTS; i += 1) {
        /** @type {PieceDef[]} */
        const tray = [];
        if (fillers.length && Math.random() < FILLER_CHANCE) {
            tray.push(clonePiece(fillers[Math.floor(Math.random() * fillers.length)]));
        }
        while (tray.length < count) {
            tray.push(randomPiece(maxColor));
        }
        shuffleInPlace(tray);

        const s = scoreTray(grid, tray);
        if (s > bestScore) {
            bestScore = s;
            bestTray = tray;
        }
    }

    // Un poco de azar para que no se sienta "ayudado" siempre.
    if (Math.random() < PURE_RANDOM_CHANCE) {
        for (let i = 0; i < 8; i += 1) {
            const tray = randomTray();
            if (tray.some((p) => canPlaceAnywhere(grid, p))) return tray;
        }
    }

    return bestTray || randomTray();
}

/**
 * Bounding box de una pieza.
 * @param {PieceDef} piece
 */
export function pieceBounds(piece) {
    return normalizeCells(piece.cells);
}
