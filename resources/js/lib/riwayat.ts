/**
 * Riwayat undo/redo generik (logika murni, tanpa React dan tanpa peta) untuk Uji Lahan (FR-23).
 *
 * - `catat` menambah satu langkah. Perubahan berurutan dengan `kunci` sama dan berjarak kurang dari `jeda` ms
 *   digabung jadi satu langkah (mis. menarik sudut lahan atau menggeser slider = satu langkah undo, bukan ratusan).
 * - Setelah undo/redo, perubahan berikutnya tidak digabung ke langkah sebelumnya.
 * - Perubahan baru setelah undo membuang langkah redo yang tersisa.
 * - Tidak ada efek samping: setiap fungsi mengembalikan objek riwayat baru.
 *
 * Berkas ini sengaja tidak mengimpor apa pun agar bisa dites langsung dengan `npm run test:js` (node --test).
 */
export type Riwayat<T> = {
    /** Keadaan sebelum `kini`, yang tertua di depan. */
    lalu: T[];
    kini: T;
    /** Keadaan yang bisa di-redo, yang terdekat di depan. */
    depan: T[];
    /** Jenis perubahan terakhir; null setelah undo/redo/reset supaya langkah berikutnya tidak digabung. */
    kunci: string | null;
    /** Waktu (ms) perubahan terakhir. */
    waktu: number;
};

/** Banyak langkah undo yang disimpan; yang tertua dibuang. */
export const BATAS_RIWAYAT = 100;

/** Jeda (ms) maksimum antara dua perubahan sejenis agar digabung jadi satu langkah. */
export const JEDA_GABUNG = 800;

export function buatRiwayat<T>(awal: T): Riwayat<T> {
    return { lalu: [], kini: awal, depan: [], kunci: null, waktu: 0 };
}

/**
 * Catat `nilai` sebagai keadaan terbaru. Nilai yang sama persis (Object.is) tidak dicatat.
 * `waktu` diberikan pemanggil (Date.now()) supaya fungsi ini tetap murni.
 */
export function catat<T>(r: Riwayat<T>, nilai: T, kunci: string, waktu: number, jeda = JEDA_GABUNG, batas = BATAS_RIWAYAT): Riwayat<T> {
    if (Object.is(r.kini, nilai)) return r;
    const gabung = r.kunci === kunci && r.lalu.length > 0 && waktu - r.waktu < jeda;
    if (gabung) {
        return { ...r, kini: nilai, depan: [], waktu };
    }
    const lalu = [...r.lalu, r.kini];
    if (lalu.length > batas) lalu.splice(0, lalu.length - batas);
    return { lalu, kini: nilai, depan: [], kunci, waktu };
}

/** Ganti keadaan sekarang tanpa membuat langkah undo (mis. nilai awal yang baru tiba) dan hentikan penggabungan. */
export function ganti<T>(r: Riwayat<T>, nilai: T): Riwayat<T> {
    return { ...r, kini: nilai, kunci: null };
}

/** Mulai riwayat baru dari `awal`: semua langkah undo dan redo dibuang. */
export function atur<T>(awal: T): Riwayat<T> {
    return buatRiwayat(awal);
}

export const bisaUndo = <T>(r: Riwayat<T>): boolean => r.lalu.length > 0;
export const bisaRedo = <T>(r: Riwayat<T>): boolean => r.depan.length > 0;

export function undo<T>(r: Riwayat<T>): Riwayat<T> {
    if (!bisaUndo(r)) return r;
    const lalu = r.lalu.slice(0, -1);
    return { lalu, kini: r.lalu[r.lalu.length - 1], depan: [r.kini, ...r.depan], kunci: null, waktu: 0 };
}

export function redo<T>(r: Riwayat<T>): Riwayat<T> {
    if (!bisaRedo(r)) return r;
    return { lalu: [...r.lalu, r.kini], kini: r.depan[0], depan: r.depan.slice(1), kunci: null, waktu: 0 };
}
