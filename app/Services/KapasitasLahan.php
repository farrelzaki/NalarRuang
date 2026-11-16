<?php

namespace App\Services;

/**
 * Estimasi kapasitas lahan untuk Uji Lahan (FR-23, terinspirasi TestFit). Logika murni: tanpa HTTP, tanpa basis data.
 *
 * Tiga tipe bangunan:
 * - rumah     : jumlah rumah = jumlah kavling yang benar-benar muat di lahan (dihitung geometris di PostGIS);
 *               kelas ini menghitung intensitas per kavling dan angka turunannya.
 * - kos       : satu bangunan bertingkat rendah; KDB/KLB "Alternatif 1" RDTR (tapak).
 * - apartemen : bangunan vertikal; KDB/KLB "Alternatif 2" RDTR (intensitas tinggi).
 *
 * Intensitas (KDB/KLB) diambil dari zona RDTR DKI 2022 bila ada; di luar DKI atau bila zona tidak punya angka,
 * dipakai ASUMSI dan respons menandainya sebagai asumsi. Semua angka bawaan di satu tempat supaya mudah disetel.
 */
class KapasitasLahan
{
    public const TIPE = ['rumah', 'kos', 'apartemen'];

    /** Asumsi bawaan per tipe; bisa diubah pengguna dalam rentang RENTANG. */
    public const BAWAAN = [
        'rumah' => ['lebar_kavling' => 6.0, 'panjang_kavling' => 15.0, 'lebar_jalan' => 8.0],
        'kos' => ['luas_kamar' => 12.0, 'sempadan' => 2.0, 'lantai' => null, 'rasio_parkir' => 0.2],
        'apartemen' => ['porsi_studio' => 0.3, 'porsi_2br' => 0.2, 'sempadan' => 5.0, 'lantai' => null, 'rasio_parkir' => 0.5],
    ];

    /** Rentang masukan asumsi [min, max]. */
    public const RENTANG = [
        'lebar_kavling' => [4, 20],
        'panjang_kavling' => [8, 30],
        'lebar_jalan' => [4, 15],
        'luas_kamar' => [6, 30],
        'porsi_studio' => [0, 1],
        'porsi_2br' => [0, 1],
        'sempadan' => [0, 15],
        'lantai' => [1, 60],
        'rasio_parkir' => [0, 2],
    ];

    /** Luas tiap tipe unit apartemen (m²) dan warna tampilannya mengikuti pola TestFit (hijau/biru/ungu). */
    public const LUAS_TIPE = ['studio' => 24.0, '1br' => 36.0, '2br' => 54.0];

    /**
     * Penampang gedung bergaya koridor tengah (double-loaded): kedalaman satu deret unit dan lebar koridor (m).
     * Kos memakai kamar 3 x 4 m; apartemen unit sedalam 8 m.
     */
    public const KEDALAMAN_UNIT = ['kos' => 4.0, 'apartemen' => 8.0];

    public const LEBAR_KORIDOR = ['kos' => 1.5, 'apartemen' => 2.0];

    /** Satu slot parkir mobil 2,5 x 5 m dengan lorong 6 m. */
    public const SLOT_PARKIR = ['lebar' => 2.5, 'panjang' => 5.0, 'lorong' => 6.0];

    /** Intensitas asumsi bila zona RDTR tidak tersedia (KDB dalam persen, KLB rasio). */
    public const ASUMSI_INTENSITAS = [
        'rumah' => ['kdb' => 60.0, 'klb' => 1.2],
        'kos' => ['kdb' => 60.0, 'klb' => 1.8],
        'apartemen' => ['kdb' => 40.0, 'klb' => 4.0],
    ];

    /** Batas lantai per tipe (kos dianggap bangunan rendah, apartemen bangunan tinggi). */
    public const LANTAI_MAKS = ['rumah' => 3, 'kos' => 4, 'apartemen' => 40];

    /** Alternatif intensitas RDTR yang dipakai: 1 untuk bangunan tapak/rendah, 2 untuk bangunan vertikal. */
    public const ALTERNATIF = ['rumah' => 1, 'kos' => 1, 'apartemen' => 2];

