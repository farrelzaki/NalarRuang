<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Area gambar pengguna (alat Area di bilah alat peta): urai, validasi, dan ubah ke WKT.
 * Format masukan `GET /api/inspect?area=`: "lng,lat;lng,lat;..." (minimal 3 titik, cincin boleh belum ditutup).
 * Logika murni tanpa basis data; batas luas dan cakupan Jabodetabek dicek di PostGIS oleh InspectController.
 */
class AreaPoligon
{
    public const TITIK_MIN = 3;

    public const TITIK_MAKS = 60;

    /** Luas maksimal area yang dinilai: sekitar 25 km² (kira-kira 5 x 5 km). */
    public const LUAS_MAKS_M2 = 25_000_000;

    /** Luas minimal: lebih kecil dari ini hampir pasti salah klik. */
    public const LUAS_MIN_M2 = 500;

    /** Bagian area yang harus berada di dalam kelurahan Jabodetabek. */
    public const CAKUPAN_MIN = 0.9;

    /** Kotak batas peta Jabodetabek [minLng, minLat, maxLng, maxLat], sama dengan batas peta di klien. */
    public const KOTAK = [106.15, -6.85, 107.35, -5.85];

    /**
     * @return list<array{0: float, 1: float}> titik [lng, lat], cincin tertutup (titik pertama diulang di akhir)
     *
     * @throws InvalidArgumentException dengan pesan Bahasa Indonesia untuk pengguna
     */
    public static function urai(string $teks): array
    {
        $titik = [];
        foreach (array_filter(array_map('trim', explode(';', $teks)), fn ($s) => $s !== '') as $pasangan) {
            $bagian = array_map('trim', explode(',', $pasangan));
            if (count($bagian) !== 2 || ! is_numeric($bagian[0]) || ! is_numeric($bagian[1])) {
                throw new InvalidArgumentException('Format area tidak dikenali. Gunakan "lng,lat;lng,lat;...".');
            }
            [$lng, $lat] = [(float) $bagian[0], (float) $bagian[1]];
            if (! is_finite($lng) || ! is_finite($lat)) {
                throw new InvalidArgumentException('Koordinat area tidak valid.');
            }
            if ($lng < self::KOTAK[0] || $lng > self::KOTAK[2] || $lat < self::KOTAK[1] || $lat > self::KOTAK[3]) {
                throw new InvalidArgumentException('Area harus berada di dalam Jabodetabek.');
            }
            $akhir = end($titik);
            if ($akhir === false || $akhir[0] !== $lng || $akhir[1] !== $lat) {
                $titik[] = [$lng, $lat];
            }
        }

        if (count($titik) > 1 && $titik[0] === $titik[count($titik) - 1]) {
            array_pop($titik);
        }
        if (count($titik) < self::TITIK_MIN) {
            throw new InvalidArgumentException('Area butuh minimal 3 titik sudut.');
        }
        if (count($titik) > self::TITIK_MAKS) {
            throw new InvalidArgumentException('Area maksimal '.self::TITIK_MAKS.' titik sudut.');
        }
        $titik[] = $titik[0];

        return $titik;
    }

    /** @param list<array{0: float, 1: float}> $cincin */
    public static function wkt(array $cincin): string
    {
        return 'POLYGON(('.implode(',', array_map(fn ($p) => self::angka($p[0]).' '.self::angka($p[1]), $cincin)).'))';
    }

    private static function angka(float $x): string
    {
        return rtrim(rtrim(sprintf('%.7F', $x), '0'), '.');
    }
}
