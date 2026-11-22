<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\KapasitasLahan;
use App\Services\PersonaScoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * POST /api/lahan — Uji Lahan (FR-23, terinspirasi TestFit).
 *
 * Masukan: batas lahan yang digambar pengguna (GeoJSON Polygon, EPSG:4326), tipe bangunan, asumsi, persona sesi.
 * Keluaran: luas, zona RDTR dominan, porsi rawan banjir, kecocokan 4 persona (aturan wilayah, TBD-09),
 * estimasi kapasitas, ringkasan kepatuhan (KDB/KLB/KDH/parkir), zona yang bisa ditarik sendiri (bangunan/parkir/taman)
 * dan isinya (kavling, unit per tipe, koridor, slot parkir). Pola tata letak (grid, keliling, wrap, tower, ...) menentukan
 * zona bawaan; bila pengguna mengirim zona sendiri, zona itu yang diisi.
 *
 * Semua perhitungan meter dilakukan di UTM 48S (EPSG:32748) atau geography; penyimpanan tetap EPSG:4326.
 * POST dipakai karena koordinat poligon bisa terlalu panjang untuk query string.
 */
class LahanController extends Controller
{
    /** Batas luas lahan (m²): minimal satu persil kecil, maksimal 20 ha supaya grid kavling tetap ringan. */
    public const LUAS_MIN = 30;

    public const LUAS_MAKS = 200000;

    /** Batas jumlah titik sudut poligon. */
    private const TITIK_MAKS = 200;

    private const UTM = 32748;

    /** Paling banyak zona yang bisa ditarik sendiri. */
    private const ZONA_MAKS = 12;

