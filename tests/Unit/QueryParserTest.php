<?php

namespace Tests\Unit;

use App\Services\QueryParser;
use PHPUnit\Framework\TestCase;

class QueryParserTest extends TestCase
{
    public function test_kueri_bahasa_indonesia(): void
    {
        $hasil = (new QueryParser())->parse('Dekat stasiun, tidak banjir, di Bogor');

        $this->assertSame(['commuter'], $hasil['persona']);
        $this->assertSame(['bogor'], $hasil['kota']);
        $this->assertTrue($hasil['hindari_banjir']);
    }

    public function test_kueri_bahasa_inggris(): void
    {
        $hasil = (new QueryParser())->parse('Near a train station and a quiet park, no flooding, in Depok');

        $this->assertSame(['commuter', 'zen'], $hasil['persona']);
        $this->assertSame(['depok'], $hasil['kota']);
        $this->assertTrue($hasil['hindari_banjir']);
    }

    public function test_banjir_tanpa_penolakan_tidak_dihindari(): void
    {
        $this->assertFalse((new QueryParser())->parse('flood map of Bekasi')['hindari_banjir']);
    }
}
