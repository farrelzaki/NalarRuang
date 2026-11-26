<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * FR-24 (listing properti, disetujui PM 26 Nov 2026) — belum resmi di docs/SISTEM.md (docs/RENCANA.md TBD-12).
 * Dites di atas satu kelurahan kotak di Jakarta Selatan, sama seperti LahanTest.
 */
class PerumahanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        DB::insert(
            "INSERT INTO wilayah (nama, kecamatan, kota, tipe_kawasan, kualitas_udara, atribut, geom, created_at, updated_at)
             VALUES ('Kebon Uji', 'Uji', 'Jakarta Selatan', 'Permukiman', 'sehat', '{}'::jsonb,
                     ST_Multi(ST_MakeEnvelope(106.80, -6.21, 106.81, -6.20, 4326)), now(), now())",
        );
    }

    private function unggah(array $override = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson('/api/perumahan', array_merge([
            'nama' => 'Rumah Kebon Uji',
            'tipe' => 'rumah',
            'harga' => 500000000,
            'harga_satuan' => 'jual',
            'kontak_wa' => '081234567890',
            'lat' => -6.205,
            'lng' => 106.805,
        ], $override));
    }

    public function test_unggah_lalu_muncul_di_pencarian(): void
    {
        $r = $this->unggah()->assertCreated();
        $r->assertJsonStructure(['id', 'token_kelola', 'kedaluwarsa_pada']);
        $token = $r->json('token_kelola');
        $this->assertNotEmpty($token);

        $hasil = $this->getJson('/api/perumahan/cari?bbox=106.80,-6.21,106.81,-6.20')->assertOk();
        $hasil->assertJsonCount(1, 'features');
        $hasil->assertJsonPath('features.0.properties.nama', 'Rumah Kebon Uji');
        $hasil->assertJsonPath('features.0.properties.harga', 500000000);
        // Token kelola tidak pernah dikirim balik di hasil pencarian (hanya hash yang disimpan).
        $this->assertArrayNotHasKey('token_kelola', $hasil->json('features.0.properties'));
    }

    public function test_unggah_di_luar_jabodetabek_ditolak(): void
    {
        $this->unggah(['lat' => -7.25, 'lng' => 112.75])->assertStatus(422);
    }

    public function test_kontak_wa_wajib_dan_format_nomor(): void
    {
        $this->unggah(['kontak_wa' => ''])->assertStatus(422);
        $this->unggah(['kontak_wa' => 'bukan nomor'])->assertStatus(422);
    }

    public function test_harga_satuan_wajib_bila_harga_diisi(): void
    {
        $this->unggah(['harga' => 500000000, 'harga_satuan' => null])->assertStatus(422);
        $this->unggah(['harga' => null, 'harga_satuan' => null])->assertCreated();
    }

    public function test_hapus_dengan_token_benar_lalu_hilang_dari_pencarian(): void
    {
        $r = $this->unggah();
        $token = $r->json('token_kelola');
        $id = $r->json('id');

        $this->deleteJson("/api/perumahan/{$id}", ['token_kelola' => 'salah'])->assertStatus(403);
        $this->deleteJson("/api/perumahan/{$id}", ['token_kelola' => $token])->assertStatus(204);

        $hasil = $this->getJson('/api/perumahan/cari?bbox=106.80,-6.21,106.81,-6.20')->assertOk();
        $hasil->assertJsonCount(0, 'features');
    }

    public function test_pencarian_bisa_difilter_tipe(): void
    {
        $this->unggah(['tipe' => 'rumah']);
        $this->unggah(['tipe' => 'kos', 'nama' => 'Kos Kebon Uji']);

        $hasil = $this->getJson('/api/perumahan/cari?bbox=106.80,-6.21,106.81,-6.20&tipe=kos')->assertOk();
        $hasil->assertJsonCount(1, 'features');
        $hasil->assertJsonPath('features.0.properties.tipe', 'kos');
    }
}
