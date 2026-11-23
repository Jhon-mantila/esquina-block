<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaEraserController extends Controller
{
    public function index(): Response
    {
        $seo = config('esquinaeraser');

        return Inertia::render('EsquinaEraser/Index', [
            'siblings' => [
                'bg' => $seo['sibling_bg_url'] ?? '',
                'upscale' => $seo['sibling_upscale_url'] ?? '',
                'img' => $seo['sibling_img_url'] ?? '',
            ],
        ]);
    }
}
