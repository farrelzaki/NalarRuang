<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * GET /api/layers dan GET /api/layers/{layer_id}
 */
class LayerController extends Controller
{
    public const LAYER = [
        'historis_risiko' => ['nama' => 'Historis & Risiko', 'warna' => '#ef4444'],
        'ekosistem'       => ['nama' => 'Ekosistem Mikro', 'warna' => '#22c55e'],
        'kualitas_udara'  => ['nama' => 'Kualitas Udara', 'warna' => '#0891b2'],
        'inklusivitas'    => ['nama' => 'Inklusivitas', 'warna' => '#0ea5e9'],
        'mobilitas'       => ['nama' => 'Mobilitas & Transit', 'warna' => '#f97316'],
        'mesin_waktu'     => ['nama' => 'Mesin Waktu', 'warna' => '#a855f7'],
        'legalitas'       => ['nama' => 'Legalitas Lahan', 'warna' => '#8b5cf6'],
        'rdtr'            => ['nama' => 'RDTR DKI Jakarta 2022', 'warna' => '#eab308'],
        'persil'          => ['nama' => 'Hak Atas Tanah (Persil BPN)', 'warna' => '#0284c7'],
    ];

    public function index(): JsonResponse
    {
        return response()->json(collect(self::LAYER)->map(fn ($v, $k) => ['layer_id' => $k, ...$v])->values());
    }

