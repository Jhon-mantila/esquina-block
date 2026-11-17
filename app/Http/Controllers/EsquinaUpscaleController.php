<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaUpscaleController extends Controller
{
    public function index(): Response
    {
        $seo = config('esquinaupscale');

        return Inertia::render('EsquinaUpscale/Index', [
            'siblings' => [
                'bg' => $seo['sibling_bg_url'] ?? '',
                'img' => $seo['sibling_img_url'] ?? '',
            ],
        ]);
    }
}
