<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/layers dan GET /api/layers/{layer_id}
 */
class LayerController extends Controller
{
    public const LAYER = [
        'historis_risiko' => ['nama' => 'Historis & Risiko', 'warna' => '#ef4444'],
        'ekosistem'       => ['nama' => 'Ekosistem Mikro', 'warna' => '#22c55e'],
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

    public function show(Request $request, string $layerId): JsonResponse
    {
        if (! isset(self::LAYER[$layerId])) {
            return response()->json(['message' => 'Layer tidak dikenal.'], 404);
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
            $angka = array_map('floatval', explode(',', (string) $bbox));
            if (count($angka) === 4) {
                $kondisi[] = 'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)';
                array_push($nilai, $angka[0], $angka[1], $angka[2], $angka[3]);
            }
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
            $baris = [];
        }

        if (! empty($baris)) {
            return response()->json([
                'type' => 'FeatureCollection',
                'features' => array_map(function ($b) use ($isLargePolygons) {
                    $attr = (array) json_decode($b->atribut ?? '{}', true);
                    
                    return [
                        'type' => 'Feature',
                        'id' => $b->id,
                        'geometry' => json_decode($b->geojson),
                        'properties' => array_merge(
                            [
                                'jenis' => $b->jenis ?? 'legalitas',
                                'nama' => $b->nama,
                                'tahun' => $b->tahun,
                                'sumber' => $b->sumber ?? 'ATR/BPN DKI Jakarta',
                            ],
                            $attr
                        ),
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