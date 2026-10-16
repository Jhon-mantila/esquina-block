/** Demo de una hoja: 9 stickers PNG con fondo transparente (para probar silueta). */

const SIZE = 512;
const COLORS = [
    ['#2563eb', '#1d4ed8'],
    ['#059669', '#047857'],
    ['#d97706', '#b45309'],
    ['#db2777', '#be185d'],
    ['#7c3aed', '#6d28d9'],
    ['#0891b2', '#0e7490'],
    ['#ea580c', '#c2410c'],
    ['#4f46e5', '#4338ca'],
    ['#0f766e', '#115e59'],
];

const SHAPES = ['circle', 'roundRect', 'blob', 'star', 'hex', 'circle', 'roundRect', 'blob', 'star'];

function canvasToFile(canvas, name) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('No se pudo crear la imagen de ejemplo'));
                    return;
                }
                resolve(new File([blob], name, { type: 'image/png' }));
            },
            'image/png',
        );
    });
}

function clipShape(ctx, shape) {
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = SIZE * 0.42;
    ctx.beginPath();

    if (shape === 'circle') {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (shape === 'roundRect') {
        const s = SIZE * 0.78;
        const x = (SIZE - s) / 2;
        const y = (SIZE - s) / 2;
        const rad = s * 0.22;
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + s, y, x + s, y + s, rad);
        ctx.arcTo(x + s, y + s, x, y + s, rad);
        ctx.arcTo(x, y + s, x, y, rad);
        ctx.arcTo(x, y, x + s, y, rad);
        ctx.closePath();
    } else if (shape === 'hex') {
        for (let i = 0; i < 6; i += 1) {
            const a = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + r * Math.cos(a);
            const y = cy + r * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    } else if (shape === 'star') {
        const spikes = 5;
        const outer = r;
        const inner = r * 0.45;
        for (let i = 0; i < spikes * 2; i += 1) {
            const rad = i % 2 === 0 ? outer : inner;
            const a = (Math.PI * i) / spikes - Math.PI / 2;
            const x = cx + rad * Math.cos(a);
            const y = cy + rad * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    } else {
        // blob irregular
        const lobes = 8;
        for (let i = 0; i <= lobes; i += 1) {
            const a = (Math.PI * 2 * i) / lobes;
            const rad = r * (0.78 + 0.22 * Math.sin(i * 2.4));
            const x = cx + rad * Math.cos(a);
            const y = cy + rad * Math.sin(a);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    ctx.clip();
}

function drawSticker(index) {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    clipShape(ctx, SHAPES[index % SHAPES.length]);

    const [from, to] = COLORS[index % COLORS.length];
    const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    for (let i = 48; i < SIZE; i += 48) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, SIZE);
        ctx.moveTo(0, i);
        ctx.lineTo(SIZE, i);
        ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.3)';
    ctx.shadowBlur = 16;
    ctx.font = '800 160px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(String(index + 1), SIZE / 2, SIZE / 2 - 10);

    ctx.shadowBlur = 0;
    ctx.font = '700 28px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('ESQUINA', SIZE / 2, SIZE / 2 + 78);
    ctx.restore();

    return canvas;
}

/** Genera 9 PNG de ejemplo con formas distintas y fondo transparente. */
export async function createDemoCutFiles() {
    const files = [];
    for (let i = 0; i < 9; i += 1) {
        files.push(await canvasToFile(drawSticker(i), `ejemplo-plantilla-${i + 1}.png`));
    }
    return files;
}
