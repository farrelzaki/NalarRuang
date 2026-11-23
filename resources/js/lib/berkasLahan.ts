/**
 * Berkas Uji Lahan (FR-23): simpan desain ke berkas dan buka lagi di lokasi dan bentuk yang sama. Logika murni tanpa React,
 * peta, dan three.js, dites dengan `npm run test:js`.
 *
 * - `bungkusProyek`: snapshot desain menjadi berkas JSON berversi (`.nalarruang.json`).
 * - `bacaBerkas`: membaca berkas proyek, atau GeoJSON biasa (satu poligon = hanya bentuk lahan). Semua isi diperiksa dan dibersihkan:
 *   berkas dari luar tidak dipercaya, jadi bentuk di luar Jabodetabek, lahan di atas batas luas, tipe/pola tak dikenal, dan zona
 *   berlebih ditolak atau dibuang dengan peringatan.
 * - `bangunGeoJSON`: lahan + zona + isi hasil sebagai FeatureCollection, untuk dibuka di QGIS.
 *
 * Preferensi persona TIDAK ikut tersimpan (SRS 5.2, Business Rule 6): berkas hanya memuat desain lahan, bukan profil pengguna.
 *
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import type { AksesLahanMasuk, AsumsiLahan, JenisAkses, JenisZona, LahanResponse, PolaLahan, TipeLahan, ZonaLahan } from '@/types';
import type { SnapLahan } from './proyekLahan.ts';
import { LUAS_MAKS_M2, luasM2 } from './batasLahan.ts';

export const FORMAT = 'nalarruang-uji-lahan';
export const VERSI = 1;
export const EKSTENSI = '.nalarruang.json';

/** Batas Jabodetabek yang sama dengan batas peta (PetaMapLibre) dan POST /api/lahan. */
const BATAS = { barat: 106.15, selatan: -6.85, timur: 107.35, utara: -5.85 };
const TITIK_MAKS = 200;
const ZONA_MAKS = 12;
const AKSES_MAKS = 6;
const TARGET_MAKS = 50000;
const UKURAN_MAKS = 2_000_000;

const TIPE: TipeLahan[] = ['rumah', 'kos', 'apartemen'];
const POLA: Record<TipeLahan, PolaLahan[]> = { rumah: ['grid', 'cluster'], kos: ['keliling', 'koridor', 'grid'], apartemen: ['keliling', 'wrap', 'tower'] };
const JENIS_ZONA: JenisZona[] = ['bangunan', 'parkir', 'taman', 'larangan'];
const JENIS_AKSES: JenisAkses[] = ['gerbang', 'pintu'];
const KUNCI_ASUMSI: (keyof AsumsiLahan)[] = ['lebar_kavling', 'panjang_kavling', 'lebar_jalan', 'luas_kamar', 'porsi_studio', 'porsi_2br', 'sempadan', 'lantai', 'rasio_parkir', 'rasio_motor', 'sudut_parkir', 'padding_parkir', 'maks_baris'];

/** Isi berkas proyek. `ringkasan` hanya keterangan untuk dibaca manusia; saat dibuka, hasil dihitung ulang oleh server. */
export type BerkasProyek = {
    format: typeof FORMAT;
    versi: number;
    dibuat: string;
    aplikasi: 'NalarRuang';
    lahan: Polygon;
    tipe: TipeLahan;
    asumsi: AsumsiLahan;
    pola: PolaLahan | null;
    zona: ZonaLahan[] | null;
    akses: AksesLahanMasuk[];
    isiSisa: boolean;
    targetJumlah: number | null;
    kunciUkuran: boolean;
    laranganBanjir: number | null;
    ringkasan?: { luas_m2: number; wilayah: string; lantai: number; jumlah: number; satuan: string } | null;
};

/** Desain yang dibaca dari berkas: sama dengan snapshot proyek, `geom` pasti ada. */
export type DesainImpor = Omit<SnapLahan, 'geom'> & { geom: Polygon };

export type HasilBaca = { ok: true; desain: DesainImpor; peringatan: string[]; sumber: 'proyek' | 'geojson' } | { ok: false; galat: string };

type Cincin = number[][];

const angka = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const objek = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const dalamBatas = (lng: number, lat: number) => lng >= BATAS.barat && lng <= BATAS.timur && lat >= BATAS.selatan && lat <= BATAS.utara;

/**
 * Poligon yang sah dari data mentah: cincin luar saja, ditutup, 3–200 titik sudut, semua di Jabodetabek.
 * Mengembalikan galat berupa kalimat untuk pengguna; `maksLuas` mengaktifkan batas luas lahan.
 */
