<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * FR-24 (listing properti, docs/RENCANA.md TBD-12) — disetujui PM 26 Nov 2026. Bentuk respons di
 * sini belum dibekukan sebagai kontrak resmi di docs/SISTEM.md bagian 2 (masih perlu dibahas
 * Farrel/Adzkia/Nur'Afia); FR-24 juga masih menunggu PM memindahkannya resmi ke docs/sumber/SRS.md.
 *
 * Data primer dari pengguna (beda dari fitur lain yang semuanya data sekunder publik, SRS BR 4):
 * disimpan di tabel listing_perumahan tersendiri, bukan fitur_peta/wilayah.
 * Tanpa akun (CLAUDE.md): kelola (hapus) listing sendiri lewat token_kelola yang hanya ditunjukkan
 * sekali saat upload (disimpan sebagai hash SHA-256, bukan plain text).
 * Tanpa moderasi untuk versi ini: listing tampil langsung setelah diunggah (lihat TBD-12).
 */
class PerumahanController extends Controller
{
    public const TIPE = ['rumah', 'kos', 'apartemen'];

    public const HARGA_SATUAN = ['jual', 'sewa_bulan', 'sewa_tahun'];

    /** Kedaluwarsa otomatis agar listing tidak menumpuk basi tanpa moderasi (lihat TBD-12). */
    private const HARI_KEDALUWARSA = 90;

    public function simpan(Request $request): JsonResponse
    {
        $request->validate([
            'nama' => 'required|string|max:120',
            'deskripsi' => 'nullable|string|max:2000',
            'tipe' => 'required|in:'.implode(',', self::TIPE),
            // Indikatif saja (bukan transaksi): sistem tidak memproses pembayaran apa pun.
            'harga' => 'nullable|integer|min:0',
            'harga_satuan' => 'nullable|required_with:harga|in:'.implode(',', self::HARGA_SATUAN),
            'kontak_wa' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        $lat = (float) $request->input('lat');
        $lng = (float) $request->input('lng');
        $wilayah = DB::selectOne(
            'SELECT id FROM wilayah WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)) LIMIT 1',
            [$lng, $lat],
        );
        if (! $wilayah) {
            return response()->json(['message' => 'Lokasi ini di luar Jabodetabek, jadi belum bisa dipasang.'], 422);
        }

        $token = Str::random(40);
        $kedaluwarsa = now()->addDays(self::HARI_KEDALUWARSA);
        $baris = DB::selectOne(
            "INSERT INTO listing_perumahan
                (nama, deskripsi, tipe, harga, harga_satuan, kontak_wa, geom, token_kelola_hash, kedaluwarsa_pada, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?, now(), now())
             RETURNING id",
            [
                $request->input('nama'),
                $request->input('deskripsi'),
                $request->input('tipe'),
                $request->input('harga'),
                $request->input('harga_satuan'),
                $request->input('kontak_wa'),
                $lng,
                $lat,
                hash('sha256', $token),
                $kedaluwarsa,
            ],
        );

        return response()->json([
            'id' => $baris->id,
            // Ditunjukkan SEKALI: simpan sendiri, dipakai untuk DELETE /api/perumahan/{id} nanti.
            'token_kelola' => $token,
            'kedaluwarsa_pada' => $kedaluwarsa->toIso8601String(),
        ], 201);
    }

    public function cari(Request $request): JsonResponse
    {
        $request->validate([
            'bbox' => 'required|string',
            'tipe' => 'nullable|in:'.implode(',', self::TIPE),
        ]);
        $bbox = array_map('floatval', explode(',', (string) $request->query('bbox')));
        if (count($bbox) !== 4) {
            return response()->json(['message' => 'bbox harus minLng,minLat,maxLng,maxLat.'], 422);
        }
        [$minLng, $minLat, $maxLng, $maxLat] = $bbox;

        $tipe = $request->query('tipe');
        $baris = DB::select(
            "SELECT id, nama, deskripsi, tipe, harga, harga_satuan, kontak_wa, ST_X(geom) AS lng, ST_Y(geom) AS lat
             FROM listing_perumahan
             WHERE geom && ST_MakeEnvelope(?, ?, ?, ?, 4326) AND kedaluwarsa_pada > now()".($tipe ? ' AND tipe = ?' : '').'
             ORDER BY created_at DESC LIMIT 200',
            $tipe ? [$minLng, $minLat, $maxLng, $maxLat, $tipe] : [$minLng, $minLat, $maxLng, $maxLat],
        );

        return response()->json([
            'type' => 'FeatureCollection',
            'features' => array_map(fn ($b) => [
                'type' => 'Feature',
                'geometry' => ['type' => 'Point', 'coordinates' => [(float) $b->lng, (float) $b->lat]],
                'properties' => [
                    'id' => $b->id, 'nama' => $b->nama, 'deskripsi' => $b->deskripsi, 'tipe' => $b->tipe,
                    'harga' => $b->harga, 'harga_satuan' => $b->harga_satuan, 'kontak_wa' => $b->kontak_wa,
                ],
            ], $baris),
        ]);
    }

    public function hapus(Request $request, int $id): JsonResponse
    {
        $request->validate(['token_kelola' => 'required|string']);
        $baris = DB::selectOne('SELECT token_kelola_hash FROM listing_perumahan WHERE id = ?', [$id]);
        if (! $baris) {
            return response()->json(['message' => 'Listing tidak ditemukan.'], 404);
        }
        if (! hash_equals($baris->token_kelola_hash, hash('sha256', (string) $request->input('token_kelola')))) {
            return response()->json(['message' => 'Token kelola salah.'], 403);
        }
        DB::delete('DELETE FROM listing_perumahan WHERE id = ?', [$id]);

        return response()->json(null, 204);
    }
}
