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
        $this->assertGreaterThan(60, $r['kapasitas']['jumlah']);
        $this->assertLessThan(120, $r['kapasitas']['jumlah']);
        $this->assertSame('rumah', $r['kapasitas']['satuan']);

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
        $this->assertSame('tapak', $kos['geometri_kapasitas']['features'][0]['properties']['jenis']);

        $apt = $this->lahan(['tipe' => 'apartemen', 'asumsi' => ['luas_unit' => 45]])->assertOk()->json();
        $this->assertSame(2, $apt['intensitas']['alternatif']);
        $this->assertSame(1.6, (float) $apt['intensitas']['klb']);
        $this->assertSame(45.0, (float) $apt['asumsi']['luas_unit']);
        $this->assertGreaterThan($kos['kapasitas']['luas_lantai_m2'], $apt['kapasitas']['luas_lantai_m2']);
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
