<?php

namespace Tests\Unit;

use Database\Seeders\DataNyataSeeder;
use PHPUnit\Framework\TestCase;

class DataNyataTest extends TestCase
{
    public function test_kategori_udara_dari_pm25_tahunan(): void
    {
        $this->assertSame('sehat', DataNyataSeeder::kategoriUdara(23.0));
        $this->assertSame('sehat', DataNyataSeeder::kategoriUdara(25.0));
        $this->assertSame('kurang_sehat', DataNyataSeeder::kategoriUdara(25.1));
        $this->assertSame('kurang_sehat', DataNyataSeeder::kategoriUdara(35.0));
        $this->assertSame('tidak_sehat', DataNyataSeeder::kategoriUdara(43.1));
        $this->assertSame('berbahaya', DataNyataSeeder::kategoriUdara(60.0));
        $this->assertNull(DataNyataSeeder::kategoriUdara(null));
    }
}
