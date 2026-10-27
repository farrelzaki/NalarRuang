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
        $this->assertSame(['kota depok'], $hasil['kota']);
        $this->assertTrue($hasil['hindari_banjir']);
    }

    public function test_nama_kecamatan_dikenali(): void
    {
        $p = new QueryParser();

        $this->assertSame('cibubur', $p->parse('Kecamatan Cibubur')['nama_wilayah']);
        $this->assertSame('pondok labu', $p->parse('dekat stasiun di Pondok Labu, tidak banjir')['nama_wilayah']);
        $this->assertNull($p->parse('Daerah mudah transum di Bogor Kota')['nama_wilayah']);
        $this->assertNull($p->parse('near a train station, no flooding, in Depok')['nama_wilayah']);
        $this->assertSame('cipete utara', $p->parse('Cipete Utara')['nama_wilayah']);
        $this->assertNull($p->parse('dekat stasiun di Bogor Utara')['nama_wilayah']);
    }

    public function test_banjir_tanpa_penolakan_tidak_dihindari(): void
    {
        $this->assertFalse((new QueryParser())->parse('flood map of Bekasi')['hindari_banjir']);
    }

    public function test_pembalik_tol_membuang_driver_dan_mengurutkan_jauh_dari_tol(): void
    {
        $h = (new QueryParser())->parse('tidak mau dekat tol');

        $this->assertNotContains('driver', $h['persona']);
        $this->assertSame('jauh_dari_tol', $h['urutkan']);
    }

    public function test_jauh_dari_keramaian_berarti_zen(): void
    {
        $h = (new QueryParser())->parse('jauh dari keramaian');

        $this->assertSame(['zen'], $h['persona']);
        $this->assertNull($h['nama_wilayah']);
    }

    public function test_pembalik_ramai_menambah_zen(): void
    {
        $h = (new QueryParser())->parse('tidak suka mall, dekat stasiun');

        $this->assertSame(['commuter', 'zen'], $h['persona']);
    }

    public function test_pembalik_tidak_menyeberang_ke_klausa_lain(): void
    {
        $h = (new QueryParser())->parse('tidak banjir dekat stasiun');

        $this->assertSame(['commuter'], $h['persona']);
        $this->assertTrue($h['hindari_banjir']);
    }

    public function test_hindari_banjir(): void
    {
        $this->assertTrue((new QueryParser())->parse('hindari banjir')['hindari_banjir']);
    }

    public function test_alias_kota(): void
    {
        $p = new QueryParser();

        $this->assertSame(['jakarta selatan'], $p->parse('dekat stasiun di Jakarta Selatan')['kota']);
        $h = $p->parse('rumah di jaksel yang tenang');
        $this->assertSame(['jakarta selatan'], $h['kota']);
        $this->assertSame(['zen'], $h['persona']);
        $this->assertSame(['kota tangerang selatan'], $p->parse('tangsel dekat tol')['kota']);
        $this->assertNull($p->parse('rumah di jaksel yang tenang')['nama_wilayah']);
    }

    public function test_luar_cakupan(): void
    {
        $p = new QueryParser();

        $this->assertTrue($p->parse('dekat stasiun di Kepulauan Seribu')['luar_cakupan']);
        $this->assertTrue($p->parse('Surabaya dekat stasiun')['luar_cakupan']);
        $this->assertFalse($p->parse('dekat stasiun Lebak Bulus')['luar_cakupan']);
        $this->assertFalse($p->parse('Medan Satria dekat tol')['luar_cakupan']);
    }

    public function test_kata_kunci_harus_kata_utuh(): void
    {
        // "tolong" bukan "tol", "malam" bukan "mal".
        $h = (new QueryParser())->parse('tolong carikan rumah yang aman malam hari');

        $this->assertNotContains('driver', $h['persona']);
        $this->assertNotContains('social_vibe', $h['persona']);
    }
}
