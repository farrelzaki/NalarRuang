/**
 * Laporan Uji Lahan (FR-23): CSV untuk spreadsheet dan HTML cetak (PDF lewat dialog cetak peramban). Logika murni tanpa DOM,
 * dites dengan `npm run test:js`. Teks mengikuti bahasa lewat `t(indonesia, inggris)`.
 *
 * Isi laporan: lokasi dan luas lahan, tipe dan pola, asumsi, kapasitas, kepatuhan KDB/KLB/KDH/parkir, catatan server, dan tabel
 * perbandingan skema bila ada. Persona sesi tidak ikut (laporan hanya memuat desain dan hasil hitung lahan).
 *
 * Aman untuk nilai dari server: CSV mengutip sel dan menetralkan awalan rumus (= + - @), HTML melepas semua teks.
 * Berkas ini hanya mengimpor tipe, supaya bisa dites langsung oleh node.
 */
import type { LahanResponse } from '@/types';
import type { SnapLahan } from './proyekLahan.ts';
import { bandingkan, type SkemaLahan } from './skemaLahan.ts';

export type Terjemah = (id: string, en?: string) => string;

export type BahanLaporan = {
    snap: SnapLahan;
    hasil: LahanResponse;
    skema: SkemaLahan[];
    waktu: Date;
    t: Terjemah;
    /** Pemisah angka desimal mengikuti bahasa. */
    locale: string;
};

type Sel = string | number | null | undefined;

const TIPE: Record<string, [string, string]> = { rumah: ['Rumah tapak', 'Landed house'], kos: ['Kos', 'Boarding house'], apartemen: ['Apartemen', 'Apartment'], pribadi: ['Rumah pribadi', 'Private house'] };
const SATUAN: Record<string, [string, string]> = { rumah: ['rumah', 'houses'], kamar: ['kamar', 'rooms'], unit: ['unit', 'units'] };
const ASUMSI_LABEL: Record<string, [string, string, string]> = {
    lebar_kavling: ['Lebar kavling', 'Plot width', 'm'],
    panjang_kavling: ['Panjang kavling', 'Plot depth', 'm'],
    lebar_jalan: ['Lebar jalan', 'Road width', 'm'],
    luas_kamar: ['Luas kamar', 'Room size', 'm²'],
    porsi_studio: ['Porsi studio', 'Studio share', '%'],
    porsi_2br: ['Porsi 2 kamar', '2-bedroom share', '%'],
    sempadan: ['Sempadan bangunan', 'Building setback', 'm'],
    lantai: ['Jumlah lantai', 'Floors', ''],
    rasio_parkir: ['Parkir mobil per unit', 'Car parking per unit', ''],
    rasio_motor: ['Parkir motor per kamar', 'Motorbike parking per room', ''],
    sudut_parkir: ['Sudut parkir', 'Parking angle', '°'],
    padding_parkir: ['Jarak parkir dari tepi', 'Parking padding', 'm'],
    maks_baris: ['Max Run (slot per deret)', 'Max run (stalls per row)', ''],
};

/** Angka dibulatkan seperlunya, ditulis dengan pemisah bahasa. */
export function angka(n: number | null | undefined, locale: string, desimal = 1): string {
    if (n === null || n === undefined || !Number.isFinite(n)) return '';
    return n.toLocaleString(locale, { maximumFractionDigits: desimal });
}

/** Asumsi yang dipakai server (nilai akhir, bukan masukan pengguna), siap tampil: [label, nilai berformat]. */
export function barisAsumsi(hasil: LahanResponse, t: Terjemah, locale: string): [string, string][] {
    const a = hasil.asumsi as Record<string, number | null | undefined>;
    return Object.entries(ASUMSI_LABEL).flatMap(([k, [id, en, satuan]]) => {
        const v = a[k];
        if (v === undefined) return [];
        if (k === 'lantai' && v === null) return [[t(id, en), t('maksimum', 'maximum')]];
        if (v === null) return [];
        const teks = satuan === '%' ? `${angka(v * 100, locale, 0)}%` : k === 'maks_baris' && v < 2 ? t('tanpa batas', 'unlimited') : `${angka(v, locale)}${satuan ? ` ${satuan}` : ''}`;
        return [[t(id, en), teks]];
    });
}

