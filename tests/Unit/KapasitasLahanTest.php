<?php

namespace Tests\Unit;

use App\Services\KapasitasLahan;
use PHPUnit\Framework\TestCase;

class KapasitasLahanTest extends TestCase
{
    /** Teks KLB zona perumahan RDTR DKI 2022, disalin apa adanya dari sumber (termasuk spasi yang tidak rapi). */
    private const KLB_R = '- Luas LP kurang dari 60 m2 : Alternatif 1 : 1.2, Alternatif 2 : 3.6, - Luas LP 60 m2 - 120 m2 : Alternatif 1 : 0.9, Alternatif 2 : 3.2, - Luas LP lebih dari 120 m2 - 240 m2:  Alternatif 1 : 0.8,Alternatif 2 : 2.4 , - Luas LP lebih dari 240 - 400 m2: Alternatif 1 : 0.6, Alternatif 2 : 2,- Luas LP lebih dari 400 m2: Alternatif 1 : 0.6, Alternatif 2 : 1.6';

    private const KDB_R = '- Luas LP kurang dari 60 m2 : Alternatif 1 : 100, Alternatif 2 : 90, - Luas LP 60 m2 - 120 m2 : Alternatif 1 : 90, Alternatif 2 : 80,- Luas LP lebih dari 120 m2 - 240 m2: Alternatif 1 : 80, Alternatif 2 : 60,- Luas LP lebih dari 240 - 400 m2 : Alternatif 1 : 60, Alternatif 2 : 50, - Luas LP lebih dari 400 m2 : Alternatif 1 : 60, Alternatif 2 : 40';

    private const KLB_R_BESAR = '- Luas LP lebih dari 240 - 400 m2 : Alternatif 1 : 0.6, Alternatif 2 : 2, - Luas LP lebih dari 400 m2 : Alternatif 1 : 0.6, Alternatif 2 : 1.6';

    private KapasitasLahan $k;

    protected function setUp(): void
    {
        $this->k = new KapasitasLahan();
    }

    public function test_intensitas_angka_tunggal_termasuk_koma_desimal(): void
    {
        $this->assertSame(55.0, KapasitasLahan::intensitas('55', 500));
        $this->assertSame(1.2, KapasitasLahan::intensitas('1,2', 500));
        $this->assertSame(6.84, KapasitasLahan::intensitas(' 6.84 ', 500));
        $this->assertNull(KapasitasLahan::intensitas('null', 500));
        $this->assertNull(KapasitasLahan::intensitas(null, 500));
        $this->assertNull(KapasitasLahan::intensitas('', 500));
    }

    public function test_intensitas_bertingkat_memilih_tingkat_sesuai_luas_persil(): void
    {
        $this->assertSame(1.2, KapasitasLahan::intensitas(self::KLB_R, 45));
        $this->assertSame(0.9, KapasitasLahan::intensitas(self::KLB_R, 90));
        $this->assertSame(0.9, KapasitasLahan::intensitas(self::KLB_R, 120));
        $this->assertSame(0.8, KapasitasLahan::intensitas(self::KLB_R, 200));
        $this->assertSame(0.6, KapasitasLahan::intensitas(self::KLB_R, 300));
        $this->assertSame(0.6, KapasitasLahan::intensitas(self::KLB_R, 5000));
    }

    public function test_intensitas_bertingkat_alternatif_dua_untuk_bangunan_vertikal(): void
    {
        $this->assertSame(3.2, KapasitasLahan::intensitas(self::KLB_R, 90, 2));
        $this->assertSame(1.6, KapasitasLahan::intensitas(self::KLB_R, 5000, 2));
        $this->assertSame(40.0, KapasitasLahan::intensitas(self::KDB_R, 5000, 2));
        $this->assertSame(90.0, KapasitasLahan::intensitas(self::KDB_R, 90, 1));
    }

    public function test_intensitas_lahan_lebih_kecil_dari_tingkat_terkecil_memakai_tingkat_pertama(): void
    {
        $this->assertSame(0.6, KapasitasLahan::intensitas(self::KLB_R_BESAR, 100));
        $this->assertSame(2.0, KapasitasLahan::intensitas(self::KLB_R_BESAR, 100, 2));
    }

    public function test_tingkat_terurut_dan_lengkap(): void
    {
        $t = KapasitasLahan::tingkat(self::KLB_R);
        $this->assertCount(5, $t);
        $this->assertSame([0.0, 60.0], [$t[0]['min'], $t[0]['max']]);
        $this->assertSame([400.0, null], [$t[4]['min'], $t[4]['max']]);
        $this->assertSame([1 => 1.2, 2 => 3.6], $t[0]['nilai']);
    }

