/**
 * Daftar layer zona Uji Lahan (FR-23): logika murni tanpa React dan tanpa peta, dites dengan `npm run test:js`.
 *
 * Layer = zona (bangunan/parkir/taman) dengan nama, kunci, sembunyi, dan induk (sub-layer). Urutan di daftar adalah urutan
 * yang dikirim ke server, jadi juga nomor zona (`id`) di respons. Semua fungsi mengembalikan daftar baru.
 *
 * Berkas ini hanya mengimpor tipe (dihapus saat dijalankan), supaya bisa dites langsung oleh node.
 */
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { JenisZona, ZonaLahan, ZonaLahanMasuk, ZonaLahanProps } from '@/types';

/** Warna garis dan label tiap jenis zona (dipakai peta dan panel layer). */
export const WARNA_ZONA: Record<JenisZona, string> = { bangunan: '#3b6fd8', parkir: '#4b5563', taman: '#22a35a', larangan: '#dc2626' };

let hitung = 0;

/** uid unik di sesi ini (cukup untuk daftar di memori; tidak disimpan ke server). */
export function buatUid(): string {
    hitung += 1;
    const acak = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
    return `z${hitung}-${acak}`;
}

/** Zona bawaan pola dari server menjadi daftar layer (uid tetap `srv-<id>`), sebelum pengguna mengubahnya. */
export function dariServer(fc: FeatureCollection<Polygon | MultiPolygon, ZonaLahanProps> | null | undefined): ZonaLahan[] {
    return (fc?.features ?? []).flatMap((f) => {
        // Larangan otomatis (banjir) dihitung server dari pengaturan, bukan zona yang bisa disunting.
        if (f.properties.otomatis) return [];
        const g = f.geometry;
        // Zona bawaan selalu Polygon; MultiPolygon (jarang) diambil bagian pertamanya, sama seperti penyunting di peta.
        const koordinat = g.type === 'Polygon' ? g.coordinates : g.coordinates[0];
        if (!koordinat?.length) return [];
        return [{ uid: `srv-${f.properties.id}`, jenis: f.properties.jenis, geometri: { type: 'Polygon', coordinates: koordinat } as Polygon }];
    });
}

/** Buang induk yang sudah tidak ada atau berputar; dipakai setelah zona dihapus atau dari peta. */
export function rapikan(zona: ZonaLahan[]): ZonaLahan[] {
    const ada = new Set(zona.map((z) => z.uid));
    return zona.map((z) => {
        if (z.induk === undefined) return z;
        if (!ada.has(z.induk) || z.induk === z.uid || adalahKeturunan(zona, z.induk, z.uid)) {
            const { induk: _buang, ...sisa } = z;
            return sisa;
        }
        return z;
    });
}

/** Apakah `uid` adalah keturunan (anak, cucu, ...) dari `leluhur`? */
export function adalahKeturunan(zona: ZonaLahan[], uid: string, leluhur: string): boolean {
    const peta = new Map(zona.map((z) => [z.uid, z]));
    let p = peta.get(uid)?.induk;
    for (let langkah = 0; p !== undefined && langkah <= zona.length; langkah++) {
        if (p === leluhur) return true;
        p = peta.get(p)?.induk;
    }
    return false;
}

/**
 * Prioritas tiap zona saat bertumpuk (angka lebih besar menang, zona lain menyesuaikan diri), searah dengan `zona`:
 * 0) area larangan bangun selalu menang, 1) lalu zona terkunci, 2) lalu yang terakhir ditarik/ditambah, 3) lalu yang lebih atas di daftar.
 * Hasilnya 1..n tanpa kembar, sehingga urutannya pasti.
 */
export function prioritasZona(zona: ZonaLahan[]): number[] {
    const urut = zona
        .map((z, i) => ({ i, larangan: z.jenis === 'larangan' ? 1 : 0, kunci: z.kunci ? 1 : 0, tarik: z.tarik ?? 0 }))
        .sort((a, b) => b.larangan - a.larangan || b.kunci - a.kunci || b.tarik - a.tarik || a.i - b.i);
    const hasil = new Array<number>(zona.length).fill(0);
    urut.forEach((x, posisi) => {
        hasil[x.i] = zona.length - posisi;
    });
    return hasil;
}

