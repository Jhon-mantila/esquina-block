<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_la_herramienta_carga_correctamente(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('aria-label="Volver arriba"', false)
            ->assertInertia(fn (Assert $page) => $page->component('EsquinaBlock/Index'));
    }

    public function test_esquina_cut_carga_correctamente(): void
    {
        // Simula el Alias Apache /esquinacut → public/ (pathInfo = "/", basePath = "/esquinacut").
        // MakesHttpRequests::call no aplica bien el base path de un subdirectorio; manejamos el Request a mano.
        $request = \Illuminate\Http\Request::create('http://localhost/esquinacut/', 'GET', server: [
            'SCRIPT_NAME' => '/esquinacut/index.php',
            'SCRIPT_FILENAME' => public_path('index.php'),
        ]);

        $response = $this->app->handle($request);

        $this->assertSame(200, $response->getStatusCode());
        $content = $response->getContent();
        $this->assertStringContainsString('Esquina Cut', $content);
        $this->assertStringContainsString('EsquinaCut\\/Index', $content);
        $this->assertStringContainsString('plantillas imprimibles', $content);
        $this->assertStringContainsString('contornos de corte', $content);
        $this->assertStringContainsString('SoftwareApplication', $content);
        $this->assertStringContainsString('FAQPage', $content);
        $this->assertStringContainsString('Preguntas frecuentes', $content);
        $this->assertStringContainsString('¿Es gratis Esquina Cut?', $content);
        $this->assertStringContainsString('aria-label="Volver arriba"', $content);
        $this->assertStringContainsString('esquinablock', $content);
    }

    public function test_esquina_qr_carga_correctamente(): void
    {
        $request = \Illuminate\Http\Request::create('http://localhost/esquinaqr/', 'GET', server: [
            'SCRIPT_NAME' => '/esquinaqr/index.php',
            'SCRIPT_FILENAME' => public_path('index.php'),
        ]);

        $response = $this->app->handle($request);

        $this->assertSame(200, $response->getStatusCode());
        $content = $response->getContent();
        $this->assertStringContainsString('EsquinaQR\\/Index', $content);
        $this->assertStringContainsString('EsquinaQR', $content);
        $this->assertStringContainsString('Generador de códigos QR personalizados', $content);
        $this->assertStringContainsString('SoftwareApplication', $content);
        $this->assertStringContainsString('FAQPage', $content);
        $this->assertStringContainsString('¿Es gratis EsquinaQR?', $content);
        $this->assertStringContainsString('¿Cómo hago un QR para mi Wi-Fi?', $content);
        $this->assertStringContainsString('¿Los QR caducan?', $content);
        $this->assertStringContainsString('Cómo crear un QR para Wi-Fi', $content);
        $this->assertStringContainsString('Wi-Fi, vCard, URL', $content);
        $this->assertStringContainsString('aria-label="Volver arriba"', $content);
    }

    public function test_esquina_pdf_carga_correctamente(): void
    {
        $request = \Illuminate\Http\Request::create('http://localhost/esquinapdf/', 'GET', server: [
            'SCRIPT_NAME' => '/esquinapdf/index.php',
            'SCRIPT_FILENAME' => public_path('index.php'),
        ]);

        $response = $this->app->handle($request);

        $this->assertSame(200, $response->getStatusCode());
        $content = $response->getContent();
        $this->assertStringContainsString('EsquinaPdf\\/Index', $content);
        $this->assertStringContainsString('Esquina PDF', $content);
        $this->assertStringContainsString('Une, divide, edita y añade texto', $content);
        $this->assertStringContainsString('SoftwareApplication', $content);
        $this->assertStringContainsString('FAQPage', $content);
        $this->assertStringContainsString('¿Es gratis Esquina PDF?', $content);
        $this->assertStringContainsString('aria-label="Volver arriba"', $content);
        $this->assertStringContainsString('Unir PDFs', $content);
        $this->assertStringContainsString('Eliminar páginas', $content);
        $this->assertStringContainsString('Añadir texto', $content);
        $this->assertStringContainsString('Convertir imágenes a PDF', $content);
    }

    public function test_no_crea_cookies(): void
    {
        $this->get('/')->assertCookieMissing('esquinablock_session')->assertCookieMissing('XSRF-TOKEN');
    }

    public function test_adsense_no_se_carga_fuera_de_produccion(): void
    {
        $this->get('/')
            ->assertDontSee('pagead2.googlesyndication.com', false)
            ->assertDontSee('data-ad-slot', false);
    }

    public function test_adsense_se_carga_con_bloques_configurados(): void
    {
        config([
            'esquinablock.adsense.enabled' => true,
            'esquinablock.adsense.slots.after_tool' => '1111111111',
            'esquinablock.adsense.slots.before_faq' => null,
        ]);

        $this->get('/')
            ->assertSee('adsbygoogle.js?client=ca-pub-1852556021136727', false)
            ->assertSee('data-ad-slot="1111111111"', false)
            ->assertDontSee('data-ad-slot=""', false)
            ->assertDontSee('min-[1536px]:block', false);
    }

    public function test_adsense_en_esquina_cut_con_bloques_configurados(): void
    {
        config([
            'esquinacut.adsense.enabled' => true,
            'esquinacut.adsense.slots.after_tool' => '2222222222',
            'esquinacut.adsense.slots.before_faq' => '3333333333',
            'esquinacut.adsense.slots.side_left' => '4444444444',
        ]);

        $request = \Illuminate\Http\Request::create('http://localhost/esquinacut/', 'GET', server: [
            'SCRIPT_NAME' => '/esquinacut/index.php',
            'SCRIPT_FILENAME' => public_path('index.php'),
        ]);

        $response = $this->app->handle($request);
        $content = $response->getContent();

        $this->assertSame(200, $response->getStatusCode());
        $this->assertStringContainsString('adsbygoogle.js?client=ca-pub-1852556021136727', $content);
        $this->assertStringContainsString('data-ad-slot="2222222222"', $content);
        $this->assertStringContainsString('data-ad-slot="3333333333"', $content);
        $this->assertStringContainsString('4444444444', $content);
    }

    public function test_anuncios_laterales_con_bloques_configurados(): void
    {
        config([
            'esquinablock.adsense.enabled' => true,
            'esquinablock.adsense.slots.side_left' => '2222222222',
            'esquinablock.adsense.slots.side_right' => null,
        ]);

        $this->get('/')
            ->assertSee('min-[1536px]:block', false)
            ->assertSee('{"left":"2222222222"}', false)
            ->assertDontSee('"right"', false);
    }
}
