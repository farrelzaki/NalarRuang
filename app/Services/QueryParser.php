<?php

namespace App\Services;

/**
 * Parsing query teks bebas Requirement Search (FR-05, TBD-11): aturan + kamus kecil.
 * Logika murni, bisa dites tanpa HTTP.
 */
class QueryParser
{
    /** Kata kunci Indonesia lalu Inggris (antarmuka dwibahasa). */
    private const KAMUS = [
        'commuter' => ['stasiun', 'krl', 'kereta', 'transit', 'transum', 'mrt', 'lrt', 'halte', 'commuter', 'angkutan umum', 'transportasi umum',
            'station', 'train', 'bus stop', 'public transport', 'commute'],
        'driver' => ['tol', 'mobil', 'jalan raya', 'driver', 'berkendara', 'arteri',
            'toll', 'car', 'highway', 'driving', 'main road'],
        'social_vibe' => ['kafe', 'cafe', 'kopi', 'nongkrong', 'restoran', 'mall', 'mal', 'ramai', 'hiburan', 'kuliner', 'social',
            'café', 'coffee', 'restaurant', 'nightlife', 'entertainment', 'lively', 'food'],
        'zen' => ['hijau', 'taman', 'tenang', 'asri', 'sejuk', 'zen', 'udara', 'sepi', 'alam',
            'green', 'park', 'quiet', 'calm', 'peaceful', 'nature', 'clean air', 'fresh air'],
    ];

    private const KOTA = ['jakarta', 'bogor', 'depok', 'tangerang', 'bekasi'];

    /**
     * @return array{persona: list<string>, kota: list<string>, hindari_banjir: bool}
     */
    public function parse(string $q): array
    {
        $teks = mb_strtolower($q);

        $persona = [];
        foreach (self::KAMUS as $p => $kata) {
            foreach ($kata as $k) {
                if (str_contains($teks, $k)) {
                    $persona[] = $p;
                    break;
                }
            }
        }

        $kota = array_values(array_filter(self::KOTA, fn ($k) => str_contains($teks, $k)));

        $hindariBanjir = (bool) preg_match('/(tidak|bebas|aman|jauh|anti|tanpa)\s+(dari\s+)?banjir/u', $teks)
            || (bool) preg_match('/\b(no|without|avoid|away from|free from|safe from)\s+(the\s+)?flood|flood[\s-]free/u', $teks);

        return ['persona' => $persona, 'kota' => $kota, 'hindari_banjir' => $hindariBanjir];
    }
}
