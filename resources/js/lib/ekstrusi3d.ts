/**
 * Hasil Uji Lahan (FR-23) menjadi fitur ekstrusi 3D untuk lapisan `fill-extrusion` MapLibre: logika murni tanpa peta, dites dengan
 * `npm run test:js`. Aturan tinggi dan warna sama dengan kartu three.js (Map/Lahan3D.ts) supaya kedua tampilan 3D serupa:
 *
 * - Tinggi gedung = jumlah lantai x tinggi lantai. Unit dan koridor sedikit lebih rendah, inti tangga/lift berupa beton yang
 *   menyembul di atas atap (ruang mesin lift, rumah tangga), ruang servis setinggi gedung,
 *   lobi dua lantai berwarna kuning, parkir bertingkat berupa balok setinggi lantainya, sisanya (aspal, slot, jalan, taman) pelat tipis.
 * - Rumah tapak: kavling menjadi atap berukuran sqrt(KDB) dari petaknya, di atas pekarangan datar.
 * - Rumah pribadi dan rumah tapak: dinding krem setinggi lantainya dan atap limas genteng (bertingkat di MapLibre, karena
 *   fill-extrusion hanya balok tegak; three.js membentuk atap miring sungguhan dari `bangunModelLahan`).
 * - Gaya realistis kos/apartemen: tiap lantai ambang dinding + pita jendela kaca, dak beton di atap, tandon air di atap kos.
 *   Gaya warna: unit berwarna per tipe seperti TestFit.
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
    /** Tipe bangunan; `pribadi` = rumah dengan atap limas. */
    tipe?: string;
    kapasitas: { lantai: number };
    ringkasan?: { tinggi_lantai_m: number } | null;
    intensitas?: { kdb: number } | null;
    geometri_kapasitas?: { features: { geometry: Geometry | null; properties?: Record<string, unknown> | null }[] } | null;
};

export const WARNA_UNIT: Record<string, string> = { studio: '#2fbf71', '1br': '#4a90e2', '2br': '#7b5cd6', kamar: '#4a90e2' };
export const WARNA_ATAP = ['#f2994a', '#e8833a', '#f5b06b'];
/** Warna ruang inti per fungsi (lift berisi tangga, tangga, ruang servis): peta 2D, legenda panel, dan gaya Warna unit 3D. */
export const WARNA_INTI = { lift: '#5b6474', tangga: '#a3a9b5', servis: '#c9ced6' } as const;
/** Tinggi bagian inti yang menyembul di atas dak (m): ruang mesin lift dan rumah tangga akses atap. */
export const MENYEMBUL_INTI = { lift: 3.5, tangga: 3 } as const;

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

/** Warna rumah pribadi di 3D: dinding krem, atap genteng. */
export const WARNA_DINDING = '#f3ead6';
export const WARNA_GENTENG = '#c2553a';
/** Atap menjorok keluar dinding (m). */
const TRITISAN = 0.5;

/**
 * Persegi panjang terkecil yang memuat titik-titik [x, y] (meter), dicari dari arah tiap sisi. `sumbu` = vektor satuan sisi
 * panjang; `panjang` >= `lebar`. Null bila titik kurang dari tiga atau luasnya nol.
 */
export function persegiMinimum(titik: [number, number][]): { pusat: [number, number]; sumbu: [number, number]; panjang: number; lebar: number } | null {
    if (titik.length < 3) return null;
    let terbaik: { pusat: [number, number]; sumbu: [number, number]; panjang: number; lebar: number; luas: number } | null = null;
    for (let i = 0; i < titik.length; i++) {
        const [ax, ay] = titik[i];
        const [bx, by] = titik[(i + 1) % titik.length];
        const pj = Math.hypot(bx - ax, by - ay);
        if (pj < 1e-9) continue;
        const u: [number, number] = [(bx - ax) / pj, (by - ay) / pj];
        const v: [number, number] = [-u[1], u[0]];
        let [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity];
        for (const [x, y] of titik) {
            const a = x * u[0] + y * u[1];
            const b = x * v[0] + y * v[1];
            u0 = Math.min(u0, a);
            u1 = Math.max(u1, a);
            v0 = Math.min(v0, b);
            v1 = Math.max(v1, b);
        }
        const luas = (u1 - u0) * (v1 - v0);
        if (luas <= 1e-9 || (terbaik && luas >= terbaik.luas - 1e-9)) continue;
        const [ac, bc] = [(u0 + u1) / 2, (v0 + v1) / 2];
        const pusat: [number, number] = [u[0] * ac + v[0] * bc, u[1] * ac + v[1] * bc];
        terbaik = u1 - u0 >= v1 - v0 ? { pusat, sumbu: u, panjang: u1 - u0, lebar: v1 - v0, luas } : { pusat, sumbu: v, panjang: v1 - v0, lebar: u1 - u0, luas };
    }
    if (!terbaik) return null;
    const { luas: _l, ...hasil } = terbaik;
    return hasil;
}

