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
                WHERE jenis IN ('stasiun', 'halte', 'poi') AND GeometryType(geom) = 'POINT' AND nama ILIKE ?
                ORDER BY lower(nama), jenis, id
             ) x
             ORDER BY di_awal DESC, CASE jenis WHEN 'stasiun' THEN 0 WHEN 'halte' THEN 1 ELSE 2 END, length(nama)
             LIMIT ?",
            [$awal, $pola, self::BATAS],
        );
        $label = ['stasiun' => 'Stasiun', 'halte' => 'Halte', 'poi' => 'Tempat'];

        $hasil = [];
        foreach ($wilayah as $w) {
            $hasil[] = ['nama' => $w->nama, 'keterangan' => $w->keterangan, 'jenis' => 'wilayah', 'lat' => (float) $w->lat, 'lng' => (float) $w->lng];
        }
        foreach ($fitur as $f) {
            $hasil[] = ['nama' => $f->nama, 'keterangan' => $label[$f->jenis], 'jenis' => $f->jenis, 'lat' => (float) $f->lat, 'lng' => (float) $f->lng];
        }

        return response()->json(['hasil' => array_slice($hasil, 0, self::BATAS + 2)]);
    }
}
