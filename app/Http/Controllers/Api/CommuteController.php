<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Polyline;
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
 * Mobil: Valhalla (server publik FOSSGIS) dengan preferensi jalan tol, cadangan OSRM (TBD-ROUTE).
 * Umum: jalan kaki ke stasiun/halte terdekat, lalu rute dan tarif resmi antarstasiun dari Commute Data API
 * (KRL, MRT, LRT, TransJakarta; ODbL-1.0), digambar mengikuti rel di PostGIS, lalu jalan kaki ke tujuan.
 */
class CommuteController extends Controller
{
    private const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
    private const OSRM_MOBIL = 'https://router.project-osrm.org/route/v1/driving';
    private const OSRM_KAKI = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
    private const COMMUTE_API = 'https://api.commute.shiorilabs.id';

    /** Asumsi estimasi; ubah setelah OQ-03 (sumber biaya) diputuskan. */
    private const FAKTOR_JAM_SIBUK = 1.4;
    private const BIAYA_PER_KM = 850;        // BBM Rp10.000/l, 12 km/l, dibulatkan
    // Perkiraan tarif tol Golongan I, dikalibrasi ke Jagorawi + Tol Dalam Kota (Bogor-Jakarta +-Rp18.500).
    private const TOL_PER_KM = 350;
    private const TOL_MINIMUM = 7000;
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
        $r = $this->valhalla($a, $b) ?? $this->mobilOsrm($a, $b);
        if (! $r) {
            return null;
        }
        $km = $r['meter'] / 1000;
        $tol = $r['meter_tol'] > 0 ? (int) max(self::TOL_MINIMUM, round($r['meter_tol'] / 1000 * self::TOL_PER_KM / 500) * 500) : 0;

