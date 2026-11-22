/**
 * Tipe yang mencerminkan kontrak API (docs/SISTEM.md bagian 2).
 * Milik bersama Farrel, Adzkia, dan Nur'Afia: ubah hanya setelah kontrak disepakati.
 */
import type { FeatureCollection, Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson';

export type Persona = 'commuter' | 'driver' | 'social_vibe' | 'zen';

export type LayerKey = 'historis_risiko' | 'ekosistem' | 'kualitas_udara' | 'inklusivitas' | 'mobilitas' | 'mesin_waktu' | 'legalitas' | 'rdtr' | 'persil';

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

/** Area yang digambar pengguna (alat Area): dinilai seperti wilayah, ditambah luas dan kelurahan yang tercakup. */
export type InspectArea = Omit<InspectWilayah, 'jenis_geometri' | 'penduduk'> & {
    jenis_geometri: 'area';
    luas_m2: number;
    /** Kelurahan yang tercakup, urut dari irisan terbesar (maks. 5); porsi = bagian luas area (0–1). */
    kelurahan: { id: number; nama: string; kecamatan: string | null; kota: string | null; porsi: number }[];
    /** Bagian luas area yang masuk tampilan rawan banjir InaRISK (indeks >= 0,50), 0–1. */
    banjir: { porsi_rawan: number; sumber: string };
};

export type InspectResponse = InspectTitik | InspectWilayah | InspectArea;

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

export type RutePribadi = RuteModa & {
    geometri: LineString;
    biaya_bbm?: number;
    biaya_tol?: number;
    lewat_tol?: boolean;
    ganjil_genap?: { hindari: boolean; ruas: string[] };
    /** Titik dekat garis lurus tapi rute mobil memutar jauh (kemungkinan hanya terjangkau lewat gang): tawaran jalan kaki langsung. */
    jalan_kaki_alternatif?: { menit: number; meter: number } | null;
};

export type RutePublik = RuteModa & {
    rincian: string;
    biaya_transum?: number;
    biaya_ojol?: number;
    langkah?: LangkahRute[];
    stasiun: { nama: string; lat: number; lng: number }[];
    geometri: { jalan_kaki: LineString[]; ojol?: LineString[]; rel: LineString | MultiLineString };
};

/** Maks 3 rute, terurut dari yang terbaik (tercepat/termurah), ala Google Maps. */
export type CommuteResponse = {
    pribadi: RutePribadi[] | null;
    publik: RutePublik[] | null;
    catatan: string;
};

/** Satu rute pribadi + satu rute publik yang sedang ditampilkan di peta (hasil pilih alternatif). */
export type RuteTampil = { pribadi: RutePribadi | null; publik: RutePublik | null };
/** Uji Lahan (FR-23): tipe bangunan yang diestimasi. */
export type TipeLahan = 'rumah' | 'kos' | 'apartemen';

/** Asumsi yang bisa diubah pengguna; server menjepitnya ke rentang aman dan mengembalikan nilai yang dipakai. */
export type AsumsiLahan = {
    lebar_kavling?: number;
    panjang_kavling?: number;
    lebar_jalan?: number;
    luas_kamar?: number;
    /** Apartemen: porsi studio (24 m²) dan 2 kamar (54 m²), 0–1; sisanya 1 kamar (36 m²). */
    porsi_studio?: number;
    porsi_2br?: number;
    sempadan?: number;
    lantai?: number | null;
    /** Apartemen: slot parkir mobil per unit. */
    rasio_parkir?: number;
    /** Kos: slot parkir motor per kamar. */
    rasio_motor?: number;
};

/** Pola tata letak (mirip preset TestFit). rumah: grid/cluster; kos: keliling/koridor; apartemen: keliling/wrap/tower. */
export type PolaLahan = 'grid' | 'cluster' | 'keliling' | 'koridor' | 'wrap' | 'tower';

/** Zona yang bisa ditarik sendiri-sendiri. */
export type JenisZona = 'bangunan' | 'parkir' | 'taman';

/** Zona yang dikirim pengguna setelah menariknya; urutan = nomor zona (`id`). */
export type ZonaLahanMasuk = { jenis: JenisZona; geometri: Polygon };

/** Zona di respons: geometri yang sudah dipotong ke lahan; `lantai` untuk gedung parkir bertingkat. */
export type ZonaLahanProps = { id: number; jenis: JenisZona; luas_m2: number; lantai?: number };

/** Akses yang ditaruh sendiri: gerbang kendaraan (mobil/motor) di tepi lahan, pintu masuk/keluar gedung di tepi zona bangunan. */
export type JenisAkses = 'gerbang' | 'pintu';

/** Titik akses [lng, lat]; urutan = `id` akses. Pintu diabaikan untuk rumah tapak. */
export type AksesLahanMasuk = {
    jenis: JenisAkses;
    titik: [number, number];
    /** Gerbang: lebar 2,5–30 m (kosong = bawaan tipe). Pintu: lebar bukaan 1,5–20 m (kosong = 3 m). */
    lebar?: number;
    /** Gerbang: panjang jalan masuk 2–300 m (kosong = sampai jalan/parkir). Pintu: kedalaman lobi 2–40 m (kosong = satu unit). */
    panjang?: number;
};

/** Akses di respons: lebar dan panjang yang dipakai (gerbang: jalan masuk; pintu: lobi) dan apakah panjangnya otomatis. */
export type AksesLahanProps = { id: number; jenis: JenisAkses; lebar: number; panjang?: number; otomatis?: boolean };

/** Kepatuhan terhadap RDTR (atau asumsi); `pelanggaran` berisi kunci yang lewat batas. */
export type RingkasanLahan = {
    kdb_terpakai: number;
    kdb_batas: number;
    klb_terpakai: number;
    klb_batas: number;
    kdh_terpakai: number;
    kdh_batas: number | null;
    tinggi_lantai_m: number;
    tinggi_m: number;
    pelanggaran: ('kdb' | 'klb' | 'kdh' | 'parkir')[];
};

/** Tipe unit apartemen; kos memakai 'kamar'. */
export type TipeUnit = 'studio' | '1br' | '2br' | 'kamar';

/** Badan permintaan POST /api/lahan. */
export type LahanRequest = {
    geometri: Polygon;
    tipe: TipeLahan;
    asumsi?: AsumsiLahan;
    pola?: PolaLahan;
    /** Tanpa ini zona dibuat dari pola; dengan ini zona pengguna yang diisi. */
    zona?: ZonaLahanMasuk[];
    /** Gerbang dan pintu (≤ 6). */
    akses?: AksesLahanMasuk[];
    persona?: Persona[];
};

export type KapasitasLahan = {
    jumlah: number;
    satuan: 'rumah' | 'kamar' | 'unit';
    lantai: number;
    lantai_maks: number;
    luas_tapak_m2: number;
    luas_lantai_m2: number;
    kepadatan_per_ha: number | null;
    /** Rumah tapak. */
    luas_kavling_m2?: number;
    luas_tapak_per_unit_m2?: number;
    luas_bangunan_per_unit_m2?: number;
    porsi_jalan_fasum?: number | null;
    /** Kos dan apartemen. */
    luas_per_unit_m2?: number;
    porsi_tapak?: number | null;
    unit_per_lantai?: number;
    /** Jumlah unit per tipe di semua lantai. */
    komposisi?: Partial<Record<TipeUnit, number>>;
    /** Slot parkir yang dibutuhkan (rasio x unit) dan yang muat; motor untuk kos, mobil untuk apartemen. */
    parkir?: { butuh: number; muat: number; jenis: 'motor' | 'mobil' | null; lantai: number };
};

/** Respons POST /api/lahan (FR-23). */
export type LahanResponse = {
    luas_m2: number;
    keliling_m: number;
    pusat: { lat: number; lng: number };
    wilayah: string;
    wilayah_id: number;
    /** Zona RDTR paling luas di lahan (hanya DKI); porsi 0–1 dari luas lahan. */
    zonasi: { zona: string; subzona: string | null; porsi: number; sumber: string } | null;
    /** KDB dalam persen, KLB rasio; sumber 'asumsi' bila zona tidak tersedia. */
    intensitas: { kdb: number; klb: number; kdh: number | null; sumber: 'RDTR DKI 2022' | 'asumsi'; alternatif: 1 | 2; luas_persil_m2: number };
    banjir: { porsi_rawan: number; tingkat_maks: 1 | 2 | 3 | null; genangan_2020: boolean };
    match: Record<Persona, boolean>;
    terdekat: Record<Persona, { nama: string; meter: number } | null>;
    jumlah_fasilitas: Record<Persona, number>;
    kesimpulan: string[];
    tipe: TipeLahan;
    pola: PolaLahan;
    pola_tersedia: PolaLahan[];
    asumsi: AsumsiLahan;
    kapasitas: KapasitasLahan;
    ringkasan: RingkasanLahan;
    zona: FeatureCollection<Polygon | MultiPolygon, ZonaLahanProps>;
    zona_manual: boolean;
    /** Akses yang dipakai, sudah ditempelkan ke tepi lahan (gerbang) atau tepi gedung (pintu). */
    akses: FeatureCollection<Point, AksesLahanProps>;
    /**
     * Fitur `jenis`: rumah tapak 'kavling' (varian 0–2) + 'jalan' + 'taman'; kos/apartemen 'unit' (`tipe`), 'koridor',
     * 'inti', 'void', 'taman', 'parkir' (`lantai`), 'slot', 'lobi', 'jalur'; semua tipe 'akses' (jalan dari gerbang);
     * lahan sempit 'tapak'. Isi zona membawa `zona` (id zona); akses/lobi/jalur membawa `akses` (id akses).
     * 'taman'/'tapak' membawa `lantai`, `jumlah`, `satuan` untuk label.
     */
    geometri_kapasitas: FeatureCollection;
    catatan: string[];
};
