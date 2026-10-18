<?php

use App\Http\Controllers\EsquinaBlockController;
use App\Http\Controllers\EsquinaCutController;
use App\Http\Controllers\EsquinaPdfController;
use App\Http\Controllers\EsquinaQRController;
use Illuminate\Support\Facades\Route;

/*
| Apache (y el symlink local .dev-root) montan la misma carpeta public/ en
| /esquinablock, /esquinacut, /esquinaqr y /esquinapdf. Laravel ve la ruta como "/" ;
| la herramienta se elige por base path.
*/
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

    return app(EsquinaBlockController::class)->index();
})->name('home');