    /**
     * Layer Kualitas Udara (T-057, persona Zen): poligon kelurahan berwarna menurut kelas udara.
     * Datanya tabel wilayah yang diisi DataNyataSeeder dari PM2.5 satelit SatPM V6.GL.03 2024
     * (ACAG Washington University, CC BY 4.0). Kelas relatif antarkelurahan, sama dengan skor bintang Zen.
     */
    private function udara(Request $request): JsonResponse
    {
        $kondisi = ['kualitas_udara IS NOT NULL'];
        $nilai = [];
        if ($bbox = $request->query('bbox')) {
            $angka = array_map('floatval', explode(',', (string) $bbox));
            if (count($angka) === 4) {
                $kondisi[] = 'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)';
                array_push($nilai, ...$angka);
            }
        }

        $baris = DB::select(
            'SELECT id, nama, kecamatan, kota, kualitas_udara, atribut,
                    ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.001), 4) AS geojson
             FROM wilayah WHERE '.implode(' AND ', $kondisi).' ORDER BY id',
            $nilai,
        );

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => array_map(function ($b) {
                $attr = (array) json_decode($b->atribut ?? '{}', true);
                $pm25 = isset($attr['pm25']) ? (float) $attr['pm25'] : null;

                return [
                    'type' => 'Feature',
                    'id' => $b->id,
                    'geometry' => json_decode($b->geojson),
                    'properties' => [
                        'jenis' => 'udara',
                        'nama' => $b->nama,
                        'kecamatan' => $b->kecamatan,
                        'kota' => $b->kota,
                        'kategori' => $b->kualitas_udara,
                        'pm25' => $pm25,
                        'kali_baku_mutu' => $pm25 !== null ? round($pm25 / 15, 1) : null,
                        'tahun' => 2024,
                        'sumber' => $attr['sumber_udara'] ?? 'SatPM V6.GL.03 2024, ACAG Washington University (CC BY 4.0)',
                    ],
                ];
            }, $baris),
        ]);
    }

    public function show(Request $request, string $layerId): JsonResponse
    {
        if (! isset(self::LAYER[$layerId])) {
            return response()->json(['message' => 'Layer tidak dikenal.'], 404);
        }

        if ($layerId === 'kualitas_udara') {
            return $this->udara($request);
        }

        // Layer poligon besar yang membutuhkan BBOX Filtering
        $isLargePolygons = in_array($layerId, ['legalitas', 'persil', 'rdtr']);
        
        $targetLayerIds = in_array($layerId, ['legalitas', 'persil']) 
            ? ['persil', 'legalitas'] 
            : [$layerId];

        $inPlaceholders = implode(',', array_fill(0, count($targetLayerIds), '?'));
        $kondisi = ["layer_id IN ({$inPlaceholders})"];
        $nilai = $targetLayerIds;

        // BBOX Filtering untuk layer poligon berat
        if ($bbox = $request->query('bbox')) {
            $bagian = explode(',', (string) $bbox);
            if (count($bagian) !== 4 || count(array_filter($bagian, 'is_numeric')) !== 4) {
                return response()->json(['message' => 'Format bbox harus minLng,minLat,maxLng,maxLat (angka).'], 422);
            }
            $angka = array_map('floatval', $bagian);
            $kondisi[] = 'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)';
            array_push($nilai, $angka[0], $angka[1], $angka[2], $angka[3]);
        }

        if ($layerId === 'mesin_waktu' && $request->filled('tahun')) {
            $request->validate(['tahun' => 'integer|between:2000,2100']);
            $kondisi[] = '(tahun IS NULL OR tahun <= ?)';
            $nilai[] = (int) $request->query('tahun');
        }

        // Limit hanya diterapkan pada poligon berat (1500) agar RAM tidak habis
        $limitSql = $isLargePolygons ? ' LIMIT 1500' : '';
        $orderSql = $isLargePolygons ? ' ORDER BY id DESC' : ' ORDER BY id ASC';

        try {
            $baris = DB::select(
                'SELECT id, jenis, nama, atribut, tahun, sumber, 
                        ST_AsGeoJSON(ST_Simplify(geom, 0.000005), 5) AS geojson
                 FROM fitur_peta WHERE '.implode(' AND ', $kondisi) . $orderSql . $limitSql,
                $nilai,
            );
        } catch (\Throwable $e) {
            // Jangan membalas koleksi kosong: itu menyembunyikan galat SQL seolah layer memang tidak berisi data.
            Log::error(__METHOD__.": layer {$layerId}: ".$e->getMessage());

            return response()->json(['message' => 'Data layer gagal dimuat.'], 500);
        }

        if (! empty($baris)) {
            $tahunSekarang = (int) date('Y');

            return response()->json([
                'type' => 'FeatureCollection',
                'features' => array_map(function ($b) use ($layerId, $tahunSekarang) {
                    $attr = (array) json_decode($b->atribut ?? '{}', true);
                    $statusRaw = strtolower(trim((string) ($attr['status_jalur'] ?? $attr['status'] ?? $attr['kondisi'] ?? '')));

                    $isFuture = $layerId === 'mesin_waktu'
                        || ($b->jenis ?? '') === 'proyek'
                        || ($b->tahun !== null && (int) $b->tahun > $tahunSekarang)
                        || str_contains($statusRaw, 'rencana')
                        || str_contains($statusRaw, 'pembangunan')
                        || str_contains($statusRaw, 'konstruksi')
                        || str_contains($statusRaw, 'masa_depan')
                        || str_contains($statusRaw, 'masa depan')
                        || str_contains($statusRaw, 'future')
                        || str_contains($statusRaw, 'planned');

                    $defaultProps = [
                        'jenis' => $b->jenis ?? 'legalitas',
                        'nama' => $b->nama,
                        'tahun' => $b->tahun,
                        'sumber' => $b->sumber ?? 'ATR/BPN DKI Jakarta',
                    ];

                    if (in_array($layerId, ['mobilitas', 'mesin_waktu'], true)) {
                        $defaultProps['status_jalur'] = $isFuture ? 'masa_depan' : 'eksisting';
                    }

                    return [
                        'type' => 'Feature',
                        'id' => $b->id,
                        'geometry' => json_decode($b->geojson),
                        'properties' => array_merge($defaultProps, $attr),
                    ];
                }, $baris),
            ]);
        }

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => [],
        ]);
    }
}