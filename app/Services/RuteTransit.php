<?php

namespace App\Services;

/**
 * Rakit rute transportasi umum dari respons /fares Commute Data API (api.commute.shiorilabs.id, ODbL-1.0).
 * Logika murni: tanpa HTTP dan tanpa basis data, agar bisa dites (CLAUDE.md).
 *
 * Waktu tempuh adalah estimasi (API tidak memberi durasi): jarak tiap ruas / kecepatan rata-rata moda,
 * ditambah waktu tunggu dan jalan kaki transfer. Tanpa lalu lintas real-time (SRS BR 14).
 */
class RuteTransit
{
    /** Meter per menit, rata-rata termasuk berhenti di stasiun. */
    public const KECEPATAN = ['KCI' => 650, 'MRTJ' => 600, 'LRTJ' => 450, 'LRTJBDB' => 700, 'APCGK' => 500, 'TJ' => 300];

    public const TUNGGU_PERTAMA = 5;   // menit, ruas naik pertama
    public const TUNGGU_TRANSFER = 4;  // menit, tiap ruas naik berikutnya
    public const KAKI = 70;            // meter per menit saat transfer di stasiun

    /** Jenis garis rel di layer mobilitas untuk tiap operator; operator lain digambar lurus antarhalte. */
    public const JENIS_REL = ['KCI' => 'krl', 'MRTJ' => 'mrt', 'LRTJ' => 'lrt', 'LRTJBDB' => 'lrt'];

    private const LABEL = ['KCI' => 'KRL', 'MRTJ' => 'MRT', 'LRTJ' => 'LRT Jakarta', 'LRTJBDB' => 'LRT Jabodebek', 'APCGK' => 'Kalayang', 'TJ' => 'TransJakarta'];

    /**
     * @param  array  $tarif  isi `data` dari GET /fares/{dari}/{ke}
     * @param  array<string, array{0: float, 1: float}>  $koordinat  id stasiun -> [lng, lat]
     * @param  array<string, string>  $namaLin  kunci lin "OPERATOR:KODE" -> nama lin
     * @param  callable(string, array, array): ?array  $jalurRel  (jenis, [lng,lat], [lng,lat]) -> koordinat sepanjang rel atau null
     * @return array{garis: list<list<array{0: float, 1: float}>>, transfer: list<list<array{0: float, 1: float}>>, stasiun: list<array>, menit: int, meter: float, biaya: ?int, rincian: list<string>}|null
     */
    public function rakit(array $tarif, array $koordinat, array $namaLin, callable $jalurRel): ?array
    {
        $legs = $tarif['legs'] ?? [];
        if (! $legs) {
            return null;
        }

        $garis = [];
        $transfer = [];
        $stasiun = [];
        $rincian = [];
        $menit = 0;
        $meter = 0.0;
        $naik = 0;

        foreach ($legs as $leg) {
            $dari = $leg['from']['id'] ?? null;
            $ke = $leg['to']['id'] ?? null;
            $jarak = (float) ($leg['distanceM'] ?? 0);
            $meter += $jarak;

            if (($leg['type'] ?? '') === 'TRANSFER') {
                $m = (int) max(1, round($jarak / self::KAKI));
                $menit += $m;
                $rincian[] = 'Pindah '.round($jarak).' m';
                if (isset($koordinat[$dari], $koordinat[$ke])) {
                    $transfer[] = [$koordinat[$dari], $koordinat[$ke]];
                }

                continue;
            }

            $op = $leg['operator'] ?? '';
            $m = (int) round($jarak / (self::KECEPATAN[$op] ?? 400)) + ($naik === 0 ? self::TUNGGU_PERTAMA : self::TUNGGU_TRANSFER);
            $menit += $m;
            $naik++;
            $rincian[] = trim($this->label($op, $leg['line'] ?? '', $namaLin)).' '.$m.' mnt';

            $henti = array_values(array_filter(array_map(fn ($s) => $koordinat[$s['id']] ?? null, $leg['stops'] ?? [])));
            if (count($henti) < 2 && isset($koordinat[$dari], $koordinat[$ke])) {
                $henti = [$koordinat[$dari], $koordinat[$ke]];
            }
            if (count($henti) >= 2) {
                $garis[] = $this->ikutiRel(self::JENIS_REL[$op] ?? null, $henti, $jalurRel);
            }

            foreach ([$leg['from'] ?? null, $leg['to'] ?? null] as $s) {
                if ($s && isset($koordinat[$s['id']]) && ! in_array($s['id'], array_column($stasiun, 'id'), true)) {
                    $stasiun[] = ['id' => $s['id'], 'nama' => $s['name'], 'lng' => $koordinat[$s['id']][0], 'lat' => $koordinat[$s['id']][1]];
                }
            }
        }

        if (! $garis) {
            return null;
        }

        $biaya = $tarif['totalFare'] ?? null;
        if ($biaya === null) {
            $bagian = array_filter(array_column($tarif['segments'] ?? [], 'fare'), fn ($f) => $f !== null);
            $biaya = $bagian ? array_sum($bagian) : null;
        }

        return [
            'garis' => $garis,
            'transfer' => $transfer,
            'stasiun' => $stasiun,
            'menit' => $menit,
            'meter' => $meter,
            'biaya' => $biaya === null ? null : (int) $biaya,
            'rincian' => $rincian,
        ];
    }

    /** "KRL Bogor", "MRT", "TransJakarta 9". */
    public function label(string $operator, string $lin, array $namaLin): string
    {
        $dasar = self::LABEL[$operator] ?? $operator;
        $kode = explode(':', $lin)[1] ?? '';
        if ($operator === 'TJ') {
            return "{$dasar} {$kode}";
        }
        if ($operator === 'KCI') {
            return $dasar.' '.preg_replace('/^Lin /', '', $namaLin[$lin] ?? $kode);
        }

        return $dasar;
    }

    /** Sambung titik henti mengikuti rel bila tersedia; bila tidak, garis lurus antarhenti. */
    private function ikutiRel(?string $jenis, array $henti, callable $jalurRel): array
    {
        $hasil = [$henti[0]];
        for ($i = 0; $i < count($henti) - 1; $i++) {
            $potong = $jenis ? $jalurRel($jenis, $henti[$i], $henti[$i + 1]) : null;
            if ($potong && count($potong) >= 2) {
                array_push($hasil, ...array_slice($potong, 1));
            } else {
                $hasil[] = $henti[$i + 1];
            }
        }
        $hasil[0] = $henti[0];

        return $hasil;
    }
}
