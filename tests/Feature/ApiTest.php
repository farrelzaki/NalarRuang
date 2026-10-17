<?php

namespace Tests\Feature;

use Database\Seeders\DemoPetaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as PermintaanHttp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Bentuk respons endpoint (docs/SISTEM.md bagian 2) di atas data uji kecil di sekitar Jakarta.
 * Layanan luar (Valhalla, OSRM, Commute Data API) disimulasikan dengan Http::fake.
 */
class ApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Empat kelurahan berbentuk kotak 0,01 derajat (+-1,1 km) berjajar ke timur.
        foreach (['Kebon Uji', 'Pasar Uji', 'Taman Uji', 'Kali Uji'] as $i => $nama) {
            $x = 106.80 + $i * 0.01;
            DB::insert(
                "INSERT INTO wilayah (nama, kecamatan, kota, tipe_kawasan, kualitas_udara, atribut, geom, created_at, updated_at)
                 VALUES (?, 'Uji', 'Jakarta Selatan', 'Permukiman', 'sehat', '{}'::jsonb,
                         ST_Multi(ST_MakeEnvelope(?, -6.21, ?, -6.20, 4326)), now(), now())",
                [$nama, $x, $x + 0.01],
            );
        }

        $titik = fn (string $jenis, string $layer, float $lng, float $lat, ?string $nama, array $atribut = []) => DB::insert(
            "INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at)
             VALUES (?, ?, ?, ?::jsonb, 'uji', ST_SetSRID(ST_MakePoint(?, ?), 4326), now(), now())",
            [$layer, $jenis, $nama, json_encode((object) $atribut), $lng, $lat],
        );
        $titik('stasiun', 'mobilitas', 106.805, -6.205, 'Stasiun A', ['kode' => 'KCI-AAA', 'moda' => 'krl']);
        $titik('stasiun', 'mobilitas', 106.835, -6.205, 'Stasiun B', ['kode' => 'KCI-BBB', 'moda' => 'krl']);
        $titik('tol', 'mobilitas', 106.815, -6.215, 'Toll Gate Uji 1');
        $titik('poi', 'ekosistem', 106.806, -6.206, 'Kopi Uji', ['kategori' => 'Kafe']);
        $titik('halte', 'mobilitas', 106.825, -6.205, 'Halte Uji', ['moda' => 'transjakarta', 'kode' => 'TJ-H1']);

        DB::insert("INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at) VALUES
            ('ekosistem', 'rth', 'Taman', '{}'::jsonb, 'uji', ST_MakeEnvelope(106.821, -6.209, 106.824, -6.206, 4326), now(), now()),
            ('historis_risiko', 'banjir', 'Bahaya banjir tinggi', '{\"kelas\": \"tinggi\"}'::jsonb, 'uji', ST_MakeEnvelope(106.831, -6.209, 106.839, -6.201, 4326), now(), now()),
            ('mobilitas', 'krl', 'KRL', '{\"lin\": \"bogor\"}'::jsonb, 'uji', ST_GeomFromText('LINESTRING(106.80 -6.205, 106.84 -6.205)', 4326), now(), now())");

        DemoPetaSeeder::hitungMetrikWilayah();
    }

    public function test_daftar_layer_dan_data_layer(): void
    {
        $this->getJson('/api/layers')->assertOk()->assertJsonCount(6)->assertJsonStructure([['layer_id', 'nama', 'warna']]);

        $this->getJson('/api/layers/mobilitas')
            ->assertOk()
            ->assertJsonPath('type', 'FeatureCollection')
            ->assertJsonStructure(['features' => [['type', 'geometry', 'properties' => ['jenis']]]]);

        $this->getJson('/api/layers/tidak_ada')->assertNotFound();
    }

    public function test_search_selalu_tepat_tiga(): void
    {
        $r = $this->getJson('/api/search?q=dekat%20stasiun&persona[]=commuter')->assertOk();

        $r->assertJsonCount(3, 'hasil')
            ->assertJsonStructure(['persona', 'hasil' => [['wilayah_id', 'nama', 'tipe_kawasan', 'kota', 'match', 'pusat' => ['lat', 'lng'], 'geometri', 'alasan']]]);
        $this->assertSame('Kebon Uji', $r->json('hasil.0.nama'), 'Kelurahan dengan stasiun di tengahnya harus teratas untuk Commuter.');
    }

    public function test_search_nama_kelurahan_didahulukan(): void
    {
        $this->getJson('/api/search?q=Kelurahan%20Kali%20Uji&persona[]=commuter')
            ->assertOk()
            ->assertJsonCount(3, 'hasil')
            ->assertJsonPath('hasil.0.nama', 'Kali Uji');
    }

    public function test_inspect_titik_dan_wilayah(): void
    {
        $r = $this->getJson('/api/inspect?lat=-6.2049&lng=106.8049&persona[]=commuter&persona[]=driver')->assertOk();
        $r->assertJsonPath('jenis_geometri', 'titik')
            ->assertJsonPath('stars.commuter', 3)
            ->assertJsonStructure(['nama', 'wilayah', 'stars' => ['commuter', 'driver', 'social_vibe', 'zen'], 'ringkasan_layer', 'kesimpulan']);
        $tol = collect($r->json('ringkasan_layer'))->firstWhere('jenis', 'tol');
        $this->assertStringStartsWith('Gerbang Tol Uji 1', $tol['teks']);

        $id = DB::selectOne("SELECT id FROM wilayah WHERE nama = 'Kebon Uji'")->id;
        $this->getJson("/api/inspect?wilayah_id={$id}&persona[]=commuter")
            ->assertOk()
            ->assertJsonPath('jenis_geometri', 'wilayah')
            ->assertJsonPath('match.commuter', true)
            ->assertJsonStructure(['match' => ['commuter', 'driver', 'social_vibe', 'zen'], 'geometri']);
    }

    public function test_saran_lokasi(): void
    {
        $this->getJson('/api/lokasi?q=kebon')->assertOk()->assertJsonPath('hasil.0.nama', 'Kebon Uji');
        $this->getJson('/api/lokasi?q=stasiun%20a')->assertOk()->assertJsonPath('hasil.0.jenis', 'stasiun');
        $this->getJson('/api/lokasi?q=ab')->assertStatus(422);
    }

    public function test_commute_mobil_dan_umum(): void
    {
        $this->palsukanLayananLuar();

        $r = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')->assertOk();
        $r->assertJsonStructure([
            'pribadi' => ['jarak_km', 'waktu_menit', 'biaya', 'biaya_bbm', 'biaya_tol', 'lewat_tol', 'geometri'],
            'publik' => ['jarak_km', 'waktu_menit', 'biaya', 'rincian', 'stasiun', 'geometri' => ['jalan_kaki', 'rel']],
            'catatan',
        ]);
        $this->assertSame($r->json('pribadi.biaya_bbm') + $r->json('pribadi.biaya_tol'), $r->json('pribadi.biaya'));
        $this->assertGreaterThan(0, $r->json('pribadi.biaya_tol'));
        $this->assertSame(3000, $r->json('publik.biaya'));

        $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349&tol=0&bbm=12000')->assertOk();
        Http::assertSent(fn (PermintaanHttp $q) => str_contains($q->url(), 'valhalla') && ($q['costing_options']['auto']['use_tolls'] ?? null) === 0.0);

        $this->getJson('/api/commute?dari=-6.2,106.8&ke=-6.2,106.83&bbm=100')->assertStatus(422);
    }

    private function palsukanLayananLuar(): void
    {
        $garis = ['type' => 'LineString', 'coordinates' => [[106.8049, -6.2049], [106.8349, -6.2049]]];
        Http::fake([
            'valhalla1.openstreetmap.de/*' => Http::response(['trip' => [
                'summary' => ['length' => 3.4, 'time' => 600],
                'legs' => [['shape' => '_p~iF~ps|U_ulLnnqC', 'maneuvers' => [['length' => 2.0, 'toll' => true], ['length' => 1.4]]]],
            ]]),
            'router.project-osrm.org/*' => Http::response(['routes' => [['distance' => 3400, 'duration' => 600, 'geometry' => $garis]]]),
            'routing.openstreetmap.de/*' => Http::response(['routes' => [['distance' => 100, 'duration' => 80, 'geometry' => $garis]]]),
            'api.commute.shiorilabs.id/operators' => Http::response(['data' => [['code' => 'KCI', 'lines' => [['lineCode' => 'B', 'name' => 'Lin Bogor']]]]]),
            'api.commute.shiorilabs.id/fares/*' => Http::response(['data' => [
                'legs' => [['type' => 'RIDE', 'line' => 'KCI:B', 'operator' => 'KCI', 'from' => ['id' => 'KCI-AAA', 'name' => 'Stasiun A'],
                    'to' => ['id' => 'KCI-BBB', 'name' => 'Stasiun B'], 'stops' => [['id' => 'KCI-AAA'], ['id' => 'KCI-BBB']], 'distanceM' => 3300]],
                'segments' => [['fare' => 3000]],
                'totalFare' => 3000,
            ]]),
        ]);
    }
}
