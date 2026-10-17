<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaQRController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('EsquinaQR/Index');
    }
}
