<?php

namespace Tests\Unit;

use Database\Seeders\DataNyataSeeder;
use PHPUnit\Framework\TestCase;

class DataNyataTest extends TestCase
{
    public function test_batas_kelas_relatif_40_80_persen(): void
    {
        // Sepuluh kelurahan: 4 terbersih sehat, 4 berikutnya kurang sehat, 2 tercemar tidak sehat.
        $batas = DataNyataSeeder::batasKelas([40, 22, 30, 24, 38, 26, 34, 28, 36, 32]);

        $this->assertSame(['sehat' => 28, 'kurang_sehat' => 36], $batas);
    }

    public function test_kategori_udara_relatif(): void
    {
        $batas = ['sehat' => 33.8, 'kurang_sehat' => 39.6];

        $this->assertSame('sehat', DataNyataSeeder::kategoriUdara(23.0, $batas));
        $this->assertSame('sehat', DataNyataSeeder::kategoriUdara(33.8, $batas));
        $this->assertSame('kurang_sehat', DataNyataSeeder::kategoriUdara(36.0, $batas));
        $this->assertSame('tidak_sehat', DataNyataSeeder::kategoriUdara(43.1, $batas));
        $this->assertSame('berbahaya', DataNyataSeeder::kategoriUdara(60.0, $batas), 'Berbahaya tetap ambang mutlak.');
        $this->assertNull(DataNyataSeeder::kategoriUdara(null, $batas));
    }
}
