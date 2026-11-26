// Tes logika murni putar desain Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arahKe, pusatTitik, putarArah, putarDesain, putarPoligon, putarTitik, sudutPutar } from '../../resources/js/lib/putar.ts';
import { luasM2 } from '../../resources/js/lib/batasLahan.ts';

const P = { lat: -6.2, lng: 106.8 };
const dekat = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('putarTitik: 90° searah jarum jam memindahkan titik utara ke timur, 360° kembali', () => {
    const utara = { lat: P.lat + 0.001, lng: P.lng };
    const r = putarTitik(utara, P, 90);
    dekat(r.lat, P.lat);
    assert.ok(r.lng > P.lng, 'ke timur');
    dekat(arahKe(P, r), 90, 1e-6);
    const balik = putarTitik(putarTitik(utara, P, 135), P, 225);
    dekat(balik.lat, utara.lat);
    dekat(balik.lng, utara.lng);
});

test('putarPoligon menjaga luas dan bentuk', () => {
    const g = { type: 'Polygon' as const, coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.801, -6.1995], [106.8, -6.1995], [106.8, -6.2]]] };
    const titik = g.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
    const pusat = pusatTitik(titik);
    const r = putarPoligon(g, pusat, 37);
    const luas = (h: typeof g) => luasM2(h.coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng })));
    assert.ok(Math.abs(luas(r) - luas(g)) / luas(g) < 1e-4);
    assert.deepEqual(r.coordinates[0][0], r.coordinates[0].at(-1), 'cincin tetap tertutup');
});

test('sudutPutar: dinormalkan ke (-180, 180] dan Shift membulatkan ke 15°', () => {
    assert.equal(sudutPutar(350, 10), 20);
    assert.equal(sudutPutar(10, 350), -20);
    assert.equal(sudutPutar(0, 180), 180);
    assert.equal(sudutPutar(0, 22, 15), 15);
    assert.equal(sudutPutar(0, 23, 15), 30);
});

test('putarDesain: zona, arah parkir, dan akses ikut berputar; zona bawaan (null) dibiarkan', () => {
    const zona = [{ uid: 'p', jenis: 'parkir' as const, geometri: { type: 'Polygon' as const, coordinates: [[[106.8, -6.2], [106.8002, -6.2], [106.8002, -6.1998], [106.8, -6.2]]] }, arah: 170 }] as never;
    const akses = [{ jenis: 'gerbang' as const, titik: [106.8, -6.199] as [number, number] }];
    const r = putarDesain(zona, akses, P, 30);
    assert.equal((r.zona as never as { arah: number }[])[0].arah, 20, '170 + 30 = 200 → 20 (arah deret 0–179)');
    assert.notDeepEqual(r.akses[0].titik, akses[0].titik);
    dekat(arahKe(P, { lat: r.akses[0].titik[1], lng: r.akses[0].titik[0] }), 30, 0.01); // koordinat dibulatkan 7 desimal
    assert.equal(putarDesain(null, [], P, 45).zona, null);
    assert.equal(putarArah(10, -30), 160);
});
