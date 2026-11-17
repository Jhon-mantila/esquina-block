import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMask, normalizeSquare, upsampleMask } from './backgroundRemovalMath.js';

test('U²-Net normaliza un píxel rojo con la media y la desviación de ImageNet', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255]);
    const plane = normalizeSquare(rgba, 1, 'u2net');
    assert.equal(plane.length, 3);
    assert.ok(Math.abs(plane[0] - ((1 - 0.485) / 0.229)) < 1e-6);
    assert.ok(Math.abs(plane[1] - ((0 - 0.456) / 0.224)) < 1e-6);
    assert.ok(Math.abs(plane[2] - ((0 - 0.406) / 0.225)) < 1e-6);
});

test('RMBG centra el color en 0.5', () => {
    const rgba = new Uint8ClampedArray([255, 0, 128, 255]);
    const plane = normalizeSquare(rgba, 1, 'rmbg');
    assert.ok(Math.abs(plane[0] - 0.5) < 1e-6);
    assert.ok(Math.abs(plane[1] - (-0.5)) < 1e-6);
    assert.ok(Math.abs(plane[2] - (128 / 255 - 0.5)) < 1e-6);
});

test('la máscara de 2×2 se mantiene en las esquinas al subir a 2×2', () => {
    const mask = upsampleMask(new Float32Array([0, 1, 0, 1]), 2, 2, 2);
    assert.deepEqual(Array.from(mask), [0, 1, 0, 1]);
});

test('aplicar la máscara cambia el alfa y conserva el color', () => {
    const image = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    applyMask(image, new Float32Array([1, 0]));
    assert.deepEqual(Array.from(image), [10, 20, 30, 255, 40, 50, 60, 0]);
});
