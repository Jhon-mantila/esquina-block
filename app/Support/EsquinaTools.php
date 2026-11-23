<?php

namespace App\Support;

class EsquinaTools
{
    private static int $iconSeq = 0;

    /**
     * @return array<int, array{id: string, name: string, hint: string, path: string, file: string, url: string}>
     */
    public static function listed(): array
    {
        $origin = rtrim(request()->getSchemeAndHttpHost(), '/');

        return array_map(function (array $tool) use ($origin) {
            $tool['url'] = $origin.$tool['path'];

            return $tool;
        }, config('esquina_tools.tools', []));
    }

    public static function inlineIcon(string $file, string $class): string
    {
        $path = public_path('images/tools/'.$file);
        if (! is_file($path)) {
            return '';
        }

        $svg = file_get_contents($path);
        if ($svg === false) {
            return '';
        }

        $svg = preg_replace('/<\?xml[^>]*\?>/', '', $svg) ?? $svg;
        $svg = preg_replace('/<!--.*?-->/s', '', $svg) ?? $svg;
        $class = htmlspecialchars($class, ENT_QUOTES, 'UTF-8');
        $svg = preg_replace(
            '/<svg\b([^>]*)>/',
            '<svg$1 class="'.$class.'" aria-hidden="true" focusable="false">',
            $svg,
            1
        ) ?? $svg;

        return self::uniqueIds($svg);
    }

    /**
     * El menú y el footer incrustan el mismo archivo. Sin esto, los id de
     * clipPath (el QR) se pisan y el segundo icono queda vacío.
     */
    private static function uniqueIds(string $svg): string
    {
        self::$iconSeq++;
        $prefix = 'et'.self::$iconSeq.'_';

        $svg = preg_replace_callback(
            '/\bid="([^"]+)"/',
            static fn (array $match): string => 'id="'.$prefix.$match[1].'"',
            $svg
        ) ?? $svg;

        return preg_replace_callback(
            '/(url\(#|href="#|xlink:href="#)([^")]+)/',
            static fn (array $match): string => $match[1].$prefix.$match[2],
            $svg
        ) ?? $svg;
    }
}
