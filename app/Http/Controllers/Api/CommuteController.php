<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RailGraph;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * GET /api/commute (FR-10, FR-11). Estimasi tanpa lalu lintas real-time (SRS BR 14).
 * Mobil: OSRM (TBD-ROUTE, sementara memakai server demo publik). Transit: jalan kaki ke stasiun KRL terdekat,
 * ruas rel dari PostGIS, jalan kaki ke tujuan.
 */
class CommuteController extends Controller
{
    private const OSRM_MOBIL = 'https://router.project-osrm.org/route/v1/driving';
    private const OSRM_KAKI = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

    /** Asumsi estimasi; ubah setelah OQ-03 (sumber biaya) diputuskan. */
    private const FAKTOR_JAM_SIBUK = 1.4;
    private const BIAYA_PER_KM = 850;        // BBM Rp10.000/l, 12 km/l, dibulatkan
    private const KRL_DASAR = 3000;          // 25 km pertama
    private const KRL_PER_10KM = 1000;
    private const KECEPATAN_KRL = 650;       // m/menit rata-rata termasuk berhenti
    private const KECEPATAN_KAKI = 80;       // m/menit
    private const MAKS_JALAN_KAKI = 3000;    // meter ke stasiun

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['dari' => 'required|string', 'ke' => 'required|string']);
        $a = $this->koordinat($request->query('dari'));
        $b = $this->koordinat($request->query('ke'));
        if (! $a || ! $b) {
            return response()->json(['message' => 'Format koordinat: lat,lng.'], 422);
        }

        return response()->json([
            'pribadi' => $this->mobil($a, $b),
            'publik' => $this->transit($a, $b),
            'catatan' => 'Estimasi tanpa lalu lintas real-time.',
        ]);
    }

    private function koordinat(string $teks): ?array
    {
        $p = array_map('trim', explode(',', $teks));
        if (count($p) !== 2 || ! is_numeric($p[0]) || ! is_numeric($p[1])) {
            return null;
        }

        return [(float) $p[0], (float) $p[1]];
    }

    private function osrm(string $basis, array $a, array $b): ?array
    {
        $kunci = 'osrm:'.md5($basis.json_encode([$a, $b]));

        return Cache::remember($kunci, now()->addDay(), function () use ($basis, $a, $b) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])
                    ->get("{$basis}/{$a[1]},{$a[0]};{$b[1]},{$b[0]}", ['overview' => 'full', 'geometries' => 'geojson']);
                $rute = $r->json('routes.0');

                return $r->ok() && $rute ? $rute : null;
            } catch (Throwable) {
                return null;
            }
        });
    }

    private function mobil(array $a, array $b): ?array
    {
        $r = $this->osrm(self::OSRM_MOBIL, $a, $b);
        if (! $r) {
            return null;
        }
        $km = $r['distance'] / 1000;

        return [
            'jarak_km' => round($km, 1),
            'waktu_menit' => (int) round($r['duration'] / 60 * self::FAKTOR_JAM_SIBUK),
            'biaya' => (int) (round($km * self::BIAYA_PER_KM / 100) * 100),
            'geometri' => $r['geometry'],
        ];
    }

    private function transit(array $a, array $b): ?array
    {
        $sa = $this->stasiunTerdekat($a);
        $sb = $this->stasiunTerdekat($b);
        if (! $sa || ! $sb || $sa->id === $sb->id || $sa->meter > self::MAKS_JALAN_KAKI || $sb->meter > self::MAKS_JALAN_KAKI) {
            return null;
        }

        $rel = $this->grafRel()->jalur([$sa->lng, $sa->lat], [$sb->lng, $sb->lat]);
        if (! $rel || $rel['meter'] < 300) {
            return null;
        }
        $rel = (object) ['meter' => $rel['meter'], 'geojson' => json_encode(['type' => 'LineString', 'coordinates' => $rel['koordinat']])];

        $kaki1 = $this->osrm(self::OSRM_KAKI, $a, [$sa->lat, $sa->lng]);
        $kaki2 = $this->osrm(self::OSRM_KAKI, [$sb->lat, $sb->lng], $b);
        $m1 = $kaki1['distance'] ?? $sa->meter * 1.3;
        $m2 = $kaki2['distance'] ?? $sb->meter * 1.3;

        $t1 = (int) round($m1 / self::KECEPATAN_KAKI);
        $tk = (int) round($rel->meter / self::KECEPATAN_KRL) + 5;
        $t2 = (int) round($m2 / self::KECEPATAN_KAKI);
        $km = $rel->meter / 1000;

        return [
            'jarak_km' => round(($m1 + $rel->meter + $m2) / 1000, 1),
            'waktu_menit' => $t1 + $tk + $t2,
            'biaya' => self::KRL_DASAR + (int) max(0, ceil(($km - 25) / 10)) * self::KRL_PER_10KM,
            'rincian' => "Jalan {$t1} mnt · KRL {$tk} mnt · Jalan {$t2} mnt",
            'stasiun' => [['nama' => $sa->nama, 'lat' => $sa->lat, 'lng' => $sa->lng], ['nama' => $sb->nama, 'lat' => $sb->lat, 'lng' => $sb->lng]],
            'geometri' => [
                'jalan_kaki' => array_values(array_filter([$kaki1['geometry'] ?? null, $kaki2['geometry'] ?? null])),
                'rel' => json_decode($rel->geojson),
            ],
        ];
    }

    /** Graf rel KRL dari PostGIS, disimpan di cache agar tidak dibangun tiap permintaan. */
    private function grafRel(): RailGraph
    {
        $garis = Cache::rememberForever('commute:rel-krl', function () {
            return array_map(
                fn ($b) => json_decode($b->geojson, true)['coordinates'],
                DB::select("SELECT ST_AsGeoJSON(geom, 6) AS geojson FROM fitur_peta WHERE jenis = 'krl' AND GeometryType(geom) = 'LINESTRING'"),
            );
        });

        return new RailGraph($garis);
    }

    private function stasiunTerdekat(array $p): ?object
    {
        return DB::selectOne(
            "SELECT id, nama, ST_Y(geom) AS lat, ST_X(geom) AS lng,
                    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
             FROM fitur_peta WHERE jenis = 'stasiun' AND atribut->>'moda' = 'krl'
             ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326) LIMIT 1",
            [$p[1], $p[0], $p[1], $p[0]],
        );
    }
}
