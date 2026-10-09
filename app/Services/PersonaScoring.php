<?php

namespace App\Services;

/**
 * Aturan Persona Grading (SRS v1.2 FR-09, BR 10). Logika murni: tanpa HTTP, tanpa basis data.
 */
class PersonaScoring
{
    public const PERSONA = ['commuter', 'driver', 'social_vibe', 'zen'];

    public const LABEL = [
        'commuter' => 'Commuter',
        'driver' => 'Driver',
        'social_vibe' => 'Social & Vibe',
        'zen' => 'Zen',
    ];

    /** Ambang jarak titik ke fasilitas utama, meter (15-minute city). */
    public const AMBANG = [3 => 1200, 2 => 2500, 1 => 5000];

    public const UDARA = [
        'sehat' => 3,
        'kurang_sehat' => 2,
        'tidak_sehat' => 1,
        'berbahaya' => 0,
    ];

    private const FRASA = [
        3 => 'Sangat mendukung aktivitasmu!',
        2 => 'Cukup mendukung aktivitasmu.',
        1 => 'Mungkin kurang optimal, pertimbangkan lokasi lain.',
        0 => 'Belum mendukung aktivitasmu, pertimbangkan lokasi lain.',
    ];

    /** Bintang dari jarak (meter) ke fasilitas utama. null = data tidak lengkap. */
    public function bintangJarak(?float $meter): ?int
    {
        if ($meter === null) {
            return null;
        }

        foreach (self::AMBANG as $bintang => $batas) {
            if ($meter <= $batas) {
                return $bintang;
            }
        }

        return 0;
    }

    /**
     * Zen: kategori kualitas udara, dikurangi 1 bila RTH terdekat > 1,2 km (sampai 5 km),
     * dikurangi 2 bila tidak ada RTH dalam 5 km. Minimal 0.
     */
    public function bintangZen(?string $kualitasUdara, ?float $meterKeRth): ?int
    {
        if ($kualitasUdara === null || ! isset(self::UDARA[$kualitasUdara])) {
            return null;
        }

        $dasar = self::UDARA[$kualitasUdara];
        $kurang = match (true) {
            $meterKeRth === null || $meterKeRth > self::AMBANG[1] => 2,
            $meterKeRth > self::AMBANG[3] => 1,
            default => 0,
        };

        return max(0, $dasar - $kurang);
    }

    /** Wilayah: cocok bila ada minimal satu fasilitas utama di dalamnya. */
    public function cocokWilayah(string $persona, int $jumlahFasilitas, ?string $kualitasUdara = null): bool
    {
        if ($persona === 'zen') {
            return $jumlahFasilitas > 0 && in_array($kualitasUdara, ['sehat', 'kurang_sehat'], true);
        }

        return $jumlahFasilitas > 0;
    }

    public function kesimpulanTitik(string $persona, int $bintang): string
    {
        return 'Buat gaya hidup '.self::LABEL[$persona].': '.self::FRASA[max(0, min(3, $bintang))];
    }

    public function kesimpulanWilayah(string $persona, bool $cocok): string
    {
        return ($cocok ? 'Cocok' : 'Belum cocok').' untuk gaya hidup '.self::LABEL[$persona].'.';
    }
}
