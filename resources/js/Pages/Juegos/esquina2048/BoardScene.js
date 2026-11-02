import Phaser from 'phaser';
import { createMatch, MODE_SIZE } from './engine';
import { EVENTS, gameEvents } from './gameEvents';
import { clearDraft, loadDraft, saveDraft } from './persist';
import { resolveTheme, tileStyleFor } from './themes';

const KEY_DIR = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
};

const SWIPE_MIN_PX = 28;
const TILE_RADIUS = 12;
const MOVE_MS = 115;
const MERGE_POP_MS = 110;
const SPAWN_MS = 130;

/**
 * Tablero Phaser + motor 2048.
 * Paso 7: tweens de deslizamiento, fusión y spawn (pool reutilizable).
 */
export default class BoardScene extends Phaser.Scene {
    constructor() {
        super('BoardScene');
        this.gridSize = 4;
        this.themeId = 'dark';
        this.theme = resolveTheme('dark');
        this.cellGap = 10;
        this.boardPad = 12;
        this.gridGfx = null;
        this.tilesLayer = null;
        /** @type {ReturnType<BoardScene['createActor']>[]} */
        this.actors = [];
        this.overlay = null;
        this.match = null;
        this.layout = null;
        this.swipeStart = null;
        this.inputLocked = false;
        this.chromeKey = '';
        this.animToken = 0;
        this.hadWon = false;
    }

    init(data = {}) {
        this.gridSize = MODE_SIZE[data.mode] ?? 4;
        this.applyTheme(data.theme);
        this.modeId = data.mode || 'classic';
        this.chromeKey = '';
        this.inputLocked = false;
        this.hadWon = false;
        this.animToken += 1;
    }

    applyTheme(id) {
        this.themeId = id === 'colorful' ? 'colorful' : 'dark';
        this.theme = resolveTheme(this.themeId);
    }

    create() {
        this.cameras.main.setBackgroundColor(this.theme.canvas);
        this.gridGfx = this.add.graphics().setDepth(0);
        this.tilesLayer = this.add.container(0, 0).setDepth(1);
        this.actors = [];
        this.overlay = this.createOverlay();

        const draft = loadDraft(this.modeId);
        this.match = createMatch(this.modeId, draft);
        this.hadWon = !!this.match.won;
        this.redraw(true);
        this.persistMatch();
        this.emitScore(0);
        gameEvents.emit(EVENTS.READY, {
            mode: this.modeId,
            theme: this.themeId,
            score: this.match.score,
            won: this.match.won,
            over: this.match.over,
            winDismissed: !!this.match.winDismissed,
            restored: !!draft,
        });

        this.scale.on('resize', this.onResize, this);
        this.input.keyboard?.on('keydown', this.onKeyDown, this);
        this.input.on('pointerdown', this.onPointerDown, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointerupoutside', this.onPointerUp, this);

        gameEvents.on(EVENTS.RESTART, this.handleRestart, this);
        gameEvents.on(EVENTS.SET_MODE, this.handleSetMode, this);
        gameEvents.on(EVENTS.SET_THEME, this.handleSetTheme, this);
        gameEvents.on(EVENTS.DISMISS_WIN, this.handleDismissWin, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.animToken += 1;
            this.tweens.killAll();
            this.scale.off('resize', this.onResize, this);
            this.input.keyboard?.off('keydown', this.onKeyDown, this);
            this.input.off('pointerdown', this.onPointerDown, this);
            this.input.off('pointerup', this.onPointerUp, this);
            this.input.off('pointerupoutside', this.onPointerUp, this);
            gameEvents.off(EVENTS.RESTART, this.handleRestart, this);
            gameEvents.off(EVENTS.SET_MODE, this.handleSetMode, this);
            gameEvents.off(EVENTS.SET_THEME, this.handleSetTheme, this);
            gameEvents.off(EVENTS.DISMISS_WIN, this.handleDismissWin, this);
        });
    }