    /**
     * Gabungkan asumsi pengguna dengan bawaan, dijepit ke RENTANG. Kunci yang tidak dikenal dibuang.
     *
     * @param  array<string, mixed>  $masukan
     * @return array<string, float|int|null>
     */
    public function asumsi(string $tipe, array $masukan): array
    {
        $hasil = self::BAWAAN[$tipe];
        foreach ($hasil as $kunci => $bawaan) {
            if (! array_key_exists($kunci, $masukan) || $masukan[$kunci] === null || $masukan[$kunci] === '') {
                continue;
            }
            if (! is_numeric($masukan[$kunci])) {
                continue;
            }
            [$min, $max] = self::RENTANG[$kunci];
            $nilai = (float) max($min, min($max, (float) $masukan[$kunci]));
            $hasil[$kunci] = $kunci === 'lantai' ? (int) round($nilai) : $nilai;
        }

        // Porsi studio + 2 kamar paling banyak 100 %; sisanya 1 kamar.
        if (isset($hasil['porsi_studio'], $hasil['porsi_2br']) && $hasil['porsi_studio'] + $hasil['porsi_2br'] > 1) {
            $hasil['porsi_2br'] = round(1 - $hasil['porsi_studio'], 4);
        }

        return $hasil;
    }

    /**
     * Baca intensitas RDTR DKI. Angka tunggal dipakai langsung ("55", "1,2"). Teks bertingkat menurut luas persil (LP),
     * mis. "- Luas LP kurang dari 60 m2 : Alternatif 1 : 1.2, Alternatif 2 : 3.6, - Luas LP 60 m2 - 120 m2 : ...",
     * dipilih tingkat yang memuat $luasPersil dan nilai Alternatif yang diminta. null bila tidak terbaca.
     */
    public static function intensitas(?string $teks, float $luasPersil, int $alternatif = 1): ?float
    {
        $teks = trim((string) $teks);
        if ($teks === '' || strtolower($teks) === 'null') {
            return null;
        }

        $tunggal = str_replace(',', '.', $teks);
        if (preg_match('/^\d+(\.\d+)?$/', $tunggal)) {
            return (float) $tunggal;
        }

        $tingkat = self::tingkat($teks);
        if ($tingkat === []) {
            return null;
        }

        foreach ($tingkat as $t) {
            $diAtasMin = $t['min'] === null || $luasPersil > $t['min'] || ($t['min'] == 0.0 && $luasPersil >= 0);
            $diBawahMax = $t['max'] === null || $luasPersil <= $t['max'];
            if ($diAtasMin && $diBawahMax) {
                return $t['nilai'][$alternatif] ?? $t['nilai'][1] ?? null;
            }
        }

        // Luas di luar semua tingkat (mis. teks hanya memuat tingkat > 240 m² tetapi lahan lebih kecil): pakai tingkat terdekat.
        $pertama = $tingkat[0];
        $terakhir = $tingkat[count($tingkat) - 1];
        $pilih = ($pertama['min'] !== null && $luasPersil <= $pertama['min']) ? $pertama : $terakhir;

        return $pilih['nilai'][$alternatif] ?? $pilih['nilai'][1] ?? null;
    }

    /**
     * Pecah teks bertingkat menjadi daftar [min, max, nilai[alternatif]]; min eksklusif, max inklusif, null = tak berbatas.
     *
     * @return list<array{min: ?float, max: ?float, nilai: array<int, float>}>
     */
    public static function tingkat(string $teks): array
    {
        $hasil = [];
        foreach (preg_split('/-\s*Luas\s+LP/i', $teks) ?: [] as $bagian) {
            $bagian = trim($bagian);
            if ($bagian === '' || ! str_contains(strtolower($bagian), 'alternatif')) {
                continue;
            }

            $posisi = stripos($bagian, 'alternatif');
            $kepala = substr($bagian, 0, (int) $posisi);
            preg_match_all('/\d+(?:[.,]\d+)?/', str_replace('m2', '', strtolower($kepala)), $angka);
            $angka = array_map(fn ($x) => (float) str_replace(',', '.', $x), $angka[0]);

            $kurang = str_contains(strtolower($kepala), 'kurang');
            if ($kurang && count($angka) >= 1) {
                [$min, $max] = [0.0, $angka[0]];
            } elseif (count($angka) >= 2) {
                [$min, $max] = [$angka[0], $angka[1]];
            } elseif (count($angka) === 1) {
                [$min, $max] = [$angka[0], null];
            } else {
                continue;
            }

            $nilai = [];
            if (preg_match_all('/Alternatif\s*(\d)\s*:\s*(\d+(?:[.,]\d+)?)/i', $bagian, $alt, PREG_SET_ORDER)) {
                foreach ($alt as $a) {
                    $nilai[(int) $a[1]] = (float) str_replace(',', '.', $a[2]);
                }
            }
            if ($nilai === []) {
                continue;
            }

            $hasil[] = ['min' => $min, 'max' => $max, 'nilai' => $nilai];
        }

        usort($hasil, fn ($a, $b) => ($a['min'] ?? 0) <=> ($b['min'] ?? 0));

        return $hasil;
    }

