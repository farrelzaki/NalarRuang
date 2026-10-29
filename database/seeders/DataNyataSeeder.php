<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Data nyata pengganti nilai contoh di data/geojson/demo (evaluasi uji pengguna, Okt 2026).
 * Dijalankan oleh DemoPetaSeeder sesudah data demo diimpor; bisa juga sendiri:
 * php artisan db:seed --class=DataNyataSeeder
 *
 * Sumber dan cara membuat ulang tiap berkas: README di folder data masing-masing.
 */
class DataNyataSeeder extends Seeder
{
    /**
     * Kelas udara RELATIF antarkelurahan (keputusan tim 27 Okt 2026): seluruh Jabodetabek di atas baku mutu
     * 15 µg/m³ (PP 22/2021), jadi ambang mutlak membuat hampir semua kawasan "tidak sehat" dan skor Zen tidak
     * membedakan apa pun. Kelurahan diurutkan dari PM2.5 terendah: 40% terbersih = sehat ("relatif bersih"),
     * 40% berikutnya = kurang_sehat ("sedang"), 20% tercemar = tidak_sehat ("relatif tercemar").
     * "berbahaya" tetap mutlak: rata-rata tahunan di atas 55 µg/m³ (dua kali target antara WHO IT-1).
     */
    public const PORSI_KELAS = ['sehat' => 0.4, 'kurang_sehat' => 0.8];

    public const BATAS_BERBAHAYA = 55.0;

    /** Kegiatan hiburan OSM yang dihitung sebagai tempat aktivitas Social & Vibe (kolam renang pribadi tidak). */
    private const HIBURAN = [
        'cinema' => 'Bioskop', 'theatre' => 'Teater', 'arts_centre' => 'Pusat seni', 'bowling_alley' => 'Bowling',
        'ice_rink' => 'Arena es', 'water_park' => 'Taman air',
    ];

    /** Jenis tempat gazetteer yang berguna sebagai saran lokasi (jalan kecil tidak). */
    private const GAZETTEER_JALAN = ['highway=primary', 'highway=secondary', 'highway=tertiary', 'highway=trunk'];

    public function run(): void
    {
        ini_set('memory_limit', '-1');

        $this->udaraDanPenduduk();
        $this->zonasi();
        // Poligon RDTR ada yang bersilangan sendiri; perbaiki sebelum dipotong dengan poligon Legalitas.
        DB::statement("UPDATE fitur_peta SET geom = ST_CollectionExtract(ST_MakeValid(geom), 3) WHERE layer_id = 'zonasi' AND NOT ST_IsValid(geom)");
        DB::statement("DELETE FROM fitur_peta WHERE layer_id = 'zonasi' AND ST_IsEmpty(geom)");
        DB::statement('ANALYZE fitur_peta');
        $this->legalitas();
        $this->mesinWaktu();
        $this->genangan();
        $this->nonHunian();
        $this->hiburan();
        $this->halteBodetabek();
        $this->gazetteer();

        DB::statement('UPDATE fitur_peta SET geom = ST_CollectionExtract(ST_MakeValid(geom), ST_Dimension(geom) + 1) WHERE NOT ST_IsValid(geom)');
        // Luas RTH untuk syarat Zen (taman >= 1.000 m²); dihitung sekali di sini.
        DB::statement("UPDATE fitur_peta SET atribut = atribut || jsonb_build_object('luas_m2', round(ST_Area(geom::geography))) WHERE jenis = 'rth'");
        DB::statement('ANALYZE fitur_peta');
        DB::statement('ANALYZE wilayah');
        DemoPetaSeeder::hitungMetrikWilayah();
    }

    /**
     * Batas PM2.5 tiap kelas relatif dari sebaran nilai seluruh kelurahan. Logika murni, dites di DataNyataTest.
     *
     * @param  list<float>  $semua
     * @return array<string, float> kelas => PM2.5 tertinggi yang masih masuk kelas itu
     */
    public static function batasKelas(array $semua): array
    {
        sort($semua);
        $n = count($semua);
        $batas = [];
        foreach (self::PORSI_KELAS as $kelas => $porsi) {
            $batas[$kelas] = $semua[max(0, (int) ceil($n * $porsi) - 1)];
        }

        return $batas;
    }

    /**
     * Kategori kualitas_udara dari PM2.5 tahunan dan batas kelas relatif.
     *
     * @param  array<string, float>  $batas  hasil batasKelas()
     */
    public static function kategoriUdara(?float $pm25, array $batas): ?string
    {
        if ($pm25 === null) {
            return null;
        }
        if ($pm25 > self::BATAS_BERBAHAYA) {
            return 'berbahaya';
        }
        foreach ($batas as $kelas => $atas) {
            if ($pm25 <= $atas) {
                return $kelas;
            }
        }

        return 'tidak_sehat';
    }

