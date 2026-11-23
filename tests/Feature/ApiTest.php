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

        // Tes tidak boleh memanggil server publik (Valhalla, OSRM, Commute Data API): setiap permintaan luar
        // yang tidak di-Http::fake gagal, sehingga hasil tes tidak bergantung pada internet.
        Http::preventStrayRequests();

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
            ('ekosistem', 'rth', 'Taman', '{\"luas_m2\": 100000}'::jsonb, 'uji', ST_MakeEnvelope(106.821, -6.209, 106.824, -6.206, 4326), now(), now()),
            ('historis_risiko', 'banjir', 'Bahaya banjir tinggi', '{\"kelas\": \"tinggi\"}'::jsonb, 'uji', ST_MakeEnvelope(106.831, -6.209, 106.839, -6.201, 4326), now(), now()),
            ('mobilitas', 'krl', 'KRL', '{\"lin\": \"bogor\"}'::jsonb, 'uji', ST_GeomFromText('LINESTRING(106.80 -6.205, 106.84 -6.205)', 4326), now(), now())");

        DemoPetaSeeder::hitungMetrikWilayah();
    }

    public function test_daftar_layer_dan_data_layer(): void
    {
        $this->getJson('/api/layers')->assertOk()->assertJsonCount(9)->assertJsonStructure([['layer_id', 'nama', 'warna']]);

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

    public function test_inspect_area_gambar(): void
    {
        // Kotak +-660 m di dalam Kebon Uji, berisi Stasiun A dan Kopi Uji.
        $area = '106.802,-6.208;106.808,-6.208;106.808,-6.202;106.802,-6.202';
        $r = $this->getJson("/api/inspect?area={$area}&persona[]=commuter&persona[]=zen")->assertOk();

        $r->assertJsonPath('jenis_geometri', 'area')
            ->assertJsonPath('kelurahan.0.nama', 'Kebon Uji')
            ->assertJsonPath('match.commuter', true)
            ->assertJsonPath('jumlah_fasilitas.commuter', 1)
            ->assertJsonPath('jumlah_fasilitas.social_vibe', 1)
            ->assertJsonPath('terdekat.commuter.meter', 0)
            ->assertJsonPath('match.zen', true)
            ->assertJsonCount(2, 'kesimpulan')
            ->assertJsonStructure(['nama', 'wilayah', 'wilayah_id', 'geometri', 'luas_m2', 'kelurahan', 'match', 'terdekat', 'udara', 'banjir' => ['porsi_rawan']]);
        $this->assertEqualsWithDelta(440_000, $r->json('luas_m2'), 30_000);
    }

    public function test_inspect_area_ditolak_bila_tidak_layak(): void
    {
        $this->getJson('/api/inspect?area=106.802,-6.208;106.808,-6.208')->assertStatus(422);
        $this->getJson('/api/inspect?area=106.80,-6.25;106.86,-6.25;106.86,-6.19;106.80,-6.19')
            ->assertStatus(422)->assertJsonPath('message', 'Area terlalu luas (maksimal 25 km²). Perkecil areanya.');
        $this->getJson('/api/inspect?area=106.20,-6.80;106.21,-6.80;106.21,-6.79')
            ->assertStatus(422)->assertJsonPath('message', 'Sebagian besar area berada di luar Jabodetabek. Gambar area di dalam batas peta.');
        $this->getJson('/api/inspect?area=100,-6;100.1,-6;100.1,-6.1')->assertStatus(422);
    }

    public function test_saran_lokasi(): void
    {
        $this->getJson('/api/lokasi?q=kebon')->assertOk()->assertJsonPath('hasil.0.nama', 'Kebon Uji');
        $this->getJson('/api/lokasi?q=stasiun%20a')->assertOk()->assertJsonPath('hasil.0.jenis', 'stasiun');
        $this->getJson('/api/lokasi?q=ab')->assertStatus(422);
    }

    public function test_search_luar_cakupan_dan_tidak_dipahami(): void
    {
        $this->getJson('/api/search?q=Surabaya%20dekat%20stasiun')
            ->assertOk()->assertJsonCount(0, 'hasil')->assertJsonPath('message', 'NalarRuang hanya mencakup Jabodetabek.');
        $this->getJson('/api/search?q=asdfghjkl&persona[]=commuter')
            ->assertOk()->assertJsonCount(0, 'hasil');
        $this->assertStringStartsWith('Kami belum memahami', $this->getJson('/api/search?q=asdfghjkl')->json('message'));
    }

    public function test_search_jauh_dari_tol(): void
    {
        $r = $this->getJson('/api/search?q=tidak%20mau%20dekat%20tol')->assertOk()->assertJsonCount(3, 'hasil');
        $this->assertNotSame('Kebon Uji', $r->json('hasil.0.nama'), 'Kelurahan paling dekat gerbang tol tidak boleh teratas.');
        $this->assertStringContainsString('jauh dari tol', $r->json('hasil.0.alasan'));
    }

    public function test_inspect_luar_cakupan_tanpa_skor(): void
    {
        $this->getJson('/api/inspect?lat=-7.25&lng=112.75&persona[]=commuter')
            ->assertOk()
            ->assertJsonPath('stars.commuter', null)
            ->assertJsonPath('wilayah', 'Di luar cakupan NalarRuang (Jabodetabek)')
            ->assertJsonPath('kesimpulan', []);
    }

    public function test_inspect_zonasi_dan_bukan_hunian(): void
    {
        DB::insert("INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at) VALUES
            ('zonasi', 'zonasi', 'Perumahan', '{\"zona\": \"Zona Perumahan\", \"kode_subzona\": \"R-2\", \"kdb\": 60, \"klb\": 1.2}'::jsonb, 'uji', ST_MakeEnvelope(106.80, -6.21, 106.81, -6.20, 4326), now(), now()),
            ('non_hunian', 'non_hunian', 'Makam Uji', '{\"kategori\": \"makam\"}'::jsonb, 'uji', ST_MakeEnvelope(106.811, -6.209, 106.819, -6.201, 4326), now(), now())");

        $r = $this->getJson('/api/inspect?lat=-6.2049&lng=106.8049')->assertOk();
        $r->assertJsonPath('zonasi.zona', 'Zona Perumahan')->assertJsonPath('catatan', null);
        $this->assertContains('Zona Perumahan (R-2), KDB 60%, KLB 1,2 (RDTR DKI 2022)', array_column($r->json('ringkasan_layer'), 'teks'));

        $this->getJson('/api/inspect?lat=-6.205&lng=106.815')
            ->assertOk()->assertJsonPath('catatan', 'Titik ini berada di makam (Makam Uji), bukan kawasan hunian.');
    }

    public function test_ringkasan_banjir_memakai_tingkat_tampilan(): void
    {
        DB::insert("INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at) VALUES
            ('historis_risiko', 'banjir_tampil', 'Bahaya banjir tingkat 3', '{\"tingkat\": 3, \"indeks\": \"0,81–1,00\"}'::jsonb, 'uji', ST_MakeEnvelope(106.831, -6.209, 106.839, -6.201, 4326), now(), now())");

        $teks = array_column($this->getJson('/api/inspect?lat=-6.205&lng=106.835')->assertOk()->json('ringkasan_layer'), 'teks', 'jenis');
        $this->assertSame('Sangat rawan tergenang (indeks bahaya InaRISK 0,81–1,00)', $teks['banjir-3']);

        $teks = array_column($this->getJson('/api/inspect?lat=-6.2049&lng=106.8049')->assertOk()->json('ringkasan_layer'), 'teks', 'jenis');
        $this->assertSame('Indeks bahaya banjir InaRISK di bawah 0,50', $teks['banjir']);
    }

    public function test_inspect_titik_membentuk_poligon_isochrone_dari_ruas_jalan_valhalla(): void
    {
        // Regresi: query penghalusan poligon pernah ditolak PostgreSQL (ST_Dump di dalam agregat), galatnya
        // tertelan, dan peta selalu jatuh ke cadangan. Ruas jalan palsu membentuk cincin di sekitar titik uji.
        Http::fake([
            'valhalla1.openstreetmap.de/expansion' => Http::response(['type' => 'FeatureCollection', 'features' => [[
                'type' => 'Feature',
                'properties' => [],
                'geometry' => ['type' => 'LineString', 'coordinates' => [
                    [106.8040, -6.2040], [106.8060, -6.2040], [106.8060, -6.2060], [106.8040, -6.2060], [106.8040, -6.2040],
                ]],
            ]]]),
        ]);

        $r = $this->getJson('/api/inspect?lat=-6.2050&lng=106.8050&persona[]=commuter')->assertOk();

        $r->assertJsonPath('isochrone_meta.aktif', true)
            ->assertJsonPath('isochrone_meta.mode', 'pedestrian')
            ->assertJsonPath('isochrone_meta.minutes', 10)
            ->assertJsonPath('isochrone.type', 'FeatureCollection');
        $this->assertContains($r->json('isochrone.features.0.geometry.type'), ['Polygon', 'MultiPolygon']);
    }

    public function test_inspect_titik_tanpa_valhalla_memakai_jarak_garis_lurus(): void
    {
        // Tanpa Http::fake, permintaan ke Valhalla gagal; /api/inspect harus tetap menjawab dari jarak garis lurus.
        $this->getJson('/api/inspect?lat=-6.2050&lng=106.8050&persona[]=commuter')
            ->assertOk()
            ->assertJsonPath('isochrone_meta.aktif', false)
            ->assertJsonPath('isochrone', null)
            ->assertJsonPath('stars.commuter', 3);
    }

    public function test_bbox_layer_yang_salah_format_ditolak_422(): void
    {
        $this->getJson('/api/layers/mobilitas?bbox=106.8,-6.2')->assertStatus(422)->assertJsonStructure(['message']);
        $this->getJson('/api/layers/mobilitas?bbox=a,b,c,d')->assertStatus(422);
        $this->getJson('/api/layers/mobilitas?bbox=106.79,-6.22,106.85,-6.19')
            ->assertOk()->assertJsonPath('type', 'FeatureCollection');
    }

    public function test_tahun_mesin_waktu_divalidasi(): void
    {
        $this->getJson('/api/layers/mesin_waktu?tahun=2030')->assertOk();
        $this->getJson('/api/layers/mesin_waktu?tahun=99999')->assertStatus(422);
    }

    public function test_saran_lokasi_tanpa_kata_umum(): void
    {
        $this->getJson('/api/lokasi?q=jalan%20kebon')->assertOk()->assertJsonPath('hasil.0.nama', 'Kebon Uji');
    }

    public function test_commute_mobil_dan_umum(): void
    {
        $this->palsukanLayananLuar();

        $r = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')->assertOk();
        $r->assertJsonStructure([
            'pribadi' => [['jarak_km', 'waktu_menit', 'biaya', 'biaya_bbm', 'biaya_tol', 'lewat_tol', 'ganjil_genap' => ['hindari', 'ruas'], 'geometri']],
            'publik' => [['jarak_km', 'waktu_menit', 'biaya', 'biaya_transum', 'biaya_ojol', 'rincian', 'langkah', 'stasiun', 'geometri' => ['jalan_kaki', 'ojol', 'rel']]],
            'catatan',
        ]);
        $this->assertSame($r->json('pribadi.0.biaya_bbm') + $r->json('pribadi.0.biaya_tol'), $r->json('pribadi.0.biaya'));
        $this->assertGreaterThan(0, $r->json('pribadi.0.biaya_tol'));
        $this->assertSame(3000, $r->json('publik.0.biaya'));
        $this->assertSame(['jalan', 'naik', 'jalan'], array_column($r->json('publik.0.langkah'), 'tipe'));

        // Titik 2,5 km dari stasiun: ke stasiun naik ojol (T-042), biaya ojol ikut dijumlah.
        $jauh = $this->getJson('/api/commute?dari=-6.2275,106.8049&ke=-6.2049,106.8349')->assertOk();
        $this->assertSame('ojol', $jauh->json('publik.0.langkah.0.tipe'));
        $this->assertSame(15000, $jauh->json('publik.0.biaya_ojol'));
        $this->assertSame(18000, $jauh->json('publik.0.biaya'));

        $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349&tol=0&bbm=12000')->assertOk();
        Http::assertSent(fn (PermintaanHttp $q) => str_contains($q->url(), 'valhalla') && ($q['costing_options']['auto']['use_tolls'] ?? null) === 0.0);

        $this->getJson('/api/commute?dari=-6.2,106.8&ke=-6.2,106.83&bbm=100')->assertStatus(422);
    }

    public function test_commute_motor_memakai_costing_motorcycle_dan_tanpa_tol(): void
    {
        $this->palsukanLayananLuar();

        $r = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349&kendaraan=motor&tol=1')->assertOk();

        Http::assertSent(fn (PermintaanHttp $q) => str_ends_with($q->url(), '/route')
            && $q['costing'] === 'motorcycle'
            && ($q['costing_options']['motorcycle']['use_tolls'] ?? null) === 0.0
            && ($q['costing_options']['motorcycle']['use_highways'] ?? null) === 0.0);
        // Parameter tol=1 diabaikan untuk motor (tidak boleh lewat tol di Indonesia).
        $this->assertFalse($r->json('pribadi.0.lewat_tol'));
        // Konsumsi motor 40 km/liter (bukan 12 km/liter mobil): 3,3 km / 40 * Rp10.000, dibulatkan ke ratusan.
        $this->assertSame(800, $r->json('pribadi.0.biaya_bbm'));
    }

    public function test_commute_mobil_memutar_tawarkan_jalan_kaki(): void
    {
        $this->palsukanLayananLuar();

        // A dan B hanya +-80 m garis lurus, tapi mock Valhalla selalu memberi rute 3,3 km (jauh lebih panjang):
        // kemungkinan titik hanya terjangkau lewat gang, jadi jalan kaki langsung ditawarkan sebagai alternatif.
        $r = $this->getJson('/api/commute?dari=-6.2000,106.8000&ke=-6.2005,106.8005')->assertOk();

        $r->assertJsonPath('pribadi.0.jalan_kaki_alternatif.meter', 100)
            ->assertJsonPath('pribadi.0.jalan_kaki_alternatif.menit', 1);

        // Titik jauh (3,3 km garis lurus dari test lain) tidak memicu saran ini: rute mobil wajar untuk jarak segitu.
        $jauh = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')->assertOk();
        $jauh->assertJsonPath('pribadi.0.jalan_kaki_alternatif', null);
    }

    public function test_commute_mobil_sampai_3_alternatif(): void
    {
        $shape = 'f}uyJgizujE?oh\\?oh\\';
        Http::fake([
            'valhalla1.openstreetmap.de/*' => Http::response(['trip' => [
                'summary' => ['length' => 3.3, 'time' => 600],
                'legs' => [['shape' => $shape, 'maneuvers' => []]],
            ], 'alternates' => [
                ['trip' => ['summary' => ['length' => 4.0, 'time' => 650], 'legs' => [['shape' => $shape, 'maneuvers' => []]]]],
                ['trip' => ['summary' => ['length' => 4.5, 'time' => 700], 'legs' => [['shape' => $shape, 'maneuvers' => []]]]],
            ]]),
            'api.commute.shiorilabs.id/*' => Http::response(['data' => []], 404),
        ]);

        $r = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')->assertOk();

        $r->assertJsonCount(3, 'pribadi');
        $this->assertSame([3.3, 4, 4.5], array_column($r->json('pribadi'), 'jarak_km'));
    }

    public function test_commute_publik_array_terurut_dari_tercepat(): void
    {
        $this->palsukanLayananLuar();

        $r = $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')->assertOk();

        $menit = array_column($r->json('publik'), 'waktu_menit');
        $this->assertNotEmpty($menit);
        $this->assertLessThanOrEqual(3, count($menit));
        $this->assertSame($menit, collect($menit)->sort()->values()->all(), 'publik harus terurut dari waktu tempuh tercepat.');
    }

    public function test_commute_hindari_ganjil_genap(): void
    {
        $this->palsukanLayananLuar();
        DB::insert("INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, sumber, geom, created_at, updated_at)
            VALUES ('mobilitas', 'ganjil_genap', 'Jl. Uji', '{}'::jsonb, 'uji', ST_Multi(ST_MakeEnvelope(106.822, -6.206, 106.830, -6.204, 4326)), now(), now())");

        $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349')
            ->assertOk()
            ->assertJsonPath('pribadi.0.ganjil_genap', ['hindari' => false, 'ruas' => ['Jl. Uji']]);
        Http::assertNotSent(fn (PermintaanHttp $q) => isset($q['exclude_polygons']));

        // Server palsu selalu memberi rute yang sama, jadi ruas tetap dilaporkan tidak bisa dihindari.
        $this->getJson('/api/commute?dari=-6.2049,106.8049&ke=-6.2049,106.8349&gg=1')
            ->assertOk()
            ->assertJsonPath('pribadi.0.ganjil_genap', ['hindari' => true, 'ruas' => ['Jl. Uji']]);
        Http::assertSent(fn (PermintaanHttp $q) => str_ends_with($q->url(), '/route') && count($q['exclude_polygons'] ?? []) === 1
            && count($q['exclude_polygons'][0]) === 3);
    }

    private function palsukanLayananLuar(): void
    {
        $garis = ['type' => 'LineString', 'coordinates' => [[106.8049, -6.2049], [106.8349, -6.2049]]];
        Http::fake([
            // Garis lurus 106.8049 -> 106.8349 di lintang -6.2049; separuh pertama jalan tol.
            'valhalla1.openstreetmap.de/trace_attributes' => Http::response(['edges' => [
                ['begin_shape_index' => 0, 'end_shape_index' => 1, 'toll' => true, 'length' => 1.65],
                ['begin_shape_index' => 1, 'end_shape_index' => 2, 'length' => 1.65],
            ]]),
            'valhalla1.openstreetmap.de/*' => Http::response(['trip' => [
                'summary' => ['length' => 3.3, 'time' => 600],
                'legs' => [['shape' => 'f}uyJgizujE?oh\\?oh\\', 'maneuvers' => [
                    ['length' => 1.65, 'toll' => true, 'begin_shape_index' => 0, 'end_shape_index' => 1],
                    ['length' => 1.65, 'begin_shape_index' => 1, 'end_shape_index' => 2],
                ]]],
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
