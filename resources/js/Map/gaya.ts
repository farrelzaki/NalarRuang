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
    krl: (lin: string) => css(`--map-krl-${['bogor', 'rangkas', 'cikarang'].includes(lin) ? lin : 'lain'}`),
};

export const banjir = (kelas: string): PathOptions => ({
    color: warna.banjir(),
    weight: 1,
    opacity: 0.6,
    fillColor: warna.banjir(),
    fillOpacity: ({ rendah: 0.15, sedang: 0.3, tinggi: 0.45 } as Record<string, number>)[kelas] ?? 0.3,
});

export const rth: PathOptions = { color: '#22c55e', weight: 1, opacity: 0.9, fillColor: '#22c55e', fillOpacity: 0.25 };
export const legal: PathOptions = { color: '#8b5cf6', weight: 1.5, opacity: 0.8, fillColor: '#8b5cf6', fillOpacity: 0.2 };
export const terpilih: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
export const top3: PathOptions = { color: '#0f1b3d', weight: 2.5, opacity: 1, fillColor: '#0f1b3d', fillOpacity: 0.08 };
export const casing: PathOptions = { color: '#ffffff', weight: 6, opacity: 1 };
export const trotoar: PathOptions = { color: '#0ea5e9', weight: 2, opacity: 0.9, dashArray: '4 4' };
export const mesinWaktu: PathOptions = { color: '#a855f7', weight: 4, opacity: 0.95, dashArray: '8 8' };
export const ruteMobil = { casing: { color: '#ffffff', weight: 8, opacity: 1 } as PathOptions, garis: { color: '#0f1b3d', weight: 5, opacity: 1 } as PathOptions };
export const ruteJalanKaki: PathOptions = { color: '#0f1b3d', weight: 3, opacity: 1, dashArray: '0.1 7', lineCap: 'round' };
