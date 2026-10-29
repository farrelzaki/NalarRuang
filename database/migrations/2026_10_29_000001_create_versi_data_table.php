<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penanda versi data peta yang sudah dimuat (`php artisan nalar:muat-data`), agar fase release Heroku
 * hanya mengulang seeding bila berkas data atau seeder berubah.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('versi_data', function (Blueprint $table) {
            $table->string('kunci', 64)->primary();
            $table->string('nilai', 64);
            $table->timestamp('dimuat_pada');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('versi_data');
    }
};
