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

    private const INTI = [
        3 => 'Sangat mendukung aktivitasmu',
        2 => 'Cukup mendukung aktivitasmu',
        1 => 'Mungkin kurang optimal',
        0 => 'Belum mendukung aktivitasmu',
    ];

    /**
     * Kalimat kesimpulan titik. Dengan $fakta (nama dan jarak fasilitas utama terdekat) kalimatnya menyebut alasannya,
     * mis. "Buat gaya hidup Commuter: Cukup mendukung aktivitasmu karena terdapat Stasiun Tanjung Barat
     * yang berjarak 2 km dari lokasi."
     *
     * @param  array{nama?: string, meter?: int, jumlah_1km?: int, kualitas_udara?: ?string, banjir?: ?string}|null  $fakta
     */
    public function kesimpulanTitik(string $persona, int $bintang, ?array $fakta = null): string
    {
        $bintang = max(0, min(3, $bintang));
        $awal = 'Buat gaya hidup '.self::LABEL[$persona].': ';
        if (! $fakta || ! isset($fakta['meter'])) {
            return $awal.self::FRASA[$bintang];
        }

        $baik = $bintang >= 2;
        $jarak = self::jarakTeks($fakta['meter']);
        $nama = trim($fakta['nama'] ?? '');
        $alasan = match ($persona) {
            'commuter' => $baik
                ? 'terdapat Stasiun '.($nama ?: 'kereta')." yang berjarak {$jarak} dari lokasi"
                : 'stasiun terdekat'.($nama ? " ({$nama})" : '')." berjarak {$jarak} dari lokasi",
            'driver' => $baik
                ? 'terdapat Gerbang Tol '.($nama ?: 'terdekat')." yang berjarak {$jarak} dari lokasi"
                : 'gerbang tol terdekat'.($nama ? " ({$nama})" : '')." berjarak {$jarak} dari lokasi",
            'social_vibe' => ($fakta['jumlah_1km'] ?? 0) > 0
                ? "terdapat {$fakta['jumlah_1km']} kafe, restoran, dan tempat aktivitas dalam radius 1 km, yang terdekat ".($nama ?: 'berjarak')." {$jarak}"
                : 'tempat nongkrong terdekat'.($nama ? " ({$nama})" : '')." berjarak {$jarak} dari lokasi",
            'zen' => 'kualitas udara '.str_replace('_', ' ', (string) ($fakta['kualitas_udara'] ?? 'belum diketahui'))
                .' dan ruang hijau terdekat'.($nama ? " ({$nama})" : '')." berjarak {$jarak}",
            default => '',
        };
        $kalimat = $awal.self::INTI[$bintang].' karena '.$alasan.'.';
        if ($persona === 'zen' && in_array($fakta['banjir'] ?? null, ['sedang', 'tinggi'], true)) {
            $kalimat .= " Perhatikan: lokasi ini berada di area bahaya banjir kelas {$fakta['banjir']}.";
        }

        return $bintang <= 1 ? $kalimat.' Pertimbangkan lokasi lain.' : $kalimat;
    }

    /** "450 m" atau "2,1 km". */
    public static function jarakTeks(int|float $meter): string
    {
        return $meter < 1000 ? (int) (round($meter / 10) * 10).' m' : number_format($meter / 1000, 1, ',', '.').' km';
    }

    public function kesimpulanWilayah(string $persona, bool $cocok): string
    {
        return ($cocok ? 'Cocok' : 'Belum cocok').' untuk gaya hidup '.self::LABEL[$persona].'.';
    }
}