    private function udaraDanPenduduk(): void
    {
        $udara = $this->csv('data/udara/pm25_satelit_2024_kelurahan.csv');
        $penduduk = [];
        foreach ($this->csv('data/penduduk/penduduk_2025_kelurahan.csv') as $r) {
            $penduduk[$r['kode_kemendagri']] = $r;
        }

        // Udara contoh dihapus dulu: wilayah tanpa data satelit menjadi "belum diketahui", bukan nilai karangan.
        DB::statement("UPDATE wilayah SET kualitas_udara = NULL, atribut = atribut - 'kualitas_udara'");

        $batas = self::batasKelas(array_map(fn ($r) => (float) $r['pm25_2024_ugm3'], $udara));
        foreach (array_chunk($udara, 300) as $potongan) {
            $baris = [];
            $nilai = [];
            foreach ($potongan as $r) {
                $kode = $r['kode_kemendagri'];
                $pm = (float) $r['pm25_2024_ugm3'];
                $p = $penduduk[$kode] ?? null;
                $baris[] = '(?, ?, ?::jsonb)';
                array_push($nilai, $kode, self::kategoriUdara($pm, $batas), json_encode(array_filter([
                    'pm25' => $pm,
                    'sumber_udara' => 'SatPM V6.GL.03 2024, ACAG Washington University (CC BY 4.0)',
                    'penduduk' => $p ? (int) $p['penduduk_2025_est'] : null,
                    'kepadatan' => $p ? (int) $p['kepadatan_per_km2'] : null,
                ], fn ($v) => $v !== null)));
            }
            DB::update(
                'UPDATE wilayah w SET kualitas_udara = v.kategori, atribut = w.atribut || v.tambahan
                 FROM (VALUES '.implode(',', $baris).') AS v(kode, kategori, tambahan)
                 WHERE w.atribut->>\'kode_kemendagri\' = v.kode',
                $nilai,
            );
        }
    }

