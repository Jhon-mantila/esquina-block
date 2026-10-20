const DB_NAME = 'esquina-img';
const DB_VERSION = 1;
const STORE = 'drafts';
const KEY = 'workspace';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Tope aprox. para no saturar la cuota del navegador. */
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

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

export async function clearImgDraft() {
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

/**
 * @param {object|null} record
 */
export async function saveImgDraft(record) {
    if (!record) {
        await clearImgDraft();
        return;
    }

    const payload = { ...record, savedAt: Date.now() };
    if (estimateRecordBytes(payload) > MAX_TOTAL_BYTES) {
        return;
    }

    try {
        const db = await openDb();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(payload, KEY);
        await txDone(tx);
        db.close();
    } catch {
        /* quota / private mode */
    }
}

/**
 * @returns {Promise<object|null>}
 */
export async function loadImgDraft() {
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

        if (!record?.savedAt || !Array.isArray(record.items) || !record.items.length) {
            return null;
        }
        if (Date.now() - record.savedAt > TTL_MS) {
            await clearImgDraft();
            return null;
        }
        return record;
    } catch {
        return null;
    }
}

/**
 * @param {Array} items
 * @param {object} options
 * @param {number|null} previewItemId
 */
export function packImgDraft(items, options, previewItemId) {
    return {
        previewItemId: previewItemId ?? null,
        options: {
            format: options.format,
            quality: options.quality,
            width: options.width,
            height: options.height,
            keepAspect: !!options.keepAspect,
            exactSameSize: !!options.exactSameSize,
        },
        items: items.map((item) => ({
            name: item.name,
            mime: item.mime || item.file?.type || 'image/jpeg',
            originalBytes: item.originalBytes,
            width: item.width,
            height: item.height,
            large: !!item.large,
            fileBlob: item.file instanceof Blob ? item.file : null,
            resultBlob: item.resultBlob instanceof Blob ? item.resultBlob : null,
            resultBytes: item.resultBytes ?? null,
            resultName: item.resultName || '',
            resultWidth: item.resultWidth ?? null,
            resultHeight: item.resultHeight ?? null,
        })).filter((row) => row.fileBlob),
    };
}
