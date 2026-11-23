// Tes logika murni ekstrusi 3D hasil Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bangunEkstrusi, bangunModelLahan, kotakBatas, poligonDari, skalaPoligon } from '../../resources/js/lib/ekstrusi3d.ts';

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

test('gaya warna: tinggi gedung = lantai x tinggi lantai; unit dan koridor sedikit lebih rendah, inti lebih tinggi', () => {
    const fc = bangunEkstrusi(data([fitur('tapak', kotak(106.8, -6.2)), fitur('unit', kotak(106.8, -6.2), { tipe: 'studio' }), fitur('koridor', kotak(106.8, -6.2)), fitur('inti', kotak(106.8, -6.2))], 5), null, 'warna');
    assert.equal(cari(fc, 'tapak')[0].properties.tinggi, 16); // 5 x 3,2
    assert.equal(cari(fc, 'unit')[0].properties.tinggi, 15.7);
    assert.equal(cari(fc, 'koridor')[0].properties.tinggi, 15.4);
    assert.equal(cari(fc, 'inti')[0].properties.tinggi, 19);
    assert.equal(cari(fc, 'unit')[0].properties.warna, '#2fbf71');
});

test('jenis datar menjadi pelat tipis di bawah massa gedung, alas lahan paling bawah', () => {
    const lahan = { type: 'Polygon' as const, coordinates: kotak(106.8, -6.2, 0.001) };
    const fc = bangunEkstrusi(data([fitur('unit', kotak(106.8, -6.2), { tipe: '1br' }), fitur('taman', kotak(106.8003, -6.2)), fitur('slot', kotak(106.8006, -6.2)), fitur('jalan', kotak(106.8009, -6.2))]), lahan, 'warna');
    const urutan = fc.features.map((f) => f.properties.jenis);
    assert.equal(urutan[0], 'lahan');
    assert.ok(urutan.indexOf('taman') < urutan.indexOf('unit'), 'pelat digambar sebelum massa');
    for (const j of ['taman', 'slot', 'jalan', 'lahan']) assert.ok(cari(fc, j)[0].properties.tinggi < 1, `${j} tipis`);
});

test('semua parkir datar seperti taman, termasuk pola wrap dan parkir bertingkat; slot di tanah', () => {
    const fc = bangunEkstrusi(data([fitur('parkir', kotak(106.8, -6.2), { lantai: 4, zona: 1 }), fitur('parkir', kotak(106.8005, -6.2), { lantai: 1, gedung: true, zona: 2 }), fitur('slot', kotak(106.8, -6.2, 0.00002), { zona: 1 })]), null);
    assert.equal(cari(fc, 'gedung-parkir').length, 0, 'tidak ada balok parkir');
    assert.equal(cari(fc, 'aspal').length, 2);
    for (const f of [...cari(fc, 'aspal'), ...cari(fc, 'slot')]) {
        assert.equal(f.properties.dasar, 0);
        assert.ok(f.properties.tinggi < 1, 'pelat tipis');
    }
});

test('gaya warna: lobi dua lantai kuning dan gedung berlanjut di atasnya sampai atap (tanpa celah di atas pintu)', () => {
    const fc = bangunEkstrusi(data([fitur('lobi', kotak(106.8, -6.2))], 5), null, 'warna');
    const lobi = cari(fc, 'lobi')[0].properties;
    assert.equal(lobi.tinggi, 6.1); // 2 x 3,2 - 0,3
    assert.equal(lobi.warna, '#f2b544');
    const atas = cari(fc, 'atas-lobi')[0].properties;
    assert.equal(atas.dasar, 6.4);
    assert.equal(atas.tinggi, 15.7, 'setinggi unit di sebelahnya');
    assert.equal(atas.warna, '#4a90e2', 'warna gedung, bukan koridor');
    // Gedung hanya dua lantai: tidak ada lanjutan.
    assert.equal(cari(bangunEkstrusi(data([fitur('lobi', kotak(106.8, -6.2))], 2), null, 'warna'), 'atas-lobi').length, 0);
});

test('rumah tapak: rumah (dinding + atap limas genteng) dikecilkan sqrt(KDB) di atas pekarangan datar, di kedua gaya', () => {
    const fc = bangunEkstrusi(data([fitur('kavling', kotak(106.8, -6.2), { varian: 1 })], 2, 64), null);
    const dinding = cari(fc, 'dinding')[0];
    assert.equal(dinding.properties.tinggi, 6.4);
    assert.equal(dinding.properties.warna, '#ece4d8');
    assert.equal(cari(fc, 'pekarangan').length, 1);
    assert.equal(cari(fc, 'atap').length, 8, 'atap limas bertingkat');
    assert.equal(cari(fc, 'atap')[0].properties.warna, '#a9472f', 'genteng sesuai varian');
    assert.equal(cari(fc, 'atap')[0].properties.dasar, 6.4);
    assert.deepEqual(bangunEkstrusi(data([fitur('kavling', kotak(106.8, -6.2), { varian: 1 })], 2, 64), null, 'warna'), fc);
    // KDB 64% -> sisi 0,8 dari petak.
    const x = dinding.geometry.coordinates[0].map((p) => p[0]);
    const lebar = Math.max(...x) - Math.min(...x);
    assert.ok(Math.abs(lebar - 0.0002 * 0.8) < 1e-9, `lebar ${lebar}`);
});

