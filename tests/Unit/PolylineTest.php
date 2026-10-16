<?php

namespace Tests\Unit;

use App\Services\Polyline;
use PHPUnit\Framework\TestCase;

class PolylineTest extends TestCase
{
    public function test_contoh_resmi_google_presisi_5(): void
    {
        // Contoh dokumentasi Google: (38.5,-120.2), (40.7,-120.95), (43.252,-126.453).
        $this->assertSame(
            [[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]],
            Polyline::decode('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5),
        );
    }

    public function test_kosong(): void
    {
        $this->assertSame([], Polyline::decode(''));
    }
}
