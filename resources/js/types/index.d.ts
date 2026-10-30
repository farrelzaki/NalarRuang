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

export type RingkasanLayer = { jenis: 'stasiun' | 'tol' | 'hijau' | 'banjir' | 'banjir-1' | 'banjir-2' | 'banjir-3' | 'genangan' | 'legal'; teks: string };

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
    /** Fasilitas utama terdekat per persona, untuk kalimat kesimpulan (T-033). */
    fakta?: Record<Persona, FaktaFasilitas | null>;
    kesimpulan: string[];
    data_tidak_lengkap: boolean;
    /** Zona RDTR di titik (hanya DKI Jakarta). */
    zonasi?: { zona: string; subzona: string | null; kdb: number | null; klb: number | null; sumber: string } | null;
    /** Peringatan, mis. titik di makam, perairan, atau di luar Jabodetabek. */
    catatan?: string | null;
};

export type FaktaFasilitas = {
    nama: string;
    meter: number;
    jumlah_1km?: number;
    kualitas_udara?: string | null;
    pm25?: number | null;
    banjir?: string | null;
    genangan_2020?: boolean;
};

export type InspectWilayah = {
    jenis_geometri: 'wilayah';
    nama: string;
    wilayah: string;
    wilayah_id: number;
    geometri: Geometry;
    match: Record<Persona, boolean>;
    jumlah_fasilitas: Record<Persona, number>;
    /** Fasilitas utama terdekat dari batas kawasan; meter = 0 bila di dalam kawasan. */
    terdekat?: Record<Persona, { nama: string; meter: number } | null>;
    kesimpulan: string[];
    data_tidak_lengkap: boolean;
    udara?: { kategori: string | null; pm25: number | null; sumber: string };
    penduduk?: { jumlah: number; kepadatan_per_km2: number; sumber: string } | null;
};

export type InspectResponse = InspectTitik | InspectWilayah;

/** Respons GET /api/lokasi (saran kolom titik A/B, FR-10). */
export type SaranLokasi = { nama: string; keterangan: string; jenis: 'wilayah' | 'stasiun' | 'halte' | 'poi'; lat: number; lng: number };

export type RuteModa = {
    jarak_km: number;
    waktu_menit: number;
    biaya: number;
};

/** Langkah perjalanan transportasi umum (T-042). `garis` = indeks bagian geometri.rel untuk ruas naik. */
export type LangkahRute =
    | { tipe: 'jalan' | 'ojol'; ke: string; menit: number; meter: number; biaya?: number }
    | { tipe: 'naik'; moda: string; jenis: string; lin: string; dari: string; ke: string; henti: number; menit: number; meter: number; garis?: number | null }
    | { tipe: 'pindah'; di: string; ke: string; menit: number; meter: number };

export type CommuteResponse = {
    pribadi: (RuteModa & { geometri: LineString; biaya_bbm?: number; biaya_tol?: number; lewat_tol?: boolean; ganjil_genap?: { hindari: boolean; ruas: string[] } }) | null;
    publik: (RuteModa & {
        rincian: string;
        biaya_transum?: number;
        biaya_ojol?: number;
        langkah?: LangkahRute[];
        stasiun: { nama: string; lat: number; lng: number }[];
        geometri: { jalan_kaki: LineString[]; ojol?: LineString[]; rel: LineString | MultiLineString };
    }) | null;
    catatan: string;
};
