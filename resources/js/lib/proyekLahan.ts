/**
 * Proyek Uji Lahan (FR-23) di klien: satu "snapshot" berisi semua yang membentuk desain, dengan riwayat undo/redo.
 *
 * Hook ini menggantikan enam useState terpisah di halaman Peta dengan satu sumber kebenaran. Setiap setter bentuknya
 * sama dengan setState (nilai atau fungsi pembaruan), jadi pemakai lama tidak berubah, tetapi tiap perubahan masuk riwayat
 * (logika riwayatnya murni di `riwayat.ts` dan dites di `tests/js`).
 *
 * Riwayat dimulai ulang tiap lahan baru: saat lahan berpindah dari "belum ada" ke "ada" (selesai digambar) atau sebaliknya.
 * Lapisan (nama, kunci, urutan, masking) ditambahkan ke snapshot ini pada fase berikutnya; riwayatnya otomatis ikut.
 */
import { useCallback, useRef, useState } from 'react';
import type { Polygon } from 'geojson';
import type { AksesLahanMasuk, AsumsiLahan, PolaLahan, TipeLahan, ZonaLahan } from '@/types';
import { atur, bisaRedo, bisaUndo, buatRiwayat, catat, redo as ulangi, undo as urungkan, type Riwayat } from './riwayat';

export type SnapLahan = {
    geom: Polygon | null;
    tipe: TipeLahan;
    asumsi: AsumsiLahan;
    /** null = pola bawaan tipe. */
    pola: PolaLahan | null;
    /** Zona yang ditarik pengguna; null = zona bawaan pola dari server. */
    zona: ZonaLahan[] | null;
    akses: AksesLahanMasuk[];
    /** Isi lahan kosong di luar zona sendiri secara otomatis (kos/apartemen): parkir bila kurang, sisanya taman. Bawaan aktif. */
    isiSisa: boolean;
    /** Target jumlah (kamar/unit/rumah) yang dikunci; null = jumlah dihitung biasa dari ukuran. */
    targetJumlah: number | null;
    /** Dengan target aktif: ukuran (kamar/unit/kavling) tidak boleh berubah, hanya lantai yang menyesuaikan. */
    kunciUkuran: boolean;
    /** Area banjir InaRISK bertingkat >= nilai ini (1–3) menjadi area larangan bangun otomatis; null = mati. */
    laranganBanjir: number | null;
};

export const SNAP_AWAL: SnapLahan = { geom: null, tipe: 'rumah', asumsi: {}, pola: null, zona: null, akses: [], isiSisa: true, targetJumlah: null, kunciUkuran: false, laranganBanjir: null };

type Bidang = keyof SnapLahan;
type Pembaruan<T> = T | ((lama: T) => T);
/** Pembaruan beberapa bidang sekaligus: objek sebagian, atau fungsi dari snapshot lama. */
type PembaruanSebagian = Partial<SnapLahan> | ((lama: SnapLahan) => Partial<SnapLahan>);

const nilaiDari = <T,>(p: Pembaruan<T>, lama: T): T => (typeof p === 'function' ? (p as (l: T) => T)(lama) : p);

export function useProyekLahan() {
    const [riwayat, setRiwayat] = useState<Riwayat<SnapLahan>>(() => buatRiwayat(SNAP_AWAL));
    // Cermin sinkron: beberapa setter bisa dipanggil berturut-turut dalam satu event dan harus saling melihat hasilnya.
    const ref = useRef(riwayat);

    const simpan = useCallback((baru: Riwayat<SnapLahan>) => {
        ref.current = baru;
        setRiwayat(baru);
    }, []);

    /** Ubah beberapa bidang sekaligus sebagai satu langkah undo (kunci = jenis perubahan untuk penggabungan). */
    const ubah = useCallback(
        (p: PembaruanSebagian, kunci: string) => {
            const lama = ref.current.kini;
            const baru: SnapLahan = { ...lama, ...(typeof p === 'function' ? p(lama) : p) };
            if ((lama.geom === null) !== (baru.geom === null)) {
                // Lahan muncul atau hilang: mulai riwayat baru, tanpa langkah undo menuju keadaan "tanpa lahan".
                simpan(atur(baru));
                return;
            }
            simpan(catat(ref.current, baru, kunci, Date.now()));
        },
        [simpan],
    );

    const bidang = useCallback(
        <K extends Bidang>(k: K) =>
            (p: Pembaruan<SnapLahan[K]>) =>
                ubah((lama) => ({ [k]: nilaiDari<SnapLahan[K]>(p, lama[k]) }) as Partial<SnapLahan>, k),
        [ubah],
    );

    // Setter dibuat sekali supaya identitasnya stabil.
    const setters = useRef({
        setGeom: bidang('geom'),
        setTipe: bidang('tipe'),
        setAsumsi: bidang('asumsi'),
        setPola: bidang('pola'),
        setZona: bidang('zona'),
        setAkses: bidang('akses'),
        setIsiSisa: bidang('isiSisa'),
    }).current;

    /** Mulai proyek baru dari `awal` (riwayat dibuang). */
    const mulaiBaru = useCallback((awal: SnapLahan = SNAP_AWAL) => simpan(atur(awal)), [simpan]);

    /** Kembali satu langkah; mengembalikan snapshot hasilnya, atau null bila tidak ada yang bisa di-undo. */
    const undo = useCallback((): SnapLahan | null => {
        if (!bisaUndo(ref.current)) return null;
        simpan(urungkan(ref.current));
        return ref.current.kini;
    }, [simpan]);

    const redo = useCallback((): SnapLahan | null => {
        if (!bisaRedo(ref.current)) return null;
        simpan(ulangi(ref.current));
        return ref.current.kini;
    }, [simpan]);

    const s = riwayat.kini;
    return {
        snap: s,
        geom: s.geom,
        tipe: s.tipe,
        asumsi: s.asumsi,
        pola: s.pola,
        zona: s.zona,
        akses: s.akses,
        isiSisa: s.isiSisa,
        targetJumlah: s.targetJumlah,
        kunciUkuran: s.kunciUkuran,
        laranganBanjir: s.laranganBanjir,
        ...setters,
        ubah,
        mulaiBaru,
        undo,
        redo,
        bisaUndo: bisaUndo(riwayat),
        bisaRedo: bisaRedo(riwayat),
    };
}