    /**
     * Rumah tapak: angka turunan dari jumlah kavling yang muat (hasil PostGIS).
     *
     * @param  array{lebar_kavling: float, panjang_kavling: float, lebar_jalan: float}  $asumsi
     * @return array<string, mixed>
     */
    public function rumah(float $luasLahan, int $jumlahKavling, array $asumsi, ?float $kdbPersen, ?float $klb): array
    {
        $luasKavling = $asumsi['lebar_kavling'] * $asumsi['panjang_kavling'];
        $luasSemuaKavling = $jumlahKavling * $luasKavling;
        $kdb = $kdbPersen ?? self::ASUMSI_INTENSITAS['rumah']['kdb'];
        $klbPakai = $klb ?? self::ASUMSI_INTENSITAS['rumah']['klb'];

        $tapakPerRumah = $luasKavling * $kdb / 100;
        $lantaiMaks = $tapakPerRumah > 0 ? max(1, min(self::LANTAI_MAKS['rumah'], (int) floor($klbPakai * $luasKavling / $tapakPerRumah + 1e-9))) : 0;
        $luasBangunanPerRumah = min($klbPakai * $luasKavling, $tapakPerRumah * $lantaiMaks);

        return [
            'jumlah' => $jumlahKavling,
            'satuan' => 'rumah',
            'luas_kavling_m2' => round($luasKavling, 1),
            'luas_tapak_per_unit_m2' => round($tapakPerRumah, 1),
            'luas_bangunan_per_unit_m2' => round($luasBangunanPerRumah, 1),
            'lantai' => $lantaiMaks,
            'lantai_maks' => $lantaiMaks,
            'luas_tapak_m2' => round($tapakPerRumah * $jumlahKavling, 1),
            'luas_lantai_m2' => round($luasBangunanPerRumah * $jumlahKavling, 1),
            'porsi_jalan_fasum' => $luasLahan > 0 ? round(max(0, 1 - $luasSemuaKavling / $luasLahan), 3) : null,
            'kepadatan_per_ha' => $luasLahan > 0 ? round($jumlahKavling / ($luasLahan / 10000), 1) : null,
        ];
    }

