<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class EsquinaCutController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('EsquinaCut/Index');
    }
}
