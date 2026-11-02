/**
 * Puente Vue ↔ Phaser (sin importar Phaser aquí, para code-split).
 *
 * Vue → Phaser: RESTART, SET_MODE, SET_THEME, DISMISS_WIN
 * Phaser → Vue: READY, SCORE, BEST, WIN, GAME_OVER
 */
function createEmitter() {
    /** @type {Map<string, Set<Function>>} */
    const listeners = new Map();

    return {
        on(event, fn, context) {
            if (!listeners.has(event)) listeners.set(event, new Set());
            const bound = context ? fn.bind(context) : fn;
            bound._orig = fn;
            bound._ctx = context;
            listeners.get(event).add(bound);
            return this;
        },
        off(event, fn, context) {
            const set = listeners.get(event);
            if (!set) return this;
            for (const bound of set) {
                if (bound._orig === fn && bound._ctx === context) {
                    set.delete(bound);
                    break;
                }
            }
            return this;
        },
        emit(event, ...args) {
            const set = listeners.get(event);
            if (!set) return this;
            for (const fn of [...set]) fn(...args);
            return this;
        },
        /** Quita todos los listeners de un evento (o de todos si no se pasa). */
        clear(event) {
            if (event) listeners.delete(event);
            else listeners.clear();
            return this;
        },
    };
}

export const gameEvents = createEmitter();

export const EVENTS = {
    READY: 'ready',
    SCORE: 'score',
    BEST: 'best',
    GAME_OVER: 'gameover',
    WIN: 'win',
    RESTART: 'restart',
    SET_MODE: 'setMode',
    SET_THEME: 'setTheme',
    DISMISS_WIN: 'dismissWin',
};

/** Claves de preferencias / récord / partida en localStorage */
export const STORAGE = {
    mode: 'esquina2048.mode',
    theme: 'esquina2048.theme',
    bestPrefix: 'esquina2048.best.',
    draftPrefix: 'esquina2048.draft.',
    muted: 'esquina2048.muted',
};
