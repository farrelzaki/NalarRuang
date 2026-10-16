<?php

namespace App\Services;

use SplPriorityQueue;

/**
 * Graf jalur rel dari kumpulan LineString (koordinat [lng, lat]) dan jalur terpendek Dijkstra.
 * Logika murni: tanpa HTTP dan tanpa basis data, agar bisa dites (CLAUDE.md).
 */
class RailGraph
{
    /** @var array<string, array{0: float, 1: float}> */
    private array $simpul = [];

    /** @var array<string, array<string, float>> */
    private array $tetangga = [];

    /** @param list<list<array{0: float, 1: float}>> $garis */
    public function __construct(array $garis)
    {
        foreach ($garis as $koordinat) {
            for ($i = 0; $i < count($koordinat) - 1; $i++) {
                $a = $this->kunci($koordinat[$i]);
                $b = $this->kunci($koordinat[$i + 1]);
                if ($a === $b) {
                    continue;
                }
                $this->simpul[$a] = $koordinat[$i];
                $this->simpul[$b] = $koordinat[$i + 1];
                $d = self::meter($koordinat[$i], $koordinat[$i + 1]);
                $this->tetangga[$a][$b] = min($d, $this->tetangga[$a][$b] ?? INF);
                $this->tetangga[$b][$a] = min($d, $this->tetangga[$b][$a] ?? INF);
            }
        }
    }

    public function jumlahSimpul(): int
    {
        return count($this->simpul);
    }

    /**
     * Jalur terpendek dari titik terdekat ke $dari sampai titik terdekat ke $ke.
     *
     * @return array{koordinat: list<array{0: float, 1: float}>, meter: float}|null
     */
    public function jalur(array $dari, array $ke): ?array
    {
        $awal = $this->terdekat($dari);
        $akhir = $this->terdekat($ke);
        if ($awal === null || $akhir === null || $awal === $akhir) {
            return null;
        }

        $jarak = [$awal => 0.0];
        $asal = [];
        $antrian = new SplPriorityQueue();
        $antrian->insert($awal, 0);
        $selesai = [];

        while (! $antrian->isEmpty()) {
            $u = $antrian->extract();
            if (isset($selesai[$u])) {
                continue;
            }
            if ($u === $akhir) {
                break;
            }
            $selesai[$u] = true;
            foreach ($this->tetangga[$u] ?? [] as $v => $w) {
                $baru = $jarak[$u] + $w;
                if ($baru < ($jarak[$v] ?? INF)) {
                    $jarak[$v] = $baru;
                    $asal[$v] = $u;
                    $antrian->insert($v, -$baru);
                }
            }
        }

        if (! isset($jarak[$akhir])) {
            return null;
        }

        $urut = [$akhir];
        while (end($urut) !== $awal) {
            $urut[] = $asal[end($urut)];
        }

        return [
            'koordinat' => array_map(fn ($k) => $this->simpul[$k], array_reverse($urut)),
            'meter' => $jarak[$akhir],
        ];
    }

    private function terdekat(array $titik): ?string
    {
        $terbaik = null;
        $min = INF;
        foreach ($this->simpul as $k => $p) {
            $d = ($p[0] - $titik[0]) ** 2 + ($p[1] - $titik[1]) ** 2;
            if ($d < $min) {
                $min = $d;
                $terbaik = $k;
            }
        }

        return $terbaik;
    }

    private function kunci(array $p): string
    {
        return round($p[0], 5).','.round($p[1], 5);
    }

    /** Jarak haversine dalam meter antara dua titik [lng, lat]. */
    public static function meter(array $a, array $b): float
    {
        $r = 6371000;
        $la1 = deg2rad($a[1]);
        $la2 = deg2rad($b[1]);
        $dla = $la2 - $la1;
        $dlo = deg2rad($b[0] - $a[0]);
        $h = sin($dla / 2) ** 2 + cos($la1) * cos($la2) * sin($dlo / 2) ** 2;

        return 2 * $r * asin(min(1, sqrt($h)));
    }
}
