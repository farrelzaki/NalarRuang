<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RailGraph;
use App\Services\RuteTransit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * GET /api/commute (FR-10, FR-11). Estimasi tanpa lalu lintas real-time (SRS BR 14).
 * Mobil: OSRM (TBD-ROUTE, sementara memakai server demo publik).
 * Umum: jalan kaki ke stasiun/halte terdekat, lalu rute dan tarif resmi antarstasiun dari Commute Data API
 * (KRL, MRT, LRT, TransJakarta; ODbL-1.0), digambar mengikuti rel di PostGIS, lalu jalan kaki ke tujuan.
 */
class CommuteController extends Controller
{
    private const OSRM_MOBIL = 'https://router.project-osrm.org/route/v1/driving';
    private const OSRM_KAKI = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
    private const COMMUTE_API = 'https://api.commute.shiorilabs.id';

    /** Asumsi estimasi; ubah setelah OQ-03 (sumber biaya) diputuskan. */
    private const FAKTOR_JAM_SIBUK = 1.4;
    private const BIAYA_PER_KM = 850;        // BBM Rp10.000/l, 12 km/l, dibulatkan
    private const KECEPATAN_KAKI = 80;       // m/menit
    private const MAKS_KE_STASIUN = 3000;    // meter, stasiun rel
    private const MAKS_KE_HALTE = 1500;      // meter, halte TransJakarta bila tidak ada stasiun

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
        if (! $sa || ! $sb || $sa->kode === $sb->kode) {
            return null;
        }

        $tarif = $this->tarif($sa->kode, $sb->kode);
        if (! $tarif) {
            return null;
        }
        $rute = (new RuteTransit())->rakit($tarif, $this->koordinatStasiun(), $this->namaLin(), function (string $jenis, array $p, array $q) {
            return $this->grafRel($jenis)->jalur($p, $q)['koordinat'] ?? null;
        });
        if (! $rute) {
            return null;
        }

        $kaki1 = $this->osrm(self::OSRM_KAKI, $a, [$sa->lat, $sa->lng]);
        $kaki2 = $this->osrm(self::OSRM_KAKI, [$sb->lat, $sb->lng], $b);
        $m1 = $kaki1['distance'] ?? $sa->meter * 1.3;
        $m2 = $kaki2['distance'] ?? $sb->meter * 1.3;
        $t1 = (int) round($m1 / self::KECEPATAN_KAKI);
        $t2 = (int) round($m2 / self::KECEPATAN_KAKI);

        $jalanKaki = array_values(array_filter([$kaki1['geometry'] ?? null, $kaki2['geometry'] ?? null]));
        foreach ($rute['transfer'] as $t) {
            $jalanKaki[] = ['type' => 'LineString', 'coordinates' => $t];
        }

        return [
            'jarak_km' => round(($m1 + $rute['meter'] + $m2) / 1000, 1),
            'waktu_menit' => $t1 + $rute['menit'] + $t2,
            'biaya' => $rute['biaya'] ?? 0,
            'rincian' => implode(' · ', ["Jalan {$t1} mnt", ...$rute['rincian'], "Jalan {$t2} mnt"]),
            'stasiun' => array_map(fn ($s) => ['nama' => $s['nama'], 'lat' => $s['lat'], 'lng' => $s['lng']], $rute['stasiun']),
            'geometri' => [
                'jalan_kaki' => $jalanKaki,
                'rel' => ['type' => 'MultiLineString', 'coordinates' => $rute['garis']],
            ],
        ];
    }

    /** Rute dan tarif antarstasiun (Commute Data API), di-cache sehari. */
    private function tarif(string $dari, string $ke): ?array
    {
        return Cache::remember("commute:tarif:{$dari}:{$ke}", now()->addDay(), function () use ($dari, $ke) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])->get(self::COMMUTE_API."/fares/{$dari}/{$ke}");

                return $r->ok() ? $r->json('data') : null;
            } catch (Throwable) {
                return null;
            }
        });
    }

    /** Kunci lin "OPERATOR:KODE" -> nama lin, dari /operators. */
    private function namaLin(): array
    {
        return Cache::remember('commute:nama-lin', now()->addDay(), function () {
            try {
                $hasil = [];
                foreach (Http::timeout(12)->get(self::COMMUTE_API.'/operators')->json('data') ?? [] as $op) {
                    foreach ($op['lines'] ?? [] as $l) {
                        $hasil["{$op['code']}:{$l['lineCode']}"] = $l['name'];
                    }
                }

                return $hasil;
            } catch (Throwable) {
                return [];
            }
        });
    }

    /** id stasiun/halte Commute Data API -> [lng, lat], dari layer mobilitas. */
    private function koordinatStasiun(): array
    {
        return Cache::rememberForever('commute:koordinat-stasiun', function () {
            $hasil = [];
            foreach (DB::select("SELECT atribut->>'kode' AS kode, ST_X(geom) AS lng, ST_Y(geom) AS lat FROM fitur_peta
                                 WHERE jenis IN ('stasiun', 'halte') AND atribut->>'kode' IS NOT NULL") as $s) {
                $hasil[$s->kode] = [(float) $s->lng, (float) $s->lat];
            }

            return $hasil;
        });
    }

    /** Graf rel per jenis (krl, mrt, lrt) dari PostGIS, disimpan di cache agar tidak dibangun tiap permintaan. */
    private function grafRel(string $jenis): RailGraph
    {
        static $graf = [];
        if (! isset($graf[$jenis])) {
            $garis = Cache::rememberForever("commute:rel:{$jenis}", fn () => array_map(
                fn ($b) => json_decode($b->geojson, true)['coordinates'],
                DB::select("SELECT ST_AsGeoJSON(geom, 6) AS geojson FROM fitur_peta WHERE jenis = ? AND GeometryType(geom) = 'LINESTRING'", [$jenis]),
            ));
            $graf[$jenis] = new RailGraph($garis);
        }

        return $graf[$jenis];
    }

    /** Stasiun rel terdekat (maks. 3 km); bila tidak ada, halte TransJakarta terdekat (maks. 1,5 km). */
    private function stasiunTerdekat(array $p): ?object
    {
        $pilihan = [
            ["jenis = 'stasiun'", self::MAKS_KE_STASIUN],
            ["jenis = 'halte' AND atribut->>'moda' = 'transjakarta'", self::MAKS_KE_HALTE],
        ];
        foreach ($pilihan as [$syarat, $maks]) {
            $s = DB::selectOne(
                "SELECT atribut->>'kode' AS kode, nama, ST_Y(geom) AS lat, ST_X(geom) AS lng,
                        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
                 FROM fitur_peta WHERE {$syarat} AND atribut->>'kode' IS NOT NULL
                 ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326) LIMIT 1",
                [$p[1], $p[0], $p[1], $p[0]],
            );
            if ($s && $s->meter <= $maks) {
                return $s;
            }
        }

        return null;
    }
}