    /**
     * Kos atau apartemen: satu massa bangunan di dalam lahan.
     *
     * $luasTapakTersedia = luas lahan setelah dikurangi sempadan (dari PostGIS). Tapak dibatasi KDB × luas lahan,
     * total lantai dibatasi KLB × luas lahan, jumlah lantai dibatasi LANTAI_MAKS dan pilihan pengguna.
     *
     * @param  array<string, float|int|null>  $asumsi
     * @return array<string, mixed>
     */
    public function bangunan(string $tipe, float $luasLahan, float $luasTapakTersedia, array $asumsi, ?float $kdbPersen, ?float $klb): array
    {
        $kdb = $kdbPersen ?? self::ASUMSI_INTENSITAS[$tipe]['kdb'];
        $klbPakai = $klb ?? self::ASUMSI_INTENSITAS[$tipe]['klb'];
        $luasPerUnit = $tipe === 'kos' ? (float) $asumsi['luas_kamar'] : $this->luasRataUnit($asumsi);
        $efisiensi = self::EFISIENSI_CADANGAN;

        $tapak = max(0.0, min($luasTapakTersedia, $luasLahan * $kdb / 100));
        $totalLantaiMaks = $luasLahan * $klbPakai;

        if ($tapak <= 0 || $totalLantaiMaks <= 0) {
            return $this->kosong($tipe, $tapak);
        }

        $lantaiMaks = max(1, min(self::LANTAI_MAKS[$tipe], (int) floor($totalLantaiMaks / $tapak + 1e-9)));
        $lantai = $asumsi['lantai'] !== null ? max(1, min($lantaiMaks, (int) $asumsi['lantai'])) : $lantaiMaks;
        $luasLantai = min($tapak * $lantai, $totalLantaiMaks);
        $jumlah = (int) floor($luasLantai * $efisiensi / $luasPerUnit + 1e-9);

        return [
            'jumlah' => $jumlah,
            'satuan' => $tipe === 'kos' ? 'kamar' : 'unit',
            'luas_per_unit_m2' => $luasPerUnit,
            'lantai' => $lantai,
            'lantai_maks' => $lantaiMaks,
            'luas_tapak_m2' => round($tapak, 1),
            'luas_lantai_m2' => round($luasLantai, 1),
            'porsi_tapak' => $luasLahan > 0 ? round($tapak / $luasLahan, 3) : null,
            'kepadatan_per_ha' => $luasLahan > 0 ? round($jumlah / ($luasLahan / 10000), 1) : null,
        ];
    }

    /** Efisiensi lantai untuk hitungan cadangan (lahan terlalu sempit untuk gedung berkoridor). */
    public const EFISIENSI_CADANGAN = 0.75;

    /** Porsi tiap tipe unit apartemen dari asumsi (jumlahnya 1). @return array{studio: float, 1br: float, 2br: float} */
    public function porsiTipe(array $asumsi): array
    {
        $studio = (float) ($asumsi['porsi_studio'] ?? self::BAWAAN['apartemen']['porsi_studio']);
        $dua = (float) ($asumsi['porsi_2br'] ?? self::BAWAAN['apartemen']['porsi_2br']);

        return ['studio' => $studio, '1br' => max(0.0, 1 - $studio - $dua), '2br' => $dua];
    }

    /** Luas rata-rata satu unit apartemen menurut komposisi (m²). */
    public function luasRataUnit(array $asumsi): float
    {
        $luas = 0.0;
        foreach ($this->porsiTipe($asumsi) as $t => $porsi) {
            $luas += $porsi * self::LUAS_TIPE[$t];
        }

        return $luas;
    }

    /** Lebar muka satu unit/kamar di sepanjang koridor (m): luas dibagi kedalaman deret. */
    public function lebarUnit(string $tipe, array $asumsi): float
    {
        $luas = $tipe === 'kos' ? (float) $asumsi['luas_kamar'] : $this->luasRataUnit($asumsi);

        return round($luas / self::KEDALAMAN_UNIT[$tipe], 3);
    }

    /** Tebal gedung berkoridor tengah: dua deret unit + koridor (m). */
    public static function tebalGedung(string $tipe): float
    {
        return 2 * self::KEDALAMAN_UNIT[$tipe] + self::LEBAR_KORIDOR[$tipe];
    }

    /**
     * Urutan tipe untuk $n petak unit, disebar merata mengikuti porsi (petak bersebelahan tidak menumpuk satu tipe).
     * Tiap langkah memilih tipe yang paling tertinggal dari targetnya.
     *
     * @param  array<string, float>  $porsi
     * @return list<string>
     */
    public static function sebarTipe(int $n, array $porsi): array
    {
        $porsi = array_filter($porsi, fn ($p) => $p > 0);
        if ($n <= 0 || $porsi === []) {
            return [];
        }
        $total = array_sum($porsi);
        $hitung = array_fill_keys(array_keys($porsi), 0);
        $hasil = [];
        for ($i = 1; $i <= $n; $i++) {
            $pilih = null;
            $kurang = -INF;
            foreach ($porsi as $t => $p) {
                $selisih = $p / $total * $i - $hitung[$t];
                if ($selisih > $kurang + 1e-9) {
                    $kurang = $selisih;
                    $pilih = $t;
                }
            }
            $hitung[$pilih]++;
            $hasil[] = $pilih;
        }

        return $hasil;
    }

