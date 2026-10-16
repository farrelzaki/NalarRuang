<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/layers dan GET /api/layers/{layer_id} (FR-03, FR-04).
 */
class LayerController extends Controller
{
    public const LAYER = [
        'historis_risiko' => ['nama' => 'Historis & Risiko', 'warna' => '#ef4444'],
        'ekosistem' => ['nama' => 'Ekosistem Mikro', 'warna' => '#22c55e'],
        'inklusivitas' => ['nama' => 'Inklusivitas', 'warna' => '#0ea5e9'],
        'mobilitas' => ['nama' => 'Mobilitas & Transit', 'warna' => '#f97316'],
        'mesin_waktu' => ['nama' => 'Mesin Waktu', 'warna' => '#a855f7'],
        'legalitas' => ['nama' => 'Legalitas Lahan', 'warna' => '#8b5cf6'],
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

        $kondisi = ['layer_id = ?'];
        $nilai = [$layerId];

        if ($bbox = $request->query('bbox')) {
            $angka = array_map('floatval', explode(',', (string) $bbox));
            if (count($angka) !== 4) {
                return response()->json(['message' => 'Format bbox: minLng,minLat,maxLng,maxLat.'], 422);
            }
            $kondisi[] = 'geom && ST_MakeEnvelope(?, ?, ?, ?, 4326)';
            array_push($nilai, ...$angka);
        }

        if ($layerId === 'mesin_waktu' && $request->filled('tahun')) {
            $kondisi[] = '(tahun IS NULL OR tahun <= ?)';
            $nilai[] = (int) $request->query('tahun');
        }

        $baris = DB::select(
            'SELECT id, jenis, nama, atribut, tahun, sumber, ST_AsGeoJSON(geom, 6) AS geojson
             FROM fitur_peta WHERE '.implode(' AND ', $kondisi).' ORDER BY id',
            $nilai,
        );

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => array_map(fn ($b) => [
                'type' => 'Feature',
                'id' => $b->id,
                'geometry' => json_decode($b->geojson),
                'properties' => [
                    'jenis' => $b->jenis,
                    'nama' => $b->nama,
                    'tahun' => $b->tahun,
                    'sumber' => $b->sumber,
                    ...(array) json_decode($b->atribut, true),
                ],
            ], $baris),
        ]);
    }
}
