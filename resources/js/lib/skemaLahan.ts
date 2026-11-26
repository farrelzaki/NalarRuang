/**
 * Skema Uji Lahan (FR-23): simpan beberapa desain lahan lalu bandingkan angkanya berdampingan. Logika murni tanpa React dan peta,
 * dites dengan `npm run test:js`.
 *
 * Skema = foto desain (snapshot proyek: lahan, tipe, pola, asumsi, zona, akses, ...) + ringkasan angka hasil hitung saat disimpan.
 * Membuka skema memulihkan desainnya dan server menghitung ulang, jadi angka di tabel perbandingan adalah angka saat disimpan.
 * Skema hanya hidup di sesi klien (tanpa akun, tanpa penyimpanan ke server) dan tidak memuat persona.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { LahanResponse, PolaLahan, TipeLahan } from '@/types';
import type { SnapLahan } from './proyekLahan.ts';

export const SKEMA_MAKS = 4;

export type MetrikSkema = {
    tipe: TipeLahan;
    pola: PolaLahan;
    satuan: 'rumah' | 'kamar' | 'unit';
    jumlah: number;
    lantai: number;
    tinggi_m: number;
    luas_m2: number;
    luas_tapak_m2: number;
    luas_lantai_m2: number;
    kepadatan_per_ha: number | null;
    kdb_terpakai: number;
    kdb_batas: number;
    klb_terpakai: number;
    klb_batas: number;
    kdh_terpakai: number;
    /** Slot parkir yang muat dikurangi yang dibutuhkan (negatif = kurang); null bila tipe ini tanpa parkir. */
    parkir_selisih: number | null;
    pelanggaran: string[];
};

export type SkemaLahan = {
    id: string;
    nama: string;
    waktu: number;
    snap: SnapLahan;
    metrik: MetrikSkema;
};

/** Skema baru dari desain dan hasilnya; null bila belum ada lahan atau hasil yang siap. */
export function buatSkema(snap: SnapLahan, hasil: LahanResponse | null, nama: string, id: string, waktu: number): SkemaLahan | null {
    if (!snap.geom || !hasil || hasil.tipe !== snap.tipe) return null;
    const k = hasil.kapasitas;
    const r = hasil.ringkasan;
    return {
        id,
        nama: nama.trim().slice(0, 40) || 'Skema',
        waktu,
        snap,
        metrik: {
            tipe: hasil.tipe,
            pola: hasil.pola,
            satuan: k.satuan,
            jumlah: k.jumlah,
            lantai: k.lantai,
            tinggi_m: r.tinggi_m,
            luas_m2: hasil.luas_m2,
            luas_tapak_m2: k.luas_tapak_m2,
            luas_lantai_m2: k.luas_lantai_m2,
            kepadatan_per_ha: k.kepadatan_per_ha,
            kdb_terpakai: r.kdb_terpakai,
            kdb_batas: r.kdb_batas,
            klb_terpakai: r.klb_terpakai,
            klb_batas: r.klb_batas,
            kdh_terpakai: r.kdh_terpakai,
            parkir_selisih: k.parkir ? k.parkir.muat - k.parkir.butuh : null,
            pelanggaran: [...r.pelanggaran],
        },
    };
}

/** "Skema 1", "Skema 2", ...: nomor terkecil yang belum dipakai di daftar. */
export function namaBerikut(daftar: SkemaLahan[], awalan = 'Skema'): string {
    const dipakai = new Set(daftar.map((s) => s.nama));
    for (let i = 1; ; i++) if (!dipakai.has(`${awalan} ${i}`)) return `${awalan} ${i}`;
}

/** `tinggi` = angka lebih besar lebih baik, `rendah` = lebih kecil lebih baik, null = hanya informasi (tanpa penanda terbaik). */
export type ArahTerbaik = 'tinggi' | 'rendah' | null;

