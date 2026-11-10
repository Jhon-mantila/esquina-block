import Phaser from 'phaser';
import {
    GRID_SIZE,
    canPlace,
    canPlaceAnywhere,
    cellTopLeft,
    clearLines,
    computeCellMetrics,
    createEmptyGrid,
    findFullLines,
    placePiece,
    screenToCell,
} from './board';
import { EVENTS, gameEvents } from './gameEvents';
import { clearDraft, loadDraft, saveDraft } from './persist';
import { dealTray, pieceBounds } from './pieces';
import { resolveTheme } from './themes';

const TRAY_SLOTS = 3;
const PLACE_POINTS_PER_CELL = 10;
const LINE_POINTS = 100;

/**
 * Escena principal Esquina Blocks (MVP jugable + persistencia/combos).
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.themeId = 'dark';
        this.theme = resolveTheme('dark');
        /** @type {Phaser.GameObjects.Graphics | null} */
        this.chromeGfx = null;
        /** @type {Phaser.GameObjects.Graphics | null} */
        this.gridGfx = null;
        /** @type {Phaser.GameObjects.Graphics | null} */
        this.trayGfx = null;
        /** @type {Phaser.GameObjects.Graphics | null} */
        this.ghostGfx = null;
        /** @type {Phaser.GameObjects.Graphics | null} */
        this.dragGfx = null;
        /** @type {Phaser.GameObjects.Text | null} */
        this.comboText = null;
        /** @type {Phaser.GameObjects.Rectangle[]} */
        this.slotZones = [];
        this.layout = null;
        this.cellMetrics = null;
        /** @type {number[][]} */
        this.grid = createEmptyGrid();
        /** @type {(import('./pieces').PieceDef | null)[]} */
        this.tray = [null, null, null];
        this.score = 0;
        this.gameOver = false;
        this.inputLocked = false;
        this.restored = false;
        /** @type {null | {
         *   slot: number,
         *   piece: import('./pieces').PieceDef,
         *   pointerId: number,
         *   bounds: { w: number, h: number, cells: [number, number][] },
         *   unit: number,
         *   block: number,
         *   lift: number,
         * }} */
        this.drag = null;
        /** @type {Phaser.GameObjects.Container | null} */
        this.dragContainer = null;
        this.hoverAnchor = null;
        this.hoverValid = false;
        this.lastHoverKey = '';
    }

    init(data = {}) {
        this.applyTheme(data.theme);
        try {
            this.resetMatch(false, true);
        } catch (err) {
            console.error('[EsquinaBlocks] resetMatch falló, partida nueva', err);
            try {
                clearDraft();
            } catch {
                /* ignore */
            }
            this.grid = createEmptyGrid();
            this.score = 0;
            this.gameOver = false;
            this.tray = dealTray(TRAY_SLOTS, this.theme.blocks.length, null);
            this.restored = false;
        }
    }

    applyTheme(id) {
        this.themeId = id === 'colorful' ? 'colorful' : 'dark';
        this.theme = resolveTheme(this.themeId);
    }

    /**
     * @param {boolean} emitReady
     * @param {boolean} [tryRestore=false]
     */
    resetMatch(emitReady = true, tryRestore = false) {
        this.inputLocked = false;
        this.drag = null;
        this.hoverAnchor = null;
        this.hoverValid = false;
        this.restored = false;

        const draft = tryRestore ? loadDraft() : null;
        if (draft) {
            this.grid = draft.grid.map((row) => row.slice());
            this.tray = draft.tray.map((p) => (p ? { ...p, cells: p.cells.map((c) => /** @type {[number, number]} */ ([c[0], c[1]])) } : null));
            this.score = draft.score;
            this.gameOver = draft.over;
            this.restored = true;
        } else {
            this.grid = createEmptyGrid();
            this.score = 0;
            this.gameOver = false;
            this.tray = dealTray(TRAY_SLOTS, this.theme.blocks.length, this.grid);
            clearDraft();
        }

        if (emitReady) {
            gameEvents.emit(EVENTS.SCORE, { score: this.score, gain: 0 });
            gameEvents.emit(EVENTS.READY, {
                theme: this.themeId,
                score: this.score,
                gridSize: GRID_SIZE,
                over: this.gameOver,
                restored: this.restored,
            });
        }
    }

    persistMatch() {
        saveDraft({
            grid: this.grid,
            tray: this.tray,
            score: this.score,
            over: this.gameOver,
        });
    }

    create() {
        this.cameras.main.setBackgroundColor(this.theme.canvas);
        this.chromeGfx = this.add.graphics().setDepth(0);
        this.gridGfx = this.add.graphics().setDepth(1);
        this.trayGfx = this.add.graphics().setDepth(2);
        this.ghostGfx = this.add.graphics().setDepth(3);
        this.dragGfx = this.add.graphics().setDepth(10);
        this.comboText = this.add
            .text(0, 0, '', {
                fontFamily: this.theme.fontFamily,
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center',
            })
            .setOrigin(0.5)
            .setDepth(12)
            .setAlpha(0);

        this.slotZones = [];
        for (let i = 0; i < TRAY_SLOTS; i += 1) {
            const zone = this.add
                .rectangle(0, 0, 10, 10, 0x000000, 0)
                .setOrigin(0, 0)
                .setDepth(4)
                .setInteractive({ useHandCursor: true });
            zone.slotIndex = i;
            zone.on('pointerdown', (pointer) => this.onSlotDown(i, pointer));
            this.slotZones.push(zone);
        }

        try {
            this.redrawAll();
        } catch (err) {
            console.error('[EsquinaBlocks] redraw inicial falló', err);
        }

        this.scale.on('resize', this.onResize, this);
        this.input.on('pointermove', this.onPointerMove, this);
        this.input.on('pointerup', this.onPointerUp, this);
        this.input.on('pointerupoutside', this.onPointerUp, this);

        gameEvents.on(EVENTS.RESTART, this.handleRestart, this);
        gameEvents.on(EVENTS.SET_THEME, this.handleSetTheme, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroyDragContainer();
            this.scale.off('resize', this.onResize, this);
            this.input.off('pointermove', this.onPointerMove, this);
            this.input.off('pointerup', this.onPointerUp, this);
            this.input.off('pointerupoutside', this.onPointerUp, this);
            gameEvents.off(EVENTS.RESTART, this.handleRestart, this);
            gameEvents.off(EVENTS.SET_THEME, this.handleSetTheme, this);
        });

        // Siempre avisar a Vue, aunque el primer paint falle.
        gameEvents.emit(EVENTS.READY, {
            theme: this.themeId,
            score: this.score,
            gridSize: GRID_SIZE,
            over: this.gameOver,
            restored: this.restored,
        });
    }

    onResize() {
        this.redrawAll();
    }

    computeLayout() {
        const w = this.scale.width;
        const h = this.scale.height;
        const pad = Math.max(10, Math.min(w, h) * 0.04);
        const gap = Math.max(10, pad * 0.8);

        const boardAreaH = h * 0.68;
        const boardSize = Math.min(w - pad * 2, boardAreaH - pad);
        const boardX = (w - boardSize) / 2;
        const boardY = pad;

        const trayTop = boardY + boardSize + gap;
        const trayH = Math.max(72, h - trayTop - pad);
        const trayW = w - pad * 2;
        const trayX = pad;
        const trayY = trayTop;

        this.layout = {
            pad,
            boardX,
            boardY,
            boardSize,
            trayX,
            trayY,
            trayW,
            trayH,
            slotW: trayW / TRAY_SLOTS,
        };
        this.cellMetrics = computeCellMetrics(this.layout);
        return this.layout;
    }

    redrawAll() {
        this.computeLayout();
        this.drawChrome();
        this.drawGrid();
        this.drawTray();
        this.layoutSlotZones();
        this.drawGhost();
        // La ficha en arrastre vive en dragContainer (no Graphics).
        if (this.drag && this.dragContainer && this.cellMetrics) {
            const m = this.cellMetrics;
            this.drag.unit = m.cell + m.gap;
            this.drag.block = m.cell;
            this.drag.lift = m.cell * 0.45;
            const pointer = this.input.activePointer;
            const origin = this.dragOriginFromPointer(pointer.x, pointer.y);
            this.dragContainer.setPosition(origin.x, origin.y);
        }
    }

    layoutSlotZones() {
        const L = this.layout;
        if (!L) return;
        for (let i = 0; i < TRAY_SLOTS; i += 1) {
            const zone = this.slotZones[i];
            zone.setPosition(L.trayX + i * L.slotW, L.trayY);
            zone.setSize(L.slotW, L.trayH);
            if (this.tray[i] && !this.gameOver && !(this.drag && this.drag.slot === i)) {
                zone.setInteractive({ useHandCursor: true });
            } else {
                zone.disableInteractive();
            }
        }
    }

    drawChrome() {
        const L = this.layout;
        const g = this.chromeGfx;
        if (!L || !g) return;

        g.clear();
        g.fillStyle(this.theme.boardBg, 1);
        g.lineStyle(2, this.theme.boardStroke, 0.85);
        g.fillRoundedRect(L.boardX, L.boardY, L.boardSize, L.boardSize, 16);
        g.strokeRoundedRect(L.boardX, L.boardY, L.boardSize, L.boardSize, 16);

        g.fillStyle(this.theme.trayBg, 1);
        g.lineStyle(2, this.theme.trayStroke, 0.9);
        g.fillRoundedRect(L.trayX, L.trayY, L.trayW, L.trayH, 14);
        g.strokeRoundedRect(L.trayX, L.trayY, L.trayW, L.trayH, 14);
    }

    drawGrid() {
        const g = this.gridGfx;
        const m = this.cellMetrics;
        if (!g || !m) return;

        g.clear();
        for (let row = 0; row < GRID_SIZE; row += 1) {
            for (let col = 0; col < GRID_SIZE; col += 1) {
                const { x, y } = cellTopLeft(m, col, row);
                const value = this.grid[row][col];
                if (value) {
                    const fill = this.theme.blocks[(value - 1) % this.theme.blocks.length];
                    g.fillStyle(fill, 1);
                    g.lineStyle(1, 0xffffff, 0.22);
                } else {
                    g.fillStyle(this.theme.emptyCell, 1);
                    g.lineStyle(1, this.theme.emptyStroke, 0.9);
                }
                g.fillRoundedRect(x, y, m.cell, m.cell, m.radius);
                g.strokeRoundedRect(x, y, m.cell, m.cell, m.radius);
            }
        }
    }

    drawTray() {
        const g = this.trayGfx;
        const L = this.layout;
        if (!g || !L) return;

        g.clear();
        for (let i = 0; i < TRAY_SLOTS; i += 1) {
            if (this.drag && this.drag.slot === i) continue;
            const piece = this.tray[i];
            if (!piece) continue;
            this.paintPieceInSlot(g, piece, i, 1);
        }
    }

    /**
     * @param {Phaser.GameObjects.Graphics} g
     * @param {import('./pieces').PieceDef} piece
     * @param {number} slot
     * @param {number} alpha
     */
    paintPieceInSlot(g, piece, slot, alpha) {
        const L = this.layout;
        const metrics = this.traySlotMetrics(piece, slot);
        if (!L || !metrics) return;
        const fill = this.theme.blocks[(piece.colorIndex - 1) % this.theme.blocks.length];
        for (const [cx, cy] of piece.cells) {
            const x = metrics.originX + cx * metrics.unit;
            const y = metrics.originY + cy * metrics.unit;
            g.fillStyle(fill, alpha);
            g.lineStyle(1, 0xffffff, 0.25 * alpha);
            g.fillRoundedRect(x, y, metrics.block, metrics.block, metrics.radius);
            g.strokeRoundedRect(x, y, metrics.block, metrics.block, metrics.radius);
        }
    }

    /**
     * @param {import('./pieces').PieceDef} piece
     * @param {number} slot
     */
    traySlotMetrics(piece, slot) {
        const L = this.layout;
        if (!L) return null;
        const bounds = pieceBounds(piece);
        const innerPad = Math.max(6, Math.min(L.slotW, L.trayH) * 0.1);
        const availW = L.slotW - innerPad * 2;
        const availH = L.trayH - innerPad * 2;
        const unit = Math.min(availW / bounds.w, availH / bounds.h, this.cellMetrics?.cell || 28);
        const gap = Math.max(2, unit * 0.08);
        const block = unit - gap;
        const pieceW = bounds.w * unit - gap;
        const pieceH = bounds.h * unit - gap;
        return {
            unit,
            gap,
            block,
            radius: Math.max(3, block * 0.22),
            originX: L.trayX + slot * L.slotW + (L.slotW - pieceW) / 2,
            originY: L.trayY + (L.trayH - pieceH) / 2,
        };
    }

    drawGhost() {
        const g = this.ghostGfx;
        const m = this.cellMetrics;
        if (!g || !m) return;
        g.clear();
        if (!this.drag || !this.hoverAnchor) return;

        const piece = this.drag.piece;
        const fill = this.hoverValid
            ? this.theme.blocks[(piece.colorIndex - 1) % this.theme.blocks.length]
            : 0xf43f5e;
        const alpha = this.hoverValid ? 0.42 : 0.32;

        // fillRect (sin stroke/rounded) = mucho más barato en cada cambio de celda.
        for (const [dx, dy] of piece.cells) {
            const col = this.hoverAnchor.col + dx;
            const row = this.hoverAnchor.row + dy;
            if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) continue;
            const { x, y } = cellTopLeft(m, col, row);
            g.fillStyle(fill, alpha);
            g.fillRect(x, y, m.cell, m.cell);
        }
    }

    /**
     * Pieza arrastrada como Container de rectángulos: solo se mueve, no se redibuja.
     * @param {import('./pieces').PieceDef} piece
     * @param {number} originX
     * @param {number} originY
     * @param {number} unit
     * @param {number} block
     */
    spawnDragContainer(piece, originX, originY, unit, block) {
        this.destroyDragContainer();
        const fill = this.theme.blocks[(piece.colorIndex - 1) % this.theme.blocks.length];
        const container = this.add.container(originX, originY).setDepth(10);
        for (const [cx, cy] of piece.cells) {
            const rect = this.add
                .rectangle(cx * unit, cy * unit, block, block, fill, 0.96)
                .setOrigin(0, 0)
                .setStrokeStyle(1.5, 0xffffff, 0.3);
            container.add(rect);
        }
        this.dragContainer = container;
    }

    destroyDragContainer() {
        if (this.dragContainer) {
            this.dragContainer.destroy(true);
            this.dragContainer = null;
        }
        this.dragGfx?.clear();
    }

    /**
     * @param {number} pointerX
     * @param {number} pointerY
     */
    dragOriginFromPointer(pointerX, pointerY) {
        const drag = this.drag;
        const m = this.cellMetrics;
        if (!drag || !m) return { x: pointerX, y: pointerY };
        const { bounds, unit, lift } = drag;
        return {
            x: pointerX - (bounds.w * unit - m.gap) / 2,
            y: pointerY - (bounds.h * unit - m.gap) / 2 - lift,
        };
    }

    /**
     * @param {number} slot
     * @param {Phaser.Input.Pointer} pointer
     */
    onSlotDown(slot, pointer) {
        if (this.gameOver || this.inputLocked || this.drag) return;
        const piece = this.tray[slot];
        const m = this.cellMetrics;
        if (!piece || !m) return;

        const bounds = pieceBounds(piece);
        const unit = m.cell + m.gap;
        const block = m.cell;
        const lift = m.cell * 0.45;
        this.drag = {
            slot,
            piece,
            pointerId: pointer.id,
            bounds,
            unit,
            block,
            lift,
        };
        this.hoverAnchor = null;
        this.hoverValid = false;
        this.lastHoverKey = '';
        this.layoutSlotZones();
        this.drawTray();

        const origin = this.dragOriginFromPointer(pointer.x, pointer.y);
        this.spawnDragContainer(piece, origin.x, origin.y, unit, block);
        this.updateHover(pointer);
    }

    /** @param {Phaser.Input.Pointer} pointer */
    onPointerMove(pointer) {
        if (!this.drag || pointer.id !== this.drag.pointerId) return;
        const origin = this.dragOriginFromPointer(pointer.x, pointer.y);
        this.dragContainer?.setPosition(origin.x, origin.y);
        this.updateHover(pointer);
    }

    /** @param {Phaser.Input.Pointer} pointer */
    onPointerUp(pointer) {
        if (!this.drag || pointer.id !== this.drag.pointerId) return;
        const { slot, piece } = this.drag;
        const anchor = this.hoverAnchor;
        const valid = this.hoverValid && !!anchor;

        this.drag = null;
        this.hoverAnchor = null;
        this.hoverValid = false;
        this.lastHoverKey = '';
        this.ghostGfx?.clear();
        this.destroyDragContainer();

        if (valid && anchor) {
            this.commitPlacement(slot, piece, anchor.col, anchor.row);
        } else {
            this.layoutSlotZones();
            this.drawTray();
        }
    }

    /** @param {Phaser.Input.Pointer} pointer */
    updateHover(pointer) {
        const m = this.cellMetrics;
        const drag = this.drag;
        if (!m || !drag) return;

        const origin = this.dragOriginFromPointer(pointer.x, pointer.y);
        const anchorScreenX = origin.x + m.cell / 2;
        const anchorScreenY = origin.y + m.cell / 2;
        const { col, row } = screenToCell(m, anchorScreenX, anchorScreenY);

        /** @type {{ col: number, row: number } | null} */
        let nextAnchor = null;
        let nextValid = false;
        if (!(col < -3 || row < -3 || col >= GRID_SIZE + 3 || row >= GRID_SIZE + 3)) {
            nextAnchor = { col, row };
            nextValid = canPlace(this.grid, drag.piece, col, row);
        }

        const key = nextAnchor ? `${nextAnchor.col},${nextAnchor.row},${nextValid ? 1 : 0}` : 'none';
        if (key === this.lastHoverKey) return;
        this.lastHoverKey = key;
        this.hoverAnchor = nextAnchor;
        this.hoverValid = nextValid;
        this.drawGhost();
    }

    /**
     * @param {number} slot
     * @param {import('./pieces').PieceDef} piece
     * @param {number} col
     * @param {number} row
     */
    commitPlacement(slot, piece, col, row) {
        if (!canPlace(this.grid, piece, col, row)) {
            this.layoutSlotZones();
            this.drawTray();
            return;
        }

        placePiece(this.grid, piece, col, row);
        this.tray[slot] = null;

        let gain = piece.cells.length * PLACE_POINTS_PER_CELL;
        const lines = findFullLines(this.grid);

        if (lines.rows.length || lines.cols.length) {
            this.inputLocked = true;
            this.drawGrid();
            this.flashLines(lines, () => {
                const cleared = clearLines(this.grid, lines);
                gain += cleared.lineCount * LINE_POINTS;
                if (cleared.lineCount >= 2) gain += 50 * (cleared.lineCount - 1);
                this.showCombo(cleared.lineCount);
                gameEvents.emit(EVENTS.CLEAR, { lines: cleared.lineCount, gain });
                this.finishAfterPlace(gain);
            });
        } else {
            gameEvents.emit(EVENTS.CLEAR, { lines: 0, gain });
            this.finishAfterPlace(gain);
        }
    }

    /** @param {number} lineCount */
    showCombo(lineCount) {
        const L = this.layout;
        const label = this.comboText;
        if (!L || !label || lineCount < 1) return;

        const messages = {
            1: '¡Línea!',
            2: '¡Doble!',
            3: '¡Triple!',
            4: '¡Combo x4!',
        };
        const msg = messages[lineCount] || `¡Combo x${lineCount}!`;
        label.setText(msg);
        label.setStyle({
            fontFamily: this.theme.fontFamily,
            fontSize: `${Math.max(22, Math.round(L.boardSize * 0.08))}px`,
            color: this.themeId === 'dark' ? '#67e8f9' : '#ea580c',
            stroke: this.themeId === 'dark' ? '#083344' : '#fff7ed',
            strokeThickness: 5,
        });
        label.setPosition(L.boardX + L.boardSize / 2, L.boardY + L.boardSize * 0.42);
        label.setAlpha(1).setScale(0.6);

        this.tweens.killTweensOf(label);
        this.tweens.add({
            targets: label,
            scale: 1.15,
            duration: 180,
            ease: 'Back.Out',
            yoyo: true,
            hold: 280,
            onComplete: () => {
                this.tweens.add({
                    targets: label,
                    alpha: 0,
                    y: label.y - 24,
                    duration: 280,
                    ease: 'Quad.Out',
                });
            },
        });
    }

    /**
     * @param {{ rows: number[], cols: number[] }} lines
     * @param {() => void} done
     */
    flashLines(lines, done) {
        const g = this.ghostGfx;
        const m = this.cellMetrics;
        if (!g || !m) {
            done();
            return;
        }

        const cells = [];
        for (const r of lines.rows) {
            for (let c = 0; c < GRID_SIZE; c += 1) cells.push([c, r]);
        }
        for (const c of lines.cols) {
            for (let r = 0; r < GRID_SIZE; r += 1) cells.push([c, r]);
        }

        let step = 0;
        const ticks = 6;
        this.time.addEvent({
            delay: 45,
            repeat: ticks - 1,
            callback: () => {
                step += 1;
                g.clear();
                const alpha = step % 2 === 0 ? 0.85 : 0.25;
                for (const [c, r] of cells) {
                    const { x, y } = cellTopLeft(m, c, r);
                    g.fillStyle(0xffffff, alpha);
                    g.fillRoundedRect(x, y, m.cell, m.cell, m.radius);
                }
                if (step >= ticks) {
                    g.clear();
                    done();
                }
            },
        });
    }

    /** @param {number} gain */
    finishAfterPlace(gain) {
        this.score += gain;
        gameEvents.emit(EVENTS.SCORE, { score: this.score, gain });

        const needsRefill = this.tray.every((p) => !p);
        this.inputLocked = false;
        this.redrawAll();

        if (needsRefill) {
            this.refillTrayIfNeeded();
            return;
        }

        if (this.checkGameOver()) {
            this.gameOver = true;
            this.layoutSlotZones();
            this.persistMatch();
            gameEvents.emit(EVENTS.GAME_OVER, { score: this.score });
            return;
        }

        this.persistMatch();
    }

    refillTrayIfNeeded() {
        if (!this.tray.every((p) => !p)) return;
        // Diferir el sesgo de combos un frame para no congelar el soltar la ficha.
        const gridSnapshot = this.grid.map((row) => row.slice());
        const maxColor = this.theme.blocks.length;
        this.time.delayedCall(0, () => {
            if (this.gameOver) return;
            this.tray = dealTray(TRAY_SLOTS, maxColor, gridSnapshot);
            this.layoutSlotZones();
            this.drawTray();
            if (this.checkGameOver()) {
                this.gameOver = true;
                this.layoutSlotZones();
                this.persistMatch();
                gameEvents.emit(EVENTS.GAME_OVER, { score: this.score });
            } else {
                this.persistMatch();
            }
        });
    }

    checkGameOver() {
        const remaining = this.tray.filter(Boolean);
        if (!remaining.length) return false;
        return remaining.every((piece) => !canPlaceAnywhere(this.grid, piece));
    }

    handleRestart() {
        this.destroyDragContainer();
        this.drag = null;
        this.hoverAnchor = null;
        this.hoverValid = false;
        this.lastHoverKey = '';
        clearDraft();
        this.resetMatch(true, false);
        this.cameras.main.setBackgroundColor(this.theme.canvas);
        this.comboText?.setAlpha(0);
        this.redrawAll();
        this.persistMatch();
    }

    /** @param {string} themeId */
    handleSetTheme(themeId) {
        this.applyTheme(themeId);
        this.cameras.main.setBackgroundColor(this.theme.canvas);
        this.redrawAll();
    }
}