/** Tinggi atap limas dari lebar rumah: kemiringan 30°, 1,5–4 m. */
export function tinggiAtap(lebar: number): number {
    return Math.min(4, Math.max(1.5, (lebar / 2) * Math.tan(Math.PI / 6)));
}

/**
 * Atap limas (perisai) di atas denah rumah, dalam meter: empat sudut tritisan (menjorok 0,5 m dari dinding) searah putaran,
 * dua titik bubungan di tengah sisi panjang, dan tinggi atap. Kedua sisi panjang berupa trapesium, sisi pendek segitiga.
 */
export function atapLimas(titik: [number, number][]): { sudut: [number, number][]; bubungan: [[number, number], [number, number]]; tinggi: number; lebar: number } | null {
    const r = persegiMinimum(titik);
    if (!r) return null;
    const u = r.sumbu;
    const v: [number, number] = [-u[1], u[0]];
    const hp = r.panjang / 2 + TRITISAN;
    const hl = r.lebar / 2 + TRITISAN;
    const titikDi = (a: number, b: number): [number, number] => [r.pusat[0] + u[0] * a + v[0] * b, r.pusat[1] + u[1] * a + v[1] * b];
    const bub = hp - hl;
    return {
        sudut: [titikDi(-hp, -hl), titikDi(hp, -hl), titikDi(hp, hl), titikDi(-hp, hl)],
        bubungan: [titikDi(-bub, 0), titikDi(bub, 0)],
        tinggi: tinggiAtap(r.lebar + 2 * TRITISAN),
        lebar: 2 * hl,
    };
}

/**
 * Atap limas untuk `fill-extrusion` MapLibre (hanya bisa balok tegak): disusun bertingkat, tiap tingkat persegi yang menyusut
 * sama rata di keempat sisinya, dari `dasar` sampai puncak. Koordinat [lng, lat].
 */
export function irisanAtapLimas(cincin: Position[], dasar: number, langkah = 8): { cincin: Position[]; dasar: number; tinggi: number }[] {
    const titik = cincin.slice(0, -1);
    if (titik.length < 3) return [];
    const [lng0, lat0] = titik[0];
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const ky = 110574;
    const meter = titik.map(([lng, lat]): [number, number] => [(lng - lng0) * kx, (lat - lat0) * ky]);
    const r = persegiMinimum(meter);
    if (!r) return [];
    const u = r.sumbu;
    const v: [number, number] = [-u[1], u[0]];
    const hp = r.panjang / 2 + TRITISAN;
    const hl = r.lebar / 2 + TRITISAN;
    const h = tinggiAtap(2 * hl);
    const keLngLat = (a: number, b: number): Position => {
        const x = r.pusat[0] + u[0] * a + v[0] * b;
        const y = r.pusat[1] + u[1] * a + v[1] * b;
        return [lng0 + x / kx, lat0 + y / ky];
    };
    const hasil: { cincin: Position[]; dasar: number; tinggi: number }[] = [];
    for (let i = 0; i < langkah; i++) {
        // Irisan diambil di dasar tiap tingkat: tingkat paling bawah selebar tritisan penuh.
        const d = (hl * i) / langkah;
        const [a, b] = [hp - d, hl - d];
        const c = [keLngLat(-a, -b), keLngLat(a, -b), keLngLat(a, b), keLngLat(-a, b)];
        hasil.push({ cincin: [...c, c[0]], dasar: dasar + (h * i) / langkah, tinggi: dasar + (h * (i + 1)) / langkah });
    }
    return hasil;
}


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
/**
 * Gaya 3D: `realistis` = bentuk bangunan sungguhan (dinding, jendela per lantai, dak beton, atap genteng, tandon); `warna` =
 * warna per tipe unit seperti TestFit (studio/1BR/2BR/kamar). Rumah tapak dan rumah pribadi selalu berbentuk rumah.
 */
export type Gaya3D = 'realistis' | 'warna';

/** Atap limas yang harus dibentuk penampil: cincin denah [lng, lat], tinggi dasar (puncak dinding), warna genteng. */
export type LimasModel = { cincin: Position[]; dasar: number; warna: string; jenis: string };

/** Model 3D netral penampil: balok tegak (dasar..tinggi) + atap limas. MapLibre memakai `bangunEkstrusi`, three.js memakai ini langsung. */
export type ModelLahan = { prisma: Feature<Polygon, PropEkstrusi>[]; limas: LimasModel[] };

/** Jenis pelat tipis (datar); penampil three.js menggambarnya sebagai bidang datar, bukan balok. */
export const JENIS_PELAT = Object.keys(PELAT);

