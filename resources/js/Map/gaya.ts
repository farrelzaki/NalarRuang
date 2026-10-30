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
export const legal: PathOptions = { color: '#8b5cf6', weight: 1.5, opacity: 0.8, fillColor: '#8b5cf6', fillOpacity: 0.2 };
export const terpilih: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
export const top3: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
export const casing: PathOptions = { color: '#ffffff', weight: 6, opacity: 1 };
export const trotoar: PathOptions = { color: '#0ea5e9', weight: 2, opacity: 0.9, dashArray: '4 4' };
/** Infrastruktur masa depan: putus-putus; MRT warna lin MRT, tol merah jalan tol peta dasar OSM (T-040). */
export const mesinWaktu = (moda?: string): PathOptions => ({ color: moda === 'tol' ? '#e892a2' : warna.mrt(), weight: 5, opacity: 1, dashArray: '10 8' });
export const ruteMobil = { casing: { color: '#ffffff', weight: 8, opacity: 1 } as PathOptions, garis: { color: '#0f1b3d', weight: 5, opacity: 1 } as PathOptions };
export const ruteOjol: PathOptions = { color: '#16a34a', weight: 4, opacity: 1, dashArray: '1 8', lineCap: 'round' };
export const ruteJalanKaki: PathOptions = { color: '#0f1b3d', weight: 3, opacity: 1, dashArray: '0.1 7', lineCap: 'round' };
