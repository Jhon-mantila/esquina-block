<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class JuegoController extends Controller
{
    public function esquina2048(): Response
    {
        $seo = config('esquina2048');
        $adsense = $seo['adsense'] ?? [];

        return Inertia::render('Juegos/Esquina2048', [
            'siteUrl' => $seo['site_url'] ?? 'https://esquinagamers.com',
            'toolsUrl' => $seo['tools_url'] ?? 'https://esquinaweb.com',
            'privacyUrl' => $seo['privacy_url'] ?? 'https://esquinagamers.com/privacy-policy/',
            'cookiesUrl' => $seo['cookies_url'] ?? 'https://esquinagamers.com/politica-de-cookies/',
            'siblings' => [
                'block' => $seo['sibling_block_url'] ?? 'https://esquinaweb.com/esquinablock/',
                'cut' => $seo['sibling_cut_url'] ?? 'https://esquinaweb.com/esquinacut/',
                'qr' => $seo['sibling_qr_url'] ?? 'https://esquinaweb.com/esquinaqr/',
                'img' => $seo['sibling_img_url'] ?? 'https://esquinaweb.com/esquinaimg/',
                'pdf' => $seo['sibling_pdf_url'] ?? 'https://esquinaweb.com/esquinapdf/',
            ],
            'adsense' => [
                'enabled' => (bool) ($adsense['enabled'] ?? false),
                'client' => $adsense['client'] ?? 'ca-pub-1852556021136727',
                'slots' => [
                    'gameOver' => $adsense['slots']['game_over'] ?? null,
                    'belowBoard' => $adsense['slots']['below_board'] ?? null,
                    'sideLeft' => $adsense['slots']['side_left'] ?? null,
                    'sideRight' => $adsense['slots']['side_right'] ?? null,
                ],
            ],
        ]);
    }
}
