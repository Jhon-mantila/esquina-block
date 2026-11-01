import Phaser from 'phaser';
import BoardScene from './BoardScene';
import { resolveTheme } from './themes';

/**
 * Crea el juego Phaser dentro del contenedor DOM.
 * @param {HTMLElement} parent
 * @param {{ mode: string, theme: string }} options
 * @returns {Phaser.Game}
 */
export function createGame(parent, options = {}) {
    const mode = options.mode || 'classic';
    const theme = options.theme || 'dark';
    const themeDef = resolveTheme(theme);

    const width = Math.max(parent.clientWidth || 360, 120);
    const height = Math.max(parent.clientHeight || width, 120);

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width,
        height,
        backgroundColor: themeDef.canvas,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width,
            height,
        },
        scene: [],
        banner: false,
        audio: { noAudio: true },
    });

    game.registry.set('mode', mode);
    game.registry.set('theme', theme);
    game.scene.add('BoardScene', BoardScene, true, { mode, theme });

    return game;
}

/**
 * Reinicia la escena Board con el estado actual.
 * @param {Phaser.Game} game
 * @param {{ mode?: string, theme?: string }} options
 */
export function bootBoard(game, options = {}) {
    if (!game?.scene) return;

    const mode = options.mode || game.registry.get('mode') || 'classic';
    const theme = options.theme || game.registry.get('theme') || 'dark';
    game.registry.set('mode', mode);
    game.registry.set('theme', theme);

    if (game.scene.isActive('BoardScene') || game.scene.isSleeping('BoardScene')) {
        game.scene.stop('BoardScene');
    }
    game.scene.start('BoardScene', { mode, theme });
}
