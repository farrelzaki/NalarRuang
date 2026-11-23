// Tes logika murni ekstrusi 3D hasil Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bangunEkstrusi, kotakBatas, poligonDari, skalaPoligon } from '../../resources/js/lib/ekstrusi3d.ts';

const kotak = (x: number, y: number, s = 0.0002) => [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]];
const fitur = (jenis: string, koordinat: number[][][], tambahan: Record<string, unknown> = {}) => ({
    type: 'Feature' as const,
    properties: { jenis, ...tambahan },
    geometry: { type: 'Polygon' as const, coordinates: koordinat },
});
const data = (features: ReturnType<typeof fitur>[], lantai = 5, kdb = 40) => ({
    kapasitas: { lantai },
    ringkasan: { tinggi_lantai_m: 3.2 },
    intensitas: { kdb },
    geometri_kapasitas: { features },
});
const cari = (fc: ReturnType<typeof bangunEkstrusi>, jenis: string) => fc.features.filter((f) => f.properties.jenis === jenis);

test('tinggi gedung = lantai x tinggi lantai; unit dan koridor sedikit lebih rendah, inti lebih tinggi', () => {
    const fc = bangunEkstrusi(data([fitur('tapak', kotak(106.8, -6.2)), fitur('unit', kotak(106.8, -6.2), { tipe: 'studio' }), fitur('koridor', kotak(106.8, -6.2)), fitur('inti', kotak(106.8, -6.2))], 5), null);
    assert.equal(cari(fc, 'tapak')[0].properties.tinggi, 16); // 5 x 3,2
    assert.equal(cari(fc, 'unit')[0].properties.tinggi, 15.7);
    assert.equal(cari(fc, 'koridor')[0].properties.tinggi, 15.4);
    assert.equal(cari(fc, 'inti')[0].properties.tinggi, 19);
    assert.equal(cari(fc, 'unit')[0].properties.warna, '#2fbf71');
});

test('jenis datar menjadi pelat tipis di bawah massa gedung, alas lahan paling bawah', () => {
    const lahan = { type: 'Polygon' as const, coordinates: kotak(106.8, -6.2, 0.001) };
    const fc = bangunEkstrusi(data([fitur('unit', kotak(106.8, -6.2), { tipe: '1br' }), fitur('taman', kotak(106.8003, -6.2)), fitur('slot', kotak(106.8006, -6.2)), fitur('jalan', kotak(106.8009, -6.2))]), lahan);
    const urutan = fc.features.map((f) => f.properties.jenis);
    assert.equal(urutan[0], 'lahan');
    assert.ok(urutan.indexOf('taman') < urutan.indexOf('unit'), 'pelat digambar sebelum massa');
    for (const j of ['taman', 'slot', 'jalan', 'lahan']) assert.ok(cari(fc, j)[0].properties.tinggi < 1, `${j} tipis`);
});

test('parkir bertingkat menjadi balok, parkir permukaan menjadi aspal', () => {
    const fc = bangunEkstrusi(data([fitur('parkir', kotak(106.8, -6.2), { lantai: 4 }), fitur('parkir', kotak(106.8005, -6.2), { lantai: 1 })]), null);
    assert.equal(cari(fc, 'gedung-parkir')[0].properties.tinggi, 12);
    assert.equal(cari(fc, 'aspal').length, 1);
});

test('gedung parkir pola wrap satu lantai tetap berupa balok, slotnya di atap', () => {
    const fc = bangunEkstrusi(data([fitur('parkir', kotak(106.8, -6.2), { lantai: 1, gedung: true, zona: 2 }), fitur('slot', kotak(106.8, -6.2, 0.00002), { zona: 2 }), fitur('slot', kotak(106.801, -6.2, 0.00002), { zona: 5 })]), null);
    const gedung = cari(fc, 'gedung-parkir');
    assert.equal(gedung.length, 1);
    assert.equal(gedung[0].properties.tinggi, 3);
    assert.equal(cari(fc, 'aspal').length, 0);
    // Urutan gambar: pelat (slot permukaan) dulu, lalu massa (slot di atap gedung parkir).
    assert.deepEqual(cari(fc, 'slot').map((f) => f.properties.dasar).sort(), [0, 3], 'satu slot di tanah, satu di atap');
});

test('lobi dua lantai kuning dan massa di atasnya berlanjut sebagai koridor dengan dasar 2 lantai', () => {
    const fc = bangunEkstrusi(data([fitur('lobi', kotak(106.8, -6.2))], 5), null);
    const lobi = cari(fc, 'lobi')[0].properties;
    assert.equal(lobi.tinggi, 6.1); // 2 x 3,2 - 0,3
    assert.equal(lobi.warna, '#f2b544');
    const atas = cari(fc, 'koridor')[0].properties;
    assert.equal(atas.dasar, 6.4);
    assert.equal(atas.tinggi, 15.7);
    // Gedung hanya dua lantai: tidak ada lanjutan.
    assert.equal(cari(bangunEkstrusi(data([fitur('lobi', kotak(106.8, -6.2))], 2), null), 'koridor').length, 0);
});

test('rumah tapak: atap kavling dikecilkan sqrt(KDB) di atas pekarangan datar', () => {
    const fc = bangunEkstrusi(data([fitur('kavling', kotak(106.8, -6.2), { varian: 1 })], 2, 64), null);
    const atap = cari(fc, 'kavling')[0];
    assert.equal(atap.properties.tinggi, 6.4);
    assert.equal(atap.properties.warna, '#e8833a');
    assert.equal(cari(fc, 'pekarangan').length, 1);
    // KDB 64% -> sisi 0,8 dari petak.
    const x = atap.geometry.coordinates[0].map((p) => p[0]);
    const lebar = Math.max(...x) - Math.min(...x);
    assert.ok(Math.abs(lebar - 0.0002 * 0.8) < 1e-9, `lebar ${lebar}`);
});

test('MultiPolygon dipecah dan geometri tak dikenal diabaikan; lantai 0 dianggap 1', () => {
    const multi = { type: 'Feature' as const, properties: { jenis: 'tapak' }, geometry: { type: 'MultiPolygon' as const, coordinates: [kotak(106.8, -6.2), kotak(106.801, -6.2)] } } as never;
    const garis = { type: 'Feature' as const, properties: { jenis: 'tapak' }, geometry: { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] } } as never;
    const fc = bangunEkstrusi(data([multi, garis], 0), null);
    assert.equal(cari(fc, 'tapak').length, 2);
    assert.equal(cari(fc, 'tapak')[0].properties.tinggi, 3.2);
    assert.deepEqual(poligonDari(null), []);
});

test('tanpa hasil: koleksi kosong; kotakBatas', () => {
    assert.deepEqual(bangunEkstrusi({ kapasitas: { lantai: 3 } }, null).features, []);
    assert.deepEqual(kotakBatas({ type: 'Polygon', coordinates: kotak(106.8, -6.2, 0.001) }), [106.8, -6.2, 106.801, -6.199]);
    assert.equal(kotakBatas(null), null);
    assert.equal(skalaPoligon([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]], 0.5)[0][0][0], 0.5);
});
