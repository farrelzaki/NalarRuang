<?php

namespace App\Services;

/**
 * Ruang inti (tangga dan lift) di gedung kos/apartemen Uji Lahan (FR-23). Logika murni: tanpa HTTP, tanpa basis data.
 *
 * Gedung berkoridor tengah diisi unit di sepanjang koridor; beberapa slot unit diganti ruang inti supaya penghuni lantai
 * atas bisa naik-turun:
 * - apartemen: satu inti utama berisi lift + tangga (muka ±7 m), ditambah tangga darurat (muka ±3 m);
 * - kos: tangga (muka ±2,5 m), tanpa lift.
 * Inti utama tiap zona bangunan diletakkan pada unit terdekat ke titik acuan (lobi, gerbang, atau pusat zona). Selama masih
 * ada unit yang berjarak lebih dari JARAK_MAKS dari inti terdekat, tangga ditambah pada unit yang menjangkau unit belum
 * terlayani paling banyak, jadi tangga kira-kira tiap dua kali JARAK_MAKS. Gedung satu lantai tidak butuh inti.
 */
class IntiGedung
{
    /** Lebar muka inti di sepanjang koridor (m), per tipe dan fungsi. */
    public const MUKA = [
        'apartemen' => ['lift' => 7.0, 'tangga' => 3.0],
        'kos' => ['tangga' => 2.5],
    ];

    /** Jarak terjauh unit ke inti terdekat (m), diukur antarpusat. */
    public const JARAK_MAKS = 20.0;

    /** Fungsi inti utama per tipe. */
    public static function fungsiUtama(string $tipe): ?string
    {
        return match ($tipe) {
            'apartemen' => 'lift',
            'kos' => 'tangga',
            default => null,
        };
    }

    /** Jumlah slot unit yang dipakai satu inti: muka inti dibagi lebar unit, dibulatkan ke atas (minimal 1). */
    public static function slot(string $tipe, string $fungsi, float $lebarUnit): int
    {
        $muka = self::MUKA[$tipe][$fungsi] ?? 0.0;
        if ($muka <= 0 || $lebarUnit <= 0) {
            return 0;
        }

        return max(1, (int) ceil($muka / $lebarUnit - 1e-6));
    }

    /**
     * Pilih unit yang menjadi ruang inti.
     *
     * @param  list<array{0: float, 1: float}>  $pusat  pusat tiap unit (meter, proyeksi datar)
     * @param  list<int|string>  $zona  zona bangunan tiap unit (sejajar $pusat)
     * @param  array<int|string, array{0: float, 1: float}>  $acuan  titik acuan inti utama per zona; zona tanpa acuan memakai pusat unitnya
     * @param  float  $lebarUnit  lebar muka satu unit di sepanjang koridor (m)
     * @param  float  $jarakSeberang  jarak antarpusat unit yang saling berhadapan/membelakangi (m); slot satu inti tidak boleh sejauh ini
     * @return list<array{fungsi: string, utama: bool, unit: list<int>}>
     */
    public static function pilih(string $tipe, int $lantai, array $pusat, array $zona, array $acuan, float $lebarUnit, float $jarakSeberang): array
    {
        $utama = self::fungsiUtama($tipe);
        if ($utama === null || $lantai < 2 || $pusat === []) {
            return [];
        }
        $slotUtama = self::slot($tipe, $utama, $lebarUnit);
        $slotTangga = self::slot($tipe, 'tangga', $lebarUnit);

        $perZona = [];
        foreach ($zona as $i => $z) {
            $perZona[(string) $z][] = $i;
        }

        $hasil = [];
        foreach ($perZona as $z => $daftar) {
            // Gedung yang terlalu kecil (inti akan menghabiskan hampir semua unit) dibiarkan tanpa inti.
            if (count($daftar) < $slotUtama + 2) {
                continue;
            }
            $titik = $acuan[$z] ?? self::rata(array_map(fn ($i) => $pusat[$i], $daftar));
            $terpakai = [];
            $inti = [];

            $benih = self::terdekat($daftar, $pusat, $titik);
            $inti[] = ['fungsi' => $utama, 'utama' => true, 'unit' => self::kelompok($benih, $slotUtama, $daftar, $pusat, $terpakai, $lebarUnit, $jarakSeberang)];

            // Tangga tambahan sampai semua unit cukup dekat ke salah satu inti. Tiap tangga baru diletakkan pada unit yang menjangkau
            // unit belum terlayani paling banyak, jadi jumlah tangga sedikit tetapi tidak ada unit yang jauh dari tangga.
            $tetangga = self::tetangga($daftar, $pusat, self::JARAK_MAKS);
            $terlayani = [];
            $layani = function (array $grup) use (&$terlayani, $tetangga) {
                foreach ($grup as $j) {
                    foreach ($tetangga[$j] as $i) {
                        $terlayani[$i] = true;
                    }
                }
            };
            // Jarak tiap unit ke inti terdekat: bila beberapa calon sama baiknya, yang terjauh dari inti dipilih (tangga ke ujung sayap).
            $jarak = array_fill_keys($daftar, INF);
            $catat = function (array $grup) use (&$jarak, $daftar, $pusat) {
                foreach ($daftar as $i) {
                    foreach ($grup as $j) {
                        $jarak[$i] = min($jarak[$i], hypot($pusat[$i][0] - $pusat[$j][0], $pusat[$i][1] - $pusat[$j][1]));
                    }
                }
            };
            $layani($inti[0]['unit']);
            $catat($inti[0]['unit']);
            while (count($terlayani) < count($daftar) && count($daftar) - count($terpakai) > $slotTangga + 1) {
                $pilih = null;
                $skor = 0;
                foreach ($daftar as $i) {
                    if (isset($terpakai[$i])) {
                        continue;
                    }
                    $s = 0;
                    foreach ($tetangga[$i] as $j) {
                        $s += isset($terlayani[$j]) ? 0 : 1;
                    }
                    if ($s > $skor || ($s === $skor && $s > 0 && $jarak[$i] > $jarak[$pilih] + 1e-9)) {
                        $skor = $s;
                        $pilih = $i;
                    }
                }
                if ($pilih === null) {
                    break;
                }
                $grup = self::kelompok($pilih, $slotTangga, $daftar, $pusat, $terpakai, $lebarUnit, $jarakSeberang);
                $inti[] = ['fungsi' => 'tangga', 'utama' => false, 'unit' => $grup];
                $layani($grup);
                $catat($grup);
            }
            array_push($hasil, ...$inti);
        }

        return $hasil;
    }

