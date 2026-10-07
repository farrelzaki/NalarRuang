<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Semua fitur keenam layer dalam satu tabel (FR-03, FR-04).
 * layer_id: historis_risiko, ekosistem, inklusivitas, mobilitas, mesin_waktu, legalitas (docs/SISTEM.md bagian 2).
 * jenis: subtipe dalam layer, mis. banjir, rth, poi, akses, trotoar, krl, mrt, lrt, stasiun, halte, tol, proyek, legal.
 * Skema sementara untuk demo; disesuaikan dengan ERD WBS 1.2.2 (TBD-04).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fitur_peta', function (Blueprint $table) {
            $table->id();
            $table->string('layer_id', 32)->index();
            $table->string('jenis', 32)->index();
            $table->string('nama')->nullable();
            $table->jsonb('atribut')->default('{}');
            $table->unsignedSmallInteger('tahun')->nullable();
            $table->string('sumber')->nullable();
            $table->geometry('geom', srid: 4326);
            $table->timestamps();
        });

        DB::statement('CREATE INDEX fitur_peta_geom_gist ON fitur_peta USING GIST (geom)');
    }

    public function down(): void
    {
        Schema::dropIfExists('fitur_peta');
    }
};
