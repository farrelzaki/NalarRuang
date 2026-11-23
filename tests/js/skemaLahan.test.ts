// Tes logika murni skema Uji Lahan (simpan dan bandingkan). Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandingkan, buatSkema, namaBerikut, SKEMA_MAKS } from '../../resources/js/lib/skemaLahan.ts';

const poligon = { type: 'Polygon' as const, coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.801, -6.199], [106.8, -6.2]]] };
const snap = (tambahan = {}) => ({ geom: poligon, tipe: 'apartemen' as const, asumsi: {}, pola: null, zona: null, akses: [], isiSisa: false, targetJumlah: null, kunciUkuran: false, laranganBanjir: null, inti: null, ...tambahan });
const hasil = (o: { jumlah?: number; satuan?: string; lantai?: number; pelanggaran?: string[]; parkir?: { butuh: number; muat: number } | null; tipe?: string } = {}) =>
    ({
        tipe: o.tipe ?? 'apartemen',
        pola: 'keliling',
        luas_m2: 12000,
        kapasitas: { jumlah: o.jumlah ?? 100, satuan: o.satuan ?? 'unit', lantai: o.lantai ?? 10, luas_tapak_m2: 3000, luas_lantai_m2: 30000, kepadatan_per_ha: 80, parkir: o.parkir === null ? undefined : { jenis: 'mobil', lantai: 1, ...(o.parkir ?? { butuh: 50, muat: 60 }) } },
        ringkasan: { kdb_terpakai: 25, kdb_batas: 40, klb_terpakai: 2.5, klb_batas: 4, kdh_terpakai: 20, kdh_batas: 15, tinggi_lantai_m: 3.2, tinggi_m: 32, pelanggaran: o.pelanggaran ?? [] },
    }) as never;
const skema = (id: string, nama: string, h: ReturnType<typeof hasil>) => buatSkema(snap(), h, nama, id, 1000)!;
const baris = (b: ReturnType<typeof bandingkan>, kunci: string) => b.find((x) => x.kunci === kunci)!;

test('buatSkema: menyimpan desain dan angka; null bila belum ada lahan, hasil, atau hasilnya tipe lain', () => {
    const s = buatSkema(snap(), hasil(), '  Menara Utara  ', 'a', 5)!;
    assert.equal(s.nama, 'Menara Utara');
    assert.equal(s.metrik.jumlah, 100);
    assert.equal(s.metrik.parkir_selisih, 10);
    assert.equal(s.waktu, 5);
    assert.deepEqual(s.snap, snap());
    assert.equal(buatSkema(snap({ geom: null }), hasil(), 'x', 'a', 1), null);
    assert.equal(buatSkema(snap(), null, 'x', 'a', 1), null);
    assert.equal(buatSkema(snap({ tipe: 'kos' }), hasil({ tipe: 'apartemen' }), 'x', 'a', 1), null, 'hasil tertinggal dari tipe yang dipilih');
    assert.equal(buatSkema(snap(), hasil(), '   ', 'a', 1)!.nama, 'Skema');
    assert.equal(buatSkema(snap(), hasil({ parkir: null }), 'x', 'a', 1)!.metrik.parkir_selisih, null);
    assert.ok(SKEMA_MAKS >= 2);
});

test('namaBerikut: nomor terkecil yang belum dipakai', () => {
    const d = [skema('1', 'Skema 1', hasil()), skema('2', 'Skema 3', hasil())];
    assert.equal(namaBerikut([]), 'Skema 1');
    assert.equal(namaBerikut(d), 'Skema 2');
    assert.equal(namaBerikut([skema('1', 'Skema 2', hasil())]), 'Skema 1');
});

test('bandingkan: yang terbaik ditandai, kembar sama-sama ditandai', () => {
    const b = bandingkan([skema('a', 'A', hasil({ jumlah: 100 })), skema('b', 'B', hasil({ jumlah: 140 })), skema('c', 'C', hasil({ jumlah: 140 }))]);
    assert.deepEqual(baris(b, 'jumlah').nilai, [100, 140, 140]);
    assert.deepEqual(baris(b, 'jumlah').terbaik, [false, true, true]);
    // Semua sama: tidak ada yang unggul.
    assert.deepEqual(baris(b, 'luas_lantai').terbaik, [false, false, false]);
    // Ukuran informasi (lantai) tidak pernah ditandai terbaik.
    assert.deepEqual(baris(bandingkan([skema('a', 'A', hasil({ lantai: 5 })), skema('b', 'B', hasil({ lantai: 9 }))]), 'lantai').terbaik, [false, false]);
});

test('bandingkan: pelanggaran lebih sedikit lebih baik dan baris yang melanggar ditandai', () => {
    const b = bandingkan([skema('a', 'A', hasil({ pelanggaran: ['kdb', 'parkir'] })), skema('b', 'B', hasil({ pelanggaran: [] }))]);
    assert.deepEqual(baris(b, 'pelanggaran').nilai, [2, 0]);
    assert.deepEqual(baris(b, 'pelanggaran').terbaik, [false, true]);
    assert.deepEqual(baris(b, 'kdb').melanggar, [true, false]);
    assert.deepEqual(baris(b, 'parkir').melanggar, [true, false]);
    assert.deepEqual(baris(b, 'klb').melanggar, [false, false]);
});

test('bandingkan: jumlah tidak dibandingkan antar satuan berbeda; parkir null dilewati', () => {
    const b = bandingkan([skema('a', 'A', hasil({ jumlah: 50, satuan: 'rumah', tipe: 'apartemen' })), skema('b', 'B', hasil({ jumlah: 300, satuan: 'kamar', parkir: null }))]);
    assert.deepEqual(baris(b, 'jumlah').terbaik, [false, false]);
    assert.deepEqual(baris(b, 'parkir').nilai, [10, null]);
    assert.deepEqual(baris(b, 'parkir').terbaik, [false, false], 'satu pembanding saja tidak cukup');
    assert.deepEqual(bandingkan([]).every((x) => x.nilai.length === 0), true);
});
