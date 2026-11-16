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

    /**
     * Rumah tapak: grid kavling di UTM 48S, diputar searah sisi terpanjang lahan (ST_OrientedEnvelope), berpola
     * jalan + dua baris kavling saling membelakangi. Kavling yang utuh berada di dalam lahan saja yang dihitung.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function rumah(string $geojson, float $luas, array $asumsi, array $intensitas): array
    {
        $lebar = (float) $asumsi['lebar_kavling'];
        $panjang = (float) $asumsi['panjang_kavling'];
        $jalan = (float) $asumsi['lebar_jalan'];
        $periode = $jalan + 2 * $panjang;
        $utm = self::UTM;

        $baris = DB::select(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
             o AS (
                 SELECT g, ST_Centroid(g) AS pusat, ST_ExteriorRing(ST_OrientedEnvelope(g)) AS cincin FROM l
             ),
             sudut AS (
                 SELECT g, pusat,
                        CASE WHEN ST_Distance(ST_PointN(cincin, 1), ST_PointN(cincin, 2)) >= ST_Distance(ST_PointN(cincin, 2), ST_PointN(cincin, 3))
                             THEN ST_Azimuth(ST_PointN(cincin, 1), ST_PointN(cincin, 2))
                             ELSE ST_Azimuth(ST_PointN(cincin, 2), ST_PointN(cincin, 3)) END AS az
                 FROM o
             ),
             -- Putar lahan supaya sisi terpanjang sejajar sumbu X (azimut diukur dari utara, searah jarum jam).
             r AS (SELECT ST_Rotate(g, az - pi() / 2, pusat) AS g, az, pusat FROM sudut),
             e AS (SELECT g, ST_Buffer(g, 0.05) AS gb, az, pusat, ST_XMin(g) AS x0, ST_YMin(g) AS y0, ST_XMax(g) AS x1, ST_YMax(g) AS y1 FROM r),
             blok AS (SELECT e.*, b FROM e, generate_series(0, ceil((e.y1 - e.y0) / ?::float8)::int) AS b),
             kavling AS (
                 SELECT blok.gb, blok.az, blok.pusat,
                        ST_MakeEnvelope(blok.x0 + k * ?::float8, blok.y0 + blok.b * ?::float8 + ?::float8 + s * ?::float8,
                                        blok.x0 + (k + 1) * ?::float8, blok.y0 + blok.b * ?::float8 + ?::float8 + (s + 1) * ?::float8, {$utm}) AS kotak
                 FROM blok, generate_series(0, ceil((blok.x1 - blok.x0) / ?::float8)::int) AS k, generate_series(0, 1) AS s
             ),
             jalan AS (
                 SELECT blok.g, blok.az, blok.pusat,
                        ST_Intersection(blok.g, ST_MakeEnvelope(blok.x0, blok.y0 + blok.b * ?::float8, blok.x1, blok.y0 + blok.b * ?::float8 + ?::float8, {$utm})) AS kotak
                 FROM blok
             )
             SELECT 'kavling' AS jenis, ST_AsGeoJSON(ST_Transform(ST_Rotate(kotak, pi() / 2 - az, pusat), 4326), 6) AS geo
             FROM kavling WHERE ST_CoveredBy(kotak, gb)
             UNION ALL
             SELECT 'jalan', ST_AsGeoJSON(ST_Transform(ST_Rotate(kotak, pi() / 2 - az, pusat), 4326), 6)
             FROM jalan WHERE NOT ST_IsEmpty(kotak) AND ST_Area(kotak) > 1",
            [
                $geojson,
                $periode,
                $lebar, $periode, $jalan, $panjang, $lebar, $periode, $jalan, $panjang,
                $lebar,
                $periode, $periode, $jalan,
            ],
        );

        $fitur = [];
        $jumlah = 0;
        foreach ($baris as $b) {
            if ($b->jenis === 'kavling') {
                $jumlah++;
            }
            $fitur[] = ['type' => 'Feature', 'properties' => ['jenis' => $b->jenis], 'geometry' => json_decode($b->geo)];
        }

        $kapasitas = $this->kapasitas->rumah($luas, $jumlah, $asumsi, $intensitas['kdb'], $intensitas['klb']);

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur]];
    }

    /**
     * Kos/apartemen: lahan dikurangi sempadan (buffer ke dalam), lalu diperkecil seimbang di sekitar pusatnya
     * supaya luasnya sama dengan tapak yang diizinkan KDB.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function bangunan(string $tipe, string $geojson, float $luas, array $asumsi, array $intensitas): array
    {
        $utm = self::UTM;
        $sempadan = (float) $asumsi['sempadan'];

        $t = DB::selectOne(
            "WITH l AS (SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), {$utm}) AS g),
                  s AS (SELECT ST_Buffer(g, -(?::float8), 'join=mitre') AS g FROM l)
             SELECT ST_Area(g) AS luas, ST_AsEWKT(g) AS ewkt FROM s WHERE NOT ST_IsEmpty(g)",
            [$geojson, $sempadan],
        );

        $tersedia = $t ? (float) $t->luas : 0.0;
        $kapasitas = $this->kapasitas->bangunan($tipe, $luas, $tersedia, $asumsi, $intensitas['kdb'], $intensitas['klb']);

        $fitur = [];
        $faktor = KapasitasLahan::faktorSkala($tersedia, (float) $kapasitas['luas_tapak_m2']);
        if ($t && $faktor > 0) {
            $tapak = DB::selectOne(
                'WITH s AS (SELECT ST_GeomFromEWKT(?) AS g)
                 SELECT ST_AsGeoJSON(ST_Transform(ST_Scale(g, ST_MakePoint(?::float8, ?::float8), ST_Centroid(g)), 4326), 6) AS geo FROM s',
                [$t->ewkt, $faktor, $faktor],
            );
            $fitur[] = [
                'type' => 'Feature',
                'properties' => ['jenis' => 'tapak', 'lantai' => $kapasitas['lantai'], 'jumlah' => $kapasitas['jumlah'], 'satuan' => $kapasitas['satuan']],
                'geometry' => json_decode($tapak->geo),
            ];
        }

        return [$kapasitas, ['type' => 'FeatureCollection', 'features' => $fitur]];
    }
}
