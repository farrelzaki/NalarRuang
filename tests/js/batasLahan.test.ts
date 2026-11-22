// Tes logika murni batas ukuran lahan Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batasiKotak, batasiTitik, bolehTambahTitik, luasM2, skalaKotakAwal, titikTerdekatRuas, LUAS_MAKS_KLIEN, PORSI_KOTAK_AWAL } from '../../resources/js/lib/batasLahan.ts';

const LAT = -6.25;
const LNG = 106.8;
// Kira-kira 111 km per derajat lintang; 1 derajat bujur = 111,3 km * cos(lat).
const kotak = (setengahLat: number, setengahLng: number) => [
    { lat: LAT + setengahLat, lng: LNG - setengahLng },
    { lat: LAT + setengahLat, lng: LNG + setengahLng },
    { lat: LAT - setengahLat, lng: LNG + setengahLng },
    { lat: LAT - setengahLat, lng: LNG - setengahLng },
];

test('luasM2: kotak 100 m x 100 m kira-kira 10.000 m2', () => {
    const s = 0.0005 / 1.1057; // setengah sisi 50 m dalam derajat lintang
    const sLng = 0.0005 / (1.1132 * Math.cos((LAT * Math.PI) / 180));
    const luas = luasM2(kotak(s, sLng));
    assert.ok(Math.abs(luas - 10_000) < 100, `luas ${luas}`);
    assert.equal(luasM2([]), 0);
    assert.equal(luasM2(kotak(s, sLng).slice(0, 2)), 0);
});

test('batasiKotak: di bawah batas dibiarkan', () => {
    const tetap = { lat: LAT, lng: LNG };
    const tarik = { lat: LAT + 0.001, lng: LNG + 0.001 };
    const h = batasiKotak(tetap, tarik);
    assert.equal(h.terbatas, false);
    assert.deepEqual(h.titik, tarik);
});

test('batasiKotak: di atas batas berhenti tepat di batas dan rasio kotak tetap', () => {
    const tetap = { lat: LAT, lng: LNG };
    const tarik = { lat: LAT + 0.02, lng: LNG + 0.04 }; // jauh melewati 20 ha
    const h = batasiKotak(tetap, tarik);
    assert.equal(h.terbatas, true);
    const luas = luasM2([tetap, { lat: tetap.lat, lng: h.titik.lng }, h.titik, { lat: h.titik.lat, lng: tetap.lng }]);
    assert.ok(Math.abs(luas - LUAS_MAKS_KLIEN) < 5, `luas ${luas}`);
    // Rasio selisih lintang:bujur sama dengan tarikan awal (1:2).
    assert.ok(Math.abs((h.titik.lng - tetap.lng) / (h.titik.lat - tetap.lat) - 2) < 1e-9);
});

test('batasiTitik: gerakan kecil lolos, gerakan jauh berhenti di batas', () => {
    const s = 0.003; // kotak sekitar 660 m x 665 m = 44 ha? lalu dikecilkan di bawah
    const poligon = kotak(0.0015, 0.0015); // sekitar 330 m x 330 m, 10,9 ha
    assert.ok(luasM2(poligon) < LUAS_MAKS_KLIEN);
    const aman = batasiTitik(poligon, 1, { lat: poligon[1].lat + 0.0002, lng: poligon[1].lng + 0.0002 });
    assert.equal(aman.terbatas, false);
    const jauh = batasiTitik(poligon, 1, { lat: poligon[1].lat + s * 10, lng: poligon[1].lng + s * 10 });
    assert.equal(jauh.terbatas, true);
    const baru = poligon.map((t, k) => (k === 1 ? jauh.titik : t));
    const luas = luasM2(baru);
    assert.ok(luas <= LUAS_MAKS_KLIEN + 1, `luas ${luas}`);
    assert.ok(luas > LUAS_MAKS_KLIEN * 0.98, `harus mendekati batas, luas ${luas}`);
});

test('batasiTitik: poligon yang sudah melebihi batas hanya boleh mengecil', () => {
    const besar = kotak(0.01, 0.01); // jauh di atas 20 ha
    const lebihBesar = batasiTitik(besar, 1, { lat: besar[1].lat + 0.005, lng: besar[1].lng + 0.005 });
    assert.equal(lebihBesar.terbatas, true);
    assert.deepEqual(lebihBesar.titik, besar[1]);
    const lebihKecil = batasiTitik(besar, 1, { lat: besar[1].lat - 0.005, lng: besar[1].lng - 0.005 });
    assert.equal(lebihKecil.terbatas, false);
});

test('bolehTambahTitik', () => {
    const tiga = kotak(0.0015, 0.0015).slice(0, 3);
    assert.equal(bolehTambahTitik(tiga, { lat: LAT - 0.0015, lng: LNG - 0.0015 }), true);
    assert.equal(bolehTambahTitik(tiga, { lat: LAT - 0.05, lng: LNG - 0.05 }), false);
    assert.equal(bolehTambahTitik([], { lat: LAT, lng: LNG }), true);
});

test('skalaKotakAwal: kecil dibiarkan, besar dikecilkan ke porsi batas', () => {
    assert.equal(skalaKotakAwal(0.001, 0.001, LAT), 1);
    const setengah = 0.05; // kotak 11 km x 11 km
    const s = skalaKotakAwal(setengah, setengah, LAT);
    assert.ok(s < 1);
    const luas = luasM2(kotak(setengah * s, setengah * s));
    assert.ok(Math.abs(luas - LUAS_MAKS_KLIEN * PORSI_KOTAK_AWAL) < 200, `luas ${luas}`);
});

test('titikTerdekatRuas: proyeksi pada ruas dan ujung ruas', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 10, y: 0 };
    const tengah = titikTerdekatRuas({ x: 4, y: 3 }, a, b);
    assert.deepEqual([tengah.x, tengah.y, tengah.jarak], [4, 0, 3]);
    const ujung = titikTerdekatRuas({ x: 15, y: 0 }, a, b);
    assert.deepEqual([ujung.x, ujung.jarak], [10, 5]);
    assert.equal(titikTerdekatRuas({ x: 1, y: 1 }, a, a).jarak, Math.hypot(1, 1));
});
