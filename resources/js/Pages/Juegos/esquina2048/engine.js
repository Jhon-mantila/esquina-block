/**
 * Motor puro del 2048 (sin Phaser).
 * Grid: number[][] — 0 = vacío.
 */

export const MODE_SIZE = {
    classic: 4,
    large: 5,
    expert: 6,
};

export const DIRS = {
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
};

/**
 * @param {number} size
 * @returns {number[][]}
 */
export function createEmptyGrid(size) {
    return Array.from({ length: size }, () => Array(size).fill(0));
}

/**
 * @param {number[][]} grid
 * @returns {{ r: number, c: number }[]}
 */
export function emptyCells(grid) {
    const out = [];
    for (let r = 0; r < grid.length; r += 1) {
        for (let c = 0; c < grid[r].length; c += 1) {
            if (grid[r][c] === 0) out.push({ r, c });
        }
    }
    return out;
}

/**
 * @param {number[][]} grid
 * @returns {number[][]}
 */
export function cloneGrid(grid) {
    return grid.map((row) => row.slice());
}

/**
 * Coloca un 2 (90%) o 4 (10%) en una celda vacía al azar.
 * @param {number[][]} grid
 * @returns {{ grid: number[][], spawned: { r: number, c: number, value: number } | null }}
 */
export function spawnRandom(grid) {
    const cells = emptyCells(grid);
    if (!cells.length) return { grid, spawned: null };

    const next = cloneGrid(grid);
    const pick = cells[Math.floor(Math.random() * cells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    next[pick.r][pick.c] = value;
    return { grid: next, spawned: { r: pick.r, c: pick.c, value } };
}

/**
 * Desliza y fusiona una línea 1D hacia el índice 0, con trayectorias para animar.
 * @param {number[]} line
 * @returns {{
 *   line: number[],
 *   score: number,
 *   moved: boolean,
 *   transitions: { from: number, to: number, value: number, result: number, merged: boolean }[]
 * }}
 */
export function slideLine(line) {
    /** @type {{ index: number, value: number }[]} */
    const tiles = [];
    for (let i = 0; i < line.length; i += 1) {
        if (line[i] !== 0) tiles.push({ index: i, value: line[i] });
    }

    const out = Array(line.length).fill(0);
    /** @type {{ from: number, to: number, value: number, result: number, merged: boolean }[]} */
    const transitions = [];
    let score = 0;
    let write = 0;
    let i = 0;

    while (i < tiles.length) {
        if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
            const result = tiles[i].value * 2;
            transitions.push({
                from: tiles[i].index,
                to: write,
                value: tiles[i].value,
                result,
                merged: true,
            });
            transitions.push({
                from: tiles[i + 1].index,
                to: write,
                value: tiles[i + 1].value,
                result,
                merged: true,
            });
            out[write] = result;
            score += result;
            write += 1;
            i += 2;
        } else {
            transitions.push({
                from: tiles[i].index,
                to: write,
                value: tiles[i].value,
                result: tiles[i].value,
                merged: false,
            });
            out[write] = tiles[i].value;
            write += 1;
            i += 1;
        }
    }

    const moved = out.some((v, idx) => v !== line[idx]);
    return { line: out, score, moved, transitions };
}

/**
 * @param {number[][]} grid
 * @param {'left'|'right'|'up'|'down'} dir
 * @returns {{
 *   grid: number[][],
 *   scoreGained: number,
 *   moved: boolean,
 *   moves: { from: {r:number,c:number}, to: {r:number,c:number}, value: number, result: number, merged: boolean }[]
 * }}
 */
export function moveGrid(grid, dir) {
    const size = grid.length;
    let scoreGained = 0;
    let moved = false;
    const next = createEmptyGrid(size);
    /** @type {{ from: {r:number,c:number}, to: {r:number,c:number}, value: number, result: number, merged: boolean }[]} */
    const moves = [];

    const mapIndex = (coords, index, reversed) => {
        const idx = reversed ? size - 1 - index : index;
        return coords[idx];
    };

    const processStrip = (coords, reversed) => {
        let line = coords.map(({ r, c }) => grid[r][c]);
        if (reversed) line = line.slice().reverse();

        const result = slideLine(line);
        let out = result.line;
        if (reversed) out = out.slice().reverse();

        coords.forEach(({ r, c }, i) => {
            next[r][c] = out[i];
        });

        scoreGained += result.score;
        if (result.moved) moved = true;

        result.transitions.forEach((t) => {
            moves.push({
                from: mapIndex(coords, t.from, reversed),
                to: mapIndex(coords, t.to, reversed),
                value: t.value,
                result: t.result,
                merged: t.merged,
            });
        });
    };

    if (dir === 'left' || dir === 'right') {
        for (let r = 0; r < size; r += 1) {
            const coords = Array.from({ length: size }, (_, c) => ({ r, c }));
            processStrip(coords, dir === 'right');
        }
    } else {
        for (let c = 0; c < size; c += 1) {
            const coords = Array.from({ length: size }, (_, r) => ({ r, c }));
            processStrip(coords, dir === 'down');
        }
    }

    if (!moved) {
        for (let r = 0; r < size; r += 1) {
            for (let c = 0; c < size; c += 1) {
                if (next[r][c] !== grid[r][c]) {
                    moved = true;
                    break;
                }
            }
            if (moved) break;
        }
    }

    return { grid: next, scoreGained, moved, moves };
}

/**
 * @param {number[][]} grid
 * @returns {boolean}
 */
export function hasMoves(grid) {
    if (emptyCells(grid).length > 0) return true;
    const size = grid.length;
    for (let r = 0; r < size; r += 1) {
        for (let c = 0; c < size; c += 1) {
            const v = grid[r][c];
            if (c + 1 < size && grid[r][c + 1] === v) return true;
            if (r + 1 < size && grid[r + 1][c] === v) return true;
        }
    }
    return false;
}

/**
 * @param {number[][]} grid
 * @param {number} [target=2048]
 * @returns {boolean}
 */
export function hasWon(grid, target = 2048) {
    for (const row of grid) {
        if (row.some((v) => v >= target)) return true;
    }
    return false;
}

/**
 * @param {{ mode?: string, grid?: number[][], score?: number, won?: boolean, over?: boolean, winDismissed?: boolean } | null} snapshot
 * @param {string} mode
 * @returns {boolean}
 */
function applySnapshot(match, snapshot, mode) {
    const size = MODE_SIZE[mode] ?? 4;
    if (!snapshot || !Array.isArray(snapshot.grid) || snapshot.grid.length !== size) {
        return false;
    }
    for (let r = 0; r < size; r += 1) {
        if (!Array.isArray(snapshot.grid[r]) || snapshot.grid[r].length !== size) {
            return false;
        }
    }

    match.mode = mode;
    match.size = size;
    match.grid = snapshot.grid.map((row) => row.slice());
    match.score = Number.isFinite(snapshot.score) && snapshot.score >= 0 ? snapshot.score : 0;
    match.won = snapshot.won === true || hasWon(match.grid);
    match.over = snapshot.over === true || !hasMoves(match.grid);
    match.winDismissed = snapshot.winDismissed === true;
    return true;
}

/**
 * Estado mutable del partido (usado por BoardScene).
 * @param {string} [mode='classic']
 * @param {{ mode?: string, grid?: number[][], score?: number, won?: boolean, over?: boolean, winDismissed?: boolean } | null} [snapshot]
 */
export function createMatch(mode = 'classic', snapshot = null) {
    const size = MODE_SIZE[mode] ?? 4;
    let grid = createEmptyGrid(size);
    ({ grid } = spawnRandom(grid));
    ({ grid } = spawnRandom(grid));

    const match = {
        size,
        mode,
        grid,
        score: 0,
        won: false,
        over: false,
        /** true = el jugador ya cerró el aviso de 2048 y sigue jugando */
        winDismissed: false,

        /**
         * @param {'left'|'right'|'up'|'down'} dir
         * @returns {{
         *   moved: boolean,
         *   scoreGained: number,
         *   spawned: { r: number, c: number, value: number } | null,
         *   moves: { from: {r:number,c:number}, to: {r:number,c:number}, value: number, result: number, merged: boolean }[]
         * }}
         */
        play(dir) {
            if (this.over) {
                return { moved: false, scoreGained: 0, spawned: null, moves: [] };
            }

            const result = moveGrid(this.grid, dir);
            if (!result.moved) {
                return { moved: false, scoreGained: 0, spawned: null, moves: [] };
            }

            this.grid = result.grid;
            this.score += result.scoreGained;

            const spawn = spawnRandom(this.grid);
            this.grid = spawn.grid;

            if (!this.won && hasWon(this.grid)) {
                this.won = true;
            }
            if (!hasMoves(this.grid)) {
                this.over = true;
            }

            return {
                moved: true,
                scoreGained: result.scoreGained,
                spawned: spawn.spawned,
                moves: result.moves,
            };
        },

        /**
         * @param {string} [nextMode]
         * @param {{ mode?: string, grid?: number[][], score?: number, won?: boolean, over?: boolean, winDismissed?: boolean } | null} [nextSnapshot]
         */
        reset(nextMode = this.mode, nextSnapshot = null) {
            const modeId = nextMode || this.mode;
            if (nextSnapshot && applySnapshot(this, nextSnapshot, modeId)) {
                return;
            }
            this.mode = modeId;
            this.size = MODE_SIZE[modeId] ?? 4;
            this.grid = createEmptyGrid(this.size);
            ({ grid: this.grid } = spawnRandom(this.grid));
            ({ grid: this.grid } = spawnRandom(this.grid));
            this.score = 0;
            this.won = false;
            this.over = false;
            this.winDismissed = false;
        },

        dismissWin() {
            if (!this.won || this.over) return false;
            this.winDismissed = true;
            return true;
        },

        toJSON() {
            return {
                mode: this.mode,
                grid: this.grid,
                score: this.score,
                won: this.won,
                over: this.over,
                winDismissed: this.winDismissed,
            };
        },
    };

    if (snapshot) {
        applySnapshot(match, snapshot, mode);
    }

    return match;
}
