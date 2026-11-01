<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Muat data peta (DemoPetaSeeder + DataNyataSeeder) bila berkas di data/ atau seedernya berubah sejak pemuatan terakhir.
 * Dipanggil di fase release Heroku (Procfile), jadi deploy otomatis ikut memperbarui basis data.
 */
Artisan::command('nalar:muat-data {--paksa : Muat ulang walau versinya sama}', function () {
    $berkas = array_merge(
        glob(base_path('data/geojson/demo/*.geojson')),
        glob(base_path('data/geojson/demo/fitur/*.geojson')),
        glob(base_path('data/geojson/{rdtr_dki_2022,genangan_bnpb_2020,osm_tambahan,transit_bodetabek,banjir_tampilan}/*.{geojson,gz,csv}'), GLOB_BRACE),
        glob(base_path('data/{udara,penduduk,mesin_waktu}/*.{csv,geojson}'), GLOB_BRACE),
        glob(base_path('database/seeders/*.php')),
    );
    sort($berkas);
    $versi = sha1(implode('', array_map(fn ($f) => basename($f).md5_file($f), $berkas)));

    $lama = DB::table('versi_data')->where('kunci', 'peta')->value('nilai');
    if ($lama === $versi && ! $this->option('paksa')) {
        $this->info("Data peta sudah versi terbaru ({$versi}).");

        return 0;
    }

    $this->info('Memuat data peta ('.count($berkas).' berkas)...');
    $this->call('db:seed', ['--class' => 'DemoPetaSeeder', '--force' => true]);
    DB::table('versi_data')->updateOrInsert(['kunci' => 'peta'], ['nilai' => $versi, 'dimuat_pada' => now()]);
    $this->info("Selesai, versi {$versi}.");

    return 0;
})->purpose('Muat ulang data peta bila berkas data berubah');
