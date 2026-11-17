import { PUBLIC_MODEL_ERROR } from '../core/errors.js';

/**
 * @param {{
 *   loadBuffer: (model: object, onStatus: Function) => Promise<ArrayBuffer | { buffer: ArrayBuffer }>,
 *   createSession: (buffer: ArrayBuffer, provider: string) => Promise<{ release?: () => void | Promise<void> }>,
 *   run: (session: object, model: object, image: object) => Promise<{ width: number, height: number, data: Uint8ClampedArray }>,
 * }} deps
 */
export function createInferenceHandler(deps) {
    /** @type {Map<string, { session: { release?: () => void | Promise<void> }, model: object, provider: string }>} */
    const sessions = new Map();

    /**
     * @param {object} message
     * @param {(out: object) => void} post
     */
    return async function handle(message, post) {
        if (!message || typeof message !== 'object') return;

        if (message.type === 'load') {
            try {
                const loaded = await deps.loadBuffer(message.model, (status) => {
                    post({ type: 'status', id: message.id, status });
                });
                const buffer = loaded instanceof ArrayBuffer ? loaded : loaded.buffer;
                for (const provider of message.providers ?? []) {
                    try {
                        const session = await deps.createSession(buffer, provider);
                        sessions.set(message.token, { session, model: message.model, provider });
                        post({
                            type: 'loaded',
                            id: message.id,
                            token: message.token,
                            provider,
                        });
                        return;
                    } catch {
                        // El siguiente proveedor de la lista es el respaldo.
                    }
                }
            } catch {
                // La descarga o la sesión fallaron: el mensaje público se envía abajo.
            }

            post({
                type: 'error',
                id: message.id,
                token: message.token,
                code: 'model-failed',
                message: PUBLIC_MODEL_ERROR,
            });
            return;
        }

        if (message.type === 'run') {
            const entry = sessions.get(message.token);
            if (!entry) {
                post({
                    type: 'error',
                    id: message.id,
                    code: 'model-failed',
                    message: PUBLIC_MODEL_ERROR,
                });
                return;
            }

            try {
                const output = await deps.run(
                    entry.session,
                    entry.model,
                    message.image,
                    (status) => post({ type: 'status', id: message.id, status }),
                );
                post({
                    type: 'result',
                    id: message.id,
                    token: message.token,
                    width: output.width,
                    height: output.height,
                    data: output.data,
                });
            } catch {
                post({
                    type: 'error',
                    id: message.id,
                    code: 'model-failed',
                    message: PUBLIC_MODEL_ERROR,
                });
            }
            return;
        }

        if (message.type === 'release') {
            const entry = sessions.get(message.token);
            sessions.delete(message.token);
            try {
                await entry?.session?.release?.();
            } catch {
                // La sesión ya no estaba viva.
            }
            post({ type: 'released', id: message.id, token: message.token });
        }
    };
}
