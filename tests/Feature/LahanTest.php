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
        $this->assertSame(['keliling', 'koridor'], $kos['pola_tersedia']);

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
        $this->lahan(['tipe' => 'apartemen', 'zona' => [['jenis' => 'kolam', 'geometri' => $kotak(106.8021, -6.2079, 106.8026, -6.2074)]]])
            ->assertStatus(422);
    }

    public function test_gerbang_dan_pintu_mengubah_tata_letak(): void
    {
        $tanpa = $this->lahan(['tipe' => 'apartemen'])->assertOk()->json();
        $r = $this->lahan(['tipe' => 'apartemen', 'akses' => [
            // Sedikit di luar tepi barat: harus ditempelkan ke tepi lahan.
            ['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075]],
            ['jenis' => 'pintu', 'titik' => [106.8025, -6.20795]],
        ]])->assertOk()->json();

        $this->assertSame([0, 1], array_column(array_column($r['akses']['features'], 'properties'), 'id'));
        $this->assertEqualsWithDelta(106.802, $r['akses']['features'][0]['geometry']['coordinates'][0], 2e-5);
        $jenis = array_column(array_column($r['geometri_kapasitas']['features'], 'properties'), 'jenis');
        $this->assertContains('akses', $jenis); // jalan dari gerbang menembus gedung keliling ke parkir
        $this->assertContains('lobi', $jenis);
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
        $lebar = $this->lahan(['tipe' => 'apartemen', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'lebar' => 20]]])->assertOk()->json();
        $this->assertSame(20.0, (float) $lebar['akses']['features'][0]['properties']['lebar']);
        $this->assertLessThanOrEqual($r['kapasitas']['unit_per_lantai'], $lebar['kapasitas']['unit_per_lantai']);

        // Panjang jalan masuk yang diatur sendiri dipakai apa adanya (tidak sampai parkir).
        $pendek = $this->lahan(['tipe' => 'apartemen', 'akses' => [['jenis' => 'gerbang', 'titik' => [106.80195, -6.2075], 'lebar' => 4, 'panjang' => 5]]])->assertOk()->json();
        $p = $pendek['akses']['features'][0]['properties'];
        $this->assertSame(5.0, (float) $p['panjang']);
        $this->assertFalse($p['otomatis']);
        $this->assertTrue($r['akses']['features'][0]['properties']['otomatis']);

        $this->lahan(['tipe' => 'kos', 'akses' => [['jenis' => 'jendela', 'titik' => [106.8025, -6.208]]]])->assertStatus(422);
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
