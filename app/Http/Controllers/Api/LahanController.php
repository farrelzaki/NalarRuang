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
 * estimasi kapasitas, dan geometri pendukung (kavling + jalan untuk rumah tapak, tapak bangunan untuk kos/apartemen).
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
            'persona' => 'nullable|array',
            'persona.*' => 'string',
        ]);

        $tipe = (string) $request->input('tipe');
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

        [$kapasitas, $geometri] = $tipe === 'rumah'
            ? $this->rumah($geojson, $luas, $asumsi, $intensitas)
            : $this->bangunan($tipe, $geojson, $luas, $asumsi, $intensitas);

        $catatan = [];
        if ($zonasi && $zonasi['bukan_hunian']) {
            $catatan[] = "Sebagian besar lahan berada di {$zonasi['zona']} menurut RDTR DKI 2022, bukan zona hunian. Estimasi hanya ilustrasi.";
        }
        if ($intensitas['sumber'] === 'asumsi') {
            $catatan[] = $zonasi
                ? 'Zona ini tidak mencantumkan KDB/KLB, jadi dipakai angka asumsi.'
                : 'Zonasi resmi baru tersedia untuk DKI Jakarta. KDB/KLB di sini angka asumsi, bukan aturan resmi.';
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
            'asumsi' => $asumsi,
            'kapasitas' => $kapasitas,
            'geometri_kapasitas' => $geometri,
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
                    f.atribut->>'kdb_teks' AS kdb_teks, f.atribut->>'klb_teks' AS klb_teks,
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
            'bukan_hunian' => $bukanHunian,
        ];
    }

    /**
     * KDB (%) dan KLB yang dipakai. Luas persil: satu kavling untuk rumah tapak, seluruh lahan untuk kos/apartemen.
     *
     * @return array{kdb: float, klb: float, sumber: string, alternatif: int, luas_persil_m2: float}
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
     * @return array{petak: list<object>, jalan: list<string>}
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
             SELECT 'jalan', 0, 0, 0, ST_AsGeoJSON(ST_Transform(ST_Rotate(kotak, pi() / 2 - az, pusat), 4326), 6), NULL
             FROM jalan WHERE NOT ST_IsEmpty(kotak) AND ST_Area(kotak) > 1
             ORDER BY 2, 4, 3",
            [$ewkt],
        );

        return [
            'petak' => array_values(array_filter($baris, fn ($b) => $b->jenis === 'petak')),
            'jalan' => array_map(fn ($b) => $b->geo, array_values(array_filter($baris, fn ($b) => $b->jenis === 'jalan'))),
        ];
    }

    /** @return array<string, mixed> */
    private static function fitur(string $geo, array $properti): array
    {
        return ['type' => 'Feature', 'properties' => $properti, 'geometry' => json_decode($geo)];
    }

    /**
     * Rumah tapak: jalan lingkar di tepi lahan, lalu grid kavling di dalamnya dengan jalan lingkungan tiap dua baris
     * (semua jalan tersambung ke jalan lingkar). Jumlah rumah = kavling yang utuh muat.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function rumah(string $geojson, float $luas, array $asumsi, array $intensitas): array
    {
        $jalan = (float) $asumsi['lebar_jalan'];
        $utm = self::UTM;

        $l = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
                  d AS (SELECT g, ST_Buffer(g, -".self::n($jalan).", 'join=mitre') AS dalam FROM l)
             SELECT ST_IsEmpty(dalam) OR ST_Area(dalam) < 1 AS sempit, ST_AsEWKT(g) AS lahan, ST_AsEWKT(dalam) AS dalam,
                    ST_AsGeoJSON(ST_Transform(ST_Difference(g, dalam), 4326), 6) AS lingkar
             FROM d",
            [$geojson],
        );

        // Lahan terlalu sempit untuk jalan lingkar: kavling langsung di seluruh lahan.
        $petak = $this->petak($l->sempit ? $l->lahan : $l->dalam, (float) $asumsi['lebar_kavling'], (float) $asumsi['panjang_kavling'], $jalan);

        $fitur = [];
        if (! $l->sempit) {
            $fitur[] = self::fitur($l->lingkar, ['jenis' => 'jalan']);
        }
        foreach ($petak['jalan'] as $geo) {
            $fitur[] = self::fitur($geo, ['jenis' => 'jalan']);
        }
        foreach ($petak['petak'] as $p) {
            // Tiga warna atap bergantian supaya deretan rumah terbaca seperti tampak atas perumahan.
            $fitur[] = self::fitur($p->geo, ['jenis' => 'kavling', 'varian' => ($p->k + $p->s + $p->b) % 3]);
        }

        $kapasitas = $this->kapasitas->rumah($luas, count($petak['petak']), $asumsi, $intensitas['kdb'], $intensitas['klb']);

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur]];
    }

    /**
     * Kos/apartemen bergaya TestFit: gedung berkoridor tengah yang mengikuti tepi lahan (dikurangi sempadan),
     * dua deret unit di kiri-kanan koridor. Unit dibagi dengan Voronoi dari titik-titik berjarak satu lebar unit
     * di sepanjang garis tengah tiap deret, sehingga ikut berbelok di sudut. Bila tapak melebihi KDB, lingkar gedung
     * dipotong (bentuk C/U). Halaman tengah menjadi taman dan parkir (slot 2,5 x 5 m).
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function bangunan(string $tipe, string $geojson, float $luas, array $asumsi, array $intensitas): array
    {
        $utm = self::UTM;
        $s = (float) $asumsi['sempadan'];
        $du = KapasitasLahan::KEDALAMAN_UNIT[$tipe];
        $c = KapasitasLahan::LEBAR_KORIDOR[$tipe];
        $tebal = KapasitasLahan::tebalGedung($tipe);
        $w = $this->kapasitas->lebarUnit($tipe, $asumsi);
        [$ns, $nsdu, $nsduc, $nst, $nw] = array_map([self::class, 'n'], [$s, $s + $du, $s + $du + $c, $s + $tebal, $w]);
        $tengah1 = self::n($s + $du / 2);
        $tengah2 = self::n($s + $du + $c + $du / 2);
        $minLuas = self::n(0.35 * $w * $du);

        $ukur = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g)
             SELECT ST_Area(ST_Difference(ST_Buffer(g, -{$ns}, 'join=mitre'), ST_Buffer(g, -{$nst}, 'join=mitre'))) AS cincin FROM l",
            [$geojson],
        );
        $cincin = (float) ($ukur->cincin ?? 0);
        $porsi = KapasitasLahan::porsiLingkar($luas, $intensitas['kdb'], $cincin);

        $unit = $cincin > 0 && $porsi > 0 ? DB::select(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
             p AS (SELECT ST_Centroid(g) AS pusat FROM l),
             pita AS (
                 SELECT 1 AS deret, ST_Difference(ST_Buffer(g, -{$ns}, 'join=mitre'), ST_Buffer(g, -{$nsdu}, 'join=mitre')) AS band, {$tengah1}::float8 AS tengah FROM l
                 UNION ALL
                 SELECT 2, ST_Difference(ST_Buffer(g, -{$nsduc}, 'join=mitre'), ST_Buffer(g, -{$nst}, 'join=mitre')), {$tengah2}::float8 FROM l
             ),
             garis AS (SELECT pita.deret, ST_ExteriorRing((ST_Dump(ST_Buffer(l.g, -pita.tengah, 'join=mitre'))).geom) AS ln FROM pita, l),
             -- Benih unit di tiap ruas garis tengah, pada kelipatan lebar unit terhadap proyeksi global ruas itu,
             -- supaya unit di sisi yang tidak ditarik tetap di tempatnya.
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
                 SELECT deret, (ST_Dump(ST_VoronoiPolygons(ST_Collect(t), 0, (SELECT ST_Expand(g, 200) FROM l)))).geom AS v
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
            [$geojson],
        ) : [];

        // Potong lingkar bila tapak penuh melebihi KDB: pertahankan unit dengan azimut < 2*pi*porsi (bentuk C/U).
        $batasAz = 2 * M_PI * $porsi;
        $unit = array_values(array_filter($unit, fn ($u) => $porsi >= 1 || (float) $u->az < $batasAz));

        if ($unit === []) {
            // Lahan terlalu sempit untuk gedung berkoridor: hitungan cadangan satu massa bangunan.
            return $this->bangunanSederhana($tipe, $geojson, $luas, $asumsi, $intensitas);
        }

        $porsiTipe = $tipe === 'kos' ? ['kamar' => 1.0] : $this->kapasitas->porsiTipe($asumsi);
        $urutan = KapasitasLahan::sebarTipe(count($unit), $porsiTipe);

        // Koridor (dipotong sama) dan halaman tengah; tapak = unit + koridor.
        $irisan = $porsi >= 1 ? 'k.g' : 'ST_Intersection(k.g, ST_Buffer(ST_Collect(ARRAY(SELECT ST_GeomFromEWKT(e) FROM unnest(?::text[]) AS e)), '.self::n($c + 1).'))';
        $bind = [$geojson];
        if ($porsi < 1) {
            $bind[] = '{'.implode(',', array_map(fn ($u) => '"'.$u->ewkt.'"', $unit)).'}';
        }
        $gedung = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
             k AS (SELECT ST_Difference(ST_Buffer(g, -{$nsdu}, 'join=mitre'), ST_Buffer(g, -{$nsduc}, 'join=mitre')) AS g FROM l),
             kor AS (SELECT ST_CollectionExtract({$irisan}, 3) AS g FROM k)
             SELECT ST_AsGeoJSON(ST_Transform(kor.g, 4326), 6) AS koridor, ST_Area(kor.g) AS luas_koridor, ST_AsEWKT(kor.g) AS ewkt FROM kor",
            $bind,
        );

        $luasUnit = array_sum(array_map(fn ($u) => (float) $u->luas, $unit));
        $luasTapak = $luasUnit + (float) $gedung->luas_koridor;
        $kapasitas = $this->kapasitas->gedung($tipe, $luas, $luasTapak, $urutan, $asumsi, $intensitas['kdb'], $intensitas['klb']);

        $fitur = [];
        foreach ($unit as $i => $u) {
            $fitur[] = self::fitur($u->geo, ['jenis' => 'unit', 'tipe' => $urutan[$i]]);
        }
        if ($gedung->koridor) {
            $fitur[] = self::fitur($gedung->koridor, ['jenis' => 'koridor']);
        }

        // Halaman: lahan dikurangi sempadan dan gedung (dengan jarak 3 m). Parkir diambil dari halaman sesuai kebutuhan.
        $semuaGedung = '{'.implode(',', array_map(fn ($e) => '"'.$e.'"', [...array_map(fn ($u) => $u->ewkt, $unit), $gedung->ewkt])).'}';
        $halaman = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
             b AS (SELECT ST_Union(ARRAY(SELECT ST_GeomFromEWKT(e) FROM unnest(?::text[]) AS e)) AS g),
             h AS (SELECT ST_CollectionExtract(ST_Difference(ST_Buffer(l.g, -".self::n($s + 1).", 'join=mitre'), ST_Buffer(b.g, 3)), 3) AS g FROM l, b)
             SELECT ST_AsEWKT(g) AS ewkt, ST_Area(g) AS luas FROM h WHERE NOT ST_IsEmpty(g)",
            [$geojson, $semuaGedung],
        );

        $taman = $halaman?->ewkt;
        $butuh = $kapasitas['parkir']['butuh'];
        if ($halaman && $butuh > 0) {
            $slot = $this->petak($halaman->ewkt, KapasitasLahan::SLOT_PARKIR['lebar'], KapasitasLahan::SLOT_PARKIR['panjang'], KapasitasLahan::SLOT_PARKIR['lorong']);
            $dipakai = array_slice($slot['petak'], 0, $butuh);
            $kapasitas['parkir']['muat'] = count($dipakai);
            if ($dipakai !== []) {
                $aspal = DB::selectOne(
                    "WITH h AS (SELECT ST_GeomFromEWKT(?) AS g),
                     s AS (SELECT ST_Collect(ARRAY(SELECT ST_GeomFromEWKT(e) FROM unnest(?::text[]) AS e)) AS g),
                     a AS (SELECT ST_CollectionExtract(ST_Intersection(h.g, ST_Buffer(ST_ConvexHull(s.g), ".self::n(KapasitasLahan::SLOT_PARKIR['lorong']).", 'join=mitre')), 3) AS g FROM h, s)
                     SELECT ST_AsGeoJSON(ST_Transform(a.g, 4326), 6) AS aspal,
                            ST_AsEWKT(ST_CollectionExtract(ST_Difference(h.g, a.g), 3)) AS sisa
                     FROM a, h",
                    [$halaman->ewkt, '{'.implode(',', array_map(fn ($p) => '"'.$p->ewkt.'"', $dipakai)).'}'],
                );
                $fitur[] = self::fitur($aspal->aspal, ['jenis' => 'parkir']);
                foreach ($dipakai as $p) {
                    $fitur[] = self::fitur($p->geo, ['jenis' => 'slot']);
                }
                $taman = $aspal->sisa;
            }
        }
        if ($taman) {
            $geo = DB::selectOne('SELECT ST_AsGeoJSON(ST_Transform(ST_GeomFromEWKT(?), 4326), 6) AS geo, ST_Area(ST_GeomFromEWKT(?)) AS luas', [$taman, $taman]);
            if ((float) $geo->luas > 4) {
                // Label jumlah lantai dan unit di tengah taman (tooltip permanen di peta).
                $fitur[] = self::fitur($geo->geo, ['jenis' => 'taman', 'lantai' => $kapasitas['lantai'], 'jumlah' => $kapasitas['jumlah'], 'satuan' => $kapasitas['satuan']]);
            }
        }

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur]];
    }

    /**
     * Cadangan untuk lahan yang terlalu sempit bagi gedung berkoridor: satu massa bangunan (lahan dikurangi sempadan,
     * diperkecil seimbang sampai seluas tapak KDB).
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function bangunanSederhana(string $tipe, string $geojson, float $luas, array $asumsi, array $intensitas): array
    {
        $utm = self::UTM;
        $t = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
                  s AS (SELECT ST_Buffer(g, -".self::n((float) $asumsi['sempadan']).", 'join=mitre') AS g FROM l)
             SELECT ST_Area(g) AS luas, ST_AsEWKT(g) AS ewkt FROM s WHERE NOT ST_IsEmpty(g)",
            [$geojson],
        );

        $tersedia = $t ? (float) $t->luas : 0.0;
        $kapasitas = $this->kapasitas->bangunan($tipe, $luas, $tersedia, $asumsi, $intensitas['kdb'], $intensitas['klb']);
        $kapasitas += [
            'unit_per_lantai' => $kapasitas['lantai'] > 0 ? intdiv($kapasitas['jumlah'], $kapasitas['lantai']) : 0,
            'komposisi' => [],
            'parkir' => ['butuh' => (int) ceil($kapasitas['jumlah'] * (float) ($asumsi['rasio_parkir'] ?? 0)), 'muat' => 0],
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

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur]];
    }
}
