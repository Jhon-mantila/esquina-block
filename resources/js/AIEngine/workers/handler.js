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
                        sessions.set(message.token, {
                            session,
                            model: message.model,
                            provider,
                            providers: message.providers ?? [provider],
                        });
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

            const image = message.mask
                ? { ...message.image, mask: message.mask }
                : message.image;
            const providers = entry.providers?.length ? entry.providers : [entry.provider];
            let start = providers.indexOf(entry.provider);
            if (start < 0) start = 0;
            const report = (status) => post({ type: 'status', id: message.id, status });

            for (let index = start; index < providers.length; index += 1) {
                const provider = providers[index];
                if (index !== start) {
                    try {
                        const loaded = await deps.loadBuffer(entry.model, () => {});
                        const buffer = loaded instanceof ArrayBuffer ? loaded : loaded.buffer;
                        try {
                            await entry.session?.release?.();
                        } catch {
                            // La sesión que falló al procesar ya no importa.
                        }
                        entry.session = await deps.createSession(buffer, provider);
                        entry.provider = provider;
                    } catch {
                        continue;
                    }
                }

                try {
                    const output = await deps.run(entry.session, entry.model, image, report);
                    post({
                        type: 'result',
                        id: message.id,
                        token: message.token,
                        provider: entry.provider,
                        width: output.width,
                        height: output.height,
                        data: output.data,
                    });
                    return;
                } catch {
                    // Crear la sesión no basta: si el procesamiento falla, se prueba el siguiente proveedor.
                }
            }

            post({
                type: 'error',
                id: message.id,
                code: 'model-failed',
                message: PUBLIC_MODEL_ERROR,
            });
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
