import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    cropMask,
    cropRgba,
    featherComposite,
    maskToPlane,
    planRegions,
    planesToRgba,
    rgbaToImagePlanes,
    resizeMaskNearest,
} from './inpaintingMath.js';

test('sin pintura no hay regiones', () => {
    const mask = new Uint8Array(6 * 4);
    assert.deepEqual(planRegions(6, 4, mask, { minPadding: 1, paddingRatio: 0 }), []);
});

test('dos manchas separadas siguen siendo dos recortes', () => {
    const width = 20;
    const height = 10;
    const mask = new Uint8Array(width * height);
    mask[1 * width + 1] = 255;
    mask[1 * width + 2] = 255;
    mask[2 * width + 1] = 255;
    mask[2 * width + 2] = 255;
    mask[8 * width + 16] = 255;
    mask[8 * width + 17] = 255;
    mask[9 * width + 16] = 255;
    mask[9 * width + 17] = 255;

    const regions = planRegions(width, height, mask, {
        minArea: 4,
        minPadding: 1,
        paddingRatio: 0,
        mergeGap: 0,
    });

    assert.equal(regions.length, 2);
    assert.deepEqual(regions[0], { x: 0, y: 0, width: 4, height: 4 });
    assert.deepEqual(regions[1], { x: 15, y: 7, width: 4, height: 3 });
});

test('el recorte copia el píxel y la máscara de esa zona', () => {
    const rgba = new Uint8ClampedArray([
        1, 2, 3, 255, 4, 5, 6, 255,
        7, 8, 9, 255, 10, 11, 12, 255,
    ]);
    const crop = cropRgba({ width: 2, height: 2, data: rgba }, { x: 1, y: 1, width: 1, height: 1 });
    assert.deepEqual([...crop], [10, 11, 12, 255]);

    const mask = cropMask(
        { width: 2, height: 2, data: new Uint8Array([0, 10, 20, 30]) },
        { x: 1, y: 0, width: 1, height: 2 },
    );
    assert.deepEqual([...mask], [10, 30]);
});

test('la máscara pequeña se estira sin mezclar vecinos', () => {
    const mask = resizeMaskNearest(new Uint8Array([0, 255]), 2, 1, 4, 1);
    assert.deepEqual([...mask], [0, 0, 255, 255]);
});

test('la imagen pasa a planos de 0 a 1 y la máscara marca solo lo pintado', () => {
    const planes = rgbaToImagePlanes(new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    assert.equal(planes[0], 1);
    assert.equal(planes[2], 0);
    assert.equal(planes[3], 0);
    assert.equal(planes[5], 1);

    const plane = maskToPlane(new Uint8Array([0, 200]), 2, 1);
    assert.deepEqual([...plane], [0, 1]);
});

test('una salida de 0 a 255 y otra de 0 a 1 producen el mismo color', () => {
    const fromBytes = planesToRgba(new Float32Array([255, 0, 0]), 1, 1, 255);
    const fromUnit = planesToRgba(new Float32Array([1, 0, 0]), 1, 1, 1);
    assert.deepEqual([...fromBytes], [255, 0, 0, 255]);
    assert.deepEqual([...fromUnit], [255, 0, 0, 255]);
});

test('lo que no está pintado se queda igual y el borde se mezcla', () => {
    const original = new Uint8ClampedArray([
        10, 20, 30, 255, 40, 50, 60, 255,
        70, 80, 90, 255, 100, 110, 120, 255,
    ]);
    const generated = new Uint8ClampedArray([
        200, 200, 200, 255, 200, 200, 200, 255,
        200, 200, 200, 255, 200, 200, 200, 255,
    ]);
    const mask = new Uint8Array([0, 0, 0, 255]);
    const sharp = featherComposite(original, generated, mask, 2, 2, 0);
    assert.equal(sharp[0], 10);
    assert.equal(sharp[12], 200);

    const soft = featherComposite(original, generated, mask, 2, 2, 1);
    assert.ok(soft[0] > 10 && soft[0] < 200);
    assert.equal(soft[3], 255);
});
