<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { trackEvent, trackSubirImagen } from '@/analytics';
import ImageUploader from '@/Components/EsquinaCut/ImageUploader.vue';
import CrossPromoBanner from '@/Components/EsquinaImg/CrossPromoBanner.vue';
import ResizeHandles from '@/Components/EsquinaImg/ResizeHandles.vue';
import DraftRestoreBanner from '@/Pages/EsquinaPdf/components/DraftRestoreBanner.vue';
import { clearImgDraft, loadImgDraft, packImgDraft, saveImgDraft } from '@/Pages/EsquinaImg/imgDraftStore';

const props = defineProps({
    siblings: {
        type: Object,
        default: () => ({
            block: 'https://esquinaweb.com/esquinablock/',
            cut: 'https://esquinaweb.com/esquinacut/',
            qr: 'https://esquinaweb.com/esquinaqr/',
            pdf: 'https://esquinaweb.com/esquinapdf/',
        }),
    },
});

const MAX_FILES = 40;
const WARN_BYTES = 30 * 1024 * 1024;
/** Tope de seguridad por lado al redimensionar (evita saturar memoria). */
const MAX_DIMENSION = 8192;
/** Lado máximo de la vista previa en vivo (rápida; el proceso final usa resolución completa). */
const LIVE_PREVIEW_MAX_EDGE = 1200;
const LIVE_PREVIEW_DEBOUNCE_MS = 350;

const FORMAT_MIME = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
};

/** @type {import('vue').Ref<Array>} */
const items = ref([]);
const error = ref('');
const busy = ref(false);
const zipBusy = ref(false);
const progress = ref(0);

/** Imagen usada en la comparación Antes / Después. */
const previewItemId = ref(null);
const liveBusy = ref(false);
const liveError = ref('');
/** True mientras se arrastran las asas de tamaño (pausa la vista previa en vivo). */
const resizeDragging = ref(false);
/** Empuja al banner flotante a reaparecer tras cada proceso. */
const crossPromoNudge = ref(0);
const livePreview = reactive({
    url: '',
    bytes: null,
    format: '',
    quality: null,
    width: null,
    height: null,
});

const options = reactive({
    format: 'webp', // jpg | png | webp
    quality: 80,
    width: '',
    height: '',
    keepAspect: true,
    /** Si true: todas las imágenes salen con el mismo ancho×alto exactos (puede estirar). */
    exactSameSize: false,
});

let nextId = 1;
let livePreviewTimer = null;
let livePreviewSeq = 0;
let saveTimer = null;
let skipSave = false;

/** @type {import('vue').Ref<object|null>} */
const restoreOffer = ref(null);

