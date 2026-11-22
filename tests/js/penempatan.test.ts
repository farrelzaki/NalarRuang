// Tes logika murni penempatan pintar zona Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kebutuhanLuas, luasPoligonMeter, persegiTerbesar, tempatkanZona, ukurKeTarget } from '../../resources/js/lib/penempatan.ts';
import { luasM2 } from '../../resources/js/lib/batasLahan.ts';

const LAT = -6.25;
const LNG = 106.8;
const DLAT = 1 / 110_574; // 1 m dalam derajat lintang
const DLNG = 1 / (111_320 * Math.cos((LAT * Math.PI) / 180)); // 1 m dalam derajat bujur

/** Kotak (x0,y0)-(x1,y1) dalam meter dari titik acuan. */
const kotak = (x0: number, y0: number, x1: number, y1: number) => ({
    type: 'Polygon' as const,
    coordinates: [[[LNG + x0 * DLNG, LAT + y0 * DLAT], [LNG + x1 * DLNG, LAT + y0 * DLAT], [LNG + x1 * DLNG, LAT + y1 * DLAT], [LNG + x0 * DLNG, LAT + y1 * DLAT], [LNG + x0 * DLNG, LAT + y0 * DLAT]]],
}) as import('geojson').Polygon;

const luas = (g: import('geojson').Polygon) => luasM2(g.coordinates[0].map(([lng, lat]) => ({ lat, lng })));

/** Apakah dua kotak (poligon) bertumpuk lebih dari `toleransi` m2? Pendekatan kisi cukup untuk tes. */
const tumpukM2 = (a: import('geojson').Polygon, b: import('geojson').Polygon) => {
    const ra = a.coordinates[0].slice(0, 4);
    const rb = b.coordinates[0].slice(0, 4);
    const [ax0, ax1] = [Math.min(...ra.map((p) => p[0])), Math.max(...ra.map((p) => p[0]))];
    const [ay0, ay1] = [Math.min(...ra.map((p) => p[1])), Math.max(...ra.map((p) => p[1]))];
    const [bx0, bx1] = [Math.min(...rb.map((p) => p[0])), Math.max(...rb.map((p) => p[0]))];
    const [by0, by1] = [Math.min(...rb.map((p) => p[1])), Math.max(...rb.map((p) => p[1]))];
    const w = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0)) / DLNG;
    const h = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0)) / DLAT;
    return w * h;
};

test('persegiTerbesar: mencari persegi panjang kosong terbesar', () => {
    const m = [
        [true, true, false, true],
        [true, true, true, true],
        [true, true, true, true],
        [false, true, true, true],
    ];
    const t = persegiTerbesar(m);
    assert.ok(t);
    assert.equal(t.sel, 9); // baris 1-3, kolom 1-3
    assert.deepEqual([t.r0, t.r1, t.c0, t.c1], [1, 3, 1, 3]);
    assert.equal(persegiTerbesar([[false, false]]), null);
    assert.equal(persegiTerbesar([]), null);
});

test('ukurKeTarget: dikecilkan ke target dengan rasio paling jauh 3:1, tidak melebihi ruang', () => {
    const k = ukurKeTarget(100, 100, 2500);
    assert.ok(Math.abs(k.lebar * k.tinggi - 2500) < 1e-6);
    const sempit = ukurKeTarget(300, 20, 3000);
    assert.ok(Math.abs(sempit.lebar * sempit.tinggi - 3000) < 1e-6);
    assert.ok(sempit.tinggi <= 20 + 1e-9 && sempit.lebar <= 300 + 1e-9);
    assert.deepEqual(ukurKeTarget(10, 10, 5000), { lebar: 10, tinggi: 10 }, 'target lebih besar dari ruang: seluruh ruang');
});

test('tempatkanZona: lahan kosong, zona ditaruh di dalam lahan seluas target', () => {
    const lahan = kotak(0, 0, 100, 100); // 10.000 m2
    const h = tempatkanZona(lahan, [], 1500);
    assert.ok(h);
    assert.equal(h.bebas, true);
    assert.ok(Math.abs(luas(h.geometri) - 1500) < 60, `luas ${luas(h.geometri)}`);
    assert.ok(tumpukM2(h.geometri, lahan) > luas(h.geometri) * 0.99, 'seluruhnya di dalam lahan');
});

test('tempatkanZona: menghindari zona yang sudah ada dan memakai ruang kosong terbesar', () => {
    const lahan = kotak(0, 0, 100, 100);
    // Zona menutup separuh kiri; ruang kosong terbesar adalah separuh kanan (50 x 100).
    const kiri = kotak(0, 0, 50, 100);
    const h = tempatkanZona(lahan, [{ geometri: kiri }], 2000);
    assert.ok(h);
    assert.equal(h.bebas, true);
    assert.ok(tumpukM2(h.geometri, kiri) < 30, `tidak boleh menimpa zona (tumpuk ${tumpukM2(h.geometri, kiri)})`);
    assert.ok(Math.abs(luas(h.geometri) - 2000) < 100);
});

