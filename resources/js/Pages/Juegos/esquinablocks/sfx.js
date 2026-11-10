/**
 * Efectos ligeros con Web Audio (sin archivos).
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

/** @param {boolean} muted */
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
 * @param {OscillatorType} [type='triangle']
 */
function beep(audio, freq, when, dur, gain, type = 'triangle') {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(gain, when + 0.012);
    amp.gain.linearRampToValueAtTime(gain * 0.65, when + dur * 0.5);
    amp.gain.linearRampToValueAtTime(0, when + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(when);
    osc.stop(when + dur + 0.01);
}

function withAudio(run) {
    if (isMuted()) return Promise.resolve(false);
    const audio = getCtx();
    if (!audio) return Promise.resolve(false);
    const play = () => {
        if (audio.state !== 'running') return false;
        run(audio);
        return true;
    };
    if (audio.state === 'running') return Promise.resolve(play());
    return unlockAudio().then((ok) => (ok ? play() : false));
}

/** Colocar pieza. */
export function playPlace() {
    return withAudio((audio) => {
        const t0 = audio.currentTime + 0.01;
        beep(audio, 520, t0, 0.07, 0.06);
        beep(audio, 680, t0 + 0.04, 0.06, 0.05);
    });
}

/** Limpiar líneas (más agudo si hay combo). */
export function playClear(lineCount = 1) {
    return withAudio((audio) => {
        const t0 = audio.currentTime + 0.01;
        const n = Math.max(1, Math.min(4, lineCount));
        for (let i = 0; i < n; i += 1) {
            beep(audio, 440 + i * 120, t0 + i * 0.06, 0.1, 0.07, 'square');
        }
    });
}

/** Game over. */
export function playGameOver() {
    return withAudio((audio) => {
        const t0 = audio.currentTime + 0.01;
        beep(audio, 494, t0, 0.14, 0.1, 'square');
        beep(audio, 370, t0 + 0.13, 0.16, 0.1, 'square');
        beep(audio, 277, t0 + 0.28, 0.34, 0.12, 'square');
    });
}