        return [
            'jarak_km' => round($km, 1),
            'waktu_menit' => (int) round($r['detik'] / 60 * self::FAKTOR_JAM_SIBUK),
            'biaya' => (int) (round($km * self::BIAYA_PER_KM / 100) * 100) + $tol,
            'geometri' => $r['geometri'],
        ];
    }

    /**
     * Rute mobil Valhalla: lebih memilih jalan tol seperti pengemudi pada umumnya
     * (OSRM publik cenderung keluar tol lebih awal karena tidak memperhitungkan kemacetan jalan arteri).
     */
    private function valhalla(array $a, array $b): ?array
    {
        return Cache::remember('valhalla:'.md5(json_encode([$a, $b])), now()->addDay(), function () use ($a, $b) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])->post(self::VALHALLA, [
                    'locations' => [['lat' => $a[0], 'lon' => $a[1]], ['lat' => $b[0], 'lon' => $b[1]]],
                    'costing' => 'auto',
                    'costing_options' => ['auto' => ['use_highways' => 1.0, 'use_tolls' => 1.0]],
                    'units' => 'kilometers',
                ]);
                $leg = $r->json('trip.legs.0');
                if (! $r->ok() || ! $leg) {
                    return null;
                }
                $tol = array_sum(array_map(fn ($m) => ! empty($m['toll']) ? $m['length'] : 0, $leg['maneuvers'] ?? []));

                return [
                    'meter' => $r->json('trip.summary.length') * 1000,
                    'detik' => $r->json('trip.summary.time'),
                    'meter_tol' => $tol * 1000,
                    'geometri' => ['type' => 'LineString', 'coordinates' => Polyline::decode($leg['shape'])],
                ];
            } catch (Throwable) {
                return null;
            }
        });
    }

    private function mobilOsrm(array $a, array $b): ?array
    {
        $r = $this->osrm(self::OSRM_MOBIL, $a, $b);

        return $r ? ['meter' => $r['distance'], 'detik' => $r['duration'], 'meter_tol' => 0, 'geometri' => $r['geometry']] : null;
    }

    /**
     * Pilih titik naik/turun terbaik: kombinasi stasiun rel dan halte TransJakarta terdekat di kedua ujung,
     * lalu ambil yang total waktunya (jalan kaki + perjalanan) paling kecil.
     */
    private function transit(array $a, array $b): ?array
    {
        $pasangan = [];
        foreach ($this->kandidat($a) as $sa) {
            foreach ($this->kandidat($b) as $sb) {
                if ($sa->kode !== $sb->kode) {
                    $pasangan[] = [$sa, $sb];
                }
            }
        }
        $semuaTarif = $this->tarifSekaligus(array_map(fn ($x) => [$x[0]->kode, $x[1]->kode], $pasangan));

        $terbaik = null;
        foreach ($pasangan as $i => [$sa, $sb]) {
            if (! ($tarif = $semuaTarif[$i])) {
                continue;
            }
            $rute = (new RuteTransit())->rakit($tarif, $this->koordinatStasiun(), $this->namaLin(), function (string $jenis, array $p, array $q) {
                return $this->grafRel($jenis)->jalur($p, $q)['koordinat'] ?? null;
            });
            if (! $rute) {
                continue;
            }
            $skor = $rute['menit'] + ($sa->meter + $sb->meter) * 1.3 / self::KECEPATAN_KAKI;
            if (! $terbaik || $skor < $terbaik[0]) {
                $terbaik = [$skor, $sa, $sb, $rute];
            }
        }
        if (! $terbaik) {
            return null;
        }
        [, $sa, $sb, $rute] = $terbaik;

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

    /**
     * Rute dan tarif antarstasiun (Commute Data API) untuk beberapa pasangan sekaligus.
     * Yang belum ada di cache diminta paralel; hasil di-cache sehari.
     *
     * @param  list<array{0: string, 1: string}>  $pasangan
     * @return list<?array>
     */
    private function tarifSekaligus(array $pasangan): array
    {
        $kunci = array_map(fn ($p) => "commute:tarif:{$p[0]}:{$p[1]}", $pasangan);
        $hasil = array_map(fn ($k) => Cache::get($k), $kunci);
        $kurang = array_keys(array_filter($hasil, fn ($h) => $h === null));
        if ($kurang) {
            try {
                $jawab = Http::pool(fn ($pool) => array_map(
                    fn ($i) => $pool->as((string) $i)->timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])
                        ->get(self::COMMUTE_API."/fares/{$pasangan[$i][0]}/{$pasangan[$i][1]}"),
                    $kurang,
                ));
                foreach ($kurang as $i) {
                    $r = $jawab[(string) $i] ?? null;
                    if ($r instanceof \Illuminate\Http\Client\Response && $r->ok() && $r->json('data')) {
                        $hasil[$i] = $r->json('data');
                        Cache::put($kunci[$i], $hasil[$i], now()->addDay());
                    }
                }
            } catch (Throwable) {
                // Tanpa tarif, pasangan itu dilewati.
            }
        }

        return $hasil;
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

    /** Graf jalur per jenis (krl, mrt, lrt, atau koridor TransJakarta "tj:13B") dari PostGIS, disimpan di cache. */
    private function grafRel(string $jenis): RailGraph
    {
        static $graf = [];
        if (! isset($graf[$jenis])) {
            [$sql, $ikat] = str_starts_with($jenis, 'tj:')
                ? ["layer_id = 'jaringan_tj' AND atribut->>'koridor' = ?", [substr($jenis, 3)]]
                : ['jenis = ?', [$jenis]];
            $garis = Cache::remember("commute:rel:{$jenis}", now()->addDay(), fn () => array_map(
                fn ($b) => json_decode($b->geojson, true)['coordinates'],
                DB::select("SELECT ST_AsGeoJSON(geom, 6) AS geojson FROM fitur_peta WHERE {$sql} AND GeometryType(geom) = 'LINESTRING'", $ikat),
            ));
            $graf[$jenis] = new RailGraph($garis);
        }

        return $graf[$jenis];
    }

    /** Calon titik naik/turun: stasiun rel terdekat (maks. 3 km) dan halte TransJakarta terdekat (maks. 1,5 km). */
    private function kandidat(array $p): array
    {
        $pilihan = [
            ["jenis = 'stasiun'", self::MAKS_KE_STASIUN],
            ["jenis = 'halte' AND atribut->>'moda' = 'transjakarta'", self::MAKS_KE_HALTE],
        ];
        $hasil = [];
        foreach ($pilihan as [$syarat, $maks]) {
            $s = DB::selectOne(
                "SELECT atribut->>'kode' AS kode, nama, ST_Y(geom) AS lat, ST_X(geom) AS lng,
                        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS meter
                 FROM fitur_peta WHERE {$syarat} AND atribut->>'kode' IS NOT NULL
                 ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326) LIMIT 1",
                [$p[1], $p[0], $p[1], $p[0]],
            );
            if ($s && $s->meter <= $maks) {
                $hasil[] = $s;
            }
        }

        return $hasil;
    }
}
