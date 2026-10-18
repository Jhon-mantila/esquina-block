<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaPdfController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('EsquinaPdf/Index');
    }
}