    /**
     * Zonasi RDTR DKI 2022 (Pergub 31/2022): disimpan di layer tersendiri "zonasi" yang tidak disajikan utuh
     * (67 ribu poligon); dipakai Detail Lokasi dan untuk mengisi peruntukan poligon Legalitas.
     */
    private function zonasi(): void
    {
        DB::table('fitur_peta')->where('layer_id', 'zonasi')->delete();
        // Satu berkas RDTR bisa 85 MB JSON (sekitar 1 GB bila di-decode PHP), melebihi memori dyno Heroku.
        // Maka JSON dikirim utuh sebagai teks dan dipecah oleh PostgreSQL.
        foreach (glob(base_path('data/geojson/rdtr_dki_2022/zonasi_*.geojson.gz')) as $berkas) {
            $isi = (string) gzdecode((string) file_get_contents($berkas));
            DB::insert(<<<'SQL'
                INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, tahun, sumber, geom, created_at, updated_at)
                SELECT 'zonasi', 'zonasi', p->>'nama_objek',
                       jsonb_strip_nulls(jsonb_build_object(
                           'zona', nullif(nullif(p->>'zona', '0'), ''),
                           'kode_zona', nullif(p->>'kode_zona', ''),
                           'kode_subzona', nullif(p->>'kode_subzona', ''),
                           'kdb', CASE WHEN trim(p->>'kdb') ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(p->>'kdb')::float END,
                           'klb', CASE WHEN trim(p->>'klb') ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(p->>'klb')::float END,
                           'kdh', CASE WHEN trim(p->>'kdh') ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(p->>'kdh')::float END,
                           'kelurahan', nullif(regexp_replace(coalesce(p->>'kelurahan', ''), '^Kelurahan\s+', '', 'i'), ''))),
                       2022, 'RDTR DKI Jakarta 2022 (Pergub 31/2022)',
                       ST_SetSRID(ST_GeomFromGeoJSON(f->'geometry'), 4326), now(), now()
                FROM jsonb_array_elements(CAST(:isi AS jsonb)->'features') AS f
                CROSS JOIN LATERAL (SELECT f->'properties' AS p) AS x
                WHERE jsonb_typeof(f->'geometry') = 'object'
                  AND jsonb_array_length(coalesce(f->'geometry'->'coordinates', '[]'::jsonb)) > 0
            SQL, ['isi' => $isi]);
            unset($isi);
        }
    }

    /**
     * Status kepemilikan di poligon Legalitas adalah nilai contoh (BHUMI tidak bisa ditarik tanpa melewati captcha).
     * Status dihapus; peruntukan diisi dari zona RDTR yang paling luas menutupi poligon itu (hanya DKI).
     */
    private function legalitas(): void
    {
        DB::statement(<<<'SQL'
            UPDATE fitur_peta l SET
                atribut = coalesce(jsonb_strip_nulls(jsonb_build_object(
                    'peruntukan', z.zona, 'kode_subzona', z.kode_subzona, 'kdb', z.kdb, 'klb', z.klb)), '{}'::jsonb),
                sumber = CASE WHEN z.zona IS NULL THEN 'OSM (batas permukiman)' ELSE 'OSM (batas permukiman); RDTR DKI 2022 (zona)' END
            FROM fitur_peta l2
            LEFT JOIN LATERAL (
                SELECT f.atribut->>'zona' AS zona, f.atribut->>'kode_subzona' AS kode_subzona,
                       (f.atribut->>'kdb')::float AS kdb, (f.atribut->>'klb')::float AS klb
                FROM fitur_peta f
                WHERE f.layer_id = 'zonasi' AND f.atribut->>'zona' IS NOT NULL AND ST_Intersects(f.geom, l2.geom)
                ORDER BY ST_Area(ST_Intersection(f.geom, l2.geom)) DESC
                LIMIT 1
            ) z ON true
            WHERE l.id = l2.id AND l.jenis = 'legal'
        SQL);
    }

    /** Proyek Mesin Waktu dengan tahun target dari berita resmi (data/mesin_waktu/proyek.csv), bukan perkiraan. */
    private function mesinWaktu(): void
    {
        DB::table('fitur_peta')->where('layer_id', 'mesin_waktu')->delete();
        $fitur = array_filter($this->geojson(base_path('data/mesin_waktu/proyek.geojson')), fn ($f) => $f['geometry'] !== null);
        $this->sisip(array_map(function ($f) {
            $p = $f['properties'];
            $situs = parse_url((string) ($p['sumber'] ?? ''), PHP_URL_HOST);

            return [
                'layer_id' => 'mesin_waktu',
                'jenis' => 'proyek',
                'nama' => $p['nama'],
                'atribut' => array_filter([
                    'status' => $p['status_okt_2026'] ?? null,
                    'moda' => $p['moda'] ?? null,
                    'tautan' => $p['sumber'] ?? null,
                    'catatan' => $p['catatan'] ?? null,
                ]),
                'tahun' => isset($p['tahun']) ? (int) $p['tahun'] : null,
                'sumber' => 'OSM (geometri); '.trim(($situs ? preg_replace('/^www\./', '', $situs) : 'berita').' '.($p['tanggal_sumber'] ?? '')).' (status, target)',
                'geometry' => $f['geometry'],
            ];
        }, array_values($fitur)));
    }

    /** Genangan banjir 1 Januari 2020 (BNPB): kejadian nyata, pelengkap indeks bahaya InaRISK. */
    private function genangan(): void
    {
        DB::table('fitur_peta')->where('jenis', 'genangan')->delete();
        foreach (glob(base_path('data/geojson/genangan_bnpb_2020/genangan_*.geojson')) as $berkas) {
            $this->sisip(array_map(fn ($f) => [
                'layer_id' => 'historis_risiko',
                'jenis' => 'genangan',
                'nama' => 'Genangan banjir Januari 2020',
                'atribut' => ['kejadian' => 'Banjir 1 Januari 2020'],
                'tahun' => 2020,
                'sumber' => 'BNPB, peta genangan banjir Jabodetabek 2020',
                'geometry' => $f['geometry'],
            ], $this->geojson($berkas)));
        }
    }

    /** Area bukan hunian (bandara, badan jalan tol, makam, militer, perairan): dipakai Detail Lokasi, tidak disajikan sebagai layer. */
    private function nonHunian(): void
    {
        DB::table('fitur_peta')->where('layer_id', 'non_hunian')->delete();
        $this->sisip(array_map(fn ($f) => [
            'layer_id' => 'non_hunian',
            'jenis' => 'non_hunian',
            'nama' => $f['properties']['nama'] ?? null,
            'atribut' => ['kategori' => $f['properties']['jenis']],
            'tahun' => null,
            'sumber' => 'OSM',
            'geometry' => $f['geometry'],
        ], $this->geojson(base_path('data/geojson/osm_tambahan/non_hunian.geojson.gz'))));
    }

    private function hiburan(): void
    {
        DB::table('fitur_peta')->where('jenis', 'poi')->where('atribut->kategori', 'like', 'Hiburan%')->delete();
        $fitur = array_filter(
            $this->geojson(base_path('data/geojson/osm_tambahan/hiburan.geojson.gz')),
            fn ($f) => isset(self::HIBURAN[$f['properties']['jenis']]) && ! empty($f['properties']['nama']),
        );
        $this->sisip(array_map(fn ($f) => [
            'layer_id' => 'ekosistem',
            'jenis' => 'poi',
            'nama' => $f['properties']['nama'],
            'atribut' => ['kategori' => 'Hiburan: '.self::HIBURAN[$f['properties']['jenis']]],
            'tahun' => null,
            'sumber' => 'OSM',
            'geometry' => $f['geometry'],
        ], array_values($fitur)));
    }

    /** Halte Trans Tangerang (Tayo) dan Bus Bekasi Keren; halte Biskita sudah ada di data demo. */
    private function halteBodetabek(): void
    {
        $fitur = array_filter(
            $this->geojson(base_path('data/geojson/transit_bodetabek/halte.geojson')),
            fn ($f) => $f['properties']['operator'] !== 'Biskita Trans Pakuan',
        );
        DB::table('fitur_peta')->where('jenis', 'halte')->where('sumber', 'like', 'Opentransum (Trans%')->delete();
        DB::table('fitur_peta')->where('jenis', 'halte')->where('sumber', 'like', 'Opentransum (Bus%')->delete();
        $this->sisip(array_map(fn ($f) => [
            'layer_id' => 'mobilitas',
            'jenis' => 'halte',
            'nama' => $f['properties']['nama'],
            'atribut' => ['brt' => false, 'moda' => 'bus', 'operator' => $f['properties']['operator'], 'koridor' => $f['properties']['koridor'] ?? []],
            'tahun' => null,
            'sumber' => 'Opentransum ('.$f['properties']['operator'].')',
            'geometry' => $f['geometry'],
        ], array_values($fitur)));
    }

    /** Nama tempat dan jalan utama OSM untuk saran lokasi Commute Simulator (layer tersendiri, tidak disajikan). */
    private function gazetteer(): void
    {
        DB::table('fitur_peta')->where('layer_id', 'gazetteer')->delete();
        $baris = array_filter(
            $this->csv('data/geojson/osm_tambahan/gazetteer.csv'),
            fn ($r) => $r['nama'] !== '' && (! str_starts_with($r['jenis'], 'highway=') || in_array($r['jenis'], self::GAZETTEER_JALAN, true)),
        );
        $this->sisip(array_map(fn ($r) => [
            'layer_id' => 'gazetteer',
            'jenis' => 'tempat',
            'nama' => $r['nama'],
            'atribut' => array_filter(['kategori' => $r['jenis'], 'alias' => $r['alias'] ?: null]),
            'tahun' => null,
            'sumber' => 'OSM',
            'geometry' => ['type' => 'Point', 'coordinates' => [(float) $r['lon'], (float) $r['lat']]],
        ], array_values($baris)));
    }

    /**
     * Sisip banyak baris sekaligus (500 per perintah).
     *
     * @param  list<array{layer_id: string, jenis: string, nama: ?string, atribut: array, tahun: ?int, sumber: ?string, geometry: array}>  $fitur
     */
    private function sisip(array $fitur): void
    {
        // Beberapa poligon sumber tidak punya koordinat (zonasi tanpa kota); lewati.
        $fitur = array_filter($fitur, fn ($f) => ! empty($f['geometry']['coordinates']));
        DB::transaction(function () use ($fitur) {
            foreach (array_chunk($fitur, 500) as $potongan) {
                $tanda = [];
                $nilai = [];
                foreach ($potongan as $f) {
                    $tanda[] = '(?, ?, ?, ?::jsonb, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), now(), now())';
                    array_push($nilai, $f['layer_id'], $f['jenis'], $f['nama'], json_encode($f['atribut'] ?: new \stdClass()), $f['tahun'], $f['sumber'], json_encode($f['geometry']));
                }
                DB::insert('INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, tahun, sumber, geom, created_at, updated_at) VALUES '.implode(',', $tanda), $nilai);
            }
        });
    }

    /** @return list<array<string, mixed>> */
    private function geojson(string $berkas): array
    {
        $isi = (string) file_get_contents($berkas);
        if (str_ends_with($berkas, '.gz')) {
            $isi = (string) gzdecode($isi);
        }
        $data = json_decode($isi, true);
        if (! is_array($data) || ! isset($data['features'])) {
            throw new RuntimeException("GeoJSON tidak valid: {$berkas}");
        }

        return $data['features'];
    }

    /** @return list<array<string, string>> */
    private function csv(string $relatif): array
    {
        $h = fopen(base_path($relatif), 'r');
        if (! $h) {
            throw new RuntimeException("Tidak bisa membuka {$relatif}");
        }
        $kepala = fgetcsv($h, escape: '');
        $baris = [];
        while (($r = fgetcsv($h, escape: '')) !== false) {
            if (count($r) === count($kepala)) {
                $baris[] = array_combine($kepala, $r);
            }
        }
        fclose($h);

        return $baris;
    }
}
