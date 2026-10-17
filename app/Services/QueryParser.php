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

    /** Kata umum yang dibuang sebelum mencari nama kelurahan/kecamatan (FR-05). */
    private const KATA_UMUM = [
        'di', 'ke', 'dari', 'yang', 'yg', 'dan', 'atau', 'dengan', 'untuk', 'dekat', 'sekitar', 'daerah', 'kawasan', 'area', 'wilayah',
        'kota', 'kabupaten', 'kab', 'kecamatan', 'kec', 'kelurahan', 'kel', 'desa', 'mudah', 'akses', 'cari', 'rumah', 'hunian',
        'tinggal', 'saya', 'aku', 'ingin', 'mau', 'banyak', 'punya', 'ada', 'tidak', 'bebas', 'aman', 'jauh', 'anti', 'tanpa', 'banjir',
        'bagus', 'enak', 'murah', 'strategis', 'nyaman', 'sekali', 'banget', 'pusat', 'utara', 'selatan', 'barat', 'timur',
        'near', 'in', 'at', 'the', 'a', 'an', 'and', 'or', 'with', 'to', 'of', 'no', 'without', 'avoid', 'away', 'from', 'free',
        'safe', 'flood', 'flooding', 'home', 'house', 'live', 'living', 'close', 'city', 'district', 'village', 'nice', 'good', 'cheap',
    ];

    /**
     * @return array{persona: list<string>, kota: list<string>, hindari_banjir: bool, nama_wilayah: ?string}
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

        return ['persona' => $persona, 'kota' => $kota, 'hindari_banjir' => $hindariBanjir, 'nama_wilayah' => $this->sisaNama($teks)];
    }

    /**
     * Sisa kata setelah kata kunci persona, kota, dan kata umum dibuang; dianggap calon nama kelurahan/kecamatan.
     * Contoh: "Kecamatan Cibubur" -> "cibubur"; "dekat stasiun di Bogor" -> null.
     */
    private function sisaNama(string $teks): ?string
    {
        $kunci = array_merge(...array_values(self::KAMUS));
        $sisa = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $teks);
        foreach ($kunci as $k) {
            if (str_contains($k, ' ')) {
                $sisa = str_replace($k, ' ', $sisa);
            }
        }
        $kata = array_filter(preg_split('/\s+/', $sisa), fn ($w) => $w !== ''
            && ! in_array($w, self::KATA_UMUM, true) && ! in_array($w, self::KOTA, true) && ! in_array($w, $kunci, true));
        $nama = trim(implode(' ', $kata));

        return mb_strlen($nama) >= 3 ? $nama : null;
    }
}
