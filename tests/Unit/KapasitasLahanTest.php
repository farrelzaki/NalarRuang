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
        $a = $this->k->asumsi('kos', ['luas_kamar' => 2, 'rasio_motor' => 9, 'lantai' => '3', 'jahat' => 1]);
        $this->assertSame(6.0, $a['luas_kamar']);
        $this->assertSame(3.0, $a['rasio_motor']);
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
        $this->assertSame(56, $r['jumlah']); // 900 x 0,75 (efisiensi cadangan) / 12 = 56,25
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

    public function test_porsi_tipe_apartemen_dan_luas_rata_rata(): void
    {
        $a = $this->k->asumsi('apartemen', []);
        $this->assertEqualsWithDelta(['studio' => 0.3, '1br' => 0.5, '2br' => 0.2], $this->k->porsiTipe($a), 1e-9);
        $this->assertEqualsWithDelta(36.0, $this->k->luasRataUnit($a), 1e-9); // 0,3x24 + 0,5x36 + 0,2x54
        $this->assertSame(4.5, $this->k->lebarUnit('apartemen', $a));          // 36 / 8 m
        $this->assertSame(3.0, $this->k->lebarUnit('kos', $this->k->asumsi('kos', []))); // 12 / 4 m

        // Studio + 2 kamar > 100 % dipangkas supaya 1 kamar tidak negatif.
        $b = $this->k->asumsi('apartemen', ['porsi_studio' => 0.7, 'porsi_2br' => 0.6]);
        $this->assertEqualsWithDelta(0.3, $b['porsi_2br'], 1e-9);
        $this->assertEqualsWithDelta(0.0, $this->k->porsiTipe($b)['1br'], 1e-9);
    }

    public function test_tebal_gedung_koridor_tengah(): void
    {
        $this->assertSame(18.0, KapasitasLahan::tebalGedung('apartemen')); // 8 + 2 + 8
        $this->assertSame(9.5, KapasitasLahan::tebalGedung('kos'));        // 4 + 1,5 + 4
    }

    public function test_sebar_tipe_merata_sesuai_porsi(): void
    {
        $urut = KapasitasLahan::sebarTipe(10, ['studio' => 0.3, '1br' => 0.5, '2br' => 0.2]);
        $this->assertCount(10, $urut);
        $this->assertSame(['studio' => 3, '1br' => 5, '2br' => 2], array_merge(['studio' => 0, '1br' => 0, '2br' => 0], array_count_values($urut)));
        // Tidak ada tiga petak berturut-turut bertipe sama untuk porsi seimbang seperti ini.
        for ($i = 2; $i < 10; $i++) {
            $this->assertFalse($urut[$i] === $urut[$i - 1] && $urut[$i] === $urut[$i - 2], "Tipe menumpuk di petak {$i}");
        }
        $this->assertSame([], KapasitasLahan::sebarTipe(0, ['studio' => 1]));
        $this->assertSame(['kamar', 'kamar'], KapasitasLahan::sebarTipe(2, ['kamar' => 1, 'x' => 0]));
    }

    public function test_porsi_lingkar_dibatasi_kdb(): void
    {
        $this->assertSame(1.0, KapasitasLahan::porsiLingkar(10000, 60, 4000));   // KDB 6000 m² > cincin
        $this->assertSame(0.5, KapasitasLahan::porsiLingkar(10000, 20, 4000));   // KDB 2000 m² = separuh cincin
        $this->assertSame(0.0, KapasitasLahan::porsiLingkar(10000, 60, 0));
    }

    public function test_gedung_unit_per_lantai_kali_lantai_dan_parkir(): void
    {
        $a = $this->k->asumsi('apartemen', []);
        $urut = KapasitasLahan::sebarTipe(40, $this->k->porsiTipe($a));
        // Lahan 5000 m², tapak gedung 1800 m², KLB 1,6 -> 8000 m² lantai -> maks 4 lantai.
        $g = $this->k->gedung('apartemen', 5000, 1800, $urut, $a, 40.0, 1.6);

        $this->assertSame(4, $g['lantai']);
        $this->assertSame(40, $g['unit_per_lantai']);
        $this->assertSame(160, $g['jumlah']);
        $this->assertSame(['studio' => 48, '1br' => 80, '2br' => 32], array_merge(['studio' => 0, '1br' => 0, '2br' => 0], $g['komposisi']));
        $this->assertSame(80, $g['parkir']['butuh']); // 160 x 0,5
        $this->assertSame(7200.0, $g['luas_lantai_m2']);

        $dua = $this->k->gedung('apartemen', 5000, 1800, $urut, $this->k->asumsi('apartemen', ['lantai' => 2]), 40.0, 1.6);
        $this->assertSame(80, $dua['jumlah']);

        $kosong = $this->k->gedung('kos', 5000, 0, [], $this->k->asumsi('kos', []), 60.0, 1.8);
        $this->assertSame(0, $kosong['jumlah']);
    }

    public function test_faktor_skala_tapak(): void
    {
        $this->assertSame(0.5, KapasitasLahan::faktorSkala(400, 100));
        $this->assertSame(1.0, KapasitasLahan::faktorSkala(100, 400));
        $this->assertSame(0.0, KapasitasLahan::faktorSkala(0, 100));
    }

    public function test_pola_tidak_dikenal_jatuh_ke_bawaan(): void
    {
        $this->assertSame('wrap', KapasitasLahan::polaSah('apartemen', 'wrap'));
        $this->assertSame('keliling', KapasitasLahan::polaSah('apartemen', 'grid'));
        $this->assertSame('grid', KapasitasLahan::polaSah('rumah', null));
        $this->assertSame('koridor', KapasitasLahan::polaSah('kos', 'koridor'));
    }

    public function test_parkir_motor_untuk_kos_mobil_untuk_apartemen(): void
    {
        $this->assertSame('motor', KapasitasLahan::jenisParkir('kos'));
        $this->assertSame('mobil', KapasitasLahan::jenisParkir('apartemen'));
        $this->assertNull(KapasitasLahan::jenisParkir('rumah'));
        $this->assertSame(40, $this->k->butuhParkir('kos', 40, $this->k->asumsi('kos', [])));
        $this->assertSame(20, $this->k->butuhParkir('apartemen', 40, $this->k->asumsi('apartemen', [])));
        $this->assertSame(0.8, KapasitasLahan::ukuranSlot('motor')['lebar']);
        $this->assertSame(2.5, KapasitasLahan::ukuranSlot('mobil')['lebar']);
    }

    public function test_lantai_gedung_parkir(): void
    {
        $this->assertSame(3, KapasitasLahan::lantaiParkir(250, 100, 10));
        $this->assertSame(2, KapasitasLahan::lantaiParkir(250, 100, 2)); // tidak lebih tinggi dari gedung hunian
        $this->assertSame(1, KapasitasLahan::lantaiParkir(0, 100, 10));
        $this->assertSame(0, KapasitasLahan::lantaiParkir(50, 0, 10));
    }

    public function test_sisi_tower_dibatasi_kdb_tapak_maks_dan_lahan(): void
    {
        // 10.000 m2, KDB 40 %: 90 % x 4.000 = 3.600, dibatasi 1.600 -> sisi 40 m.
        $this->assertSame(40.0, KapasitasLahan::sisiTower(10000, 40, 9000));
        // Lahan kecil: 80 % x 500 = 400 -> sisi 20 m.
        $this->assertSame(20.0, KapasitasLahan::sisiTower(1000, 60, 500));
        $this->assertSame(0.0, KapasitasLahan::sisiTower(1000, 0, 500));
    }

    public function test_ringkasan_menandai_pelanggaran(): void
    {
        $r = KapasitasLahan::ringkasan('apartemen', 10000, 5000, 30000, 500, 6, 40, 4.0, 10.0, ['butuh' => 100, 'muat' => 60]);
        $this->assertSame(50.0, $r['kdb_terpakai']);
        $this->assertSame(3.0, $r['klb_terpakai']);
        $this->assertSame(5.0, $r['kdh_terpakai']);
        $this->assertSame(19.2, $r['tinggi_m']);
        $this->assertSame(['kdb', 'kdh', 'parkir'], $r['pelanggaran']);

        $aman = KapasitasLahan::ringkasan('kos', 1000, 500, 1500, 200, 3, 60, 1.8, null, ['butuh' => 10, 'muat' => 10]);
        $this->assertSame([], $aman['pelanggaran']);
    }

    public function test_akses_gerbang_dan_pintu(): void
    {
        $this->assertTrue(KapasitasLahan::aksesBerlaku('rumah', 'gerbang'));
        $this->assertFalse(KapasitasLahan::aksesBerlaku('rumah', 'pintu'));
        $this->assertTrue(KapasitasLahan::aksesBerlaku('kos', 'pintu'));
        $this->assertFalse(KapasitasLahan::aksesBerlaku('apartemen', 'jendela'));
        $this->assertSame(8.0, KapasitasLahan::lebarAkses('rumah', $this->k->asumsi('rumah', [])));
        $this->assertSame(3.0, KapasitasLahan::lebarAkses('kos', []));
        $this->assertSame(6.0, KapasitasLahan::lebarAkses('apartemen', []));
    }

    public function test_sisi_terdekat_untuk_parkir_dekat_gerbang(): void
    {
        $this->assertSame('y0', KapasitasLahan::sisiTerdekat(50, 1, 0, 0, 100, 60));
        $this->assertSame('y1', KapasitasLahan::sisiTerdekat(50, 59, 0, 0, 100, 60));
        $this->assertSame('x0', KapasitasLahan::sisiTerdekat(2, 30, 0, 0, 100, 60));
        $this->assertSame('x1', KapasitasLahan::sisiTerdekat(99, 30, 0, 0, 100, 60));
    }

    public function test_lebar_gerbang_dijepit(): void
    {
        $this->assertSame(6.0, KapasitasLahan::lebarGerbang('apartemen', [], null));
        $this->assertSame(12.0, KapasitasLahan::lebarGerbang('apartemen', [], '12'));
        $this->assertSame(2.5, KapasitasLahan::lebarGerbang('kos', [], 1));
        $this->assertSame(30.0, KapasitasLahan::lebarGerbang('rumah', [], 99));
    }

    public function test_panjang_gerbang_dijepit_atau_otomatis(): void
    {
        $this->assertNull(KapasitasLahan::panjangGerbang(null));
        $this->assertNull(KapasitasLahan::panjangGerbang(''));
        $this->assertSame(15.0, KapasitasLahan::panjangGerbang('15'));
        $this->assertSame(2.0, KapasitasLahan::panjangGerbang(0));
        $this->assertSame(300.0, KapasitasLahan::panjangGerbang(900));
    }

    public function test_lebar_dan_kedalaman_pintu(): void
    {
        $this->assertSame(3.0, KapasitasLahan::lebarPintu(null));
        $this->assertSame(1.5, KapasitasLahan::lebarPintu(0.5));
        $this->assertSame(20.0, KapasitasLahan::lebarPintu(50));
        $this->assertNull(KapasitasLahan::panjangPintu(''));
        $this->assertSame(40.0, KapasitasLahan::panjangPintu(99));
        $this->assertSame(12.0, KapasitasLahan::panjangPintu('12'));
    }
}
