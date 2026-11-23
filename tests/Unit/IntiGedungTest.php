<?php

namespace Tests\Unit;

use App\Services\IntiGedung;
use PHPUnit\Framework\TestCase;

class IntiGedungTest extends TestCase
{
    /**
     * Gedung berkoridor tengah sepanjang $panjang m: dua deret unit selebar $w saling berhadapan, berjarak $seberang antarpusat.
     *
     * @return list<array{0: float, 1: float}>
     */
    private function deret(float $panjang, float $w, float $seberang): array
    {
        $pusat = [];
        $n = (int) floor($panjang / $w);
        foreach ([0.0, $seberang] as $y) {
            for ($k = 0; $k < $n; $k++) {
                $pusat[] = [($k + 0.5) * $w, $y];
            }
        }

        return $pusat;
    }

    public function test_slot_mengikuti_lebar_muka_inti(): void
    {
        $this->assertSame(2, IntiGedung::slot('apartemen', 'lift', 4.2));
        $this->assertSame(1, IntiGedung::slot('apartemen', 'tangga', 4.2));
        $this->assertSame(3, IntiGedung::slot('apartemen', 'lift', 3.0));
        $this->assertSame(1, IntiGedung::slot('kos', 'tangga', 3.0));
        $this->assertSame(2, IntiGedung::slot('kos', 'tangga', 2.0));
        $this->assertSame(0, IntiGedung::slot('kos', 'lift', 3.0), 'kos tanpa lift');
    }

    public function test_apartemen_60_m_inti_lift_dekat_acuan_dan_tangga_di_kedua_sayap(): void
    {
        $pusat = $this->deret(60, 4.2, 10);
        $zona = array_fill(0, count($pusat), 0);
        $inti = IntiGedung::pilih('apartemen', 5, $pusat, $zona, [0 => [30.0, -3.0]], 4.2, 10);

        $this->assertSame('lift', $inti[0]['fungsi']);
        $this->assertTrue($inti[0]['utama']);
        $this->assertCount(2, $inti[0]['unit']);
        // Slot inti utama bersebelahan di deret yang sama (y sama), di dekat titik acuan.
        [$a, $b] = $inti[0]['unit'];
        $this->assertSame($pusat[$a][1], $pusat[$b][1]);
        $this->assertEqualsWithDelta(4.2, abs($pusat[$a][0] - $pusat[$b][0]), 1e-6);
        $this->assertLessThan(5, abs($pusat[$a][0] - 30));

        $tangga = array_values(array_filter($inti, fn ($g) => $g['fungsi'] === 'tangga'));
        $this->assertCount(2, $tangga, 'satu tangga di tiap sayap');
        $x = array_map(fn ($g) => $pusat[$g['unit'][0]][0], $tangga);
        sort($x);
        $this->assertLessThan(15, $x[0]);
        $this->assertGreaterThan(45, $x[1]);
        $this->assertSame(['lift' => 1, 'tangga' => 3, 'slot' => 4], IntiGedung::ringkas($inti));
    }

    public function test_semua_unit_cukup_dekat_ke_inti(): void
    {
        $pusat = $this->deret(150, 3.0, 5.5);
        $zona = array_fill(0, count($pusat), 'a');
        $inti = IntiGedung::pilih('kos', 3, $pusat, $zona, [], 3.0, 5.5);
        $pakai = array_merge(...array_map(fn ($g) => $g['unit'], $inti));
        foreach ($pusat as $i => $p) {
            if (in_array($i, $pakai, true)) {
                continue;
            }
            $d = min(array_map(fn ($j) => hypot($p[0] - $pusat[$j][0], $p[1] - $pusat[$j][1]), $pakai));
            $this->assertLessThanOrEqual(IntiGedung::JARAK_MAKS + 1e-6, $d);
        }
        $this->assertNotEmpty($inti);
        foreach ($inti as $g) {
            $this->assertSame('tangga', $g['fungsi'], 'kos tanpa lift');
            $this->assertCount(1, $g['unit'], 'tangga kos selebar satu kamar');
        }
    }

    public function test_satu_lantai_atau_gedung_kecil_tanpa_inti(): void
    {
        $pusat = $this->deret(60, 3.0, 5.5);
        $zona = array_fill(0, count($pusat), 0);
        $this->assertSame([], IntiGedung::pilih('kos', 1, $pusat, $zona, [], 3.0, 5.5));
        $this->assertSame([], IntiGedung::pilih('rumah', 3, $pusat, $zona, [], 3.0, 5.5));
        $this->assertSame([], IntiGedung::pilih('apartemen', 4, [[0.0, 0.0], [4.2, 0.0], [8.4, 0.0]], [0, 0, 0], [], 4.2, 10));
    }

    public function test_tiap_zona_bangunan_punya_inti_sendiri(): void
    {
        $a = $this->deret(30, 3.0, 5.5);
        $b = array_map(fn ($p) => [$p[0] + 200, $p[1]], $a);
        $pusat = [...$a, ...$b];
        $zona = [...array_fill(0, count($a), 1), ...array_fill(0, count($b), 2)];
        $inti = IntiGedung::pilih('kos', 2, $pusat, $zona, [], 3.0, 5.5);
        $utama = array_values(array_filter($inti, fn ($g) => $g['utama']));
        $this->assertCount(2, $utama);
        $this->assertSame(1, $zona[$utama[0]['unit'][0]]);
        $this->assertSame(2, $zona[$utama[1]['unit'][0]]);
    }
}
