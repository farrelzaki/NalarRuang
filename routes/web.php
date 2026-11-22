<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Landing')->name('landing');
Route::inertia('/peta', 'Peta')->name('peta');
// FR-24 DRAF (listing properti) — demo untuk PM, belum resmi, tidak ditautkan dari Landing/menu.
Route::inertia('/demo-perumahan', 'PerumahanDemo')->name('demo.perumahan');
