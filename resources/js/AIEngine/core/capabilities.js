import { probeWebGpu } from '../providers/webgpu.js';

/**
 * Clasifica el equipo con memoria y núcleos a la vez.
 * Chrome/Edge limitan `navigator.deviceMemory` a 8, así que 8 significa «8 GB o más».
 * WebGPU no entra en esta cuenta: solo elige el proveedor de ejecución.
 *
 * @param {{ ramGb?: number | null, cores?: number }} signals
 * @returns {'basic' | 'balanced' | 'high'}
 */
export function classifyDevice({ ramGb = null, cores = 2 } = {}) {
    const ram = typeof ramGb === 'number' ? ramGb : null;
    const cpu = typeof cores === 'number' ? Math.max(1, cores) : 2;

    const highRam = ram != null && ram >= 8;
    const midRam = ram != null && ram >= 4;
    const highCpu = cpu >= 8;
    const midCpu = cpu >= 4;

    if (ram != null) {
        if (highRam && highCpu) return 'high';
        if (midRam && midCpu) return 'balanced';
        return 'basic';
    }

    if (highCpu) return cpu >= 12 ? 'high' : 'balanced';
    if (midCpu) return 'balanced';
    return 'basic';
}

/**
 * Un equipo intermedio puede elegir alta calidad a mano.
 * En un equipo limitado esa calidad sigue desactivada.
 *
 * @param {'basic' | 'balanced' | 'high'} tier
 */
export function allowedTiers(tier) {
    if (tier === 'basic') {
        return { basic: true, balanced: false, high: false };
    }
    return { basic: true, balanced: true, high: true };
}

/**
 * @returns {Promise<{
 *   tier: 'basic' | 'balanced' | 'high',
 *   ramGb: number | null,
 *   cores: number,
 *   webgpu: 'available' | 'unavailable' | 'failed',
 *   memoryCapped: boolean,
 * }>}
 */
export async function collectCapabilities() {
    const ramGb = typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number'
        ? navigator.deviceMemory
        : null;
    const cores = typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
        ? Math.max(1, navigator.hardwareConcurrency)
        : 2;
    const webgpu = await probeWebGpu();

    return {
        tier: classifyDevice({ ramGb, cores }),
        ramGb,
        cores,
        webgpu,
        memoryCapped: ramGb === 8,
    };
}
