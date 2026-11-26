/**
 * Ekspor denah Uji Lahan (FR-23) ke DXF untuk AutoCAD, LibreCAD, atau QGIS. Logika murni tanpa React dan peta, dites dengan
 * `npm run test:js`.
 *
 * - Format DXF R12 (AC1009) teks: paling luas didukung. DWG tidak dibuat di sini (format tertutup, butuh pustaka tambahan);
 *   berkas DXF bisa disimpan ulang sebagai .dwg dari AutoCAD.
 * - Koordinat UTM zona 48S (EPSG:32748) dalam meter, sama dengan perhitungan server, jadi skala dan letaknya nyata.
 * - Satu layer per jenis isi: lahan, zona, unit per tipe, koridor, lift/tangga, lobi, parkir, slot, taman, jalan, kavling, dst.
 *   Gerbang/pintu digambar sebagai titik + teks. Teks judul berisi tipe, luas, lantai, dan jumlah.
 *
 * Preferensi persona tidak ikut (SRS 5.2). Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Geometry, Polygon, Position } from 'geojson';

/** Bagian hasil /api/lahan yang dipakai (LahanResponse memenuhinya). */
export type DataDxf = {
    tipe?: string;
    luas_m2?: number;
    wilayah?: string;
    kapasitas?: { lantai?: number; jumlah?: number; satuan?: string } | null;
    zona?: { features: { geometry: Geometry | null; properties?: Record<string, unknown> | null }[] } | null;
    geometri_kapasitas?: { features: { geometry: Geometry | null; properties?: Record<string, unknown> | null }[] } | null;
    akses?: { features: { geometry: Geometry | null; properties?: Record<string, unknown> | null }[] } | null;
};

const RAD = Math.PI / 180;

/** Lintang/bujur WGS84 ke UTM zona 48S (EPSG:32748), meter. Rumus deret Snyder; galat di bawah 1 mm untuk Jabodetabek. */
export function keUtm48s(lng: number, lat: number): [number, number] {
    const a = 6378137;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;
    const e2 = f * (2 - f);
    const ep2 = e2 / (1 - e2);
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const phi = lat * RAD;
    const sin = Math.sin(phi);
    const cos = Math.cos(phi);
    const tan = Math.tan(phi);
    const N = a / Math.sqrt(1 - e2 * sin * sin);
    const T = tan * tan;
    const C = ep2 * cos * cos;
    const A = cos * (lng - 105) * RAD;
    const M =
        a *
        ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
            ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
            ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
            ((35 * e6) / 3072) * Math.sin(6 * phi));
    const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
    // Zona selatan (EPSG:32748): utara palsu 10.000.000 m untuk semua titik.
    const y = k0 * (M + N * tan * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720)) + 10000000;
    return [x, y];
}

/** Warna ACI (AutoCAD Color Index) per layer; layer lain putih/hitam (7). */
const WARNA: Record<string, number> = {
    NR_LAHAN: 1,
    NR_ZONA_BANGUNAN: 5,
    NR_ZONA_PARKIR: 8,
    NR_ZONA_TAMAN: 3,
    NR_ZONA_LARANGAN: 1,
    NR_ZONA_KOLAM: 4,
    NR_UNIT_STUDIO: 3,
    NR_UNIT_1BR: 5,
    NR_UNIT_2BR: 6,
    NR_KAMAR: 5,
    NR_KORIDOR: 8,
    NR_INTI_LIFT: 250,
    NR_INTI_TANGGA: 9,
    NR_INTI_SERVIS: 254,
    NR_LOBI: 2,
    NR_PARKIR: 8,
    NR_SLOT: 3,
    NR_TAMAN: 3,
    NR_JALAN: 8,
    NR_AKSES: 8,
    NR_JALUR: 42,
    NR_KAVLING: 30,
    NR_TAPAK: 5,
    NR_KOLAM: 4,
    NR_HALAMAN: 42,
    NR_PAGAR: 32,
    NR_VOID: 1,
    NR_GERBANG: 30,
    NR_PINTU: 6,
    NR_TEKS: 7,
};

/** Nama layer DXF dari properti fitur isi hasil: unit per tipe, inti per fungsi, sisanya per jenis. */
export function layerIsi(p: Record<string, unknown>): string {
    const jenis = String(p.jenis ?? 'lain');
    if (jenis === 'unit') return p.tipe === 'kamar' ? 'NR_KAMAR' : `NR_UNIT_${String(p.tipe ?? 'lain').toUpperCase()}`;
    if (jenis === 'inti') return `NR_INTI_${String(p.fungsi ?? 'servis').toUpperCase()}`;
    return `NR_${jenis.toUpperCase()}`.replace(/[^A-Z0-9_]/g, '_');
}

/** Teks DXF R12 hanya ASCII: huruf di luar ASCII diganti padanannya atau dibuang. */
function ascii(s: string): string {
    return s
        .replace(/[–—]/g, '-')
        .replace(/²/g, '2')
        .replace(/·/g, '-')
        .normalize('NFKD')
        .replace(/[^\x20-\x7e]/g, '');
}

const n = (x: number) => x.toFixed(3);

