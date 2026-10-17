const MAX_TEXT = 1200;
const MAX_SSID = 32;
const MAX_PASSWORD = 63;
const MAX_NAME = 80;
const MAX_PHONE = 32;
const MAX_EMAIL = 120;
const MAX_ORG = 80;
const MAX_URL = 200;
const MAX_SUBJECT = 120;
const MAX_BODY = 400;
const MAX_SMS = 160;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{6,32}$/;
const URL_RE = /^(https?:\/\/|www\.)/i;

/**
 * @param {unknown} value
 * @returns {string}
 */
function trim(value) {
    return String(value ?? '').trim();
}

/**
 * @param {'url'|'wifi'|'vcard'|'email'|'sms'} type
 * @param {Record<string, unknown>} data
 * @returns {{ valid: boolean, errors: Record<string, string>, messages: string[] }}
 */
export function validateQr(type, data) {
    /** @type {Record<string, string>} */
    const errors = {};

    switch (type) {
        case 'url': {
            const text = trim(data.text);
            if (!text) {
                errors.text = 'Escribe una URL o un texto.';
            } else if (text.length > MAX_TEXT) {
                errors.text = `Máximo ${MAX_TEXT} caracteres.`;
            }
            break;
        }

        case 'wifi': {
            const ssid = trim(data.wifiSsid);
            const encryption = data.wifiEncryption;
            const password = String(data.wifiPassword ?? '');

            if (!ssid) {
                errors.wifiSsid = 'Indica el nombre de la red (SSID).';
            } else if (ssid.length > MAX_SSID) {
                errors.wifiSsid = `El SSID admite máximo ${MAX_SSID} caracteres.`;
            }

            if (encryption !== 'nopass') {
                if (!password.trim()) {
                    errors.wifiPassword = 'Indica la contraseña o elige «Sin contraseña».';
                } else if (password.length > MAX_PASSWORD) {
                    errors.wifiPassword = `La contraseña admite máximo ${MAX_PASSWORD} caracteres.`;
                }
            }
            break;
        }

        case 'vcard': {
            const first = trim(data.firstName);
            const last = trim(data.lastName);
            const phone = trim(data.phone);
            const email = trim(data.email);
            const org = trim(data.org);
            const website = trim(data.website);

            if (!first && !last && !phone && !email && !org && !website) {
                errors.vcard = 'Completa al menos un dato del contacto.';
            }

            if (first.length > MAX_NAME) errors.firstName = `Máximo ${MAX_NAME} caracteres.`;
            if (last.length > MAX_NAME) errors.lastName = `Máximo ${MAX_NAME} caracteres.`;
            if (org.length > MAX_ORG) errors.org = `Máximo ${MAX_ORG} caracteres.`;

            if (phone && !PHONE_RE.test(phone)) {
                errors.phone = 'Teléfono no válido.';
            } else if (phone.length > MAX_PHONE) {
                errors.phone = `Máximo ${MAX_PHONE} caracteres.`;
            }

            if (email && !EMAIL_RE.test(email)) {
                errors.email = 'Email no válido.';
            } else if (email.length > MAX_EMAIL) {
                errors.email = `Máximo ${MAX_EMAIL} caracteres.`;
            }

            if (website) {
                if (website.length > MAX_URL) {
                    errors.website = `Máximo ${MAX_URL} caracteres.`;
                } else if (!URL_RE.test(website) && !website.includes('.')) {
                    errors.website = 'Usa una URL válida (ej. https://…).';
                }
            }
            break;
        }

        case 'email': {
            const to = trim(data.emailTo);
            const subject = String(data.emailSubject ?? '');
            const body = String(data.emailBody ?? '');

            if (!to) {
                errors.emailTo = 'Indica el correo destino.';
            } else if (!EMAIL_RE.test(to)) {
                errors.emailTo = 'Email no válido.';
            } else if (to.length > MAX_EMAIL) {
                errors.emailTo = `Máximo ${MAX_EMAIL} caracteres.`;
            }

            if (subject.length > MAX_SUBJECT) {
                errors.emailSubject = `Máximo ${MAX_SUBJECT} caracteres.`;
            }
            if (body.length > MAX_BODY) {
                errors.emailBody = `Máximo ${MAX_BODY} caracteres.`;
            }
            break;
        }

        case 'sms': {
            const phone = trim(data.smsPhone);
            const message = String(data.smsBody ?? '');

            if (!phone) {
                errors.smsPhone = 'Indica el número de teléfono.';
            } else if (!PHONE_RE.test(phone)) {
                errors.smsPhone = 'Teléfono no válido.';
            }

            if (message.length > MAX_SMS) {
                errors.smsBody = `Máximo ${MAX_SMS} caracteres.`;
            }
            break;
        }

        default:
            errors.type = 'Tipo de QR no válido.';
    }

    const messages = Object.values(errors);
    return {
        valid: messages.length === 0,
        errors,
        messages,
    };
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

/**
 * @param {File} file
 * @returns {string} mensaje de error o ''
 */
export function validateLogoFile(file) {
    if (!file) return 'No se seleccionó ningún archivo.';
    if (!LOGO_TYPES.includes(file.type)) {
        return 'Formato no válido. Usa PNG, SVG, JPG o WebP.';
    }
    if (file.size > LOGO_MAX_BYTES) {
        return 'El logo pesa más de 2 MB. Elige una imagen más ligera.';
    }
    return '';
}
