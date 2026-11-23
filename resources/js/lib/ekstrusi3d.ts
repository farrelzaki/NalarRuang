/**
 * Hasil Uji Lahan (FR-23) menjadi fitur ekstrusi 3D untuk lapisan `fill-extrusion` MapLibre: logika murni tanpa peta, dites dengan
 * `npm run test:js`. Aturan tinggi dan warna sama dengan kartu three.js (Map/Lahan3D.ts) supaya kedua tampilan 3D serupa:
 *
 * - Tinggi gedung = jumlah lantai x tinggi lantai. Unit dan koridor sedikit lebih rendah, inti (tangga/lift) lebih tinggi,
 *   lobi dua lantai berwarna kuning, parkir bertingkat berupa balok setinggi lantainya, sisanya (aspal, slot, jalan, taman) pelat tipis.
 * - Rumah tapak: kavling menjadi atap berukuran sqrt(KDB) dari petaknya, di atas pekarangan datar.
 *
 * Tinggi dalam meter. "Pelat tipis" diberi tinggi beberapa desimeter supaya terlihat di atas tanah dan tidak berebut lapisan.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Feature, FeatureCollection, Geometry, Polygon, Position } from 'geojson';

export type PropEkstrusi = {
    jenis: string;
    /** Tinggi puncak (m). */
    tinggi: number;
    /** Tinggi dasar (m); 0 untuk yang menempel tanah. */
    dasar: number;
    warna: string;
};

/** Bagian hasil /api/lahan yang dipakai (LahanResponse memenuhinya). */
export type DataEkstrusi = {
    kapasitas: { lantai: number };
    ringkasan?: { tinggi_lantai_m: number } | null;
    intensitas?: { kdb: number } | null;
    geometri_kapasitas?: { features: { geometry: Geometry | null; properties?: Record<string, unknown> | null }[] } | null;
};

export const WARNA_UNIT: Record<string, string> = { studio: '#2fbf71', '1br': '#4a90e2', '2br': '#7b5cd6', kamar: '#4a90e2' };
export const WARNA_ATAP = ['#f2994a', '#e8833a', '#f5b06b'];

/** Tinggi pelat tipis (m) per jenis datar. */
const PELAT: Record<string, { tinggi: number; warna: string }> = {
    lahan: { tinggi: 0.1, warna: '#f6f3ec' },
    pekarangan: { tinggi: 0.3, warna: '#d9e7cf' },
    aspal: { tinggi: 0.4, warna: '#7b818b' },
    taman: { tinggi: 0.5, warna: '#9fd3a6' },
    jalan: { tinggi: 0.3, warna: '#6b7280' },
    slot: { tinggi: 0.7, warna: '#c9d1db' },
    jalur: { tinggi: 0.6, warna: '#d9c48f' },
    akses: { tinggi: 0.8, warna: '#4b5160' },
    // Rumah pribadi: halaman berupa perkerasan, kolam sedikit di atas halaman supaya terlihat.
    halaman: { tinggi: 0.35, warna: '#d8ccb0' },
    kolam: { tinggi: 0.45, warna: '#5cc8f0' },
};

/** Tinggi pagar rumah pribadi (m). */
export const TINGGI_PAGAR = 1.6;

/** Semua poligon (cincin luar + lubang) dari geometri; selain Polygon/MultiPolygon diabaikan. */
export function poligonDari(g: Geometry | null | undefined): Position[][][] {
    if (!g) return [];
    if (g.type === 'Polygon') return [g.coordinates];
    if (g.type === 'MultiPolygon') return g.coordinates;
    return [];
}

/** Kecilkan semua cincin sebesar `faktor` terhadap rata-rata titik cincin luar. */
export function skalaPoligon(cincin: Position[][], faktor: number): Position[][] {
    const luar = cincin[0] ?? [];
    const n = Math.max(1, luar.length - 1);
    const pusat = luar.slice(0, n).reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
    return cincin.map((r) => r.map(([x, y]) => [pusat[0] + (x - pusat[0]) * faktor, pusat[1] + (y - pusat[1]) * faktor]));
}

/**
 * Fitur ekstrusi dari hasil Uji Lahan. `lahan` (batas yang digambar) menjadi alas tipis di bawah semuanya.
 * Urutan fitur = urutan gambar: alas, lalu pelat, lalu massa gedung.
 */
