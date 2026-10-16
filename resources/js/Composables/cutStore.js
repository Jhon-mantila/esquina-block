const DB_NAME = 'esquina-cut';
const DB_VERSION = 1;
const STORE = 'session';
const KEY = 'draft';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function clearCutDraft() {
    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        await txDone(tx);
        db.close();
    } catch {
        /* ignore */
    }
}

export async function getCutStorageBytes() {
    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        const record = await new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        await txDone(tx);
        db.close();
        if (!record?.files?.length) return 0;
        return record.files.reduce((sum, f) => sum + (f.blob?.size || 0), 0) + 2048;
    } catch {
        return 0;
    }
}

export function formatStorageBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Guarda borrador (blobs + settings). Omite demos.
 */
export async function saveCutDraft({ images, grid, border, page, isDemo }) {
    if (isDemo || !page?.persist) {
        await clearCutDraft();
        return;
    }
    if (!images?.length) {
        await clearCutDraft();
        return;
    }

    const files = await Promise.all(
        images.map(async (img) => ({
            name: img.name,
            type: img.file?.type || 'image/png',
            blob: img.file,
        })),
    );

    const record = {
        savedAt: Date.now(),
        grid: { cols: grid.cols, rows: grid.rows },
        border: { ...border },
        page: { ...page },
        files,
    };

    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record, KEY);
    await txDone(tx);
    db.close();
}

/**
 * Lee borrador si existe y no expiró.
 * @returns {Promise<null | { savedAt: number, grid, border, page, files: File[] }>}
 */
export async function loadCutDraft() {
    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(KEY);
        const record = await new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
        await txDone(tx);
        db.close();

        if (!record?.files?.length || !record.savedAt) return null;
        if (Date.now() - record.savedAt > TTL_MS) {
            await clearCutDraft();
            return null;
        }

        const files = record.files.map(
            (f) => new File([f.blob], f.name || 'imagen.png', { type: f.type || 'image/png' }),
        );

        return {
            savedAt: record.savedAt,
            grid: record.grid,
            border: record.border,
            page: record.page,
            files,
        };
    } catch {
        return null;
    }
}
