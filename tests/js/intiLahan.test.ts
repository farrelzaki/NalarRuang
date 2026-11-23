// Tes logika murni posisi lift/tangga yang digeser sendiri (Uji Lahan). Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geserInti, PIN_MAKS, pusatFitur } from '../../resources/js/lib/intiLahan.ts';
import { bacaBerkas, bungkusProyek } from '../../resources/js/lib/berkasLahan.ts';
import { putarDesain } from '../../resources/js/lib/putar.ts';

const kotak = (x: number, y: number, s = 0.00004) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
const inti = (id: number, fungsi: string, x: number) => ({ geometry: kotak(x, -6.2), properties: { jenis: 'inti', fungsi, id, slot: 1 } });
const fitur = [
    { geometry: kotak(106.8, -6.2), properties: { jenis: 'unit', tipe: 'studio' } },
    inti(1, 'tangga', 106.801),
    inti(0, 'lift', 106.8005),
    { geometry: kotak(106.8008, -6.2), properties: { jenis: 'inti', fungsi: 'servis' } },
    inti(2, 'tangga', 106.802),
];

test('pusatFitur: rata-rata titik sudut cincin luar, dibulatkan 7 desimal', () => {
    assert.deepEqual(pusatFitur(kotak(106.8, -6.2)), [106.80002, -6.19998]);
    assert.equal(pusatFitur(null), null);
});

test('geseran pertama membekukan semua lift/tangga (urut id), hanya yang digeser berpindah; ruang servis tidak ikut', () => {
    const pin = geserInti(null, fitur, 1, [106.805, -6.201]);
    assert.ok(pin);
    assert.deepEqual(pin.map((p) => p.fungsi), ['lift', 'tangga', 'tangga']);
    assert.deepEqual(pin[0].titik, pusatFitur(kotak(106.8005, -6.2)));
    assert.deepEqual(pin[1].titik, [106.805, -6.201]);
    assert.deepEqual(pin[2].titik, pusatFitur(kotak(106.802, -6.2)));
    assert.equal(geserInti(null, fitur, 9, [106.8, -6.2]), null, 'id tak dikenal');
});

test('sudah manual: id = urutan pin, pin lain tidak berubah', () => {
    const pin = geserInti(null, fitur, 0, [106.8, -6.2])!;
    const lagi = geserInti(pin, [], 2, [106.81, -6.21])!;
    assert.deepEqual(lagi[0], pin[0]);
    assert.deepEqual(lagi[1], pin[1]);
    assert.deepEqual(lagi[2].titik, [106.81, -6.21]);
    assert.equal(geserInti(pin, [], 7, [106.8, -6.2]), pin, 'id di luar daftar: tetap');
});

test('posisi manual ikut berkas proyek; data rusak dibuang; rumah tapak tidak membawa inti', () => {
    const geom = { type: 'Polygon' as const, coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.801, -6.199], [106.8, -6.199], [106.8, -6.2]]] };
    const pin = geserInti(null, fitur, 0, [106.8003, -6.2001])!;
    const snap = { geom, tipe: 'apartemen' as const, asumsi: {}, pola: null, zona: null, akses: [], isiSisa: true, targetJumlah: null, kunciUkuran: false, laranganBanjir: null, inti: pin };
    const r = bacaBerkas(JSON.stringify(bungkusProyek(snap, null)));
    assert.ok(r.ok);
    assert.deepEqual(r.ok && r.desain.inti, pin);

    const rusak = bacaBerkas(JSON.stringify({ ...bungkusProyek(snap, null), inti: [...pin, { fungsi: 'eskalator', titik: [106.8, -6.2] }, { fungsi: 'tangga', titik: [100, 0] }] }));
    assert.ok(rusak.ok);
    assert.deepEqual(rusak.ok && rusak.desain.inti, pin);
    assert.equal(rusak.ok && rusak.peringatan.filter((p) => p.includes('lift/tangga')).length, 2);

    const banyak = bacaBerkas(JSON.stringify({ ...bungkusProyek(snap, null), inti: Array.from({ length: PIN_MAKS + 5 }, () => pin[0]) }));
    assert.equal(banyak.ok && banyak.desain.inti?.length, PIN_MAKS);

    const rumah = bacaBerkas(JSON.stringify(bungkusProyek({ ...snap, tipe: 'rumah' }, null)));
    assert.equal(rumah.ok && rumah.desain.inti, null);
    const lama = bacaBerkas(JSON.stringify({ ...bungkusProyek(snap, null), inti: undefined }));
    assert.equal(lama.ok && lama.desain.inti, null, 'berkas lama tanpa inti = otomatis');
});

test('putar seluruh desain ikut memutar posisi lift/tangga; otomatis (null) dibiarkan; tanpa argumen tidak ada bidang inti', () => {
    const P = { lat: -6.2, lng: 106.8 };
    const pin = [{ fungsi: 'tangga' as const, titik: [106.8, -6.199] as [number, number] }];
    const r = putarDesain(null, [], P, 90, pin);
    assert.ok(r.inti);
    assert.ok(Math.abs(r.inti[0].titik[1] - -6.2) < 1e-6, 'utara diputar 90° jadi timur: lintang sama dengan pusat');
    assert.ok(r.inti[0].titik[0] > 106.8);
    assert.equal(putarDesain(null, [], P, 90, null).inti, null);
    assert.equal('inti' in putarDesain(null, [], P, 90), false);
});
