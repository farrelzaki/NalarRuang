/**
 * Penempatan pintar zona baru Uji Lahan (FR-23): logika murni tanpa Leaflet, dites dengan `npm run test:js`.
 *
 * Tombol "+ Taman/Parkir/Gedung" tidak lagi menaruh kotak tetap di tengah lahan, tetapi mencari persegi panjang kosong
 * terbesar di dalam lahan (di luar zona yang sudah ada), lalu mengukurnya sesuai kebutuhan:
 *   - Zona terkunci tidak pernah ditabrak.
 *   - Zona lain dihindari bila masih ada ruang kosong yang layak; bila tidak ada, zona baru menimpa zona yang tidak terkunci
 *     (zona baru menang, zona lain menyesuaikan diri, lihat prioritas).
 *
 * Caranya: lahan dibagi kisi sel (dalam meter), sel yang pusatnya di dalam lahan dan di luar zona yang dihindari ditandai kosong,
 * lalu dicari persegi panjang kosong terbesar (algoritma histogram, O(sel)). Hasil mengikuti kisi, jadi cukup kasar tetapi cepat.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Polygon } from 'geojson';

export type JenisZonaPenempatan = 'bangunan' | 'parkir' | 'taman' | 'larangan';

const RAD = Math.PI / 180;
const R_BUMI = 6_371_008.8;

type XY = [number, number];

/** Persegi panjang kosong (meter, relatif ke titik acuan) dan luasnya. */
export type PersegiMeter = { x0: number; y0: number; x1: number; y1: number };

/** Luas minimum (m²) agar ruang kosong dianggap layak: sebagian kecil lahan, tetapi tidak kurang dari ini. */
export const LUAS_LAYAK_MIN_M2 = 30;
export const PORSI_LAYAK = 0.02;

function keMeter(g: Polygon, lat0: number, lng0: number): XY[][] {
    const kos = Math.cos(lat0 * RAD);
    return g.coordinates.map((r) => r.map(([lng, lat]) => [(lng - lng0) * RAD * R_BUMI * kos, (lat - lat0) * RAD * R_BUMI] as XY));
}

function didalamCincin(x: number, y: number, c: XY[]): boolean {
    let isi = false;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
        const [xi, yi] = c[i];
        const [xj, yj] = c[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) isi = !isi;
    }
    return isi;
}

/** Titik di dalam poligon (cincin luar) dan di luar lubang-lubangnya. */
function didalam(x: number, y: number, rings: XY[][]): boolean {
    if (!rings[0] || !didalamCincin(x, y, rings[0])) return false;
    for (let k = 1; k < rings.length; k++) if (didalamCincin(x, y, rings[k])) return false;
    return true;
}

/** Luas poligon (m²) dari cincin luar dikurangi lubang. */
export function luasPoligonMeter(rings: XY[][]): number {
    const luas = (c: XY[]) => {
        let s = 0;
        for (let i = 0; i < c.length; i++) {
            const [x1, y1] = c[i];
            const [x2, y2] = c[(i + 1) % c.length];
            s += x1 * y2 - x2 * y1;
        }
        return Math.abs(s) / 2;
    };
    return rings.reduce((jumlah, c, i) => jumlah + (i === 0 ? luas(c) : -luas(c)), 0);
}

/**
 * Persegi panjang berisi nilai true terbesar pada matriks `kosong[baris][kolom]` (algoritma histogram).
 * Mengembalikan indeks baris/kolom (batas atas-kiri dan bawah-kanan, inklusif), atau null bila tidak ada sel kosong.
 */
export function persegiTerbesar(kosong: boolean[][]): { r0: number; r1: number; c0: number; c1: number; sel: number } | null {
    const baris = kosong.length;
    const kolom = baris ? kosong[0].length : 0;
    const tinggi = new Array<number>(kolom).fill(0);
    let terbaik: { r0: number; r1: number; c0: number; c1: number; sel: number } | null = null;
    for (let r = 0; r < baris; r++) {
        for (let c = 0; c < kolom; c++) tinggi[c] = kosong[r][c] ? tinggi[c] + 1 : 0;
        const tumpukan: number[] = [];
        for (let c = 0; c <= kolom; c++) {
            const h = c === kolom ? 0 : tinggi[c];
            while (tumpukan.length && tinggi[tumpukan[tumpukan.length - 1]] >= h) {
                const tinggiBatang = tinggi[tumpukan.pop() as number];
                const kiri = tumpukan.length ? tumpukan[tumpukan.length - 1] + 1 : 0;
                const sel = tinggiBatang * (c - kiri);
                if (tinggiBatang > 0 && (!terbaik || sel > terbaik.sel)) terbaik = { r0: r - tinggiBatang + 1, r1: r, c0: kiri, c1: c - 1, sel };
            }
            tumpukan.push(c);
        }
    }
    return terbaik;
}

