// Tes logika murni daftar layer zona Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    aturInduk, bisaJadiInduk, dariServer, duplikatZona, hapusZona, keZonaApi, pindahUrutan, prioritasZona, rapikan, resetTarik, serupa, setKunci, setKunciBanyak, setSembunyi, ubahNama, urutanTampil,
} from '../../resources/js/lib/layerLahan.ts';

const kotak = (x: number, y: number, s = 0.001) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
const z = (uid: string, jenis: 'bangunan' | 'parkir' | 'taman', tambahan = {}) => ({ uid, jenis, geometri: kotak(106.8, -6.2), ...tambahan });
const uids = (daftar: { uid: string }[]) => daftar.map((x) => x.uid);

test('keZonaApi: induk berupa nomor urut, induk hilang dibuang, tanpa data klien', () => {
    const daftar = [z('a', 'bangunan', { nama: 'Menara', kunci: true }), z('b', 'taman', { induk: 'a' }), z('c', 'parkir', { induk: 'tidak-ada' })];
    const api = keZonaApi(daftar);
    assert.deepEqual(api.map((x) => x.induk), [undefined, 0, undefined]);
    assert.deepEqual(Object.keys(api[0]).sort(), ['geometri', 'jenis', 'prioritas']);
});

test('keZonaApi mengikuti urutan setelah dipindah', () => {
    const daftar = [z('a', 'bangunan'), z('b', 'taman', { induk: 'a' })];
    const baru = pindahUrutan(daftar, 'a', 1);
    assert.equal(baru.length, 2);
    // a dan b tidak sesaudara (b anak a), jadi a tidak bisa melewati b.
    assert.deepEqual(uids(baru), ['a', 'b']);
    const dua = [z('a', 'bangunan'), z('c', 'parkir'), z('b', 'taman', { induk: 'a' })];
    const geser = pindahUrutan(dua, 'a', 1);
    assert.deepEqual(uids(geser), ['c', 'a', 'b']);
    assert.equal(keZonaApi(geser)[2].induk, 1, 'nomor induk menyesuaikan urutan baru');
});

test('urutanTampil: induk diikuti anaknya dengan kedalaman', () => {
    const daftar = [z('a', 'bangunan'), z('c', 'parkir'), z('b', 'taman', { induk: 'a' }), z('d', 'taman', { induk: 'b' })];
    const t = urutanTampil(daftar);
    assert.deepEqual(t.map((x) => [x.zona.uid, x.kedalaman]), [['a', 0], ['b', 1], ['d', 2], ['c', 0]]);
});

test('urutanTampil tidak hilang atau berulang walau data berputar', () => {
    const berputar = [z('a', 'bangunan', { induk: 'b' }), z('b', 'taman', { induk: 'a' })];
    assert.deepEqual(uids(urutanTampil(berputar).map((x) => x.zona)).sort(), ['a', 'b']);
});

test('aturInduk menolak diri sendiri dan keturunan; bisaJadiInduk', () => {
    const daftar = [z('a', 'bangunan'), z('b', 'taman', { induk: 'a' })];
    assert.equal(bisaJadiInduk(daftar, 'a', 'a'), false);
    assert.equal(bisaJadiInduk(daftar, 'a', 'b'), false, 'keturunan tidak boleh jadi induk');
    assert.equal(aturInduk(daftar, 'a', 'b'), daftar, 'tidak berubah');
    assert.equal(bisaJadiInduk(daftar, 'b', 'a'), true);
    const lepas = aturInduk(daftar, 'b', undefined);
    assert.equal(lepas[1].induk, undefined);
    const pasang = aturInduk([z('a', 'bangunan'), z('c', 'parkir')], 'c', 'a');
    assert.equal(pasang[1].induk, 'a');
});

test('rapikan membuang induk yang tak ada atau berputar', () => {
    const r = rapikan([z('a', 'bangunan', { induk: 'x' }), z('b', 'taman', { induk: 'c' }), z('c', 'parkir', { induk: 'b' }), z('d', 'taman', { induk: 'a' })]);
    assert.equal(r[0].induk, undefined);
    assert.ok(r[1].induk === undefined || r[2].induk === undefined, 'siklus diputus');
    assert.equal(r[3].induk, 'a');
});

test('hapusZona: anak naik ke induk yang dihapus; yang terkunci tidak dihapus', () => {
    const daftar = [z('a', 'bangunan'), z('b', 'taman', { induk: 'a' }), z('c', 'parkir', { induk: 'b' })];
    const tanpaB = hapusZona(daftar, 'b');
    assert.deepEqual(uids(tanpaB), ['a', 'c']);
    assert.equal(tanpaB[1].induk, 'a');
    const tanpaA = hapusZona(daftar, 'a');
    assert.equal(tanpaA.find((x) => x.uid === 'b')?.induk, undefined);
    const kunci = setKunci(daftar, 'a', true);
    assert.equal(hapusZona(kunci, 'a'), kunci);
});

