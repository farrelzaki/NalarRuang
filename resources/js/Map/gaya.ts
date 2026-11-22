/** Gaya kartografi (design-system.md bagian 3.3, 9, 13.2). Hanya dipakai di folder Map/. */
import type { PathOptions } from 'leaflet';

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#0f1b3d';

export const warna = {
    navy: () => css('--navy-900'),
    banjir: () => css('--map-banjir'),
    hijau: () => css('--map-hijau'),
    akses: () => css('--map-akses'),
    mrt: () => css('--map-mrt'),
    lrt: () => css('--map-lrt'),
    waktu: () => css('--map-waktu'),
    legal: () => css('--map-legal'),
    stasiun: () => css('--map-stasiun'),
    krl: (lin: string) => css(`--map-krl-${['bogor', 'rangkas', 'cikarang', 'tangerang', 'priok', 'bandara'].includes(lin) ? lin : 'lain'}`),
    /** LRT Jakarta, LRT Jabodebek Bekasi/Cibubur, Kalayang. */
    lrtLin: (lin: string) =>
        lin === 'lrt-bekasi' ? css('--map-lrt-bekasi') : lin === 'lrt-cibubur' ? css('--map-lrt-cibubur') : lin === 'kalayang' ? css('--map-kalayang') : css('--map-lrt'),
    /** Warna ruas rute umum: "bogor"/"rangkas"/"cikarang"/"lain" (KRL), "mrt", "lrt", "tj". */
    lin: (lin: string) =>
        lin === 'mrt' ? css('--map-mrt') : lin.startsWith('lrt') || lin === 'kalayang' ? warna.lrtLin(lin) : lin === 'tj' ? css('--navy-900') : lin.startsWith('#') ? lin : warna.krl(lin),
};

export const banjir = (kelas: string): PathOptions => ({
    color: warna.banjir(),
    weight: 1,
    opacity: 0.6,
    fillColor: warna.banjir(),
    fillOpacity: ({ rendah: 0.15, sedang: 0.3, tinggi: 0.45 } as Record<string, number>)[kelas] ?? 0.3,
});

/** Tampilan bahaya banjir InaRISK: tiga tingkat kepekatan (indeks 0,50–0,60 / 0,61–0,80 / 0,81–1,00). */
export const WARNA_BANJIR: Record<number, string> = { 1: '#f87171', 2: '#dc2626', 3: '#7f1d1d' };
export const banjirTingkat = (tingkat: number): PathOptions => ({
    color: WARNA_BANJIR[tingkat] ?? WARNA_BANJIR[2],
    weight: 0.5,
    opacity: 0.6,
    fillColor: WARNA_BANJIR[tingkat] ?? WARNA_BANJIR[2],
    fillOpacity: ({ 1: 0.3, 2: 0.4, 3: 0.55 } as Record<number, number>)[tingkat] ?? 0.4,
});

/** Genangan nyata banjir Januari 2020 (BNPB): biru, agar beda dari indeks bahaya InaRISK yang merah. */
export const genangan: PathOptions = { color: '#1d4ed8', weight: 1, opacity: 0.7, fillColor: '#1d4ed8', fillOpacity: 0.35 };
export const rth: PathOptions = { color: '#22c55e', weight: 1, opacity: 0.9, fillColor: '#22c55e', fillOpacity: 0.25 };
export const legal: PathOptions = { color: '#6d28d9', weight: 1.2, opacity: 0.85, fillColor: '#8b5cf6', fillOpacity: 0.35 };
export const terpilih: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
export const top3: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
/** Kualitas udara per kelurahan (T-057): hijau relatif bersih, kuning sedang, oranye relatif tercemar, merah berbahaya. */
const WARNA_UDARA: Record<string, string> = { sehat: '#4ade80', kurang_sehat: '#facc15', tidak_sehat: '#f97316', berbahaya: '#b91c1c' };
export const udaraKelas = (kategori?: string): PathOptions => ({
    color: '#ffffff',
    weight: 0.6,
    opacity: 0.8,
    fillColor: WARNA_UDARA[String(kategori)] ?? '#94a3b8',
    fillOpacity: 0.45,
});
export const casing: PathOptions = { color: '#ffffff', weight: 6, opacity: 1 };
export const trotoar: PathOptions = { color: '#0ea5e9', weight: 2, opacity: 0.9, dashArray: '4 4' };

