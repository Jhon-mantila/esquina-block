// Proporción 3:2 para que encaje casi entera en la cuadrícula por defecto (3 × 3 A4
// horizontal) y resolución suficiente para que la calidad de impresión salga "Buena".
const WIDTH = 3600;
const HEIGHT = 2400;
const GRID_STEP = 150;

function fitFont(ctx, text, maxWidth, maxSize) {
    ctx.font = `800 ${maxSize}px ui-sans-serif, system-ui, sans-serif`;
    const size = Math.min(maxSize, (maxSize * maxWidth) / ctx.measureText(text).width);
    ctx.font = `800 ${Math.floor(size)}px ui-sans-serif, system-ui, sans-serif`;
    return size;
}

/** Genera la imagen de ejemplo en el navegador y la devuelve como archivo JPG. */
export async function createDemoFile() {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#2563eb');
    gradient.addColorStop(1, '#10b981');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = GRID_STEP; x < WIDTH; x += GRID_STEP) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
    }
    for (let y = GRID_STEP; y < HEIGHT; y += GRID_STEP) {
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.25)';
    ctx.shadowBlur = 40;

    const size = fitFont(ctx, 'ESQUINA', WIDTH * 0.7, 640);
    ctx.fillText('ESQUINA', WIDTH / 2, HEIGHT / 2 - size * 0.55);
    ctx.fillText('BLOCK', WIDTH / 2, HEIGHT / 2 + size * 0.55);

    ctx.shadowBlur = 0;
    ctx.font = `600 ${Math.round(size * 0.22)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('Tu póster gigante, hoja por hoja', WIDTH / 2, HEIGHT / 2 + size * 1.45);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    canvas.width = canvas.height = 0;

    return new File([blob], 'ejemplo-esquina-block.jpg', { type: 'image/jpeg' });
}