/** Kutip satu sel CSV. Teks yang diawali = + - @ diberi apostrof supaya spreadsheet tidak menjalankannya sebagai rumus. */
export function selCsv(v: Sel): string {
    if (v === null || v === undefined) return '';
    let teks = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
    return /[",;\r\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

const barisCsv = (sel: Sel[]) => sel.map(selCsv).join(',');

/** Judul laporan, juga dipakai untuk nama berkas. */
export function judul(b: BahanLaporan): string {
    const [id, en] = TIPE[b.hasil.tipe] ?? [b.hasil.tipe, b.hasil.tipe];
    return b.t(`Laporan Uji Lahan — ${id}`, `Site Test report — ${en}`);
}

/** Bagian-bagian laporan sebagai tabel kunci-nilai: dipakai CSV dan HTML supaya isinya selalu sama. */
export function bagianLaporan(b: BahanLaporan): { judul: string; baris: [string, string][] }[] {
    const { hasil: h, t, locale } = b;
    const k = h.kapasitas;
    const r = h.ringkasan;
    const sat = SATUAN[k.satuan] ?? [k.satuan, k.satuan];
    const parkir = k.parkir ? `${angka(k.parkir.muat, locale, 0)} / ${angka(k.parkir.butuh, locale, 0)} ${t('slot', 'stalls')}${k.parkir.muat < k.parkir.butuh ? ` (${t('kurang', 'short')})` : ''}` : '';
    const pelanggaran = r.pelanggaran.length ? r.pelanggaran.map((x) => x.toUpperCase()).join(', ') : t('tidak ada', 'none');
    const bagian: { judul: string; baris: [string, string][] }[] = [
        {
            judul: t('Lahan', 'Site'),
            baris: [
                [t('Wilayah', 'Area'), h.wilayah],
                [t('Luas', 'Area size'), `${angka(h.luas_m2, locale, 0)} m²`],
                [t('Keliling', 'Perimeter'), `${angka(h.keliling_m, locale, 0)} m`],
                [t('Titik pusat', 'Centre point'), `${h.pusat.lat}, ${h.pusat.lng}`],
                [t('Zonasi', 'Zoning'), h.zonasi ? `${h.zonasi.zona}${h.zonasi.subzona ? ` (${h.zonasi.subzona})` : ''}, ${angka(h.zonasi.porsi * 100, locale, 0)}%` : t('belum ada data zonasi resmi', 'no official zoning data')],
                [t('Rawan banjir (InaRISK)', 'Flood-prone (InaRISK)'), `${angka(h.banjir.porsi_rawan * 100, locale, 0)}%${h.banjir.genangan_2020 ? `; ${t('pernah tergenang 2020', 'flooded in 2020')}` : ''}`],
            ],
        },
        {
            judul: t('Desain', 'Design'),
            baris: [
                [t('Tipe bangunan', 'Building type'), t(...(TIPE[h.tipe] ?? [h.tipe, h.tipe]))],
                [t('Pola tata letak', 'Layout pattern'), h.pola],
                [t('Zona dari pengguna', 'User-drawn zones'), b.snap.zona ? String(b.snap.zona.length) : t('bawaan pola', 'pattern default')],
                [t('Gerbang dan pintu', 'Gates and doors'), String(b.snap.akses.length)],
                ...(b.snap.laranganBanjir ? ([[t('Larangan bangun di area banjir', 'No-build in flood areas'), `${t('tingkat', 'level')} ≥ ${b.snap.laranganBanjir}`]] as [string, string][]) : []),
                ...(h.target ? ([[t('Target jumlah', 'Target count'), `${angka(h.target.diminta, locale, 0)} ${t(sat[0], sat[1])} — ${h.target.tercapai ? t('tercapai', 'reached') : t('tidak muat', 'does not fit')}`]] as [string, string][]) : []),
            ],
        },
        { judul: t('Asumsi', 'Assumptions'), baris: barisAsumsi(h, t, locale) },
        {
            judul: t('Kapasitas', 'Capacity'),
            baris: [
                [t('Jumlah', 'Count'), `${angka(k.jumlah, locale, 0)} ${t(sat[0], sat[1])}`],
                [t('Lantai', 'Floors'), String(k.lantai)],
                [t('Tinggi bangunan', 'Building height'), `${angka(r.tinggi_m, locale)} m`],
                [t('Luas lantai total', 'Total floor area'), `${angka(k.luas_lantai_m2, locale, 0)} m²`],
                [t('Tapak bangunan', 'Building footprint'), `${angka(k.luas_tapak_m2, locale, 0)} m²`],
                ...(k.kepadatan_per_ha !== null ? ([[t('Kepadatan per hektare', 'Density per hectare'), angka(k.kepadatan_per_ha, locale, 0)]] as [string, string][]) : []),
                ...(k.parkir ? ([[t('Parkir (muat / butuh)', 'Parking (fit / need)'), parkir]] as [string, string][]) : []),
                ...(k.inti && k.inti.tangga > 0
                    ? ([
                          ...(k.inti.lift > 0 ? ([[t('Inti lift (lift + tangga)', 'Lift cores (lift + stairs)'), angka(k.inti.lift, locale, 0)]] as [string, string][]) : []),
                          [t('Tangga (semua inti)', 'Stairs (all cores)'), angka(k.inti.tangga, locale, 0)],
                          [t('Slot unit dipakai inti per lantai', 'Unit slots used by cores per floor'), angka(k.inti.slot, locale, 0)],
                      ] as [string, string][])
                    : []),
                ...(k.pribadi
                    ? ([
                          [t('Luas bangunan diminta', 'Requested floor area'), `${angka(k.pribadi.luas_bangunan_diminta, locale, 0)} m²${k.pribadi.tidak_muat ? ` (${t('tidak muat', 'does not fit')})` : ''}`],
                          [t('Rekomendasi luas bangunan', 'Recommended floor area'), `${angka(k.pribadi.rekomendasi_luas_bangunan, locale, 0)} m²`],
                          [t('Perkiraan kamar (indikatif)', 'Estimated rooms (indicative)'), t(`${k.pribadi.kamar_tidur} kamar tidur, ${k.pribadi.kamar_mandi} kamar mandi`, `${k.pribadi.kamar_tidur} bedrooms, ${k.pribadi.kamar_mandi} bathrooms`)],
                          [t('Kolam renang', 'Swimming pool'), k.pribadi.kolam_m2 > 0 ? `${angka(k.pribadi.kolam_m2, locale, 0)} m²` : t('tidak ada', 'none')],
                      ] as [string, string][])
                    : []),
            ],
        },
        {
            judul: t('Kepatuhan', 'Compliance'),
            baris: [
                ['KDB', `${angka(r.kdb_terpakai, locale)}% / ${angka(r.kdb_batas, locale)}%${r.pelanggaran.includes('kdb') ? ` (${t('melebihi', 'over')})` : ''}`],
                ['KLB', `${angka(r.klb_terpakai, locale, 2)} / ${angka(r.klb_batas, locale, 2)}${r.pelanggaran.includes('klb') ? ` (${t('melebihi', 'over')})` : ''}`],
                ['KDH', `${angka(r.kdh_terpakai, locale)}%${r.kdh_batas !== null ? ` / ${t('min.', 'min.')} ${angka(r.kdh_batas, locale)}%` : ''}${r.pelanggaran.includes('kdh') ? ` (${t('kurang', 'short')})` : ''}`],
                [t('Sumber batas', 'Limit source'), h.intensitas.sumber === 'asumsi' ? t('asumsi (bukan aturan resmi)', 'assumption (not an official rule)') : h.intensitas.sumber],
                [t('Pelanggaran', 'Violations'), pelanggaran],
            ],
        },
        { judul: t('Catatan', 'Notes'), baris: h.catatan.map((c, i): [string, string] => [String(i + 1), c]) },
    ];
    return bagian.filter((x) => x.baris.length > 0);
}

/** Tabel perbandingan skema (kosong bila kurang dari dua skema): baris pertama = judul kolom. */
export function tabelSkema(skema: SkemaLahan[], t: Terjemah, locale: string): string[][] {
    if (skema.length < 2) return [];
    const kepala = [t('Ukuran', 'Measure'), ...skema.map((s) => s.nama)];
    const isi = bandingkan(skema).map((b) => [
        t(b.label[0], b.label[1]) + (b.satuan ? ` (${b.satuan})` : ''),
        ...b.nilai.map((v, i) => (v === null ? '–' : `${angka(v, locale, 2)}${b.terbaik[i] ? ' ★' : ''}${b.melanggar[i] ? ' !' : ''}`)),
    ]);
    return [kepala, ...isi];
}

/** CSV UTF-8 dengan BOM supaya Excel membaca huruf Indonesia dengan benar. */
export function bangunCsv(b: BahanLaporan): string {
    const baris: string[] = [barisCsv([judul(b)]), barisCsv([b.t('Dibuat', 'Created'), b.waktu.toISOString()]), ''];
    for (const bag of bagianLaporan(b)) {
        baris.push(barisCsv([bag.judul]));
        for (const [k, v] of bag.baris) baris.push(barisCsv([k, v]));
        baris.push('');
    }
    const banding = tabelSkema(b.skema, b.t, b.locale);
    if (banding.length) {
        baris.push(barisCsv([b.t('Perbandingan skema', 'Scheme comparison')]));
        for (const row of banding) baris.push(barisCsv(row));
        baris.push('');
    }
    baris.push(barisCsv([b.t('Estimasi indikatif dari aturan sederhana, bukan rancangan tapak atau izin bangunan.', 'Indicative estimate from simple rules, not a site plan or building permit.')]));
    return '﻿' + baris.join('\r\n') + '\r\n';
}

export const lepasHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Dokumen HTML lengkap untuk dicetak/disimpan sebagai PDF (satu halaman A4 atau lebih). Tanpa skrip dan tanpa sumber luar. */
export function bangunHtml(b: BahanLaporan): string {
    const e = lepasHtml;
    const bagian = bagianLaporan(b)
        .map((bag) => `<section><h2>${e(bag.judul)}</h2><table>${bag.baris.map(([k, v]) => `<tr><th>${e(k)}</th><td>${e(v)}</td></tr>`).join('')}</table></section>`)
        .join('');
    const banding = tabelSkema(b.skema, b.t, b.locale);
    const tabel = banding.length
        ? `<section><h2>${e(b.t('Perbandingan skema', 'Scheme comparison'))}</h2><table class="banding"><thead><tr>${banding[0].map((x) => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${banding
              .slice(1)
              .map((row) => `<tr>${row.map((x, i) => (i === 0 ? `<th>${e(x)}</th>` : `<td>${e(x)}</td>`)).join('')}</tr>`)
              .join('')}</tbody></table><p class="kecil">★ ${e(b.t('terbaik', 'best'))} · ! ${e(b.t('melebihi batas', 'over the limit'))}</p></section>`
        : '';
    return `<!doctype html><html lang="${b.locale.startsWith('en') ? 'en' : 'id'}"><head><meta charset="utf-8"><title>${e(judul(b))}</title><style>
@page{size:A4;margin:16mm}
body{font:13px/1.45 "Plus Jakarta Sans",system-ui,sans-serif;color:#0f1b3d;margin:0}
h1{font:600 22px/1.2 Fraunces,Georgia,serif;margin:0 0 4px}
h2{font:700 12px/1.2 inherit;letter-spacing:.06em;text-transform:uppercase;color:#4b5563;margin:18px 0 6px}
.meta{color:#4b5563;margin:0 0 8px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;vertical-align:top;padding:4px 8px;border-bottom:1px solid #e5e7eb}
th{width:36%;font-weight:600}
.banding th,.banding td{width:auto}.banding thead th{background:#f3f4f6}
section{break-inside:avoid}
.kecil,.catatan{color:#6b7280;font-size:11px}
</style></head><body>
<h1>${e(judul(b))}</h1>
<p class="meta">${e(b.hasil.wilayah)} · ${e(b.waktu.toLocaleDateString(b.locale, { dateStyle: 'long' }))}</p>
${bagian}${tabel}
<p class="catatan">${e(b.t('Estimasi indikatif dari aturan sederhana, bukan rancangan tapak atau izin bangunan. NalarRuang — data publik sekunder.', 'Indicative estimate from simple rules, not a site plan or building permit. NalarRuang — public secondary data.'))}</p>
</body></html>`;
}
