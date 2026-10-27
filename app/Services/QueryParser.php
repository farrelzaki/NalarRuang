<?php

namespace App\Services;

use RuntimeException;

/**
 * Parsing query teks bebas Requirement Search (FR-05, TBD-11): aturan + kamus.
 * Kamus ada di data/kamus/kamus_pencarian.json (persona, kata pembalik, alias kota, luar cakupan).
 * Logika murni, bisa dites tanpa HTTP.
 */
class QueryParser
{
    private const KAMUS = __DIR__.'/../../data/kamus/kamus_pencarian.json';

    /** Nama kota/kabupaten tanpa penanda: berarti semua wilayah yang namanya memuat kata ini. */
    private const KOTA_UMUM = ['jakarta', 'bogor', 'depok', 'tangerang', 'bekasi'];

    /** Nama tempat di Jabodetabek yang memuat kata luar cakupan ("Medan Satria", "Lebak Bulus"). */
    private const BUKAN_LUAR = ['medan satria', 'lebak bulus', 'lebak wangi', 'lebakwangi', 'bandung baru'];

    /** Pemisah klausa: kata pembalik tidak menyeberanginya. */
    private const PEMISAH = ['dan', 'and', 'tapi', 'but', 'serta', 'atau', 'or', 'namun', 'yang', 'yg', 'di', 'in'];

    /** Kata yang menjadi sasaran pembalik selain persona ("tidak banjir"). */
    private const SASARAN_LAIN = ['banjir', 'flood', 'flooding', 'macet'];

    /** Kata umum yang dibuang sebelum mencari nama kelurahan/kecamatan (FR-05). */
    private const KATA_UMUM = [
        'di', 'ke', 'dari', 'yang', 'yg', 'dan', 'atau', 'dengan', 'untuk', 'dekat', 'sekitar', 'daerah', 'kawasan', 'area', 'wilayah',
        'kota', 'kabupaten', 'kab', 'kecamatan', 'kec', 'kelurahan', 'kel', 'desa', 'mudah', 'akses', 'cari', 'rumah', 'hunian',
        'tinggal', 'saya', 'aku', 'ingin', 'mau', 'banyak', 'punya', 'ada', 'tidak', 'bebas', 'aman', 'jauh', 'anti', 'tanpa', 'banjir',
        'bagus', 'enak', 'murah', 'strategis', 'nyaman', 'sekali', 'banget',
        'nggak', 'gak', 'ga', 'tak', 'bukan', 'jangan', 'hindari', 'menghindari', 'minim', 'jarang', 'lokasi', 'tempat', 'buat', 'yg',
        'near', 'in', 'at', 'the', 'a', 'an', 'and', 'or', 'with', 'to', 'of', 'no', 'not', 'without', 'avoid', 'away', 'from', 'free',
        'safe', 'flood', 'flooding', 'home', 'house', 'live', 'living', 'close', 'city', 'district', 'village', 'nice', 'good', 'cheap',
        'far', 'want', 'dont', 'do', 'regency', 'south', 'north', 'west', 'east', 'central',
    ];

    /** Arah mata angin: bagian nama ("Cipete Utara"), tetapi bukan nama bila berdiri sendiri. */
    private const ARAH = ['pusat', 'utara', 'selatan', 'barat', 'timur', 'tengah', 'baru', 'lama'];

    /** @var array<string, mixed>|null */
    private static ?array $kamus = null;

