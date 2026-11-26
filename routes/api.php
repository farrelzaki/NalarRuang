<?php

use App\Http\Controllers\Api\CommuteController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InspectController;
use App\Http\Controllers\Api\LahanController;
use App\Http\Controllers\Api\LayerController;
use App\Http\Controllers\Api\LokasiController;
use App\Http\Controllers\Api\PerumahanController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

// Endpoint fitur mengikuti kontrak API di docs/SISTEM.md bagian 2.
Route::get('/health', HealthController::class);
Route::get('/layers', [LayerController::class, 'index']);
Route::get('/layers/{layer_id}', [LayerController::class, 'show']);
Route::get('/search', SearchController::class);
Route::get('/inspect', InspectController::class);
Route::get('/commute', CommuteController::class);
Route::get('/lokasi', LokasiController::class);
Route::post('/lahan', LahanController::class);

// FR-24 (listing properti) — disetujui PM dan tim 26 Nov 2026; kontrak di docs/SISTEM.md bagian 2 (docs/RENCANA.md TBD-12).
Route::post('/perumahan', [PerumahanController::class, 'simpan']);
Route::get('/perumahan/cari', [PerumahanController::class, 'cari']);
Route::delete('/perumahan/{id}', [PerumahanController::class, 'hapus']);
