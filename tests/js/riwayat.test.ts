// Tes logika murni riwayat undo/redo Uji Lahan. Jalankan: npm run test:js (Node 22.18+/24, tanpa dependensi).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atur, bisaRedo, bisaUndo, buatRiwayat, catat, ganti, redo, undo, BATAS_RIWAYAT } from '../../resources/js/lib/riwayat.ts';

test('catat menambah langkah dan undo/redo bolak-balik', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'a', 1000);
    r = catat(r, 2, 'b', 1010);
    assert.equal(r.kini, 2);
    assert.equal(bisaUndo(r), true);
    r = undo(r);
    assert.equal(r.kini, 1);
    r = undo(r);
    assert.equal(r.kini, 0);
    assert.equal(bisaUndo(r), false);
    r = redo(r);
    r = redo(r);
    assert.equal(r.kini, 2);
    assert.equal(bisaRedo(r), false);
});

test('perubahan sejenis yang berdekatan digabung jadi satu langkah', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'tarik', 1000);
    r = catat(r, 2, 'tarik', 1100);
    r = catat(r, 3, 'tarik', 1200);
    assert.equal(r.lalu.length, 1);
    r = undo(r);
    assert.equal(r.kini, 0);
});

test('jenis berbeda atau jeda lama tidak digabung', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'tarik', 1000);
    r = catat(r, 2, 'slider', 1100);
    assert.equal(r.lalu.length, 2);
    r = catat(r, 3, 'slider', 5000);
    assert.equal(r.lalu.length, 3);
});

test('perubahan pertama pada riwayat kosong tidak digabung ke nilai awal', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'a', 1000);
    r = catat(r, 2, 'a', 1100);
    r = undo(r);
    assert.equal(r.kini, 0, 'undo harus kembali ke nilai awal, bukan ke nilai tengah');
});

test('setelah undo, perubahan sejenis tidak digabung ke langkah sebelum undo', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'a', 1000);
    r = catat(r, 2, 'b', 1010);
    r = undo(r);
    r = catat(r, 5, 'b', 1020);
    assert.deepEqual(r.lalu, [0, 1]);
    assert.equal(r.kini, 5);
});

test('perubahan baru setelah undo membuang langkah redo', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'a', 1000);
    r = undo(r);
    assert.equal(bisaRedo(r), true);
    r = catat(r, 9, 'a', 2000);
    assert.equal(bisaRedo(r), false);
});

test('nilai yang sama persis tidak dicatat', () => {
    const nilai = { x: 1 };
    let r = buatRiwayat(nilai);
    const sama = catat(r, nilai, 'a', 1000);
    assert.equal(sama, r);
    r = catat(r, { x: 1 }, 'a', 1000);
    assert.equal(r.lalu.length, 1, 'objek baru dianggap perubahan walau isinya sama');
});

test('riwayat dibatasi', () => {
    let r = buatRiwayat(0);
    for (let i = 1; i <= BATAS_RIWAYAT + 20; i++) r = catat(r, i, `k${i}`, i * 10_000);
    assert.equal(r.lalu.length, BATAS_RIWAYAT);
    assert.equal(r.lalu[0], 20);
});

test('undo/redo di ujung tidak mengubah apa pun', () => {
    const r = buatRiwayat('a');
    assert.equal(undo(r), r);
    assert.equal(redo(r), r);
});

test('ganti tidak membuat langkah undo dan atur membuang semuanya', () => {
    let r = buatRiwayat(0);
    r = catat(r, 1, 'a', 1000);
    r = ganti(r, 7);
    assert.equal(r.kini, 7);
    assert.equal(r.lalu.length, 1);
    assert.equal(r.kunci, null);
    r = atur(42);
    assert.equal(bisaUndo(r), false);
    assert.equal(r.kini, 42);
});
