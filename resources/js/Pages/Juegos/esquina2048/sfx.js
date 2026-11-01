/**
 * Efectos de sonido ligeros (Web Audio, sin archivos).
 * Game over: tres tonos descendentes.
 */
import { STORAGE } from './gameEvents';

const MUTE_KEY = STORAGE.muted;

/** @type {AudioContext | null} */
let ctx = null;
let warmed = false;

export function isMuted() {
    try {
        return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * @param {boolean} muted
 */
export function setMuted(muted) {
    try {
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
        /* ignore */
    }
}

function getCtx() {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
}

/** Llama esto en cada click/tecla para mantener el AudioContext activo. */
export function unlockAudio() {
    const audio = getCtx();
    if (!audio) return Promise.resolve(false);

    const warm = () => {
        if (warmed || audio.state !== 'running') return;
        try {
            const buf = audio.createBuffer(1, 1, audio.sampleRate);
            const src = audio.createBufferSource();
            src.buffer = buf;
            src.connect(audio.destination);
            src.start(0);
            warmed = true;
        } catch {
            /* ignore */
        }
    };

    if (audio.state === 'suspended') {
        return audio
            .resume()
            .then(() => {
                warm();
                return audio.state === 'running';
            })
            .catch(() => false);
    }

    warm();
    return Promise.resolve(audio.state === 'running');
}

/**
 * @param {AudioContext} audio
 * @param {number} freq
 * @param {number} when
 * @param {number} dur
 * @param {number} gain
 */
function beep(audio, freq, when, dur, gain) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(gain, when + 0.015);
    amp.gain.linearRampToValueAtTime(gain * 0.7, when + dur * 0.55);
    amp.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(when);
    osc.stop(when + dur + 0.01);
}

function scheduleGameOver(audio) {
    const t0 = audio.currentTime + 0.01;
    // Un poco más fuerte y con onda square para que se note en portátiles
    beep(audio, 494, t0, 0.14, 0.12);
    beep(audio, 370, t0 + 0.13, 0.16, 0.12);
    beep(audio, 277, t0 + 0.28, 0.34, 0.14);
}

/** Sting de derrota. */
export function playGameOver() {
    if (isMuted()) return Promise.resolve(false);
    const audio = getCtx();
    if (!audio) return Promise.resolve(false);

    const run = () => {
        if (audio.state !== 'running') return false;
        scheduleGameOver(audio);
        return true;
    };

    if (audio.state === 'running') {
        return Promise.resolve(run());
    }

    return unlockAudio().then((ok) => (ok ? run() : false));
}
