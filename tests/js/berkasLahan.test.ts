// Tes logika murni berkas Uji Lahan (simpan/buka desain). Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bacaBerkas, bangunGeoJSON, bungkusProyek, EKSTENSI, FORMAT, namaBerkas, periksaPoligon, VERSI } from '../../resources/js/lib/berkasLahan.ts';

const kotak = (x = 106.8, y = -6.2, s = 0.001) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
const snap = (tambahan = {}) => ({
    geom: kotak(),
    tipe: 'apartemen' as const,
    asumsi: { sempadan: 4, lantai: null, porsi_studio: 0.3 },
    pola: 'wrap' as const,
    zona: [
        { uid: 'a', jenis: 'bangunan' as const, geometri: kotak(106.8, -6.2, 0.0006), nama: 'Menara', kunci: true },
        { uid: 'b', jenis: 'taman' as const, geometri: kotak(106.8002, -6.2, 0.0002), induk: 'a', sembunyi: true, tarik: 12 },
    ],
    akses: [{ jenis: 'gerbang' as const, titik: [106.8, -6.2] as [number, number], lebar: 8 }],
    isiSisa: true,
    targetJumlah: 120,
    kunciUkuran: true,
    ...tambahan,
});
const tulis = (o: unknown) => JSON.stringify(o);

test('bolak-balik: desain yang disimpan dibaca kembali sama persis di lokasi dan bentuk yang sama', () => {
    const berkas = bungkusProyek(snap(), null, new Date('2026-11-22T10:00:00Z'))!;
    assert.equal(berkas.format, FORMAT);
    assert.equal(berkas.versi, VERSI);
    const hasil = bacaBerkas(tulis(berkas));
    assert.ok(hasil.ok);
    if (!hasil.ok) return;
    assert.equal(hasil.sumber, 'proyek');
    assert.deepEqual(hasil.peringatan, []);
    assert.deepEqual(hasil.desain, snap());
});

test('tanpa lahan tidak ada yang disimpan; persona tidak pernah ada di berkas', () => {
    assert.equal(bungkusProyek(snap({ geom: null }), null), null);
    const teks = tulis(bungkusProyek(snap(), null));
    assert.ok(!/persona/i.test(teks));
});

test('BOM di awal berkas diabaikan; teks bukan JSON ditolak dengan kalimat jelas', () => {
    assert.ok(bacaBerkas('﻿' + tulis(bungkusProyek(snap(), null))).ok);
    const r = bacaBerkas('bukan json');
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.galat, /JSON/);
});

test('versi lebih baru ditolak; format asing ditolak', () => {
    const baru = { ...bungkusProyek(snap(), null)!, versi: VERSI + 1 };
    const r = bacaBerkas(tulis(baru));
    assert.ok(!r.ok);
    if (!r.ok) assert.match(r.galat, /lebih baru/);
    assert.ok(!bacaBerkas('{"foo":1}').ok);
    assert.ok(!bacaBerkas('[1,2]').ok);
});

test('lahan di luar Jabodetabek, terlalu luas, atau rusak ditolak', () => {
    const berkas = (lahan: unknown) => tulis({ ...bungkusProyek(snap(), null)!, lahan });
    const luarNegeri = bacaBerkas(berkas(kotak(139.7, 35.6)));
    assert.ok(!luarNegeri.ok);
    if (!luarNegeri.ok) assert.match(luarNegeri.galat, /luar Jabodetabek/);
    const raksasa = bacaBerkas(berkas(kotak(106.5, -6.5, 0.1))); // ~120 km²
    assert.ok(!raksasa.ok);
    if (!raksasa.ok) assert.match(raksasa.galat, /melebihi batas/);
    assert.ok(!bacaBerkas(berkas({ type: 'Polygon', coordinates: [[[106.8, -6.2], [106.81, 'x'], [106.81, -6.19]]] })).ok);
    assert.ok(!bacaBerkas(berkas({ type: 'Point', coordinates: [106.8, -6.2] })).ok);
    assert.ok(!bacaBerkas(berkas({ type: 'Polygon', coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.8, -6.2]]] })).ok);
});

test('isi yang tidak sah dibersihkan dengan peringatan, bukan membuat impor gagal', () => {
    const dasar = bungkusProyek(snap(), null)!;
    const kotor = {
        ...dasar,
        tipe: 'gudang',
        pola: 'wrap', // tidak berlaku untuk rumah
        asumsi: { sempadan: 'banyak', lebar_jalan: 6, kunci_asing: 9 },
        targetJumlah: -3,
        kunciUkuran: true,
        zona: [
            { uid: 'a', jenis: 'bangunan', geometri: kotak(106.8, -6.2, 0.0006), induk: 'hilang' },
            { uid: 'a', jenis: 'parkir', geometri: kotak(106.8, -6.2, 0.0003) },
            { uid: 'x', jenis: 'kolam', geometri: kotak() },
            { uid: 'y', jenis: 'taman', geometri: { type: 'Point' } },
        ],
        akses: [{ jenis: 'gerbang', titik: [0, 0] }, { jenis: 'pintu', titik: [106.8, -6.2], lebar: 3 }],
    };
    const r = bacaBerkas(tulis(kotor));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.desain.tipe, 'rumah');
    assert.equal(r.desain.pola, null);
    assert.deepEqual(r.desain.asumsi, { lebar_jalan: 6 });
    assert.equal(r.desain.targetJumlah, null);
    assert.equal(r.desain.kunciUkuran, false, 'kunci ukuran tanpa target tidak berarti');
    assert.equal(r.desain.zona?.length, 2);
    assert.equal(r.desain.zona?.[0].induk, undefined, 'induk yang hilang dilepas');
    assert.notEqual(r.desain.zona?.[0].uid, r.desain.zona?.[1].uid, 'uid kembar dibedakan');
    assert.equal(r.desain.akses.length, 1);
    assert.ok(r.peringatan.length >= 3);
});

