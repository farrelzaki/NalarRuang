// Tes logika murni ekspor DXF Uji Lahan. Jalankan: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bangunDxf, keUtm48s, layerIsi } from '../../resources/js/lib/dxfLahan.ts';

const kotak = (x: number, y: number, s: number) => ({ type: 'Polygon' as const, coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });

/** Pasangan (kode, nilai) dari teks DXF. */
function pasangan(dxf: string): [string, string][] {
    const b = dxf.split('\r\n');
    const hasil: [string, string][] = [];
    for (let i = 0; i + 1 < b.length; i += 2) hasil.push([b[i].trim(), b[i + 1]]);
    return hasil;
}

/** Titik tiap POLYLINE per layer (meter UTM). */
function poliline(dxf: string): { layer: string; titik: [number, number][] }[] {
    const p = pasangan(dxf);
    const keluar: { layer: string; titik: [number, number][] }[] = [];
    let kini: { layer: string; titik: [number, number][] } | null = null;
    for (let i = 0; i < p.length; i++) {
        const [k, v] = p[i];
        if (k === '0' && v === 'POLYLINE') kini = { layer: '', titik: [] };
        else if (kini && k === '8' && !kini.layer) kini.layer = v;
        else if (kini && k === '0' && v === 'VERTEX') {
            const x = Number(p.find((q, j) => j > i && q[0] === '10')?.[1]);
            const y = Number(p.find((q, j) => j > i && q[0] === '20')?.[1]);
            kini.titik.push([x, y]);
        } else if (kini && k === '0' && v === 'SEQEND') {
            keluar.push(kini);
            kini = null;
        }
    }
    return keluar;
}

test('UTM 48S: meridian tengah 105° = timur 500.000 m; lintang selatan diberi utara palsu 10.000.000 m', () => {
    const [x, y] = keUtm48s(105, 0);
    assert.ok(Math.abs(x - 500000) < 1e-6);
    assert.ok(Math.abs(y - 10000000) < 1e-6);
    const [x2, y2] = keUtm48s(105, -6.2);
    assert.ok(Math.abs(x2 - 500000) < 1e-6);
    assert.ok(y2 < 10000000 && y2 > 9300000);
    // Acuan PostGIS: ST_Transform(POINT(106.8 -6.2) 4326 -> 32748) = (699163.3906, 9314348.9616).
    const [x3, y3] = keUtm48s(106.8, -6.2);
    assert.ok(Math.abs(x3 - 699163.3906) < 0.001 && Math.abs(y3 - 9314348.9616) < 0.001, `${x3}, ${y3}`);
});

test('UTM 48S: jarak 0,001° bujur di lintang -6,2 sekitar 110,7 m (faktor skala dekat Jakarta)', () => {
    const [ax, ay] = keUtm48s(106.8, -6.2);
    const [bx, by] = keUtm48s(106.801, -6.2);
    const d = Math.hypot(bx - ax, by - ay);
    assert.ok(Math.abs(d - 110.68) < 0.1, String(d));
    assert.ok(ax > 690000 && ax < 710000, 'Jakarta sekitar timur 700 km');
});

test('layer: unit per tipe, kamar kos, inti per fungsi, sisanya per jenis', () => {
    assert.equal(layerIsi({ jenis: 'unit', tipe: 'studio' }), 'NR_UNIT_STUDIO');
    assert.equal(layerIsi({ jenis: 'unit', tipe: '2br' }), 'NR_UNIT_2BR');
    assert.equal(layerIsi({ jenis: 'unit', tipe: 'kamar' }), 'NR_KAMAR');
    assert.equal(layerIsi({ jenis: 'inti', fungsi: 'lift' }), 'NR_INTI_LIFT');
    assert.equal(layerIsi({ jenis: 'inti' }), 'NR_INTI_SERVIS');
    assert.equal(layerIsi({ jenis: 'slot' }), 'NR_SLOT');
});

test('DXF R12: bagian lengkap, layer terdaftar, poligon tertutup, luas lahan sesuai, teks ASCII; tanpa lahan = null', () => {
    const lahan = kotak(106.8, -6.2, 0.001);
    const hasil = {
        tipe: 'apartemen',
        luas_m2: 12200,
        wilayah: 'Kel. Uji — Jakarta',
        kapasitas: { lantai: 5, jumlah: 120, satuan: 'unit' },
        zona: { features: [{ geometry: kotak(106.8001, -6.1999, 0.0008), properties: { jenis: 'bangunan', id: 0 } }] },
        geometri_kapasitas: {
            features: [
                { geometry: kotak(106.8002, -6.1998, 0.00004), properties: { jenis: 'unit', tipe: 'studio' } },
                { geometry: { type: 'MultiPolygon' as const, coordinates: [kotak(106.8003, -6.1998, 0.00004).coordinates, kotak(106.8004, -6.1998, 0.00004).coordinates] }, properties: { jenis: 'inti', fungsi: 'tangga' } },
                { geometry: null, properties: { jenis: 'koridor' } },
            ],
        },
        akses: { features: [{ geometry: { type: 'Point' as const, coordinates: [106.8, -6.1995] }, properties: { jenis: 'gerbang', id: 0 } }] },
    };
    const dxf = bangunDxf(lahan, hasil, new Date('2026-11-26T10:00:00Z'))!;
    assert.ok(dxf.startsWith('0\r\nSECTION\r\n2\r\nHEADER'));
    assert.ok(dxf.endsWith('0\r\nEOF\r\n'));
    assert.ok(dxf.includes('AC1009'));
    for (const s of ['HEADER', 'TABLES', 'ENTITIES']) assert.ok(dxf.includes(`2\r\n${s}`), s);
    for (const l of ['NR_LAHAN', 'NR_ZONA_BANGUNAN', 'NR_UNIT_STUDIO', 'NR_INTI_TANGGA', 'NR_GERBANG', 'NR_TEKS']) assert.ok(dxf.includes(`0\r\nLAYER\r\n2\r\n${l}\r\n`), l);

    const poli = poliline(dxf);
    assert.equal(poli.filter((p) => p.layer === 'NR_INTI_TANGGA').length, 2, 'multipoligon jadi dua garis');
    assert.equal(poli.filter((p) => p.layer === 'NR_LAHAN').length, 1);
    const l = poli.find((p) => p.layer === 'NR_LAHAN')!;
    assert.equal(l.titik.length, 4, 'titik penutup tidak diulang (flag tertutup 70=1)');
    let luas = 0;
    for (let i = 0; i < l.titik.length; i++) {
        const [x1, y1] = l.titik[i];
        const [x2, y2] = l.titik[(i + 1) % l.titik.length];
        luas += x1 * y2 - x2 * y1;
    }
    luas = Math.abs(luas) / 2;
    assert.ok(Math.abs(luas - 110.68 * 110.57) / luas < 0.005, String(luas));

    assert.ok(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-￿]/.test(dxf.replace(/\r\n/g, '')) === false, 'hanya ASCII');
    assert.ok(dxf.includes('Kel. Uji - Jakarta'));
    assert.ok(dxf.includes('5 lantai, 120 unit'));
    assert.equal(bangunDxf(null, hasil), null);
    // Tanpa hasil hitung tetap ada lahan dan judul.
    assert.ok(bangunDxf(lahan, null)!.includes('NR_LAHAN'));
});
