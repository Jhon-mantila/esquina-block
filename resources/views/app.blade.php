<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>Esquina Block — Divide tu imagen en hojas para imprimir un póster</title>

        @routes
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @inertiaHead
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased">
        @inertia
    </body>
</html>
