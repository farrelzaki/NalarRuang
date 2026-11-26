// Tes logika murni laporan Uji Lahan (CSV dan HTML cetak). Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bangunCsv, bangunHtml, bagianLaporan, lepasHtml, selCsv, tabelSkema, angka } from '../../resources/js/lib/laporanLahan.ts';
import { buatSkema } from '../../resources/js/lib/skemaLahan.ts';

const poligon = { type: 'Polygon' as const, coordinates: [[[106.8, -6.2], [106.801, -6.2], [106.801, -6.199], [106.8, -6.2]]] };
const snap = (tambahan = {}) => ({ geom: poligon, tipe: 'apartemen' as const, asumsi: {}, pola: null, zona: null, akses: [], isiSisa: false, targetJumlah: null, kunciUkuran: false, laranganBanjir: null, ...tambahan });
const hasil = (tambahan = {}) =>
    ({
        tipe: 'apartemen',
        pola: 'wrap',
        luas_m2: 12345.6,
        keliling_m: 450,
        pusat: { lat: -6.2, lng: 106.8 },
        wilayah: 'Kel. Contoh, Kec. Uji',
        zonasi: { zona: 'Zona Perumahan', subzona: 'R-4', porsi: 1, sumber: 'RDTR DKI 2022' },
        intensitas: { kdb: 40, klb: 4, kdh: 15, sumber: 'RDTR DKI 2022', alternatif: 2, luas_persil_m2: 12000 },
        banjir: { porsi_rawan: 0.3, tingkat_maks: 2, genangan_2020: true },
        asumsi: { sempadan: 5, lantai: null, porsi_studio: 0.3, sudut_parkir: 45, maks_baris: 0, rasio_parkir: 0.5 },
        target: null,
        kapasitas: { jumlah: 321, satuan: 'unit', lantai: 12, luas_tapak_m2: 3000, luas_lantai_m2: 36000, kepadatan_per_ha: 260, parkir: { butuh: 160, muat: 120, jenis: 'mobil', lantai: 1 } },
        ringkasan: { kdb_terpakai: 45, kdb_batas: 40, klb_terpakai: 3, klb_batas: 4, kdh_terpakai: 12, kdh_batas: 15, tinggi_lantai_m: 3.2, tinggi_m: 38.4, pelanggaran: ['kdb', 'parkir'] },
        catatan: ['=HYPERLINK("http://jahat")', 'Estimasi, "indikatif"'],
        ...tambahan,
    }) as never;
const t = (id: string, en?: string) => id; // eslint-disable-line @typescript-eslint/no-unused-vars
const bahan = (tambahan = {}) => ({ snap: snap(), hasil: hasil(), skema: [], waktu: new Date('2026-11-22T10:00:00Z'), t, locale: 'id-ID', ...tambahan });

test('selCsv: kutip koma dan petik, netralkan awalan rumus, angka apa adanya', () => {
    assert.equal(selCsv('biasa'), 'biasa');
    assert.equal(selCsv('a,b'), '"a,b"');
    assert.equal(selCsv('dia "bilang"'), '"dia ""bilang"""');
    assert.equal(selCsv('=1+1'), "'=1+1");
    assert.equal(selCsv('@SUM(A1)'), "'@SUM(A1)");
    assert.equal(selCsv('-5 slot'), "'-5 slot");
    assert.equal(selCsv(-5), '-5');
    assert.equal(selCsv(null), '');
    assert.equal(selCsv('baris\nbaru'), '"baris\nbaru"');
});

test('bangunCsv: BOM, bagian utama, angka berformat bahasa, rumus dari server dinetralkan', () => {
    const csv = bangunCsv(bahan());
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes('Laporan Uji Lahan — Apartemen'));
    assert.ok(csv.includes('Kel. Contoh') && csv.includes('Zona Perumahan (R-4)'));
    assert.ok(csv.includes('12.346 m²'), 'luas berformat id-ID');
    assert.ok(csv.includes('KDB,45% / 40% (melebihi)'));
    assert.ok(csv.includes('120 / 160 slot (kurang)'));
    assert.ok(csv.includes('Sudut parkir,45 °'));
    assert.ok(csv.includes('Jumlah lantai,maksimum'));
    assert.ok(csv.includes("'=HYPERLINK"), 'rumus dinetralkan');
    assert.ok(csv.includes('"Estimasi, ""indikatif"""'));
    assert.ok(!/persona/i.test(csv));
    assert.ok(csv.endsWith('\r\n'));
    assert.ok(!csv.includes('Perbandingan skema'), 'tanpa skema tidak ada tabel');
});

test('bangunCsv dan bangunHtml: tabel perbandingan hanya bila ada dua skema atau lebih', () => {
    const a = buatSkema(snap(), hasil(), 'Skema <A>', 'a', 1)!;
    const b = buatSkema(snap(), hasil({ kapasitas: { jumlah: 400, satuan: 'unit', lantai: 14, luas_tapak_m2: 3000, luas_lantai_m2: 40000, kepadatan_per_ha: 320, parkir: { butuh: 100, muat: 120, jenis: 'mobil', lantai: 1 } } }), 'Skema B', 'b', 2)!;
    assert.deepEqual(tabelSkema([a], t, 'id-ID'), []);
    const tabel = tabelSkema([a, b], t, 'id-ID');
    assert.deepEqual(tabel[0], ['Ukuran', 'Skema <A>', 'Skema B']);
    const jumlah = tabel.find((r) => r[0].startsWith('Jumlah'))!;
    assert.deepEqual(jumlah.slice(1), ['321', '400 ★']);
    const csv = bangunCsv(bahan({ skema: [a, b] }));
    assert.ok(csv.includes('Perbandingan skema'));
    const html = bangunHtml(bahan({ skema: [a, b] }));
    assert.ok(html.includes('Perbandingan skema'));
    assert.ok(html.includes('Skema &lt;A&gt;'), 'nama skema dilepas');
    assert.ok(!html.includes('Skema <A>'));
});

test('bangunHtml: dokumen lengkap tanpa skrip, semua teks server dilepas', () => {
    const html = bangunHtml(bahan({ hasil: hasil({ wilayah: '<img src=x onerror=alert(1)>', catatan: ['<script>alert(1)</script>'] }) }));
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(!html.includes('<script'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.ok(html.includes('@page'));
    assert.ok(html.includes('lang="id"'));
    assert.ok(bangunHtml(bahan({ locale: 'en-US' })).includes('lang="en"'));
    assert.equal(lepasHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('bagianLaporan: bagian kosong dibuang; target dan larangan banjir ikut bila ada', () => {
    const bag = bagianLaporan(bahan({ snap: snap({ laranganBanjir: 2 }), hasil: hasil({ catatan: [], target: { diminta: 400, tercapai: false, jumlah: 321, maks: 321, kunci_ukuran: false, lantai: 12, ukuran: { nama: 'luas_rata_unit', nilai: 30 } } }) }));
    assert.ok(!bag.some((x) => x.judul === 'Catatan'));
    const desain = bag.find((x) => x.judul === 'Desain')!.baris;
    assert.ok(desain.some(([k, v]) => k.startsWith('Larangan bangun') && v.includes('2')));
    assert.ok(desain.some(([k, v]) => k === 'Target jumlah' && v.includes('tidak muat')));
    assert.equal(angka(null, 'id-ID'), '');
    assert.equal(angka(1234.56, 'en-US', 1), '1,234.6');
});
