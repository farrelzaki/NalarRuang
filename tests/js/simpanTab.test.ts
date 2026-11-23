// Tes logika murni simpanan per tab Uji Lahan dan simpanan sesi browser. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambilBagian, bacaSesi, gantiTipe, tulisSesi } from '../../resources/js/lib/simpanTab.ts';

const kotak = (x = 106.8, y = -6.2, s = 0.001) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
const snapKos = () => ({
    geom: kotak(),
    tipe: 'kos' as const,
    asumsi: { luas_kamar: 15 },
    pola: 'grid' as const,
    zona: [{ uid: 'a', jenis: 'bangunan' as const, geometri: kotak(106.8, -6.2, 0.0005) }],
    akses: [
        { jenis: 'gerbang' as const, titik: [106.8, -6.2] as [number, number] },
        { jenis: 'pintu' as const, titik: [106.8002, -6.1999] as [number, number] },
    ],
    isiSisa: true,
    targetJumlah: 40,
    kunciUkuran: false,
    laranganBanjir: 2,
    inti: null,
});

test('ganti tab menyimpan tab lama dan tab baru mulai dari bawaan; kembali memulihkan persis', () => {
    const awal = snapKos();
    const keApt = gantiTipe(awal, {}, 'apartemen');
    assert.equal(keApt.snap.tipe, 'apartemen');
    assert.deepEqual(keApt.snap.geom, awal.geom, 'lahan dipakai bersama');
    assert.equal(keApt.snap.pola, null);
    assert.equal(keApt.snap.zona, null);
    assert.deepEqual(keApt.snap.asumsi, {});
    assert.equal(keApt.snap.targetJumlah, null);
    assert.equal(keApt.snap.laranganBanjir, 2, 'larangan banjir milik lahan, ikut');
    assert.equal(keApt.snap.akses.length, 2, 'gerbang dan pintu ikut ke apartemen');
    assert.deepEqual(keApt.simpanan.kos, ambilBagian(awal));

    // Ubah sesuatu di apartemen, lalu kembali ke kos: kos persis seperti ditinggal, apartemen tersimpan.
    const aptDiubah = { ...keApt.snap, pola: 'tower' as const };
    const balik = gantiTipe(aptDiubah, keApt.simpanan, 'kos');
    assert.deepEqual(balik.snap, awal);
    assert.equal(balik.simpanan.apartemen?.pola, 'tower');

    // Rumah tapak: pintu gedung tidak dibawa.
    const keRumah = gantiTipe(awal, {}, 'rumah');
    assert.deepEqual(keRumah.snap.akses.map((a) => a.jenis), ['gerbang']);
    // Tab yang sama: tidak berubah.
    assert.equal(gantiTipe(awal, {}, 'kos').snap, awal);
});

test('simpanan sesi: tulis lalu baca kembali sama, termasuk tab lain, mode, dan skema; persona tidak ada', () => {
    const awal = snapKos();
    const { snap, simpanan } = gantiTipe(awal, {}, 'apartemen');
    const skema = [{ id: 's1', nama: 'Skema 1', waktu: 5, snap: awal, metrik: { jumlah: 10 } as never }];
    const teks = tulisSesi({ snap, simpanan, mode: 'poligon', skema })!;
    assert.ok(!/persona/i.test(teks));
    const baca = bacaSesi(teks)!;
    assert.deepEqual(baca.snap, snap);
    assert.deepEqual(baca.simpanan.kos, ambilBagian(awal));
    assert.equal(baca.mode, 'poligon');
    assert.equal(baca.skema.length, 1);
    assert.deepEqual(baca.skema[0].snap, awal);
});

test('simpanan sesi rusak atau tanpa lahan diabaikan dengan aman', () => {
    assert.equal(bacaSesi(null), null);
    assert.equal(bacaSesi('bukan json'), null);
    assert.equal(bacaSesi('{"versi":2}'), null);
    assert.equal(tulisSesi({ snap: { ...snapKos(), geom: null }, simpanan: {}, mode: 'kotak', skema: [] }), null);
    // Bagian tab dan skema yang rusak dibuang, sisanya tetap.
    const teks = tulisSesi({ snap: snapKos(), simpanan: {}, mode: 'kotak', skema: [] })!;
    const j = JSON.parse(teks);
    j.simpanan = { rumah: 'rusak', apartemen: { pola: 'tower', zona: [{ jenis: 'kolam' }] } };
    j.skema = [{ id: 1 }, null];
    const b = bacaSesi(JSON.stringify(j))!;
    assert.equal(b.simpanan.rumah, undefined);
    assert.equal(b.simpanan.apartemen?.pola, 'tower');
    assert.deepEqual(b.simpanan.apartemen?.zona, []);
    assert.deepEqual(b.skema, []);
});
