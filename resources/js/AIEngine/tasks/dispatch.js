import { runBackgroundRemoval } from './backgroundRemoval.js';
import { runInpainting } from './inpainting.js';
import { runSuperResolution } from './superResolution.js';

/**
 * @param {{ Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown }} ort
 * @param {{ inputNames: string[], outputNames: string[], run: Function }} session
 * @param {{ task: string }} model
 * @param {{ width: number, height: number, data: Uint8ClampedArray, mask?: object }} image
 * @param {Function} [onStatus]
 */
export function dispatchTask(ort, session, model, image, onStatus) {
    if (model.task === 'background-removal') {
        return runBackgroundRemoval(ort, session, model, image);
    }
    if (model.task === 'super-resolution') {
        return runSuperResolution(ort, session, model, image, onStatus);
    }
    if (model.task === 'inpainting') {
        return runInpainting(ort, session, model, image, onStatus);
    }
    throw new Error('Tarea sin adaptador.');
}
