<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Landing')->name('landing');
Route::inertia('/peta', 'Peta')->name('peta');