    /** Ringkasan untuk respons: jumlah inti lift, jumlah tangga (tiap inti punya tangga), dan slot unit per lantai yang dipakai. @param list<array{fungsi: string, unit: list<int>}> $inti */
    public static function ringkas(array $inti): array
    {
        return [
            'lift' => count(array_filter($inti, fn ($g) => $g['fungsi'] === 'lift')),
            'tangga' => count($inti),
            'slot' => array_sum(array_map(fn ($g) => count($g['unit']), $inti)),
        ];
    }

    /**
     * Benih + tetangga terdekat di deret yang sama sampai $slot unit. Tetangga dibatasi sejauh (slot - 1) lebar unit dan lebih dekat
     * daripada unit seberang, jadi inti tidak menyeberang koridor atau melompat ke deret di belakangnya.
     *
     * @param  array<int, true>  $terpakai
     * @return list<int>
     */
    private static function kelompok(int $benih, int $slot, array $daftar, array $pusat, array &$terpakai, float $lebarUnit, float $jarakSeberang): array
    {
        $grup = [$benih];
        $terpakai[$benih] = true;
        $batas = min(($slot - 1) * $lebarUnit + 0.3, $jarakSeberang - 0.3);
        $calon = [];
        foreach ($daftar as $i) {
            if (isset($terpakai[$i])) {
                continue;
            }
            $d = hypot($pusat[$i][0] - $pusat[$benih][0], $pusat[$i][1] - $pusat[$benih][1]);
            if ($d <= $batas) {
                $calon[$i] = $d;
            }
        }
        asort($calon);
        foreach (array_keys($calon) as $i) {
            if (count($grup) >= $slot) {
                break;
            }
            $grup[] = $i;
            $terpakai[$i] = true;
        }
        sort($grup);

        return $grup;
    }

    /**
     * Unit-unit yang berjarak paling jauh $r dari tiap unit (termasuk dirinya), dicari lewat sel kisi selebar $r.
     *
     * @param  list<int>  $daftar
     * @return array<int, list<int>>
     */
    private static function tetangga(array $daftar, array $pusat, float $r): array
    {
        $sel = [];
        foreach ($daftar as $i) {
            $sel[(int) floor($pusat[$i][0] / $r)][(int) floor($pusat[$i][1] / $r)][] = $i;
        }
        $hasil = [];
        foreach ($daftar as $i) {
            $cx = (int) floor($pusat[$i][0] / $r);
            $cy = (int) floor($pusat[$i][1] / $r);
            $hasil[$i] = [];
            for ($dx = -1; $dx <= 1; $dx++) {
                for ($dy = -1; $dy <= 1; $dy++) {
                    foreach ($sel[$cx + $dx][$cy + $dy] ?? [] as $j) {
                        if (hypot($pusat[$i][0] - $pusat[$j][0], $pusat[$i][1] - $pusat[$j][1]) <= $r + 1e-9) {
                            $hasil[$i][] = $j;
                        }
                    }
                }
            }
        }

        return $hasil;
    }

    /** @param list<int> $daftar */
    private static function terdekat(array $daftar, array $pusat, array $titik): int
    {
        $pilih = $daftar[0];
        $min = INF;
        foreach ($daftar as $i) {
            $d = hypot($pusat[$i][0] - $titik[0], $pusat[$i][1] - $titik[1]);
            if ($d < $min - 1e-9) {
                $min = $d;
                $pilih = $i;
            }
        }

        return $pilih;
    }

    /** @param list<array{0: float, 1: float}> $titik */
    private static function rata(array $titik): array
    {
        $n = max(1, count($titik));

        return [array_sum(array_column($titik, 0)) / $n, array_sum(array_column($titik, 1)) / $n];
    }
}