    createOverlay() {
        const root = this.add.container(0, 0).setDepth(30).setVisible(false);
        const dim = this.add.graphics();
        const plate = this.add.graphics();
        const title = this.add
            .text(0, 0, '', {
                fontFamily: this.theme.fontFamily,
                fontSize: '36px',
                fontStyle: 'bold',
                color: '#ffffff',
                align: 'center',
            })
            .setOrigin(0.5);
        const subtitle = this.add
            .text(0, 0, '', {
                fontFamily: this.theme.fontFamily,
                fontSize: '16px',
                color: '#e2e8f0',
                align: 'center',
            })
            .setOrigin(0.5);

        root.add([dim, plate, title, subtitle]);
        root.setData('dim', dim);
        root.setData('plate', plate);
        root.setData('title', title);
        root.setData('subtitle', subtitle);
        return root;
    }

    createActor() {
        const gfx = this.add.graphics();
        const text = this.add
            .text(0, 0, '', {
                fontFamily: this.theme.fontFamily,
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
            })
            .setOrigin(0.5);
        const root = this.add.container(0, 0, [gfx, text]).setVisible(false);
        this.tilesLayer.add(root);
        return {
            root,
            gfx,
            text,
            value: 0,
            r: -1,
            c: -1,
            busy: false,
        };
    }

    acquireActor() {
        const free = this.actors.find((a) => !a.root.visible && !a.busy);
        if (free) return free;
        const actor = this.createActor();
        this.actors.push(actor);
        return actor;
    }

    cellXY(r, c) {
        const L = this.layout;
        return {
            x: L.originX + c * (L.cell + L.gap),
            y: L.originY + r * (L.cell + L.gap),
        };
    }

    paintActor(actor, value) {
        const L = this.layout;
        const style = tileStyleFor(this.theme, value);
        const size = L.cell;
        const edgeAlpha = this.themeId === 'colorful' ? 0.7 : 0.8;

        actor.gfx.clear();
        actor.gfx.fillStyle(style.bg, 1);
        actor.gfx.fillRoundedRect(0, 0, size, size, TILE_RADIUS);
        const edge = style.edge ?? style.bg;
        actor.gfx.lineStyle(2, edge, edgeAlpha);
        actor.gfx.strokeRoundedRect(1, 1, size - 2, size - 2, TILE_RADIUS);

        const fontSize = Math.max(14, Math.floor(size * (L.n >= 6 ? 0.3 : 0.38)));
        actor.text.setFontFamily(this.theme.fontFamily);
        actor.text.setFontSize(fontSize);
        actor.text.setColor(style.fg);
        actor.text.setStroke('#000000', this.themeId === 'dark' && value >= 128 ? 3 : 0);
        actor.text.setText(String(value));
        actor.text.setPosition(size / 2, size / 2 + 1);

        actor.value = value;
    }

    placeActor(actor, r, c, value, opts = {}) {
        const { x, y } = this.cellXY(r, c);
        this.paintActor(actor, value);
        actor.r = r;
        actor.c = c;
        actor.busy = false;
        actor.root.setVisible(true);
        actor.root.setAlpha(1);
        actor.root.setScale(opts.scale ?? 1);
        actor.root.setPosition(x, y);
        actor.root.setDepth(opts.depth ?? 1);
    }

    hideActor(actor) {
        this.tweens.killTweensOf(actor.root);
        actor.root.setVisible(false);
        actor.root.setScale(1);
        actor.root.setAlpha(1);
        actor.busy = false;
        actor.r = -1;
        actor.c = -1;
        actor.value = 0;
    }

    onPointerDown(pointer) {
        this.swipeStart = { x: pointer.x, y: pointer.y };
    }

    onPointerUp(pointer) {
        if (!this.swipeStart) return;
        const dx = pointer.x - this.swipeStart.x;
        const dy = pointer.y - this.swipeStart.y;
        this.swipeStart = null;

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (Math.max(absX, absY) < SWIPE_MIN_PX) return;

        if (absX > absY) {
            this.tryMove(dx > 0 ? 'right' : 'left');
        } else {
            this.tryMove(dy > 0 ? 'down' : 'up');
        }
    }

    onKeyDown(event) {
        const dir = KEY_DIR[event.key] || KEY_DIR[event.key?.toLowerCase?.()];
        if (!dir) return;
        event.preventDefault?.();
        this.tryMove(dir);
    }

