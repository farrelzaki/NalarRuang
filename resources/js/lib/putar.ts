/**
 * Putar desain Uji Lahan (lahan, zona yang ditarik sendiri, gerbang/pintu) terhadap satu titik pusat. Logika murni, dites dengan
 * `npm run test:js`.
 *
 * Sudut dalam derajat searah jarum jam (seperti arah kompas). Perhitungan memakai bidang datar lokal (bujur dikali cos lintang),
 * cukup tepat untuk lahan sampai 20 ha: bentuk dan luas tidak berubah saat diputar.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Polygon, Position } from 'geojson';
import type { AksesLahanMasuk, ZonaLahan } from '@/types';

export type TitikLL = { lat: number; lng: number };

const RAD = Math.PI / 180;

/** Rata-rata titik sudut (cukup sebagai poros putar). */
export function pusatTitik(titik: TitikLL[]): TitikLL {
    const n = Math.max(1, titik.length);
    return { lat: titik.reduce((s, t) => s + t.lat, 0) / n, lng: titik.reduce((s, t) => s + t.lng, 0) / n };
}

/** Putar satu titik `derajat` searah jarum jam terhadap `pusat`. */
export function putarTitik(p: TitikLL, pusat: TitikLL, derajat: number): TitikLL {
    const k = Math.cos(pusat.lat * RAD);
    const x = (p.lng - pusat.lng) * k;
    const y = p.lat - pusat.lat;
    // Searah jarum jam di peta (utara ke atas) = putar negatif di bidang matematika.
    const a = -derajat * RAD;
    const xr = x * Math.cos(a) - y * Math.sin(a);
    const yr = x * Math.sin(a) + y * Math.cos(a);
    return { lat: pusat.lat + yr, lng: pusat.lng + xr / k };
}

const putarPosisi = (p: Position, pusat: TitikLL, derajat: number): Position => {
    const r = putarTitik({ lat: p[1], lng: p[0] }, pusat, derajat);
    return [Number(r.lng.toFixed(7)), Number(r.lat.toFixed(7))];
};

export function putarPoligon(g: Polygon, pusat: TitikLL, derajat: number): Polygon {
    return { type: 'Polygon', coordinates: g.coordinates.map((cincin) => cincin.map((p) => putarPosisi(p, pusat, derajat))) };
}

/** Arah (derajat 0–360, searah jarum jam dari utara) dari pusat ke titik. */
export function arahKe(pusat: TitikLL, p: TitikLL): number {
    const x = (p.lng - pusat.lng) * Math.cos(pusat.lat * RAD);
    const y = p.lat - pusat.lat;
    return ((Math.atan2(x, y) / RAD) % 360 + 360) % 360;
}

/** Selisih sudut dinormalkan ke (-180, 180]; dibulatkan ke kelipatan `langkah` bila diberikan (Shift = 15°). */
export function sudutPutar(awal: number, kini: number, langkah?: number): number {
    let d = ((kini - awal) % 360 + 540) % 360 - 180;
    if (d === -180) d = 180;
    if (langkah) d = Math.round(d / langkah) * langkah;
    return d;
}

/** Arah deret parkir (0–179°) setelah diputar. */
export const putarArah = (arah: number, derajat: number): number => (((arah + derajat) % 180) + 180) % 180;

/**
 * Putar seluruh desain: zona pengguna (termasuk arah parkirnya bila dikunci) dan gerbang/pintu. Zona bawaan pola (null) dibiarkan:
 * server menghitungnya ulang dari lahan yang sudah diputar.
 */
export function putarDesain(
    zona: ZonaLahan[] | null,
    akses: AksesLahanMasuk[],
    pusat: TitikLL,
    derajat: number,
): { zona: ZonaLahan[] | null; akses: AksesLahanMasuk[] } {
    return {
        zona: zona?.map((z) => {
            const arah = (z as ZonaLahan & { arah?: number }).arah;
            return { ...z, geometri: putarPoligon(z.geometri, pusat, derajat), ...(typeof arah === 'number' ? { arah: putarArah(arah, derajat) } : {}) };
        }) ?? null,
        akses: akses.map((a) => {
            const r = putarTitik({ lat: a.titik[1], lng: a.titik[0] }, pusat, derajat);
            return { ...a, titik: [Number(r.lng.toFixed(7)), Number(r.lat.toFixed(7))] as [number, number] };
        }),
    };
}