function cincinDari(g: Geometry | null): Position[][] {
    if (!g) return [];
    if (g.type === 'Polygon') return g.coordinates;
    if (g.type === 'MultiPolygon') return g.coordinates.flat();
    return [];
}

/**
 * Berkas DXF (teks) denah lahan dan hasil hitung. `lahan` = batas lahan (EPSG:4326). Mengembalikan null bila tidak ada lahan.
 * Baris diakhiri CRLF seperti keluaran AutoCAD.
 */
export function bangunDxf(lahan: Polygon | null, hasil: DataDxf | null, waktu: Date = new Date()): string | null {
    if (!lahan) return null;
    const entitas: string[] = [];
    const layer = new Set<string>(['NR_LAHAN', 'NR_TEKS']);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const garis = (nama: string, cincin: Position[]) => {
        const titik = cincin.slice();
        if (titik.length > 1 && titik[0][0] === titik[titik.length - 1][0] && titik[0][1] === titik[titik.length - 1][1]) titik.pop();
        if (titik.length < 2) return;
        layer.add(nama);
        entitas.push('0', 'POLYLINE', '8', nama, '66', '1', '10', '0.0', '20', '0.0', '30', '0.0', '70', '1');
        for (const [lng, lat] of titik) {
            const [x, y] = keUtm48s(lng, lat);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            entitas.push('0', 'VERTEX', '8', nama, '10', n(x), '20', n(y), '30', '0.0');
        }
        entitas.push('0', 'SEQEND', '8', nama);
    };
    const teks = (nama: string, x: number, y: number, tinggi: number, isi: string) => {
        layer.add(nama);
        entitas.push('0', 'TEXT', '8', nama, '10', n(x), '20', n(y), '30', '0.0', '40', n(tinggi), '1', ascii(isi));
    };

    for (const c of lahan.coordinates.slice(0, 1)) garis('NR_LAHAN', c);
    for (const z of hasil?.zona?.features ?? []) {
        const nama = `NR_ZONA_${String(z.properties?.jenis ?? 'lain').toUpperCase()}`.replace(/[^A-Z0-9_]/g, '_');
        for (const c of cincinDari(z.geometry)) garis(nama, c);
    }
    for (const f of hasil?.geometri_kapasitas?.features ?? []) {
        const nama = layerIsi(f.properties ?? {});
        for (const c of cincinDari(f.geometry)) garis(nama, c);
    }
    for (const a of hasil?.akses?.features ?? []) {
        if (a.geometry?.type !== 'Point') continue;
        const pintu = a.properties?.jenis === 'pintu';
        const nama = pintu ? 'NR_PINTU' : 'NR_GERBANG';
        const [x, y] = keUtm48s(a.geometry.coordinates[0], a.geometry.coordinates[1]);
        layer.add(nama);
        entitas.push('0', 'POINT', '8', nama, '10', n(x), '20', n(y), '30', '0.0');
        teks(nama, x + 1, y + 1, 1.5, pintu ? 'Pintu' : 'Gerbang');
    }

    // Judul di bawah kiri lahan: tipe, wilayah, luas, lantai, jumlah, sistem koordinat.
    const k = hasil?.kapasitas;
    const baris = [
        `NalarRuang - Uji Lahan${hasil?.tipe ? ` (${hasil.tipe})` : ''}`,
        ...(hasil?.wilayah ? [hasil.wilayah] : []),
        ...(hasil?.luas_m2 ? [`Luas lahan ${Math.round(hasil.luas_m2)} m2`] : []),
        ...(k?.jumlah != null ? [`${k.lantai ?? 1} lantai, ${k.jumlah} ${k.satuan ?? 'unit'}`] : []),
        `Koordinat UTM 48S (EPSG:32748), satuan meter. Dibuat ${waktu.toISOString().slice(0, 10)}. Estimasi indikatif.`,
    ];
    const tinggi = Math.max(1.5, Math.min(6, (maxX - minX) / 60));
    baris.forEach((b, i) => teks('NR_TEKS', minX, minY - tinggi * 2 * (i + 1), i === 0 ? tinggi * 1.4 : tinggi, b));

    const nama = [...layer].sort();
    const kepala = [
        '0', 'SECTION', '2', 'HEADER',
        '9', '$ACADVER', '1', 'AC1009',
        '9', '$INSBASE', '10', '0.0', '20', '0.0', '30', '0.0',
        '9', '$EXTMIN', '10', n(minX), '20', n(minY - tinggi * 12), '30', '0.0',
        '9', '$EXTMAX', '10', n(maxX), '20', n(maxY), '30', '0.0',
        '0', 'ENDSEC',
        '0', 'SECTION', '2', 'TABLES',
        '0', 'TABLE', '2', 'LTYPE', '70', '1',
        '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0',
        '0', 'ENDTAB',
        '0', 'TABLE', '2', 'LAYER', '70', String(nama.length),
        ...nama.flatMap((l) => ['0', 'LAYER', '2', l, '70', '0', '62', String(WARNA[l] ?? 7), '6', 'CONTINUOUS']),
        '0', 'ENDTAB',
        '0', 'ENDSEC',
        '0', 'SECTION', '2', 'ENTITIES',
    ];
    return [...kepala, ...entitas, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
}
