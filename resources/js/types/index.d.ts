/**
 * Tipe yang mencerminkan kontrak API (docs/SISTEM.md bagian 2).
 * Milik bersama Farrel, Adzkia, dan Nur'Afia: ubah hanya setelah kontrak disepakati.
 */
import type { FeatureCollection, Geometry, LineString, MultiLineString } from 'geojson';

export type Persona = 'commuter' | 'driver' | 'social_vibe' | 'zen';

export type LayerKey = 'historis_risiko' | 'ekosistem' | 'inklusivitas' | 'mobilitas' | 'mesin_waktu' | 'legalitas';

/** Respons GET /api/health (setup; bukan bagian kontrak fitur). */
export type HealthResponse = {
    status: 'ok' | 'error';
    database: string;
    postgis: string | null;
};

export type LayerResponse = FeatureCollection;

export type HasilSearch = {
    wilayah_id: number;
    nama: string;
    tipe_kawasan: string;
    kota: string | null;
    match: number;
    pusat: { lat: number; lng: number };
    geometri: Geometry;
    alasan: string;
};

export type SearchResponse = {
    persona: Persona[];
    hindari_banjir?: boolean;
    hasil: HasilSearch[];
    message?: string;
};

export type RingkasanLayer = { jenis: 'stasiun' | 'hijau' | 'banjir'; teks: string };

export type InspectTitik = {
    jenis_geometri: 'titik';
    nama: string;
    wilayah: string;
    wilayah_id: number | null;
    lat: number;
    lng: number;
    stars: Record<Persona, number | null>;
    jarak_meter: Record<Persona, number | null>;
    ringkasan_layer: RingkasanLayer[];
    kesimpulan: string[];
    data_tidak_lengkap: boolean;
};

export type InspectWilayah = {
    jenis_geometri: 'wilayah';
    nama: string;
    wilayah: string;
    wilayah_id: number;
    geometri: Geometry;
    match: Record<Persona, boolean>;
    jumlah_fasilitas: Record<Persona, number>;
    kesimpulan: string[];
    data_tidak_lengkap: boolean;
};

export type InspectResponse = InspectTitik | InspectWilayah;

export type RuteModa = {
    jarak_km: number;
    waktu_menit: number;
    biaya: number;
};

export type CommuteResponse = {
    pribadi: (RuteModa & { geometri: LineString }) | null;
    publik: (RuteModa & {
        rincian: string;
        stasiun: { nama: string; lat: number; lng: number }[];
        geometri: { jalan_kaki: LineString[]; rel: LineString | MultiLineString };
    }) | null;
    catatan: string;
};
