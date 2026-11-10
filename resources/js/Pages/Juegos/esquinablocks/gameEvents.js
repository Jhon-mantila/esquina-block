/**
 * Puente Vue ↔ Phaser (sin importar Phaser aquí, para code-split).
 *
 * Vue → Phaser: RESTART, SET_THEME
 * Phaser → Vue: READY, SCORE, GAME_OVER
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
    CLEAR: 'clear',
    GAME_OVER: 'gameover',
    RESTART: 'restart',
    SET_THEME: 'setTheme',
};

/** Claves de preferencias / récord / partida en localStorage */
export const STORAGE = {
    theme: 'esquinablocks.theme',
    best: 'esquinablocks.best',
    draft: 'esquinablocks.draft',
    muted: 'esquinablocks.muted',
};
