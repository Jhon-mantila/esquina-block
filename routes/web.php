<?php

use App\Http\Controllers\EsquinaBGController;
use App\Http\Controllers\EsquinaBlockController;
use App\Http\Controllers\EsquinaCutController;
use App\Http\Controllers\EsquinaImgController;
use App\Http\Controllers\EsquinaPdfController;
use App\Http\Controllers\EsquinaQRController;
use App\Http\Controllers\JuegoController;
use Illuminate\Support\Facades\Route;

/*
| Apache (y el symlink local .dev-root) montan la misma carpeta public/ en
| /esquinablock, /esquinacut, /esquinaqr, /esquinapdf, /esquinaimg, /esquinabg y /esquina2048.
| Laravel ve la ruta como "/" ; la herramienta se elige por base path.
|
| En esquinagamers.com también se expone /esquina2048 por dominio (producción).
*/

Route::domain('esquinagamers.com')->group(function () {
    Route::get('/esquina2048', [JuegoController::class, 'esquina2048'])->name('juego.2048');
    Route::redirect('/esquina2048/', '/esquina2048', 301);
});

Route::get('/', function () {
    $base = request()->getBasePath();

    if (str_contains($base, 'esquinacut')) {
        return app(EsquinaCutController::class)->index();
    }

    if (str_contains($base, 'esquinaqr')) {
        return app(EsquinaQRController::class)->index();
    }

    if (str_contains($base, 'esquinapdf')) {
        return app(EsquinaPdfController::class)->index();
    }

    if (str_contains($base, 'esquinaimg')) {
        return app(EsquinaImgController::class)->index();
    }

    if (str_contains($base, 'esquinabg')) {
        return app(EsquinaBGController::class)->index();
    }

    if (str_contains($base, 'esquina2048')) {
        return app(JuegoController::class)->esquina2048();
    }

    return app(EsquinaBlockController::class)->index();
})->name('home');
