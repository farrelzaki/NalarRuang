<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * GET /api/health — cek koneksi basis data dan versi PostGIS.
 * Dipakai saat setup dan staging (WBS 1.2.4, 1.2.5); bukan bagian kontrak fitur.
 */
class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            $postgis = DB::selectOne('select postgis_lib_version() as versi')->versi;

            return response()->json([
                'status' => 'ok',
                'database' => DB::connection()->getDriverName(),
                'postgis' => $postgis,
            ]);
        } catch (Throwable) {
            return response()->json([
                'status' => 'error',
                'database' => DB::connection()->getDriverName(),
                'postgis' => null,
            ], 503);
        }
    }
}
