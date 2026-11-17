import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    cropRgba,
    paintAlpha,
    planTiles,
    rgbaToNchw,
    writeRgbTile,
} from './superResolutionMath.js';

test('los bloques cubren toda la imagen una sola vez', () => {
    const width = 100;
    const height = 40;
    const tiles = planTiles(width, height, 64, 8);
    const cover = new Uint8Array(width * height);

    for (const tile of tiles) {
        assert.ok(tile.srcX >= 0 && tile.srcY >= 0);
        assert.ok(tile.srcX + tile.srcW <= width);
        assert.ok(tile.srcY + tile.srcH <= height);
        for (let y = 0; y < tile.coreH; y += 1) {
            for (let x = 0; x < tile.coreW; x += 1) {
                cover[(tile.destY + y) * width + (tile.destX + x)] += 1;
            }
        }
    }

    assert.ok(cover.every((value) => value === 1));
    assert.ok(tiles.length > 1);
});

test('el recorte conserva el píxel pedido', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    data[2 * 4 * 4 + 1 * 4] = 9;
    const image = { width: 4, height: 4, data };
    const tile = { srcX: 1, srcY: 2, srcW: 1, srcH: 1 };
    const crop = cropRgba(image, tile);
    assert.equal(crop[0], 9);
    assert.equal(crop.length, 4);
});

test('RGB pasa a planos de 0 a 1', () => {
    const plane = rgbaToNchw(new Uint8ClampedArray([255, 128, 0, 255]), 1, 1);
    assert.equal(plane[0], 1);
    assert.ok(Math.abs(plane[1] - 128 / 255) < 1e-6);
    assert.equal(plane[2], 0);
});

test('el núcleo ampliado se escribe y el solape no', () => {
    const output = new Uint8ClampedArray(2 * 1 * 4);
    const nchw = new Float32Array([0, 1, 0, 0, 0, 0]);
    writeRgbTile(output, 2, nchw, 2, 1, {
        destX: 0,
        destY: 0,
        coreW: 1,
        coreH: 1,
        padLeft: 1,
        padTop: 0,
    }, 1);
    assert.deepEqual(Array.from(output.subarray(0, 4)), [255, 0, 0, 255]);
    assert.equal(output[4], 0);
});

test('un alfa transparente se copia al resultado ampliado', () => {
    const source = new Uint8ClampedArray([1, 2, 3, 0, 4, 5, 6, 255]);
    const output = new Uint8ClampedArray(4 * 1 * 4);
    paintAlpha(source, 2, 1, output, 2);
    assert.equal(output[3], 0);
    assert.equal(output[7], 0);
    assert.equal(output[11], 255);
    assert.equal(output[15], 255);
});
