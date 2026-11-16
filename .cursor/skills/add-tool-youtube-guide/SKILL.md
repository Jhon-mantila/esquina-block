---
name: add-tool-youtube-guide
description: >-
  Inserta (o actualiza) el bloque «Ver guía paso a paso» con iframe de YouTube
  en una herramienta Esquina (Blade SEO), igual que Esquina Block / Cut.
  Usar cuando el usuario diga añadir tutorial, guía en vídeo, YouTube guide
  a Block/Cut/QR/PDF/Img/BG, o invoque este skill con tool + URL del vídeo.
disable-model-invocation: true
---

# Añadir guía YouTube a una tool Esquina

## Entrada necesaria

1. **Tool:** `block` | `cut` | `qr` | `pdf` | `img` | `bg`
2. **URL del vídeo:** `https://youtu.be/ID` o `https://www.youtube.com/watch?v=ID`

Si falta alguno, preguntar antes de editar.

## Mapa Blade

| Tool | Archivo | Nombre en copy |
| --- | --- | --- |
| block | `resources/views/app.blade.php` | Esquina Block |
| cut | `resources/views/esquinacut.blade.php` | Esquina Cut |
| qr | `resources/views/esquinaqr.blade.php` | EsquinaQR |
| pdf | `resources/views/esquinapdf.blade.php` | Esquina PDF |
| img | `resources/views/esquinaimg.blade.php` | Esquina Img |
| bg | `resources/views/esquinabg.blade.php` | Esquina BG |

## Dónde insertar

Dentro de `<section id="como-funciona">`, **después** del `<ol>` de 3 pasos y **antes** de `</section>`.

Si ya existe un bloque «Ver guía paso a paso», **solo actualizar** el `src` del iframe y el `title` (no duplicar).

## Plantilla (copiar tal cual; sustituir ID, NOMBRE y copy corta)

Extraer el ID del vídeo (11 caracteres). Usar siempre `youtube-nocookie.com`.

```blade
                    <div class="mt-8">
                        <h2 class="text-lg font-semibold text-slate-900">Ver guía paso a paso.</h2>
                        <p class="mt-1 text-sm text-slate-600">Tutorial en vídeo de cómo usar NOMBRE de principio a fin.</p>
                        {{-- aspect-ratio inline: el build de Vite aún no incluye aspect-video --}}
                        <div
                            class="relative mt-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
                            style="aspect-ratio: 16 / 9"
                        >
                            <iframe
                                class="absolute top-0 left-0 h-full w-full border-0"
                                src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
                                title="Guía paso a paso de NOMBRE"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerpolicy="strict-origin-when-cross-origin"
                                allowfullscreen
                            ></iframe>
                        </div>
                    </div>
```

Referencia canónica: el mismo bloque en `resources/views/app.blade.php` (Esquina Block).

## No hacer

- No tocar juegos (2048 / Blocks) salvo que el usuario lo pida.
- No cambiar AdSense, FAQ ni otros textos SEO salvo el bloque del vídeo.
- No usar `youtube.com/embed` (preferir `youtube-nocookie.com`).
- No hace falta `npm run build` (es Blade estático).

## Verificación

Confirmar que el Blade de la tool contiene `embed/VIDEO_ID` y un solo «Ver guía paso a paso».
