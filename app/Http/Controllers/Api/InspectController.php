<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PersonaScoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/inspect (FR-08, FR-09, FR-17). Titik: bintang; wilayah: centang (SRS v1.2 BR 10).
 */
class InspectController extends Controller
{
    /** Fasilitas utama tiap persona: jenis di tabel fitur_peta. */
    public const FASILITAS = [
        'commuter' => ['stasiun'],
        'driver' => ['tol'],
        'social_vibe' => ['poi'],
        'zen' => ['rth'],
    ];

    public function __construct(private PersonaScoring $skor)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $persona = array_values(array_intersect((array) $request->query('persona', []), PersonaScoring::PERSONA));

        if ($request->filled('wilayah_id')) {
            return $this->wilayah((int) $request->query('wilayah_id'), $persona);
        }

        $request->validate(['lat' => 'required|numeric|between:-90,90', 'lng' => 'required|numeric|between:-180,180']);

        return $this->titik((float) $request->query('lat'), (float) $request->query('lng'), $persona);
    }

    private function titik(float $lat, float $lng, array $persona): JsonResponse
    {
        $titik = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)';
        $wilayah = DB::selectOne("SELECT id, nama, kecamatan, kota, kualitas_udara FROM wilayah WHERE ST_Contains(geom, {$titik}) LIMIT 1", [$lng, $lat]);

        $jarak = [];
        $terdekat = [];
        foreach (self::FASILITAS as $p => $jenis) {
            $baris = $this->terdekat($jenis, $lat, $lng);
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
            "SELECT atribut->>'kelas' AS kelas FROM fitur_peta WHERE layer_id = 'historis_risiko' AND ST_Contains(geom, {$titik})
             ORDER BY CASE atribut->>'kelas' WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 ELSE 2 END LIMIT 1",
            [$lng, $lat],
        );

        $permukiman = DB::selectOne(
            "SELECT nama FROM fitur_peta WHERE jenis = 'legal' AND nama IS NOT NULL
             AND ST_DWithin(geom::geography, {$titik}::geography, 400)
             ORDER BY geom <-> {$titik} LIMIT 1",
            [$lng, $lat, $lng, $lat],
        );

        $ringkasan = [];
        if ($terdekat['commuter']) {
            $ringkasan[] = ['jenis' => 'stasiun', 'teks' => 'Stasiun '.($terdekat['commuter']->nama ?: '').' '.$this->format($terdekat['commuter']->meter)];
        }
        if ($terdekat['social_vibe']) {
            $ringkasan[] = ['jenis' => 'hijau', 'teks' => 'Kafe atau restoran terdekat '.$this->format($terdekat['social_vibe']->meter)];
        }
        $ringkasan[] = $banjir
            ? ['jenis' => 'banjir', 'teks' => 'Area bahaya banjir kelas '.$banjir->kelas.' (InaRISK)']
            : ['jenis' => 'banjir', 'teks' => 'Di luar area bahaya banjir InaRISK'];

        return response()->json([
            'jenis_geometri' => 'titik',
            'nama' => $permukiman->nama ?? ($wilayah ? 'Kel. '.$wilayah->nama : 'Titik terpilih'),
            'wilayah' => $wilayah ? trim(implode(', ', array_filter([$wilayah->kecamatan ? 'Kec. '.$wilayah->kecamatan : null, $wilayah->kota]))) : 'Di luar area data contoh',
            'wilayah_id' => $wilayah?->id,
            'lat' => $lat,
            'lng' => $lng,
            'stars' => $skor,
            'jarak_meter' => array_map(fn ($m) => $m === null ? null : (int) round($m), $jarak),
            'ringkasan_layer' => $ringkasan,
            'kesimpulan' => array_values(array_filter(array_map(
                fn ($p) => $skor[$p] === null ? null : $this->skor->kesimpulanTitik($p, $skor[$p]),
                $persona,
            ))),
            'data_tidak_lengkap' => in_array(null, $skor, true),
        ]);
    }

    private function wilayah(int $id, array $persona): JsonResponse
    {
        $w = DB::selectOne('SELECT id, nama, kecamatan, kota, tipe_kawasan, kualitas_udara, ST_AsGeoJSON(geom, 6) AS geojson FROM wilayah WHERE id = ?', [$id]);
        if (! $w) {
            return response()->json(['message' => 'Wilayah tidak ditemukan.'], 404);
        }

        $jumlah = [];
        foreach (self::FASILITAS as $p => $jenis) {
            $tanda = implode(',', array_fill(0, count($jenis), '?'));
            $jumlah[$p] = (int) DB::selectOne(
                "SELECT count(*) AS n FROM fitur_peta f JOIN wilayah w ON w.id = ? WHERE f.jenis IN ({$tanda}) AND ST_Intersects(f.geom, w.geom)",
                [$id, ...$jenis],
            )->n;
        }

        $cocok = [];
        foreach (PersonaScoring::PERSONA as $p) {
            $cocok[$p] = $this->skor->cocokWilayah($p, $jumlah[$p], $w->kualitas_udara);
        }

        return response()->json([
            'jenis_geometri' => 'wilayah',
            'nama' => $w->nama,
            'wilayah' => trim(implode(', ', array_filter([$w->kecamatan ? 'Kec. '.$w->kecamatan : null, $w->kota]))),
            'wilayah_id' => $w->id,
            'geometri' => json_decode($w->geojson),
            'match' => $cocok,
            'jumlah_fasilitas' => $jumlah,
            'kesimpulan' => array_map(fn ($p) => $this->skor->kesimpulanWilayah($p, $cocok[$p]), $persona),
            'data_tidak_lengkap' => $w->kualitas_udara === null,
        ]);
    }

    private function terdekat(array $jenis, float $lat, float $lng): ?object
    {
        $tanda = implode(',', array_fill(0, count($jenis), '?'));

        return DB::selectOne(
            "SELECT nama, ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
             FROM fitur_peta WHERE jenis IN ({$tanda})
             ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326) LIMIT 1",
            [$lng, $lat, ...$jenis, $lng, $lat],
        );
    }

    private function format(float $meter): string
    {
        return $meter < 1000 ? round($meter / 10) * 10 .' m' : number_format($meter / 1000, 1, ',', '.').' km';
    }
}
