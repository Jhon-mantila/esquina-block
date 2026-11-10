/** Tamaño fijo del tablero Esquina Blocks. */
export const GRID_SIZE = 8;

/**
 * Crea una matriz GRID_SIZE × GRID_SIZE vacía (0 = celda libre).
 * @returns {number[][]}
 */
export function createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/**
 * @param {{ boardX: number, boardY: number, boardSize: number }} board
 * @param {number} [innerPadRatio=0.06]
 */
export function computeCellMetrics(board, innerPadRatio = 0.06) {
    const innerPad = Math.max(6, board.boardSize * innerPadRatio);
    const gap = Math.max(2, board.boardSize * 0.012);
    const usable = board.boardSize - innerPad * 2;
    const cell = (usable - gap * (GRID_SIZE - 1)) / GRID_SIZE;
    const radius = Math.max(4, cell * 0.22);

    return {
        innerPad,
        gap,
        cell,
        radius,
        originX: board.boardX + innerPad,
        originY: board.boardY + innerPad,
    };
}

/**
 * @param {ReturnType<typeof computeCellMetrics>} metrics
 * @param {number} col
 * @param {number} row
 */
export function cellCenter(metrics, col, row) {
    return {
        x: metrics.originX + col * (metrics.cell + metrics.gap) + metrics.cell / 2,
        y: metrics.originY + row * (metrics.cell + metrics.gap) + metrics.cell / 2,
    };
}

/**
 * @param {ReturnType<typeof computeCellMetrics>} metrics
 * @param {number} col
 * @param {number} row
 */
export function cellTopLeft(metrics, col, row) {
    return {
        x: metrics.originX + col * (metrics.cell + metrics.gap),
        y: metrics.originY + row * (metrics.cell + metrics.gap),
    };
}

/**
 * Convierte coordenada de pantalla a celda (puede quedar fuera de rango).
 * @param {ReturnType<typeof computeCellMetrics>} metrics
 * @param {number} x
 * @param {number} y
 */
export function screenToCell(metrics, x, y) {
    const stride = metrics.cell + metrics.gap;
    const col = Math.floor((x - metrics.originX) / stride);
    const row = Math.floor((y - metrics.originY) / stride);
    return { col, row };
}

/**
 * ¿Cabe la pieza con ancla (anchorCol, anchorRow) = celda del primer offset (0,0) normalizado?
 * @param {number[][]} grid
 * @param {{ cells: [number, number][] }} piece
 * @param {number} anchorCol
 * @param {number} anchorRow
 */
export function canPlace(grid, piece, anchorCol, anchorRow) {
    for (const [dx, dy] of piece.cells) {
        const c = anchorCol + dx;
        const r = anchorRow + dy;
        if (c < 0 || r < 0 || c >= GRID_SIZE || r >= GRID_SIZE) return false;
        if (grid[r][c] !== 0) return false;
    }
    return true;
}

/**
 * @param {number[][]} grid
 * @param {{ cells: [number, number][], colorIndex: number }} piece
 * @param {number} anchorCol
 * @param {number} anchorRow
 */
export function placePiece(grid, piece, anchorCol, anchorRow) {
    for (const [dx, dy] of piece.cells) {
        grid[anchorRow + dy][anchorCol + dx] = piece.colorIndex;
    }
}

/**
 * ¿Existe alguna posición válida para la pieza?
 * @param {number[][]} grid
 * @param {{ cells: [number, number][] }} piece
 */
export function canPlaceAnywhere(grid, piece) {
    for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
            if (canPlace(grid, piece, col, row)) return true;
        }
    }
    return false;
}

/**
 * Detecta filas y columnas completas.
 * @param {number[][]} grid
 * @returns {{ rows: number[], cols: number[] }}
 */
export function findFullLines(grid) {
    const rows = [];
    const cols = [];

    for (let r = 0; r < GRID_SIZE; r += 1) {
        if (grid[r].every((v) => v !== 0)) rows.push(r);
    }
    for (let c = 0; c < GRID_SIZE; c += 1) {
        let full = true;
        for (let r = 0; r < GRID_SIZE; r += 1) {
            if (grid[r][c] === 0) {
                full = false;
                break;
            }
        }
        if (full) cols.push(c);
    }
    return { rows, cols };
}

/**
 * Vacía filas/columnas completas. Devuelve cuántas líneas se limpiaron.
 * @param {number[][]} grid
 * @param {{ rows: number[], cols: number[] }} lines
 */
export function clearLines(grid, lines) {
    const mark = createEmptyGrid();
    for (const r of lines.rows) {
        for (let c = 0; c < GRID_SIZE; c += 1) mark[r][c] = 1;
    }
    for (const c of lines.cols) {
        for (let r = 0; r < GRID_SIZE; r += 1) mark[r][c] = 1;
    }
    let clearedCells = 0;
    for (let r = 0; r < GRID_SIZE; r += 1) {
        for (let c = 0; c < GRID_SIZE; c += 1) {
            if (mark[r][c]) {
                grid[r][c] = 0;
                clearedCells += 1;
            }
        }
    }
    return {
        lineCount: lines.rows.length + lines.cols.length,
        clearedCells,
        mark,
    };
}
