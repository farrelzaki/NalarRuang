<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Listing properti dari penjual (FR-24, disetujui PM 26 Nov 2026, docs/RENCANA.md TBD-12).
 * Tabel terpisah dari fitur_peta/wilayah (data sekunder publik): ini data primer dari pengguna,
 * jadi dipisah agar jelas mana yang bukan hasil pengumpulan tim (SRS Business Rule 4).
 * Tanpa akun (CLAUDE.md): kelola (hapus) listing lewat token_kelola yang dikirim balik sekali saat upload.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_perumahan', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->text('deskripsi')->nullable();
            $table->string('tipe'); // rumah, kos, apartemen (sama kategori dengan Uji Lahan)
            $table->bigInteger('harga')->nullable(); // Rupiah; indikatif, bukan transaksi
            $table->string('harga_satuan')->nullable(); // jual, sewa_bulan, sewa_tahun
            $table->string('kontak_wa'); // supaya peminat bisa menghubungi penjual
            $table->geometry('geom', subtype: 'point', srid: 4326);
            $table->string('token_kelola_hash'); // SHA-256; token asli hanya ditunjukkan sekali saat upload
            $table->timestamp('kedaluwarsa_pada');
            $table->timestamps();
        });

        DB::statement('CREATE INDEX listing_perumahan_geom_gist ON listing_perumahan USING GIST (geom)');
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_perumahan');
    }
};