/** Warna bangunan pada gaya realistis. */
const REALISTIS = {
    rumahDinding: ['#f3ead6', '#ece4d8', '#f6efe2'],
    rumahGenteng: ['#c2553a', '#a9472f', '#8e4b3a'],
    kos: { dinding: '#efe2c8', kaca: '#8ea9bd' },
    apartemen: { dinding: '#e6e9ec', kaca: '#6e93b1' },
    dak: '#d6d1c7',
    inti: '#cfcac1',
    intiLift: '#b9b4ab',
    lobi: '#5f86a6',
    tandon: '#2f6fb3',
};
/** Tinggi ambang/balok lantai (bagian dinding di bawah jendela) dan tebal dak atap + tembok pembatas (m). */
const AMBANG = 0.9;
const DAK = 0.6;

/** Persegi kecil seluas sisi x sisi meter di pusat cincin (untuk tandon air). */
function kotakDiPusat(cincin: Position[], sisi: number): Position[] {
    const t = cincin.slice(0, -1);
    const [lng, lat] = t.reduce((s, p) => [s[0] + p[0] / t.length, s[1] + p[1] / t.length], [0, 0]);
    const dx = sisi / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
    const dy = sisi / 2 / 110574;
    return [[lng - dx, lat - dy], [lng + dx, lat - dy], [lng + dx, lat + dy], [lng - dx, lat + dy], [lng - dx, lat - dy]];
}

