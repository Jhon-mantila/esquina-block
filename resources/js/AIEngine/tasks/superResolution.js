import {
    cropRgba,
    paintAlpha,
    planTiles,
    rgbaToNchw,
    writeRgbTile,
} from './superResolutionMath.js';

/**
 * Amplía por bloques. Cada bloque se libera antes de leer el siguiente.
 *
 * @param {{ Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown }} ort
 * @param {{ inputNames: string[], outputNames: string[], run: Function }} session
 * @param {{ scale: number, tileSize: number, overlap: number }} model
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} image
 * @param {(status: { phase: string, loaded?: number, total?: number }) => void} [onStatus]
 */
export async function runSuperResolution(ort, session, model, image, onStatus = () => {}) {
    const scale = model.scale;
    const tiles = planTiles(image.width, image.height, model.tileSize, model.overlap);
    const outW = image.width * scale;
    const outH = image.height * scale;
    const output = new Uint8ClampedArray(outW * outH * 4);
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];

    for (let index = 0; index < tiles.length; index += 1) {
        const tile = tiles[index];
        onStatus({ phase: 'preparing', loaded: index, total: tiles.length });
        const rgba = cropRgba(image, tile);
        const float = rgbaToNchw(rgba, tile.srcW, tile.srcH);
        const tensor = new ort.Tensor('float32', float, [1, 3, tile.srcH, tile.srcW]);
        const outputs = await session.run({ [inputName]: tensor });
        const out = outputs[outputName];
        const tileW = tile.srcW * scale;
        const tileH = tile.srcH * scale;
        if (!out?.data || out.data.length < 3 * tileW * tileH) {
            throw new Error('Salida de superresolución inesperada.');
        }
        writeRgbTile(output, outW, out.data, tileW, tileH, tile, scale);
    }

    paintAlpha(image.data, image.width, image.height, output, scale);
    onStatus({ phase: 'preparing', loaded: tiles.length, total: tiles.length });
    return { width: outW, height: outH, data: output };
}
