<?php

use App\Http\Controllers\EsquinaBlockController;
use Illuminate\Support\Facades\Route;

// "/" es relativo al subdirectorio: en producción Apache monta public/ en /esquinablock.
Route::get('/', [EsquinaBlockController::class, 'index'])->name('esquinablock');
