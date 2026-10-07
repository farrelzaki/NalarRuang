<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Impor data contoh demo dari data/geojson/demo/ ke PostGIS.
 * Geometri berasal dari data nyata (OSM, InaRISK); atribut yang ditandai "contoh" belum dari sumber resmi.
 */
class DemoPetaSeeder extends Seeder
{
    private const FOLDER = 'data/geojson/demo';

    public function run(): void
    {
        DB::table('fitur_peta')->truncate();
        DB::table('wilayah')->truncate();

        $this->imporWilayah();

        foreach (glob(base_path(self::FOLDER.'/fitur/*.geojson')) as $berkas) {
            $this->imporFitur($berkas);
        }

        // Poligon hasil vektorisasi raster kadang bersilangan sendiri; perbaiki agar ST_Intersects/ST_Area andal.
        DB::statement('UPDATE fitur_peta SET geom = ST_CollectionExtract(ST_MakeValid(geom), ST_Dimension(geom) + 1) WHERE NOT ST_IsValid(geom)');
        DB::statement('UPDATE wilayah SET geom = ST_Multi(ST_CollectionExtract(ST_MakeValid(geom), 3)) WHERE NOT ST_IsValid(geom)');
        DB::statement('ANALYZE fitur_peta');
        DB::statement('ANALYZE wilayah');
    }

    private function baca(string $berkas): array
    {
        $isi = json_decode((string) file_get_contents($berkas), true);
        if (! is_array($isi) || ! isset($isi['features'])) {
            throw new RuntimeException("GeoJSON tidak valid: {$berkas}");
        }

        return $isi['features'];
    }

    private function imporWilayah(): void
    {
        $fitur = $this->baca(base_path(self::FOLDER.'/wilayah.geojson'));

        foreach (array_chunk($fitur, 200) as $potongan) {
            foreach ($potongan as $f) {
                $p = $f['properties'];
                DB::insert(
                    'INSERT INTO wilayah (nama, kecamatan, kota, tipe_kawasan, kualitas_udara, atribut, geom, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?::jsonb, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)), now(), now())',
                    [
                        $p['nama'],
                        $p['kecamatan'] ?? null,
                        $p['kota'] ?? null,
                        $p['tipe_kawasan'] ?? null,
                        $p['kualitas_udara'] ?? null,
                        json_encode($p['atribut'] ?? new \stdClass()),
                        json_encode($f['geometry']),
                    ],
                );
            }
        }
    }

    private function imporFitur(string $berkas): void
    {
        $fitur = $this->baca($berkas);

        DB::transaction(function () use ($fitur) {
            foreach ($fitur as $f) {
                $p = $f['properties'];
                DB::insert(
                    'INSERT INTO fitur_peta (layer_id, jenis, nama, atribut, tahun, sumber, geom, created_at, updated_at)
                     VALUES (?, ?, ?, ?::jsonb, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326), now(), now())',
                    [
                        $p['layer_id'],
                        $p['jenis'],
                        $p['nama'] ?? null,
                        json_encode($p['atribut'] ?? new \stdClass()),
                        $p['tahun'] ?? null,
                        $p['sumber'] ?? null,
                        json_encode($f['geometry']),
                    ],
                );
            }
        });
    }
}
