---
name: esquina-tools-nav
description: >-
  Mantiene el menú y el footer de las herramientas EsquinaWeb desde un solo
  catálogo. Usar al añadir, quitar o renombrar una herramienta (Block, Cut,
  QR, Img, PDF, BG, Upscale, Eraser u otra nueva), al editar tools-menu,
  tools-footer, el icono del menú o los enlaces del pie.
---

# Menú y footer de herramientas

Menú y footer leen `config/esquina_tools.php`. No copies la lista en los Blade.

## Añadir una herramienta

1. Añade una entrada al final de `tools` en `config/esquina_tools.php`:
   - `id`: corto, el de analytics (`eraser`)
   - `name`: «Esquina …»
   - `hint`: qué hace, en pocas palabras
   - `path`: `/esquina…/` con barras
   - `file`: `esquina….svg` en `public/images/tools/`
2. En el Blade nuevo:
   - `@include('partials.tools-menu', ['current' => 'id'])`
   - `<x-tools-footer current="id">` con `<x-slot:summary>` (frase de la herramienta + «nunca salen de tu dispositivo»).
3. Añade la fila en [add-tool-youtube-guide](../add-tool-youtube-guide/SKILL.md) y en la tabla del `README.md`.

El menú y el footer de las otras páginas se actualizan solos.

## Footer

```blade
<x-tools-footer current="eraser">
    <x-slot:summary>
        Esquina Eraser es una herramienta gratuita de
        <a href="https://esquinaweb.com" class="text-blue-700 hover:underline">esquinaweb.com</a>.
        Tus imágenes nunca salen de tu dispositivo.
    </x-slot:summary>
</x-tools-footer>
```

La frase cambia por herramienta: QR dice «datos», PDF dice «archivos», el resto «imágenes». Solo Block lleva `<x-slot:note>` con la reseña de Block Posters.

La ficha actual no es un enlace y muestra «Aquí». El resto llama a `esquinaTrackCrossToolClick(current, id)`. Privacidad y cookies salen de `esquina_tools.privacy_url` y `cookies_url`.

## No hacer

- No dupliques el array en `tools-menu.blade.php` ni en `tools-footer.blade.php`.
- No quites `uniqueIds()` de `EsquinaTools::inlineIcon`. El SVG de QR usa `clipPath` con id; menú y footer lo incrustan dos veces y, sin prefijo, el segundo icono sale vacío.
- No reutilices `data-tools-menu` ni los id del menú en el footer. El script del menú solo engancha el primero.
- No metas Esquina 2048 ni Esquina Blocks: son de esquinagamers.com.
- No borres los `sibling_*` de cada `config/esquina*.php`. Los usan enlaces dentro de la página Vue, no el footer.
- No cambies AdSense, FAQ ni el esquema SEO al tocar el pie.
- Este skill no crea la ruta, el alias Apache ni el controlador.
