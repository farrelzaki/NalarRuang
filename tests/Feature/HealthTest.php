<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_melaporkan_postgis_aktif(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('database', 'pgsql')
            ->assertJsonStructure(['status', 'database', 'postgis']);
    }

    public function test_halaman_landing_dan_peta_tampil(): void
    {
        $this->withoutVite();

        $this->get('/')->assertOk();
        $this->get('/peta')->assertOk();
    }
}