/** Lupakan siapa yang terakhir ditarik: setelah itu urutan di daftar yang menentukan (mis. setelah pengguna mengubah urutan). */
export const resetTarik = (zona: ZonaLahan[]): ZonaLahan[] =>
    !zona.some((z) => z.tarik !== undefined)
        ? zona
        : zona.map((z) => {
              if (z.tarik === undefined) return z;
              const { tarik: _lama, ...sisa } = z;
              return sisa;
          });

/** Bentuk yang dikirim ke POST /api/lahan: induk berupa nomor urut di daftar yang sama (induk yang tak ada dibuang), plus prioritas. */
export function keZonaApi(zona: ZonaLahan[]): ZonaLahanMasuk[] {
    const nomor = new Map(zona.map((z, i) => [z.uid, i]));
    const prioritas = prioritasZona(zona);
    return zona.map((z, i) => {
        const induk = z.induk !== undefined && z.induk !== z.uid ? nomor.get(z.induk) : undefined;
        return { jenis: z.jenis, geometri: z.geometri, prioritas: prioritas[i], ...(induk !== undefined ? { induk } : {}) };
    });
}

/** Urutan tampil di panel: induk lalu anak-anaknya (sesuai urutan daftar), dengan kedalaman untuk lekukan. */
export function urutanTampil(zona: ZonaLahan[]): { zona: ZonaLahan; kedalaman: number }[] {
    const ada = new Set(zona.map((z) => z.uid));
    const anak = new Map<string | undefined, ZonaLahan[]>();
    for (const z of zona) {
        const kunci = z.induk !== undefined && ada.has(z.induk) ? z.induk : undefined;
        anak.set(kunci, [...(anak.get(kunci) ?? []), z]);
    }
    const hasil: { zona: ZonaLahan; kedalaman: number }[] = [];
    const sudah = new Set<string>();
    const telusur = (induk: string | undefined, kedalaman: number) => {
        for (const z of anak.get(induk) ?? []) {
            if (sudah.has(z.uid)) continue;
            sudah.add(z.uid);
            hasil.push({ zona: z, kedalaman });
            telusur(z.uid, kedalaman + 1);
        }
    };
    telusur(undefined, 0);
    // Pengaman: zona yang tak terjangkau (siklus) tetap tampil di akar.
    for (const z of zona) if (!sudah.has(z.uid)) hasil.push({ zona: z, kedalaman: 0 });
    return hasil;
}

const ubah = (zona: ZonaLahan[], uid: string, f: (z: ZonaLahan) => ZonaLahan): ZonaLahan[] => zona.map((z) => (z.uid === uid ? f(z) : z));

export const ubahNama = (zona: ZonaLahan[], uid: string, nama: string): ZonaLahan[] =>
    ubah(zona, uid, (z) => {
        const bersih = nama.trim().slice(0, 40);
        const { nama: _lama, ...sisa } = z;
        return bersih ? { ...sisa, nama: bersih } : sisa;
    });

export const setKunci = (zona: ZonaLahan[], uid: string, kunci: boolean): ZonaLahan[] => ubah(zona, uid, (z) => ({ ...z, kunci: kunci || undefined }));

export const setSembunyi = (zona: ZonaLahan[], uid: string, sembunyi: boolean): ZonaLahan[] => ubah(zona, uid, (z) => ({ ...z, sembunyi: sembunyi || undefined }));

/** Kunci/sembunyikan banyak layer sekaligus (mis. semua yang sejenis). */
export const setKunciBanyak = (zona: ZonaLahan[], uids: string[], kunci: boolean): ZonaLahan[] => zona.map((z) => (uids.includes(z.uid) ? { ...z, kunci: kunci || undefined } : z));

