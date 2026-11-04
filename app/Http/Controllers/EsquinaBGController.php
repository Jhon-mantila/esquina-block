<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaBGController extends Controller
{
    public function index(): Response
    {
        $seo = config('esquinabg');

        return Inertia::render('EsquinaBG/Index', [
            'siblings' => [
                'block' => $seo['sibling_block_url'] ?? '',
                'cut' => $seo['sibling_cut_url'] ?? '',
                'qr' => $seo['sibling_qr_url'] ?? '',
                'img' => $seo['sibling_img_url'] ?? '',
                'pdf' => $seo['sibling_pdf_url'] ?? '',
            ],
        ]);
    }
}
