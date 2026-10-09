<?php

namespace Tests\Unit;

use App\Services\PersonaScoring;
use PHPUnit\Framework\TestCase;

class PersonaScoringTest extends TestCase
{
    private PersonaScoring $skor;

    protected function setUp(): void
    {
        $this->skor = new PersonaScoring();
    }

    public function test_bintang_dari_jarak_mengikuti_ambang_15_minute_city(): void
    {
        $this->assertSame(3, $this->skor->bintangJarak(1000));
        $this->assertSame(3, $this->skor->bintangJarak(1200));
        $this->assertSame(2, $this->skor->bintangJarak(2000));
        $this->assertSame(1, $this->skor->bintangJarak(4000));
        $this->assertSame(0, $this->skor->bintangJarak(6000));
        $this->assertNull($this->skor->bintangJarak(null));
    }

    public function test_zen_dari_kualitas_udara_dikurangi_jarak_rth(): void
    {
        $this->assertSame(3, $this->skor->bintangZen('sehat', 800));
        $this->assertSame(1, $this->skor->bintangZen('kurang_sehat', 3000));
        $this->assertSame(1, $this->skor->bintangZen('sehat', null));
        $this->assertSame(0, $this->skor->bintangZen('tidak_sehat', 6000));
        $this->assertNull($this->skor->bintangZen(null, 500));
    }

    public function test_wilayah_cocok_bila_ada_fasilitas_utama(): void
    {
        $this->assertTrue($this->skor->cocokWilayah('commuter', 1));
        $this->assertFalse($this->skor->cocokWilayah('driver', 0));
        $this->assertTrue($this->skor->cocokWilayah('zen', 2, 'kurang_sehat'));
        $this->assertFalse($this->skor->cocokWilayah('zen', 2, 'tidak_sehat'));
    }

    public function test_kalimat_kesimpulan(): void
    {
        $this->assertSame('Buat gaya hidup Commuter: Sangat mendukung aktivitasmu!', $this->skor->kesimpulanTitik('commuter', 3));
        $this->assertSame('Belum cocok untuk gaya hidup Zen.', $this->skor->kesimpulanWilayah('zen', false));
    }
}