export function periksaPoligon(g: unknown, maksLuas?: number): { ok: true; poligon: Polygon } | { ok: false; galat: string } {
    if (!objek(g) || g.type !== 'Polygon' || !Array.isArray(g.coordinates) || !Array.isArray(g.coordinates[0])) return { ok: false, galat: 'bentuk lahan bukan poligon' };
    const mentah = g.coordinates[0] as unknown[];
    const titik: Cincin = [];
    for (const p of mentah) {
        if (!Array.isArray(p) || p.length < 2 || !angka(p[0]) || !angka(p[1])) return { ok: false, galat: 'koordinat lahan tidak valid' };
        titik.push([p[0], p[1]]);
    }
    const sama = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];
    if (titik.length > 1 && sama(titik[0], titik[titik.length - 1])) titik.pop();
    if (titik.length < 3) return { ok: false, galat: 'lahan butuh minimal 3 titik sudut' };
    if (titik.length > TITIK_MAKS) return { ok: false, galat: `lahan terlalu rumit (maksimal ${TITIK_MAKS} titik sudut)` };
    if (titik.some(([lng, lat]) => !dalamBatas(lng, lat))) return { ok: false, galat: 'lahan berada di luar Jabodetabek' };
    const luas = luasM2(titik.map(([lng, lat]) => ({ lat, lng })));
    if (luas < 1) return { ok: false, galat: 'luas lahan nol' };
    if (maksLuas !== undefined && luas > maksLuas) return { ok: false, galat: `luas lahan melebihi batas ${Math.round(maksLuas / 10000)} hektare` };
    return { ok: true, poligon: { type: 'Polygon', coordinates: [[...titik, titik[0]]] } };
}

/** Berkas proyek dari snapshot desain. Tanpa lahan (geom null) tidak ada yang bisa disimpan. */
export function bungkusProyek(s: SnapLahan, hasil: LahanResponse | null, waktu: Date = new Date()): BerkasProyek | null {
    if (!s.geom) return null;
    return {
        format: FORMAT,
        versi: VERSI,
        dibuat: waktu.toISOString(),
        aplikasi: 'NalarRuang',
        lahan: s.geom,
        tipe: s.tipe,
        asumsi: s.asumsi,
        pola: s.pola,
        zona: s.zona,
        akses: s.akses,
        isiSisa: s.isiSisa,
        targetJumlah: s.targetJumlah,
        kunciUkuran: s.kunciUkuran,
        laranganBanjir: s.laranganBanjir,
        ringkasan: hasil ? { luas_m2: hasil.luas_m2, wilayah: hasil.wilayah, lantai: hasil.kapasitas.lantai, jumlah: hasil.kapasitas.jumlah, satuan: hasil.kapasitas.satuan } : null,
    };
}

function bacaAsumsi(a: unknown): AsumsiLahan {
    const keluar: Record<string, number | null> = {};
    if (!objek(a)) return keluar;
    for (const k of KUNCI_ASUMSI) {
        const v = a[k];
        if (angka(v)) keluar[k] = v;
        else if (v === null && k === 'lantai') keluar[k] = null;
    }
    return keluar as AsumsiLahan;
}

function bacaZona(z: unknown, peringatan: string[]): ZonaLahan[] | null {
    if (!Array.isArray(z)) return null;
    const hasil: ZonaLahan[] = [];
    const dipakai = new Set<string>();
    for (const [i, m] of z.entries()) {
        if (hasil.length >= ZONA_MAKS) {
            peringatan.push(`zona di atas ${ZONA_MAKS} dibuang`);
            break;
        }
        if (!objek(m) || !JENIS_ZONA.includes(m.jenis as JenisZona)) {
            peringatan.push(`zona ${i + 1} dibuang (jenis tidak dikenal)`);
            continue;
        }
        const g = periksaPoligon(m.geometri);
        if (!g.ok) {
            peringatan.push(`zona ${i + 1} dibuang (${g.galat})`);
            continue;
        }
        let uid = typeof m.uid === 'string' && m.uid.length > 0 && m.uid.length <= 60 ? m.uid : `impor-${i}`;
        while (dipakai.has(uid)) uid += '_';
        dipakai.add(uid);
        hasil.push({
            uid,
            jenis: m.jenis as JenisZona,
            geometri: g.poligon,
            ...(typeof m.nama === 'string' && m.nama.trim() ? { nama: m.nama.trim().slice(0, 60) } : {}),
            ...(m.kunci === true ? { kunci: true } : {}),
            ...(m.sembunyi === true ? { sembunyi: true } : {}),
            ...(typeof m.induk === 'string' ? { induk: m.induk } : {}),
            ...(angka(m.tarik) ? { tarik: m.tarik } : {}),
            ...(m.jenis === 'parkir' && angka(m.arah) && m.arah >= 0 && m.arah < 180 ? { arah: m.arah } : {}),
        });
    }
    // Induk yang tidak ada (zonanya dibuang) atau menunjuk diri sendiri dilepas; sub-layer menjadi layer biasa.
    const ada = new Set(hasil.map((x) => x.uid));
    const bersih = hasil.map((x) => (x.induk && (!ada.has(x.induk) || x.induk === x.uid) ? { ...x, induk: undefined } : x)).map((x) => (x.induk === undefined ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'induk')) as ZonaLahan : x));
    // Rantai induk melingkar (A di bawah B di bawah A) juga dilepas.
    const induk = new Map(bersih.map((x) => [x.uid, x.induk]));
    return bersih.map((x) => {
        const lihat = new Set<string>([x.uid]);
        let p = x.induk;
        while (p) {
            if (lihat.has(p)) return Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'induk')) as ZonaLahan;
            lihat.add(p);
            p = induk.get(p);
        }
        return x;
    });
}

