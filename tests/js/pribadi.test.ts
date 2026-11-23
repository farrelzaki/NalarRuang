// Tes logika murni tipe Rumah pribadi di klien (3D, berkas proyek, tab, penempatan kolam). Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bangunEkstrusi, TINGGI_PAGAR } from '../../resources/js/lib/ekstrusi3d.ts';
import { bacaBerkas, bungkusProyek } from '../../resources/js/lib/berkasLahan.ts';
import { bacaSesi, gantiTipe, tulisSesi } from '../../resources/js/lib/simpanTab.ts';
import { kebutuhanLuas } from '../../resources/js/lib/penempatan.ts';

const kotak = (x = 106.8, y = -6.2, s = 0.001) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
const fitur = (jenis: string, s = 0.0002) => ({ type: 'Feature' as const, properties: { jenis }, geometry: kotak(106.8, -6.2, s) });

const snapPribadi = () => ({
    geom: kotak(),
    tipe: 'pribadi' as const,
    asumsi: { luas_bangunan: 280, lantai: 2, mobil: 3, kolam: 40, sempadan: 4 },
    pola: 'tengah' as const,
    zona: [
        { uid: 'a', jenis: 'bangunan' as const, geometri: kotak(106.8, -6.2, 0.0004) },
        { uid: 'b', jenis: 'kolam' as const, geometri: kotak(106.8006, -6.2, 0.0001) },
    ],
    akses: [
        { jenis: 'gerbang' as const, titik: [106.8, -6.2] as [number, number] },
        { jenis: 'pintu' as const, titik: [106.8002, -6.1999] as [number, number] },
    ],
    isiSisa: true,
    targetJumlah: null,
    kunciUkuran: false,
    laranganBanjir: null,
});

test('3D: kolam dan halaman datar, pagar setinggi 1,6 m, rumah setinggi lantainya', () => {
    const fc = bangunEkstrusi(
        {
            kapasitas: { lantai: 2 },
            ringkasan: { tinggi_lantai_m: 3.5 },
            intensitas: { kdb: 60 },
            geometri_kapasitas: { features: [fitur('tapak'), fitur('kolam'), fitur('halaman', 0.0008), fitur('pagar')] },
        } as never,
        null,
    );
    const satu = (j: string) => fc.features.find((f) => f.properties.jenis === j)!.properties;
    assert.equal(satu('tapak').tinggi, 7);
    assert.ok(satu('kolam').tinggi < 1 && satu('halaman').tinggi < 1, 'kolam dan halaman berupa pelat tipis');
    assert.ok(satu('kolam').tinggi > satu('halaman').tinggi, 'kolam tampak di atas halaman');
    assert.equal(satu('pagar').tinggi, TINGGI_PAGAR);
    // Pelat datar digambar sebelum massa (pagar, rumah).
    const urutan = fc.features.map((f) => f.properties.jenis);
    assert.ok(urutan.indexOf('kolam') < urutan.indexOf('pagar'));
});

test('berkas proyek: tipe pribadi, pola tengah, zona kolam, dan asumsi rumah pribadi ikut tersimpan', () => {
    const berkas = bungkusProyek(snapPribadi(), null, new Date('2026-11-23T10:00:00Z'))!;
    const hasil = bacaBerkas(JSON.stringify(berkas));
    assert.ok(hasil.ok);
    if (!hasil.ok) return;
    assert.deepEqual(hasil.peringatan, []);
    assert.deepEqual(hasil.desain, snapPribadi());
});

test('tab: pindah ke rumah pribadi lalu kembali memulihkan desain; gerbang dan pintu dibawa ke tab baru', () => {
    const awal = snapPribadi();
    const keKos = gantiTipe(awal, {}, 'kos');
    assert.equal(keKos.snap.tipe, 'kos');
    assert.deepEqual(keKos.snap.akses, awal.akses, 'kos memakai pintu gedung, jadi pintu ikut');
    const balik = gantiTipe(keKos.snap, keKos.simpanan, 'pribadi');
    assert.deepEqual(balik.snap, awal);
    // Sesi browser menerima tab pribadi.
    const teks = tulisSesi({ snap: awal, simpanan: {}, mode: 'kotak', skema: [] } as never);
    const baca = bacaSesi(teks);
    assert.equal(baca?.snap.tipe, 'pribadi');
});

test('penempatan: zona kolam baru seluas kolam yang diminta, selain itu 32 m², dijepit 1–20% lahan', () => {
    assert.equal(kebutuhanLuas('kolam', { luasLahanM2: 1000, kolamM2: 50 }), 50);
    assert.equal(kebutuhanLuas('kolam', { luasLahanM2: 1000 }), 32);
    assert.equal(kebutuhanLuas('kolam', { luasLahanM2: 1000, kolamM2: 300 }), 200, 'paling luas 20% lahan');
    assert.equal(kebutuhanLuas('kolam', { luasLahanM2: 1000, kolamM2: 0 }), 32);
});
