<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Landing')->name('landing');
Route::inertia('/peta', 'Peta')->name('peta');
// FR-24 (listing properti, disetujui PM dan tim 26 Nov 2026) — halaman demo, belum ditautkan dari Landing/menu.
Route::inertia('/demo-perumahan', 'PerumahanDemo')->name('demo.perumahan');