export const setSembunyiBanyak = (zona: ZonaLahan[], uids: string[], sembunyi: boolean): ZonaLahan[] => zona.map((z) => (uids.includes(z.uid) ? { ...z, sembunyi: sembunyi || undefined } : z));

/** Semua layer sejenis ("pilih serupa"). */
export const serupa = (zona: ZonaLahan[], uid: string): string[] => {
    const jenis = zona.find((z) => z.uid === uid)?.jenis;
    return zona.filter((z) => z.jenis === jenis).map((z) => z.uid);
};

/** Boleh jadi induk? Tidak diri sendiri dan tidak keturunannya (akan berputar). */
export const bisaJadiInduk = (zona: ZonaLahan[], uid: string, calon: string): boolean => calon !== uid && !adalahKeturunan(zona, calon, uid) && zona.some((z) => z.uid === calon);

/** Jadikan `uid` sub-layer dari `induk`; induk undefined = kembali ke akar. Pilihan yang tidak sah diabaikan. */
export function aturInduk(zona: ZonaLahan[], uid: string, induk: string | undefined): ZonaLahan[] {
    if (induk !== undefined && !bisaJadiInduk(zona, uid, induk)) return zona;
    return ubah(zona, uid, (z) => {
        const { induk: _lama, ...sisa } = z;
        return induk === undefined ? sisa : { ...sisa, induk };
    });
}

/**
 * Hapus layer. Anak-anaknya naik satu tingkat (diangkat ke induk layer yang dihapus). Layer terkunci tidak dihapus.
 * Mengembalikan daftar yang sama bila tidak ada yang dihapus.
 */
export function hapusZona(zona: ZonaLahan[], uid: string): ZonaLahan[] {
    const sasaran = zona.find((z) => z.uid === uid);
    if (!sasaran || sasaran.kunci) return zona;
    return zona
        .filter((z) => z.uid !== uid)
        .map((z) => {
            if (z.induk !== uid) return z;
            const { induk: _lama, ...sisa } = z;
            return sasaran.induk === undefined ? sisa : { ...sisa, induk: sasaran.induk };
        });
}

/** Geser layer satu tempat di daftar (naik = -1, turun = +1) di antara saudaranya yang satu induk. */
export function pindahUrutan(zona: ZonaLahan[], uid: string, arah: -1 | 1): ZonaLahan[] {
    const i = zona.findIndex((z) => z.uid === uid);
    if (i < 0) return zona;
    const induk = zona[i].induk;
    for (let j = i + arah; j >= 0 && j < zona.length; j += arah) {
        if (zona[j].induk === induk) {
            const baru = [...zona];
            [baru[i], baru[j]] = [baru[j], baru[i]];
            return baru;
        }
    }
    return zona;
}

/** Geser seluruh koordinat poligon sebesar (dLat, dLng) derajat. */
export function geserPoligon(g: Polygon, dLat: number, dLng: number): Polygon {
    return { type: 'Polygon', coordinates: g.coordinates.map((r) => r.map(([lng, lat]) => [Number((lng + dLng).toFixed(7)), Number((lat + dLat).toFixed(7))])) };
}

/**
 * Salin layer dan sisipkan tepat setelah aslinya, digeser sedikit supaya terlihat. Salinan tidak terkunci dan tidak ikut
 * disembunyikan; namanya diberi akhiran. `labelSalinan` mis. "salinan".
 */
export function duplikatZona(zona: ZonaLahan[], uid: string, geser: { dLat: number; dLng: number }, uidBaru: string, labelSalinan: string, namaDasar: string): ZonaLahan[] {
    const i = zona.findIndex((z) => z.uid === uid);
    if (i < 0) return zona;
    const asli = zona[i];
    const { kunci: _k, sembunyi: _s, ...sisa } = asli;
    const salinan: ZonaLahan = { ...sisa, uid: uidBaru, nama: `${asli.nama ?? namaDasar} (${labelSalinan})`.slice(0, 40), geometri: geserPoligon(asli.geometri, geser.dLat, geser.dLng) };
    return [...zona.slice(0, i + 1), salinan, ...zona.slice(i + 1)];
}
