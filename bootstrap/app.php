<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sin formularios ni login: no hacen falta sesión ni CSRF, y así no se crean cookies.
        $middleware->web(
            append: [
                HandleInertiaRequests::class,
            ],
            remove: [
                StartSession::class,
                ShareErrorsFromSession::class,
                ValidateCsrfToken::class,
            ],
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