/**
 * Ukur persegi panjang kosong `lebar` x `tinggi` (m) menjadi seluas `target` (m²) dengan perbandingan sisi paling jauh 3:1,
 * berada di tengah persegi panjang itu. Bila target lebih besar dari ruang, seluruh ruang dipakai.
 */
export function ukurKeTarget(lebar: number, tinggi: number, target: number): { lebar: number; tinggi: number } {
    if (target >= lebar * tinggi || target <= 0) return { lebar, tinggi };
    const rasio = Math.max(1 / 3, Math.min(3, lebar / tinggi));
    let w = Math.min(lebar, Math.sqrt(target * rasio));
    let h = target / w;
    if (h > tinggi) {
        h = tinggi;
        w = target / h;
    }
    return { lebar: w, tinggi: h };
}

export type ZonaPenghalang = { geometri: Polygon; kunci?: boolean };

export type HasilPenempatan = {
    geometri: Polygon;
    luasM2: number;
    /** true = di ruang yang tidak dipakai zona mana pun; false = menimpa zona yang tidak terkunci (tidak ada ruang kosong layak). */
    bebas: boolean;
};

/**
 * Persegi panjang kosong terbesar pada kisi, dengan zona `dihindari` dianggap terisi. Bila `harusDi` diberikan, hanya sel di dalam
 * bentuk itu yang dihitung. null bila tidak ada.
 */
function cariRuang(lahan: XY[][], dihindari: XY[][][], sel: number, harusDi?: XY[][]): { persegi: PersegiMeter; luas: number } | null {
    const xs = lahan[0].map((p) => p[0]);
    const ys = lahan[0].map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const kolom = Math.max(1, Math.ceil((Math.max(...xs) - minX) / sel));
    const baris = Math.max(1, Math.ceil((Math.max(...ys) - minY) / sel));
    const kosong: boolean[][] = [];
    for (let r = 0; r < baris; r++) {
        const bar: boolean[] = [];
        for (let c = 0; c < kolom; c++) {
            const x = minX + (c + 0.5) * sel;
            const y = minY + (r + 0.5) * sel;
            bar.push(didalam(x, y, lahan) && (!harusDi || didalam(x, y, harusDi)) && !dihindari.some((z) => didalam(x, y, z)));
        }
        kosong.push(bar);
    }
    const t = persegiTerbesar(kosong);
    if (!t) return null;
    return {
        persegi: { x0: minX + t.c0 * sel, y0: minY + t.r0 * sel, x1: minX + (t.c1 + 1) * sel, y1: minY + (t.r1 + 1) * sel },
        luas: t.sel * sel * sel,
    };
}

/**
 * Tempatkan zona baru di ruang kosong terbesar. `targetM2` adalah luas yang diinginkan (hasilnya paling besar sebesar itu).
 * Mengembalikan null bila seluruh lahan tertutup zona terkunci (atau tidak ada ruang sama sekali).
 */