test('kunci, sembunyi, nama, dan pilih serupa', () => {
    let d = [z('a', 'bangunan'), z('b', 'taman'), z('c', 'taman')];
    d = setKunci(d, 'a', true);
    assert.equal(d[0].kunci, true);
    d = setKunci(d, 'a', false);
    assert.equal(d[0].kunci, undefined);
    d = setSembunyi(d, 'b', true);
    assert.equal(d[1].sembunyi, true);
    d = ubahNama(d, 'c', '  Halaman dalam  ');
    assert.equal(d[2].nama, 'Halaman dalam');
    d = ubahNama(d, 'c', '   ');
    assert.equal(d[2].nama, undefined);
    assert.deepEqual(serupa(d, 'b'), ['b', 'c']);
    d = setKunciBanyak(d, serupa(d, 'b'), true);
    assert.deepEqual(d.map((x) => !!x.kunci), [false, true, true]);
});

test('duplikatZona: disisipkan setelah asli, digeser, tanpa kunci dan sembunyi, uid baru', () => {
    const asli = [z('a', 'bangunan', { kunci: true, sembunyi: true, nama: 'Menara' }), z('b', 'taman')];
    const d = duplikatZona(asli, 'a', { dLat: 0.0001, dLng: 0.0002 }, 'baru', 'salinan', 'Gedung');
    assert.deepEqual(uids(d), ['a', 'baru', 'b']);
    assert.equal(d[1].nama, 'Menara (salinan)');
    assert.equal(d[1].kunci, undefined);
    assert.equal(d[1].sembunyi, undefined);
    assert.equal(d[1].geometri.coordinates[0][0][0], 106.8002);
    assert.equal(asli[0].geometri.coordinates[0][0][0], 106.8, 'asli tidak berubah');
});

test('dariServer: zona bawaan menjadi layer dengan uid srv-id', () => {
    const fc = {
        type: 'FeatureCollection' as const,
        features: [
            { type: 'Feature' as const, properties: { id: 0, jenis: 'bangunan' as const, luas_m2: 1 }, geometry: kotak(1, 1) },
            { type: 'Feature' as const, properties: { id: 2, jenis: 'taman' as const, luas_m2: 1 }, geometry: { type: 'MultiPolygon' as const, coordinates: [kotak(2, 2).coordinates] } },
        ],
    };
    const d = dariServer(fc);
    assert.deepEqual(uids(d), ['srv-0', 'srv-2']);
    assert.equal(d[1].geometri.type, 'Polygon');
    assert.deepEqual(dariServer(null), []);
});

test("prioritasZona: terkunci menang, lalu yang terakhir ditarik, lalu urutan di daftar", () => {
    const d = [z("a", "bangunan"), z("b", "parkir", { tarik: 100 }), z("c", "taman", { tarik: 200 }), z("d", "taman", { kunci: true, tarik: 50 })];
    // d terkunci (menang), lalu c (tarik 200), lalu b (tarik 100), lalu a (belum pernah ditarik).
    assert.deepEqual(prioritasZona(d), [1, 2, 3, 4]);
});

test("prioritasZona: tanpa tarik, urutan di daftar menentukan (yang lebih atas menang) dan nilainya 1..n tanpa kembar", () => {
    const d = [z("a", "bangunan"), z("b", "parkir"), z("c", "taman")];
    assert.deepEqual(prioritasZona(d), [3, 2, 1]);
    assert.deepEqual(prioritasZona([]), []);
});

test("resetTarik: setelah urutan diubah, urutan di daftar kembali menentukan", () => {
    const d = [z("a", "bangunan"), z("b", "taman", { tarik: 500 })];
    assert.deepEqual(prioritasZona(d), [1, 2]);
    const ulang = resetTarik(d);
    assert.equal(ulang[1].tarik, undefined);
    assert.deepEqual(prioritasZona(ulang), [2, 1]);
    assert.equal(resetTarik(ulang), ulang, "tidak membuat salinan bila tak ada yang perlu direset");
});

test("keZonaApi mengirim prioritas searah daftar", () => {
    const d = [z("a", "bangunan"), z("b", "taman", { tarik: 9 })];
    assert.deepEqual(keZonaApi(d).map((x) => x.prioritas), [1, 2]);
});