    /**
     * @return array{persona: list<string>, kota: list<string>, hindari_banjir: bool, nama_wilayah: ?string,
     *     urutkan: ?string, luar_cakupan: bool, persona_dibalik: list<string>}
     */
    public function parse(string $q): array
    {
        $k = self::kamus();
        $teks = ' '.trim((string) preg_replace('/\s+/u', ' ', mb_strtolower($q))).' ';

        $tambah = [];
        $buang = [];
        $urutkan = null;

        // Frasa khusus dulu ("jauh dari keramaian"), lalu dihapus dari teks agar katanya tidak dibaca ulang.
        foreach ($k['frasa_khusus'] as $frasa => $aturan) {
            if ($this->ada($teks, $frasa)) {
                array_push($tambah, ...($aturan['tambah'] ?? []));
                array_push($buang, ...($aturan['buang'] ?? []));
                $urutkan = $aturan['urutkan'] ?? $urutkan;
                $teks = $this->hapus($teks, $frasa);
            }
        }

        $hindariBanjir = false;
        foreach ($k['penanda_banjir'] as $frasa) {
            if ($this->ada($teks, $frasa)) {
                $hindariBanjir = true;
            }
        }

        $persona = [];
        $dibalik = [];
        foreach ($k['persona'] as $p => $kata) {
            // Frasa terpanjang dulu agar "jalan raya" tidak terbaca sebagai bagian lain.
            usort($kata, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
            foreach ($kata as $kw) {
                foreach ($this->posisi($teks, $kw) as $pos) {
                    if ($this->dibalik(mb_substr($teks, 0, $pos))) {
                        $dibalik[] = $p;
                    } else {
                        $persona[] = $p;
                    }
                }
            }
        }
        $persona = array_unique($persona);
        $dibalik = array_values(array_unique(array_diff($dibalik, $persona)));
        if (in_array('social_vibe', $dibalik, true)) {
            $tambah[] = 'zen';
        }
        if (in_array('driver', $dibalik, true)) {
            $urutkan = 'jauh_dari_tol';
        }
        $buang = array_merge($buang, $dibalik);
        $persona = array_values(array_unique(array_diff(array_merge($persona, $tambah), $buang)));
        // Urutan tetap sesuai PersonaScoring::PERSONA agar hasil mudah dibandingkan.
        $persona = array_values(array_intersect(PersonaScoring::PERSONA, $persona));

        [$kota, $sisaKota] = $this->kota($teks);

        return [
            'persona' => $persona,
            'kota' => $kota,
            'hindari_banjir' => $hindariBanjir,
            'nama_wilayah' => $this->sisaNama($sisaKota),
            'urutkan' => $urutkan,
            'luar_cakupan' => $this->luarCakupan($teks),
            'persona_dibalik' => $dibalik,
        ];
    }

    /** Pesan dwibahasa dari kamus: tidak_dipahami, luar_cakupan. */
    public static function pesan(string $kunci): string
    {
        return self::kamus()['pesan'][$kunci][0] ?? '';
    }

    /**
     * Kota/kabupaten: alias terpanjang dulu ("jaksel" -> "jakarta selatan"), lalu nama umum ("bogor" = semua Bogor).
     *
     * @return array{0: list<string>, 1: string}
     */
    private function kota(string $teks): array
    {
        $alias = [];
        foreach (self::kamus()['kota'] as $nama => $daftar) {
            if (is_array($daftar)) {
                foreach ($daftar as $a) {
                    $alias[$a] = $nama;
                }
            }
        }
        uksort($alias, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        $kota = [];
        foreach ($alias as $a => $nama) {
            if ($this->ada($teks, $a)) {
                $kota[] = $nama;
                $teks = $this->hapus($teks, $a);
            }
        }
        foreach (self::KOTA_UMUM as $u) {
            if ($this->ada($teks, $u)) {
                $kota[] = $u;
                $teks = $this->hapus($teks, $u);
            }
        }

        return [array_values(array_unique($kota)), $teks];
    }

    private function luarCakupan(string $teks): bool
    {
        foreach (self::BUKAN_LUAR as $b) {
            $teks = $this->hapus($teks, $b);
        }
        foreach (self::kamus()['luar_cakupan'] as $tempat) {
            if ($this->ada($teks, $tempat)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Apakah kata kunci yang diawali $sebelum dibalik: ada kata pembalik paling jauh N kata di depannya,
     * dalam klausa yang sama, dan tidak terhalang sasaran lain ("tidak banjir, dekat stasiun" tidak membalik stasiun).
     */
    private function dibalik(string $sebelum): bool
    {
        $k = self::kamus();
        $klausa = (string) preg_replace('/^.*[,.;:!?()]/us', '', $sebelum);
        $kata = array_values(array_filter(preg_split('/\s+/u', trim($klausa)) ?: [], fn ($w) => $w !== ''));
        $jendela = array_slice($kata, -((int) $k['pembalik']['jangkauan_kata']));
        // Potong di pemisah klausa atau sasaran lain yang terakhir.
        for ($i = count($jendela) - 1; $i >= 0; $i--) {
            if (in_array($jendela[$i], self::PEMISAH, true) || in_array($jendela[$i], self::SASARAN_LAIN, true)) {
                $jendela = array_slice($jendela, $i + 1);
                break;
            }
        }
        $potongan = ' '.implode(' ', $jendela).' ';
        foreach ($k['pembalik']['kata'] as $p) {
            if ($this->ada($potongan, $p)) {
                return true;
            }
        }

        return false;
    }

    /** @return list<int> posisi karakter awal tiap kemunculan $frasa sebagai kata utuh. */
    private function posisi(string $teks, string $frasa): array
    {
        preg_match_all('/(?<![\p{L}\p{N}])'.preg_quote($frasa, '/').'s?(?![\p{L}\p{N}])/u', $teks, $m, PREG_OFFSET_CAPTURE);

        return array_map(fn ($x) => mb_strlen(substr($teks, 0, $x[1])), $m[0]);
    }

    private function ada(string $teks, string $frasa): bool
    {
        return (bool) preg_match('/(?<![\p{L}\p{N}])'.preg_quote($frasa, '/').'(?![\p{L}\p{N}])/u', $teks);
    }

    private function hapus(string $teks, string $frasa): string
    {
        return (string) preg_replace('/(?<![\p{L}\p{N}])'.preg_quote($frasa, '/').'(?![\p{L}\p{N}])/u', ' ', $teks);
    }

    /**
     * Sisa kata setelah kata kunci persona, kota, dan kata umum dibuang; dianggap calon nama kelurahan/kecamatan.
     * Contoh: "Kecamatan Cibubur" -> "cibubur"; "dekat stasiun di Bogor" -> null.
     */
    private function sisaNama(string $teks): ?string
    {
        $k = self::kamus();
        $kunci = array_merge(...array_values($k['persona']));
        $sisa = (string) preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $teks);
        usort($kunci, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
        foreach (array_merge($kunci, $k['pembalik']['kata'], $k['penanda_banjir']) as $frasa) {
            if (str_contains($frasa, ' ')) {
                $sisa = $this->hapus($sisa, $frasa);
            }
        }
        $kata = array_filter(preg_split('/\s+/u', $sisa) ?: [], fn ($w) => $w !== ''
            && ! in_array($w, self::KATA_UMUM, true) && ! in_array($w, self::KOTA_UMUM, true) && ! in_array($w, $kunci, true)
            && ! in_array($w, $k['pembalik']['kata'], true));
        if (! array_diff($kata, self::ARAH)) {
            return null;
        }
        $nama = trim(implode(' ', $kata));

        return mb_strlen($nama) >= 3 ? $nama : null;
    }

    /** @return array<string, mixed> */
    private static function kamus(): array
    {
        if (self::$kamus === null) {
            $isi = json_decode((string) @file_get_contents(self::KAMUS), true);
            if (! is_array($isi) || ! isset($isi['persona'])) {
                throw new RuntimeException('Kamus pencarian tidak terbaca: data/kamus/kamus_pencarian.json');
            }
            self::$kamus = $isi;
        }

        return self::$kamus;
    }
}
