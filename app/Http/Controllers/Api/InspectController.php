<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PersonaScoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * GET /api/inspect (FR-08, FR-09, FR-17, T-056).
 * Titik menggunakan poligon jangkauan waktu tempuh (Valhalla /expansion + PostGIS morphological closing)
 * agar area utuh tanpa lubang blok dan garis batas luarnya mengikuti lekukan jaringan jalan.
 */
class InspectController extends Controller
{
    private const VALHALLA_EXPANSION = 'https://valhalla1.openstreetmap.de/expansion';
    private const VALHALLA_ISOCHRONE = 'https://valhalla1.openstreetmap.de/isochrone';

    /** Fasilitas utama tiap persona: jenis di tabel fitur_peta. */
    public const FASILITAS = [
        'commuter' => ['stasiun'],
        'driver' => ['tol'],
        'social_vibe' => ['poi'],
        'zen' => ['rth'],
    ];

    /**
     * Ruang hijau untuk Zen: taman, hutan kota, lapangan seluas minimal 1.000 m² (luas_m2 dihitung DataNyataSeeder);
     * makam dan lapangan golf tidak dihitung (T-038).
     */
    private const SYARAT = [
        'zen' => "AND coalesce(atribut->>'kategori', '') NOT IN ('cemetery', 'golf_course') AND coalesce((atribut->>'luas_m2')::float, 0) >= 1000",
    ];

    /** Kategori area bukan hunian (OSM) dan zona RDTR yang bukan tempat tinggal. */
    private const BUKAN_HUNIAN = [
        'bandara' => 'bandara',
        'jalan_tol' => 'badan jalan tol',
        'makam' => 'makam',
        'militer' => 'kawasan militer',
        'perairan' => 'perairan',
    ];

    private const ZONA_BUKAN_HUNIAN = [
        'Zona Badan Air',
        'Zona Pertahanan dan Keamanan',
        'Zona Transportasi',
        'Zona Hutan Lindung',
        'Zona Ekosistem Mangrove',
        'Zona Pembangkit Tenaga Listrik',
        'Zona Perlindungan Setempat',
        'Zona Konservasi',
    ];

    /** Arti tiga tingkat tampilan bahaya banjir (indeks InaRISK, dari bentuk lahan; bukan peluang atau riwayat). */
    public const TINGKAT_BANJIR = [
        1 => 'Cukup rawan tergenang',
        2 => 'Rawan tergenang',
        3 => 'Sangat rawan tergenang',
    ];

    /** Pesan untuk titik di luar batas kelurahan Jabodetabek. */
    public const LUAR_CAKUPAN = 'Di luar cakupan NalarRuang (Jabodetabek)';

    public function __construct(private PersonaScoring $skor)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $persona = array_values(array_intersect((array) $request->query('persona', []), PersonaScoring::PERSONA));

