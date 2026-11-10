<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Cada herramienta tiene su propia plantilla Blade (SEO / FAQ distintos).
     */
    public function rootView(Request $request): string
    {
        $base = $request->getBasePath();

        if (str_contains($base, 'esquinacut')) {
            return 'esquinacut';
        }

        if (str_contains($base, 'esquinaqr')) {
            return 'esquinaqr';
        }

        if (str_contains($base, 'esquinapdf')) {
            return 'esquinapdf';
        }

        if (str_contains($base, 'esquinaimg')) {
            return 'esquinaimg';
        }

        if (str_contains($base, 'esquinabg')) {
            return 'esquinabg';
        }

        if (str_contains($base, 'esquinablocks')) {
            return 'esquinablocks';
        }

        if (str_contains($base, 'esquina2048')) {
            return 'esquina2048';
        }

        // Dominio esquinagamers.com (path real, sin Alias)
        if (str_contains($request->getHost(), 'esquinagamers.com')) {
            if (str_starts_with($request->getPathInfo(), '/esquinablocks')) {
                return 'esquinablocks';
            }
            if (str_starts_with($request->getPathInfo(), '/esquina2048')) {
                return 'esquina2048';
            }
        }

        return 'app';
    }

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            //
        ];
    }
}
