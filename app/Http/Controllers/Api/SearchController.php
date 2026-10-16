<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PersonaScoring;
use App\Services\QueryParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/search (FR-05, FR-06, FR-15). Tepat tiga rekomendasi wilayah (BR 1).
 * Persen kecocokan = rata-rata skor persona yang diminta (0–3 → 0–100), dikurangi porsi banjir bila diminta.
 */
class SearchController extends Controller
{
    public function __construct(private QueryParser $parser, private PersonaScoring $skor)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $hasil = $q !== '' ? $this->parser->parse($q) : ['persona' => [], 'kota' => [], 'hindari_banjir' => false];

        $kota = array_values(array_filter(array_merge($hasil['kota'], (array) $request->query('kota', []))));
        $persona = $hasil['persona'] ?: array_values(array_intersect((array) $request->query('persona', []), PersonaScoring::PERSONA));
        if (! $persona) {
            $persona = ['commuter'];
        }

        $syaratKota = '';
        $nilai = [];
        if ($kota) {
            $syaratKota = 'WHERE ('.implode(' OR ', array_fill(0, count($kota), 'kota ILIKE ?')).')';
            $nilai = array_map(fn ($k) => '%'.$k.'%', $kota);
        }

        $baris = DB::select("
            WITH w AS (
                SELECT id, nama, kecamatan, kota, tipe_kawasan, kualitas_udara, geom,
                       ST_PointOnSurface(geom) AS c, ST_Area(geom::geography) AS luas
                FROM wilayah {$syaratKota}
            )
            SELECT w.id, w.nama, w.kecamatan, w.kota, w.tipe_kawasan, w.kualitas_udara,
                   ST_Y(w.c) AS lat, ST_X(w.c) AS lng,
                   ST_AsGeoJSON(w.geom, 6) AS geojson,
                   (SELECT ST_Distance(f.geom::geography, w.c::geography) FROM fitur_peta f WHERE f.jenis = 'stasiun' ORDER BY f.geom <-> w.c LIMIT 1) AS d_commuter,
                   (SELECT ST_Distance(f.geom::geography, w.c::geography) FROM fitur_peta f WHERE f.jenis = 'tol' ORDER BY f.geom <-> w.c LIMIT 1) AS d_driver,
                   (SELECT ST_Distance(f.geom::geography, w.c::geography) FROM fitur_peta f WHERE f.jenis = 'poi' ORDER BY f.geom <-> w.c LIMIT 1) AS d_social,
                   (SELECT count(*) FROM fitur_peta f WHERE f.jenis = 'poi' AND ST_Intersects(f.geom, w.geom)) AS n_poi,
                   (SELECT ST_Distance(f.geom::geography, w.c::geography) FROM fitur_peta f WHERE f.jenis = 'rth' ORDER BY f.geom <-> w.c LIMIT 1) AS d_rth,
                   (SELECT coalesce(sum(ST_Area(ST_Intersection(f.geom, w.geom)::geography)), 0) FROM fitur_peta f
                     WHERE f.layer_id = 'historis_risiko' AND f.atribut->>'kelas' IN ('sedang','tinggi') AND ST_Intersects(f.geom, w.geom)) / nullif(w.luas, 0) AS porsi_banjir
            FROM w
        ", $nilai);

        $peringkat = [];
        foreach ($baris as $b) {
            // Skor halus 0–1 per persona agar peringkat tidak seri; ambang bintang tetap dipakai di Detail Lokasi.
            $dekat = fn (?float $m, float $jauh = 5000) => $m === null ? 0.0 : max(0.0, 1 - $m / $jauh);
            $udara = PersonaScoring::UDARA[$b->kualitas_udara] ?? 1;
            $s = [
                'commuter' => $dekat($b->d_commuter),
                'driver' => $dekat($b->d_driver, 9000),
                'social_vibe' => 0.5 * $dekat($b->d_social, 3000) + 0.5 * min(1, $b->n_poi / 10),
                'zen' => 0.6 * ($udara / 3) + 0.4 * $dekat($b->d_rth, 3000),
            ];
            $match = array_sum(array_map(fn ($p) => $s[$p], $persona)) / count($persona) * 100;
            $banjir = (float) ($b->porsi_banjir ?? 0);
            $match -= $banjir * ($hasil['hindari_banjir'] ? 70 : 20);
            $peringkat[] = ['b' => $b, 'match' => max(5, min(97, (int) round(35 + $match * 0.65))), 'skor' => $match, 'banjir' => $banjir];
        }

        usort($peringkat, fn ($a, $b) => $b['skor'] <=> $a['skor']);
        $teratas = array_slice($peringkat, 0, 3);

        if (count($teratas) < 3) {
            return response()->json(['message' => 'Belum ada kawasan yang cocok', 'hasil' => [], 'persona' => $persona]);
        }

        return response()->json([
            'persona' => $persona,
            'hindari_banjir' => $hasil['hindari_banjir'],
            'hasil' => array_map(fn ($r) => [
                'wilayah_id' => $r['b']->id,
                'nama' => $r['b']->nama,
                'tipe_kawasan' => $r['b']->tipe_kawasan ?? 'Permukiman',
                'kota' => $r['b']->kota,
                'match' => $r['match'],
                'pusat' => ['lat' => (float) $r['b']->lat, 'lng' => (float) $r['b']->lng],
                'geometri' => json_decode($r['b']->geojson),
                'alasan' => $this->alasan($r['b']),
            ], $teratas),
        ]);
    }

    private function alasan(object $b): string
    {
        $bagian = [];
        if ($b->d_commuter !== null && $b->d_commuter <= 1500) {
            $bagian[] = 'stasiun '.number_format($b->d_commuter / 1000, 1, ',', '.').' km';
        }
        if ($b->n_poi > 0) {
            $bagian[] = $b->n_poi.' kafe/restoran';
        }
        if (($b->porsi_banjir ?? 0) < 0.05) {
            $bagian[] = 'minim area banjir';
        }

        return $bagian ? ucfirst(implode(', ', $bagian)).'.' : 'Permukiman di area data contoh.';
    }
}
