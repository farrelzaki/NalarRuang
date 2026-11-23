/**
 * Batas ukuran lahan Uji Lahan (FR-23): logika murni tanpa Leaflet, supaya bisa dites dengan `npm run test:js`.
 *
 * Server menolak lahan di atas 20 ha (LahanController::LUAS_MAKS). Klien memakai batas sedikit di bawahnya
 * (`LUAS_MAKS_KLIEN`) karena luas dihitung dengan proyeksi sederhana dan server dengan geography; selisih < 1%.
 * Bentuk yang ditarik berhenti ("macet") di batas itu alih-alih ditolak setelah dihitung server.
 *
 * Berkas ini sengaja tidak mengimpor apa pun.
 */
export type TitikLL = { lat: number; lng: number };

/** Batas resmi (m²); sama dengan LahanController::LUAS_MAKS. */
export const LUAS_MAKS_M2 = 200_000;

/** Batas yang dipakai alat gambar (m²): 1% di bawah batas resmi sebagai pengaman selisih perhitungan. */
export const LUAS_MAKS_KLIEN = 198_000;

/** Kotak awal dibuat paling besar sebesar ini dari batas, supaya masih bisa diperbesar sedikit. */
export const PORSI_KOTAK_AWAL = 0.6;

const RAD = Math.PI / 180;
const R_BUMI = 6_371_008.8;

/** Luas poligon (m²) dari titik sudutnya (proyeksi ekuirektangular di lintang tengah). Kurang dari 3 titik = 0. */
export function luasM2(sudut: TitikLL[]): number {
    if (sudut.length < 3) return 0;
    const lat0 = (sudut.reduce((s, p) => s + p.lat, 0) / sudut.length) * RAD;
    const xy = sudut.map((p) => [p.lng * RAD * R_BUMI * Math.cos(lat0), p.lat * RAD * R_BUMI]);
    let s = 0;
    for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i];
        const [x2, y2] = xy[(i + 1) % xy.length];
        s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
}

export type HasilBatas = { titik: TitikLL; terbatas: boolean };

/** Luas kotak yang dibentuk dua sudut berseberangan (m²). */
function luasKotak(a: TitikLL, b: TitikLL): number {
    return luasM2([a, { lat: a.lat, lng: b.lng }, b, { lat: b.lat, lng: a.lng }]);
}

/**
 * Sudut kotak yang ditarik: `tetap` adalah sudut seberangnya, `tarik` posisi yang diinginkan.
 * Bila kotak melebihi batas, sudut ditarik kembali sepanjang garis ke `tetap` (rasio kotak tetap) sampai tepat di batas.
 */
export function batasiKotak(tetap: TitikLL, tarik: TitikLL, maks = LUAS_MAKS_KLIEN): HasilBatas {
    const luas = luasKotak(tetap, tarik);
    if (luas <= maks) return { titik: tarik, terbatas: false };
    // Luas kotak sebanding dengan kuadrat skala selisih koordinat.
    const skala = Math.sqrt(maks / luas);
    return {
        titik: { lat: tetap.lat + (tarik.lat - tetap.lat) * skala, lng: tetap.lng + (tarik.lng - tetap.lng) * skala },
        terbatas: true,
    };
}

/**
 * Titik sudut ke-`i` poligon dipindah dari posisinya sekarang ke `target`. Bila luas poligon melewati batas, titik berhenti
 * di titik terjauh pada garis dari posisi sekarang ke `target` yang masih memenuhi batas (pencarian biner).
 * Bila poligon sudah melebihi batas sebelum digeser, gerakan hanya diizinkan bila luasnya tidak bertambah.
 */
export function batasiTitik(poligon: TitikLL[], i: number, target: TitikLL, maks = LUAS_MAKS_KLIEN): HasilBatas {
    const dengan = (p: TitikLL) => poligon.map((t, k) => (k === i ? p : t));
    const lama = poligon[i];
    const luasTarget = luasM2(dengan(target));
    if (luasTarget <= maks) return { titik: target, terbatas: false };
    const luasLama = luasM2(poligon);
    if (luasLama > maks) {
        return luasTarget < luasLama ? { titik: target, terbatas: false } : { titik: lama, terbatas: true };
    }
    let rendah = 0;
    let tinggi = 1;
    for (let k = 0; k < 18; k++) {
        const t = (rendah + tinggi) / 2;
        const p = { lat: lama.lat + (target.lat - lama.lat) * t, lng: lama.lng + (target.lng - lama.lng) * t };
        if (luasM2(dengan(p)) <= maks) rendah = t;
        else tinggi = t;
    }
    return { titik: { lat: lama.lat + (target.lat - lama.lat) * rendah, lng: lama.lng + (target.lng - lama.lng) * rendah }, terbatas: true };
}

/** Bolehkah titik `baru` ditambahkan ke poligon yang sedang digambar tanpa melewati batas? (Kurang dari 3 titik selalu boleh.) */
export function bolehTambahTitik(poligon: TitikLL[], baru: TitikLL, maks = LUAS_MAKS_KLIEN): boolean {
    return luasM2([...poligon, baru]) <= maks;
}

/**
 * Skala (0–1) untuk mengecilkan kotak awal `lebarLng` x `tinggiLat` (derajat setengah-sisi) di lintang `lat`
 * supaya luasnya paling besar `PORSI_KOTAK_AWAL` dari `maks`. 1 = tidak perlu dikecilkan.
 */
export function skalaKotakAwal(setengahLng: number, setengahLat: number, lat: number, maks = LUAS_MAKS_KLIEN): number {
    const luas = Math.abs(2 * setengahLng * RAD * R_BUMI * Math.cos(lat * RAD) * 2 * setengahLat * RAD * R_BUMI);
    const batas = maks * PORSI_KOTAK_AWAL;
    return luas <= batas ? 1 : Math.sqrt(batas / luas);
}

/** Titik pada ruas a–b yang terdekat ke p, dalam koordinat bidang (piksel) yang dilewatkan; juga jaraknya. */
export function titikTerdekatRuas(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number; jarak: number } {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const kuadrat = dx * dx + dy * dy;
    const t = kuadrat === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / kuadrat));
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    return { x, y, jarak: Math.hypot(p.x - x, p.y - y) };
}

/**
 * Hapus titik sudut `i` dari cincin (tanpa titik penutup). Poligon minimal 3 titik: bila tinggal 3, tidak ada yang dihapus
 * (mengembalikan null supaya pemanggil tahu). Dipakai lahan dan zona (klik ganda titik sudut).
 */
export function hapusTitik<T>(titik: T[], i: number): T[] | null {
    if (titik.length <= 3 || i < 0 || i >= titik.length) return null;
    return titik.filter((_, k) => k !== i);
}

/** Sisipkan titik `baru` setelah titik `i` (di sisi i → i+1). Mengembalikan cincin baru. */
export function sisipSetelah<T>(titik: T[], i: number, baru: T): T[] {
    const hasil = titik.slice();
    hasil.splice(i + 1, 0, baru);
    return hasil;
}
