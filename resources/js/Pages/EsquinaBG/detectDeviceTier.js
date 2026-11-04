/**
 * Detecta la capacidad del dispositivo para habilitar modelos de quitar fondo.
 *
 * Niveles (UI):
 * - basic: PCs modestos
 * - balanced: PCs normales
 * - high: PCs potentes
 *
 * Importante: Chrome/Edge limitan `navigator.deviceMemory` a 8 GB como máximo
 * (privacidad). Un PC con 32 GB suele reportar 8. Por eso 8 se trata como
 * «8 GB o más».
 */

/** @typedef {'basic' | 'balanced' | 'high'} DeviceTier */
/** @typedef {'basic' | 'balanced' | 'high'} ModelId */

/**
 * @returns {{
 *   tier: DeviceTier,
 *   ramGb: number | null,
 *   cores: number,
 *   allowed: Record<ModelId, boolean>,
 *   defaultModel: ModelId,
 * }}
 */
export function detectDeviceTier() {
    const ramGb =
        typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number'
            ? navigator.deviceMemory
            : null;
    const cores =
        typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
            ? Math.max(1, navigator.hardwareConcurrency)
            : 2;

    /** @type {DeviceTier} */
    let tier = 'basic';

    // Chrome topea deviceMemory en 8 → 8 significa «al menos 8 GB».
    const highRam = ramGb != null && ramGb >= 8;
    const midRam = ramGb != null && ramGb >= 4;
    const highCpu = cores >= 8;
    const midCpu = cores >= 4;

    if (ramGb != null) {
        if (highRam && highCpu) {
            tier = 'high';
        } else if (midRam && midCpu) {
            tier = 'balanced';
        } else {
            tier = 'basic';
        }
    } else if (highCpu) {
        // Sin RAM (Safari): con muchos núcleos permitir equilibrado; alta solo si ≥12.
        tier = cores >= 12 ? 'high' : 'balanced';
    } else if (midCpu) {
        tier = 'balanced';
    } else {
        tier = 'basic';
    }

    const allowed = {
        basic: true,
        balanced: tier === 'balanced' || tier === 'high',
        high: tier === 'high',
    };

    // Elegir automáticamente el mejor modelo permitido.
    /** @type {ModelId} */
    const defaultModel = allowed.high
        ? 'high'
        : allowed.balanced
            ? 'balanced'
            : 'basic';

    return { tier, ramGb, cores, allowed, defaultModel };
}