/** Menyamakan warna proyek masa depan dengan warna lin eksistingnya berdasarkan atribut/nama proyek. */
function warnaProyek(p?: Record<string, any> | null): string {
    if (!p) return warna.mrt();
    const moda = String(p.moda ?? '').toLowerCase();
    const lin = String(p.lin ?? '').toLowerCase();
    const nama = String(p.nama ?? '').toLowerCase();
    const gabung = `${moda} ${lin} ${nama}`;

    if (moda === 'tol' || /\btol\b/.test(nama)) return '#e892a2';
    if (lin) return warna.lin(lin);
    if (gabung.includes('mrt')) return warna.mrt();

    if (gabung.includes('lrt')) {
        if (gabung.includes('bekasi')) return warna.lrtLin('lrt-bekasi');
        if (gabung.includes('cibubur')) return warna.lrtLin('lrt-cibubur');
        if (gabung.includes('kalayang')) return warna.lrtLin('kalayang');
        return warna.lrtLin('lrt');
    }

    if (gabung.includes('brt') || gabung.includes('transjakarta')) {
        return String(p.warna ?? warna.navy());
    }

    if (gabung.includes('manggarai') || gabung.includes('jatinegara') || gabung.includes('cikarang') || gabung.includes('bekasi')) {
        return warna.krl('cikarang');
    }
    if (gabung.includes('bogor') || gabung.includes('nambo') || gabung.includes('citayam') || gabung.includes('depok')) {
        return warna.krl('bogor');
    }
    if (gabung.includes('rangkas') || gabung.includes('serpong') || gabung.includes('parung') || gabung.includes('maja')) {
        return warna.krl('rangkas');
    }
    if (gabung.includes('tangerang') || gabung.includes('duri')) {
        return warna.krl('tangerang');
    }
    if (gabung.includes('priok') || gabung.includes('ancol')) {
        return warna.krl('priok');
    }
    if (gabung.includes('bandara') || gabung.includes('soekarno')) {
        return warna.krl('bandara');
    }

    return warna.krl('lain');
}

/** Infrastruktur masa depan: garis putus-putus dengan warna sama seperti lin eksisting (T-059). */
export const mesinWaktu = (propertiAtauModa?: string | Record<string, any> | null): PathOptions => {
    const color =
        typeof propertiAtauModa === 'string'
            ? propertiAtauModa === 'tol'
                ? '#e892a2'
                : warna.mrt()
            : warnaProyek(propertiAtauModa);
    return { color, weight: 5, opacity: 1, dashArray: '10 8' };
};

export const ruteMobil = { casing: { color: '#ffffff', weight: 8, opacity: 1 } as PathOptions, garis: { color: '#0f1b3d', weight: 5, opacity: 1 } as PathOptions };
export const ruteOjol: PathOptions = { color: '#16a34a', weight: 4, opacity: 1, dashArray: '1 8', lineCap: 'round' };
export const ruteJalanKaki: PathOptions = { color: '#0f1b3d', weight: 3, opacity: 1, dashArray: '0.1 7', lineCap: 'round' };

/** Styling Poligon RDTR berdasarkan fungsi zona */
export function gayaRdtr(zona?: string): PathOptions {
    const z = String(zona ?? '').toLowerCase();

    let fillColor = '#cbd5e1';
    if (z.includes('perumahan') || z.includes('permukiman') || z.includes('r-')) fillColor = '#fef08a';
    else if (z.includes('perdagangan') || z.includes('jasa') || z.includes('k-')) fillColor = '#f87171';
    else if (z.includes('hijau') || z.includes('rth') || z.includes('h-')) fillColor = '#4ade80';
    else if (z.includes('industri') || z.includes('i-')) fillColor = '#c084fc';
    else if (z.includes('sarana') || z.includes('spu')) fillColor = '#60a5fa';

    return {
        fillColor,
        fillOpacity: 0.45,
        color: '#475569',
        weight: 1,
        opacity: 0.8,
    };
}

/** Styling Poligon Persil Lahan (BPN) Ungu */
export const gayaPersil: PathOptions = {
    fillColor: '#8b5cf6',
    fillOpacity: 0.35,
    color: '#6d28d9',
    weight: 1.2,
    opacity: 0.85,
};
/** Jangkauan waktu tempuh titik (isochrone, T-056): biru, beda dari seleksi wilayah navy. */
export const isochrone = { color: '#2563eb', weight: 2.25, opacity: 0.9, fillColor: '#3b82f6', fillOpacity: 0.2 };
