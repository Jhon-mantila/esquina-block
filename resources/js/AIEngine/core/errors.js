export class EngineError extends Error {
    /**
     * @param {string} code
     * @param {string} message
     */
    constructor(code, message) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
    }
}

export const PUBLIC_MODEL_ERROR = 'No se pudo preparar el modelo. Inténtalo de nuevo.';

export const FALLBACK_NOTICE = 'No se pudo usar la calidad elegida. Se usó el modo rápido.';

/** El visitante no debe ver el texto interno de ONNX Runtime. */
export function publicModelError() {
    return new EngineError('model-failed', PUBLIC_MODEL_ERROR);
}