export function tempatkanZona(lahan: Polygon, zona: ZonaPenghalang[], targetM2: number): HasilPenempatan | null {
    const cincin = lahan.coordinates[0];
    if (!cincin || cincin.length < 4) return null;
    const lat0 = cincin.reduce((s, p) => s + p[1], 0) / cincin.length;
    const lng0 = cincin.reduce((s, p) => s + p[0], 0) / cincin.length;
    const kos = Math.cos(lat0 * RAD);
    const L = keMeter(lahan, lat0, lng0);
    const xs = L[0].map((p) => p[0]);
    const ys = L[0].map((p) => p[1]);
    // Sel dipilih supaya kisi paling banyak sekitar 70 sel pada sisi terpanjang, antara 1,5 dan 8 m.
    const sel = Math.max(1.5, Math.min(8, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 70));
    const luasLahan = luasPoligonMeter(L);
    const layak = Math.max(LUAS_LAYAK_MIN_M2, PORSI_LAYAK * luasLahan);

    const semua = zona.map((z) => keMeter(z.geometri, lat0, lng0));
    const terkunci = zona.flatMap((z, i) => (z.kunci ? [semua[i]] : []));

    let ruang = cariRuang(L, semua, sel);
    let bebas = true;
    if (!ruang || ruang.luas < layak) {
        bebas = false;
        // Tidak ada ruang kosong yang layak: zona baru mengukir SATU zona yang tidak terkunci (yang memberi ruang terbesar), supaya
        // zona lain tidak ikut tertimpa. Bila tidak ada yang cukup besar, boleh menimpa apa saja kecuali zona terkunci.
        let ukir: ReturnType<typeof cariRuang> = null;
        zona.forEach((z, i) => {
            if (z.kunci) return;
            const lain = semua.filter((_, j) => j !== i);
            const r = cariRuang(L, lain, sel, semua[i]);
            if (r && (!ukir || r.luas > ukir.luas)) ukir = r;
        });
        const hasilUkir = ukir as ReturnType<typeof cariRuang>;
        ruang = hasilUkir && hasilUkir.luas >= layak ? hasilUkir : cariRuang(L, terkunci, sel);
    }
    if (!ruang) return null;

    // Sel dihitung dari pusatnya, jadi tepi persegi bisa menjorok sampai setengah sel ke luar lahan atau ke zona lain:
    // kecilkan setengah sel di tiap sisi (kecuali ruangnya terlalu sempit untuk itu).
    const m = sel / 2;
    const p0 = ruang.persegi;
    const aman = p0.x1 - p0.x0 > 2 * m + 1 && p0.y1 - p0.y0 > 2 * m + 1;
    const p = aman ? { x0: p0.x0 + m, y0: p0.y0 + m, x1: p0.x1 - m, y1: p0.y1 - m } : p0;
    const ukuran = ukurKeTarget(p.x1 - p.x0, p.y1 - p.y0, targetM2);
    const cx = (p.x0 + p.x1) / 2;
    const cy = (p.y0 + p.y1) / 2;
    const [x0, x1, y0, y1] = [cx - ukuran.lebar / 2, cx + ukuran.lebar / 2, cy - ukuran.tinggi / 2, cy + ukuran.tinggi / 2];
    const keLngLat = (x: number, y: number): [number, number] => [Number((lng0 + x / (R_BUMI * RAD * kos)).toFixed(7)), Number((lat0 + y / (R_BUMI * RAD)).toFixed(7))];
    const a = keLngLat(x0, y0);
    return {
        geometri: { type: 'Polygon', coordinates: [[a, keLngLat(x1, y0), keLngLat(x1, y1), keLngLat(x0, y1), [...a]]] },
        luasM2: ukuran.lebar * ukuran.tinggi,
        bebas,
    };
}

export type KonteksKebutuhan = {
    luasLahanM2: number;
    /** Dari ringkasan hasil (persen); kosong bila belum ada hasil. */
    kdhTerpakai?: number;
    kdhBatas?: number | null;
    /** Slot parkir yang masih kurang (butuh - muat) dan jenisnya; 0 atau kosong = cukup. */
    slotKurang?: number;
    jenisParkir?: 'motor' | 'mobil' | null;
};

/** Luas tiap slot parkir (m²) tanpa lorong; sama dengan KapasitasLahan::LUAS_PER_SLOT. */
const LUAS_SLOT = { mobil: 25, motor: 2.8 } as const;
/** Lorong dan manuver menambah luas parkir kira-kira 60% di atas luas slot. */
const FAKTOR_LORONG = 1.6;

/**
 * Luas yang sebaiknya dipakai zona baru, menurut kebutuhan:
 * - taman: kekurangan KDH bila ada, selain itu 8% lahan;
 * - parkir: kekurangan slot x luas slot x faktor lorong bila ada, selain itu 8% lahan;
 * - larangan bangun: 6% lahan;
 * - gedung: 15% lahan.
 * Selalu di antara batas bawah dan atas supaya hasilnya masuk akal.
 */
export function kebutuhanLuas(jenis: JenisZonaPenempatan, k: KonteksKebutuhan): number {
    const L = k.luasLahanM2;
    const jepit = (nilai: number, min: number, max: number) => Math.max(min * L, Math.min(max * L, nilai));
    if (jenis === 'taman') {
        const kurang = k.kdhBatas != null && k.kdhTerpakai != null && k.kdhBatas > k.kdhTerpakai ? ((k.kdhBatas - k.kdhTerpakai) / 100) * L : 0;
        return jepit(kurang > 0 ? kurang : 0.08 * L, 0.03, 0.35);
    }
    if (jenis === 'parkir') {
        const luasSlot = LUAS_SLOT[k.jenisParkir ?? 'mobil'];
        const perlu = (k.slotKurang ?? 0) > 0 ? (k.slotKurang as number) * luasSlot * FAKTOR_LORONG : 0;
        return jepit(perlu > 0 ? perlu : 0.08 * L, 0.03, 0.4);
    }
    if (jenis === 'larangan') return jepit(0.06 * L, 0.02, 0.3);
    return jepit(0.15 * L, 0.05, 0.5);
}
