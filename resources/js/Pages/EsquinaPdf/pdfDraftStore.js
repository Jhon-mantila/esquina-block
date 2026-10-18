const DB_NAME = 'esquina-pdf';
const DB_VERSION = 1;
const STORE = 'drafts';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Evita saturar cuota del navegador (~PDFs grandes). */
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

const MODES = ['merge', 'delete', 'text', 'images'];

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB no disponible'));
    });
}

function txDone(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
    });
}

function estimateRecordBytes(record) {
    if (!record) return 0;
    let sum = 2048;
    const walk = (value) => {
        if (!value) return;
        if (value instanceof Blob) {
            sum += value.size;
            return;
        }
        if (Array.isArray(value)) {
            value.forEach(walk);
            return;
        }
        if (typeof value === 'object') {
            Object.values(value).forEach(walk);
        }
    };
    walk(record);
    return sum;
}

/**
 * @param {'merge'|'delete'|'text'|'images'} mode
 */
export async function clearPdfDraft(mode) {
    if (!MODES.includes(mode)) return;
    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(mode);
        await txDone(tx);
        db.close();
    } catch {
        /* ignore */
    }
}

/**
 * @param {'merge'|'delete'|'text'|'images'} mode
 * @param {object|null} record
 */
export async function savePdfDraft(mode, record) {
    if (!MODES.includes(mode)) return;
    if (!record) {
        await clearPdfDraft(mode);
        return;
    }

    const payload = { ...record, savedAt: Date.now() };
    if (estimateRecordBytes(payload) > MAX_TOTAL_BYTES) {
        // Demasiado grande: no guardar (mejor que fallar en silencio a medias).
        return;
    }

    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(payload, mode);
        await txDone(tx);
        db.close();
    } catch {
        /* quota / private mode */
    }
}

/**
 * @param {'merge'|'delete'|'text'|'images'} mode
 * @returns {Promise<object|null>}
 */
export async function loadPdfDraft(mode) {
    if (!MODES.includes(mode)) return null;
    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(mode);
        const record = await new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        await txDone(tx);
        db.close();

        if (!record?.savedAt) return null;
        if (Date.now() - record.savedAt > TTL_MS) {
            await clearPdfDraft(mode);
            return null;
        }
        return record;
    } catch {
        return null;
    }
}

/**
 * @param {File|Blob} blob
 * @param {string} [name]
 * @param {string} [type]
 */
export function toStoredFile(blob, name = 'archivo', type = '') {
    return {
        name,
        type: type || blob.type || 'application/octet-stream',
        blob,
    };
}

/**
 * @param {{ name?: string, type?: string, blob: Blob }} stored
 * @returns {File}
 */
export function fromStoredFile(stored) {
    return new File(
        [stored.blob],
        stored.name || 'archivo',
        { type: stored.type || 'application/octet-stream' },
    );
}

/**
 * Serializa overlays de texto/imagen para IndexedDB.
 * @param {Array} overlays
 */
export async function packTextOverlays(overlays) {
    const packed = [];
    const imageBlobs = {};
    const fontBlobs = {};

    for (const o of overlays || []) {
        if (o.type === 'image') {
            const { bytes, previewUrl, ...rest } = o;
            packed.push({ ...rest, type: 'image' });
            if (bytes) {
                imageBlobs[String(o.id)] = {
                    blob: bytes instanceof Blob ? bytes : new Blob([bytes], { type: o.mime || 'image/png' }),
                    mime: o.mime || 'image/png',
                    name: o.name || 'imagen.png',
                };
            }
        } else if (o.type === 'shape' || o.type === 'ink') {
            packed.push({ ...o });
        } else {
            const { fontBytes, ...rest } = o;
            packed.push({ ...rest, type: 'text', hasFont: !!fontBytes });
            if (fontBytes) {
                fontBlobs[String(o.id)] = {
                    blob: fontBytes instanceof Blob
                        ? fontBytes
                        : new Blob([fontBytes], { type: 'font/ttf' }),
                    fontName: o.fontName || 'custom.ttf',
                };
            }
        }
    }

    return { overlays: packed, imageBlobs, fontBlobs };
}

/**
 * @param {{ overlays: Array, imageBlobs?: object, fontBlobs?: object }} draft
 */
export async function unpackTextOverlays(draft) {
    const imageBlobs = draft.imageBlobs || {};
    const fontBlobs = draft.fontBlobs || {};
    const overlays = [];

    for (const o of draft.overlays || []) {
        if (o.type === 'image') {
            const stored = imageBlobs[String(o.id)];
            if (!stored?.blob) continue;
            const bytes = await stored.blob.arrayBuffer();
            const mime = stored.mime || o.mime || 'image/png';
            const name = stored.name || o.name || 'imagen.png';
            const file = new File([stored.blob], name, { type: mime });
            overlays.push({
                ...o,
                bytes,
                mime,
                name,
                previewUrl: URL.createObjectURL(file),
            });
        } else if (o.type === 'shape' || o.type === 'ink') {
            overlays.push({ ...o });
        } else {
            const stored = fontBlobs[String(o.id)];
            let fontBytes = null;
            if (stored?.blob) {
                fontBytes = await stored.blob.arrayBuffer();
            }
            const { hasFont, ...rest } = o;
            overlays.push({
                ...rest,
                fontBytes,
                fontName: stored?.fontName || rest.fontName || '',
            });
        }
    }

    return overlays;
}
