<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * POST /api/lahan (Uji Lahan, FR-23) di atas data uji kecil: satu kelurahan kotak di Jakarta Selatan,
 * fasilitas utama tiap persona, satu zona perumahan RDTR dengan KDB/KLB bertingkat, dan satu area rawan banjir.
 */
class LahanTest extends TestCase
{
    use RefreshDatabase;

    private const KDB_R = '- Luas LP kurang dari 60 m2 : Alternatif 1 : 100, Alternatif 2 : 90, - Luas LP 60 m2 - 120 m2 : Alternatif 1 : 90, Alternatif 2 : 80,- Luas LP lebih dari 120 m2 - 240 m2: Alternatif 1 : 80, Alternatif 2 : 60,- Luas LP lebih dari 240 - 400 m2 : Alternatif 1 : 60, Alternatif 2 : 50, - Luas LP lebih dari 400 m2 : Alternatif 1 : 60, Alternatif 2 : 40';

    private const KLB_R = '- Luas LP kurang dari 60 m2 : Alternatif 1 : 1.2, Alternatif 2 : 3.6, - Luas LP 60 m2 - 120 m2 : Alternatif 1 : 0.9, Alternatif 2 : 3.2, - Luas LP lebih dari 120 m2 - 240 m2:  Alternatif 1 : 0.8,Alternatif 2 : 2.4 , - Luas LP lebih dari 240 - 400 m2: Alternatif 1 : 0.6, Alternatif 2 : 2,- Luas LP lebih dari 400 m2: Alternatif 1 : 0.6, Alternatif 2 : 1.6';

    /** Kotak sekitar 110 x 110 m (0,001 derajat) di dalam kelurahan uji. */
    private const LAHAN = [[106.802, -6.208], [106.803, -6.208], [106.803, -6.207], [106.802, -6.207], [106.802, -6.208]];

    protected function setUp(): void
    {
        parent::setUp();

        DB::insert(
            "INSERT INTO wilayah (nama, kecamatan, kota, tipe_kawasan, kualitas_udara, atribut, geom, created_at, updated_at)
             VALUES ('Kebon Uji', 'Uji', 'Jakarta Selatan', 'Permukiman', 'sehat', '{}'::jsonb,
                     ST_Multi(ST_MakeEnvelope(106.80, -6.21, 106.81, -6.20, 4326)), now(), now())",
        );

        $titik = fn (string $jenis, string $layer, float $lng, float $lat, string $nama) => DB::insert(
            "INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at)
             VALUES (?, ?, ?, '{}'::jsonb, 'uji', ST_SetSRID(ST_MakePoint(?, ?), 4326), now(), now())",
            [$layer, $jenis, $nama, $lng, $lat],
        );
        $titik('stasiun', 'mobilitas', 106.805, -6.205, 'Stasiun A');
        $titik('tol', 'mobilitas', 106.85, -6.25, 'Toll Gate Jauh');
        $titik('poi', 'ekosistem', 106.8025, -6.2075, 'Kopi Dalam Lahan');

        DB::insert(
            "INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at) VALUES
            ('ekosistem', 'rth', 'Taman', '{\"luas_m2\": 100000}'::jsonb, 'uji', ST_MakeEnvelope(106.806, -6.209, 106.807, -6.208, 4326), now(), now()),
            ('historis_risiko', 'banjir_tampil', 'Rawan', '{\"tingkat\": 2}'::jsonb, 'uji', ST_MakeEnvelope(106.802, -6.208, 106.8025, -6.207, 4326), now(), now())",
        );

        DB::insert(
            "INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, tahun, sumber, geom, created_at, updated_at)
             VALUES ('zonasi', 'zonasi', 'Perumahan', jsonb_build_object('zona', 'Zona Perumahan', 'kode_subzona', 'R-4', 'kdb_teks', ?::text, 'klb_teks', ?::text),
                     2022, 'uji', ST_MakeEnvelope(106.80, -6.21, 106.81, -6.20, 4326), now(), now())",
            [self::KDB_R, self::KLB_R],
        );
    }

    private function lahan(array $tambahan = [], array $cincin = self::LAHAN)
    {
        return $this->postJson('/api/lahan', array_merge([
            'geometri' => ['type' => 'Polygon', 'coordinates' => [$cincin]],
            'tipe' => 'rumah',
            'persona' => ['commuter', 'zen'],
        ], $tambahan));
    }

