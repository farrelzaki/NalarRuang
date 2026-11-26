/**
 * Posisi lift/tangga yang digeser sendiri di Uji Lahan (FR-23). Logika murni tanpa React dan peta, dites dengan `npm run test:js`.
 *
 * Server menempatkan inti otomatis. Geseran pertama membekukan posisi semua inti yang tampil (pusat kotaknya) menjadi daftar pin
 * `inti[]`, lalu pin yang digeser diganti titik lepasnya; geseran berikutnya hanya mengganti pin itu. Inti lain tidak berpindah
 * (keputusan Galih 23 Nov 2026). `null` = kembali ke penempatan otomatis.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Geometry } from 'geojson';
import type { IntiLahanMasuk } from '@/types';

/** Paling banyak pin per permintaan (sama dengan server, IntiGedung::PIN_MAKS). */
export const PIN_MAKS = 100;

type FiturIsi = { geometry: Geometry | null; properties?: Record<string, unknown> | null };

const bulat = (x: number) => Number(x.toFixed(7));

/** Pusat kotak inti: rata-rata titik sudut cincin luar (bagian pertama bila multipoligon). */
export function pusatFitur(g: Geometry | null): [number, number] | null {
    const cincin = g?.type === 'Polygon' ? g.coordinates[0] : g?.type === 'MultiPolygon' ? g.coordinates[0]?.[0] : null;
    if (!cincin || cincin.length < 2) return null;
    const t = cincin.slice(0, -1);
    return [bulat(t.reduce((s, p) => s + p[0], 0) / t.length), bulat(t.reduce((s, p) => s + p[1], 0) / t.length)];
}

/** Inti lift/tangga hasil server sebagai pin, urut `id` (ruang servis tidak ikut: bukan tangga). */
function pinDariFitur(fitur: FiturIsi[]): { id: number; fungsi: IntiLahanMasuk['fungsi']; titik: [number, number] }[] {
    return fitur
        .filter((f) => f.properties?.jenis === 'inti' && (f.properties.fungsi === 'lift' || f.properties.fungsi === 'tangga'))
        .map((f) => ({ id: Number(f.properties?.id ?? 0), fungsi: f.properties?.fungsi as IntiLahanMasuk['fungsi'], titik: pusatFitur(f.geometry) }))
        .filter((x): x is { id: number; fungsi: IntiLahanMasuk['fungsi']; titik: [number, number] } => x.titik !== null)
        .sort((a, b) => a.id - b.id)
        .slice(0, PIN_MAKS);
}

/**
 * Daftar pin baru setelah inti `id` digeser ke `titik` ([lng, lat]).
 * - `pin` null (masih otomatis): posisi semua inti di `fitur` dibekukan dulu; `id` = urutan inti dari server.
 * - `pin` ada (sudah manual): `id` = urutan pin, hanya pin itu yang berubah.
 * `id` yang tidak dikenal: daftar tidak berubah.
 */
export function geserInti(pin: IntiLahanMasuk[] | null, fitur: FiturIsi[], id: number, titik: [number, number]): IntiLahanMasuk[] | null {
    if (pin) {
        if (!pin[id]) return pin;
        return pin.map((p, i) => (i === id ? { ...p, titik: [bulat(titik[0]), bulat(titik[1])] } : p));
    }
    const beku = pinDariFitur(fitur);
    if (!beku.some((x) => x.id === id)) return null;
    return beku.map((x) => ({ fungsi: x.fungsi, titik: x.id === id ? [bulat(titik[0]), bulat(titik[1])] : x.titik }));
}
