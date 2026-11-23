/**
 * Simpanan desain Uji Lahan per tab tipe bangunan (Rumah tapak / Kos / Apartemen) dan simpanan sesi browser. Logika murni,
 * dites dengan `npm run test:js`.
 *
 * - Tiap tab mengingat pengaturannya sendiri (asumsi, pola, zona, akses, target, ...). Lahan (bentuk dan lokasi) dipakai bersama.
 *   Pindah tab menyimpan bagian tab lama lalu memulihkan bagian tab baru (atau bawaan bila tab itu belum pernah dibuka).
 * - Seluruh proyek (lahan, tab aktif, simpanan semua tab, skema) ditulis ke sessionStorage oleh halaman, jadi bertahan saat panel
 *   ditutup dan halaman di-refresh, lalu hilang saat tab browser ditutup. Persona tidak pernah ikut (SRS 5.2).
 * - Isi sessionStorage dibaca ulang lewat pembaca berkas (`bacaBerkas`), jadi data yang rusak atau dari versi lain dibuang dengan aman.
 *
 * Berkas ini hanya mengimpor tipe dan fungsi murni, supaya bisa dites langsung oleh node.
 */
import type { TipeLahan } from '@/types';
import type { SnapLahan } from './proyekLahan.ts';
import type { SkemaLahan } from './skemaLahan.ts';
import { bacaBerkas, bungkusProyek } from './berkasLahan.ts';

export const KUNCI_SESI = 'nr-uji-lahan-v1';

/** Bagian desain yang milik satu tab tipe bangunan (semua selain lahan dan tipe). */
export type BagianTipe = Omit<SnapLahan, 'geom' | 'tipe'>;

export type SimpananTipe = Partial<Record<TipeLahan, BagianTipe>>;

export type ModeGambarSesi = 'kotak' | 'poligon';

export type SimpananSesi = {
    snap: SnapLahan;
    simpanan: SimpananTipe;
    mode: ModeGambarSesi;
    skema: SkemaLahan[];
};

const TIPE: TipeLahan[] = ['rumah', 'kos', 'apartemen'];

export function ambilBagian(s: SnapLahan): BagianTipe {
    const { geom: _geom, tipe: _tipe, ...bagian } = s;
    return bagian;
}

/** Bagian bawaan tab yang belum pernah dibuka: gerbang dibawa dari tab lama (milik lahan), pintu gedung tidak untuk rumah tapak. */
export function bagianBawaan(tipe: TipeLahan, dari: BagianTipe): BagianTipe {
    return {
        asumsi: {},
        pola: null,
        zona: null,
        akses: dari.akses.filter((a) => a.jenis === 'gerbang' || tipe !== 'rumah'),
        isiSisa: true,
        targetJumlah: null,
        kunciUkuran: false,
        laranganBanjir: dari.laranganBanjir,
    };
}

/** Pindah tab: bagian tab lama disimpan, bagian tab baru dipulihkan (atau bawaan). Tab yang sama: tidak berubah. */
export function gantiTipe(s: SnapLahan, simpanan: SimpananTipe, tipeBaru: TipeLahan): { snap: SnapLahan; simpanan: SimpananTipe } {
    if (s.tipe === tipeBaru) return { snap: s, simpanan };
    const lama = ambilBagian(s);
    const baru = simpanan[tipeBaru] ?? bagianBawaan(tipeBaru, lama);
    return { snap: { geom: s.geom, tipe: tipeBaru, ...baru }, simpanan: { ...simpanan, [s.tipe]: lama } };
}

/** Teks JSON untuk sessionStorage; null bila belum ada lahan (tidak ada yang perlu diingat). */
export function tulisSesi(d: SimpananSesi): string | null {
    const proyek = bungkusProyek(d.snap, null);
    if (!proyek) return null;
    return JSON.stringify({ versi: 1, proyek, simpanan: d.simpanan, mode: d.mode, skema: d.skema });
}

const objek = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Satu snapshot lengkap dibaca ulang lewat pembaca berkas (lahan dipakai sebagai wadah). */
function bacaSnap(proyek: Record<string, unknown>): SnapLahan | null {
    const r = bacaBerkas(JSON.stringify(proyek));
    return r.ok && r.sumber === 'proyek' ? r.desain : null;
}

/** Baca simpanan sesi; data rusak, versi lain, atau tanpa lahan = null. Bagian tab dan skema yang rusak dibuang satu per satu. */
export function bacaSesi(teks: string | null): SimpananSesi | null {
    if (!teks) return null;
    let j: unknown;
    try {
        j = JSON.parse(teks);
    } catch {
        return null;
    }
    if (!objek(j) || j.versi !== 1 || !objek(j.proyek)) return null;
    const snap = bacaSnap(j.proyek);
    if (!snap) return null;

    const simpanan: SimpananTipe = {};
    if (objek(j.simpanan)) {
        for (const t of TIPE) {
            const b = j.simpanan[t];
            if (!objek(b) || t === snap.tipe) continue;
            const s = bacaSnap({ ...j.proyek, ...b, tipe: t });
            if (s && s.tipe === t) simpanan[t] = ambilBagian(s);
        }
    }

    const skema: SkemaLahan[] = [];
    if (Array.isArray(j.skema)) {
        for (const k of j.skema) {
            if (!objek(k) || typeof k.id !== 'string' || typeof k.nama !== 'string' || !objek(k.metrik) || !objek(k.snap)) continue;
            const ks = k.snap;
            const s = bacaSnap({ ...j.proyek, ...ks, lahan: ks.geom });
            if (s) skema.push({ id: k.id, nama: k.nama.slice(0, 40), waktu: Number(k.waktu) || 0, snap: s, metrik: k.metrik as SkemaLahan['metrik'] });
        }
    }

    return { snap, simpanan, mode: j.mode === 'poligon' ? 'poligon' : 'kotak', skema };
}
