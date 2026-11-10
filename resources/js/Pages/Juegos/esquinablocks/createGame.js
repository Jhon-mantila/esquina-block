import Phaser from 'phaser';
import GameScene from './GameScene';
import { resolveTheme } from './themes';

/**
 * Crea el juego Phaser dentro del contenedor DOM.
 * @param {HTMLElement} parent
 * @param {{ theme?: string }} options
 * @returns {Phaser.Game}
 */
export function createGame(parent, options = {}) {
    const theme = options.theme || 'dark';
    const themeDef = resolveTheme(theme);

    const width = Math.max(parent.clientWidth || 360, 120);
    const height = Math.max(parent.clientHeight || Math.round(width * 4 / 3), 160);

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
        render: {
            antialias: true,
            roundPixels: true,
        },
        scene: [],
        banner: false,
        audio: { noAudio: true },
        input: {
            activePointers: 2,
        },
    });

    game.registry.set('theme', theme);
    game.scene.add('GameScene', GameScene, true, { theme });

    return game;
}

/**
 * Reinicia la escena con el tema actual.
 * @param {Phaser.Game} game
 * @param {{ theme?: string }} options
 */
export function bootScene(game, options = {}) {
    if (!game?.scene) return;

    const theme = options.theme || game.registry.get('theme') || 'dark';
    game.registry.set('theme', theme);

    if (game.scene.isActive('GameScene') || game.scene.isSleeping('GameScene')) {
        game.scene.stop('GameScene');
    }
    game.scene.start('GameScene', { theme });
}
