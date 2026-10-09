<?php

use App\Http\Controllers\Api\CommuteController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InspectController;
use App\Http\Controllers\Api\LayerController;
use App\Http\Controllers\Api\SearchController;
use Illuminate\Support\Facades\Route;

// Endpoint fitur mengikuti kontrak API di docs/SISTEM.md bagian 2.
Route::get('/health', HealthController::class);
Route::get('/layers', [LayerController::class, 'index']);
Route::get('/layers/{layer_id}', [LayerController::class, 'show']);
Route::get('/search', SearchController::class);
Route::get('/inspect', InspectController::class);
Route::get('/commute', CommuteController::class);
