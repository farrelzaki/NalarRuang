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
        $hasil = $q !== '' ? $this->parser->parse($q) : ['persona' => [], 'kota' => [], 'hindari_banjir' => false, 'nama_wilayah' => null];

        $kota = array_values(array_filter(array_merge($hasil['kota'], (array) $request->query('kota', []))));
        $persona = $hasil['persona'] ?: array_values(array_intersect((array) $request->query('persona', []), PersonaScoring::PERSONA));
        if (! $persona) {
            $persona = ['commuter'];
        }

        $syarat = [];
        $nilai = [];
        if ($kota) {
            $syarat[] = '('.implode(' OR ', array_fill(0, count($kota), 'kota ILIKE ?')).')';
            $nilai = array_map(fn ($k) => '%'.$k.'%', $kota);
        }

        // FR-05: nama kelurahan/kecamatan di kalimat -> kandidat dibatasi ke wilayah itu dan sekitarnya (2 km).
        $cocokNama = $this->wilayahBernama($hasil['nama_wilayah'] ?? null);
        if ($cocokNama) {
            $syarat[] = 'ST_DWithin(geom::geography, (SELECT ST_Union(geom) FROM wilayah WHERE id IN ('.implode(',', $cocokNama).'))::geography, 2000)';
        }
        $syaratKota = $syarat ? 'WHERE '.implode(' AND ', $syarat) : '';

        // Metrik dihitung sekali oleh DemoPetaSeeder (atribut wilayah); di sini cukup dibaca.
        $baris = DB::select("
            SELECT id, nama, kecamatan, kota, tipe_kawasan, kualitas_udara,
                   (atribut->>'pusat_lat')::float AS lat, (atribut->>'pusat_lng')::float AS lng,
                   (atribut->>'d_commuter')::float AS d_commuter, (atribut->>'d_driver')::float AS d_driver,
                   (atribut->>'d_social')::float AS d_social, (atribut->>'n_poi')::int AS n_poi,
                   (atribut->>'d_rth')::float AS d_rth, (atribut->>'porsi_banjir')::float AS porsi_banjir
            FROM wilayah {$syaratKota}
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
            $disebut = in_array($b->id, $cocokNama, true);
            $peringkat[] = ['b' => $b, 'match' => max(5, min(97, (int) round(35 + $match * 0.65))), 'skor' => $match, 'banjir' => $banjir, 'disebut' => $disebut];
        }

        // Wilayah yang namanya disebut selalu di depan, lalu tetangganya menurut skor.
        usort($peringkat, fn ($a, $b) => [$b['disebut'], $b['skor']] <=> [$a['disebut'], $a['skor']]);
        $teratas = array_slice($peringkat, 0, 3);
        $geometri = [];
        if ($teratas) {
            foreach (DB::select('SELECT id, ST_AsGeoJSON(geom, 6) AS geojson FROM wilayah WHERE id IN ('.implode(',', array_map(fn ($r) => (int) $r['b']->id, $teratas)).')') as $g) {
                $geometri[$g->id] = json_decode($g->geojson);
            }
        }

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
                'geometri' => $geometri[$r['b']->id] ?? null,
                'alasan' => $this->alasan($r['b']),
            ], $teratas),
        ]);
    }

    /**
     * id wilayah yang nama kelurahan atau kecamatannya cocok dengan frasa (utuh dulu, lalu per kata >= 4 huruf).
     *
     * @return list<int>
     */
    private function wilayahBernama(?string $frasa): array
    {
        if (! $frasa) {
            return [];
        }
        foreach ([[$frasa], array_filter(explode(' ', $frasa), fn ($w) => mb_strlen($w) >= 4)] as $calon) {
            foreach ($calon as $c) {
                $id = array_map(fn ($r) => (int) $r->id, DB::select(
                    'SELECT id FROM wilayah WHERE nama ILIKE ? OR kecamatan ILIKE ? LIMIT 60',
                    ['%'.$c.'%', '%'.$c.'%'],
                ));
                if ($id) {
                    return $id;
                }
            }
        }

        return [];
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
