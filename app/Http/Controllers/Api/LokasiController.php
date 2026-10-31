<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/lokasi?q= (FR-10): saran lokasi untuk kolom titik A/B Commute Simulator.
 * Dicari dari data sendiri (kelurahan, stasiun, halte, tempat bernama), tanpa layanan geocoding luar.
 */
class LokasiController extends Controller
{
    private const BATAS = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => 'required|string|min:3|max:80']);
        $q = trim((string) $request->query('q'));
        $kamus = json_decode((string) file_get_contents(base_path('data/kamus/kamus_pencarian.json')), true);

        // Singkatan populer ("monas", "gbk") ke nama resmi di OSM.
        $alias = $kamus['alias_tempat'][mb_strtolower($q)] ?? null;
        if ($alias === 'luar_cakupan') {
            return response()->json(['hasil' => [], 'message' => $kamus['pesan']['luar_cakupan'][0]]);
        }
        $hasil = $this->cari($alias ?? $q);

        // Tidak ketemu: ulangi tanpa kata umum ("stasiun manggarai" -> "manggarai").
        if (! $hasil) {
            $umum = $kamus['kata_umum_lokasi'];
            $sisa = trim(implode(' ', array_filter(preg_split('/\s+/u', mb_strtolower($q)) ?: [], fn ($w) => ! in_array(rtrim($w, '.'), $umum, true))));
            if ($sisa !== '' && $sisa !== mb_strtolower($q) && mb_strlen($sisa) >= 3) {
                $hasil = $this->cari($sisa);
            }
        }

        return response()->json(['hasil' => $hasil]);
    }

    /** @return list<array{nama: string, keterangan: string, jenis: string, lat: float, lng: float}> */
    private function cari(string $q): array
    {
        $pola = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $q).'%';
        $awal = str_replace(['%', '_'], ['\\%', '\\_'], $q).'%';

        $wilayah = DB::select(
            "SELECT nama, concat_ws(', ', 'Kec. ' || kecamatan, kota) AS keterangan, 'wilayah' AS jenis,
                    (atribut->>'pusat_lat')::float AS lat, (atribut->>'pusat_lng')::float AS lng,
                    (nama ILIKE ?) AS di_awal
             FROM wilayah WHERE nama ILIKE ? OR kecamatan ILIKE ?
             ORDER BY di_awal DESC, length(nama) LIMIT ?",
            [$awal, $pola, $pola, self::BATAS],
        );

        $fitur = DB::select(
            "SELECT * FROM (
                SELECT DISTINCT ON (lower(nama), jenis) nama, jenis, ST_Y(geom) AS lat, ST_X(geom) AS lng, (nama ILIKE ?) AS di_awal
                FROM fitur_peta
                WHERE jenis IN ('stasiun', 'halte', 'poi', 'tempat') AND GeometryType(geom) = 'POINT' AND nama ILIKE ?
                ORDER BY lower(nama), jenis, id
             ) x
             ORDER BY di_awal DESC, CASE jenis WHEN 'stasiun' THEN 0 WHEN 'tempat' THEN 1 WHEN 'halte' THEN 2 ELSE 3 END, length(nama)
             LIMIT ?",
            [$awal, $pola, self::BATAS],
        );
        $label = ['stasiun' => 'Stasiun', 'halte' => 'Halte', 'poi' => 'Tempat', 'tempat' => 'Tempat'];

        $hasil = [];
        foreach ($wilayah as $w) {
            $hasil[] = ['nama' => $w->nama, 'keterangan' => $w->keterangan, 'jenis' => 'wilayah', 'lat' => (float) $w->lat, 'lng' => (float) $w->lng];
        }
        foreach ($fitur as $f) {
            // Jenis "tempat" (gazetteer OSM) dikirim sebagai "poi": kontrak SaranLokasi tidak berubah.
            $hasil[] = ['nama' => $f->nama, 'keterangan' => $label[$f->jenis], 'jenis' => $f->jenis === 'tempat' ? 'poi' : $f->jenis, 'lat' => (float) $f->lat, 'lng' => (float) $f->lng];
        }

        return array_slice($hasil, 0, self::BATAS + 2);
    }
}
