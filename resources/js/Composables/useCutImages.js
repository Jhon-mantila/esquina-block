import { ref } from 'vue';

export const MAX_IMAGES = 60;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPT_EXT = /\.(jpe?g|png|webp)$/i;

/** Valida un archivo. Devuelve null si es válido, o un mensaje de error en español. */
export function validateCutFile(file) {
    const typeOk = ACCEPT_TYPES.has(file.type) || ACCEPT_EXT.test(file.name);
    if (!typeOk) {
        return `"${file.name}" no es un formato válido. Usa JPG, PNG o WebP.`;
    }
    if (file.size > MAX_FILE_SIZE) {
        return `"${file.name}" pesa más de 10 MB. Elige una imagen más ligera.`;
    }
    return null;
}

/**
 * Estado de la lista de imágenes: altas, bajas, reordenado y liberar previews.
 */
export function useCutImages() {
    const images = ref([]);
    let nextId = 1;

    function revoke(image) {
        if (image?.previewUrl) URL.revokeObjectURL(image.previewUrl);
    }

    function toEntry(file, { demo = false } = {}) {
        return {
            id: nextId++,
            name: file.name,
            size: file.size,
            file,
            previewUrl: URL.createObjectURL(file),
            demo,
        };
    }

    /**
     * Intenta añadir varios archivos.
     * @returns {{ added: number, errors: string[] }}
     */
    function addFiles(files, { demo = false } = {}) {
        const errors = [];
        let added = 0;
        let room = MAX_IMAGES - images.value.length;

        if (room <= 0) {
            return { added: 0, errors: [`Ya tienes el máximo de ${MAX_IMAGES} imágenes.`] };
        }

        for (const file of files) {
            if (room <= 0) {
                errors.push(`Solo se añadieron ${added}: el máximo es ${MAX_IMAGES}.`);
                break;
            }
            const invalid = validateCutFile(file);
            if (invalid) {
                errors.push(invalid);
                continue;
            }
            images.value.push(toEntry(file, { demo }));
            added += 1;
            room -= 1;
        }

        return { added, errors };
    }

    function removeAt(index) {
        const [removed] = images.value.splice(index, 1);
        revoke(removed);
    }

    function move(from, to) {
        if (from === to || from < 0 || to < 0 || from >= images.value.length || to >= images.value.length) {
            return;
        }
        const [item] = images.value.splice(from, 1);
        images.value.splice(to, 0, item);
    }

    function moveUp(index) {
        move(index, index - 1);
    }

    function moveDown(index) {
        move(index, index + 1);
    }

    function clear() {
        for (const image of images.value) revoke(image);
        images.value = [];
    }

    function replaceAll(files, { demo = false } = {}) {
        clear();
        return addFiles(files, { demo });
    }

    return {
        images,
        addFiles,
        removeAt,
        move,
        moveUp,
        moveDown,
        clear,
        replaceAll,
    };
}
