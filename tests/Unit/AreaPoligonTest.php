<?php

namespace Tests\Unit;

use App\Services\AreaPoligon;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class AreaPoligonTest extends TestCase
{
    public function test_urai_menutup_cincin_dan_membuang_titik_ganda(): void
    {
        $c = AreaPoligon::urai(' 106.8,-6.2; 106.81,-6.2 ;106.81,-6.2; 106.81,-6.21; 106.8,-6.2 ');

        $this->assertSame([[106.8, -6.2], [106.81, -6.2], [106.81, -6.21], [106.8, -6.2]], $c);
        $this->assertSame('POLYGON((106.8 -6.2,106.81 -6.2,106.81 -6.21,106.8 -6.2))', AreaPoligon::wkt($c));
    }

    public function test_urai_menolak_masukan_tidak_layak(): void
    {
        foreach (['', '106.8,-6.2;106.81,-6.2', 'abc', '106.8,-6.2,1;106.81,-6.2;106.81,-6.21', '100,-6;100.1,-6;100.1,-6.1'] as $teks) {
            try {
                AreaPoligon::urai($teks);
                $this->fail("Masukan '{$teks}' seharusnya ditolak.");
            } catch (InvalidArgumentException $e) {
                $this->assertNotSame('', $e->getMessage());
            }
        }
    }

    public function test_urai_membatasi_jumlah_titik(): void
    {
        $banyak = implode(';', array_map(fn ($i) => (106.8 + $i * 0.0001).','.(-6.2 - ($i % 2) * 0.001), range(0, AreaPoligon::TITIK_MAKS)));
        $this->expectException(InvalidArgumentException::class);
        AreaPoligon::urai($banyak);
    }
}