    tryMove(dir) {
        if (!this.match || this.match.over || this.inputLocked) return;
        const result = this.match.play(dir);
        if (!result.moved) return;

        this.emitScore(result.scoreGained);
        this.persistMatch();
        this.animateMove(result);

        if (this.match.won && !this.hadWon) {
            this.hadWon = true;
            gameEvents.emit(EVENTS.WIN, {
                score: this.match.score,
                mode: this.modeId,
            });
        }
        if (this.match.over) {
            gameEvents.emit(EVENTS.GAME_OVER, {
                score: this.match.score,
                mode: this.modeId,
            });
        }
    }

    persistMatch() {
        if (!this.match) return;
        saveDraft(this.match);
    }

    /**
     * @param {{
     *   moves: { from: {r:number,c:number}, to: {r:number,c:number}, value: number, result: number, merged: boolean }[],
     *   spawned: { r: number, c: number, value: number } | null
     * }} result
     */
    animateMove(result) {
        const token = ++this.animToken;
        this.inputLocked = true;

        /** @type {Map<string, typeof this.actors[0]>} */
        const byCell = new Map();
        this.actors.forEach((a) => {
            if (a.root.visible && a.r >= 0) byCell.set(`${a.r},${a.c}`, a);
        });

        // Agrupar trayectorias por celda destino
        /** @type {Map<string, typeof result.moves>} */
        const byDest = new Map();
        result.moves.forEach((m) => {
            const key = `${m.to.r},${m.to.c}`;
            if (!byDest.has(key)) byDest.set(key, []);
            byDest.get(key).push(m);
        });

        const moving = [];

        byDest.forEach((group) => {
            const merged = group.some((m) => m.merged);

            group.forEach((m, idx) => {
                const fromKey = `${m.from.r},${m.from.c}`;
                let actor = byCell.get(fromKey);
                if (actor) {
                    byCell.delete(fromKey);
                } else {
                    actor = this.acquireActor();
                    this.placeActor(actor, m.from.r, m.from.c, m.value);
                }

                actor.busy = true;
                this.paintActor(actor, m.value);
                actor.root.setDepth(2 + idx);
                moving.push({ actor, move: m, isExtraMerge: merged && idx > 0 });
            });
        });

        // Ocultar actores que ya no participan (por si quedó basura)
        byCell.forEach((actor) => this.hideActor(actor));

        let pending = moving.length;
        if (pending === 0) {
            this.finishMoveAnim(token, result.spawned);
            return;
        }

        moving.forEach(({ actor, move, isExtraMerge }) => {
            const target = this.cellXY(move.to.r, move.to.c);
            this.tweens.add({
                targets: actor.root,
                x: target.x,
                y: target.y,
                duration: MOVE_MS,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    if (token !== this.animToken) return;

                    if (isExtraMerge) {
                        this.hideActor(actor);
                    } else {
                        actor.r = move.to.r;
                        actor.c = move.to.c;
                        actor.busy = false;
                        actor.root.setDepth(1);
                        this.paintActor(actor, move.result);

                        if (move.merged) {
                            actor.root.setScale(0.85);
                            this.tweens.add({
                                targets: actor.root,
                                scaleX: 1,
                                scaleY: 1,
                                duration: MERGE_POP_MS,
                                ease: 'Back.easeOut',
                            });
                        }
                    }

                    pending -= 1;
                    if (pending <= 0) {
                        this.finishMoveAnim(token, result.spawned);
                    }
                },
            });
        });
    }

    finishMoveAnim(token, spawned) {
        if (token !== this.animToken) return;

        // Sincroniza con el grid final (por si merge/spawn quedaron desfasados)
        this.syncActorsFromGrid(spawned);

        if (spawned) {
            const key = `${spawned.r},${spawned.c}`;
            const actor =
                this.actors.find((a) => a.root.visible && a.r === spawned.r && a.c === spawned.c) ||
                this.acquireActor();
            this.placeActor(actor, spawned.r, spawned.c, spawned.value, { scale: 0 });
            this.tweens.add({
                targets: actor.root,
                scaleX: 1,
                scaleY: 1,
                duration: SPAWN_MS,
                ease: 'Back.easeOut',
                onComplete: () => {
                    if (token !== this.animToken) return;
                    this.inputLocked = false;
                    this.drawStatus();
                },
            });
            // key unused except clarity
            void key;
        } else {
            this.inputLocked = false;
            this.drawStatus();
        }
    }

    /**
     * Coloca actores según this.match.grid. Si `spawned` se pasa, esa celda
     * se deja para la animación de aparición.
     */
    syncActorsFromGrid(spawned = null) {
        const needed = [];
        for (let r = 0; r < this.match.grid.length; r += 1) {
            for (let c = 0; c < this.match.grid[r].length; c += 1) {
                const value = this.match.grid[r][c];
                if (!value) continue;
                if (spawned && spawned.r === r && spawned.c === c) continue;
                needed.push({ r, c, value });
            }
        }

        // Reutilizar actores visibles cuando coinciden celda+valor
        /** @type {Set<typeof this.actors[0]>} */
        const used = new Set();
        needed.forEach((cell) => {
            let actor = this.actors.find(
                (a) =>
                    a.root.visible &&
                    !used.has(a) &&
                    a.r === cell.r &&
                    a.c === cell.c,
            );
            if (!actor) {
                actor = this.actors.find((a) => !a.root.visible && !used.has(a));
            }
            if (!actor) {
                actor = this.acquireActor();
            }
            used.add(actor);
            this.placeActor(actor, cell.r, cell.c, cell.value);
        });

        this.actors.forEach((a) => {
            if (!used.has(a) && a.root.visible) {
                // Mantener visible el slot del spawn (se anima aparte)
                if (spawned && a.r === spawned.r && a.c === spawned.c) return;
                this.hideActor(a);
            }
        });
    }

    /**
     * @param {number} [gained=0]
     */
    emitScore(gained = 0) {
        if (!this.match) return;
        gameEvents.emit(EVENTS.SCORE, {
            score: this.match.score,
            gained,
            won: this.match.won,
            over: this.match.over,
            winDismissed: !!this.match.winDismissed,
            mode: this.modeId,
        });
    }

    stopAnims() {
        this.animToken += 1;
        this.tweens.killAll();
        this.inputLocked = false;
    }

    handleDismissWin() {
        if (!this.match?.dismissWin()) return;
        this.hideOverlay();
        this.persistMatch();
        this.emitScore(0);
        this.drawStatus();
    }

    handleRestart() {
        this.stopAnims();
        this.hadWon = false;
        clearDraft(this.modeId);
        this.match?.reset(this.modeId);
        this.hideOverlay();
        this.persistMatch();
        this.emitScore(0);
        this.redraw(false);
    }

    handleSetMode(mode) {
        this.stopAnims();
        if (this.match) {
            saveDraft(this.match);
        }
        this.modeId = mode;
        this.gridSize = MODE_SIZE[mode] ?? 4;
        this.game.registry.set('mode', mode);
        const draft = loadDraft(mode);
        this.match?.reset(mode, draft);
        this.hadWon = !!this.match?.won;
        this.hideOverlay();
        this.persistMatch();
        this.emitScore(0);
        this.redraw(true);
        gameEvents.emit(EVENTS.READY, {
            mode: this.modeId,
            theme: this.themeId,
            score: this.match?.score ?? 0,
            won: !!this.match?.won,
            over: !!this.match?.over,
            winDismissed: !!this.match?.winDismissed,
            restored: !!draft,
        });
    }

    handleSetTheme(theme) {
        this.stopAnims();
        this.applyTheme(theme);
        this.cameras.main.setBackgroundColor(this.theme.canvas);
        this.game.registry.set('theme', this.themeId);
        this.redraw(true);
        gameEvents.emit(EVENTS.READY, {
            mode: this.modeId,
            theme: this.themeId,
            score: this.match?.score ?? 0,
        });
    }

    onResize() {
        this.stopAnims();
        this.redraw(true);
    }

    computeLayout() {
        const { width, height } = this.scale;
        const side = Math.min(width, height);
        const pad = this.boardPad;
        const gap = this.cellGap;
        const n = this.gridSize;
        const cell = (side - pad * 2 - gap * (n - 1)) / n;
        const boardX = (width - side) / 2;
        const boardY = (height - side) / 2;
        const originX = boardX + pad;
        const originY = boardY + pad;
        return { width, height, side, pad, gap, n, cell, boardX, boardY, originX, originY };
    }

    /**
     * @param {boolean} forceChrome
     */
    redraw(forceChrome = false) {
        this.layout = this.computeLayout();
        if (forceChrome || this.needsChromeRedraw()) {
            this.drawBoardChrome();
        }
        this.syncActorsFromGrid(null);
        this.drawStatus();
    }

    needsChromeRedraw() {
        const L = this.layout;
        const key = `${this.themeId}|${L.n}|${L.width}|${L.height}|${L.side}|${L.cell}`;
        if (key === this.chromeKey) return false;
        this.chromeKey = key;
        return true;
    }

    drawBoardChrome() {
        const L = this.layout;
        const T = this.theme;
        const g = this.gridGfx;
        g.clear();

        g.fillStyle(T.boardBg, 1);
        g.fillRoundedRect(L.boardX, L.boardY, L.side, L.side, 18);
        g.lineStyle(this.themeId === 'dark' ? 2 : 3, T.boardStroke, this.themeId === 'dark' ? 0.55 : 0.9);
        g.strokeRoundedRect(L.boardX + 1, L.boardY + 1, L.side - 2, L.side - 2, 17);

        g.fillStyle(T.emptyCell, 1);
        for (let r = 0; r < L.n; r += 1) {
            for (let c = 0; c < L.n; c += 1) {
                const x = L.originX + c * (L.cell + L.gap);
                const y = L.originY + r * (L.cell + L.gap);
                g.fillRoundedRect(x, y, L.cell, L.cell, TILE_RADIUS);
            }
        }
    }

    hideOverlay() {
        this.overlay?.setVisible(false);
    }

    drawStatus() {
        if (!this.overlay || !this.match || !this.layout) return;

        const L = this.layout;
        const T = this.theme;
        const dim = this.overlay.getData('dim');
        const plate = this.overlay.getData('plate');
        const title = this.overlay.getData('title');
        const subtitle = this.overlay.getData('subtitle');

        const showOver = this.match.over;
        const showWin = this.match.won && !this.match.over && !this.match.winDismissed;

        if (!showOver && !showWin) {
            this.overlay.setVisible(false);
            return;
        }

        const cx = L.width / 2;
        const cy = L.height / 2;
        const plateW = Math.min(L.side * 0.92, L.width - 24);
        const plateH = Math.min(128, L.side * 0.36);
        const radius = 18;

        dim.clear();
        dim.fillStyle(T.overlayDim, 0.55);
        dim.fillRoundedRect(L.boardX, L.boardY, L.side, L.side, 18);

        plate.clear();
        plate.lineStyle(4, showOver ? T.overlayStrokeOver : T.overlayStrokeWin, 1);
        plate.strokeRoundedRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, radius);
        plate.fillStyle(showOver ? T.overlayPlateOver : T.overlayPlateWin, 0.96);
        plate.fillRoundedRect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, radius);

        const titleSize = Math.max(26, Math.min(42, Math.floor(plateW * 0.09)));
        title.setFontFamily(T.fontFamily);
        title.setFontSize(titleSize);
        title.setColor(T.overlayTitle);
        title.setStroke('#000000', 4);
        title.setText(showOver ? 'Fin de la partida' : '¡Llegaste a 2048!');
        title.setPosition(cx, cy - 14);

        subtitle.setFontFamily(T.fontFamily);
        subtitle.setFontSize(Math.max(13, Math.floor(titleSize * 0.42)));
        subtitle.setColor(T.overlaySub);
        subtitle.setText(
            showOver
                ? 'Mira el marcador abajo · Reinicia para otra ronda'
                : 'Pulsa Continuar abajo para seguir',
        );
        subtitle.setPosition(cx, cy + titleSize * 0.55);

        this.overlay.setVisible(true);
    }
}
