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
            ->assertInertia(fn (Assert $page) => $page->component('EsquinaBlock/Index'));
    }

    public function test_no_crea_cookies(): void
    {
        $this->get('/')->assertCookieMissing('esquinablock_session')->assertCookieMissing('XSRF-TOKEN');
    }

    public function test_adsense_no_se_carga_fuera_de_produccion(): void
    {
        $this->get('/')->assertDontSee('adsbygoogle', false);
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