function bacaAkses(a: unknown, peringatan: string[]): AksesLahanMasuk[] {
    if (!Array.isArray(a)) return [];
    const hasil: AksesLahanMasuk[] = [];
    for (const m of a) {
        if (hasil.length >= AKSES_MAKS) {
            peringatan.push(`akses di atas ${AKSES_MAKS} dibuang`);
            break;
        }
        const t = objek(m) ? m.titik : null;
        if (!objek(m) || !JENIS_AKSES.includes(m.jenis as JenisAkses) || !Array.isArray(t) || !angka(t[0]) || !angka(t[1]) || !dalamBatas(t[0], t[1])) {
            peringatan.push('satu gerbang/pintu dibuang (data tidak valid)');
            continue;
        }
        hasil.push({ jenis: m.jenis as JenisAkses, titik: [t[0], t[1]], ...(angka(m.lebar) ? { lebar: m.lebar } : {}), ...(angka(m.panjang) ? { panjang: m.panjang } : {}) });
    }
    return hasil;
}

/** Poligon pertama dari GeoJSON apa pun (Polygon, Feature, FeatureCollection; MultiPolygon diambil bagian terbesarnya). */
function poligonPertama(j: unknown): unknown {
    if (!objek(j)) return null;
    if (j.type === 'FeatureCollection' && Array.isArray(j.features)) {
        for (const f of j.features) {
            const p = poligonPertama(f);
            if (p) return p;
        }
        return null;
    }
    if (j.type === 'Feature') return poligonPertama(j.geometry);
    if (j.type === 'Polygon') return j;
    if (j.type === 'MultiPolygon' && Array.isArray(j.coordinates) && j.coordinates.length) {
        const bagian = (j.coordinates as unknown[]).map((c) => ({ type: 'Polygon', coordinates: c }));
        const luas = (p: unknown) => {
            const h = periksaPoligon(p);
            return h.ok ? luasM2(h.poligon.coordinates[0].map(([lng, lat]) => ({ lat, lng }))) : 0;
        };
        return bagian.sort((a, b) => luas(b) - luas(a))[0];
    }
    return null;
}