export type BarisBanding = {
    kunci: string;
    label: [string, string];
    satuan: string;
    arah: ArahTerbaik;
    /** Satu nilai per skema, searah dengan daftar; null = tidak berlaku. */
    nilai: (number | null)[];
    terbaik: boolean[];
    /** Melanggar batas (KDB, KLB, parkir, ...): ditandai merah. */
    melanggar: boolean[];
};

type Definisi = { kunci: string; label: [string, string]; satuan: string; arah: ArahTerbaik; ambil: (m: MetrikSkema) => number | null; melanggar?: (m: MetrikSkema) => boolean };

const DEFINISI: Definisi[] = [
    { kunci: 'jumlah', label: ['Jumlah (rumah/kamar/unit)', 'Count (houses/rooms/units)'], satuan: '', arah: 'tinggi', ambil: (m) => m.jumlah },
    { kunci: 'lantai', label: ['Lantai', 'Floors'], satuan: '', arah: null, ambil: (m) => m.lantai },
    { kunci: 'tinggi', label: ['Tinggi bangunan', 'Building height'], satuan: 'm', arah: null, ambil: (m) => m.tinggi_m },
    { kunci: 'luas_lantai', label: ['Luas lantai total', 'Total floor area'], satuan: 'm²', arah: 'tinggi', ambil: (m) => m.luas_lantai_m2 },
    { kunci: 'tapak', label: ['Tapak bangunan', 'Building footprint'], satuan: 'm²', arah: null, ambil: (m) => m.luas_tapak_m2 },
    { kunci: 'kepadatan', label: ['Kepadatan per hektare', 'Density per hectare'], satuan: '', arah: 'tinggi', ambil: (m) => m.kepadatan_per_ha },
    { kunci: 'kdb', label: ['KDB terpakai', 'Site coverage used'], satuan: '%', arah: null, ambil: (m) => m.kdb_terpakai, melanggar: (m) => m.pelanggaran.includes('kdb') },
    { kunci: 'klb', label: ['KLB terpakai', 'Floor area ratio used'], satuan: '', arah: null, ambil: (m) => m.klb_terpakai, melanggar: (m) => m.pelanggaran.includes('klb') },
    { kunci: 'kdh', label: ['Ruang hijau (KDH)', 'Green space (KDH)'], satuan: '%', arah: 'tinggi', ambil: (m) => m.kdh_terpakai, melanggar: (m) => m.pelanggaran.includes('kdh') },
    { kunci: 'parkir', label: ['Parkir (muat − butuh)', 'Parking (fit − need)'], satuan: 'slot', arah: 'tinggi', ambil: (m) => m.parkir_selisih, melanggar: (m) => m.pelanggaran.includes('parkir') },
    { kunci: 'pelanggaran', label: ['Pelanggaran batas', 'Limit violations'], satuan: '', arah: 'rendah', ambil: (m) => m.pelanggaran.length },
];

/**
 * Tabel perbandingan: satu baris per ukuran, satu nilai per skema. Penanda `terbaik` hanya bila ada pembanding yang berbeda;
 * "jumlah" hanya dibandingkan bila semua skema memakai satuan yang sama (rumah dengan kamar tidak sebanding).
 */
export function bandingkan(daftar: SkemaLahan[]): BarisBanding[] {
    const satuanSama = new Set(daftar.map((s) => s.metrik.satuan)).size <= 1;
    return DEFINISI.map((d) => {
        const nilai = daftar.map((s) => d.ambil(s.metrik));
        const ada = nilai.filter((v): v is number => v !== null);
        const boleh = d.arah !== null && ada.length >= 2 && new Set(ada).size > 1 && (d.kunci !== 'jumlah' || satuanSama);
        const unggul = boleh ? (d.arah === 'tinggi' ? Math.max(...ada) : Math.min(...ada)) : null;
        return {
            kunci: d.kunci,
            label: d.label,
            satuan: d.satuan,
            arah: d.arah,
            nilai,
            terbaik: nilai.map((v) => unggul !== null && v === unggul),
            melanggar: daftar.map((s) => d.melanggar?.(s.metrik) ?? false),
        };
    });
}
