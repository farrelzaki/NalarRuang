<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Batas wilayah (kelurahan/desa) untuk Requirement Search dan penilaian wilayah (FR-06, FR-09).
 * Skema sementara untuk demo; disesuaikan dengan ERD WBS 1.2.2 (TBD-04).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wilayah', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('kecamatan')->nullable();
            $table->string('kota')->nullable();
            $table->string('tipe_kawasan')->nullable();
            // Kategori kualitas udara (ISPU): sehat, kurang_sehat, tidak_sehat, berbahaya. Data contoh.
            $table->string('kualitas_udara')->nullable();
            $table->jsonb('atribut')->default('{}');
            $table->geometry('geom', subtype: 'multipolygon', srid: 4326);
            $table->timestamps();
        });

        DB::statement('CREATE INDEX wilayah_geom_gist ON wilayah USING GIST (geom)');
    }

    public function down(): void
    {
        Schema::dropIfExists('wilayah');
    }
};