    public function test_rumah_tapak_menghitung_kavling_yang_muat(): void
    {
        $r = $this->lahan()->assertOk()->json();

        $this->assertEqualsWithDelta(12200, $r['luas_m2'], 400);
        $this->assertSame('Zona Perumahan', $r['zonasi']['zona']);
        $this->assertSame('RDTR DKI 2022', $r['intensitas']['sumber']);
        $this->assertSame(90.0, (float) $r['intensitas']['kdb']); // persil 90 m², alternatif 1
        $this->assertSame(0.9, (float) $r['intensitas']['klb']);

        $kavling = array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'kavling');
        $this->assertSame(count($kavling), $r['kapasitas']['jumlah']);
        // Pola grid: jalan lingkar 8 m dan taman/fasum sekitar 10 % di satu ujung.
        $this->assertSame('grid', $r['pola']);
        $this->assertFalse($r['zona_manual']);
        $this->assertGreaterThan(30, $r['kapasitas']['jumlah']);
        $this->assertLessThan(120, $r['kapasitas']['jumlah']);
        $this->assertSame('rumah', $r['kapasitas']['satuan']);
        $this->assertNotEmpty(array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'jalan'));
        $jenisZona = array_column(array_column($r['zona']['features'], 'properties'), 'jenis');
        $this->assertContains('bangunan', $jenisZona);
        $this->assertContains('taman', $jenisZona);
        $this->assertGreaterThan(0, $r['ringkasan']['kdh_terpakai']);
        $this->assertArrayHasKey('pelanggaran', $r['ringkasan']);

        $this->assertTrue($r['match']['commuter'], 'Stasiun A sekitar 300 m dari lahan.');
        $this->assertFalse($r['match']['driver'], 'Gerbang tol lebih dari 2,5 km.');
        $this->assertSame(1, $r['jumlah_fasilitas']['social_vibe']);
        $this->assertCount(2, $r['kesimpulan']);
        $this->assertEqualsWithDelta(0.5, $r['banjir']['porsi_rawan'], 0.05);
    }

    public function test_kos_dan_apartemen_memakai_alternatif_yang_berbeda(): void
    {
        $kos = $this->lahan(['tipe' => 'kos'])->assertOk()->json();
        $this->assertSame(1, $kos['intensitas']['alternatif']);
        $this->assertSame(0.6, (float) $kos['intensitas']['klb']);
        $this->assertSame('kamar', $kos['kapasitas']['satuan']);
        $jenisKos = array_column(array_column($kos['geometri_kapasitas']['features'], 'properties'), 'jenis');
        $this->assertContains('unit', $jenisKos);
        $this->assertContains('koridor', $jenisKos);
        $this->assertSame($kos['kapasitas']['unit_per_lantai'] * $kos['kapasitas']['lantai'], $kos['kapasitas']['jumlah']);
        $this->assertSame('motor', $kos['kapasitas']['parkir']['jenis']);
        $this->assertSame($kos['kapasitas']['jumlah'], $kos['kapasitas']['parkir']['butuh']); // 1 motor per kamar
        $this->assertSame(['keliling', 'koridor', 'grid'], $kos['pola_tersedia']);

        $apt = $this->lahan(['tipe' => 'apartemen', 'asumsi' => ['porsi_studio' => 0.2, 'porsi_2br' => 0.5]])->assertOk()->json();
        $this->assertSame(2, $apt['intensitas']['alternatif']);
        $this->assertSame(1.6, (float) $apt['intensitas']['klb']);
        $this->assertEqualsWithDelta(0.5, (float) $apt['asumsi']['porsi_2br'], 1e-9);
        $k = $apt['kapasitas'];
        $this->assertGreaterThan(0, $k['unit_per_lantai']);
        $this->assertSame($k['jumlah'], array_sum($k['komposisi']));
        $this->assertGreaterThan($k['komposisi']['studio'] ?? 0, $k['komposisi']['2br'] ?? 0);
        $this->assertSame((int) ceil($k['jumlah'] * 0.5), $k['parkir']['butuh']);
        $this->assertSame('mobil', $k['parkir']['jenis']);
        $this->assertGreaterThan(0, $k['parkir']['muat']);
        $tipeUnit = array_unique(array_column(array_filter(array_column($apt['geometri_kapasitas']['features'], 'properties'), fn ($p) => $p['jenis'] === 'unit'), 'tipe'));
        sort($tipeUnit);
        $this->assertSame(['1br', '2br', 'studio'], $tipeUnit);
    }

    public function test_pola_mengubah_tata_letak(): void
    {
        $keliling = $this->lahan(['tipe' => 'apartemen'])->assertOk()->json();
        $tower = $this->lahan(['tipe' => 'apartemen', 'pola' => 'tower'])->assertOk()->json();
        $wrap = $this->lahan(['tipe' => 'apartemen', 'pola' => 'wrap'])->assertOk()->json();
        $koridor = $this->lahan(['tipe' => 'kos', 'pola' => 'koridor'])->assertOk()->json();

        $this->assertSame('keliling', $keliling['pola']);
        $this->assertSame('tower', $tower['pola']);
        $this->assertSame('wrap', $wrap['pola']);
        $this->assertSame('koridor', $koridor['pola']);
        // Menara: tapak kecil, lantai lebih banyak.
        $this->assertLessThan($keliling['kapasitas']['luas_tapak_m2'], $tower['kapasitas']['luas_tapak_m2']);
        $this->assertGreaterThan($keliling['kapasitas']['lantai'], $tower['kapasitas']['lantai']);
        $this->assertSame(round($tower['kapasitas']['lantai'] * 3.2, 1), (float) $tower['ringkasan']['tinggi_m']);
        $this->assertGreaterThan(0, $koridor['kapasitas']['jumlah']);
        $parkir = fn (array $r) => array_values(array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'parkir'));
        $this->assertNotEmpty($parkir($wrap));

        // Pola yang tidak dikenal jatuh ke bawaan.
        $this->assertSame('keliling', $this->lahan(['tipe' => 'apartemen', 'pola' => 'grid'])->assertOk()->json('pola'));
    }

    public function test_zona_yang_ditarik_pengguna_diisi_sendiri_sendiri(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $r = $this->lahan(['tipe' => 'apartemen', 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074)],
            ['jenis' => 'parkir', 'geometri' => $kotak(106.8027, -6.2079, 106.80295, -6.2072)],
            // Taman yang menumpuk gedung: bagian yang menumpuk dibuang (bangunan didahulukan).
            ['jenis' => 'taman', 'geometri' => $kotak(106.8021, -6.2076, 106.8026, -6.2071)],
        ]])->assertOk()->json();

        $this->assertTrue($r['zona_manual']);
        $this->assertSame([0, 1, 2], array_column(array_column($r['zona']['features'], 'properties'), 'id'));
        $isi = array_column($r['geometri_kapasitas']['features'], 'properties');
        $zonaUnit = array_unique(array_column(array_filter($isi, fn ($p) => $p['jenis'] === 'unit'), 'zona'));
        $this->assertSame([0], array_values($zonaUnit));
        $this->assertNotEmpty(array_filter($isi, fn ($p) => $p['jenis'] === 'slot' && $p['zona'] === 1));
        $this->assertGreaterThan(0, $r['kapasitas']['parkir']['muat']);

        // Zona dengan jenis tak dikenal ditolak.
        $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'sungai', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074)]]])
            ->assertStatus(422);
    }

    /** Apartemen dengan satu zona bangunan dan satu zona parkir lebar, untuk menguji pengaturan parkir. */
    private function parkirUji(array $asumsi = [], array $tambahan = []): array
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];

        return $this->lahan(array_merge(['tipe' => 'apartemen', 'asumsi' => $asumsi, 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074)],
            ['jenis' => 'parkir', 'geometri' => $kotak(106.8027, -6.2079, 106.80298, -6.2072)],
        ]], $tambahan))->assertOk()->json();
    }

    private static function slot(array $r): array
    {
        return array_values(array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'slot'));
    }

    public function test_sudut_parkir_membuat_slot_miring_dan_mengubah_jumlahnya(): void
    {
        $tegak = $this->parkirUji();
        $miring = $this->parkirUji(['sudut_parkir' => 45]);

        $this->assertSame(90.0, (float) $tegak['asumsi']['sudut_parkir']);
        $this->assertSame(45.0, (float) $miring['asumsi']['sudut_parkir']);
        $this->assertNotEmpty(self::slot($miring));
        $this->assertNotSame(count(self::slot($tegak)), count(self::slot($miring)), 'sudut mengubah jumlah slot');

        // Slot tegak berupa persegi panjang (4 sudut siku); slot miring jajar genjang: sisi atas bergeser, bukan siku.
        $sudutSiku = function (array $f): bool {
            [$a, $b, , $d] = $f['geometry']['coordinates'][0];
            $v1 = [$b[0] - $a[0], $b[1] - $a[1]];
            $v2 = [$d[0] - $a[0], $d[1] - $a[1]];

            return abs($v1[0] * $v2[0] + $v1[1] * $v2[1]) < 1e-12;
        };
        $this->assertTrue($sudutSiku(self::slot($tegak)[0]));
        $this->assertFalse($sudutSiku(self::slot($miring)[0]));

        // Di luar rentang dijepit ke 30–90.
        $this->assertSame(30.0, (float) $this->parkirUji(['sudut_parkir' => 5])['asumsi']['sudut_parkir']);
        $this->assertSame(90.0, (float) $this->parkirUji(['sudut_parkir' => 200])['asumsi']['sudut_parkir']);
    }

    public function test_arah_parkir_yang_dikunci_menentukan_arah_deret_slot(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        // Sisi panjang slot (5 m) tegak lurus arah deret: deret barat–timur (90°) = slot memanjang utara–selatan, dan sebaliknya.
        $sisiPanjangUtaraSelatan = function (?float $arah) use ($kotak): bool {
            $parkir = ['jenis' => 'parkir', 'geometri' => $kotak(106.8021, -6.2079, 106.8029, -6.2074)];
            if ($arah !== null) {
                $parkir['arah'] = $arah;
            }
            $r = $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2073, 106.8029, -6.2071)], $parkir]])->assertOk()->json();
            $slot = array_values(array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'slot'));
            $this->assertNotEmpty($slot, 'arah '.var_export($arah, true));
            [$a, $b, $c] = $slot[0]['geometry']['coordinates'][0];
            $k = cos(deg2rad(6.2));
            $sisi = fn ($p, $q) => [abs($q[0] - $p[0]) * $k, abs($q[1] - $p[1])];
            [$e1, $e2] = [$sisi($a, $b), $sisi($b, $c)];
            $panjang = hypot(...$e1) >= hypot(...$e2) ? $e1 : $e2;

            return $panjang[1] > $panjang[0];
        };
        $this->assertTrue($sisiPanjangUtaraSelatan(90.0), 'deret barat–timur');
        $this->assertFalse($sisiPanjangUtaraSelatan(0.0), 'deret utara–selatan');

        $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'parkir', 'arah' => 400, 'geometri' => $kotak(106.8021, -6.2079, 106.8029, -6.2071)]]])->assertStatus(422);
    }

    public function test_max_run_menyela_deret_slot_dan_padding_menjauhkan_dari_tepi(): void
    {
        $biasa = count(self::slot($this->parkirUji()));
        $this->assertGreaterThan(8, $biasa);

        $this->assertLessThan($biasa, count(self::slot($this->parkirUji(['maks_baris' => 4]))), 'Max Run 4 menyisakan kolom kosong');
        $this->assertSame($biasa, count(self::slot($this->parkirUji(['maks_baris' => 0]))), '0 = tanpa batas');
        $this->assertLessThan($biasa, count(self::slot($this->parkirUji(['padding_parkir' => 3]))), 'padding mengecilkan ruang slot');
    }

    public function test_zona_larangan_tidak_berisi_gedung_parkir_atau_taman(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $tanpa = $this->lahan(['tipe' => 'apartemen', 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8028, -6.2073)],
        ]])->assertOk()->json();
        $dengan = $this->lahan(['tipe' => 'apartemen', 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8028, -6.2073)],
            // Larangan menimpa bagian tengah gedung dan menang atas bangunan.
            ['jenis' => 'larangan', 'geometri' => $kotak(106.8024, -6.2080, 106.8026, -6.2072)],
        ]])->assertOk()->json();

        $zona = array_column($dengan['zona']['features'], 'properties');
        $larangan = array_values(array_filter($zona, fn ($p) => $p['jenis'] === 'larangan'));
        $this->assertCount(1, $larangan);
        $this->assertSame(1, $larangan[0]['id']);
        $bangunan = array_values(array_filter($zona, fn ($p) => $p['jenis'] === 'bangunan'));
        $luasAsal = array_values(array_filter(array_column($tanpa['zona']['features'], 'properties'), fn ($p) => $p['jenis'] === 'bangunan'))[0]['luas_m2'];
        $this->assertLessThan($luasAsal - 100, $bangunan[0]['luas_m2'], 'bangunan kehilangan bagian yang dilarang');

        // Tidak ada unit di dalam kotak larangan.
        foreach ($dengan['geometri_kapasitas']['features'] as $f) {
            if ($f['properties']['jenis'] !== 'unit') {
                continue;
            }
            $x = array_column($f['geometry']['coordinates'][0], 0);
            $this->assertFalse(min($x) > 106.80241 && max($x) < 106.80259, 'unit tidak boleh di area larangan');
        }
    }

    public function test_larangan_banjir_otomatis_menjadi_zona_dan_memotong_pola(): void
    {
        // Area uji rawan banjir tingkat 2 menutup separuh barat lahan (lihat setUp).
        foreach (['rumah', 'apartemen'] as $tipe) {
            $tanpa = $this->lahan(['tipe' => $tipe])->assertOk()->json();
            $dengan = $this->lahan(['tipe' => $tipe, 'larangan_banjir' => 2])->assertOk()->json();

            $larangan = array_values(array_filter(array_column($dengan['zona']['features'], 'properties'), fn ($p) => $p['jenis'] === 'larangan'));
            $this->assertCount(1, $larangan, $tipe);
            $this->assertTrue($larangan[0]['otomatis']);
            $this->assertEqualsWithDelta(0.5 * $dengan['luas_m2'], $larangan[0]['luas_m2'], 0.08 * $dengan['luas_m2'], $tipe);
            if ($tipe === 'rumah') {
                $this->assertLessThan($tanpa['kapasitas']['jumlah'], $dengan['kapasitas']['jumlah'], 'rumah: kavling di area banjir hilang');
            }
            $this->assertEmpty(array_filter(array_column($tanpa['zona']['features'], 'properties'), fn ($p) => $p['jenis'] === 'larangan'));
        }

        // Tingkat 3 (tinggi) tidak ada di lahan uji: tidak ada zona larangan.
        $r = $this->lahan(['larangan_banjir' => 3])->assertOk()->json();
        $this->assertEmpty(array_filter(array_column($r['zona']['features'], 'properties'), fn ($p) => $p['jenis'] === 'larangan'));
        $this->lahan(['larangan_banjir' => 9])->assertStatus(422);

        // Bersama zona pengguna dan isi sisa taman: larangan otomatis diberi nomor terakhir, sisa taman tidak menimpanya.
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $m = $this->lahan(['tipe' => 'apartemen', 'larangan_banjir' => 2, 'isi_sisa_taman' => true, 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8026, -6.2079, 106.8029, -6.2074)],
        ]])->assertOk()->json();
        $jenisPerId = [];
        foreach ($m['zona']['features'] as $f) {
            $jenisPerId[$f['properties']['id']] = $f['properties']['jenis'];
        }
        $this->assertSame('bangunan', $jenisPerId[0]);
        $this->assertSame('taman', $jenisPerId[1], 'sisa taman bernomor setelah zona pengguna');
        $this->assertSame('larangan', $jenisPerId[2]);
    }

    public function test_sub_layer_dipotong_ke_induk_dan_induk_kehilangan_bagiannya(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $gedung = $kotak(106.8021, -6.2079, 106.8027, -6.2073);
        // Taman (sekitar 61 x 22 m = 1.347 m²) separuh lebih di dalam gedung dan menjulur ke luar di kanan gedung (± 16 m).
        $taman = $kotak(106.8023, -6.2077, 106.80285, -6.2075);
        $luas = fn (array $r, int $id) => collect($r['zona']['features'])->firstWhere('properties.id', $id)['properties']['luas_m2'] ?? 0.0;

        // Tanpa induk: bangunan didahulukan, jadi taman hanya tersisa di luar gedung (± 367 m²).
        $biasa = $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'bangunan', 'geometri' => $gedung], ['jenis' => 'taman', 'geometri' => $taman]]])->assertOk()->json();
        $gedungAsli = $luas($biasa, 0);
        $this->assertGreaterThan(2000, $gedungAsli);
        $this->assertEqualsWithDelta(367.0, $luas($biasa, 1), 10.0);

        // Sub-layer: taman menang di dalam gedung (jadi halaman) dan gedung kehilangan bagian itu (± 980 m²);
        // bagian taman di luar gedung terpotong oleh masking, jadi taman tidak pernah lebih luas dari gedung asli.
        $sub = $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'bangunan', 'geometri' => $gedung], ['jenis' => 'taman', 'geometri' => $taman, 'induk' => 0]]])->assertOk()->json();
        $tamanSub = $luas($sub, 1);
        $this->assertEqualsWithDelta(980.0, $tamanSub, 30.0);
        $this->assertGreaterThan($luas($biasa, 1), $tamanSub);
        $this->assertEqualsWithDelta($gedungAsli - $tamanSub, $luas($sub, 0), 2.0, 'gedung = gedung asli dikurangi taman');
    }

    public function test_prioritas_menentukan_zona_mana_yang_menyesuaikan_diri_saat_bertumpuk(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $gedung = $kotak(106.8021, -6.2079, 106.8025, -6.2073);
        // Taman menumpuk gedung di separuh kanan gedung (± 22 m x 66 m).
        $taman = $kotak(106.8023, -6.2079, 106.8027, -6.2073);
        $luas = fn (array $r, int $id) => collect($r['zona']['features'])->firstWhere('properties.id', $id)['properties']['luas_m2'] ?? 0.0;
        $zona = fn (?int $pGedung, ?int $pTaman) => [
            ['jenis' => 'bangunan', 'geometri' => $gedung, 'prioritas' => $pGedung],
            ['jenis' => 'taman', 'geometri' => $taman, 'prioritas' => $pTaman],
        ];

        // Tanpa prioritas (perilaku lama): bangunan menang, taman menyesuaikan diri (dipotong).
        $lama = $this->lahan(['tipe' => 'apartemen', 'zona' => $zona(null, null)])->assertOk()->json();
        // Taman diberi prioritas lebih tinggi (mis. terakhir ditarik): gedung yang menyesuaikan diri.
        $baru = $this->lahan(['tipe' => 'apartemen', 'zona' => $zona(1, 2)])->assertOk()->json();
        // Prioritas sama dengan perilaku lama bila gedung lebih tinggi.
        $sama = $this->lahan(['tipe' => 'apartemen', 'zona' => $zona(2, 1)])->assertOk()->json();

        $this->assertEqualsWithDelta($luas($lama, 0), $luas($sama, 0), 0.5);
        $this->assertEqualsWithDelta($luas($lama, 1), $luas($sama, 1), 0.5);
        // Yang menang menyimpan bentuk utuhnya: taman utuh di $baru lebih luas dari taman terpotong di $lama, dan gedung sebaliknya.
        $this->assertGreaterThan($luas($lama, 1) + 500, $luas($baru, 1));
        $this->assertLessThan($luas($lama, 0) - 500, $luas($baru, 0));
        // Daerah tumpang tindih berpindah tangan, jumlah luas gedung + taman tetap sama.
        $this->assertEqualsWithDelta($luas($lama, 0) + $luas($lama, 1), $luas($baru, 0) + $luas($baru, 1), 1.0);
    }

    public function test_isi_sisa_lahan_dengan_taman(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        // Satu gedung kecil di sudut lahan; sisanya kosong.
        $badan = ['tipe' => 'apartemen', 'zona' => [['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8025, -6.2075)]]];

        $kosong = $this->lahan($badan)->assertOk()->json();
        $isi = $this->lahan($badan + ['isi_sisa_taman' => true])->assertOk()->json();

        $this->assertCount(1, $kosong['zona']['features']);
        $this->assertCount(2, $isi['zona']['features']);
        $sisa = collect($isi['zona']['features'])->firstWhere('properties.id', 1);
        $this->assertSame('taman', $sisa['properties']['jenis']);
        // Sisa = lahan (± 12.100 m²) dikurangi gedung; bersama gedung menutup seluruh lahan.
        $gedung = collect($isi['zona']['features'])->firstWhere('properties.id', 0)['properties']['luas_m2'];
        $this->assertEqualsWithDelta($isi['luas_m2'], $gedung + $sisa['properties']['luas_m2'], 5.0);
        $this->assertGreaterThan($kosong['ringkasan']['kdh_terpakai'], $isi['ringkasan']['kdh_terpakai']);

        // Rumah tapak memakai sisa sebagai jalan: opsi diabaikan.
        $rumah = $this->lahan(['tipe' => 'rumah', 'zona' => [['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8025, -6.2075)]], 'isi_sisa_taman' => true])->assertOk()->json();
        $this->assertCount(1, $rumah['zona']['features']);
    }

    public function test_rekomendasi_isi_lahan_kosong_menjadi_parkir_bila_kurang_lalu_taman(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $gedung = ['jenis' => 'bangunan', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074)];
        $jenisPerId = fn (array $r) => collect($r['zona']['features'])->mapWithKeys(fn ($f) => [$f['properties']['id'] => $f['properties']])->all();

        // Tanpa zona parkir: parkir kurang, jadi sebagian lahan kosong menjadi parkir otomatis dan sisanya taman.
        $r = $this->lahan(['tipe' => 'apartemen', 'zona' => [$gedung], 'isi_sisa' => 'rekomendasi'])->assertOk()->json();
        $z = $jenisPerId($r);
        $this->assertSame('taman', $z[1]['jenis'], 'sisa taman tetap bernomor setelah zona pengguna');
        $this->assertSame('parkir', $z[2]['jenis']);
        $this->assertTrue($z[2]['isi_otomatis']);
        $this->assertGreaterThan(0, $r['kapasitas']['parkir']['muat']);
        // Zona pengguna + taman sisa + parkir otomatis menutup seluruh lahan.
        $this->assertEqualsWithDelta($r['luas_m2'], array_sum(array_column($z, 'luas_m2')), 10.0);

        // Lebih dekat ke gerbang: parkir otomatis berada di sisi gerbang (barat).
        $g = $this->lahan(['tipe' => 'apartemen', 'zona' => [$gedung], 'isi_sisa' => 'rekomendasi', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.8030, -6.2073]]]])->assertOk()->json();
        $parkir = collect($g['zona']['features'])->first(fn ($f) => $f['properties']['isi_otomatis'] ?? false);
        $this->assertNotNull($parkir);
        $x = array_column($parkir['geometry']['type'] === 'Polygon' ? $parkir['geometry']['coordinates'][0] : $parkir['geometry']['coordinates'][0][0], 0);
        $this->assertGreaterThan(106.8025, array_sum($x) / count($x), 'parkir otomatis dekat gerbang di sisi timur');

        // Parkir pengguna sudah cukup (kebutuhan nol): semua sisa jadi taman, tidak ada parkir otomatis.
        $cukup = $this->lahan(['tipe' => 'apartemen', 'asumsi' => ['rasio_parkir' => 0], 'zona' => [$gedung], 'isi_sisa' => 'rekomendasi'])->assertOk()->json();
        $this->assertEmpty(array_filter($jenisPerId($cukup), fn ($p) => $p['isi_otomatis'] ?? false));
        $this->assertSame('taman', $jenisPerId($cukup)[1]['jenis']);

        // Pilihan tidak sah ditolak; 'taman' setara isi_sisa_taman lama.
        $this->lahan(['tipe' => 'apartemen', 'zona' => [$gedung], 'isi_sisa' => 'kolam'])->assertStatus(422);
        $taman = $this->lahan(['tipe' => 'apartemen', 'zona' => [$gedung], 'isi_sisa' => 'taman'])->assertOk()->json();
        $this->assertCount(2, $taman['zona']['features']);
    }

    public function test_target_jumlah_kos_mengatur_lantai_dan_memotong_tepat(): void
    {
        $dasar = $this->lahan(['tipe' => 'kos'])->assertOk()->json();
        $perLantai = $dasar['kapasitas']['unit_per_lantai'];
        $this->assertGreaterThan(4, $perLantai);

        // Target kecil: cukup satu lantai, jumlahnya persis, ukuran kamar tidak berubah.
        $kecil = $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => 5]])->assertOk()->json();
        $this->assertSame(5, $kecil['kapasitas']['jumlah']);
        $this->assertSame(1, $kecil['kapasitas']['lantai']);
        $this->assertTrue($kecil['target']['tercapai']);
        $this->assertEqualsWithDelta(12.0, $kecil['asumsi']['luas_kamar'], 0.01);
        $this->assertSame(5, array_sum($kecil['kapasitas']['komposisi']));
        $this->assertSame(5, $kecil['kapasitas']['parkir']['butuh'], 'satu motor per kamar (rasio_motor 1)');
        // Denah ikut dipangkas: hanya 5 kamar digambar, koridor memendek, tapak dan label di peta mengikuti target.
        $unitKecil = array_filter($kecil['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'unit');
        $this->assertCount(5, $unitKecil);
        $this->assertSame(5, $kecil['kapasitas']['unit_per_lantai']);
        $this->assertLessThan($dasar['kapasitas']['luas_tapak_m2'], $kecil['kapasitas']['luas_tapak_m2']);
        $this->assertLessThan($dasar['ringkasan']['kdb_terpakai'], $kecil['ringkasan']['kdb_terpakai']);
        foreach ($kecil['geometri_kapasitas']['features'] as $f) {
            if (isset($f['properties']['jumlah'])) {
                $this->assertSame(5, $f['properties']['jumlah'], 'label peta');
            }
        }

        // Target di atas kapasitas penuh (semua lantai yang diizinkan KLB) hanya bisa dicapai dengan mengecilkan kamar;
        // jumlahnya tetap persis bila muat.
        $lebih = $dasar['kapasitas']['jumlah'] + 10;
        $kecilkan = $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => $lebih]])->assertOk()->json();
        $this->assertSame($lebih, $kecilkan['kapasitas']['jumlah']);
        $this->assertTrue($kecilkan['target']['tercapai']);
        $this->assertLessThan(12.0, $kecilkan['asumsi']['luas_kamar']);
    }

    public function test_kamar_kos_dan_unit_apartemen_berbentuk_persegi_panjang_tetap(): void
    {
        // Zona miring (trapesium) dan pola keliling: unit yang tidak muat utuh dibuang, bukan dipotong menjadi bentuk lain.
        $zona = [['jenis' => 'bangunan', 'geometri' => ['type' => 'Polygon', 'coordinates' => [[[106.8021, -6.2079], [106.8029, -6.2078], [106.8028, -6.2072], [106.8022, -6.2073], [106.8021, -6.2079]]]]]];
        foreach ([['kos', 12.0], ['apartemen', null]] as [$tipe, $luasKamar]) {
            $variasi = [[], ['zona' => $zona]];
            if ($tipe === 'kos') {
                // Pola grid: deret kamar berjajar seperti kavling rumah tapak, pada zona bawaan maupun zona miring.
                $variasi = [...$variasi, ['pola' => 'grid'], ['pola' => 'grid', 'zona' => $zona]];
            }
            foreach ($variasi as $tambahan) {
                $r = $this->lahan(['tipe' => $tipe, ...$tambahan])->assertOk()->json();
                $unit = array_values(array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'unit'));
                $this->assertNotEmpty($unit, $tipe);
                foreach ($unit as $f) {
                    $this->assertCount(5, $f['geometry']['coordinates'][0], "{$tipe}: unit bersudut empat");
                }
                // Di PostGIS (meter UTM): luas unit hampir sama dengan persegi panjang pembungkusnya (Voronoi lama jauh di bawah),
                // dan semua unit seukuran. Selisih kecil berasal dari pembulatan koordinat GeoJSON (6 desimal, kira-kira 0,1 m).
                $u = DB::selectOne(
                    "WITH g AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(j::text), 4326), 32748) AS g FROM json_array_elements(?::json) AS j)
                     SELECT min(ST_Area(g) / ST_Area(ST_OrientedEnvelope(g))) AS isi, min(ST_Area(g)) AS kecil, max(ST_Area(g)) AS besar, avg(ST_Area(g)) AS rata FROM g",
                    [json_encode(array_column($unit, 'geometry'))],
                );
                $this->assertGreaterThan(0.93, (float) $u->isi, "{$tipe}: unit persegi panjang");
                $this->assertLessThan(0.08 * (float) $u->besar, (float) $u->besar - (float) $u->kecil, "{$tipe}: ukuran unit sama");
                if ($luasKamar !== null) {
                    $this->assertEqualsWithDelta($luasKamar, (float) $u->rata, 0.3);
                }
            }
        }
    }

    public function test_pola_grid_kos_mengisi_blok_dengan_deret_kamar_dan_koridor(): void
    {
        $keliling = $this->lahan(['tipe' => 'kos'])->assertOk()->json();
        $grid = $this->lahan(['tipe' => 'kos', 'pola' => 'grid'])->assertOk()->json();
        $this->assertSame('grid', $grid['pola']);

        $unit = array_values(array_filter($grid['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'unit'));
        $koridor = array_values(array_filter($grid['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'koridor'));
        $this->assertNotEmpty($unit);
        $this->assertNotEmpty($koridor);
        $this->assertGreaterThan(0, $grid['kapasitas']['jumlah']);

        // Lebih dari dua deret (blok berisi beberapa deret, bukan hanya tepi), dan tiap kamar menghadap koridor.
        $r = DB::selectOne(
            "WITH u AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(j::text), 4326), 32748) AS g FROM json_array_elements(?::json) AS j),
                  k AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 32748) AS g)
             SELECT count(DISTINCT round(ST_Y(ST_Centroid(u.g))::numeric)) AS deret, bool_and(ST_DWithin(u.g, k.g, 0.5)) AS hadap FROM u, k",
            [json_encode(array_column($unit, 'geometry')), json_encode($koridor[0]['geometry'])],
        );
        $this->assertGreaterThan(2, (int) $r->deret);
        $this->assertTrue((bool) $r->hadap, 'semua kamar menghadap koridor');

        // KDB tetap dihormati.
        $this->assertNotContains('kdb', $grid['ringkasan']['pelanggaran']);
        $this->assertNotSame($keliling['kapasitas']['unit_per_lantai'], $grid['kapasitas']['unit_per_lantai']);
    }

    public function test_target_jumlah_apartemen_memakai_lantai_paling_sedikit_yang_cukup(): void
    {
        $dasar = $this->lahan(['tipe' => 'apartemen'])->assertOk()->json();
        $this->assertGreaterThan(1, $dasar['kapasitas']['lantai_maks']);

        // Target di bawah kapasitas penuh: jumlah persis, tercapai, komposisi ikut dipotong, lantai paling sedikit yang cukup.
        $target = (int) floor($dasar['kapasitas']['jumlah'] / 3);
        $r = $this->lahan(['tipe' => 'apartemen', 'target' => ['jumlah' => $target]])->assertOk()->json();
        $this->assertTrue($r['target']['tercapai']);
        $this->assertSame($target, $r['kapasitas']['jumlah']);
        $this->assertSame($target, array_sum($r['kapasitas']['komposisi']));
        $this->assertSame((int) ceil($target / $r['kapasitas']['unit_per_lantai']), $r['kapasitas']['lantai']);
        $this->assertLessThan($dasar['kapasitas']['lantai'], $r['kapasitas']['lantai']);
        // Kebutuhan parkir mengikuti jumlah yang diminta.
        $this->assertLessThan($dasar['kapasitas']['parkir']['butuh'], $r['kapasitas']['parkir']['butuh']);
        $this->assertSame($target, $r['target']['jumlah']);
        // Denah satu lantai tipikal: unit per lantai dibagi rata ke lantai yang dipakai.
        $unit = array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'unit');
        $this->assertCount((int) ceil($target / $r['kapasitas']['lantai']), $unit);
        $this->assertSame(count($unit), $r['kapasitas']['unit_per_lantai']);
    }

    public function test_target_jumlah_kos_mengecilkan_kamar_atau_berhenti_bila_ukuran_dikunci(): void
    {
        $dasar = $this->lahan(['tipe' => 'kos'])->assertOk()->json();
        $maks = $dasar['kapasitas']['jumlah'];

        // Ukuran bebas: kamar dikecilkan supaya target lebih besar dari kapasitas biasa bisa muat.
        $besar = $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => (int) ceil($maks * 1.6)]])->assertOk()->json();
        $this->assertLessThan(12.0, $besar['asumsi']['luas_kamar']);
        $this->assertGreaterThanOrEqual(6.0, $besar['asumsi']['luas_kamar']);
        $this->assertGreaterThan($maks, $besar['kapasitas']['jumlah']);
        $this->assertSame($besar['kapasitas']['lantai_maks'], $besar['kapasitas']['lantai']);

        // Ukuran dikunci: kamar tetap, target tidak muat, hasilnya jumlah maksimum dan ada catatan.
        $kunci = $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => $maks * 3, 'kunci_ukuran' => true]])->assertOk()->json();
        $this->assertEqualsWithDelta(12.0, $kunci['asumsi']['luas_kamar'], 0.01);
        $this->assertFalse($kunci['target']['tercapai']);
        $this->assertSame($kunci['target']['maks'], $kunci['kapasitas']['jumlah']);
        $this->assertStringContainsString('tidak muat', implode(' ', $kunci['catatan']));
    }

    public function test_target_jumlah_rumah_menyesuaikan_lebar_kavling(): void
    {
        $dasar = $this->lahan()->assertOk()->json();
        $ada = $dasar['kapasitas']['jumlah'];
        $this->assertGreaterThan(8, $ada);

        // Lebih sedikit: kavling dilebarkan dan jumlahnya persis.
        $sedikit = $this->lahan(['target' => ['jumlah' => (int) floor($ada / 2)]])->assertOk()->json();
        $this->assertGreaterThan(6.0, $sedikit['asumsi']['lebar_kavling']);
        $this->assertSame((int) floor($ada / 2), $sedikit['kapasitas']['jumlah']);
        $kavling = array_filter($sedikit['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'kavling');
        $this->assertCount($sedikit['kapasitas']['jumlah'], $kavling);

        // Lebih banyak: kavling dipersempit (tidak lebih kecil dari 4 m).
        $banyak = $this->lahan(['target' => ['jumlah' => $ada + 10]])->assertOk()->json();
        $this->assertLessThan(6.0, $banyak['asumsi']['lebar_kavling']);
        $this->assertGreaterThanOrEqual(4.0, $banyak['asumsi']['lebar_kavling']);
        $this->assertGreaterThan($ada, $banyak['kapasitas']['jumlah']);

        // Ukuran dikunci: kavling tetap 6 m.
        $kunci = $this->lahan(['target' => ['jumlah' => $ada + 10, 'kunci_ukuran' => true]])->assertOk()->json();
        $this->assertEqualsWithDelta(6.0, $kunci['asumsi']['lebar_kavling'], 0.01);
        $this->assertFalse($kunci['target']['tercapai']);
    }

    public function test_target_jumlah_tidak_sah_ditolak(): void
    {
        $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => 0]])->assertStatus(422);
        $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => 50001]])->assertStatus(422);
        $this->lahan(['tipe' => 'kos', 'target' => ['jumlah' => 'banyak']])->assertStatus(422);
        $this->lahan(['tipe' => 'kos', 'target' => ['kunci_ukuran' => true]])->assertStatus(422);
        // Tanpa target: tidak ada info target.
        $this->assertNull($this->lahan(['tipe' => 'kos'])->assertOk()->json('target'));
    }

    public function test_induk_zona_tidak_sah_ditolak(): void
    {
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $z = fn (?int $induk) => ['jenis' => 'taman', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074), 'induk' => $induk];

        $this->lahan(['tipe' => 'apartemen', 'zona' => [$z(0)]])->assertStatus(422);              // diri sendiri
        $this->lahan(['tipe' => 'apartemen', 'zona' => [$z(null), $z(5)]])->assertStatus(422);    // tidak ada
        $this->lahan(['tipe' => 'apartemen', 'zona' => [$z(1), $z(0)]])->assertStatus(422);       // berputar
        $this->lahan(['tipe' => 'apartemen', 'zona' => [$z(null), $z(0)]])->assertOk();           // sah
    }

    public function test_gerbang_dan_pintu_mengubah_tata_letak(): void
    {
        $tanpa = $this->lahan(['tipe' => 'apartemen'])->assertOk()->json();
        $r = $this->lahan(['tipe' => 'apartemen', 'akses' => [
            // Sedikit di luar tepi barat: harus ditempelkan ke tepi lahan. Jalan masuk diperpanjang sampai menembus gedung.
            ['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'panjang' => 60],
            ['jenis' => 'pintu', 'titik' => [106.8025, -6.20795]],
        ]])->assertOk()->json();

        $this->assertSame([0, 1], array_column(array_column($r['akses']['features'], 'properties'), 'id'));
        $this->assertEqualsWithDelta(106.802, $r['akses']['features'][0]['geometry']['coordinates'][0], 2e-5);
        $jenis = array_column(array_column($r['geometri_kapasitas']['features'], 'properties'), 'jenis');
        $this->assertContains('akses', $jenis); // jalan dari gerbang menembus gedung keliling ke parkir
        $this->assertContains('lobi', $jenis);
        // Unit di depan pintu tetap ada bentuknya (lobi beratap gedung), tidak dibuang: lobi pita + lobi unit.
        $lobiUnit = array_filter($r['geometri_kapasitas']['features'], fn ($f) => $f['properties']['jenis'] === 'lobi' && ($f['properties']['unit'] ?? false));
        $this->assertNotEmpty($lobiUnit, 'unit yang tertimpa lobi tetap digambar');
        $this->assertLessThan($tanpa['kapasitas']['unit_per_lantai'], $r['kapasitas']['unit_per_lantai']);

        // Rumah tapak: pintu gedung diabaikan; gerbang pada pola cluster membuka jalan dan memakan kavling.
        $cluster = $this->lahan(['tipe' => 'rumah', 'pola' => 'cluster'])->assertOk()->json();
        $rumah = $this->lahan(['tipe' => 'rumah', 'pola' => 'cluster', 'akses' => [
            ['jenis' => 'gerbang', 'titik' => [106.8025, -6.208]],
            ['jenis' => 'pintu', 'titik' => [106.8025, -6.2075]],
        ]])->assertOk()->json();
        $this->assertSame(['gerbang'], array_column(array_column($rumah['akses']['features'], 'properties'), 'jenis'));
        $this->assertLessThanOrEqual($cluster['kapasitas']['jumlah'], $rumah['kapasitas']['jumlah']);

        // Gerbang yang dilebarkan memakan lebih banyak unit dan lebarnya dikembalikan.
        $lebar = $this->lahan(['tipe' => 'apartemen', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'lebar' => 20, 'panjang' => 60]]])->assertOk()->json();
        $this->assertSame(20.0, (float) $lebar['akses']['features'][0]['properties']['lebar']);
        $this->assertLessThanOrEqual($r['kapasitas']['unit_per_lantai'], $lebar['kapasitas']['unit_per_lantai']);

        // Pintu: lebar bukaan dan kedalaman lobi bisa diatur; lobi yang lebih lebar memakan lebih banyak unit.
        $pintu = $r['akses']['features'][1]['properties'];
        $this->assertSame(3.0, (float) $pintu['lebar']);
        $this->assertSame(1.0, (float) $pintu['panjang']); // bawaan 1 m
        $this->assertFalse($pintu['otomatis']);
        // Gerbang tanpa panjang: jalan masuk bawaan 1 m.
        $pendekBawaan = $this->lahan(['tipe' => 'apartemen', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075]]]])->assertOk()->json();
        $this->assertSame(1.0, (float) $pendekBawaan['akses']['features'][0]['properties']['panjang']);
        $lebarPintu = $this->lahan(['tipe' => 'apartemen', 'akses' => [
            ['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'panjang' => 60],
            ['jenis' => 'pintu', 'titik' => [106.8025, -6.20795], 'lebar' => 15, 'panjang' => 18],
        ]])->assertOk()->json();
        $this->assertSame(15.0, (float) $lebarPintu['akses']['features'][1]['properties']['lebar']);
        $this->assertLessThanOrEqual($r['kapasitas']['unit_per_lantai'], $lebarPintu['kapasitas']['unit_per_lantai']);

        // Panjang jalan masuk yang diatur sendiri dipakai apa adanya (tidak sampai parkir).
        $pendek = $this->lahan(['tipe' => 'apartemen', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'lebar' => 4, 'panjang' => 5]]])->assertOk()->json();
        $p = $pendek['akses']['features'][0]['properties'];
        $this->assertSame(5.0, (float) $p['panjang']);
        $this->assertFalse($p['otomatis']);
        // Panjang tidak lagi otomatis: kunci tetap dikirim demi kontrak lama, selalu false.
        $this->assertFalse($r['akses']['features'][0]['properties']['otomatis']);

        $this->lahan(['tipe' => 'kos', 'akses' => [['jenis' => 'jendela', 'titik' => [106.8025, -6.208]]]])->assertStatus(422);
    }

    public function test_rumah_pribadi_satu_rumah_dengan_carport_kolam_taman_halaman_dan_pagar(): void
    {
        $r = $this->lahan(['tipe' => 'pribadi', 'asumsi' => ['luas_bangunan' => 300, 'lantai' => 2, 'mobil' => 2, 'kolam' => 40]])->assertOk()->json();

        $this->assertSame('pribadi', $r['tipe']);
        $this->assertSame('depan', $r['pola']);
        $this->assertSame(['depan', 'tengah'], $r['pola_tersedia']);
        $k = $r['kapasitas'];
        $this->assertSame(1, $k['jumlah']);
        $this->assertSame('rumah', $k['satuan']);
        $this->assertSame(2, $k['lantai']);
        $this->assertEqualsWithDelta(150, $k['luas_tapak_m2'], 8, 'tapak = 300 m² / 2 lantai');
        $this->assertEqualsWithDelta(300, $k['pribadi']['luas_bangunan_m2'], 15);
        $this->assertFalse($k['pribadi']['tidak_muat']);
        $this->assertSame(2, $k['pribadi']['mobil']);
        $this->assertSame(['butuh' => 2, 'muat' => 2, 'jenis' => 'mobil', 'lantai' => 1], $k['parkir']);
        $this->assertGreaterThanOrEqual(3, $k['pribadi']['kamar_tidur']);
        $this->assertEqualsWithDelta(40, $k['pribadi']['kolam_m2'], 4);
        $this->assertNull($r['target']);

        $jenis = array_count_values(array_column(array_column($r['geometri_kapasitas']['features'], 'properties'), 'jenis'));
        $this->assertSame(1, $jenis['tapak'], 'tepat satu rumah');
        $this->assertSame(2, $jenis['slot'], 'slot sebanyak mobil');
        foreach (['kolam', 'taman', 'halaman', 'pagar', 'parkir'] as $j) {
            $this->assertArrayHasKey($j, $jenis, $j);
        }
        $this->assertContains('kolam', array_column(array_column($r['zona']['features'], 'properties'), 'jenis'));

        // Tanpa mobil dan tanpa kolam: tidak ada carport maupun kolam.
        $polos = $this->lahan(['tipe' => 'pribadi', 'asumsi' => ['mobil' => 0, 'kolam' => 0]])->assertOk()->json();
        $jp = array_column(array_column($polos['geometri_kapasitas']['features'], 'properties'), 'jenis');
        $this->assertNotContains('kolam', $jp);
        $this->assertNotContains('slot', $jp);
        // Tanpa luas diminta: rekomendasi dipakai.
        $this->assertEqualsWithDelta($polos['kapasitas']['pribadi']['rekomendasi_luas_bangunan'], $polos['kapasitas']['luas_lantai_m2'], 25);
    }

    public function test_rumah_pribadi_melebihi_kdb_ditandai_dan_tidak_muat_dicatat(): void
    {
        // Lahan kecil ± 3.000 m² (KDB RDTR alternatif 1 = 60%), zona bangunan sendiri seluas lahan, rumah 1 lantai 2.500 m²:
        // tapak ± 80% melebihi KDB dan ditandai merah (luas yang diminta tidak dijepit ke KDB).
        $kecil = [[106.802, -6.208], [106.8025, -6.208], [106.8025, -6.2075], [106.802, -6.2075], [106.802, -6.208]];
        $besar = $this->lahan(['tipe' => 'pribadi', 'asumsi' => ['luas_bangunan' => 2500, 'lantai' => 1, 'sempadan' => 0], 'zona' => [['jenis' => 'bangunan', 'geometri' => ['type' => 'Polygon', 'coordinates' => [$kecil]]]]], $kecil)->assertOk()->json();
        $this->assertContains('kdb', $besar['ringkasan']['pelanggaran']);

        // Zona bangunan kecil yang ditarik sendiri: rumah tidak muat, dicatat, digambar sebesar zonanya.
        $kotak = fn (float $x0, float $y0, float $x1, float $y1) => ['type' => 'Polygon', 'coordinates' => [[[$x0, $y0], [$x1, $y0], [$x1, $y1], [$x0, $y1], [$x0, $y0]]]];
        $sempit = $this->lahan(['tipe' => 'pribadi', 'asumsi' => ['luas_bangunan' => 600, 'lantai' => 1], 'zona' => [
            ['jenis' => 'bangunan', 'geometri' => $kotak(106.8024, -6.2077, 106.80255, -6.20755)],
            ['jenis' => 'kolam', 'geometri' => $kotak(106.8021, -6.2079, 106.8022, -6.2078)],
        ]])->assertOk()->json();
        $this->assertTrue($sempit['kapasitas']['pribadi']['tidak_muat']);
        $this->assertLessThan(600, $sempit['kapasitas']['luas_lantai_m2']);
        $this->assertNotEmpty(array_filter($sempit['catatan'], fn ($c) => str_contains($c, 'tidak muat')));
        $this->assertGreaterThan(0, $sempit['kapasitas']['pribadi']['kolam_m2'], 'kolam dari zona sendiri');

        // Pola tengah dan gerbang + pintu: pagar terbuka di gerbang, jalan masuk dan jalur ke pintu.
        $tengah = $this->lahan(['tipe' => 'pribadi', 'pola' => 'tengah', 'akses' => [
            ['jenis' => 'gerbang', 'titik' => [106.8025, -6.20802]],
            ['jenis' => 'pintu', 'titik' => [106.8025, -6.2076]],
        ]])->assertOk()->json();
        $this->assertSame('tengah', $tengah['pola']);
        $jt = array_column(array_column($tengah['geometri_kapasitas']['features'], 'properties'), 'jenis');
        $this->assertContains('pagar', $jt);
        $this->assertContains('akses', $jt);
        $this->assertSame(['gerbang', 'pintu'], array_column(array_column($tengah['akses']['features'], 'properties'), 'jenis'));
    }

    public function test_di_luar_dki_memakai_asumsi(): void
    {
        DB::table('fitur_peta')->where('layer_id', 'zonasi')->delete();

        $r = $this->lahan(['tipe' => 'kos'])->assertOk()->json();
        $this->assertNull($r['zonasi']);
        $this->assertSame('asumsi', $r['intensitas']['sumber']);
        $this->assertStringContainsString('asumsi', implode(' ', $r['catatan']));
    }

    public function test_lahan_tidak_sah_ditolak(): void
    {
        // Garis batas menyilang (bentuk dasi kupu-kupu).
        $this->lahan([], [[106.802, -6.208], [106.803, -6.207], [106.803, -6.208], [106.802, -6.207], [106.802, -6.208]])
            ->assertStatus(422)->assertJsonStructure(['message']);

        // Terlalu kecil (sekitar 1 x 1 m).
        $this->lahan([], [[106.802, -6.208], [106.80201, -6.208], [106.80201, -6.20799], [106.802, -6.20799], [106.802, -6.208]])
            ->assertStatus(422);

        // Di luar kelurahan uji (luar cakupan).
        $this->lahan([], [[106.90, -6.30], [106.901, -6.30], [106.901, -6.299], [106.90, -6.299], [106.90, -6.30]])
            ->assertStatus(422);

        // Tipe tidak dikenal.
        $this->lahan(['tipe' => 'mal'])->assertStatus(422);
    }
}