test('MultiPolygon dipecah dan geometri tak dikenal diabaikan; lantai 0 dianggap 1', () => {
    const multi = { type: 'Feature' as const, properties: { jenis: 'tapak' }, geometry: { type: 'MultiPolygon' as const, coordinates: [kotak(106.8, -6.2), kotak(106.801, -6.2)] } } as never;
    const garis = { type: 'Feature' as const, properties: { jenis: 'tapak' }, geometry: { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] } } as never;
    const fc = bangunEkstrusi(data([multi, garis], 0), null, 'warna');
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

test('gaya realistis apartemen: tiap lantai ambang dinding + pita kaca bersambung tanpa celah, dak beton di atap', () => {
    const fc = bangunEkstrusi({ ...data([fitur('unit', kotak(106.8, -6.2), { tipe: 'studio' }), fitur('inti', kotak(106.8003, -6.2))], 3), tipe: 'apartemen' }, null);
    const lapis = [...cari(fc, 'dinding'), ...cari(fc, 'kaca')].map((f) => f.properties).sort((a, b) => a.dasar - b.dasar);
    assert.equal(lapis.length, 6, '3 lantai x (dinding + kaca)');
    assert.equal(lapis[0].dasar, 0);
    for (let i = 1; i < lapis.length; i++) assert.equal(lapis[i].dasar, lapis[i - 1].tinggi, 'tanpa celah antarlapis');
    assert.equal(lapis.at(-1)!.tinggi, 9.6);
    assert.equal(cari(fc, 'dak')[0].properties.dasar, 9.6);
    assert.equal(cari(fc, 'unit').length, 0, 'tidak ada warna tipe unit');
    assert.equal(cari(fc, 'inti')[0].properties.tinggi, 12.6);
    assert.equal(cari(fc, 'tandon').length, 0, 'tandon hanya untuk kos');
});

test('gaya realistis kos: dak + tandon air di atap (sekitar satu per delapan kamar); lobi kaca, gedung berlanjut di atasnya', () => {
    const kamar = Array.from({ length: 10 }, (_, i) => fitur('unit', kotak(106.8 + i * 0.00005, -6.2, 0.00004), { tipe: 'kamar' }));
    const fc = bangunEkstrusi({ ...data([...kamar, fitur('lobi', kotak(106.801, -6.2))], 3), tipe: 'kos' }, null);
    const tandon = cari(fc, 'tandon');
    assert.equal(tandon.length, 2);
    assert.ok(tandon[0].properties.dasar > 9.6, 'tandon di atas dak');
    assert.equal(cari(fc, 'lobi')[0].properties.tinggi, 6.4);
    assert.ok(cari(fc, 'kaca').some((f) => f.properties.dasar >= 6.4), 'lantai 3 di atas lobi');
});

test('bangunModelLahan memisahkan atap limas (untuk three.js) dari balok; rumah sempit tipe rumah juga beratap', () => {
    const m = bangunModelLahan({ ...data([fitur('tapak', kotak(106.8, -6.2))], 2), tipe: 'rumah' }, null);
    assert.equal(m.limas.length, 1);
    assert.equal(m.limas[0].dasar, 6.4);
    assert.ok(m.prisma.every((f) => f.properties.jenis !== 'atap'));
});

test('inti lift dan tangga: beton menyembul di atas dak (lift 3,5 m, tangga 3 m); ruang servis ikut bentuk gedung', () => {
    const isi = [fitur('inti', kotak(106.8, -6.2), { fungsi: 'lift', slot: 2 }), fitur('inti', kotak(106.8003, -6.2), { fungsi: 'tangga', slot: 1 }), fitur('inti', kotak(106.8006, -6.2), { fungsi: 'servis' })];
    const real = bangunEkstrusi({ ...data(isi, 4), tipe: 'apartemen' }, null);
    const inti = cari(real, 'inti').map((f) => f.properties);
    // 4 lantai x 3,2 m = 12,8; dak 0,6.
    assert.deepEqual(inti.map((p) => p.tinggi), [16.9, 16.4]);
    assert.ok(inti.every((p) => p.dasar === 0), 'beton dari tanah');
    assert.notEqual(inti[0].warna, inti[1].warna, 'lift dan tangga dibedakan');
    assert.ok(cari(real, 'kaca').length > 0, 'ruang servis berlapis seperti gedung');

    const warna = cari(bangunEkstrusi({ ...data(isi, 4), tipe: 'apartemen' }, null, 'warna'), 'inti').map((f) => f.properties);
    assert.deepEqual(warna.map((p) => [p.tinggi, p.warna]), [[16.3, '#5b6474'], [15.8, '#a3a9b5'], [12.5, '#c9ced6']]);
});
