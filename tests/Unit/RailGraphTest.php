<?php

namespace Tests\Unit;

use App\Services\RailGraph;
use PHPUnit\Framework\TestCase;

class RailGraphTest extends TestCase
{
    public function test_jalur_terpendek_mengikuti_percabangan(): void
    {
        // Dua lintasan berbagi simpul tengah: A–T–B dan T–C.
        $graf = new RailGraph([
            [[106.80, -6.50], [106.80, -6.49], [106.80, -6.48]],
            [[106.80, -6.48], [106.80, -6.46]],
            [[106.80, -6.48], [106.82, -6.48]],
        ]);

        $hasil = $graf->jalur([106.8001, -6.5001], [106.8001, -6.4601]);

        $this->assertNotNull($hasil);
        $this->assertCount(4, $hasil['koordinat']);
        $this->assertEqualsWithDelta(4448, $hasil['meter'], 30);
    }

    public function test_jalur_null_bila_titik_sama(): void
    {
        $graf = new RailGraph([[[106.80, -6.50], [106.80, -6.49]]]);
        $this->assertNull($graf->jalur([106.80, -6.50], [106.80, -6.50]));
    }
}
