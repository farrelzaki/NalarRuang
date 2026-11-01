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
        $this->assertTrue($this->skor->cocokWilayah('commuter', 0), 'Fasilitas di dalam wilayah.');
        $this->assertTrue($this->skor->cocokWilayah('driver', 2500), 'Tepat 2,5 km dari batas masih cocok.');
        $this->assertFalse($this->skor->cocokWilayah('driver', 2501));
        $this->assertFalse($this->skor->cocokWilayah('social_vibe', null));
        $this->assertTrue($this->skor->cocokWilayah('zen', 800, 'kurang_sehat'));
        $this->assertFalse($this->skor->cocokWilayah('zen', 0, 'tidak_sehat'));
    }

    public function test_kalimat_kesimpulan(): void
    {
        $this->assertSame('Buat gaya hidup Commuter: Sangat mendukung aktivitasmu!', $this->skor->kesimpulanTitik('commuter', 3));
        $this->assertSame('Belum cocok untuk gaya hidup Zen.', $this->skor->kesimpulanWilayah('zen', false));
        $this->assertSame(
            'Buat gaya hidup Commuter: Cukup mendukung aktivitasmu karena terdapat Stasiun Tanjung Barat yang berjarak 2,0 km dari lokasi.',
            $this->skor->kesimpulanTitik('commuter', 2, ['nama' => 'Tanjung Barat', 'meter' => 2000]),
        );
        $this->assertSame(
            'Buat gaya hidup Driver: Mungkin kurang optimal karena gerbang tol terdekat (Cibubur) berjarak 4,2 km dari lokasi. Pertimbangkan lokasi lain.',
            $this->skor->kesimpulanTitik('driver', 1, ['nama' => 'Cibubur', 'meter' => 4210]),
        );
        $this->assertStringContainsString('area bahaya banjir kelas tinggi',
            $this->skor->kesimpulanTitik('zen', 2, ['nama' => '', 'meter' => 300, 'kualitas_udara' => 'sehat', 'banjir' => 'tinggi']));
    }
}