const draftSummary = computed(() => {
    const draft = restoreOffer.value;
    if (!draft?.items?.length) return '';
    const n = draft.items.length;
    const processed = draft.items.filter((i) => i.resultBlob).length;
    const fmt = (draft.options?.format || 'webp').toUpperCase();
    const parts = [
        `${n} imagen${n === 1 ? '' : 'es'}`,
        `formato ${fmt}`,
    ];
    if (processed) {
        parts.push(`${processed} ya procesada${processed === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
});

const canProcess = computed(() => items.value.length >= 1 && !busy.value && !zipBusy.value);
const canDownloadAll = computed(() => items.value.some((i) => i.resultBlob) && !busy.value && !zipBusy.value);
const readyCount = computed(() => items.value.filter((i) => i.resultBlob).length);
const showQuality = computed(() => options.format === 'jpg' || options.format === 'webp');

const previewItem = computed(() =>
    items.value.find((i) => i.id === previewItemId.value) || items.value[0] || null,
);

const liveSavingsPercent = computed(() => {
    if (!previewItem.value || livePreview.bytes == null || !previewItem.value.originalBytes) return null;
    return Math.round((1 - livePreview.bytes / previewItem.value.originalBytes) * 100);
});

/** Dimensiones finales de la muestra (sin el tope de vista previa). */
const previewTargetSize = computed(() => {
    const item = previewItem.value;
    if (!item?.width || !item?.height) return null;
    return resolveTargetSize(item.width, item.height, options);
});

const hasBatchResize = computed(() => items.value.length > 1);

const batchResizeHint = computed(() => {
    if (!items.value.length) return '';
    const n = items.value.length;
    const w = parsePositiveInt(options.width);
    const h = parsePositiveInt(options.height);
    if (!w && !h) {
        return n > 1
            ? `Sin tamaño: cada una de las ${n} imágenes conserva sus píxeles originales.`
            : '';
    }
    if (options.exactSameSize && w && h) {
        return `Al procesar, las ${n} imágenes saldrán a ${w}×${h} px exactos.`;
    }
    if (options.keepAspect && w && h) {
        return n > 1
            ? `Al procesar, cada imagen se ajusta dentro de ${w}×${h} px (puede variar un lado según su forma).`
            : `Salida dentro de ${w}×${h} px manteniendo proporción.`;
    }
    if (options.keepAspect && (w || h)) {
        return n > 1
            ? `Al procesar, las ${n} imágenes usarán el mismo ${w ? 'ancho' : 'alto'}; el otro lado se calcula por imagen.`
            : '';
    }
    if (w && h) {
        return n > 1
            ? `Al procesar, las ${n} imágenes se estirarán a ${w}×${h} px.`
            : `Salida a ${w}×${h} px.`;
    }
    return n > 1
        ? `Estas medidas se aplican a las ${n} imágenes al pulsar Comprimir / convertir.`
        : '';
});

const processedCount = computed(() => items.value.filter((i) => i.resultBlob).length);

const siblingLinks = computed(() => ({
    block: props.siblings?.block || 'https://esquinaweb.com/esquinablock/',
    cut: props.siblings?.cut || 'https://esquinaweb.com/esquinacut/',
    qr: props.siblings?.qr || 'https://esquinaweb.com/esquinaqr/',
    pdf: props.siblings?.pdf || 'https://esquinaweb.com/esquinapdf/',
}));

/** Promo flotante: al subir o al tener resultados. */
const showCrossPromo = computed(() => items.value.length > 0);

const totalOriginalBytes = computed(() =>
    items.value.reduce((sum, i) => sum + (i.originalBytes || 0), 0),
);

const totalResultBytes = computed(() =>
    items.value.reduce((sum, i) => sum + (i.resultBytes || 0), 0),
);

const savingsPercent = computed(() => {
    if (!processedCount.value || !totalOriginalBytes.value) return null;
    const saved = 1 - totalResultBytes.value / totalOriginalBytes.value;
    return Math.round(saved * 100);
});

function formatSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const INPUT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/avif,image/jfif,.jfif,.avif';
const INPUT_FORMATS_HINT = 'JPG, PNG, WebP, AVIF o JFIF';

function isAcceptedImage(file) {
    return (
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/jfif'].includes(file.type)
        || /\.(jpe?g|jfif|png|webp|avif)$/i.test(file.name)
    );
}

function readImageSize(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
        });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = src;
    });
}

/**
 * @param {Blob|File} source
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(source) {
    return new Promise((resolve, reject) => {
        const url = source instanceof Blob ? URL.createObjectURL(source) : String(source);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer la imagen'));
        };
        img.src = url;
    });
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} mime
 * @param {number} quality01
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, mime, quality01) {
    return new Promise((resolve, reject) => {
        const args = mime === 'image/png' ? [mime] : [mime, quality01];
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error(`El navegador no pudo exportar ${mime}`))),
            ...args,
        );
    });
}

function resultFileName(originalName, format) {
    const base = originalName.replace(/\.[^.]+$/, '') || 'imagen';
    const ext = format === 'jpg' ? 'jpg' : format;
    return `${base}.${ext}`;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parsePositiveInt(value) {
    if (value === '' || value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(MAX_DIMENSION, Math.round(n));
}

/**
 * @param {number} srcW
 * @param {number} srcH
 * @param {number|null|undefined} maxEdge
 */
function fitWithin(srcW, srcH, maxEdge) {
    if (!maxEdge || (srcW <= maxEdge && srcH <= maxEdge)) {
        return { width: srcW, height: srcH };
    }
    const scale = maxEdge / Math.max(srcW, srcH);
    return {
        width: Math.max(1, Math.round(srcW * scale)),
        height: Math.max(1, Math.round(srcH * scale)),
    };
}

/**
 * Calcula el tamaño de salida según ancho/alto y proporción.
 * @param {number} srcW
 * @param {number} srcH
 * @param {{ width?: unknown, height?: unknown, keepAspect?: boolean, exactSameSize?: boolean }} opts
 */
function resolveTargetSize(srcW, srcH, opts) {
    const reqW = parsePositiveInt(opts.width);
    const reqH = parsePositiveInt(opts.height);

    if (!reqW && !reqH) {
        return { width: srcW, height: srcH };
    }

    // Mismo tamaño exacto para el lote: fuerza W×H en todas (estirar si hace falta).
    if (opts.exactSameSize && reqW && reqH) {
        return { width: reqW, height: reqH };
    }

    const keep = opts.keepAspect !== false;

    if (keep) {
        if (reqW && reqH) {
            // Encaja dentro de la caja (puede ampliar o reducir).
            const scale = Math.min(reqW / srcW, reqH / srcH);
            return {
                width: Math.max(1, Math.round(srcW * scale)),
                height: Math.max(1, Math.round(srcH * scale)),
            };
        }
        if (reqW) {
            const scale = reqW / srcW;
            return {
                width: reqW,
                height: Math.max(1, Math.round(srcH * scale)),
            };
        }
        const scale = reqH / srcH;
        return {
            width: Math.max(1, Math.round(srcW * scale)),
            height: reqH,
        };
    }

    return {
        width: reqW || srcW,
        height: reqH || srcH,
    };
}

/**
 * Comprime / convierte / redimensiona con Canvas.
 * @param {{ file: File, name: string }} item
 * @param {{ format: string, quality: number, width?: unknown, height?: unknown, keepAspect?: boolean }} opts
 * @param {{ maxEdge?: number|null }} [render]
 */
async function processItem(item, opts, render = {}) {
    const mime = FORMAT_MIME[opts.format] || FORMAT_MIME.webp;
    const quality01 = Math.min(1, Math.max(0.1, (Number(opts.quality) || 80) / 100));

    const img = await loadImage(item.file);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) {
        throw new Error(`Sin dimensiones: ${item.name}`);
    }

    let { width, height } = resolveTargetSize(srcW, srcH, opts);
    ({ width, height } = fitWithin(width, height, render.maxEdge ?? null));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // JPG no soporta alpha: fondo blanco para PNG/WebP con transparencia.
    if (mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, mime, quality01);
    canvas.width = canvas.height = 0;

    return {
        blob,
        bytes: blob.size,
        name: resultFileName(item.name, opts.format),
        width,
        height,
    };
}

function currentProcessOpts() {
    const format = FORMAT_MIME[options.format] ? options.format : 'webp';
    const quality = Math.min(100, Math.max(10, Number(options.quality) || 80));
    return {
        format,
        quality,
        width: options.width,
        height: options.height,
        keepAspect: options.keepAspect,
        exactSameSize: options.exactSameSize,
    };
}

function onExactSameSizeToggle() {
    options.exactSameSize = !options.exactSameSize;
    if (!options.exactSameSize) return;

    // Para forzar el mismo tamaño hace falta ancho y alto.
    options.keepAspect = false;
    const item = previewItem.value;
    if (!parsePositiveInt(options.width) && item?.width) {
        options.width = String(item.width);
    }
    if (!parsePositiveInt(options.height) && item?.height) {
        options.height = String(item.height);
    }
}

function toggleKeepAspect() {
    if (options.exactSameSize) return;
    options.keepAspect = !options.keepAspect;
}

function onKeepAspectFromHandles(value) {
    if (options.exactSameSize) {
        // Si el usuario pone el candado desde el panel, sale del modo “mismo tamaño exacto”.
        options.exactSameSize = false;
    }
    options.keepAspect = value;
}

function clearLivePreview() {
    if (livePreviewTimer) {
        clearTimeout(livePreviewTimer);
        livePreviewTimer = null;
    }
    livePreviewSeq += 1;
    if (livePreview.url) URL.revokeObjectURL(livePreview.url);
    livePreview.url = '';
    livePreview.bytes = null;
    livePreview.format = '';
    livePreview.quality = null;
    livePreview.width = null;
    livePreview.height = null;
    liveBusy.value = false;
    liveError.value = '';
}

function revokeAll() {
    clearLivePreview();
    items.value.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    });
}

onBeforeUnmount(() => {
    if (saveTimer) clearTimeout(saveTimer);
    revokeAll();
});

function selectPreviewItem(id) {
    previewItemId.value = id;
}

async function runLivePreview() {
    const item = previewItem.value;
    if (!item || busy.value) {
        if (!item) clearLivePreview();
        return;
    }

    const seq = ++livePreviewSeq;
    liveBusy.value = true;
    liveError.value = '';

    try {
        const result = await processItem(
            item,
            currentProcessOpts(),
            { maxEdge: LIVE_PREVIEW_MAX_EDGE },
        );
        if (seq !== livePreviewSeq) {
            return;
        }
        if (livePreview.url) URL.revokeObjectURL(livePreview.url);
        livePreview.url = URL.createObjectURL(result.blob);
        livePreview.bytes = result.bytes;
        livePreview.format = options.format;
        livePreview.quality = options.quality;
        livePreview.width = result.width;
        livePreview.height = result.height;
    } catch (err) {
        if (seq !== livePreviewSeq) return;
        console.error(err);
        liveError.value = 'No se pudo generar la vista previa.';
    } finally {
        if (seq === livePreviewSeq) liveBusy.value = false;
    }
}

function scheduleLivePreview() {
    if (livePreviewTimer) clearTimeout(livePreviewTimer);
    if (!previewItem.value || busy.value || resizeDragging.value) return;
    liveBusy.value = true;
    livePreviewTimer = setTimeout(() => {
        livePreviewTimer = null;
        runLivePreview();
    }, LIVE_PREVIEW_DEBOUNCE_MS);
}

function onResizeDragging(active) {
    resizeDragging.value = active;
    if (!active) {
        scheduleLivePreview();
    }
}

/**
 * Con candado (como GIMP): al editar un lado, el otro sigue la proporción de la muestra.
 * @param {Event} event
 */
function onWidthInput(event) {
    const raw = /** @type {HTMLInputElement} */ (event.target).value;
    options.width = raw;
    if (!options.keepAspect || raw === '') return;
    const item = previewItem.value;
    if (!item?.width || !item?.height) return;
    const w = parsePositiveInt(raw);
    if (!w) return;
    options.height = String(
        Math.max(1, Math.min(MAX_DIMENSION, Math.round((w * item.height) / item.width))),
    );
}

/**
 * @param {Event} event
 */
function onHeightInput(event) {
    const raw = /** @type {HTMLInputElement} */ (event.target).value;
    options.height = raw;
    if (!options.keepAspect || raw === '') return;
    const item = previewItem.value;
    if (!item?.width || !item?.height) return;
    const h = parsePositiveInt(raw);
    if (!h) return;
    options.width = String(
        Math.max(1, Math.min(MAX_DIMENSION, Math.round((h * item.width) / item.height))),
    );
}

watch(
    () => [
        previewItem.value?.id,
        options.format,
        options.quality,
        options.width,
        options.height,
        options.keepAspect,
        options.exactSameSize,
        items.value.length,
        busy.value,
        resizeDragging.value,
    ],
    () => {
        if (busy.value || resizeDragging.value) return;
        if (!previewItem.value) {
            clearLivePreview();
            return;
        }
        if (previewItemId.value == null) {
            previewItemId.value = previewItem.value.id;
        }
        scheduleLivePreview();
    },
);

async function onSelectFiles(files) {
    error.value = '';
    const images = files.filter(isAcceptedImage);
    if (!images.length) {
        error.value = 'Solo se aceptan JPG, PNG, WebP, AVIF o JFIF.';
        return;
    }

    const room = MAX_FILES - items.value.length;
    if (room <= 0) {
        error.value = `Máximo ${MAX_FILES} imágenes.`;
        return;
    }

    const accepted = images.slice(0, room);
    const largeNames = [];
    const added = [];

    for (const file of accepted) {
        if (file.size > WARN_BYTES) {
            largeNames.push(file.name);
        }
        const previewUrl = URL.createObjectURL(file);
        const dims = await readImageSize(previewUrl);
        added.push({
            id: nextId++,
            file,
            name: file.name,
            mime: file.type || 'image/jpeg',
            originalBytes: file.size,
            width: dims.width,
            height: dims.height,
            previewUrl,
            large: file.size > WARN_BYTES,
            resultBlob: null,
            resultBytes: null,
            resultUrl: null,
            resultName: '',
            resultWidth: null,
            resultHeight: null,
        });
    }

    const messages = [];
    if (largeNames.length) {
        messages.push(
            `Aviso: ${largeNames.length === 1 ? 'esta imagen supera' : 'estas imágenes superan'} 30 MB y pueden saturar la memoria del navegador: ${largeNames.join(', ')}.`,
        );
    }
    if (images.length > room) {
        messages.push(`Solo cabían ${room} más (máximo ${MAX_FILES}).`);
    }
    if (messages.length) error.value = messages.join(' ');

    if (added.length) {
        items.value = [...items.value, ...added];
        if (previewItemId.value == null) {
            previewItemId.value = added[0].id;
        }
        trackSubirImagen('img', added.length);
    }
}

function removeAt(index) {
    const [removed] = items.value.splice(index, 1);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    if (removed?.resultUrl) URL.revokeObjectURL(removed.resultUrl);
    items.value = [...items.value];
    if (removed && removed.id === previewItemId.value) {
        previewItemId.value = items.value[0]?.id ?? null;
    }
}

function clearAll() {
    revokeAll();
    items.value = [];
    previewItemId.value = null;
    error.value = '';
    progress.value = 0;
    clearImgDraft();
}

function scheduleSave() {
    if (skipSave || restoreOffer.value || busy.value || zipBusy.value || resizeDragging.value) {
        return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (skipSave || restoreOffer.value) return;
        try {
            if (!items.value.length) {
                await clearImgDraft();
                return;
            }
            const packed = packImgDraft(items.value, options, previewItemId.value);
            if (!packed.items.length) {
                await clearImgDraft();
                return;
            }
            await saveImgDraft(packed);
        } catch {
            /* ignore */
        }
    }, 800);
}

watch(
    [items, options, previewItemId],
    () => scheduleSave(),
    { deep: true },
);

// Al terminar proceso o ZIP, guardar el estado final.
watch([busy, zipBusy], ([isBusy, isZip]) => {
    if (!isBusy && !isZip) scheduleSave();
});

async function acceptRestore() {
    const draft = restoreOffer.value;
    if (!draft?.items?.length) return;
    skipSave = true;
    restoreOffer.value = null;
    try {
        revokeAll();
        const restored = [];
        for (const row of draft.items) {
            if (!row.fileBlob) continue;
            const file = new File(
                [row.fileBlob],
                row.name || 'imagen',
                { type: row.mime || row.fileBlob.type || 'image/jpeg' },
            );
            const previewUrl = URL.createObjectURL(file);
            const resultBlob = row.resultBlob instanceof Blob ? row.resultBlob : null;
            restored.push({
                id: nextId++,
                file,
                name: file.name,
                mime: file.type || 'image/jpeg',
                originalBytes: row.originalBytes ?? file.size,
                width: row.width || 0,
                height: row.height || 0,
                previewUrl,
                large: !!row.large || file.size > WARN_BYTES,
                resultBlob,
                resultBytes: resultBlob ? (row.resultBytes ?? resultBlob.size) : null,
                resultUrl: resultBlob ? URL.createObjectURL(resultBlob) : null,
                resultName: row.resultName || '',
                resultWidth: row.resultWidth ?? null,
                resultHeight: row.resultHeight ?? null,
            });
        }
        items.value = restored;

        if (draft.options) {
            options.format = draft.options.format || 'webp';
            options.quality = Number(draft.options.quality) || 80;
            options.width = draft.options.width ?? '';
            options.height = draft.options.height ?? '';
            options.keepAspect = draft.options.keepAspect !== false;
            options.exactSameSize = !!draft.options.exactSameSize;
        }

        const wantedId = draft.previewItemId;
        previewItemId.value = restored.some((i) => i.id === wantedId)
            ? wantedId
            : (restored[0]?.id ?? null);
        error.value = '';
    } finally {
        skipSave = false;
        scheduleSave();
    }
}

async function dismissRestore() {
    restoreOffer.value = null;
    await clearImgDraft();
}

onMounted(async () => {
    const draft = await loadImgDraft();
    if (draft?.items?.length) {
        restoreOffer.value = draft;
    }
});

/**
 * Evita nombres duplicados dentro del ZIP (foto.webp, foto-2.webp, …).
 * @param {string} name
 * @param {Set<string>} used
 */
function uniqueZipName(name, used) {
    const safe = (name || 'imagen').replace(/[\\/:*?"<>|]+/g, '_');
    if (!used.has(safe.toLowerCase())) {
        used.add(safe.toLowerCase());
        return safe;
    }
    const dot = safe.lastIndexOf('.');
    const base = dot > 0 ? safe.slice(0, dot) : safe;
    const ext = dot > 0 ? safe.slice(dot) : '';
    let n = 2;
    let candidate = `${base}-${n}${ext}`;
    while (used.has(candidate.toLowerCase())) {
        n += 1;
        candidate = `${base}-${n}${ext}`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
}

function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadOne(item) {
    if (!item?.resultBlob) return;
    const name = item.resultName || 'imagen';
    triggerBlobDownload(item.resultBlob, name);
    trackEvent('file_download', {
        tool: 'img',
        file_name: name,
        file_extension: options.format,
    });
}

async function onProcess() {
    if (!canProcess.value) return;
    error.value = '';

    if (!items.value.length) {
        error.value = 'Sube al menos una imagen para procesar.';
        return;
    }

    const widthRaw = options.width;
    const heightRaw = options.height;
    const widthSet = widthRaw !== '' && widthRaw != null;
    const heightSet = heightRaw !== '' && heightRaw != null;
    const w = parsePositiveInt(widthRaw);
    const h = parsePositiveInt(heightRaw);

    if (widthSet && !w) {
        error.value = `El ancho debe ser un entero entre 1 y ${MAX_DIMENSION}.`;
        return;
    }
    if (heightSet && !h) {
        error.value = `El alto debe ser un entero entre 1 y ${MAX_DIMENSION}.`;
        return;
    }

    if (options.exactSameSize && (!w || !h)) {
        error.value = 'Para el mismo tamaño en todas, indica ancho y alto en píxeles.';
        return;
    }

    if (!FORMAT_MIME[options.format]) {
        error.value = 'Elige un formato de salida válido: JPG, PNG o WebP.';
        return;
    }

    busy.value = true;
    progress.value = 0;

    const opts = currentProcessOpts();
    const failures = [];

    try {
        for (let i = 0; i < items.value.length; i += 1) {
            const item = items.value[i];
            try {
                const result = await processItem(item, opts);
                if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
                item.resultBlob = result.blob;
                item.resultBytes = result.bytes;
                item.resultName = result.name;
                item.resultWidth = result.width;
                item.resultHeight = result.height;
                item.resultUrl = URL.createObjectURL(result.blob);
            } catch (err) {
                failures.push(item.name);
                console.error(err);
            }
            progress.value = Math.round(((i + 1) / items.value.length) * 100);
            // Liberar el hilo para que la UI actualice la barra.
            await new Promise((r) => setTimeout(r, 0));
        }

        items.value = [...items.value];

        const ok = items.value.filter((i) => i.resultBlob).length;
        trackEvent('process_image', {
            tool: 'img',
            image_count: ok,
            output_format: opts.format,
            quality: opts.quality,
            resize_width: parsePositiveInt(opts.width) || 0,
            resize_height: parsePositiveInt(opts.height) || 0,
            keep_aspect: opts.keepAspect ? 1 : 0,
            exact_same_size: opts.exactSameSize ? 1 : 0,
        });

        if (failures.length) {
            error.value = `No se pudieron procesar ${failures.length}: ${failures.join(', ')}.`;
        } else if (!ok) {
            error.value = 'No se pudo procesar ninguna imagen.';
        } else {
            crossPromoNudge.value += 1;
        }
    } finally {
        busy.value = false;
        if (progress.value < 100 && !failures.length) progress.value = 100;
    }
}

async function onDownloadAll() {
    if (!canDownloadAll.value) return;
    const ready = items.value.filter((i) => i.resultBlob);
    if (!ready.length) return;

    // Una sola imagen: descarga directa (sin ZIP).
    if (ready.length === 1) {
        downloadOne(ready[0]);
        return;
    }

    error.value = '';
    zipBusy.value = true;
    progress.value = 0;

    try {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        const used = new Set();

        for (let i = 0; i < ready.length; i += 1) {
            const item = ready[i];
            const name = uniqueZipName(item.resultName || `imagen-${i + 1}`, used);
            zip.file(name, item.resultBlob);
            progress.value = Math.round(((i + 1) / ready.length) * 40);
            await new Promise((r) => setTimeout(r, 0));
        }

        const blob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            (meta) => {
                progress.value = 40 + Math.round((meta.percent || 0) * 0.6);
            },
        );

        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const zipName = `esquinaimg-${stamp}.zip`;
        triggerBlobDownload(blob, zipName);

        trackEvent('file_download', {
            tool: 'img',
            file_name: zipName,
            file_extension: 'zip',
            image_count: ready.length,
        });
        progress.value = 100;
    } catch (err) {
        console.error(err);
        error.value = 'No se pudo crear el ZIP. Prueba a descargar las imágenes una a una.';
    } finally {
        zipBusy.value = false;
    }
}
</script>

<template>
    <div class="mx-auto max-w-6xl px-4 pb-16">
        <DraftRestoreBanner
            v-if="restoreOffer"
            :saved-at="restoreOffer.savedAt || 0"
            :summary="draftSummary"
            @restore="acceptRestore"
            @dismiss="dismissRestore"
        />

        <p
            v-if="error"
            class="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
            role="status"
        >
            {{ error }}
        </p>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <!-- 1 · Imágenes -->
            <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div class="mb-4 flex items-center justify-between gap-3">
                    <h2 class="flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">1</span>
                        {{ items.length ? 'Tus imágenes' : 'Sube tus imágenes' }}
                    </h2>
                    <button
                        v-if="items.length"
                        type="button"
                        class="text-sm font-medium text-red-700 hover:underline disabled:text-slate-400"
                        :disabled="busy"
                        @click="clearAll"
                    >
                        Empezar de nuevo
                    </button>
                </div>

                <ImageUploader
                    :count="items.length"
                    :max="MAX_FILES"
                    :disabled="busy || items.length >= MAX_FILES"
                    :accept="INPUT_ACCEPT"
                    :formats-hint="INPUT_FORMATS_HINT"
                    @select="onSelectFiles"
                />

                <p class="mt-2 text-xs text-slate-500">
                    {{ INPUT_FORMATS_HINT }} · hasta {{ MAX_FILES }} · aviso si alguna supera 30 MB · salida JPG, PNG o WebP
                </p>

                <ul
                    v-if="items.length"
                    class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
                >
                    <li
                        v-for="(item, index) in items"
                        :key="item.id"
                        class="relative overflow-hidden rounded-xl border bg-slate-50 transition ring-offset-2"
                        :class="[
                            item.large ? 'border-amber-400' : 'border-slate-200',
                            previewItem?.id === item.id ? 'ring-2 ring-blue-500' : 'hover:border-blue-300',
                        ]"
                    >
                        <button
                            type="button"
                            class="absolute inset-0 z-0 cursor-pointer"
                            :disabled="busy"
                            :aria-pressed="previewItem?.id === item.id"
                            :aria-label="`Vista previa: ${item.name}`"
                            @click="selectPreviewItem(item.id)"
                        />
                        <div class="relative z-10 aspect-square pointer-events-none bg-slate-100">
                            <img
                                :src="item.resultUrl || item.previewUrl"
                                :alt="item.name"
                                class="h-full w-full object-cover"
                            />
                        </div>
                        <span
                            v-if="item.large"
                            class="absolute left-1.5 top-1.5 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        >
                            &gt;30 MB
                        </span>
                        <button
                            type="button"
                            class="absolute right-1.5 top-1.5 z-20 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white disabled:opacity-40"
                            :disabled="busy"
                            aria-label="Quitar imagen"
                            @click="removeAt(index)"
                        >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                        <div class="relative z-10 space-y-0.5 p-2 text-[11px] text-slate-600">
                            <p class="truncate font-medium text-slate-900" :title="item.resultName || item.name">
                                {{ item.resultName || item.name }}
                            </p>
                            <p>
                                {{ item.width && item.height ? `${item.width} x ${item.height}` : '—' }}
                                · {{ formatSize(item.originalBytes) }}
                            </p>
                            <p v-if="item.resultBytes != null" class="font-medium text-emerald-800">
                                →
                                <template v-if="item.resultWidth && item.resultHeight">
                                    {{ item.resultWidth }} x {{ item.resultHeight }} ·
                                </template>
                                {{ formatSize(item.resultBytes) }}
                                <span
                                    v-if="item.originalBytes"
                                    class="font-normal text-emerald-700"
                                >
                                    ({{ Math.round((1 - item.resultBytes / item.originalBytes) * 100) }}%)
                                </span>
                            </p>
                            <p v-else class="text-slate-400">Sin procesar</p>
                            <button
                                v-if="item.resultBlob"
                                type="button"
                                class="mt-1 font-semibold text-blue-700 hover:underline disabled:opacity-40"
                                :disabled="busy"
                                @click="downloadOne(item)"
                            >
                                Descargar
                            </button>
                        </div>
                    </li>
                </ul>

                <p
                    v-else
                    class="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
                >
                    Arrastra o elige archivos para ver miniaturas y el peso de cada una.
                </p>

                <!-- Redimensionado visual (área grande, fuera del lateral estrecho) -->
                <ResizeHandles
                    v-if="previewItem"
                    class="mt-6"
                    layout="spacious"
                    :src="previewItem.previewUrl"
                    :natural-width="previewItem.width"
                    :natural-height="previewItem.height"
                    :width="options.width"
                    :height="options.height"
                    :keep-aspect="options.keepAspect"
                    :max-dimension="MAX_DIMENSION"
                    :disabled="busy"
                    @update:width="options.width = $event"
                    @update:height="options.height = $event"
                    @update:keep-aspect="onKeepAspectFromHandles"
                    @dragging="onResizeDragging"
                />
            </section>

            <aside class="space-y-4 lg:sticky lg:top-6">
                <!-- 2 · Opciones -->
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">2</span>
                        Opciones
                    </h2>

                    <label class="block text-sm font-medium text-slate-700">
                        Formato de salida
                        <select
                            v-model="options.format"
                            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            :disabled="busy"
                        >
                            <option value="jpg">JPG</option>
                            <option value="png">PNG</option>
                            <option value="webp">WebP</option>
                        </select>
                    </label>

                    <label v-if="showQuality" class="mt-3 block text-sm font-medium text-slate-700">
                        Calidad ({{ options.quality }}%)
                        <input
                            v-model.number="options.quality"
                            type="range"
                            min="10"
                            max="100"
                            step="1"
                            class="mt-1 w-full"
                            :disabled="busy"
                        />
                    </label>

                    <!-- Vista previa Antes / Después -->
                    <div
                        v-if="previewItem"
                        class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                        <div class="mb-2 flex items-center justify-between gap-2">
                            <p class="text-xs font-semibold text-slate-800">Vista previa</p>
                            <p class="truncate text-[11px] text-slate-500" :title="previewItem.name">
                                {{ previewItem.name }}
                            </p>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <figure class="min-w-0">
                                <div class="aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                                    <img
                                        :src="previewItem.previewUrl"
                                        alt="Original"
                                        class="h-full w-full object-contain"
                                    />
                                </div>
                                <figcaption class="mt-1 text-center text-[10px] text-slate-600">
                                    Original · {{ formatSize(previewItem.originalBytes) }}
                                </figcaption>
                            </figure>
                            <figure class="min-w-0">
                                <div class="relative aspect-square overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                                    <img
                                        v-if="livePreview.url"
                                        :src="livePreview.url"
                                        alt="Comprimida"
                                        class="h-full w-full object-contain"
                                    />
                                    <div
                                        v-else
                                        class="grid h-full place-items-center px-2 text-center text-[11px] text-slate-400"
                                    >
                                        {{ liveBusy ? 'Generando…' : 'Ajusta calidad o formato' }}
                                    </div>
                                    <span
                                        v-if="liveBusy"
                                        class="absolute inset-x-0 bottom-0 bg-white/80 py-0.5 text-center text-[10px] font-medium text-slate-700"
                                    >
                                        Actualizando…
                                    </span>
                                </div>
                                <figcaption class="mt-1 text-center text-[10px] leading-snug text-slate-600">
                                    <template v-if="livePreview.bytes != null">
                                        <template v-if="previewTargetSize">
                                            {{ previewTargetSize.width }} x {{ previewTargetSize.height }}
                                            ·
                                        </template>
                                        {{ options.format.toUpperCase() }}
                                        <template v-if="showQuality"> {{ options.quality }}%</template>
                                        · {{ formatSize(livePreview.bytes) }}
                                        <span v-if="liveSavingsPercent !== null" class="text-emerald-700">
                                            ({{ liveSavingsPercent }}%)
                                        </span>
                                    </template>
                                    <template v-else>—</template>
                                </figcaption>
                            </figure>
                        </div>
                        <p v-if="liveError" class="mt-2 text-[11px] text-red-700">{{ liveError }}</p>
                        <p class="mt-2 text-[10px] leading-snug text-slate-500">
                            Comparación visual (hasta {{ LIVE_PREVIEW_MAX_EDGE }}px). El peso final a resolución completa puede variar. Haz clic en una miniatura para cambiar la muestra.
                        </p>
                    </div>

                    <!-- Ancho — candado — Alto (estilo GIMP) -->
                    <div class="mt-3 flex items-end gap-1.5">
                        <label class="min-w-0 flex-1 block text-sm font-medium text-slate-700">
                            Ancho (px)
                            <input
                                :value="options.width"
                                type="number"
                                min="1"
                                :max="MAX_DIMENSION"
                                placeholder="Auto"
                                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                :disabled="busy"
                                @input="onWidthInput"
                            />
                        </label>

                        <button
                            type="button"
                            class="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-40"
                            :class="options.keepAspect
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400'"
                            :disabled="busy || options.exactSameSize"
                            :aria-pressed="options.keepAspect"
                            :title="options.exactSameSize
                                ? 'Desactiva “mismo tamaño” para usar el candado'
                                : (options.keepAspect ? 'Candado: proporción fija' : 'Candado abierto: libre')"
                            @click="toggleKeepAspect"
                        >
                            <svg
                                v-if="options.keepAspect"
                                class="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V7a4.5 4.5 0 1 0-9 0v3.5M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                            </svg>
                            <svg
                                v-else
                                class="h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                aria-hidden="true"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V7a4.5 4.5 0 0 0-8.66-1.7M6.75 10.5h10.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-7.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                            </svg>
                        </button>

                        <label class="min-w-0 flex-1 block text-sm font-medium text-slate-700">
                            Alto (px)
                            <input
                                :value="options.height"
                                type="number"
                                min="1"
                                :max="MAX_DIMENSION"
                                placeholder="Auto"
                                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                :disabled="busy"
                                @input="onHeightInput"
                            />
                        </label>
                    </div>

                    <p
                        class="mt-2 text-xs font-medium"
                        :class="options.exactSameSize
                            ? 'text-indigo-800'
                            : (options.keepAspect ? 'text-blue-800' : 'text-slate-600')"
                    >
                        <template v-if="options.exactSameSize">
                            Mismo tamaño exacto para todas · puede estirar
                        </template>
                        <template v-else>
                            {{ options.keepAspect ? 'Candado cerrado · escala uniforme' : 'Candado abierto · estira a gusto' }}
                        </template>
                    </p>

                    <label
                        v-if="hasBatchResize || options.exactSameSize"
                        class="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm"
                        :class="options.exactSameSize
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-950'
                            : 'border-slate-200 bg-slate-50 text-slate-800'"
                    >
                        <input
                            type="checkbox"
                            class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            :checked="options.exactSameSize"
                            :disabled="busy"
                            @change="onExactSameSizeToggle"
                        />
                        <span>
                            <span class="font-semibold">Mismo ancho y alto para todas</span>
                            <span class="mt-0.5 block text-xs font-normal opacity-90">
                                Las {{ items.length || '' }} imágenes salen con el tamaño exacto indicado
                                (si una es más ancha o alta, se estira). Desactiva el candado automáticamente.
                            </span>
                        </span>
                    </label>

                    <p
                        v-if="batchResizeHint"
                        class="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium leading-snug text-slate-800"
                    >
                        {{ batchResizeHint }}
                    </p>

                    <p
                        v-if="previewTargetSize"
                        class="mt-2 text-xs font-medium text-slate-700"
                    >
                        Muestra:
                        {{ previewTargetSize.width }} x {{ previewTargetSize.height }} px
                        <span
                            v-if="previewItem && (previewTargetSize.width !== previewItem.width || previewTargetSize.height !== previewItem.height)"
                            class="font-normal text-slate-500"
                        >
                            (antes {{ previewItem.width }} x {{ previewItem.height }})
                        </span>
                    </p>

                    <p class="mt-2 text-xs text-slate-500">
                        El tamaño se aplica a todas al comprimir (no solo a la miniatura seleccionada). Vacío = original. Máx. {{ MAX_DIMENSION }}px.
                    </p>
                </section>

                <!-- 3 · Procesar / descargar -->
                <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <h2 class="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                        <span class="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">3</span>
                        Procesar
                    </h2>

                    <p class="mb-3 text-sm text-slate-600">
                        {{ items.length }} imagen{{ items.length === 1 ? '' : 'es' }}
                        <template v-if="items.length">
                            · {{ formatSize(totalOriginalBytes) }}
                        </template>
                        <template v-if="processedCount">
                            · {{ processedCount }} lista{{ processedCount === 1 ? '' : 's' }}
                        </template>
                    </p>

                    <p
                        v-if="savingsPercent !== null"
                        class="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
                    >
                        Ahorro del {{ savingsPercent }}%
                        ({{ formatSize(totalOriginalBytes) }} → {{ formatSize(totalResultBytes) }})
                    </p>

                    <button
                        type="button"
                        class="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        :disabled="!canProcess"
                        @click="onProcess"
                    >
                        <span v-if="busy">Procesando… {{ progress }}%</span>
                        <span v-else>
                            Comprimir / convertir
                            <template v-if="items.length > 1"> ({{ items.length }})</template>
                        </span>
                    </button>

                    <button
                        type="button"
                        class="mt-2 flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!canDownloadAll"
                        @click="onDownloadAll"
                    >
                        <span v-if="zipBusy">Creando ZIP… {{ progress }}%</span>
                        <span v-else-if="readyCount === 1">Descargar imagen</span>
                        <span v-else>Descargar todas (ZIP)<template v-if="readyCount"> · {{ readyCount }}</template></span>
                    </button>

                    <div
                        v-if="busy || zipBusy"
                        class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        :aria-valuenow="progress"
                        aria-valuemin="0"
                        aria-valuemax="100"
                    >
                        <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
                    </div>
                </section>
            </aside>
        </div>

        <CrossPromoBanner
            :active="showCrossPromo"
            :nudge="crossPromoNudge"
            :pdf-url="siblingLinks.pdf"
            :cut-url="siblingLinks.cut"
            :block-url="siblingLinks.block"
            :qr-url="siblingLinks.qr"
        />
    </div>
</template>