    public function test_asumsi_dijepit_ke_rentang_dan_kunci_asing_dibuang(): void
    {
        $a = $this->k->asumsi('kos', ['luas_kamar' => 2, 'efisiensi' => 0.95, 'lantai' => '3', 'jahat' => 1]);
        $this->assertSame(6.0, $a['luas_kamar']);
        $this->assertSame(0.9, $a['efisiensi']);
        $this->assertSame(3, $a['lantai']);
        $this->assertArrayNotHasKey('jahat', $a);

        $b = $this->k->asumsi('rumah', []);
        $this->assertSame(KapasitasLahan::BAWAAN['rumah'], $b);
    }

    public function test_rumah_tapak_menghitung_turunan_dari_jumlah_kavling(): void
    {
        $asumsi = $this->k->asumsi('rumah', []);
        // 1 ha, 72 kavling 6x15 m (90 m²): KDB 90 %, KLB 0,9 untuk persil 90 m² (RDTR zona R, alternatif 1).
        $r = $this->k->rumah(10000, 72, $asumsi, 90.0, 0.9);

        $this->assertSame(72, $r['jumlah']);
        $this->assertSame('rumah', $r['satuan']);
        $this->assertSame(90.0, $r['luas_kavling_m2']);
        $this->assertSame(81.0, $r['luas_tapak_per_unit_m2']);
        $this->assertSame(1, $r['lantai']);
        $this->assertSame(81.0, $r['luas_bangunan_per_unit_m2']);
        $this->assertSame(0.352, $r['porsi_jalan_fasum']);
        $this->assertSame(72.0, $r['kepadatan_per_ha']);
    }

    public function test_rumah_tanpa_zona_memakai_asumsi_dua_lantai(): void
    {
        $r = $this->k->rumah(10000, 70, $this->k->asumsi('rumah', []), null, null);
        // KDB 60 % x 90 m² = 54 m² tapak; KLB 1,2 x 90 = 108 m² lantai, jadi 2 lantai.
        $this->assertSame(54.0, $r['luas_tapak_per_unit_m2']);
        $this->assertSame(2, $r['lantai']);
        $this->assertSame(108.0, $r['luas_bangunan_per_unit_m2']);
    }

    public function test_kos_contoh_lahan_500_m2(): void
    {
        $asumsi = $this->k->asumsi('kos', []);
        // Lahan 500 m², sempadan menyisakan 400 m²; KDB 60 % -> tapak 300 m²; KLB 1,8 -> 900 m² lantai = 3 lantai.
        $r = $this->k->bangunan('kos', 500, 400, $asumsi, 60.0, 1.8);

        $this->assertSame(300.0, $r['luas_tapak_m2']);
        $this->assertSame(3, $r['lantai']);
        $this->assertSame(900.0, $r['luas_lantai_m2']);
        $this->assertSame(52, $r['jumlah']); // 900 x 0,7 / 12 = 52,5
        $this->assertSame('kamar', $r['satuan']);
    }

    public function test_tapak_dibatasi_sempadan_bila_lebih_kecil_dari_kdb(): void
    {
        $r = $this->k->bangunan('kos', 500, 200, $this->k->asumsi('kos', []), 60.0, 1.8);
        $this->assertSame(200.0, $r['luas_tapak_m2']);
        $this->assertSame(4, $r['lantai']); // 900 / 200 = 4,5 -> dibatasi LANTAI_MAKS kos 4
        $this->assertSame(800.0, $r['luas_lantai_m2']);
    }

    public function test_lantai_pilihan_pengguna_tidak_melebihi_batas(): void
    {
        $r = $this->k->bangunan('apartemen', 5000, 4000, $this->k->asumsi('apartemen', ['lantai' => 60]), 40.0, 1.6);
        // KLB 1,6 x 5000 = 8000 m²; tapak 2000 m² -> maks 4 lantai, meski pengguna minta 60.
        $this->assertSame(4, $r['lantai_maks']);
        $this->assertSame(4, $r['lantai']);
        $this->assertSame(166, $r['jumlah']); // 8000 x 0,75 / 36 = 166,7

        $r2 = $this->k->bangunan('apartemen', 5000, 4000, $this->k->asumsi('apartemen', ['lantai' => 2]), 40.0, 1.6);
        $this->assertSame(2, $r2['lantai']);
        $this->assertSame(4000.0, $r2['luas_lantai_m2']);
    }

    public function test_zona_tanpa_intensitas_menghasilkan_nol(): void
    {
        $r = $this->k->bangunan('kos', 500, 400, $this->k->asumsi('kos', []), 0.0, 0.0);
        $this->assertSame(0, $r['jumlah']);
        $this->assertSame(0, $r['lantai']);
    }

    public function test_faktor_skala_tapak(): void
    {
        $this->assertSame(0.5, KapasitasLahan::faktorSkala(400, 100));
        $this->assertSame(1.0, KapasitasLahan::faktorSkala(100, 400));
        $this->assertSame(0.0, KapasitasLahan::faktorSkala(0, 100));
    }
}
