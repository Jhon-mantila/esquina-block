import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

// Todas las medidas de papel y póster están en milímetros.
export const PAPER_SIZES = {
    a4: { label: 'A4', width: 210, height: 297 },
    letter: { label: 'Carta', width: 215.9, height: 279.4 },
};

export const MARGINS = {
    none: 0,
    small: 5,
    medium: 10,
};

// Más resolución no se nota al imprimir un póster y dispara el tamaño del PDF.
export const MAX_DPI = 200;

const MM_PER_INCH = 25.4;

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const formatMb = (bytes) => (bytes / 1024 / 1024).toLocaleString('es', { maximumFractionDigits: 1 });

/** Devuelve un mensaje de error en español, o null si el archivo es válido. */
export function validateFile(file) {
    const validType = file.type ? ACCEPTED_TYPES.includes(file.type) : ACCEPTED_EXTENSIONS.test(file.name);
    if (!validType) {
        return `«${file.name}» no es un formato admitido. Usa una imagen JPG, PNG o WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
        return `Tu imagen pesa ${formatMb(file.size)} MB y el máximo es ${formatMb(MAX_FILE_SIZE)} MB. Prueba a reducirla o exportarla como JPG.`;
    }
    return null;
}

/** Calidad de impresión según los píxeles de la imagen por pulgada de papel. */
export function printQuality(dpi) {
    if (dpi >= 150) return { level: 'high', label: 'Alta' };
    if (dpi >= 100) return { level: 'medium', label: 'Buena' };
    if (dpi >= 60) return { level: 'low', label: 'Baja' };
    return { level: 'very-low', label: 'Muy baja' };
}

/**
 * Calcula cómo encaja la imagen en la cuadrícula de hojas y qué parte de la
 * imagen va en cada hoja. No toca el DOM, así que se puede probar en Node.
 */
export function computeLayout(imageWidth, imageHeight, settings) {
    const paper = PAPER_SIZES[settings.paper];
    const landscape = settings.orientation === 'landscape';
    const pageWidth = landscape ? paper.height : paper.width;
    const pageHeight = landscape ? paper.width : paper.height;

    const margin = MARGINS[settings.margin];
    const overlap = settings.overlap;
    const cellWidth = pageWidth - 2 * margin;
    const cellHeight = pageHeight - 2 * margin;

    // Cada hoja avanza su ancho útil menos el solapamiento con la siguiente.
    const stepX = cellWidth - overlap;
    const stepY = cellHeight - overlap;
    const gridWidth = settings.cols * stepX + overlap;
    const gridHeight = settings.rows * stepY + overlap;

    // La imagen se ajusta completa (sin recortar) y se centra en la cuadrícula.
    const mmPerPx = Math.min(gridWidth / imageWidth, gridHeight / imageHeight);
    const posterWidth = imageWidth * mmPerPx;
    const posterHeight = imageHeight * mmPerPx;
    const offsetX = (gridWidth - posterWidth) / 2;
    const offsetY = (gridHeight - posterHeight) / 2;

    const tiles = [];
    for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.cols; col++) {
            const x = col * stepX;
            const y = row * stepY;

            const left = Math.max(x, offsetX);
            const top = Math.max(y, offsetY);
            const right = Math.min(x + cellWidth, offsetX + posterWidth);
            const bottom = Math.min(y + cellHeight, offsetY + posterHeight);
            const empty = right <= left || bottom <= top;

            tiles.push({
                number: row * settings.cols + col + 1,
                row,
                col,
                x,
                y,
                empty,
                // Rectángulo de la imagen original, en píxeles.
                source: empty
                    ? null
                    : {
                          x: (left - offsetX) / mmPerPx,
                          y: (top - offsetY) / mmPerPx,
                          width: (right - left) / mmPerPx,
                          height: (bottom - top) / mmPerPx,
                      },
                // Dónde va ese rectángulo dentro del área útil de la hoja, en mm.
                target: empty
                    ? null
                    : {
                          x: left - x,
                          y: top - y,
                          width: right - left,
                          height: bottom - top,
                      },
            });
        }
    }

    return {
        cols: settings.cols,
        rows: settings.rows,
        pageWidth,
        pageHeight,
        margin,
        overlap,
        cellWidth,
        cellHeight,
        stepX,
        stepY,
        gridWidth,
        gridHeight,
        posterWidth,
        posterHeight,
        offsetX,
        offsetY,
        mmPerPx,
        dpi: MM_PER_INCH / mmPerPx,
        tiles,
    };
}

export function coverage(layout) {
    return (layout.posterWidth * layout.posterHeight) / (layout.gridWidth * layout.gridHeight);
}

/**
 * Número de filas (1–10) que mejor aprovecha el papel con las columnas
 * actuales, es decir, el que deja menos espacio en blanco.
 */
export function suggestRows(imageWidth, imageHeight, settings) {
    let best = settings.rows;
    let bestCoverage = -1;

    for (let rows = 1; rows <= 10; rows++) {
        const value = coverage(computeLayout(imageWidth, imageHeight, { ...settings, rows }));
        if (value > bestCoverage + 1e-6) {
            best = rows;
            bestCoverage = value;
        }
    }

    return best;
}

/**
 * Dibuja el fragmento de una hoja en un canvas nuevo: fondo blanco del tamaño
 * del área útil y la porción de imagen que le toca.
 */
export function renderTile(image, layout, tile, dpi = Math.min(layout.dpi, MAX_DPI)) {
    const pxPerMm = dpi / MM_PER_INCH;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(layout.cellWidth * pxPerMm));
    canvas.height = Math.max(1, Math.round(layout.cellHeight * pxPerMm));

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!tile.empty) {
        const { source, target } = tile;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            image,
            source.x,
            source.y,
            source.width,
            source.height,
            target.x * pxPerMm,
            target.y * pxPerMm,
            target.width * pxPerMm,
            target.height * pxPerMm,
        );
    }

    return canvas;
}

const MARK_GAP = 1;
const MARK_MAX_LENGTH = 4;
const MIN_MARGIN_FOR_MARKS = 3;
const MIN_MARGIN_FOR_LABEL = 5;
const JPEG_QUALITY = 0.9;

function canvasToJpeg(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject) : reject(new Error('toBlob'))),
            'image/jpeg',
            JPEG_QUALITY,
        );
    });
}

const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Marcas en el margen blanco de la hoja: esquinas del área de imagen (por dónde
 * recortar) y guías discontinuas donde debe quedar el borde de la hoja vecina.
 */
function drawMarks(doc, layout, tile, cols, rows) {
    const { margin, cellWidth, cellHeight, overlap } = layout;
    if (margin < MIN_MARGIN_FOR_MARKS) return;

    const length = Math.min(margin - MARK_GAP - 0.5, MARK_MAX_LENGTH);
    const left = margin;
    const top = margin;
    const right = margin + cellWidth;
    const bottom = margin + cellHeight;

    doc.setLineWidth(0.2);
    doc.setDrawColor(60);
    doc.setLineDashPattern([], 0);

    for (const x of [left, right]) {
        const outward = x === left ? -1 : 1;
        for (const y of [top, bottom]) {
            const vertical = y === top ? -1 : 1;
            doc.line(x + outward * MARK_GAP, y, x + outward * (MARK_GAP + length), y);
            doc.line(x, y + vertical * MARK_GAP, x, y + vertical * (MARK_GAP + length));
        }
    }

    if (overlap <= 0) return;

    doc.setDrawColor(37, 99, 235);
    doc.setLineDashPattern([0.8, 0.8], 0);

    if (tile.col < cols - 1) {
        const x = right - overlap;
        doc.line(x, top - MARK_GAP, x, top - MARK_GAP - length);
        doc.line(x, bottom + MARK_GAP, x, bottom + MARK_GAP + length);
    }
    if (tile.row < rows - 1) {
        const y = bottom - overlap;
        doc.line(left - MARK_GAP, y, left - MARK_GAP - length, y);
        doc.line(right + MARK_GAP, y, right + MARK_GAP + length, y);
    }

    doc.setLineDashPattern([], 0);
}

function drawLabel(doc, layout, tile, total) {
    if (layout.margin < MIN_MARGIN_FOR_LABEL) return;

    const text = `Hoja ${tile.number} de ${total} · fila ${tile.row + 1}, columna ${tile.col + 1}${tile.empty ? ' · en blanco' : ''}`;
    doc.setFontSize(7);
    doc.setTextColor(110);
    doc.text(text, layout.pageWidth / 2, layout.pageHeight - layout.margin / 2, { align: 'center', baseline: 'middle' });
}

export function pdfFileName(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `block-poster-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pdf`;
}

/**
 * Genera el PDF con una hoja por fragmento y lo descarga. Cede el control al
 * navegador entre hojas para que la barra de progreso se pueda pintar.
 */
export async function generatePdf(image, layout, settings, onProgress = () => {}) {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: settings.orientation,
        unit: 'mm',
        format: settings.paper,
        compress: true,
    });

    const total = layout.tiles.length;

    for (const [index, tile] of layout.tiles.entries()) {
        if (index > 0) doc.addPage(settings.paper, settings.orientation);

        if (!tile.empty) {
            const canvas = renderTile(image, layout, tile);
            const jpeg = await canvasToJpeg(canvas);
            canvas.width = canvas.height = 0;
            doc.addImage(jpeg, 'JPEG', layout.margin, layout.margin, layout.cellWidth, layout.cellHeight, `hoja-${tile.number}`);
        }

        if (settings.cutMarks) drawMarks(doc, layout, tile, settings.cols, settings.rows);
        drawLabel(doc, layout, tile, total);

        onProgress(Math.round(((index + 1) / total) * 95));
        await nextFrame();
    }

    doc.save(pdfFileName());
    onProgress(100);
}

export function formatPosterSize(layout) {
    const cm = (mm) => (mm / 10).toLocaleString('es', { maximumFractionDigits: 1 });
    return `${cm(layout.posterWidth)} × ${cm(layout.posterHeight)} cm`;
}

function loadImage(url) {
    const image = new Image();
    image.src = url;
    return image.decode().then(() => image);
}

export function useBlockPoster(settings) {
    const file = shallowRef(null);
    const image = shallowRef(null);
    const imageUrl = ref(null);
    const isDemo = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const generating = ref(false);
    const progress = ref(0);
    const pdfError = ref(null);
    const pdfDone = ref(false);
    let loadId = 0;

    const layout = computed(() =>
        image.value ? computeLayout(image.value.naturalWidth, image.value.naturalHeight, settings) : null,
    );

    const posterSize = computed(() => (layout.value ? formatPosterSize(layout.value) : null));

    const quality = computed(() => (layout.value ? { dpi: Math.round(layout.value.dpi), ...printQuality(layout.value.dpi) } : null));

    const suggestedRows = computed(() => {
        if (!image.value) return null;
        const rows = suggestRows(image.value.naturalWidth, image.value.naturalHeight, settings);
        return rows !== settings.rows && coverage(layout.value) < 0.9 ? rows : null;
    });

    watch(layout, () => (pdfDone.value = false));

    function clear() {
        if (generating.value) return;
        loadId++;
        if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
        file.value = null;
        image.value = null;
        imageUrl.value = null;
        isDemo.value = false;
        loading.value = false;
        error.value = null;
        pdfError.value = null;
        pdfDone.value = false;
    }

    async function download() {
        if (!image.value || generating.value) return;

        generating.value = true;
        progress.value = 0;
        pdfError.value = null;
        pdfDone.value = false;

        try {
            await generatePdf(image.value, layout.value, { ...settings }, (value) => (progress.value = value));
            pdfDone.value = true;
        } catch (e) {
            console.error(e);
            pdfError.value = 'No pudimos generar el PDF. Prueba con menos hojas o una imagen más pequeña.';
        } finally {
            generating.value = false;
        }
    }

    async function load(selected, { demo = false } = {}) {
        if (generating.value) return;

        // Si el archivo no sirve, se conserva la imagen que ya estaba.
        const invalid = validateFile(selected);
        if (invalid) {
            error.value = invalid;
            return;
        }

        clear();
        const id = loadId;
        const url = URL.createObjectURL(selected);
        loading.value = true;

        try {
            const decoded = await loadImage(url);
            if (id !== loadId) return URL.revokeObjectURL(url);
            file.value = selected;
            image.value = decoded;
            imageUrl.value = url;
            isDemo.value = demo;
        } catch {
            URL.revokeObjectURL(url);
            if (id === loadId) error.value = 'No pudimos leer esa imagen. Prueba con otro archivo JPG, PNG o WebP.';
        } finally {
            if (id === loadId) loading.value = false;
        }
    }

    onBeforeUnmount(clear);

    return {
        file,
        image,
        imageUrl,
        isDemo,
        loading,
        error,
        layout,
        posterSize,
        quality,
        suggestedRows,
        generating,
        progress,
        pdfError,
        pdfDone,
        load,
        clear,
        download,
        renderTile: (tile, dpi) => renderTile(image.value, layout.value, tile, dpi),
    };
}
