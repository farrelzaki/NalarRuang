<?php

use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

// Endpoint fitur mengikuti kontrak API di docs/SISTEM.md bagian 2.
Route::get('/health', HealthController::class);