/** Bentuk 3D hasil Uji Lahan sebagai balok + atap limas (lihat `ModelLahan`). */
export function bangunModelLahan(d: DataEkstrusi, lahan: Polygon | null, gaya: Gaya3D = 'realistis'): ModelLahan {
    const tinggiLantai = d.ringkasan?.tinggi_lantai_m ?? 3.2;
    const lantai = Math.max(1, d.kapasitas.lantai || 1);
    const tG = lantai * tinggiLantai;
    const kdb = Math.min(0.9, Math.max(0.3, (d.intensitas?.kdb ?? 60) / 100));
    const realistis = gaya === 'realistis';
    const warnaGedung = d.tipe === 'kos' ? REALISTIS.kos : REALISTIS.apartemen;

    const alas: Feature<Polygon, PropEkstrusi>[] = [];
    const pelat: Feature<Polygon, PropEkstrusi>[] = [];
    const massa: Feature<Polygon, PropEkstrusi>[] = [];
    const limas: LimasModel[] = [];

    const tambah = (daftar: Feature<Polygon, PropEkstrusi>[], cincin: Position[][], jenis: string, tinggi: number, warna: string, dasar = 0) => {
        if (tinggi <= dasar || !cincin[0] || cincin[0].length < 4) return;
        daftar.push({ type: 'Feature', properties: { jenis, tinggi: Math.round(tinggi * 100) / 100, dasar: Math.round(dasar * 100) / 100, warna }, geometry: { type: 'Polygon', coordinates: cincin } });
    };
    const datar = (daftar: Feature<Polygon, PropEkstrusi>[], cincin: Position[][], jenis: string) => tambah(daftar, cincin, jenis, PELAT[jenis].tinggi, PELAT[jenis].warna);
    /** Rumah: dinding setinggi gedung + atap limas genteng di atasnya. */
    const rumah = (cincin: Position[][], varian: number) => {
        tambah(massa, cincin, 'dinding', tG, REALISTIS.rumahDinding[varian % 3]);
        if (cincin[0]) limas.push({ cincin: cincin[0], dasar: tG, warna: REALISTIS.rumahGenteng[varian % 3], jenis: 'atap' });
    };
    /** Gedung realistis dari `dari` sampai `sampai`: tiap lantai = ambang dinding + pita jendela kaca, ditutup dak beton. */
    const berlapis = (cincin: Position[][], dari: number, sampai: number) => {
        for (let z = dari; z < sampai - 0.05; z += tinggiLantai) {
            const ambang = Math.min(z + AMBANG, sampai);
            tambah(massa, cincin, 'dinding', ambang, warnaGedung.dinding, z);
            tambah(massa, cincin, 'kaca', Math.min(z + tinggiLantai, sampai), warnaGedung.kaca, ambang);
        }
        tambah(massa, cincin, 'dak', sampai + DAK, REALISTIS.dak, sampai);
    };

    if (lahan) datar(alas, lahan.coordinates, 'lahan');

    let nomorUnit = 0;
    for (const f of d.geometri_kapasitas?.features ?? []) {
        const pr = f.properties ?? {};
        const jenis = String(pr.jenis ?? '');
        for (const c of poligonDari(f.geometry)) {
            switch (jenis) {
                case 'unit':
                case 'koridor':
                    if (realistis) {
                        berlapis(c, 0, tG);
                        // Kos: tandon air biru di atap, kira-kira satu tiap delapan kamar.
                        if (d.tipe === 'kos' && jenis === 'unit' && nomorUnit++ % 8 === 0 && c[0]) tambah(massa, [kotakDiPusat(c[0], 1.4)], 'tandon', tG + DAK + 1.5, REALISTIS.tandon, tG + DAK);
                    } else if (jenis === 'unit') {
                        tambah(massa, c, 'unit', tG - 0.3, WARNA_UNIT[String(pr.tipe)] ?? '#4a90e2');
                    } else {
                        tambah(massa, c, 'koridor', tG - 0.6, '#59606e');
                    }
                    break;
                case 'inti': {
                    // Lift dan tangga: balok beton tanpa jendela setinggi gedung, menyembul di atas dak (ruang mesin lift, rumah
                    // tangga akses atap). Ruang servis di tengah gedung ikut bentuk gedung. Respons lama tanpa `fungsi`: seperti dulu.
                    const fungsi = pr.fungsi;
                    if (fungsi === 'lift' || fungsi === 'tangga') {
                        const puncak = (realistis ? tG + DAK : tG) + MENYEMBUL_INTI[fungsi];
                        tambah(massa, c, 'inti', puncak, realistis ? (fungsi === 'lift' ? REALISTIS.intiLift : REALISTIS.inti) : WARNA_INTI[fungsi]);
                    } else if (fungsi === 'servis') {
                        if (realistis) berlapis(c, 0, tG);
                        else tambah(massa, c, 'inti', tG - 0.3, WARNA_INTI.servis);
                    } else {
                        tambah(massa, c, 'inti', tG + 3, realistis ? REALISTIS.inti : '#9aa3b2');
                    }
                    break;
                }
                case 'tapak':
                    if (d.tipe === 'pribadi' || d.tipe === 'rumah') rumah(c, 0);
                    else if (realistis) berlapis(c, 0, tG);
                    else tambah(massa, c, 'tapak', tG, '#3b6fd8');
                    break;
                case 'kavling': {
                    datar(pelat, c, 'pekarangan');
                    rumah(skalaPoligon(c, Math.sqrt(kdb)), Number(pr.varian ?? 0));
                    break;
                }
                case 'parkir':
                    // Semua parkir (termasuk pola wrap dan parkir bertingkat) digambar datar seperti taman, supaya gedung hunian tidak tertutup.
                    datar(pelat, c, 'aspal');
                    break;
                case 'lobi': {
                    // Lobi dua lantai (kuning, atau kaca pada gaya realistis); di atasnya gedung berlanjut sampai atap, jadi pintu tidak membuat celah.
                    const tLobi = Math.min(tG, tinggiLantai * 2);
                    if (realistis) {
                        tambah(massa, c, 'lobi', tLobi, REALISTIS.lobi);
                        if (tG > tLobi) berlapis(c, tLobi, tG);
                        else tambah(massa, c, 'dak', tG + DAK, REALISTIS.dak, tG);
                    } else {
                        tambah(massa, c, 'lobi', tLobi - 0.3, '#f2b544');
                        if (tG > tinggiLantai * 2) tambah(massa, c, 'atas-lobi', tG - 0.3, WARNA_UNIT['1br'], tinggiLantai * 2);
                    }
                    break;
                }
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

    return { prisma: [...alas, ...pelat, ...massa], limas };
}

/** Fitur `fill-extrusion` MapLibre: balok model + atap limas yang disusun bertingkat (MapLibre hanya bisa balok tegak). */
export function bangunEkstrusi(d: DataEkstrusi, lahan: Polygon | null, gaya: Gaya3D = 'realistis'): FeatureCollection<Polygon, PropEkstrusi> {
    const m = bangunModelLahan(d, lahan, gaya);
    const atap: Feature<Polygon, PropEkstrusi>[] = m.limas.flatMap((l) =>
        irisanAtapLimas(l.cincin, l.dasar).map((t) => ({
            type: 'Feature' as const,
            properties: { jenis: l.jenis, tinggi: Math.round(t.tinggi * 100) / 100, dasar: Math.round(t.dasar * 100) / 100, warna: l.warna },
            geometry: { type: 'Polygon' as const, coordinates: [t.cincin] },
        })),
    );
    return { type: 'FeatureCollection', features: [...m.prisma, ...atap] };
}

/** Kotak batas [barat, selatan, timur, utara] dari sebuah poligon, atau null bila kosong. */
export function kotakBatas(g: Polygon | null): [number, number, number, number] | null {
    const c = g?.coordinates[0];
    if (!c || c.length === 0) return null;
    const xs = c.map((p) => p[0]);
    const ys = c.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