test('rantai induk melingkar dilepas', () => {
    const dasar = bungkusProyek(snap(), null)!;
    const zona = [
        { uid: 'a', jenis: 'bangunan', geometri: kotak(106.8, -6.2, 0.0006), induk: 'b' },
        { uid: 'b', jenis: 'taman', geometri: kotak(106.8, -6.2, 0.0003), induk: 'a' },
    ];
    const r = bacaBerkas(tulis({ ...dasar, zona }));
    assert.ok(r.ok);
    if (r.ok) assert.ok(r.desain.zona?.every((z) => z.induk === undefined));
});

test('batas jumlah: zona maks 12, akses maks 6', () => {
    const dasar = bungkusProyek(snap(), null)!;
    const zona = Array.from({ length: 15 }, (_, i) => ({ uid: `z${i}`, jenis: 'taman', geometri: kotak(106.8 + i * 0.0001, -6.2, 0.00005) }));
    const akses = Array.from({ length: 9 }, () => ({ jenis: 'gerbang', titik: [106.8, -6.2] }));
    const r = bacaBerkas(tulis({ ...dasar, zona, akses }));
    assert.ok(r.ok);
    if (r.ok) {
        assert.equal(r.desain.zona?.length, 12);
        assert.equal(r.desain.akses.length, 6);
    }
});

test('GeoJSON biasa: hanya bentuk lahan yang diambil, desain lain bawaan', () => {
    const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { nama: 'persil' }, geometry: kotak() }, { type: 'Feature', properties: {}, geometry: kotak(106.9, -6.3) }] };
    const r = bacaBerkas(tulis(fc));
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.sumber, 'geojson');
    assert.equal(r.desain.tipe, 'rumah');
    assert.equal(r.desain.zona, null);
    assert.equal(r.peringatan.length, 1);
    assert.ok(bacaBerkas(tulis(kotak())).ok);
    assert.ok(!bacaBerkas(tulis({ type: 'FeatureCollection', features: [] })).ok);
});

test('MultiPolygon: bagian terluas dipakai; cincin tak tertutup ditutup', () => {
    const besar = kotak(106.8, -6.2, 0.002).coordinates;
    const kecil = kotak(106.9, -6.3, 0.0005).coordinates;
    const r = bacaBerkas(tulis({ type: 'MultiPolygon', coordinates: [kecil, besar] }));
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.desain.geom.coordinates[0][0][0], 106.8);
    const terbuka = periksaPoligon({ type: 'Polygon', coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.801, -6.199]]] });
    assert.ok(terbuka.ok);
    if (terbuka.ok) assert.deepEqual(terbuka.poligon.coordinates[0].at(-1), terbuka.poligon.coordinates[0][0]);
});

test('GeoJSON ekspor memuat lahan, zona, isi, dan akses; nama berkas', () => {
    const hasil = {
        luas_m2: 12000,
        wilayah: 'Kec. Contoh',
        zona: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 0, jenis: 'bangunan', luas_m2: 5000 }, geometry: kotak() }] },
        geometri_kapasitas: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { jenis: 'unit', tipe: 'studio' }, geometry: kotak() }, { type: 'Feature', properties: { jenis: 'x' }, geometry: null }] },
        akses: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 0, jenis: 'gerbang', lebar: 6 }, geometry: { type: 'Point', coordinates: [106.8, -6.2] } }] },
    } as never;
    const fc = bangunGeoJSON(snap(), hasil, new Date('2026-11-22T10:00:00Z'))!;
    assert.deepEqual(fc.features.map((f) => (f.properties as { peran: string }).peran), ['lahan', 'zona', 'isi', 'akses']);
    assert.equal((fc.features[0].properties as { luas_m2: number }).luas_m2, 12000);
    assert.equal(bangunGeoJSON(snap({ geom: null }), null), null);
    assert.equal(bangunGeoJSON(snap(), null)!.features.length, 1);
    assert.match(namaBerkas('kos', new Date(2026, 10, 22, 9, 5)), /^uji-lahan-kos-20261122-0905$/);
    assert.equal(EKSTENSI, '.nalarruang.json');
});