        if ($request->filled('wilayah_id')) {
            return $this->wilayah((int) $request->query('wilayah_id'), $persona);
        }

        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'mode' => 'nullable|in:pedestrian,bicycle,auto',
            'minutes' => 'nullable|integer|min:1|max:60',
        ]);

        $defaultMode = $persona === ['driver'] ? 'auto' : 'pedestrian';
        $mode = (string) $request->query('mode', $defaultMode);
        $minutes = (int) $request->query('minutes', 10);

        return $this->titik(
            (float) $request->query('lat'),
            (float) $request->query('lng'),
            $persona,
            $mode,
            $minutes,
        );
    }

    private function titik(float $lat, float $lng, array $persona, string $mode = 'pedestrian', int $minutes = 10): JsonResponse
    {
        $titik = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)';
        $wilayah = DB::selectOne(
            "SELECT id, nama, kecamatan, kota, kualitas_udara, (atribut->>'pm25')::float AS pm25 FROM wilayah WHERE ST_Contains(geom, {$titik}) LIMIT 1",
            [$lng, $lat],
        );
        if (! $wilayah) {
            return $this->luarCakupan($lat, $lng);
        }

        // Ambil poligon jangkauan jalan yang garis tepinya mengikuti ruas jalan terluar
        $isochrone = $this->hitungIsochrone($lat, $lng, $mode, $minutes);
        $isoGeomJson = isset($isochrone['features'][0]['geometry'])
            ? json_encode($isochrone['features'][0]['geometry'])
            : null;

        $jarak = [];
        $terdekat = [];
        foreach (self::FASILITAS as $p => $jenis) {
            $baris = $this->terdekatDalamIsochrone($jenis, $lat, $lng, $isoGeomJson, self::SYARAT[$p] ?? '');
            $jarak[$p] = $baris?->meter;
            $terdekat[$p] = $baris;
        }

        $skor = [
            'commuter' => $this->skor->bintangJarak($jarak['commuter']),
            'driver' => $this->skor->bintangJarak($jarak['driver']),
            'social_vibe' => $this->skor->bintangJarak($jarak['social_vibe']),
            'zen' => $this->skor->bintangZen($wilayah?->kualitas_udara, $jarak['zen']),
        ];

        $banjir = DB::selectOne(
            "SELECT atribut->>'kelas' AS kelas FROM fitur_peta WHERE jenis = 'banjir' AND ST_Contains(geom, {$titik})
             ORDER BY CASE atribut->>'kelas' WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 ELSE 2 END LIMIT 1",
            [$lng, $lat],
        );

        // Tingkat tampilan peta (indeks >= 0,50); kelas perhitungan di atas tetap kelas resmi InaRISK.
        $banjirTampil = DB::selectOne(
            "SELECT (atribut->>'tingkat')::int AS tingkat, atribut->>'indeks' AS indeks FROM fitur_peta
             WHERE jenis = 'banjir_tampil' AND ST_Contains(geom, {$titik}) ORDER BY (atribut->>'tingkat')::int DESC LIMIT 1",
            [$lng, $lat],
        );

        $genangan = (bool) DB::selectOne(
            "SELECT 1 AS ada FROM fitur_peta WHERE jenis = 'genangan' AND ST_DWithin(geom::geography, {$titik}::geography, 100) LIMIT 1",
            [$lng, $lat],
        );

        $zonasi = DB::selectOne(
            "SELECT atribut->>'zona' AS zona, atribut->>'kode_subzona' AS subzona, nama, (atribut->>'kdb')::float AS kdb, (atribut->>'klb')::float AS klb
             FROM fitur_peta WHERE layer_id = 'zonasi' AND ST_Intersects(geom, {$titik}) LIMIT 1",
            [$lng, $lat],
        );

        $bukanHunian = DB::selectOne(
            "SELECT atribut->>'kategori' AS kategori, nama FROM fitur_peta WHERE layer_id = 'non_hunian' AND ST_Intersects(geom, {$titik})
             ORDER BY ST_Area(geom) LIMIT 1",
            [$lng, $lat],
        );

        $permukiman = DB::selectOne(
            "SELECT nama FROM fitur_peta WHERE jenis = 'legal' AND nama IS NOT NULL
             AND ST_DWithin(geom::geography, {$titik}::geography, 400)
             ORDER BY geom <-> {$titik} LIMIT 1",
            [$lng, $lat, $lng, $lat],
        );

        // Hitung jumlah kafe/restoran (POI) yang benar-benar terjangkau di dalam area isochrone
        $poiSekitar = $isoGeomJson
            ? (int) DB::selectOne(
                "SELECT count(*) AS n FROM fitur_peta WHERE jenis = 'poi' AND ST_Intersects(geom, ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)))",
                [$isoGeomJson],
            )->n
            : (int) DB::selectOne(
                "SELECT count(*) AS n FROM fitur_peta WHERE jenis = 'poi' AND ST_DWithin(geom::geography, {$titik}::geography, 1000)",
                [$lng, $lat],
            )->n;

        // Fakta untuk kalimat kesimpulan yang lebih rinci (T-033); disusun ulang di klien saat persona berganti.
        $fakta = [];
        foreach ($terdekat as $p => $baris) {
            $fakta[$p] = $baris ? ['nama' => $this->namaFasilitas($p, $baris->nama), 'meter' => (int) round($baris->meter)] : null;
        }
        if ($fakta['social_vibe']) {
            $fakta['social_vibe']['jumlah_1km'] = $poiSekitar;
            $fakta['social_vibe']['jumlah_isochrone'] = $poiSekitar;
        }
        if ($fakta['zen']) {
            $fakta['zen']['kualitas_udara'] = $wilayah->kualitas_udara;
            $fakta['zen']['pm25'] = $wilayah->pm25 === null ? null : (float) $wilayah->pm25;
            $fakta['zen']['banjir'] = $banjir?->kelas;
            $fakta['zen']['genangan_2020'] = $genangan;
        }

        $labelModa = match ($mode) {
            'auto' => 'berkendara',
            'bicycle' => 'bersepeda',
            default => 'jalan kaki',
        };

        $ringkasan = [];
        if ($terdekat['commuter']) {
            $ringkasan[] = ['jenis' => 'stasiun', 'teks' => 'Stasiun '.($terdekat['commuter']->nama ?: '').', '.$this->format($terdekat['commuter']->meter)." (jangkauan {$minutes} mnt {$labelModa})"];
        }
        if ($terdekat['driver']) {
            $nama = $fakta['driver']['nama'] ?? '';
            $ringkasan[] = ['jenis' => 'tol', 'teks' => ($nama !== '' ? "Gerbang Tol {$nama}, " : 'Gerbang tol terdekat ').$this->format($terdekat['driver']->meter)." (jangkauan {$minutes} mnt {$labelModa})"];
        }
        if ($terdekat['social_vibe']) {
            $ringkasan[] = ['jenis' => 'hijau', 'teks' => 'Kafe atau restoran terdekat '.$this->format($terdekat['social_vibe']->meter)." ({$poiSekitar} tempat dalam {$minutes} mnt {$labelModa})"];
        }
        $ringkasan[] = $banjirTampil
            ? ['jenis' => 'banjir-'.$banjirTampil->tingkat, 'teks' => self::TINGKAT_BANJIR[$banjirTampil->tingkat].' (indeks bahaya InaRISK '.$banjirTampil->indeks.')']
            : ['jenis' => 'banjir', 'teks' => 'Indeks bahaya banjir InaRISK di bawah 0,50'];
        if ($genangan) {
            $ringkasan[] = ['jenis' => 'genangan', 'teks' => 'Tergenang saat banjir 1 Januari 2020 (BNPB)'];
        }
        if ($zonasi?->zona) {
            $ringkasan[] = ['jenis' => 'legal', 'teks' => $this->teksZonasi($zonasi)];
        }

        $catatan = null;
        if ($bukanHunian) {
            $catatan = 'Titik ini berada di '.self::BUKAN_HUNIAN[$bukanHunian->kategori].($bukanHunian->nama ? " ({$bukanHunian->nama})" : '').', bukan kawasan hunian.';
        } elseif ($zonasi && in_array($zonasi->zona, self::ZONA_BUKAN_HUNIAN, true)) {
            $catatan = "Titik ini berada di {$zonasi->zona} menurut RDTR DKI 2022, bukan kawasan hunian.";
        }

        return response()->json([
            'jenis_geometri' => 'titik',
            'nama' => $permukiman->nama ?? 'Kel. '.$wilayah->nama,
            'wilayah' => trim(implode(', ', array_filter([$wilayah->kecamatan ? 'Kec. '.$wilayah->kecamatan : null, $wilayah->kota]))),
            'wilayah_id' => $wilayah->id,
            'lat' => $lat,
            'lng' => $lng,
            'isochrone_meta' => [
                'mode' => $mode,
                'minutes' => $minutes,
                'aktif' => $isochrone !== null,
            ],
            'isochrone' => $isochrone,
            'stars' => $skor,
            'jarak_meter' => array_map(fn ($m) => $m === null ? null : (int) round($m), $jarak),
            'ringkasan_layer' => $ringkasan,
            'fakta' => $fakta,
            'kesimpulan' => array_values(array_filter(array_map(
                fn ($p) => $skor[$p] === null ? null : $this->skor->kesimpulanTitik($p, $skor[$p], $fakta[$p]),
                $persona,
            ))),
            'data_tidak_lengkap' => in_array(null, $skor, true),
            'zonasi' => $zonasi?->zona ? [
                'zona' => $zonasi->zona,
                'subzona' => $zonasi->subzona,
                'kdb' => $zonasi->kdb === null ? null : (float) $zonasi->kdb,
                'klb' => $zonasi->klb === null ? null : (float) $zonasi->klb,
                'sumber' => 'RDTR DKI 2022',
            ] : null,
            'catatan' => $catatan,
        ]);
    }

    /**
     * Mengambil ruas-ruas jalan terjangkau dari Valhalla /expansion (action=isochrone),
     * lalu membentuk satu poligon solid yang garis batas luarnya mengikuti ruas jalan terluar.
     */
    private function hitungIsochrone(float $lat, float $lng, string $mode, int $minutes): ?array
    {
        $kunci = sprintf('isochrone_boundary_v2:%.4f:%.4f:%s:%d', $lat, $lng, $mode, $minutes);

        return Cache::remember($kunci, now()->addDay(), function () use ($lat, $lng, $mode, $minutes) {
            // Parameter morphological closing (dalam meter, EPSG:3857):
            // expand menyatukan jarak antarjalan dalam blok; shrink menarik kembali tepi poligon agar menempel pada jalan terluar.
            $expandMeter = $mode === 'auto' ? 70 : 48;
            $shrinkMeter = $mode === 'auto' ? -38 : -26;

            try {
                $r = Http::timeout(12)
                    ->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])
                    ->post(self::VALHALLA_EXPANSION, [
                        'locations' => [['lat' => $lat, 'lon' => $lng]],
                        'costing' => $mode,
                        'contours' => [['time' => $minutes]],
                        'action' => 'isochrone',
                        'skip_opposites' => true,
                    ]);

                $json = $r->json();
                if ($r->ok() && ! empty($json['features']) && is_array($json['features'])) {
                    $poligon = $this->bangunPoligonBatasJalan($json['features'], $expandMeter, $shrinkMeter, $mode, $minutes);
                    if ($poligon !== null) {
                        return $poligon;
                    }
                }
            } catch (Throwable) {
                // Lanjut ke fallback /isochrone tanpa penyederhanaan garis jika /expansion timeout
            }

            try {
                $r = Http::timeout(10)
                    ->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])
                    ->post(self::VALHALLA_ISOCHRONE, [
                        'locations' => [['lat' => $lat, 'lon' => $lng]],
                        'costing' => $mode,
                        'contours' => [['time' => $minutes, 'color' => '2563eb']],
                        'polygons' => true,
                        'denoise' => 0.2,
                        'generalize' => 0,
                    ]);

                $json = $r->json();
                if ($r->ok() && ! empty($json['features'][0]['geometry'])) {
                    return $json;
                }
            } catch (Throwable) {
                // Jika server Valhalla publik timeout, fallback ke null agar tidak error 500
            }

            return null;
        });
    }

    /**
     * Mengubah jaringan ruas jalan dari /expansion menjadi satu area poligon utuh tanpa lubang blok,
     * dengan garis tepi luar mengikuti ruas-ruas jalan terluar.
     */
    private function bangunPoligonBatasJalan(array $features, int $expandMeter, int $shrinkMeter, string $mode, int $minutes): ?array
    {
        $lines = [];
        foreach ($features as $feat) {
            $geom = $feat['geometry'] ?? null;
            if (! is_array($geom) || empty($geom['coordinates']) || ! is_array($geom['coordinates'])) {
                continue;
            }

            $tipe = $geom['type'] ?? '';
            if ($tipe === 'LineString' && count($geom['coordinates']) >= 2) {
                $lines[] = $geom['coordinates'];
            } elseif ($tipe === 'MultiLineString') {
                foreach ($geom['coordinates'] as $segmen) {
                    if (is_array($segmen) && count($segmen) >= 2) {
                        $lines[] = $segmen;
                    }
                }
            }
        }

        if ($lines === []) {
            return null;
        }

        $multiLineJson = json_encode([
            'type' => 'MultiLineString',
            'coordinates' => $lines,
        ]);

        if ($multiLineJson === false) {
            return null;
        }

        $row = DB::selectOne(
            "WITH raw_lines AS (
                SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), 3857) AS geom
            ),
            closed AS (
                SELECT ST_Buffer(
                    ST_Buffer(geom, ?, 'endcap=round join=round quad_segs=4'),
                    ?,
                    'endcap=round join=round quad_segs=4'
                ) AS geom
                FROM raw_lines
            ),
            filled AS (
                SELECT ST_Union(ST_MakePolygon(ST_ExteriorRing((ST_Dump(geom)).geom))) AS geom
                FROM closed
                WHERE NOT ST_IsEmpty(geom)
            )
            SELECT ST_AsGeoJSON(
                ST_SimplifyPreserveTopology(ST_Transform(geom, 4326), 0.00004),
                6
            ) AS geojson
            FROM filled
            WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)",
            [$multiLineJson, $expandMeter, $shrinkMeter],
        );

        if (! $row || empty($row->geojson)) {
            return null;
        }

        $geometry = json_decode($row->geojson, true);
        if (! is_array($geometry) || empty($geometry['type'])) {
            return null;
        }

        return [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'properties' => [
                        'contour' => $minutes,
                        'metric' => 'time',
                        'mode' => $mode,
                        'color' => '#2563eb',
                        'fill' => '#2563eb',
                        'fillOpacity' => 0.18,
                    ],
                    'geometry' => $geometry,
                ],
            ],
        ];
    }

    /**
     * Cari fasilitas terdekat yang berada di DALAM poligon jangkauan jalan (isochrone).
     * Jika fasilitas dekat secara garis lurus tetapi terhalang akses jalan (di luar poligon), tidak dihitung.
     */
    private function terdekatDalamIsochrone(array $jenis, float $lat, float $lng, ?string $isoGeomJson, string $syarat = ''): ?object
    {
        $tanda = implode(',', array_fill(0, count($jenis), '?'));

        if ($isoGeomJson !== null) {
            return DB::selectOne(
                "SELECT nama, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
                 FROM fitur_peta
                 WHERE jenis IN ({$tanda}) {$syarat}
                   AND ST_Intersects(geom, ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)))
                 ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)
                 LIMIT 1",
                [$lng, $lat, ...$jenis, $isoGeomJson, $lng, $lat],
            );
        }

        // Fallback bila layanan Valhalla sedang tidak tersedia
        return DB::selectOne(
            "SELECT nama, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
             FROM fitur_peta WHERE jenis IN ({$tanda}) {$syarat}
             ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326) LIMIT 1",
            [$lng, $lat, ...$jenis, $lng, $lat],
        );
    }

    /** Titik di luar batas kelurahan Jabodetabek: tanpa skor, alih-alih skor 0 yang menyesatkan. */
    private function luarCakupan(float $lat, float $lng): JsonResponse
    {
        $kosong = array_fill_keys(PersonaScoring::PERSONA, null);

        return response()->json([
            'jenis_geometri' => 'titik',
            'nama' => 'Titik terpilih',
            'wilayah' => self::LUAR_CAKUPAN,
            'wilayah_id' => null,
            'lat' => $lat,
            'lng' => $lng,
            'isochrone_meta' => null,
            'isochrone' => null,
            'stars' => $kosong,
            'jarak_meter' => $kosong,
            'ringkasan_layer' => [],
            'fakta' => $kosong,
            'kesimpulan' => [],
            'data_tidak_lengkap' => true,
            'zonasi' => null,
            'catatan' => 'Lokasi ini di luar Jabodetabek, jadi belum bisa dinilai.',
        ]);
    }

    /** "Zona Perumahan (R-2), KDB 60%, KLB 1,2 (RDTR DKI 2022)". */
    private function teksZonasi(object $z): string
    {
        $rinci = array_filter([
            $z->kdb !== null ? 'KDB '.rtrim(rtrim(number_format($z->kdb, 1, ',', ''), '0'), ',').'%' : null,
            $z->klb !== null ? 'KLB '.rtrim(rtrim(number_format($z->klb, 1, ',', ''), '0'), ',') : null,
        ]);

        return $z->zona.($z->subzona ? " ({$z->subzona})" : '').($rinci ? ', '.implode(', ', $rinci) : '').' (RDTR DKI 2022)';
    }

    private function wilayah(int $id, array $persona): JsonResponse
    {
        $w = DB::selectOne("SELECT id, nama, kecamatan, kota, tipe_kawasan, kualitas_udara, (atribut->>'pm25')::float AS pm25, (atribut->>'penduduk')::int AS penduduk, (atribut->>'kepadatan')::int AS kepadatan, ST_AsGeoJSON(geom, 6) AS geojson FROM wilayah WHERE id = ?", [$id]);
        if (! $w) {
            return response()->json(['message' => 'Wilayah tidak ditemukan.'], 404);
        }

        $jumlah = [];
        foreach (self::FASILITAS as $p => $jenis) {
            $tanda = implode(',', array_fill(0, count($jenis), '?'));
            $jumlah[$p] = (int) DB::selectOne(
                "SELECT count(*) AS n FROM fitur_peta f JOIN wilayah w ON w.id = ? WHERE f.jenis IN ({$tanda}) ".str_replace('atribut', 'f.atribut', self::SYARAT[$p] ?? '').' AND ST_Intersects(f.geom, w.geom)',
                [$id, ...$jenis],
            )->n;
        }

        // Fasilitas utama terdekat dari batas kawasan (0 m bila di dalamnya). Cocok bila <= 2,5 km (TBD-09, 23 Okt 2026).
        $terdekat = [];
        foreach (self::FASILITAS as $p => $jenis) {
            $tanda = implode(',', array_fill(0, count($jenis), '?'));
            $b = DB::selectOne(
                "SELECT f.nama, ST_Distance(f.geom::geography, w.geom::geography) AS meter
                 FROM fitur_peta f JOIN wilayah w ON w.id = ?
                 WHERE f.jenis IN ({$tanda}) ".str_replace('atribut', 'f.atribut', self::SYARAT[$p] ?? '').'
                 ORDER BY f.geom <-> w.geom LIMIT 1',
                [$id, ...$jenis],
            );
            $terdekat[$p] = $b ? ['nama' => $this->namaFasilitas($p, $b->nama), 'meter' => (int) round($b->meter)] : null;
        }

        $cocok = [];
        foreach (PersonaScoring::PERSONA as $p) {
            $cocok[$p] = $this->skor->cocokWilayah($p, isset($terdekat[$p]) ? (float) $terdekat[$p]['meter'] : null, $w->kualitas_udara);
        }

        return response()->json([
            'jenis_geometri' => 'wilayah',
            'nama' => $w->nama,
            'wilayah' => trim(implode(', ', array_filter([$w->kecamatan ? 'Kec. '.$w->kecamatan : null, $w->kota]))),
            'wilayah_id' => $w->id,
            'geometri' => json_decode($w->geojson),
            'match' => $cocok,
            'jumlah_fasilitas' => $jumlah,
            'terdekat' => $terdekat,
            'kesimpulan' => array_map(fn ($p) => $this->skor->kesimpulanWilayah($p, $cocok[$p]), $persona),
            'data_tidak_lengkap' => $w->kualitas_udara === null,
            'udara' => ['kategori' => $w->kualitas_udara, 'pm25' => $w->pm25 === null ? null : (float) $w->pm25, 'sumber' => 'SatPM 2024 (ACAG)'],
            'penduduk' => $w->penduduk ? ['jumlah' => (int) $w->penduduk, 'kepadatan_per_km2' => (int) $w->kepadatan, 'sumber' => 'Estimasi WorldPop 2025'] : null,
        ]);
    }

    /** Nama fasilitas tanpa awalan jenis (nama gerbang tol di OSM tidak seragam: "Toll Gate X", "Gerbang Tol X", "X"). */
    private function namaFasilitas(string $persona, ?string $nama): string
    {
        $nama = trim((string) $nama);

        return match ($persona) {
            'driver' => trim((string) preg_replace('/^(toll gate|gerbang tol|gt)\s+/i', '', $nama)),
            'commuter' => trim((string) preg_replace('/^stasiun\s+/i', '', $nama)),
            default => $nama,
        };
    }

    private function format(float $meter): string
    {
        return $meter < 1000 ? round($meter / 10) * 10 .' m' : number_format($meter / 1000, 1, ',', '.').' km';
    }
}