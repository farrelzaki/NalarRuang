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
 * Opsi hindari ganjil-genap (T-024): ruas jalan (edge) rute Valhalla yang berada di poligon ganjil-genap PostGIS
 * diberi "palang" (exclude_polygons berupa garis pendek melintang), lalu rute dihitung ulang, beberapa putaran.
 */
class CommuteController extends Controller
{
    private const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
    private const VALHALLA_TRACE = 'https://valhalla1.openstreetmap.de/trace_attributes';
    private const OSRM_MOBIL = 'https://router.project-osrm.org/route/v1/driving';
    private const OSRM_KAKI = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving';
    private const COMMUTE_API = 'https://api.commute.shiorilabs.id';

    /** Asumsi estimasi; ubah setelah OQ-03 (sumber biaya) diputuskan. */
    private const FAKTOR_JAM_SIBUK = 1.4;
    private const HARGA_BBM = 10000;         // Rp per liter, bisa diubah pengguna lewat parameter bbm
    private const KM_PER_LITER = 12;         // konsumsi rata-rata mobil pribadi
    // Perkiraan tarif tol Golongan I, dikalibrasi ke Jagorawi + Tol Dalam Kota (Bogor-Jakarta +-Rp18.500).
    private const TOL_PER_KM = 350;
    private const TOL_MINIMUM = 7000;
    private const KECEPATAN_KAKI = 80;       // m/menit
    private const MAKS_KE_STASIUN = 12000;   // meter, stasiun rel (lebih dari batas jalan kaki: naik ojol)
    private const MAKS_KE_HALTE = 4000;      // meter, halte TransJakarta
    // First/last mile (T-042): jalan kaki bila dekat; bila jauh, ojek online dengan tarif rata-rata dari tim.
    private const MAKS_JALAN_KAKI = 1000;    // meter garis lurus; rute jalan kaki > 1,5 km juga dialihkan ke ojol
    private const MAKS_RUTE_JALAN = 1500;    // meter menurut rute pejalan kaki
    private const TARIF_OJOL = 15000;        // Rp per perjalanan
    private const KECEPATAN_OJOL = 350;      // m/menit (+-21 km/jam di jalan kota)
    private const TUNGGU_OJOL = 4;           // menit menunggu pengemudi
    // Ganjil-genap. Server Valhalla publik membatasi exclude_polygons: total 100 titik sudut, keliling 10 km.
    private const GG_PUTARAN = 5;
    private const GG_MAKS_PALANG = 33;       // x 3 titik sudut per palang
    private const GG_SETENGAH_PALANG = 0.00004; // derajat (+-4,4 m), cukup pendek agar jalan tol di median tidak ikut tertutup
    private const GG_JARAK_PALANG = 500;     // meter antarpalang di sepanjang ruas yang dilewati
    private const GG_MIN_LEWAT = 120;        // meter; lebih pendek dari ini dianggap hanya menyeberang persimpangan/simpang susun
    private const GG_BEBAS_UJUNG = 250;      // meter dari titik A/B tanpa palang (titik di ruas ganjil-genap tetap terjangkau)

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['dari' => 'required|string', 'ke' => 'required|string', 'tol' => 'nullable|in:0,1', 'gg' => 'nullable|in:0,1', 'bbm' => 'nullable|integer|min:5000|max:30000']);
        $lewatTol = $request->query('tol', '1') !== '0';
        $hargaBbm = (int) $request->query('bbm', self::HARGA_BBM);
        $hindariGg = $request->query('gg', '0') === '1';
        $a = $this->koordinat($request->query('dari'));
        $b = $this->koordinat($request->query('ke'));
        if (! $a || ! $b) {
            return response()->json(['message' => 'Format koordinat: lat,lng.'], 422);
        }

        return response()->json([
            'pribadi' => $this->mobil($a, $b, $lewatTol, $hargaBbm, $hindariGg),
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

    private function osrm(string $basis, array $a, array $b, array $tambahan = []): ?array
    {
        $kunci = 'osrm:'.md5($basis.json_encode([$a, $b, $tambahan]));

        return Cache::remember($kunci, now()->addDay(), function () use ($basis, $a, $b, $tambahan) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])
                    ->get("{$basis}/{$a[1]},{$a[0]};{$b[1]},{$b[0]}", ['overview' => 'full', 'geometries' => 'geojson', ...$tambahan]);
                $rute = $r->json('routes.0');

                return $r->ok() && $rute ? $rute : null;
            } catch (Throwable) {
                return null;
            }
        });
    }

    private function mobil(array $a, array $b, bool $lewatTol = true, int $hargaBbm = self::HARGA_BBM, bool $hindariGg = false): ?array
    {
        $r = $this->valhalla($a, $b, $lewatTol) ?? $this->mobilOsrm($a, $b, $lewatTol);
        if (! $r) {
            return null;
        }
        $ruasGg = isset($r['bukan_tol']) ? $this->ruasGanjilGenap($r['bukan_tol']) : [];
        // Simpan rute terbaik: paling pendek menyusuri ruas ganjil-genap, lalu paling cepat.
        $sekarang = $r;
        $palang = [];
        for ($i = 0; $hindariGg && $ruasGg && $i < self::GG_PUTARAN && count($palang) < self::GG_MAKS_PALANG; $i++) {
            $baru = $this->palangGanjilGenap($sekarang['bentuk'], $a, $b);
            if (! $baru) {
                break;
            }
            $palang = array_slice(array_merge($palang, $baru), 0, self::GG_MAKS_PALANG);
            $sekarang = $this->valhalla($a, $b, $lewatTol, $palang);
            if (! $sekarang) {
                break;
            }
            $ruas = $this->ruasGanjilGenap($sekarang['bukan_tol']);
            if ([array_sum($ruas), $sekarang['detik']] < [array_sum($ruasGg), $r['detik']]) {
                [$r, $ruasGg] = [$sekarang, $ruas];
            }
        }
        $km = $r['meter'] / 1000;
        $tol = $r['meter_tol'] > 0 ? (int) max(self::TOL_MINIMUM, round($r['meter_tol'] / 1000 * self::TOL_PER_KM / 500) * 500) : 0;

        $bbm = (int) (round($km / self::KM_PER_LITER * $hargaBbm / 100) * 100);

        return [
            'jarak_km' => round($km, 1),
            'waktu_menit' => (int) round($r['detik'] / 60 * self::FAKTOR_JAM_SIBUK),
            'biaya' => $bbm + $tol,
            'biaya_bbm' => $bbm,
            'biaya_tol' => $tol,
            'lewat_tol' => $lewatTol,
            // ruas: ruas ganjil-genap yang masih dilewati rute (kosong bila berhasil dihindari atau memang tidak lewat).
            'ganjil_genap' => ['hindari' => $hindariGg, 'ruas' => array_keys($ruasGg)],
            'geometri' => $r['geometri'],
        ];
    }

    /**
     * Rute mobil Valhalla: lebih memilih jalan tol seperti pengemudi pada umumnya
     * (OSRM publik cenderung keluar tol lebih awal karena tidak memperhitungkan kemacetan jalan arteri).
     */
    private function valhalla(array $a, array $b, bool $lewatTol = true, array $palang = []): ?array
    {
        return Cache::remember('valhalla:'.md5(json_encode([$a, $b, $lewatTol, $palang])), now()->addDay(), function () use ($a, $b, $lewatTol, $palang) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])->post(self::VALHALLA, array_filter([
                    'locations' => [['lat' => $a[0], 'lon' => $a[1]], ['lat' => $b[0], 'lon' => $b[1]]],
                    'costing' => 'auto',
                    'costing_options' => ['auto' => $lewatTol ? ['use_highways' => 1.0, 'use_tolls' => 1.0] : ['use_tolls' => 0.0]],
                    'exclude_polygons' => $palang,
                    'units' => 'kilometers',
                ]));
                $leg = $r->json('trip.legs.0');
                if (! $r->ok() || ! $leg) {
                    return null;
                }
                $tol = array_sum(array_map(fn ($m) => ! empty($m['toll']) ? $m['length'] : 0, $leg['maneuvers'] ?? []));
                $titik = Polyline::decode($leg['shape']);
                // Potongan rute di luar jalan tol (jalan tol tidak terkena ganjil-genap).
                $bukanTol = [];
                foreach ($leg['maneuvers'] ?? [] as $m) {
                    $awal = $m['begin_shape_index'] ?? 0;
                    $potong = array_slice($titik, $awal, ($m['end_shape_index'] ?? $awal) - $awal + 1);
                    if (empty($m['toll']) && count($potong) > 1) {
                        $bukanTol[] = $potong;
                    }
                }

                return [
                    'meter' => $r->json('trip.summary.length') * 1000,
                    'detik' => $r->json('trip.summary.time'),
                    'meter_tol' => $tol * 1000,
                    'bukan_tol' => $bukanTol,
                    'bentuk' => $leg['shape'],
                    'geometri' => ['type' => 'LineString', 'coordinates' => $titik],
                ];
            } catch (Throwable) {
                return null;
            }
        });
    }

    /**
     * Palang untuk bagian rute yang menyusuri ruas ganjil-genap (>= GG_MIN_LEWAT m berturut-turut, di luar jalan tol,
     * tidak dalam GG_BEBAS_UJUNG m dari A/B): satu palang tiap GG_JARAK_PALANG m, di tengah edge dan tidak di awal
     * bagian itu, sehingga menyeberangi ruas ganjil-genap di persimpangan tetap boleh.
     * Edge diambil dari trace_attributes Valhalla (edge_walk).
     *
     * @return list<list<array{0: float, 1: float}>> cincin exclude_polygons [lng, lat]
     */
    private function palangGanjilGenap(string $bentuk, array $a, array $b): array
    {
        $edge = Cache::remember('valhalla-edge:'.md5($bentuk), now()->addDay(), function () use ($bentuk) {
            try {
                $r = Http::timeout(12)->withHeaders(['User-Agent' => 'NalarRuang/0.1 (proyek mahasiswa IPB)'])->post(self::VALHALLA_TRACE, [
                    'encoded_polyline' => $bentuk,
                    'shape_match' => 'edge_walk',
                    'costing' => 'auto',
                    'filters' => ['attributes' => ['edge.begin_shape_index', 'edge.end_shape_index', 'edge.toll', 'edge.length'], 'action' => 'include'],
                ]);

                return $r->ok() ? $r->json('edges') : null;
            } catch (Throwable) {
                return null;
            }
        });
        if (! $edge) {
            return [];
        }

        $titik = Polyline::decode($bentuk);
        $calon = [];
        foreach ($edge as $e) {
            $i = $e['begin_shape_index'] ?? 0;
            $j = max($i + 1, $e['end_shape_index'] ?? $i);
            if (! isset($titik[$j])) {
                break;
            }
            $k = $i + intdiv($j - $i - 1, 2);
            [$p, $q] = [$titik[$k], $titik[$k + 1]];
            $calon[] = ['m' => ($e['length'] ?? 0) * 1000, 'tol' => ! empty($e['toll']),
                'tengah' => [($p[0] + $q[0]) / 2, ($p[1] + $q[1]) / 2], 'arah' => [$q[0] - $p[0], $q[1] - $p[1]]];
        }
        if (! $calon) {
            return [];
        }

        $daftar = fn (int $sb) => '{'.implode(',', array_map(fn ($c) => $c['tengah'][$sb], $calon)).'}';
        $kena = array_flip(array_column(DB::select(
            "SELECT t.i FROM unnest(?::float8[], ?::float8[]) WITH ORDINALITY AS t(x, y, i)
             WHERE EXISTS (SELECT 1 FROM fitur_peta f WHERE f.layer_id = 'mobilitas' AND f.jenis = 'ganjil_genap'
                             AND ST_Intersects(f.geom, ST_SetSRID(ST_MakePoint(t.x, t.y), 4326)))
               AND NOT ST_DWithin(ST_SetSRID(ST_MakePoint(t.x, t.y), 4326)::geography,
                                  ST_Collect(ST_SetSRID(ST_MakePoint(?, ?), 4326), ST_SetSRID(ST_MakePoint(?, ?), 4326))::geography, ?)",
            [$daftar(0), $daftar(1), $a[1], $a[0], $b[1], $b[0], self::GG_BEBAS_UJUNG],
        ), 'i'));

        // Kelompokkan edge berturut-turut di ruas ganjil-genap, lalu palang hanya kelompok yang cukup panjang.
        $palang = [];
        $kelompok = [];
        $tutup = function () use (&$kelompok, &$palang) {
            if (array_sum(array_column($kelompok, 'm')) >= self::GG_MIN_LEWAT) {
                $jarak = 0.0;
                $terakhir = -INF;
                foreach ($kelompok as $c) {
                    $jarak += $c['m'];
                    if ($jarak - $c['m'] / 2 < self::GG_MIN_LEWAT / 2 || $c['m'] < 15 || $jarak - $terakhir < self::GG_JARAK_PALANG) {
                        continue;
                    }
                    $terakhir = $jarak;
                    $n = hypot(...$c['arah']) ?: 1;
                    $d = [-$c['arah'][1] / $n * self::GG_SETENGAH_PALANG, $c['arah'][0] / $n * self::GG_SETENGAH_PALANG];
                    [$x, $y] = $c['tengah'];
                    $ujung = [round($x - $d[0], 6), round($y - $d[1], 6)];
                    $palang[] = [$ujung, [round($x + $d[0], 6), round($y + $d[1], 6)], $ujung];
                }
            }
            $kelompok = [];
        };
        foreach ($calon as $i => $c) {
            if (! $c['tol'] && isset($kena[$i + 1])) {
                $kelompok[] = $c;
            } else {
                $tutup();
            }
        }
        $tutup();

        return $palang;
    }

    /**
     * Ruas ganjil-genap yang disusuri rute >= GG_MIN_LEWAT m (menyeberang persimpangan tidak dihitung).
     *
     * @param  list<list<array{0: float, 1: float}>>  $garis  potongan rute di luar jalan tol [lng, lat]
     * @return array<string, float> nama ruas => meter yang dilalui
     */
    private function ruasGanjilGenap(array $garis): array
    {
        if (! $garis) {
            return [];
        }

        return array_column(DB::select(
            "WITH r AS (SELECT ST_LineMerge(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)) AS g)
             SELECT f.nama, sum(ST_Length(d.geom::geography)) AS m FROM r
             JOIN fitur_peta f ON f.layer_id = 'mobilitas' AND f.jenis = 'ganjil_genap' AND ST_Intersects(f.geom, r.g)
             CROSS JOIN LATERAL ST_Dump(ST_Intersection(r.g, f.geom)) d
             WHERE GeometryType(d.geom) = 'LINESTRING' AND ST_Length(d.geom::geography) >= ?
             GROUP BY f.nama ORDER BY f.nama",
            [json_encode(['type' => 'MultiLineString', 'coordinates' => $garis]), self::GG_MIN_LEWAT],
        ), 'm', 'nama');
    }

    private function mobilOsrm(array $a, array $b, bool $lewatTol = true): ?array
    {
        $r = $this->osrm(self::OSRM_MOBIL, $a, $b, $lewatTol ? [] : ['exclude' => 'toll']);

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
            // Skor = menit total; ojol diberi tambahan 5 menit per ruas agar jalan kaki/transum tetap diutamakan.
            $skor = $rute['menit'] + $this->menitAkses($sa->meter) + $this->menitAkses($sb->meter);
            if (! $terbaik || $skor < $terbaik[0]) {
                $terbaik = [$skor, $sa, $sb, $rute];
            }
        }
        if (! $terbaik) {
            return null;
        }
        [, $sa, $sb, $rute] = $terbaik;

        $awal = $this->akses($a, [$sa->lat, $sa->lng], $sa->meter, $sa->nama);
        $akhir = $this->akses([$sb->lat, $sb->lng], $b, $sb->meter, 'tujuan');

        $jalanKaki = array_values(array_filter([
            $awal['tipe'] === 'jalan' ? $awal['geometri'] : null,
            $akhir['tipe'] === 'jalan' ? $akhir['geometri'] : null,
        ]));
        foreach ($rute['transfer'] as $t) {
            $jalanKaki[] = ['type' => 'LineString', 'coordinates' => $t];
        }
        $ojol = array_values(array_filter([
            $awal['tipe'] === 'ojol' ? $awal['geometri'] : null,
            $akhir['tipe'] === 'ojol' ? $akhir['geometri'] : null,
        ]));
        $biayaOjol = ($awal['biaya'] ?? 0) + ($akhir['biaya'] ?? 0);
        $sebut = fn ($x) => ($x['tipe'] === 'ojol' ? 'Ojol ' : 'Jalan ').$x['menit'].' mnt';
        $langkah = array_map(fn ($x) => array_diff_key($x, ['geometri' => 1]), [$awal, ...$rute['langkah'], $akhir]);

        return [
            'jarak_km' => round(($awal['meter'] + $rute['meter'] + $akhir['meter']) / 1000, 1),
            'waktu_menit' => $awal['menit'] + $rute['menit'] + $akhir['menit'],
            'biaya' => ($rute['biaya'] ?? 0) + $biayaOjol,
            'biaya_transum' => $rute['biaya'] ?? 0,
            'biaya_ojol' => $biayaOjol,
            'rincian' => implode(' · ', [$sebut($awal), ...$rute['rincian'], $sebut($akhir)]),
            'langkah' => $langkah,
            'stasiun' => array_map(fn ($s) => ['nama' => $s['nama'], 'lat' => $s['lat'], 'lng' => $s['lng']], $rute['stasiun']),
            'geometri' => [
                'jalan_kaki' => $jalanKaki,
                'ojol' => $ojol,
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
        if ($ada = Cache::get('commute:nama-lin')) {
            return $ada;
        }
        try {
            $hasil = [];
            foreach (Http::timeout(12)->get(self::COMMUTE_API.'/operators')->json('data') ?? [] as $op) {
                foreach ($op['lines'] ?? [] as $l) {
                    $hasil["{$op['code']}:{$l['lineCode']}"] = $l['name'];
                }
            }
        } catch (Throwable) {
            $hasil = [];
        }
        // Hasil kosong (API sedang gagal) tidak di-cache, agar label "KRL Bogor" tidak tertahan jadi "KRL B" seharian.
        if ($hasil) {
            Cache::put('commute:nama-lin', $hasil, now()->addDay());
        }

        return $hasil;
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
    /** Perkiraan menit ke/dari stasiun dari jarak garis lurus, untuk memilih pasangan stasiun terbaik. */
    private function menitAkses(float $meter): float
    {
        return $meter <= self::MAKS_JALAN_KAKI
            ? $meter * 1.3 / self::KECEPATAN_KAKI
            : self::TUNGGU_OJOL + $meter * 1.3 / self::KECEPATAN_OJOL + 5;
    }

    /**
     * Ruas first/last mile: jalan kaki (rute OSRM pejalan kaki) bila stasiun <= MAKS_JALAN_KAKI m,
     * selain itu ojol (rute OSRM mobil, tarif TARIF_OJOL).
     *
     * @return array{tipe: string, ke: string, menit: int, meter: int, biaya?: int, geometri: ?array}
     */
    private function akses(array $dari, array $ke, float $lurus, string $tujuan): array
    {
        $kaki = $lurus <= self::MAKS_JALAN_KAKI * 2 ? $this->osrm(self::OSRM_KAKI, $dari, $ke) : null;
        $mKaki = $kaki['distance'] ?? $lurus * 1.3;
        $jalan = ['tipe' => 'jalan', 'ke' => $tujuan, 'menit' => (int) max(1, round($mKaki / self::KECEPATAN_KAKI)), 'meter' => (int) round($mKaki), 'geometri' => $kaki['geometry'] ?? null];
        if ($lurus <= self::MAKS_JALAN_KAKI && $mKaki <= self::MAKS_RUTE_JALAN) {
            return $jalan;
        }
        $r = $this->osrm(self::OSRM_MOBIL, $dari, $ke);
        $m = $r['distance'] ?? $lurus * 1.3;
        $ojol = [
            'tipe' => 'ojol', 'ke' => $tujuan, 'menit' => (int) round(self::TUNGGU_OJOL + $m / self::KECEPATAN_OJOL), 'meter' => (int) round($m),
            'biaya' => self::TARIF_OJOL, 'geometri' => $r['geometry'] ?? ['type' => 'LineString', 'coordinates' => [[$dari[1], $dari[0]], [$ke[1], $ke[0]]]],
        ];

        // Jalan kaki agak jauh (<= 2x batas) tetap dipilih bila ojol tidak lebih cepat (mis. jalan memutar karena satu arah).
        return $kaki && $mKaki <= self::MAKS_RUTE_JALAN * 2 && $jalan['menit'] <= $ojol['menit'] ? $jalan : $ojol;
    }


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
