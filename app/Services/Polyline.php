<?php

namespace App\Services;

/**
 * Pengurai encoded polyline (format Google; Valhalla memakai presisi 6).
 * Logika murni, bisa dites tanpa HTTP.
 */
class Polyline
{
    /** @return list<array{0: float, 1: float}> koordinat [lng, lat] siap GeoJSON */
    public static function decode(string $teks, int $presisi = 6): array
    {
        $faktor = 10 ** $presisi;
        $hasil = [];
        $i = 0;
        $panjang = strlen($teks);
        $lat = 0;
        $lng = 0;

        while ($i < $panjang) {
            foreach (['lat', 'lng'] as $sumbu) {
                $geser = 0;
                $nilai = 0;
                do {
                    $b = ord($teks[$i++]) - 63;
                    $nilai |= ($b & 0x1F) << $geser;
                    $geser += 5;
                } while ($b >= 0x20 && $i < $panjang);
                $delta = ($nilai & 1) ? ~($nilai >> 1) : ($nilai >> 1);
                $$sumbu += $delta;
            }
            $hasil[] = [round($lng / $faktor, $presisi), round($lat / $faktor, $presisi)];
        }

        return $hasil;
    }
}
