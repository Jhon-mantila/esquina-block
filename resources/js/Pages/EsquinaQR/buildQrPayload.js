/**
 * Escapa caracteres especiales de los formatos WIFI / MECARD / MATMSG.
 * @param {unknown} value
 * @returns {string}
 */
function escapeQr(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/"/g, '\\"')
        .replace(/:/g, '\\:');
}

/**
 * @param {'url'|'wifi'|'vcard'|'email'|'sms'} type
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function buildQrPayload(type, data) {
    switch (type) {
        case 'url':
            return String(data.text ?? '').trim();

        case 'wifi': {
            const ssid = String(data.wifiSsid ?? '').trim();
            if (!ssid) return '';

            const encryption = data.wifiEncryption === 'nopass' || data.wifiEncryption === 'WEP' || data.wifiEncryption === 'WPA'
                ? data.wifiEncryption
                : 'WPA';
            const password = encryption === 'nopass' ? '' : String(data.wifiPassword ?? '');
            const hidden = data.wifiHidden ? 'true' : 'false';

            return `WIFI:T:${encryption};S:${escapeQr(ssid)};P:${escapeQr(password)};H:${hidden};;`;
        }

        case 'vcard': {
            const first = String(data.firstName ?? '').trim();
            const last = String(data.lastName ?? '').trim();
            const phone = String(data.phone ?? '').trim();
            const email = String(data.email ?? '').trim();
            const org = String(data.org ?? '').trim();
            const website = String(data.website ?? '').trim();

            if (!first && !last && !phone && !email && !org && !website) return '';

            // MECARD: N:Apellido,Nombre;TEL:...;EMAIL:...;ORG:...;URL:...;;
            const name = [last, first].filter(Boolean).join(',');
            let out = 'MECARD:';
            if (name) out += `N:${escapeQr(name)};`;
            if (phone) out += `TEL:${escapeQr(phone)};`;
            if (email) out += `EMAIL:${escapeQr(email)};`;
            if (org) out += `ORG:${escapeQr(org)};`;
            if (website) out += `URL:${escapeQr(website)};`;
            return `${out};`;
        }

        case 'email': {
            const to = String(data.emailTo ?? '').trim();
            if (!to) return '';

            const subject = String(data.emailSubject ?? '');
            const body = String(data.emailBody ?? '');
            return `MATMSG:TO:${escapeQr(to)};SUB:${escapeQr(subject)};BODY:${escapeQr(body)};;`;
        }

        case 'sms': {
            const phone = String(data.smsPhone ?? '').trim();
            if (!phone) return '';

            const message = String(data.smsBody ?? '').trim();
            return message ? `SMSTO:${phone}:${message}` : `SMSTO:${phone}`;
        }

        default:
            return '';
    }
}
