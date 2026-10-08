<?php

namespace Tests\Unit;

use App\Services\RuteTransit;
use PHPUnit\Framework\TestCase;

class RuteTransitTest extends TestCase
{
    /** Potongan respons /fares Commute Data API: KRL Bogor, transfer jalan kaki, lalu TransJakarta. */
    private function tarif(): array
    {
        return [
            'legs' => [
                ['type' => 'RIDE', 'line' => 'KCI:B', 'operator' => 'KCI', 'from' => ['id' => 'KCI-BOO', 'name' => 'Bogor'], 'to' => ['id' => 'KCI-CW', 'name' => 'Cawang'],
                    'stops' => [['id' => 'KCI-BOO'], ['id' => 'KCI-DP'], ['id' => 'KCI-CW']], 'distanceM' => 39000],
                ['type' => 'TRANSFER', 'from' => ['id' => 'KCI-CW', 'name' => 'Cawang'], 'to' => ['id' => 'TJ-X', 'name' => 'Cikoko'], 'distanceM' => 600],
                ['type' => 'RIDE', 'line' => 'TJ:9', 'operator' => 'TJ', 'from' => ['id' => 'TJ-X', 'name' => 'Cikoko'], 'to' => ['id' => 'TJ-Y', 'name' => 'Pancoran'],
                    'stops' => [['id' => 'TJ-X'], ['id' => 'TJ-Y']], 'distanceM' => 3000],
            ],
            'segments' => [['fare' => 5000], ['fare' => 3500]],
            'totalFare' => 8500,
        ];
    }

    private function koordinat(): array
    {
        return [
            'KCI-BOO' => [106.79, -6.59], 'KCI-DP' => [106.82, -6.40], 'KCI-CW' => [106.86, -6.24],
            'TJ-X' => [106.86, -6.243], 'TJ-Y' => [106.84, -6.243],
        ];
    }

    public function test_rakit_rute_multimoda(): void
    {
        $dipanggil = [];
        $rute = (new RuteTransit())->rakit($this->tarif(), $this->koordinat(), ['KCI:B' => 'Lin Bogor'], function (string $jenis, array $p, array $q) use (&$dipanggil) {
            $dipanggil[] = $jenis;

            return [$p, [($p[0] + $q[0]) / 2, ($p[1] + $q[1]) / 2], $q];
        });

        $this->assertNotNull($rute);
        $this->assertSame(['krl', 'krl'], $dipanggil, 'Hanya ruas KRL yang mengikuti rel; TransJakarta lurus antarhalte.');
        $this->assertCount(2, $rute['garis']);
        $this->assertCount(5, $rute['garis'][0]);
        $this->assertCount(1, $rute['transfer']);
        $this->assertSame(8500, $rute['biaya']);
        // 39000/650 + 5 tunggu = 65; transfer 600/70 = 9; 3000/300 + 4 = 14.
        $this->assertSame(88, $rute['menit']);
        $this->assertSame(['KRL Bogor 65 mnt', 'Pindah 600 m', 'TransJakarta 9 14 mnt'], $rute['rincian']);
        $this->assertSame(['KCI-BOO', 'KCI-CW', 'TJ-X', 'TJ-Y'], array_column($rute['stasiun'], 'id'));
    }

    public function test_tarif_kosong_dijumlah_dari_segmen(): void
    {
        $tarif = $this->tarif();
        $tarif['totalFare'] = null;

        $rute = (new RuteTransit())->rakit($tarif, $this->koordinat(), [], fn () => null);

        $this->assertSame(8500, $rute['biaya']);
    }

    public function test_tanpa_ruas_null(): void
    {
        $this->assertNull((new RuteTransit())->rakit(['legs' => []], [], [], fn () => null));
    }
}