/** Baca isi berkas teks. Tidak pernah melempar: galat dikembalikan sebagai kalimat untuk pengguna. */
export function bacaBerkas(teks: string): HasilBaca {
    if (teks.length > UKURAN_MAKS) return { ok: false, galat: 'Berkas terlalu besar untuk berkas Uji Lahan.' };
    let j: unknown;
    try {
        j = JSON.parse(teks.charCodeAt(0) === 0xfeff ? teks.slice(1) : teks);
    } catch {
        return { ok: false, galat: 'Berkas bukan JSON yang valid.' };
    }
    if (!objek(j)) return { ok: false, galat: 'Isi berkas tidak dikenali.' };
    const peringatan: string[] = [];

    if (j.format === FORMAT) {
        if (!angka(j.versi) || j.versi > VERSI) return { ok: false, galat: 'Berkas dibuat oleh versi NalarRuang yang lebih baru. Perbarui aplikasi lalu coba lagi.' };
        const lahan = periksaPoligon(j.lahan, LUAS_MAKS_M2);
        if (!lahan.ok) return { ok: false, galat: `Lahan di berkas ditolak: ${lahan.galat}.` };
        const tipe: TipeLahan = TIPE.includes(j.tipe as TipeLahan) ? (j.tipe as TipeLahan) : 'rumah';
        if (tipe !== j.tipe) peringatan.push('tipe bangunan tidak dikenal, dipakai rumah tapak');
        const pola = POLA[tipe].includes(j.pola as PolaLahan) ? (j.pola as PolaLahan) : null;
        const target = angka(j.targetJumlah) && Number.isInteger(j.targetJumlah) && j.targetJumlah >= 1 && j.targetJumlah <= TARGET_MAKS ? j.targetJumlah : null;
        return {
            ok: true,
            sumber: 'proyek',
            peringatan,
            desain: {
                geom: lahan.poligon,
                tipe,
                asumsi: bacaAsumsi(j.asumsi),
                pola,
                zona: bacaZona(j.zona, peringatan),
                akses: bacaAkses(j.akses, peringatan),
                isiSisa: j.isiSisa === true,
                targetJumlah: target,
                kunciUkuran: target !== null && j.kunciUkuran === true,
                laranganBanjir: j.laranganBanjir === 1 || j.laranganBanjir === 2 || j.laranganBanjir === 3 ? j.laranganBanjir : null,
            },
        };
    }

    // GeoJSON biasa (mis. batas persil dari QGIS): hanya bentuk lahan yang diambil, desain lain bawaan.
    if (typeof j.type === 'string' && ['Polygon', 'MultiPolygon', 'Feature', 'FeatureCollection'].includes(j.type)) {
        const p = poligonPertama(j);
        if (!p) return { ok: false, galat: 'GeoJSON ini tidak berisi poligon lahan.' };
        const lahan = periksaPoligon(p, LUAS_MAKS_M2);
        if (!lahan.ok) return { ok: false, galat: `Lahan di berkas ditolak: ${lahan.galat}.` };
        if (j.type === 'FeatureCollection' && Array.isArray(j.features) && j.features.length > 1) peringatan.push('berkas berisi beberapa bentuk, hanya yang pertama dipakai');
        if (j.type === 'MultiPolygon') peringatan.push('berkas berisi beberapa poligon, hanya yang terluas dipakai');
        return {
            ok: true,
            sumber: 'geojson',
            peringatan,
            desain: { geom: lahan.poligon, tipe: 'rumah', asumsi: {}, pola: null, zona: null, akses: [], isiSisa: false, targetJumlah: null, kunciUkuran: false, laranganBanjir: null },
        };
    }
    return { ok: false, galat: 'Berkas ini bukan berkas Uji Lahan NalarRuang dan bukan GeoJSON.' };
}

/** GeoJSON hasil: lahan, zona, dan isi kapasitas (unit, kavling, jalan, taman, slot), untuk QGIS atau alat GIS lain. */
export function bangunGeoJSON(s: SnapLahan, hasil: LahanResponse | null, waktu: Date = new Date()): FeatureCollection | null {
    if (!s.geom) return null;
    const fitur: Feature<Geometry, Record<string, unknown>>[] = [{ type: 'Feature', properties: { peran: 'lahan', tipe: s.tipe, ...(hasil ? { luas_m2: hasil.luas_m2, wilayah: hasil.wilayah } : {}) }, geometry: s.geom }];
    for (const z of hasil?.zona?.features ?? []) fitur.push({ type: 'Feature', properties: { peran: 'zona', ...z.properties }, geometry: z.geometry });
    for (const f of hasil?.geometri_kapasitas?.features ?? []) if (f.geometry) fitur.push({ type: 'Feature', properties: { peran: 'isi', ...(f.properties ?? {}) }, geometry: f.geometry });
    for (const a of hasil?.akses?.features ?? []) fitur.push({ type: 'Feature', properties: { peran: 'akses', ...a.properties }, geometry: a.geometry });
    return { type: 'FeatureCollection', features: fitur, ...({ nalarruang: { format: FORMAT, versi: VERSI, dibuat: waktu.toISOString(), crs: 'EPSG:4326' } } as object) };
}

/** Nama berkas unduhan: `uji-lahan-rumah-20261122-1430.nalarruang.json` (ekstensi diberikan pemanggil). */
export function namaBerkas(tipe: TipeLahan, waktu: Date = new Date()): string {
    const d = (n: number) => String(n).padStart(2, '0');
    return `uji-lahan-${tipe}-${waktu.getFullYear()}${d(waktu.getMonth() + 1)}${d(waktu.getDate())}-${d(waktu.getHours())}${d(waktu.getMinutes())}`;
}