test('tempatkanZona: zona terkunci tidak pernah ditabrak, yang tidak terkunci boleh bila tidak ada ruang', () => {
    const lahan = kotak(0, 0, 100, 100);
    const penuh = kotak(-1, -1, 101, 101);
    // Seluruh lahan tertutup zona terkunci: tidak ada tempat.
    assert.equal(tempatkanZona(lahan, [{ geometri: penuh, kunci: true }], 1000), null);
    // Seluruh lahan tertutup zona tidak terkunci: boleh menimpa, ditandai tidak bebas.
    const menimpa = tempatkanZona(lahan, [{ geometri: penuh }], 1000);
    assert.ok(menimpa);
    assert.equal(menimpa.bebas, false);
    // Separuh kiri terkunci, separuh kanan tidak terkunci tetapi penuh: zona baru menimpa yang kanan saja.
    const kunciKiri = kotak(0, 0, 50, 100);
    const lepasKanan = kotak(50, 0, 100, 100);
    const h = tempatkanZona(lahan, [{ geometri: kunciKiri, kunci: true }, { geometri: lepasKanan }], 1500);
    assert.ok(h);
    assert.equal(h.bebas, false);
    assert.ok(tumpukM2(h.geometri, kunciKiri) < 30, 'tidak menabrak zona terkunci');
});

test('tempatkanZona: tidak menaruh zona di dalam lubang zona dan menghormati lahan tidak persegi', () => {
    // Lahan berbentuk L: kotak 100x100 tanpa sudut kanan-atas 60x60.
    const L = { type: 'Polygon' as const, coordinates: [[[0, 0], [100, 0], [100, 40], [40, 40], [40, 100], [0, 100], [0, 0]].map(([x, y]) => [LNG + x * DLNG, LAT + y * DLAT])] } as import('geojson').Polygon;
    const h = tempatkanZona(L, [], 5000);
    assert.ok(h);
    const sudutDalam = (x: number, y: number) => (x >= 0 && x <= 100 && y >= 0 && y <= 40) || (x >= 0 && x <= 40 && y >= 0 && y <= 100);
    for (const [lng, lat] of h.geometri.coordinates[0]) {
        const x = (lng - LNG) / DLNG;
        const y = (lat - LAT) / DLAT;
        assert.ok(sudutDalam(x, y) || sudutDalam(x + 0.05, y + 0.05) || sudutDalam(x - 0.05, y - 0.05), `titik (${x.toFixed(2)}, ${y.toFixed(2)}) di luar lahan`);
    }
});

test('luasPoligonMeter menghitung lubang', () => {
    const luar: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const lubang: [number, number][] = [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]];
    assert.equal(luasPoligonMeter([luar]), 100);
    assert.equal(luasPoligonMeter([luar, lubang]), 96);
});

test('kebutuhanLuas: taman menurut kekurangan KDH, parkir menurut kekurangan slot, gedung 15%', () => {
    const L = 10_000;
    assert.equal(kebutuhanLuas('taman', { luasLahanM2: L, kdhTerpakai: 10, kdhBatas: 20 }), 1000);
    assert.equal(kebutuhanLuas('taman', { luasLahanM2: L, kdhTerpakai: 30, kdhBatas: 20 }), 800, 'KDH sudah cukup: 8%');
    assert.equal(kebutuhanLuas('taman', { luasLahanM2: L }), 800);
    // 100 slot mobil kurang: 100 x 25 x 1,6 = 4000 m2 (40%) dijepit ke batas atas 40%.
    assert.equal(kebutuhanLuas('parkir', { luasLahanM2: L, slotKurang: 100, jenisParkir: 'mobil' }), 4000);
    // 50 slot motor kurang: 50 x 2,8 x 1,6 = 224 m2 (2,24%) dijepit ke batas bawah 3%.
    assert.equal(kebutuhanLuas('parkir', { luasLahanM2: L, slotKurang: 50, jenisParkir: 'motor' }), 300);
    assert.equal(kebutuhanLuas('parkir', { luasLahanM2: L }), 800);
    assert.equal(kebutuhanLuas('bangunan', { luasLahanM2: L }), 1500);
});

test('tempatkanZona: tanpa ruang kosong, zona baru mengukir satu zona terbesar dan tidak menimpa zona lain', () => {
    const lahan = kotak(0, 0, 100, 100);
    const besar = kotak(0, 0, 80, 100);
    const kecil = kotak(80, 0, 100, 100);
    const h = tempatkanZona(lahan, [{ geometri: besar }, { geometri: kecil }], 1500);
    assert.ok(h);
    assert.equal(h.bebas, false);
    assert.ok(tumpukM2(h.geometri, kecil) < 30, `tidak boleh menimpa zona kecil (tumpuk ${tumpukM2(h.geometri, kecil)})`);
    assert.ok(tumpukM2(h.geometri, besar) > luas(h.geometri) * 0.97, 'seluruhnya di dalam zona besar');
});

test('tempatkanZona: zona terkunci tidak diukir walau paling besar', () => {
    const lahan = kotak(0, 0, 100, 100);
    const besarTerkunci = kotak(0, 0, 80, 100);
    const kecilBebas = kotak(80, 0, 100, 100); // 2.000 m2, cukup untuk 500 m2
    const h = tempatkanZona(lahan, [{ geometri: besarTerkunci, kunci: true }, { geometri: kecilBebas }], 500);
    assert.ok(h);
    assert.ok(tumpukM2(h.geometri, besarTerkunci) < 30, 'tidak menabrak zona terkunci');
    assert.ok(tumpukM2(h.geometri, kecilBebas) > luas(h.geometri) * 0.9);
});