    public function __construct(private PersonaScoring $skor, private KapasitasLahan $kapasitas)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'geometri' => 'required|array',
            'geometri.type' => 'required|in:Polygon',
            'geometri.coordinates' => 'required|array|min:1',
            'geometri.coordinates.0' => 'required|array|min:4|max:'.self::TITIK_MAKS,
            'geometri.coordinates.0.*' => 'required|array|size:2',
            'geometri.coordinates.0.*.*' => 'required|numeric',
            'tipe' => 'required|in:'.implode(',', KapasitasLahan::TIPE),
            'asumsi' => 'nullable|array',
            'pola' => 'nullable|string|max:20',
            // Zona yang ditarik sendiri oleh pengguna (bangunan/parkir/taman); tanpa ini zona dibuat dari pola.
            'zona' => 'nullable|array|max:'.self::ZONA_MAKS,
            'zona.*.jenis' => 'required|in:'.implode(',', KapasitasLahan::JENIS_ZONA),
            // Sub-layer: nomor zona induk (urutan di larik ini). Zona ini dipotong ke bentuk induknya dan induk kehilangan bagian ini.
            'zona.*.induk' => 'nullable|integer|min:0',
            // Prioritas saat zona bertumpuk: angka lebih besar menang dan zona lain menyesuaikan diri. Kosong = bangunan > parkir > taman.
            'zona.*.prioritas' => 'nullable|integer|min:0|max:1000',
            'zona.*.geometri' => 'required|array',
            'zona.*.geometri.type' => 'required|in:Polygon',
            'zona.*.geometri.coordinates' => 'required|array|min:1|max:5',
            'zona.*.geometri.coordinates.*' => 'required|array|min:4|max:'.self::TITIK_MAKS,
            'zona.*.geometri.coordinates.*.*' => 'required|array|size:2',
            'zona.*.geometri.coordinates.*.*.*' => 'required|numeric',
            // Gerbang kendaraan (tepi lahan) dan pintu gedung (tepi zona bangunan) yang ditaruh sendiri.
            'akses' => 'nullable|array|max:'.KapasitasLahan::AKSES_MAKS,
            'akses.*.jenis' => 'required|in:'.implode(',', KapasitasLahan::JENIS_AKSES),
            'akses.*.titik' => 'required|array|size:2',
            'akses.*.titik.*' => 'required|numeric',
            'akses.*.lebar' => 'nullable|numeric',
            'akses.*.panjang' => 'nullable|numeric',
            'persona' => 'nullable|array',
            'persona.*' => 'string',
        ]);

        $tipe = (string) $request->input('tipe');
        $pola = KapasitasLahan::polaSah($tipe, $request->input('pola'));
        $manual = null;
        if (is_array($request->input('zona')) && $request->input('zona') !== []) {
            $manual = [];
            foreach (array_values((array) $request->input('zona')) as $z) {
                $manual[] = [
                    'jenis' => (string) $z['jenis'],
                    'geojson' => (string) json_encode(['type' => 'Polygon', 'coordinates' => $z['geometri']['coordinates']]),
                    'induk' => isset($z['induk']) ? (int) $z['induk'] : null,
                    'prioritas' => isset($z['prioritas']) ? (int) $z['prioritas'] : null,
                ];
            }
            if (! self::indukSah($manual)) {
                return response()->json(['message' => 'Sub-layer zona tidak sah: induk harus zona lain di daftar yang sama dan tidak boleh berputar.'], 422);
            }
        }
        $persona = array_values(array_intersect((array) $request->input('persona', []), PersonaScoring::PERSONA));
        $asumsi = $this->kapasitas->asumsi($tipe, (array) $request->input('asumsi', []));
        // Hanya cincin luar yang dipakai: lahan yang digambar tidak punya lubang. Cincin ditutup bila belum.
        $cincin = array_map(fn ($t) => [(float) $t[0], (float) $t[1]], (array) $request->input('geometri.coordinates.0'));
        if ($cincin[0] !== $cincin[count($cincin) - 1]) {
            $cincin[] = $cincin[0];
        }
        $geojson = (string) json_encode(['type' => 'Polygon', 'coordinates' => [$cincin]]);

        $lahan = 'ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)';
        $cek = DB::selectOne(
            "SELECT ST_IsValid(g) AS valid, ST_Area(g::geography) AS luas, ST_Perimeter(g::geography) AS keliling,
                    CASE WHEN ST_IsValid(g) THEN ST_Y(ST_PointOnSurface(g)) END AS lat,
                    CASE WHEN ST_IsValid(g) THEN ST_X(ST_PointOnSurface(g)) END AS lng
             FROM (SELECT {$lahan} AS g) x",
            [$geojson],
        );

        if (! $cek->valid) {
            return response()->json(['message' => 'Garis batas lahan saling bersilangan. Geser titik sudutnya supaya tidak menyilang.'], 422);
        }
        $luas = (float) $cek->luas;
        if ($luas < self::LUAS_MIN) {
            return response()->json(['message' => 'Lahan terlalu kecil. Gambar lahan minimal '.self::LUAS_MIN.' m².'], 422);
        }
        if ($luas > self::LUAS_MAKS) {
            return response()->json(['message' => 'Lahan terlalu luas. Uji Lahan dibatasi sampai 20 hektare.'], 422);
        }

        $wilayah = DB::selectOne(
            'SELECT id, nama, kecamatan, kota, kualitas_udara FROM wilayah WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(?, ?), 4326)) LIMIT 1',
            [(float) $cek->lng, (float) $cek->lat],
        );
        if (! $wilayah) {
            return response()->json(['message' => 'Lahan ini di luar Jabodetabek, jadi belum bisa diuji.'], 422);
        }

        $zonasi = $this->zonasi($geojson, $luas);
        $intensitas = $this->intensitas($tipe, $zonasi, $asumsi, $luas);
        $banjir = $this->banjir($geojson, $luas);
        [$cocok, $terdekat, $jumlah] = $this->persona($geojson, $wilayah->kualitas_udara);

        $lahanUtm = $this->keUtm($geojson);
        // Akses: id = urutan di permintaan; pintu gedung diabaikan untuk rumah tapak.
        $akses = [];
        foreach (array_values((array) $request->input('akses', [])) as $id => $a) {
            if (KapasitasLahan::aksesBerlaku($tipe, (string) $a['jenis'])) {
                $akses[$id] = [
                    'jenis' => (string) $a['jenis'],
                    'ewkt' => $this->titikUtm((float) $a['titik'][0], (float) $a['titik'][1]),
                    // Lebar gerbang yang ditarik pengguna; pintu memakai lebar jalur pejalan.
                    // Gerbang: lebar gerbang + panjang jalan masuk (null = otomatis sampai jalan/parkir).
                    // Pintu: lebar bukaan + kedalaman lobi ke dalam gedung (null = otomatis sedalam satu unit).
                    'lebar' => $a['jenis'] === 'gerbang' ? KapasitasLahan::lebarGerbang($tipe, $asumsi, $a['lebar'] ?? null) : KapasitasLahan::lebarPintu($a['lebar'] ?? null),
                    'panjang' => $a['jenis'] === 'gerbang' ? KapasitasLahan::panjangGerbang($a['panjang'] ?? null) : KapasitasLahan::panjangPintu($a['panjang'] ?? null),
                    'otomatis' => ! isset($a['panjang']) || ! is_numeric($a['panjang']),
                ];
            }
        }
        [$kapasitas, $geometri, $zona, $luasTaman, $aksesFc] = $tipe === 'rumah'
            ? $this->rumah($lahanUtm, $luas, $asumsi, $intensitas, $pola, $manual, $akses)
            : $this->bangunan($tipe, $lahanUtm, $luas, $asumsi, $intensitas, $pola, $manual, $akses);
        $ringkasan = KapasitasLahan::ringkasan(
            $tipe, $luas, (float) $kapasitas['luas_tapak_m2'], (float) $kapasitas['luas_lantai_m2'], $luasTaman,
            (int) $kapasitas['lantai'], (float) $intensitas['kdb'], (float) $intensitas['klb'], $intensitas['kdh'], $kapasitas['parkir'] ?? null,
        );

        $catatan = [];
        if ($zonasi && $zonasi['bukan_hunian']) {
            $catatan[] = "Sebagian besar lahan berada di {$zonasi['zona']} menurut RDTR DKI 2022, bukan zona hunian. Estimasi hanya ilustrasi.";
        }
        if ($intensitas['sumber'] === 'asumsi') {
            $catatan[] = $zonasi
                ? 'Zona ini tidak mencantumkan KDB/KLB, jadi dipakai angka asumsi.'
                : 'Zonasi resmi baru tersedia untuk DKI Jakarta. KDB/KLB di sini angka asumsi, bukan aturan resmi.';
        }
        if (in_array('kdb', $ringkasan['pelanggaran'], true)) {
            $catatan[] = 'Tapak bangunan melebihi KDB '.self::angka($intensitas['kdb']).'%. Perkecil zona bangunan atau parkir bertingkat.';
        }
        if (in_array('parkir', $ringkasan['pelanggaran'], true)) {
            $kurang = $kapasitas['parkir']['butuh'] - $kapasitas['parkir']['muat'];
            $catatan[] = "Parkir {$kapasitas['parkir']['jenis']} kurang {$kurang} slot; sisanya perlu basement atau zona parkir lebih luas.";
        }
        if ($banjir['porsi_rawan'] >= 0.25) {
            $catatan[] = 'Sekitar '.(int) round($banjir['porsi_rawan'] * 100).'% lahan berada di area rawan tergenang (InaRISK).';
        }
        $catatan[] = 'Estimasi indikatif dari aturan sederhana, bukan rancangan tapak atau izin bangunan.';

        return response()->json([
            'luas_m2' => round($luas, 1),
            'keliling_m' => round((float) $cek->keliling, 1),
            'pusat' => ['lat' => round((float) $cek->lat, 6), 'lng' => round((float) $cek->lng, 6)],
            'wilayah' => trim(implode(', ', array_filter(['Kel. '.$wilayah->nama, $wilayah->kecamatan ? 'Kec. '.$wilayah->kecamatan : null, $wilayah->kota]))),
            'wilayah_id' => $wilayah->id,
            'zonasi' => $zonasi ? [
                'zona' => $zonasi['zona'],
                'subzona' => $zonasi['subzona'],
                'porsi' => $zonasi['porsi'],
                'sumber' => 'RDTR DKI 2022',
            ] : null,
            'intensitas' => $intensitas,
            'banjir' => $banjir,
            'match' => $cocok,
            'terdekat' => $terdekat,
            'jumlah_fasilitas' => $jumlah,
            'kesimpulan' => array_map(fn ($p) => $this->skor->kesimpulanWilayah($p, $cocok[$p]), $persona),
            'tipe' => $tipe,
            'pola' => $pola,
            'pola_tersedia' => KapasitasLahan::POLA[$tipe],
            'asumsi' => $asumsi,
            'kapasitas' => $kapasitas,
            'ringkasan' => $ringkasan,
            'geometri_kapasitas' => $geometri,
            'zona' => $zona,
            'zona_manual' => $manual !== null,
            'akses' => $aksesFc,
            'catatan' => $catatan,
        ]);
    }

    /**
     * Zona RDTR yang paling luas menutupi lahan (hanya DKI). Teks KDB/KLB bertingkat dibaca dari *_teks
     * (disimpan DataNyataSeeder); angka tunggal dari kdb/klb.
     *
     * @return array{zona: string, subzona: ?string, porsi: float, kdb: ?float, klb: ?float, kdb_teks: ?string, klb_teks: ?string, bukan_hunian: bool}|null
     */
    private function zonasi(string $geojson, float $luas): ?array
    {
        $z = DB::selectOne(
            "WITH l AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) AS g)
             SELECT f.atribut->>'zona' AS zona, f.atribut->>'kode_subzona' AS subzona,
                    (f.atribut->>'kdb')::float AS kdb, (f.atribut->>'klb')::float AS klb,
                    f.atribut->>'kdb_teks' AS kdb_teks, f.atribut->>'klb_teks' AS klb_teks, (f.atribut->>'kdh')::float AS kdh,
                    ST_Area(ST_Intersection(f.geom, l.g)::geography) AS irisan
             FROM fitur_peta f, l
             WHERE f.layer_id = 'zonasi' AND f.atribut->>'zona' IS NOT NULL AND ST_Intersects(f.geom, l.g)
             ORDER BY irisan DESC LIMIT 1",
            [$geojson],
        );

        if (! $z || ! $z->zona) {
            return null;
        }

        $bukanHunian = in_array($z->zona, [
            'Zona Badan Air', 'Zona Pertahanan dan Keamanan', 'Zona Transportasi', 'Zona Hutan Lindung',
            'Zona Ekosistem Mangrove', 'Zona Pembangkit Tenaga Listrik', 'Zona Perlindungan Setempat', 'Zona Konservasi',
            'Zona Ruang Terbuka Hijau',
        ], true);

        return [
            'zona' => $z->zona,
            'subzona' => $z->subzona,
            'porsi' => $luas > 0 ? round(min(1, (float) $z->irisan / $luas), 3) : 0.0,
            'kdb' => $z->kdb === null ? null : (float) $z->kdb,
            'klb' => $z->klb === null ? null : (float) $z->klb,
            'kdb_teks' => $z->kdb_teks,
            'klb_teks' => $z->klb_teks,
            'kdh' => $z->kdh === null ? null : (float) $z->kdh,
            'bukan_hunian' => $bukanHunian,
        ];
    }

    /**
     * KDB (%) dan KLB yang dipakai. Luas persil: satu kavling untuk rumah tapak, seluruh lahan untuk kos/apartemen.
     *
     * KDH (%) hanya dari RDTR; di luar DKI null (tidak diperiksa).
     *
     * @return array{kdb: float, klb: float, kdh: ?float, sumber: string, alternatif: int, luas_persil_m2: float}
     */
    private function intensitas(string $tipe, ?array $zonasi, array $asumsi, float $luas): array
    {
        $persil = $tipe === 'rumah' ? $asumsi['lebar_kavling'] * $asumsi['panjang_kavling'] : $luas;
        $alt = KapasitasLahan::ALTERNATIF[$tipe];

        $kdb = null;
        $klb = null;
        if ($zonasi) {
            $kdb = $zonasi['kdb'] ?? KapasitasLahan::intensitas($zonasi['kdb_teks'], $persil, $alt);
            $klb = $zonasi['klb'] ?? KapasitasLahan::intensitas($zonasi['klb_teks'], $persil, $alt);
        }

        $dariZona = $kdb !== null && $klb !== null;

        return [
            'kdb' => $dariZona ? $kdb : KapasitasLahan::ASUMSI_INTENSITAS[$tipe]['kdb'],
            'klb' => $dariZona ? $klb : KapasitasLahan::ASUMSI_INTENSITAS[$tipe]['klb'],
            'kdh' => $zonasi['kdh'] ?? null,
            'sumber' => $dariZona ? 'RDTR DKI 2022' : 'asumsi',
            'alternatif' => $alt,
            'luas_persil_m2' => round($persil, 1),
        ];
    }

    /** @return array{porsi_rawan: float, tingkat_maks: ?int, genangan_2020: bool} */
    private function banjir(string $geojson, float $luas): array
    {
        $b = DB::selectOne(
            "WITH l AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) AS g),
                  b AS (SELECT f.geom, (f.atribut->>'tingkat')::int AS tingkat FROM fitur_peta f, l
                        WHERE f.jenis = 'banjir_tampil' AND ST_Intersects(f.geom, l.g))
             SELECT ST_Area(ST_Intersection((SELECT ST_Union(ST_MakeValid(b.geom)) FROM b), l.g)::geography) AS irisan,
                    (SELECT max(tingkat) FROM b) AS tingkat,
                    EXISTS (SELECT 1 FROM fitur_peta f WHERE f.jenis = 'genangan' AND ST_Intersects(f.geom, l.g)) AS genangan
             FROM l",
            [$geojson],
        );

        return [
            'porsi_rawan' => $b && $b->irisan && $luas > 0 ? round(min(1, (float) $b->irisan / $luas), 3) : 0.0,
            'tingkat_maks' => $b && $b->tingkat !== null ? (int) $b->tingkat : null,
            'genangan_2020' => (bool) ($b->genangan ?? false),
        ];
    }

    /**
     * Kecocokan persona dengan aturan wilayah (TBD-09): fasilitas utama di dalam lahan atau paling jauh 2,5 km dari batasnya.
     *
     * @return array{0: array<string, bool>, 1: array<string, ?array{nama: string, meter: int}>, 2: array<string, int>}
     */
    private function persona(string $geojson, ?string $kualitasUdara): array
    {
        $cocok = [];
        $terdekat = [];
        $jumlah = [];
        foreach (InspectController::FASILITAS as $p => $jenis) {
            $tanda = implode(',', array_fill(0, count($jenis), '?'));
            $syarat = str_replace('atribut', 'f.atribut', InspectController::SYARAT[$p] ?? '');
            $b = DB::selectOne(
                "WITH l AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) AS g)
                 SELECT f.nama, ST_Distance(f.geom::geography, l.g::geography) AS meter,
                        (SELECT count(*) FROM fitur_peta f2 WHERE f2.jenis IN ({$tanda}) ".str_replace('f.atribut', 'f2.atribut', $syarat)." AND ST_Intersects(f2.geom, l.g)) AS n
                 FROM fitur_peta f, l
                 WHERE f.jenis IN ({$tanda}) {$syarat}
                 ORDER BY f.geom <-> l.g LIMIT 1",
                [$geojson, ...$jenis, ...$jenis],
            );
            $terdekat[$p] = $b ? ['nama' => (string) $b->nama, 'meter' => (int) round((float) $b->meter)] : null;
            $jumlah[$p] = $b ? (int) $b->n : 0;
            $cocok[$p] = $this->skor->cocokWilayah($p, $b ? (float) $b->meter : null, $kualitasUdara);
        }

        return [$cocok, $terdekat, $jumlah];
    }

    private static function angka(float $x): string
    {
        return rtrim(rtrim(number_format($x, 1, ',', '.'), '0'), ',');
    }

    /** Angka yang sudah dijepit (float) ditulis langsung ke SQL; masukan teks tetap lewat binding. */
    private static function n(float $x): string
    {
        return sprintf('%.6F', $x);
    }

    /**
     * Petak-petak persegi panjang di dalam poligon (UTM 48S, EWKT), diputar searah sisi terpanjangnya, berpola
     * lorong/jalan + dua baris petak saling membelakangi. Dipakai untuk kavling rumah dan slot parkir.
     * Hanya petak yang utuh di dalam poligon yang dikembalikan, terurut per blok, baris, lalu kolom.
     *
     * @return array{petak: list<object>, jalan: list<string>, jalan_ewkt: list<string>}
     */
    private function petak(string $ewkt, float $lebar, float $panjang, float $lorong): array
    {
        [$w, $p, $j, $per] = array_map([self::class, 'n'], [$lebar, $panjang, $lorong, $lorong + 2 * $panjang]);
        $utm = self::UTM;

        $baris = DB::select(
            "WITH l AS (SELECT ST_GeomFromEWKT(?) AS g),
             o AS (SELECT g, ST_SetSRID(ST_MakePoint(700000, 9300000), {$utm}) AS pusat, ST_ExteriorRing(ST_OrientedEnvelope(g)) AS cincin FROM l),
             sudut0 AS (
                 SELECT g, pusat,
                        CASE WHEN ST_Distance(ST_PointN(cincin, 1), ST_PointN(cincin, 2)) >= ST_Distance(ST_PointN(cincin, 2), ST_PointN(cincin, 3))
                             THEN ST_Azimuth(ST_PointN(cincin, 1), ST_PointN(cincin, 2))
                             ELSE ST_Azimuth(ST_PointN(cincin, 2), ST_PointN(cincin, 3)) END AS az
                 FROM o
             ),
             -- Arah dinormalkan ke [0, pi) dan diputar terhadap titik tetap, lalu grid dikunci ke kelipatan ukuran petak:
             -- saat lahan ditarik, petak yang sudah ada tidak bergeser, hanya bertambah/berkurang di tepi.
             sudut AS (SELECT g, pusat, az - pi() * floor(az / pi()) AS az FROM sudut0),
             r AS (SELECT ST_Rotate(g, az - pi() / 2, pusat) AS g, az, pusat FROM sudut),
             e AS (SELECT g, ST_Buffer(g, 0.05) AS gb, az, pusat, floor(ST_XMin(g) / {$w}) * {$w} AS x0, floor(ST_YMin(g) / {$per}) * {$per} AS y0, ST_XMax(g) AS x1, ST_YMax(g) AS y1 FROM r),
             blok AS (SELECT e.*, b FROM e, generate_series(0, ceil((e.y1 - e.y0) / {$per})::int) AS b),
             petak AS (
                 SELECT blok.gb, blok.az, blok.pusat, blok.b, k, s,
                        ST_MakeEnvelope(blok.x0 + k * {$w}, blok.y0 + blok.b * {$per} + {$j} + s * {$p},
                                        blok.x0 + (k + 1) * {$w}, blok.y0 + blok.b * {$per} + {$j} + (s + 1) * {$p}, {$utm}) AS kotak
                 FROM blok, generate_series(0, ceil((blok.x1 - blok.x0) / {$w})::int) AS k, generate_series(0, 1) AS s
             ),
             jalan AS (
                 SELECT blok.az, blok.pusat,
                        ST_Intersection(blok.g, ST_MakeEnvelope(blok.x0, blok.y0 + blok.b * {$per}, blok.x1, blok.y0 + blok.b * {$per} + {$j}, {$utm})) AS kotak
                 FROM blok
             )
             SELECT 'petak' AS jenis, b, k, s, ST_AsGeoJSON(ST_Transform(ST_Rotate(kotak, pi() / 2 - az, pusat), 4326), 6) AS geo,
                    ST_AsEWKT(ST_Rotate(kotak, pi() / 2 - az, pusat)) AS ewkt
             FROM petak WHERE ST_CoveredBy(kotak, gb)
             UNION ALL
             SELECT 'jalan', 0, 0, 0, ST_AsGeoJSON(ST_Transform(ST_Rotate(kotak, pi() / 2 - az, pusat), 4326), 6), ST_AsEWKT(ST_Rotate(kotak, pi() / 2 - az, pusat))
             FROM jalan WHERE NOT ST_IsEmpty(kotak) AND ST_Area(kotak) > 1
             ORDER BY 2, 4, 3",
            [$ewkt],
        );

        return [
            'petak' => array_values(array_filter($baris, fn ($b) => $b->jenis === 'petak')),
            'jalan' => array_map(fn ($b) => $b->geo, array_values(array_filter($baris, fn ($b) => $b->jenis === 'jalan'))),
            'jalan_ewkt' => array_map(fn ($b) => (string) $b->ewkt, array_values(array_filter($baris, fn ($b) => $b->jenis === 'jalan'))),
        ];
    }

    /** @return array<string, mixed> */
    private static function fitur(string $geo, array $properti): array
    {
        return ['type' => 'Feature', 'properties' => $properti, 'geometry' => json_decode($geo)];
    }

    // ---------------------------------------------------------------------------------------------------------
    // Pembantu geometri (semua dalam UTM 48S, dipertukarkan sebagai EWKT; angka ditulis lewat n(), teks lewat binding)
    // ---------------------------------------------------------------------------------------------------------

    private const KOSONG = 'SRID=32748;POLYGON EMPTY';

    private function keUtm(string $geojson): string
    {
        return (string) DB::selectOne(
            'SELECT ST_AsEWKT(ST_CollectionExtract(ST_MakeValid(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), '.self::UTM.')), 3)) AS g',
            [$geojson],
        )->g;
    }

    private function keGeo(string $ewkt): string
    {
        return (string) DB::selectOne('SELECT ST_AsGeoJSON(ST_Transform(ST_GeomFromEWKT(?), 4326), 6) AS g', [$ewkt])->g;
    }

    private function luasUtm(string $ewkt): float
    {
        return (float) DB::selectOne('SELECT ST_Area(ST_GeomFromEWKT(?)) AS a', [$ewkt])->a;
    }

    /** Operasi dua geometri (ST_Intersection / ST_Difference / ST_Union), hasilnya hanya bagian poligon. */
    private function op(string $fungsi, string $a, string $b): string
    {
        $fungsi = in_array($fungsi, ['ST_Intersection', 'ST_Difference', 'ST_Union'], true) ? $fungsi : 'ST_Intersection';

        return (string) DB::selectOne(
            "SELECT ST_AsEWKT(ST_CollectionExtract(ST_MakeValid({$fungsi}(ST_MakeValid(ST_GeomFromEWKT(?)), ST_MakeValid(ST_GeomFromEWKT(?)))), 3)) AS g",
            [$a, $b],
        )->g;
    }

    private function buf(string $a, float $d): string
    {
        return (string) DB::selectOne(
            "SELECT ST_AsEWKT(ST_CollectionExtract(ST_Buffer(ST_GeomFromEWKT(?), ".self::n($d).", 'join=mitre mitre_limit=5'), 3)) AS g",
            [$a],
        )->g;
    }

    /**
     * Bingkai lokal sebuah poligon: arah sisi terpanjang (dinormalkan ke [0, pi)), titik putar = pusatnya, dan kotak
     * batas setelah diputar sehingga sisi terpanjang mendatar. Zona bawaan disusun di bingkai ini lalu diputar balik.
     */
    private function bingkai(string $ewkt): object
    {
        return DB::selectOne(
            "WITH l AS (SELECT ST_GeomFromEWKT(?) AS g),
             c AS (SELECT g, ST_Centroid(g) AS p, ST_ExteriorRing(ST_OrientedEnvelope(g)) AS r FROM l),
             s AS (SELECT g, p, CASE WHEN ST_Distance(ST_PointN(r, 1), ST_PointN(r, 2)) >= ST_Distance(ST_PointN(r, 2), ST_PointN(r, 3))
                                     THEN ST_Azimuth(ST_PointN(r, 1), ST_PointN(r, 2))
                                     ELSE ST_Azimuth(ST_PointN(r, 2), ST_PointN(r, 3)) END AS az0 FROM c),
             t AS (SELECT g, p, coalesce(az0, 0) - pi() * floor(coalesce(az0, 0) / pi()) AS az FROM s),
             r AS (SELECT p, az, ST_Rotate(g, az - pi() / 2, p) AS rg FROM t)
             SELECT az, ST_X(p) AS px, ST_Y(p) AS py, ST_XMin(rg) AS x0, ST_YMin(rg) AS y0, ST_XMax(rg) AS x1, ST_YMax(rg) AS y1 FROM r",
            [$ewkt],
        );
    }

    /** Kotak batas $ewkt di dalam bingkai $b. @return array{0: float, 1: float, 2: float, 3: float} */
    private function batasDalam(string $ewkt, object $b): array
    {
        $r = DB::selectOne(
            'WITH r AS (SELECT ST_Rotate(ST_GeomFromEWKT(?), '.self::n((float) $b->az).' - pi() / 2, ST_SetSRID(ST_MakePoint('.self::n((float) $b->px).', '.self::n((float) $b->py).'), '.self::UTM.')) AS g)
             SELECT ST_XMin(g) AS x0, ST_YMin(g) AS y0, ST_XMax(g) AS x1, ST_YMax(g) AS y1 FROM r',
            [$ewkt],
        );

        return [(float) $r->x0, (float) $r->y0, (float) $r->x1, (float) $r->y1];
    }

    /** Persegi panjang [x0, x1] x [y0, y1] di bingkai $b, diputar balik ke UTM. */
    private function kotak(object $b, float $x0, float $y0, float $x1, float $y1): string
    {
        [$a, $c, $d, $e, $az, $px, $py] = array_map([self::class, 'n'], [min($x0, $x1), min($y0, $y1), max($x0, $x1), max($y0, $y1), (float) $b->az, (float) $b->px, (float) $b->py]);
        $utm = self::UTM;

        return (string) DB::selectOne(
            "SELECT ST_AsEWKT(ST_Rotate(ST_MakeEnvelope({$a}, {$c}, {$d}, {$e}, {$utm}), pi() / 2 - {$az}, ST_SetSRID(ST_MakePoint({$px}, {$py}), {$utm}))) AS g",
        )->g;
    }

    /** Juring dari titik ($px, $py) mulai utara searah jarum jam sebesar $porsi x 360 derajat (untuk memotong gedung keliling ke batas KDB). */
    private function juring(float $px, float $py, float $porsi): string
    {
        $titik = [[$px, $py]];
        $n = 36;
        for ($k = 0; $k <= $n; $k++) {
            $a = 2 * M_PI * $porsi * $k / $n;
            $titik[] = [$px + 5000 * sin($a), $py + 5000 * cos($a)];
        }
        $titik[] = [$px, $py];
        $wkt = 'POLYGON(('.implode(',', array_map(fn ($t) => self::n($t[0]).' '.self::n($t[1]), $titik)).'))';

        return (string) DB::selectOne('SELECT ST_AsEWKT(ST_MakeValid(ST_GeomFromText(?, '.self::UTM.'))) AS g', [$wkt])->g;
    }

    /** Pecah geometri menjadi poligon-poligon tunggal yang disederhanakan; yang lebih kecil dari $min m² dibuang. @return list<string> */
    private function pecah(string $ewkt, float $min = 1.0): array
    {
        $baris = DB::select(
            'SELECT ST_AsEWKT(ST_SimplifyPreserveTopology(d.geom, 0.25)) AS g FROM ST_Dump(ST_GeomFromEWKT(?)) AS d
             WHERE ST_Area(d.geom) >= '.self::n($min).' ORDER BY ST_Area(d.geom) DESC',
            [$ewkt],
        );

        return array_map(fn ($b) => (string) $b->g, $baris);
    }

    /**
     * Zona yang ditarik pengguna: dibuat sah, dipotong ke lahan (bangunan ke lahan dikurangi sempadan), lalu tumpang tindih
     * diselesaikan dengan prioritas bangunan > parkir > taman. Nomor zona dari pengguna dipertahankan.
     * Sub-layer (`induk`) dipotong ke bentuk induknya dan menang atas induknya di dalam bentuk itu (masking).
     *
     * @param  list<array{jenis: string, geojson: string, induk: ?int}>  $masuk
     * @return array<int, array{jenis: string, ewkt: string}>
     */
    private function potongManual(array $masuk, string $lahan, string $lahanSempadan): array
    {
        $kedalaman = self::kedalamanInduk($masuk);
        // Prioritas zona: yang dikirim klien; bila kosong, bangunan (3) > parkir (2) > taman (1) seperti semula.
        $prioritas = fn (int $id): int => $masuk[$id]['prioritas'] ?? (count(KapasitasLahan::JENIS_ZONA) - (int) array_search($masuk[$id]['jenis'], KapasitasLahan::JENIS_ZONA, true));
        // Anak diproses lebih dulu (kedalaman terbesar dahulu), jadi anak menang atas induknya di dalam bentuk induk;
        // di antara yang sekaliber, prioritas terbesar diproses dulu (yang diproses dulu memegang daerahnya, yang lain
        // dipotong di sekelilingnya), lalu urutan di daftar.
        $urut = array_keys($masuk);
        usort($urut, fn ($a, $b) => $kedalaman[$b] <=> $kedalaman[$a] ?: $prioritas($b) <=> $prioritas($a) ?: $a <=> $b);

        // Bentuk tiap zona dipotong ke lahan (gedung ke lahan dikurangi sempadan) dan, bila sub-layer, ke bentuk induknya (masking).
        $asli = [];
        $bentuk = function (int $id) use (&$bentuk, &$asli, $masuk, $lahan, $lahanSempadan): string {
            if (isset($asli[$id])) {
                return $asli[$id];
            }
            $z = $masuk[$id];
            $g = $this->op('ST_Intersection', $this->keUtm($z['geojson']), $z['jenis'] === 'bangunan' ? $lahanSempadan : $lahan);
            if ($z['induk'] !== null) {
                $g = $this->op('ST_Intersection', $g, $bentuk($z['induk']));
            }

            return $asli[$id] = $g;
        };

        $terisi = self::KOSONG;
        $hasil = [];
        foreach ($urut as $id) {
            $z = $masuk[$id];
            $g = $bentuk($id);
            $g = $this->op('ST_Difference', $g, $terisi);
            $terisi = $this->op('ST_Union', $terisi, $g);
            $hasil[$id] = ['jenis' => $z['jenis'], 'ewkt' => $g];
        }
        ksort($hasil);

        return $hasil;
    }

    /**
     * Induk tiap zona sah: nomor zona lain yang ada di daftar, bukan diri sendiri, dan rantainya tidak berputar.
     *
     * @param  list<array{induk?: ?int}>  $zona
     */
    private static function indukSah(array $zona): bool
    {
        $n = count($zona);
        foreach ($zona as $i => $z) {
            $p = $z['induk'] ?? null;
            for ($langkah = 0; $p !== null; $langkah++) {
                if ($p === $i || $p >= $n || $langkah > $n) {
                    return false;
                }
                $p = $zona[$p]['induk'] ?? null;
            }
        }

        return true;
    }

    /**
     * Kedalaman tiap zona di pohon sub-layer (0 = tanpa induk). Hanya dipanggil setelah indukSah.
     *
     * @param  list<array{induk?: ?int}>  $zona
     * @return array<int, int>
     */
    private static function kedalamanInduk(array $zona): array
    {
        $hasil = [];
        foreach ($zona as $i => $z) {
            $d = 0;
            for ($p = $z['induk'] ?? null; $p !== null; $p = $zona[$p]['induk'] ?? null) {
                $d++;
            }
            $hasil[$i] = $d;
        }

        return $hasil;
    }

    /** @param array<int, array{jenis: string, ewkt: string, lantai?: int}> $zona @return array<string, mixed> FeatureCollection */
    private function fiturZona(array $zona): array
    {
        $fitur = [];
        foreach ($zona as $id => $z) {
            $luas = $this->luasUtm($z['ewkt']);
            if ($luas < 1) {
                continue;
            }
            $fitur[] = self::fitur($this->keGeo($z['ewkt']), array_filter([
                'id' => $id,
                'jenis' => $z['jenis'],
                'luas_m2' => round($luas, 1),
                'lantai' => $z['lantai'] ?? null,
            ], fn ($v) => $v !== null));
        }

        return ['type' => 'FeatureCollection', 'features' => $fitur];
    }

    /** @param array<int, array{jenis: string, ewkt: string}> $zona @return array<int, array{jenis: string, ewkt: string}> */
    private static function saring(array $zona, string $jenis): array
    {
        return array_filter($zona, fn ($z) => $z['jenis'] === $jenis);
    }

    private function gabung(array $zona): string
    {
        $g = self::KOSONG;
        foreach ($zona as $z) {
            $g = $this->op('ST_Union', $g, $z['ewkt']);
        }

        return $g;
    }

    // ---------------------------------------------------------------------------------------------------------
    // Akses: gerbang kendaraan dan pintu gedung
    // ---------------------------------------------------------------------------------------------------------

    private function titikUtm(float $lng, float $lat): string
    {
        return (string) DB::selectOne(
            'SELECT ST_AsEWKT(ST_Transform(ST_SetSRID(ST_MakePoint(?::float8, ?::float8), 4326), '.self::UTM.')) AS g',
            [$lng, $lat],
        )->g;
    }

    /** Titik pada tepi $g (termasuk tepi dalam) yang paling dekat ke $titik; $titik sendiri bila $g kosong. */
    private function tepiTerdekat(string $titik, string $g): string
    {
        return (string) DB::selectOne(
            'WITH a AS (SELECT ST_GeomFromEWKT(?) AS p, ST_GeomFromEWKT(?) AS g)
             SELECT ST_AsEWKT(CASE WHEN ST_IsEmpty(g) THEN p ELSE ST_ClosestPoint(ST_Boundary(g), p) END) AS t FROM a',
            [$titik, $g],
        )->t;
    }

    /** Gabungkan banyak EWKT dalam satu query. */
    private function satukan(array $ewkt): string
    {
        if ($ewkt === []) {
            return self::KOSONG;
        }

        return (string) DB::selectOne(
            'SELECT ST_AsEWKT(ST_CollectionExtract(ST_MakeValid(ST_Union(ARRAY(SELECT ST_GeomFromEWKT(e) FROM unnest(?::text[]) AS e))), 3)) AS g',
            [self::larik($ewkt)],
        )->g;
    }

    /** @param list<string> $ewkt */
    private static function larik(array $ewkt): string
    {
        return '{'.implode(',', array_map(fn ($e) => '"'.$e.'"', $ewkt)).'}';
    }

    /**
     * Pita dari $dari ke titik terdekat pada $tujuan selebar $lebar (ujung persegi supaya menyambung).
     * KOSONG bila tujuan kosong atau jaraknya kurang dari 1 m (gerbang sudah menempel jalan/parkir).
     */
    private function pita(string $dari, string $tujuan, float $lebar): string
    {
        $r = DB::selectOne(
            "WITH a AS (SELECT ST_GeomFromEWKT(?) AS p, ST_MakeValid(ST_GeomFromEWKT(?)) AS t)
             SELECT CASE WHEN ST_IsEmpty(t) OR ST_Distance(p, t) < 1 THEN NULL
                         ELSE ST_AsEWKT(ST_Buffer(ST_MakeLine(p, ST_ClosestPoint(t, p)), ".self::n($lebar / 2).", 'endcap=square')) END AS g
             FROM a",
            [$dari, $tujuan],
        );

        return $r->g ?? self::KOSONG;
    }

    /**
     * Jalan masuk dari gerbang: bila panjangnya diatur, pita lurus tegak lurus tepi ke dalam lahan sepanjang itu;
     * bila tidak, pita sampai $tujuan terdekat (jalan/parkir). Mengisi $a['panjang'] dengan panjang yang dipakai.
     */
    private function jalanMasuk(array &$a, string $lahan, string $tujuan): string
    {
        if (! $a['otomatis'] && $a['panjang'] !== null) {
            return $this->pitaKeDalam($a['ewkt'], $lahan, (float) $a['lebar'], (float) $a['panjang']);
        }

        $a['panjang'] = round((float) DB::selectOne(
            'SELECT CASE WHEN ST_IsEmpty(t) THEN 0 ELSE ST_Distance(p, t) END AS d FROM (SELECT ST_GeomFromEWKT(?) AS p, ST_MakeValid(ST_GeomFromEWKT(?)) AS t) a',
            [$a['ewkt'], $tujuan],
        )->d, 1);

        return $this->op('ST_Intersection', $this->pita($a['ewkt'], $tujuan, $a['lebar']), $lahan);
    }

    /**
     * Pita lurus dari titik di tepi $wadah, tegak lurus tepi ke arah dalam, selebar $lebar dan sepanjang $panjang,
     * dipotong ke $wadah. Arah ke dalam = dari titik ke titik terdekat pada $wadah yang diperkecil 0,5 m.
     */
    private function pitaKeDalam(string $titik, string $wadah, float $lebar, float $panjang): string
    {
        $r = DB::selectOne(
            "WITH a AS (SELECT ST_GeomFromEWKT(?) AS p, ST_GeomFromEWKT(?) AS l),
             d AS (SELECT p, l, ST_ClosestPoint(ST_Buffer(l, -0.5), p) AS q FROM a),
             v AS (SELECT p, l, (ST_X(q) - ST_X(p)) AS dx, (ST_Y(q) - ST_Y(p)) AS dy FROM d)
             SELECT CASE WHEN sqrt(dx * dx + dy * dy) < 1e-6 THEN NULL ELSE ST_AsEWKT(ST_CollectionExtract(ST_Intersection(l,
                    ST_Buffer(ST_MakeLine(p, ST_Translate(p, dx / sqrt(dx * dx + dy * dy) * ".self::n($panjang).", dy / sqrt(dx * dx + dy * dy) * ".self::n($panjang).")),
                              ".self::n($lebar / 2).", 'endcap=flat')), 3)) END AS g
             FROM v",
            [$titik, $wadah],
        );

        return $r->g ?? self::KOSONG;
    }

    /**
     * Indeks EWKT yang terpotong $g (irisan > 0,5 m²), untuk membuang kavling/unit/slot yang dilewati jalan akses.
     *
     * @param  list<string>  $ewkt
     * @return array<int, true>
     */
    private function terpotong(array $ewkt, string $g): array
    {
        if ($ewkt === [] || $this->luasUtm($g) < 0.5) {
            return [];
        }
        $baris = DB::select(
            'WITH a AS (SELECT ST_GeomFromEWKT(?) AS g)
             SELECT (u.i - 1)::int AS i FROM a, unnest(?::text[]) WITH ORDINALITY AS u(e, i)
             WHERE ST_Intersects(ST_GeomFromEWKT(u.e), a.g) AND ST_Area(ST_Intersection(ST_GeomFromEWKT(u.e), a.g)) > 0.5',
            [$g, self::larik($ewkt)],
        );

        return array_fill_keys(array_map(fn ($b) => (int) $b->i, $baris), true);
    }

    /** Indeks EWKT terdekat ke $titik dalam jarak $maks m, atau null. @param list<string> $ewkt */
    private function terdekat(array $ewkt, string $titik, float $maks): ?int
    {
        if ($ewkt === []) {
            return null;
        }
        $r = DB::selectOne(
            'WITH a AS (SELECT ST_GeomFromEWKT(?) AS p)
             SELECT (u.i - 1)::int AS i FROM a, unnest(?::text[]) WITH ORDINALITY AS u(e, i)
             WHERE ST_DWithin(ST_GeomFromEWKT(u.e), a.p, '.self::n($maks).')
             ORDER BY ST_Distance(ST_GeomFromEWKT(u.e), a.p) LIMIT 1',
            [$titik, self::larik($ewkt)],
        );

        return $r ? (int) $r->i : null;
    }

    /** @param array<int, array{jenis: string, ewkt: string, lebar: float}> $akses @return array<string, mixed> FeatureCollection titik */
    private function fiturAkses(array $akses): array
    {
        $fitur = [];
        foreach ($akses as $id => $a) {
            $fitur[] = self::fitur($this->keGeo($a['ewkt']), array_filter([
                'id' => $id, 'jenis' => $a['jenis'], 'lebar' => $a['lebar'],
                'panjang' => (float) ($a['panjang'] ?? 0),
                'otomatis' => $a['otomatis'],
            ], fn ($v) => $v !== null));
        }

        return ['type' => 'FeatureCollection', 'features' => $fitur];
    }

    // ---------------------------------------------------------------------------------------------------------
    // Rumah tapak
    // ---------------------------------------------------------------------------------------------------------

    /**
     * Rumah tapak. Zona bangunan = kawasan kavling (diisi grid kavling + jalan lingkungan), zona taman = taman/fasum,
     * sisa lahan = jalan. Tanpa zona dari pengguna, zona dibuat dari pola (grid atau cluster).
     *
     * @param  ?list<array{jenis: string, geojson: string}>  $manual
     * @return array{0: array<string, mixed>, 1: array<string, mixed>, 2: array<string, mixed>, 3: float, 4: array<string, mixed>}
     */
    private function rumah(string $lahan, float $luas, array $asumsi, array $intensitas, string $pola, ?array $manual, array $akses = []): array
    {
        $jalan = (float) $asumsi['lebar_jalan'];
        $zona = $manual !== null ? $this->potongManual($manual, $lahan, $lahan) : $this->zonaRumah($lahan, $luas, $pola, $jalan);

        $fitur = [];
        $tanah = $this->gabung($zona);
        $sisa = $this->op('ST_Difference', $lahan, $tanah);
        $jalanEwkt = $this->luasUtm($sisa) > 1 ? [$sisa] : [];
        if ($jalanEwkt !== []) {
            $fitur[] = self::fitur($this->keGeo($sisa), ['jenis' => 'jalan']);
        }
        $luasTaman = 0.0;
        $kavling = [];
        foreach ($zona as $id => $z) {
            if ($z['jenis'] === 'taman') {
                $luasTaman += $this->luasUtm($z['ewkt']);
                $fitur[] = self::fitur($this->keGeo($z['ewkt']), ['jenis' => 'taman', 'zona' => $id]);

                continue;
            }
            if ($z['jenis'] !== 'bangunan' || $this->luasUtm($z['ewkt']) < 1) {
                continue;
            }
            $petak = $this->petak($z['ewkt'], (float) $asumsi['lebar_kavling'], (float) $asumsi['panjang_kavling'], $jalan);
            foreach ($petak['jalan'] as $geo) {
                $fitur[] = self::fitur($geo, ['jenis' => 'jalan', 'zona' => $id]);
            }
            $jalanEwkt = [...$jalanEwkt, ...$petak['jalan_ewkt']];
            foreach ($petak['petak'] as $p) {
                $kavling[] = ['geo' => $p->geo, 'ewkt' => (string) $p->ewkt, 'properti' => ['jenis' => 'kavling', 'varian' => ($p->k + $p->s + $p->b) % 3, 'zona' => $id]];
            }
        }

        // Gerbang: menempel ke tepi lahan, lalu jalan akses ditarik ke jaringan jalan terdekat; kavling yang dilewati dibuang.
        $jaringan = $this->satukan($jalanEwkt);
        $aksesJalan = [];
        foreach ($akses as $id => &$a) {
            $a['ewkt'] = $this->tepiTerdekat($a['ewkt'], $lahan);
            $pita = $this->jalanMasuk($a, $lahan, $jaringan);
            if ($this->luasUtm($pita) > 0.5) {
                $aksesJalan[] = $pita;
                $fitur[] = self::fitur($this->keGeo($pita), ['jenis' => 'akses', 'akses' => $id]);
            }
        }
        unset($a);
        $buang = $this->terpotong(array_column($kavling, 'ewkt'), $this->satukan($aksesJalan));
        foreach ($kavling as $i => $k) {
            if (! isset($buang[$i])) {
                $fitur[] = self::fitur($k['geo'], $k['properti']);
            }
        }

        $kapasitas = $this->kapasitas->rumah($luas, count($kavling) - count($buang), $asumsi, $intensitas['kdb'], $intensitas['klb']);

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur], $this->fiturZona($zona), $luasTaman, $this->fiturAkses($akses)];
    }

    /** @return array<int, array{jenis: string, ewkt: string}> */
    private function zonaRumah(string $lahan, float $luas, string $pola, float $jalan): array
    {
        $b = $this->bingkai($lahan);
        $w = (float) $b->x1 - (float) $b->x0;
        $h = (float) $b->y1 - (float) $b->y0;
        $taman = self::KOSONG;

        if ($pola === 'cluster') {
            // Taman di tengah, kavling sampai tepi lahan, dipisah jalan selebar $jalan dari taman.
            $f = sqrt(KapasitasLahan::PORSI_FASUM);
            $cx = ((float) $b->x0 + (float) $b->x1) / 2;
            $cy = ((float) $b->y0 + (float) $b->y1) / 2;
            if ($w * $f > 2 * $jalan && $h * $f > 2 * $jalan) {
                $taman = $this->op('ST_Intersection', $this->kotak($b, $cx - $w * $f / 2, $cy - $h * $f / 2, $cx + $w * $f / 2, $cy + $h * $f / 2), $lahan);
            }
            $kavling = $this->op('ST_Difference', $lahan, $this->buf($taman, $jalan));
        } else {
            // Grid: jalan lingkar di tepi, taman/fasum di satu ujung lahan.
            $dalam = $this->buf($lahan, -$jalan);
            if ($this->luasUtm($dalam) < 1) {
                return [['jenis' => 'bangunan', 'ewkt' => $lahan]];
            }
            $lebarTaman = $h > 0 ? min($w * 0.3, KapasitasLahan::PORSI_FASUM * $luas / $h) : 0;
            if ($lebarTaman >= 6) {
                $taman = $this->op('ST_Intersection', $this->kotak($b, (float) $b->x1 - $lebarTaman, (float) $b->y0 - 1, (float) $b->x1 + 1, (float) $b->y1 + 1), $lahan);
            }
            $kavling = $this->op('ST_Difference', $dalam, $this->buf($taman, $jalan));
        }

        $zona = [];
        foreach ($this->pecah($kavling, 20) as $g) {
            $zona[] = ['jenis' => 'bangunan', 'ewkt' => $g];
        }
        foreach ($this->pecah($taman, 20) as $g) {
            $zona[] = ['jenis' => 'taman', 'ewkt' => $g];
        }

        return $zona;
    }

    // ---------------------------------------------------------------------------------------------------------
    // Kos dan apartemen
    // ---------------------------------------------------------------------------------------------------------

    /**
     * Kos/apartemen bergaya TestFit. Zona bangunan diisi gedung berkoridor tengah (dua deret unit di kiri-kanan koridor,
     * dibagi dengan Voronoi supaya ikut berbelok di sudut, sisa di tengah gedung = inti lift/tangga). Zona parkir diisi
     * slot (motor untuk kos, mobil untuk apartemen); pola wrap menjadikannya gedung parkir bertingkat. Zona taman = ruang
     * tengah/RTH. Tanpa zona dari pengguna, zona dibuat dari pola.
     *
     * @param  ?list<array{jenis: string, geojson: string}>  $manual
     * @return array{0: array<string, mixed>, 1: array<string, mixed>, 2: array<string, mixed>, 3: float, 4: array<string, mixed>}
     */
    private function bangunan(string $tipe, string $lahan, float $luas, array $asumsi, array $intensitas, string $pola, ?array $manual, array $akses = []): array
    {
        $lahanSempadan = $this->buf($lahan, -(float) $asumsi['sempadan']);
        if ($this->luasUtm($lahanSempadan) < 10) {
            return $this->bangunanSederhana($tipe, $lahan, $luas, $asumsi, $intensitas);
        }

        $kdb = (float) $intensitas['kdb'];
        $zona = $manual !== null
            ? $this->potongManual($manual, $lahan, $lahanSempadan)
            : $this->zonaGedung($tipe, $pola, $lahanSempadan, $luas, $kdb);

        // Gerbang menempel ke tepi lahan.
        $gerbang = [];
        foreach ($akses as $id => &$a) {
            if ($a['jenis'] === 'gerbang') {
                $a['ewkt'] = $this->tepiTerdekat($a['ewkt'], $lahan);
                $gerbang[$id] = $a['ewkt'];
            }
        }
        unset($a);

        // 1. Gedung: unit per zona bangunan.
        $fitur = [];
        $unit = [];
        $tapak = 0.0;
        foreach (self::saring($zona, 'bangunan') as $id => $z) {
            $isi = $this->isiGedung($tipe, $z['ewkt'], $asumsi);
            if ($isi['unit'] === []) {
                continue;
            }
            $tapak += $isi['luas'];
            foreach ($isi['unit'] as $u) {
                $unit[] = ['geo' => $u->geo, 'ewkt' => (string) $u->ewkt, 'zona' => $id];
            }
            foreach ($isi['fitur'] as $f) {
                $f['properties']['zona'] = $id;
                $fitur[] = $f;
            }
        }
        if ($unit === []) {
            return $this->bangunanSederhana($tipe, $lahan, $luas, $asumsi, $intensitas);
        }
        $gedung = $this->gabung(self::saring($zona, 'bangunan'));
        $jenisParkir = (string) KapasitasLahan::jenisParkir($tipe);

        // 2. Zona parkir dan taman bawaan disusun setelah kebutuhan parkir diketahui; parkir di sisi gerbang pertama.
        if ($manual === null) {
            $butuhAwal = $this->kapasitas->gedung($tipe, $luas, $tapak, array_fill(0, count($unit), 'kamar'), $asumsi, $kdb, $intensitas['klb'])['parkir']['butuh'];
            $zona = [...$zona, ...$this->zonaHalaman($pola, $lahanSempadan, $gedung, $butuhAwal, $jenisParkir, $luas, $kdb, $tapak, $gerbang === [] ? null : reset($gerbang))];
        }

        // 3. Jalan akses dari tiap gerbang ke zona parkir terdekat (atau ke gedung bila tidak ada parkir).
        $parkirGabung = $this->gabung(self::saring($zona, 'parkir'));
        $tujuan = $this->luasUtm($parkirGabung) > 1 ? $parkirGabung : $gedung;
        $aksesJalan = [];
        foreach ($gerbang as $id => $titik) {
            $pita = $this->jalanMasuk($akses[$id], $lahan, $tujuan);
            if ($this->luasUtm($pita) > 0.5) {
                $aksesJalan[] = $pita;
                $fitur[] = self::fitur($this->keGeo($pita), ['jenis' => 'akses', 'akses' => $id]);
            }
        }
        $aksesGabung = $this->satukan($aksesJalan);

        // 4. Pintu gedung menempel ke tepi zona bangunan; unit di depannya menjadi lobi, jalur pejalan ke gerbang terdekat.
        $ewktUnit = array_column($unit, 'ewkt');
        $buang = $this->terpotong($ewktUnit, $aksesGabung);
        $lobi = [];
        foreach ($akses as $id => &$a) {
            if ($a['jenis'] !== 'pintu') {
                continue;
            }
            $a['ewkt'] = $this->tepiTerdekat($a['ewkt'], $gedung);
            // Lobi: pita selebar pintu dari tepi gedung ke dalam sedalam `panjang` (otomatis: satu unit).
            if ($a['panjang'] === null) {
                $a['panjang'] = KapasitasLahan::KEDALAMAN_UNIT[$tipe];
            }
            $ruangLobi = $this->op('ST_Intersection', $this->pitaKeDalam($a['ewkt'], $gedung, (float) $a['lebar'], (float) $a['panjang']), $gedung);
            if ($this->luasUtm($ruangLobi) > 0.5) {
                $lobi += $this->terpotong($ewktUnit, $ruangLobi);
                $fitur[] = self::fitur($this->keGeo($ruangLobi), ['jenis' => 'lobi', 'akses' => $id]);
            }
            $ke = $gerbang === [] ? $this->tepiTerdekat($a['ewkt'], $lahan) : $this->terdekatTitik($a['ewkt'], array_values($gerbang));
            $jalur = $this->op('ST_Difference', $this->pita($a['ewkt'], $ke, KapasitasLahan::LEBAR_JALUR), $this->op('ST_Union', $gedung, $aksesGabung));
            $jalur = $this->op('ST_Intersection', $jalur, $lahan);
            if ($this->luasUtm($jalur) > 0.5) {
                $fitur[] = self::fitur($this->keGeo($jalur), ['jenis' => 'jalur', 'akses' => $id]);
            }
        }
        unset($a);

        // 5. Unit yang tersisa (tidak dilewati jalan akses, bukan lobi) diberi tipe dan dihitung.
        $sisa = array_values(array_filter($unit, fn ($i) => ! isset($buang[$i]) && ! isset($lobi[$i]), ARRAY_FILTER_USE_KEY));
        if ($sisa === []) {
            return $this->bangunanSederhana($tipe, $lahan, $luas, $asumsi, $intensitas);
        }
        $porsiTipe = $tipe === 'kos' ? ['kamar' => 1.0] : $this->kapasitas->porsiTipe($asumsi);
        $urutan = KapasitasLahan::sebarTipe(count($sisa), $porsiTipe);
        foreach ($sisa as $i => $u) {
            $fitur[] = self::fitur($u['geo'], ['jenis' => 'unit', 'tipe' => $urutan[$i], 'zona' => $u['zona']]);
        }
        $kapasitas = $this->kapasitas->gedung($tipe, $luas, $tapak, $urutan, $asumsi, $kdb, $intensitas['klb']);
        $butuh = $kapasitas['parkir']['butuh'];

        // 6. Parkir: slot di tiap zona parkir (yang dilewati jalan akses dibuang); pola wrap menumpuk lantai.
        $slot = KapasitasLahan::ukuranSlot($jenisParkir);
        $slotLantai = 0;
        $fiturSlot = [];
        foreach (self::saring($zona, 'parkir') as $id => $z) {
            $petak = $this->petak($z['ewkt'], $slot['lebar'], $slot['panjang'], $slot['lorong']);
            $kena = $this->terpotong(array_map(fn ($p) => (string) $p->ewkt, $petak['petak']), $aksesGabung);
            foreach ($petak['petak'] as $i => $p) {
                if (! isset($kena[$i])) {
                    $slotLantai++;
                    $fiturSlot[] = self::fitur($p->geo, ['jenis' => 'slot', 'zona' => $id]);
                }
            }
        }
        $lantaiParkir = $pola === 'wrap' ? KapasitasLahan::lantaiParkir($butuh, $slotLantai, (int) $kapasitas['lantai']) : ($slotLantai > 0 ? 1 : 0);
        $kapasitas['parkir'] = ['butuh' => $butuh, 'muat' => $slotLantai * $lantaiParkir, 'jenis' => $jenisParkir, 'lantai' => $lantaiParkir];

        $luasTaman = 0.0;
        $luasParkir = 0.0;
        $berlabel = false;
        foreach ($zona as $id => &$z) {
            if ($z['jenis'] === 'parkir') {
                $z['lantai'] = max(1, $lantaiParkir);
                $luasParkir += $this->luasUtm($z['ewkt']);
                $fitur[] = self::fitur($this->keGeo($z['ewkt']), ['jenis' => 'parkir', 'zona' => $id, 'lantai' => $z['lantai']]);
            } elseif ($z['jenis'] === 'taman') {
                $luasZona = $this->luasUtm($z['ewkt']);
                $luasTaman += $luasZona;
                $properti = ['jenis' => 'taman', 'zona' => $id];
                // Label "N lantai · M unit" cukup sekali, di taman pertama yang cukup luas, supaya tidak menumpuk.
                if (! $berlabel && $luasZona >= 100) {
                    $properti += ['lantai' => $kapasitas['lantai'], 'jumlah' => $kapasitas['jumlah'], 'satuan' => $kapasitas['satuan']];
                    $berlabel = true;
                }
                $fitur[] = self::fitur($this->keGeo($z['ewkt']), $properti);
            }
        }
        unset($z);
        // Urutan gambar: halaman dulu, lalu slot, lalu jalan akses dan jalur di atasnya.
        $atas = array_values(array_filter($fitur, fn ($f) => in_array($f['properties']['jenis'], ['akses', 'jalur'], true)));
        $bawah = array_values(array_filter($fitur, fn ($f) => ! in_array($f['properties']['jenis'], ['akses', 'jalur'], true)));
        $fitur = [...$bawah, ...$fiturSlot, ...$atas];

        // Gedung parkir bertingkat ikut dihitung sebagai tapak bangunan (KDB).
        if ($lantaiParkir > 1) {
            $kapasitas['luas_tapak_m2'] = round($tapak + $luasParkir, 1);
            $kapasitas['porsi_tapak'] = $luas > 0 ? round(($tapak + $luasParkir) / $luas, 3) : null;
        }

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur], $this->fiturZona($zona), $luasTaman, $this->fiturAkses($akses)];
    }

    /** Titik (EWKT) dari $titik-titik yang paling dekat ke $dari. @param list<string> $titik */
    private function terdekatTitik(string $dari, array $titik): string
    {
        $i = $this->terdekat($titik, $dari, 1e7);

        return $titik[$i ?? 0];
    }

    /**
     * Zona bangunan bawaan per pola, di dalam lahan setelah sempadan.
     *
     * @return array<int, array{jenis: string, ewkt: string}>
     */
    private function zonaGedung(string $tipe, string $pola, string $ls, float $luas, float $kdb): array
    {
        $tebal = KapasitasLahan::tebalGedung($tipe);
        $b = $this->bingkai($ls);
        $w = (float) $b->x1 - (float) $b->x0;
        $h = (float) $b->y1 - (float) $b->y0;
        $batasTapak = $luas * $kdb / 100;

        if ($pola === 'tower') {
            $sisi = KapasitasLahan::sisiTower($luas, $kdb, $this->luasUtm($ls));
            $lebar = min($w, $sisi * 1.25);
            $tinggi = $lebar > 0 ? min($h, $sisi * $sisi / $lebar) : 0;
            $cx = ((float) $b->x0 + (float) $b->x1) / 2;
            $cy = ((float) $b->y0 + (float) $b->y1) / 2;
            $gedung = $this->op('ST_Intersection', $this->kotak($b, $cx - $lebar / 2, $cy - $tinggi / 2, $cx + $lebar / 2, $cy + $tinggi / 2), $ls);
        } elseif ($pola === 'koridor') {
            // Satu blok memanjang di sisi belakang; dipendekkan supaya tapak tidak melebihi KDB.
            $panjang = min($w, $batasTapak / $tebal);
            $gedung = $this->op('ST_Intersection', $this->kotak($b, (float) $b->x0, (float) $b->y1 - $tebal, (float) $b->x0 + $panjang, (float) $b->y1), $ls);
        } else {
            // keliling / wrap: gedung mengikuti tepi; dipotong (bentuk C/U) bila melebihi KDB.
            $dalam = $this->buf($ls, -$tebal);
            $gedung = $this->luasUtm($dalam) < 1 ? $ls : $this->op('ST_Difference', $ls, $dalam);
            $porsi = KapasitasLahan::porsiLingkar($luas, $kdb, $this->luasUtm($gedung));
            if ($porsi > 0 && $porsi < 1) {
                $gedung = $this->op('ST_Intersection', $gedung, $this->juring((float) $b->px, (float) $b->py, $porsi));
            }
        }

        return array_map(fn ($g) => ['jenis' => 'bangunan', 'ewkt' => $g], $this->pecah($gedung, 20));
    }

    /**
     * Zona parkir dan taman bawaan di halaman (lahan setelah sempadan, berjarak 3 m dari gedung). Parkir mengambil
     * pita di sisi depan halaman seluas kebutuhan; pola wrap memakai seluruh halaman yang masih diizinkan KDB sebagai
     * gedung parkir. Sisanya taman.
     *
     * @return list<array{jenis: string, ewkt: string}>
     */
    private function zonaHalaman(string $pola, string $ls, string $gedung, int $butuh, string $jenisParkir, float $luas, float $kdb, float $tapak, ?string $arah = null): array
    {
        $halaman = $this->op('ST_Difference', $ls, $this->buf($gedung, 3));
        $luasHalaman = $this->luasUtm($halaman);
        if ($luasHalaman < 20) {
            return [];
        }

        $target = $pola === 'wrap'
            ? min($luasHalaman, max(0, $luas * $kdb / 100 - $tapak))
            : min($luasHalaman * 0.7, $butuh * KapasitasLahan::LUAS_PER_SLOT[$jenisParkir]);

        $parkir = self::KOSONG;
        if ($butuh > 0 && $target >= 30) {
            $b = $this->bingkai($ls);
            [$x0, $y0, $x1, $y1] = $this->batasDalam($halaman, $b);
            // Parkir di sisi halaman yang paling dekat ke gerbang pertama (bawaan: sisi y0).
            $sisi = 'y0';
            if ($arah !== null) {
                [$gx, $gy] = $this->batasDalam($arah, $b);
                $sisi = KapasitasLahan::sisiTerdekat($gx, $gy, $x0, $y0, $x1, $y1);
            }
            $mendatar = $sisi[0] === 'y';
            $panjang = $mendatar ? $x1 - $x0 : $y1 - $y0;
            $ruang = $mendatar ? $y1 - $y0 : $x1 - $x0;
            // Tebal pita dinaikkan bertahap karena halaman tidak selalu persegi panjang penuh.
            $tebal = $panjang > 0 ? $target / $panjang : 0;
            for ($i = 0; $i < 4 && $tebal > 0; $i++) {
                $t = min($tebal, $ruang) + 1;
                $kotak = match ($sisi) {
                    'y0' => $this->kotak($b, $x0 - 1, $y0 - 1, $x1 + 1, $y0 + $t),
                    'y1' => $this->kotak($b, $x0 - 1, $y1 - $t, $x1 + 1, $y1 + 1),
                    'x0' => $this->kotak($b, $x0 - 1, $y0 - 1, $x0 + $t, $y1 + 1),
                    default => $this->kotak($b, $x1 - $t, $y0 - 1, $x1 + 1, $y1 + 1),
                };
                $parkir = $this->op('ST_Intersection', $halaman, $kotak);
                $dapat = $this->luasUtm($parkir);
                if ($dapat >= $target * 0.9 || $tebal >= $ruang) {
                    break;
                }
                $tebal *= $dapat > 0 ? min(3, $target / $dapat) : 2;
            }
        }
        $taman = $this->op('ST_Difference', $halaman, $parkir);

        $zona = [];
        foreach ($this->pecah($parkir, 30) as $g) {
            $zona[] = ['jenis' => 'parkir', 'ewkt' => $g];
        }
        foreach ($this->pecah($taman, 20) as $g) {
            $zona[] = ['jenis' => 'taman', 'ewkt' => $g];
        }

        return $zona;
    }

    /**
     * Isi satu zona bangunan: dua deret unit di kiri-kanan koridor, mengikuti semua tepi zona (termasuk tepi dalam bila
     * zona berlubang). Benih Voronoi dikunci ke kelipatan lebar unit per ruas supaya unit stabil saat zona ditarik.
     *
     * @return array{unit: list<object>, fitur: list<array<string, mixed>>, luas: float}
     */
    private function isiGedung(string $tipe, string $ewkt, array $asumsi): array
    {
        $du = KapasitasLahan::KEDALAMAN_UNIT[$tipe];
        $c = KapasitasLahan::LEBAR_KORIDOR[$tipe];
        $w = $this->kapasitas->lebarUnit($tipe, $asumsi);
        [$ndu, $nduc, $ntebal, $nw] = array_map([self::class, 'n'], [$du, $du + $c, 2 * $du + $c, $w]);
        $tengah1 = self::n($du / 2);
        $tengah2 = self::n($du + $c + $du / 2);
        $minLuas = self::n(0.35 * $w * $du);

        $unit = DB::select(
            "WITH z AS (SELECT ST_GeomFromEWKT(?) AS g),
             p AS (SELECT ST_Centroid(g) AS pusat FROM z),
             pita AS (
                 SELECT 1 AS deret, ST_Difference(g, ST_Buffer(g, -{$ndu}, 'join=mitre')) AS band, {$tengah1}::float8 AS tengah FROM z
                 UNION ALL
                 SELECT 2, ST_Difference(ST_Buffer(g, -{$nduc}, 'join=mitre'), ST_Buffer(g, -{$ntebal}, 'join=mitre')), {$tengah2}::float8 FROM z
             ),
             garis AS (SELECT pita.deret, (ST_Dump(ST_Boundary(ST_Buffer(z.g, -pita.tengah, 'join=mitre')))).geom AS ln FROM pita, z),
             ruas AS (
                 SELECT garis.deret, ST_StartPoint(d.geom) AS a, ST_Length(d.geom) AS pjg,
                        sin(ST_Azimuth(ST_StartPoint(d.geom), ST_EndPoint(d.geom))) AS ux,
                        cos(ST_Azimuth(ST_StartPoint(d.geom), ST_EndPoint(d.geom))) AS uy
                 FROM garis, LATERAL ST_DumpSegments(garis.ln) AS d
                 WHERE ST_Length(d.geom) > 0.01
             ),
             ruas2 AS (SELECT ruas.*, ST_X(a) * ux + ST_Y(a) * uy AS proj FROM ruas),
             benih0 AS (
                 SELECT deret, a, ux, uy, (ceil((proj - {$nw} / 2) / {$nw}) + k) * {$nw} + {$nw} / 2 - proj AS t, pjg
                 FROM ruas2, LATERAL generate_series(0, ceil(pjg / {$nw})::int) AS k
             ),
             benih AS (SELECT deret, ST_Translate(a, t * ux, t * uy) AS t FROM benih0 WHERE t >= 0 AND t < pjg),
             sel AS (
                 SELECT deret, (ST_Dump(ST_VoronoiPolygons(ST_Collect(t), 0, (SELECT ST_Expand(g, 200) FROM z)))).geom AS v
                 FROM benih GROUP BY deret
             ),
             u AS (
                 SELECT sel.deret, ST_CollectionExtract(ST_Intersection(sel.v, pita.band), 3) AS g
                 FROM sel JOIN pita USING (deret) WHERE ST_Intersects(sel.v, pita.band)
             )
             SELECT u.deret, ST_Area(u.g) AS luas, ST_Azimuth(p.pusat, ST_PointOnSurface(u.g)) AS az,
                    ST_AsGeoJSON(ST_Transform(u.g, 4326), 6) AS geo, ST_AsEWKT(u.g) AS ewkt
             FROM u, p WHERE NOT ST_IsEmpty(u.g) AND ST_Area(u.g) >= {$minLuas}
             ORDER BY az",
            [$ewkt],
        );

        $sisa = DB::selectOne(
            "WITH z AS (SELECT ST_GeomFromEWKT(?) AS g),
             k AS (SELECT ST_CollectionExtract(ST_Difference(ST_Buffer(g, -{$ndu}, 'join=mitre'), ST_Buffer(g, -{$nduc}, 'join=mitre')), 3) AS kor,
                          ST_CollectionExtract(ST_Buffer(g, -{$ntebal}, 'join=mitre'), 3) AS inti, ST_Area(g) AS luas FROM z)
             SELECT ST_AsGeoJSON(ST_Transform(kor, 4326), 6) AS koridor, ST_Area(kor) AS luas_koridor,
                    ST_AsGeoJSON(ST_Transform(inti, 4326), 6) AS inti, ST_Area(inti) AS luas_inti, luas FROM k",
            [$ewkt],
        );

        $fitur = [];
        if ((float) $sisa->luas_koridor > 1) {
            $fitur[] = self::fitur($sisa->koridor, ['jenis' => 'koridor']);
        }
        if ((float) $sisa->luas_inti > 4) {
            // Sisa kecil di tengah gedung = inti lift/tangga; sisa besar = halaman dalam (void) di tengah gedung.
            $fitur[] = self::fitur($sisa->inti, ['jenis' => (float) $sisa->luas_inti <= 400 ? 'inti' : 'void']);
        }

        return ['unit' => $unit, 'fitur' => $fitur, 'luas' => (float) $sisa->luas];
    }

    /**
     * Cadangan untuk lahan yang terlalu sempit bagi gedung berkoridor: satu massa bangunan (lahan dikurangi sempadan,
     * diperkecil seimbang sampai seluas tapak KDB).
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>, 2: array<string, mixed>, 3: float, 4: array<string, mixed>}
     */
    private function bangunanSederhana(string $tipe, string $lahan, float $luas, array $asumsi, array $intensitas): array
    {
        $t = DB::selectOne(
            "WITH s AS (SELECT ST_Buffer(ST_GeomFromEWKT(?), ".self::n(-(float) $asumsi['sempadan']).", 'join=mitre') AS g)
             SELECT ST_Area(g) AS luas, ST_AsEWKT(g) AS ewkt FROM s WHERE NOT ST_IsEmpty(g)",
            [$lahan],
        );

        $tersedia = $t ? (float) $t->luas : 0.0;
        $kapasitas = $this->kapasitas->bangunan($tipe, $luas, $tersedia, $asumsi, $intensitas['kdb'], $intensitas['klb']);
        $kapasitas += [
            'unit_per_lantai' => $kapasitas['lantai'] > 0 ? intdiv($kapasitas['jumlah'], $kapasitas['lantai']) : 0,
            'komposisi' => [],
            'parkir' => ['butuh' => $this->kapasitas->butuhParkir($tipe, $kapasitas['jumlah'], $asumsi), 'muat' => 0, 'jenis' => KapasitasLahan::jenisParkir($tipe), 'lantai' => 0],
        ];

        $fitur = [];
        $faktor = KapasitasLahan::faktorSkala($tersedia, (float) $kapasitas['luas_tapak_m2']);
        if ($t && $faktor > 0) {
            $f = self::n($faktor);
            $tapak = DB::selectOne(
                "WITH s AS (SELECT ST_GeomFromEWKT(?) AS g)
                 SELECT ST_AsGeoJSON(ST_Transform(ST_Scale(g, ST_MakePoint({$f}, {$f}), ST_Centroid(g)), 4326), 6) AS geo FROM s",
                [$t->ewkt],
            );
            $fitur[] = self::fitur($tapak->geo, ['jenis' => 'tapak', 'lantai' => $kapasitas['lantai'], 'jumlah' => $kapasitas['jumlah'], 'satuan' => $kapasitas['satuan']]);
        }

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur], ['type' => 'FeatureCollection', 'features' => []], 0.0, ['type' => 'FeatureCollection', 'features' => []]];
    }
}
