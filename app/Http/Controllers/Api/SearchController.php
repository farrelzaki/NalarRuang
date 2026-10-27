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
        $kosong = ['persona' => [], 'kota' => [], 'hindari_banjir' => false, 'nama_wilayah' => null, 'urutkan' => null, 'luar_cakupan' => false, 'persona_dibalik' => []];
        $hasil = $q !== '' ? $this->parser->parse($q) : $kosong;

        $kota = array_values(array_filter(array_merge($hasil['kota'], (array) $request->query('kota', []))));
        $personaSesi = array_values(array_intersect((array) $request->query('persona', []), PersonaScoring::PERSONA));
        $persona = $hasil['persona'] ?: array_values(array_diff($personaSesi, $hasil['persona_dibalik']));
        if (! $persona) {
            $persona = $hasil['urutkan'] === 'jauh_dari_tol' ? ['zen'] : ['commuter'];
        }

        if ($hasil['luar_cakupan'] && ! $kota) {
            return response()->json(['message' => QueryParser::pesan('luar_cakupan'), 'hasil' => [], 'persona' => $persona]);
        }

        // FR-05: nama kelurahan/kecamatan di kalimat -> kandidat dibatasi ke wilayah itu dan sekitarnya (2 km).
        [$cocokNama, $persis] = $this->wilayahBernama($hasil['nama_wilayah'] ?? null);

        // Kalimat yang tidak berisi kebutuhan, kota, banjir, maupun nama wilayah yang dikenal: jangan menebak.
        $dipahami = $hasil['persona'] || $hasil['persona_dibalik'] || $hasil['kota'] || $hasil['hindari_banjir'] || $cocokNama || $hasil['urutkan'];
        if ($q !== '' && ! $dipahami) {
            return response()->json(['message' => QueryParser::pesan('tidak_dipahami'), 'hasil' => [], 'persona' => $persona]);
        }

        $syarat = [];
        $nilai = [];
        if ($kota) {
            // Nama umum ("bogor") mencakup kota dan kabupaten; nama lengkap ("kota tangerang") harus persis.
            $syarat[] = '('.implode(' OR ', array_fill(0, count($kota), 'kota ILIKE ?')).')';
            $nilai = array_map(fn ($k) => str_contains($k, ' ') ? $k : '%'.$k.'%', $kota);
        }
        if ($cocokNama) {
            // Geometri berderajat (0,018 derajat = +-2 km di Jabodetabek) agar indeks GIST terpakai; geography per baris lambat (6-10 dtk).
            $syarat[] = 'ST_DWithin(geom, (SELECT ST_Collect(geom) FROM wilayah WHERE id IN ('.implode(',', $cocokNama).')), 0.018)';
        }
        $syaratKota = $syarat ? 'WHERE '.implode(' AND ', $syarat) : '';

        // Metrik dihitung sekali oleh DemoPetaSeeder (atribut wilayah); di sini cukup dibaca.
        $baris = DB::select("
            SELECT id, nama, kecamatan, kota, tipe_kawasan, kualitas_udara,
                   (atribut->>'pusat_lat')::float AS lat, (atribut->>'pusat_lng')::float AS lng,
                   (atribut->>'d_commuter')::float AS d_commuter, (atribut->>'d_driver')::float AS d_driver,
                   (atribut->>'d_social')::float AS d_social, (atribut->>'n_poi')::int AS n_poi,
                   (atribut->>'d_rth')::float AS d_rth, (atribut->>'porsi_banjir')::float AS porsi_banjir,
                   (atribut->>'porsi_genangan')::float AS porsi_genangan, (atribut->>'pm25')::float AS pm25
            FROM wilayah {$syaratKota}
        ", $nilai);

        $peringkat = [];
        foreach ($baris as $b) {
            // Skor halus 0–1 per persona agar peringkat tidak seri; ambang bintang tetap dipakai di Detail Lokasi.
            $dekat = fn (?float $m, float $jauh = 5000) => $m === null ? 0.0 : max(0.0, 1 - $m / $jauh);
            $udara = PersonaScoring::UDARA[$b->kualitas_udara] ?? 0;
            $s = [
                'commuter' => $dekat($b->d_commuter),
                'driver' => $dekat($b->d_driver, 9000),
                'social_vibe' => 0.5 * $dekat($b->d_social, 3000) + 0.5 * min(1, $b->n_poi / 10),
                'zen' => 0.6 * ($udara / 3) + 0.4 * $dekat($b->d_rth, 3000),
            ];
            $kriteria = array_map(fn ($p) => $s[$p], $persona);
            if ($hasil['urutkan'] === 'jauh_dari_tol') {
                // "Tidak mau dekat tol": makin jauh dari gerbang tol makin baik (penuh pada 5 km).
                $kriteria[] = $b->d_driver === null ? 1.0 : min(1.0, $b->d_driver / 5000);
            }
            $match = array_sum($kriteria) / count($kriteria) * 100;
            // Banjir: indeks bahaya InaRISK atau genangan nyata Januari 2020 (BNPB), mana yang lebih luas.
            $banjir = max((float) ($b->porsi_banjir ?? 0), (float) ($b->porsi_genangan ?? 0));
            $match -= $banjir * ($hasil['hindari_banjir'] ? 70 : 20);
            $disebut = in_array($b->id, $cocokNama, true);
            $peringkat[] = [
                'b' => $b, 'match' => max(5, min(97, (int) round(35 + $match * 0.65))), 'skor' => $match, 'banjir' => $banjir,
                'disebut' => $disebut, 'persis' => in_array($b->id, $persis, true),
            ];
        }

        // Wilayah yang namanya disebut persis di depan, lalu yang namanya mirip, lalu tetangganya menurut skor.
        usort($peringkat, fn ($a, $b) => [$b['persis'], $b['disebut'], $b['skor']] <=> [$a['persis'], $a['disebut'], $a['skor']]);
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
                'alasan' => $this->alasan($r['b'], $persona, $hasil),
            ], $teratas),
        ]);
    }

    /**
     * id wilayah yang nama kelurahan atau kecamatannya cocok dengan frasa, dan id yang namanya persis sama.
     * Urutan: nama persis, lalu kata utuh ("Kemang" bukan "Kemanggisan"), lalu bagian kata;
     * frasa utuh dulu, lalu per kata >= 4 huruf.
     *
     * @return array{0: list<int>, 1: list<int>}
     */
    private function wilayahBernama(?string $frasa): array
    {
        if (! $frasa) {
            return [[], []];
        }
        // Persis: nama kelurahan sama; kelurahan di kecamatan bernama sama ikut "disebut" di bawahnya.
        $persis = array_map(fn ($r) => (int) $r->id, DB::select('SELECT id FROM wilayah WHERE lower(nama) = ?', [$frasa]));
        foreach ([[$frasa], array_filter(explode(' ', $frasa), fn ($w) => mb_strlen($w) >= 4)] as $calon) {
            foreach ($calon as $c) {
                $kata = '\\m'.preg_quote($c).'\\M';
                foreach ([['nama ~* ? OR kecamatan ~* ?', [$kata, $kata]], ['nama ILIKE ? OR kecamatan ILIKE ?', ['%'.$c.'%', '%'.$c.'%']]] as [$sql, $nilai]) {
                    $id = array_map(fn ($r) => (int) $r->id, DB::select("SELECT id FROM wilayah WHERE {$sql} LIMIT 60", $nilai));
                    if ($id) {
                        return [array_values(array_unique(array_merge($persis, $id))), $persis];
                    }
                }
            }
        }

        return [$persis, $persis];
    }

    /** Alasan singkat Top 3; kriteria yang dicari disebut lebih dulu. */
    private function alasan(object $b, array $persona, array $hasil): string
    {
        $bagian = [];
        if (in_array('zen', $persona, true) && $b->pm25 !== null) {
            $bagian[] = 'PM2.5 '.number_format($b->pm25, 0, ',', '.').' µg/m³';
        }
        if (in_array('zen', $persona, true) && $b->d_rth !== null && $b->d_rth <= 1500) {
            $bagian[] = 'taman '.$this->km($b->d_rth);
        }
        if (in_array('driver', $persona, true) && $b->d_driver !== null) {
            $bagian[] = 'gerbang tol '.$this->km($b->d_driver);
        }
        if ($hasil['urutkan'] === 'jauh_dari_tol' && $b->d_driver !== null) {
            $bagian[] = 'jauh dari tol ('.$this->km($b->d_driver).')';
        }
        if ($b->d_commuter !== null && $b->d_commuter <= 1500) {
            $bagian[] = 'stasiun '.$this->km($b->d_commuter);
        }
        if ($b->n_poi > 0) {
            $bagian[] = $b->n_poi.' kafe/restoran';
        }
        if (max($b->porsi_banjir ?? 0, $b->porsi_genangan ?? 0) < 0.05) {
            $bagian[] = 'minim area banjir';
        }

        return $bagian ? ucfirst(implode(', ', $bagian)).'.' : 'Kawasan permukiman.';
    }

    /** Jarak dari titik tengah kawasan: "1,2 km", atau "< 0,1 km" bila fasilitasnya di tengah kawasan. */
    private function km(float $meter): string
    {
        return $meter < 100 ? '< 0,1 km' : number_format($meter / 1000, 1, ',', '.').' km';
    }
}