export function bangunEkstrusi(d: DataEkstrusi, lahan: Polygon | null): FeatureCollection<Polygon, PropEkstrusi> {
    const tinggiLantai = d.ringkasan?.tinggi_lantai_m ?? 3.2;
    const lantai = Math.max(1, d.kapasitas.lantai || 1);
    const tG = lantai * tinggiLantai;
    const kdb = Math.min(0.9, Math.max(0.3, (d.intensitas?.kdb ?? 60) / 100));

    const alas: Feature<Polygon, PropEkstrusi>[] = [];
    const pelat: Feature<Polygon, PropEkstrusi>[] = [];
    const massa: Feature<Polygon, PropEkstrusi>[] = [];

    const tambah = (daftar: Feature<Polygon, PropEkstrusi>[], cincin: Position[][], jenis: string, tinggi: number, warna: string, dasar = 0) => {
        if (tinggi <= dasar || !cincin[0] || cincin[0].length < 4) return;
        daftar.push({ type: 'Feature', properties: { jenis, tinggi: Math.round(tinggi * 100) / 100, dasar: Math.round(dasar * 100) / 100, warna }, geometry: { type: 'Polygon', coordinates: cincin } });
    };
    const datar = (daftar: Feature<Polygon, PropEkstrusi>[], cincin: Position[][], jenis: string) => tambah(daftar, cincin, jenis, PELAT[jenis].tinggi, PELAT[jenis].warna);

    if (lahan) datar(alas, lahan.coordinates, 'lahan');

    for (const f of d.geometri_kapasitas?.features ?? []) {
        const pr = f.properties ?? {};
        const jenis = String(pr.jenis ?? '');
        for (const c of poligonDari(f.geometry)) {
            switch (jenis) {
                case 'unit':
                    tambah(massa, c, 'unit', tG - 0.3, WARNA_UNIT[String(pr.tipe)] ?? '#4a90e2');
                    break;
                case 'koridor':
                    tambah(massa, c, 'koridor', tG - 0.6, '#59606e');
                    break;
                case 'inti':
                    tambah(massa, c, 'inti', tG + 3, '#9aa3b2');
                    break;
                case 'tapak':
                    tambah(massa, c, 'tapak', tG, '#3b6fd8');
                    break;
                case 'kavling':
                    datar(pelat, c, 'pekarangan');
                    tambah(massa, skalaPoligon(c, Math.sqrt(kdb)), 'kavling', tG, WARNA_ATAP[Number(pr.varian ?? 0) % 3]);
                    break;
                case 'parkir':
                    // Semua parkir (termasuk pola wrap dan parkir bertingkat) digambar datar seperti taman, supaya gedung hunian tidak tertutup.
                    datar(pelat, c, 'aspal');
                    break;
                case 'lobi':
                    // Lobi dua lantai berwarna kuning; di atasnya gedung berlanjut sampai atap (warna unit), jadi pintu tidak membuat celah.
                    tambah(massa, c, 'lobi', Math.min(tG, tinggiLantai * 2) - 0.3, '#f2b544');
                    if (tG > tinggiLantai * 2) tambah(massa, c, 'atas-lobi', tG - 0.3, WARNA_UNIT['1br'], tinggiLantai * 2);
                    break;
                case 'taman':
                case 'void':
                    datar(pelat, c, 'taman');
                    break;
                case 'slot':
                case 'jalan':
                case 'akses':
                case 'jalur':
                case 'halaman':
                case 'kolam':
                    datar(pelat, c, jenis);
                    break;
                case 'pagar':
                    tambah(massa, c, 'pagar', TINGGI_PAGAR, '#5a4632');
                    break;
            }
        }
    }

    return { type: 'FeatureCollection', features: [...alas, ...pelat, ...massa] };
}

/** Kotak batas [barat, selatan, timur, utara] dari sebuah poligon, atau null bila kosong. */
export function kotakBatas(g: Polygon | null): [number, number, number, number] | null {
    const c = g?.coordinates[0];
    if (!c || c.length === 0) return null;
    const xs = c.map((p) => p[0]);
    const ys = c.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
