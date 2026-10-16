<?php

use App\Http\Controllers\EsquinaBlockController;
use App\Http\Controllers\EsquinaCutController;
use Illuminate\Support\Facades\Route;

/*
| Apache (y el symlink local .dev-root) montan la misma carpeta public/ en
| /esquinablock y /esquinacut. Laravel ve la ruta como "/" ; la herramienta
| se elige por base path.
*/
Route::get('/', function () {
    if (str_contains(request()->getBasePath(), 'esquinacut')) {
        return app(EsquinaCutController::class)->index();
    }

    return app(EsquinaBlockController::class)->index();
})->name('home');