    /**
     * Porsi lingkar gedung yang dipertahankan (0–1) supaya tapak tidak melebihi KDB. Gedung lalu "dipotong" seperti
     * huruf C/U, mirip bentuk yang dihasilkan TestFit pada lahan sempit.
     */
    public static function porsiLingkar(float $luasLahan, float $kdbPersen, float $luasCincin): float
    {
        if ($luasCincin <= 0) {
            return 0.0;
        }

        return round(min(1.0, $luasLahan * $kdbPersen / 100 / $luasCincin), 4);
    }

    /**
     * Gedung berkoridor tengah yang mengikuti tepi lahan: jumlah unit = petak per lantai (geometris) x jumlah lantai.
     * Lantai dibatasi KLB (total luas lantai) dan LANTAI_MAKS; pengguna boleh memilih lebih sedikit.
     *
     * @param  array<string, float|int|null>  $asumsi
     * @param  list<string>  $urutanTipe  tipe tiap petak di satu lantai (dari sebarTipe)
     * @return array<string, mixed>
     */
    public function gedung(string $tipe, float $luasLahan, float $luasTapak, array $urutanTipe, array $asumsi, ?float $kdbPersen, ?float $klb): array
    {
        $klbPakai = $klb ?? self::ASUMSI_INTENSITAS[$tipe]['klb'];
        $perLantai = count($urutanTipe);
        if ($luasTapak <= 0 || $perLantai === 0 || $klbPakai <= 0) {
            return $this->kosong($tipe, $luasTapak) + ['unit_per_lantai' => 0, 'komposisi' => [], 'parkir' => ['butuh' => 0, 'muat' => 0]];
        }

        $lantaiMaks = max(1, min(self::LANTAI_MAKS[$tipe], (int) floor($luasLahan * $klbPakai / $luasTapak + 1e-9)));
        $lantai = $asumsi['lantai'] !== null ? max(1, min($lantaiMaks, (int) $asumsi['lantai'])) : $lantaiMaks;

        $komposisi = array_map(fn ($n) => $n * $lantai, array_count_values($urutanTipe));
        $jumlah = $perLantai * $lantai;

        return [
            'jumlah' => $jumlah,
            'satuan' => $tipe === 'kos' ? 'kamar' : 'unit',
            'luas_per_unit_m2' => round($tipe === 'kos' ? (float) $asumsi['luas_kamar'] : $this->luasRataUnit($asumsi), 1),
            'lantai' => $lantai,
            'lantai_maks' => $lantaiMaks,
            'unit_per_lantai' => $perLantai,
            'komposisi' => $komposisi,
            'luas_tapak_m2' => round($luasTapak, 1),
            'luas_lantai_m2' => round($luasTapak * $lantai, 1),
            'porsi_tapak' => $luasLahan > 0 ? round($luasTapak / $luasLahan, 3) : null,
            'kepadatan_per_ha' => $luasLahan > 0 ? round($jumlah / ($luasLahan / 10000), 1) : null,
            'parkir' => ['butuh' => (int) ceil($jumlah * (float) ($asumsi['rasio_parkir'] ?? 0)), 'muat' => 0],
        ];
    }

    /** Faktor skala tapak (0–1) supaya poligon sempadan di peta luasnya sama dengan tapak yang dihitung. */
    public static function faktorSkala(float $luasTersedia, float $luasTapak): float
    {
        if ($luasTersedia <= 0 || $luasTapak <= 0) {
            return 0.0;
        }

        return min(1.0, sqrt($luasTapak / $luasTersedia));
    }

    /** @return array<string, mixed> */
    private function kosong(string $tipe, float $tapak): array
    {
        return [
            'jumlah' => 0,
            'satuan' => $tipe === 'kos' ? 'kamar' : 'unit',
            'luas_per_unit_m2' => $tipe === 'kos' ? (float) self::BAWAAN['kos']['luas_kamar'] : $this->luasRataUnit([]),
            'lantai' => 0,
            'lantai_maks' => 0,
            'luas_tapak_m2' => round($tapak, 1),
            'luas_lantai_m2' => 0.0,
            'porsi_tapak' => 0.0,
            'kepadatan_per_ha' => 0.0,
        ];
    }
}
