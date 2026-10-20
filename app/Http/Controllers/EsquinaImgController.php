<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaImgController extends Controller
{
    public function index(): Response
    {
        $seo = config('esquinaimg');

        return Inertia::render('EsquinaImg/Index', [
            'siblings' => [
                'block' => $seo['sibling_block_url'] ?? '',
                'cut' => $seo['sibling_cut_url'] ?? '',
                'qr' => $seo['sibling_qr_url'] ?? '',
                'pdf' => $seo['sibling_pdf_url'] ?? '',
            ],
        ]);
    }
}
