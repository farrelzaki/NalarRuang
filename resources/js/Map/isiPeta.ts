/**
 * Isi peta yang tidak bergantung pada pustaka peta: teks popup, label jenis, warna titik.
 * Dipakai bersama oleh PetaExplorer (Leaflet) dan PetaMapbox agar teksnya selalu sama.
 */
import type { Feature } from 'geojson';
import { bahasaAktif, pilihTeks } from '@/lib/bahasa';

export function esc(s: unknown): string {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const tr = (id: string, en: string) => pilihTeks(bahasaAktif(), id, en);

export const ponsel = () => window.innerWidth < 768;

export function popupHtml(jenis: string, judul: string, isi: string, sumber: string): string {
    return `<div class="nr-popup" role="dialog" aria-label="${esc(judul)}">
        <div class="nr-popup__top"><div><div class="nr-eyebrow">${esc(jenis)}</div><h3 class="nr-popup__title">${esc(judul)}</h3></div></div>
        <p class="nr-popup__body" style="white-space: pre-line; line-height: 1.6; margin-top: 6px; margin-bottom: 8px;">${esc(isi)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
            <span class="nr-popup__src">${esc(sumber)}</span>
            <button type="button" class="nr-linkcaps" data-detail>${esc(tr('Lihat detail', 'View details'))}
                <svg class="nr-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
        </div></div>`;
}

const JENIS_LABEL: Record<string, [string, string]> = {
    banjir: ['Bahaya banjir', 'Flood hazard'], banjir_tampil: ['Kerawanan banjir', 'Flood susceptibility'], genangan: ['Genangan banjir 2020', '2020 flooding'], rth: ['Ruang terbuka hijau', 'Green open space'], poi: ['Tempat aktivitas', 'Activity spot'],
    akses: ['Akses disabilitas', 'Disability access'], trotoar: ['Trotoar', 'Sidewalk'], krl: ['Jalur KRL', 'KRL line'], mrt: ['Jalur MRT', 'MRT line'],
    lrt: ['Jalur LRT', 'LRT line'], stasiun: ['Stasiun', 'Station'], halte: ['Halte', 'Bus stop'], tol: ['Gerbang tol', 'Toll gate'],
    ganjil_genap: ['Ruas ganjil-genap', 'Odd-even road'],
    proyek: ['Proyek infrastruktur', 'Infrastructure project'], legal: ['Bidang Tanah BPN', 'BPN Land Parcel'],
    rdtr: ['Rencana Detail Tata Ruang', 'Detailed Spatial Plan'], persil: ['Bidang Tanah (ATR/BPN)', 'Land Parcel (ATR/BPN)'],
    legalitas: ['Bidang Tanah (ATR/BPN)', 'Land Parcel (ATR/BPN)'],
};

const ISTILAH_EN: Record<string, string> = {
    Kafe: 'Café', Restoran: 'Restaurant', 'Makanan cepat saji': 'Fast food', Mal: 'Mall', Perpustakaan: 'Library', rendah: 'low', sedang: 'medium', tinggi: 'high',
    'Dalam pembangunan': 'Under construction', 'dalam pembangunan': 'under construction', rencana: 'planned', Permukiman: 'Residential', permukiman: 'residential',
};
export const istilah = (v: unknown) => (bahasaAktif() === 'en' ? (ISTILAH_EN[String(v)] ?? String(v)) : String(v));

export function labelJenis(jenis: string): string {
    const l = JENIS_LABEL[jenis];
    return l ? tr(l[0], l[1]) : tr('Fitur', 'Feature');
}

export function deskripsi(p: Record<string, any>): string {
    switch (p.jenis) {
        case 'banjir': return tr(`Indeks bahaya banjir kelas ${p.kelas ?? '—'} menurut kajian InaRISK.`, `Flood hazard index: ${istilah(p.kelas ?? '—')} class, per the InaRISK assessment.`);
        case 'rth': return (p.nama ? `${p.nama}. ` : '') + tr('Ruang terbuka hijau publik.', 'Public green open space.');
        case 'poi': return p.kategori ? `${istilah(p.kategori)}.` : tr('Tempat makan dan nongkrong.', 'A place to eat and hang out.');
        case 'stasiun': return `${p.moda ? String(p.moda).toUpperCase() : tr('Stasiun', 'Station')}${p.lin ? ` · ${tr('Lin', 'Line')} ${p.lin}` : ''}.`;
        case 'krl': case 'mrt': case 'lrt': return p.nama ?? tr('Jalur kereta.', 'Railway line.');
        case 'brt': return `${tr('Koridor', 'Corridor')} ${p.koridor ?? ''}${p.nama ? ` · ${p.nama}` : ''}.`;
        case 'proyek': return `${p.status ? istilah(p.status) : tr('Proyek', 'Project')}${p.tahun ? `, target ${p.tahun}` : tr(', belum ada target tahun', ', no target year yet')}.`;
        case 'banjir_tampil': {
            const arti: Record<number, [string, string]> = { 1: ['Cukup rawan tergenang', 'Somewhat flood-prone'], 2: ['Rawan tergenang', 'Flood-prone'], 3: ['Sangat rawan tergenang', 'Highly flood-prone'] };
            const a = arti[Number(p.tingkat)] ?? arti[2];
            return tr(`${a[0]}: indeks bahaya InaRISK ${p.indeks}. Dihitung dari bentuk lahan (ketinggian, kemiringan, jarak ke sungai), bukan persen peluang dan bukan riwayat banjir.`,
                `${a[1]}: InaRISK hazard index ${String(p.indeks).replace(/,/g, '.')}. Derived from landform (elevation, slope, distance to rivers), not a probability or flood history.`);
        }
        case 'genangan': return tr('Tergenang saat banjir 1 Januari 2020, menurut peta BNPB.', 'Flooded on 1 January 2020, per the BNPB map.');
        case 'ganjil_genap': return tr('Ganjil-genap (Pergub DKI 88/2019): Senin–Jumat 06.00–10.00 & 16.00–21.00 WIB.', 'Odd-even plates (Jakarta Gov. Reg. 88/2019): Mon–Fri 06:00–10:00 & 16:00–21:00.');
        case 'akses': return tr('Fasilitas ditandai ramah kursi roda.', 'Facility marked as wheelchair-friendly.');
        case 'rdtr': return tr(`Rencana Detail Tata Ruang DKI Jakarta 2022 (${p.NAMOBJ ?? p.NAMZON_1 ?? p.ZONA ?? 'Zonasi'}).`, `Jakarta 2022 Detailed Spatial Plan (${istilah(p.NAMOBJ ?? p.NAMZON_1 ?? p.ZONA ?? 'Zoning')}).`);
        default: return p.nama ?? '';
    }
}

/** Warna titik fasilitas Ekosistem Mikro: oranye kafe & restoran, hijau taman, biru mal & belanja. */
export function warnaEkosistem(f: Feature): string {
    const p = f.properties ?? {};
    const kat = String(p.kategori ?? p.jenis ?? p.nama ?? '').toLowerCase();
    if (kat.includes('kafe') || kat.includes('cafe') || kat.includes('restoran') || kat.includes('restaurant') || kat.includes('kuliner') || kat.includes('makanan') || kat.includes('kopi') || kat.includes('coffee')) return '#d97706';
    if (kat.includes('taman') || kat.includes('rth') || kat.includes('park')) return '#22c55e';
    return '#0284c7';
}

/** Isi popup per fitur: [jenis, judul, isi, sumber]. Layer RDTR dan Legalitas punya susunan sendiri. */
export type IsiPopup = [string, string, string, string];

export function isiPopupUmum(p: Record<string, any>): IsiPopup {
    return [labelJenis(p.jenis), p.nama ?? labelJenis(p.jenis), deskripsi(p), `${tr('Sumber', 'Source')}: ${p.sumber ?? 'OSM'}`];
}

export function isiPopupRdtr(p: Record<string, any>): IsiPopup {
    const namaZona = p.NAMZON_1 ?? p.namzon_1 ?? p.NAMOBJ ?? p.NAMZON ?? p.NAMSZN ?? p.ZONA ?? p.peruntukan ?? 'Zonasi RDTR';
    const kodeZona = p.KODSZN_1 ?? p.kodszn_1 ?? p.KODZON_1 ?? p.kodzon_1 ?? p.KODZON ?? p.KODE ?? '—';
    return [tr('Rencana Detail Tata Ruang', 'Detailed Spatial Plan'), namaZona, `${tr('Kode Zona', 'Zone Code')}: ${kodeZona}`, `${tr('Sumber', 'Source')}: Satu Data DKI Jakarta`];
}

export function isiPopupLegal(p: Record<string, any>, idFitur?: unknown): IsiPopup {
    const nibRaw = p.NIB ?? p.nib ?? p.NIB_1 ?? p.nib_1 ?? p.KODNIB ?? p.kodnib ?? p.NO_BIDANG ?? p.no_bidang ?? p.NOP ?? p.nop;
    const nibText = nibRaw && String(nibRaw).trim() !== '' && String(nibRaw) !== '0' ? String(nibRaw) : null;
    const idBidang = p.id ?? idFitur ?? p.OBJECTID ?? p.objectid;
    const judulText = nibText ? `NIB: ${nibText}` : idBidang ? `Bidang Tanah #${idBidang}` : tr('Bidang Tanah BPN', 'BPN Land Parcel');

    const namaZonaRaw = p.NAMZON_1 ?? p.namzon_1 ?? p.NAMZON ?? p.namzon ?? p.NAMOBJ ?? p.namobj ?? p.ZONA ?? p.zona;
    const kodeZonaRaw = p.KODSZN_1 ?? p.kodszn_1 ?? p.KODZON_1 ?? p.kodzon_1 ?? p.KODZON ?? p.kodzon;
    let zonaFormatted: string | null = null;
    if (namaZonaRaw && String(namaZonaRaw).toLowerCase() !== 'bidang tanah') {
        const namaClean = istilah(String(namaZonaRaw).trim());
        zonaFormatted = kodeZonaRaw ? `${namaClean} (${kodeZonaRaw})` : namaClean;
    }

    const statusHak = p.HAK ?? p.hak ?? p.TIPE_HAK ?? p.tipe_hak ?? p.JNS_HAK ?? p.jns_hak ?? p.STATUS_HAK ?? p.status_hak;
    const hakText = statusHak ? String(statusHak) : tr('Hak Milik / Terdaftar', 'Registered Right');

    const luasVal = p.LUASHA ?? p.luasha ?? p.LUAS ?? p.luas ?? p.LUAS_M2 ?? p.luas_m2 ?? p['SHAPE.AREA'] ?? p.shape_area;
    const luasText = luasVal ? `${typeof luasVal === 'number' ? luasVal.toFixed(4) : luasVal} ${typeof luasVal === 'number' && luasVal < 500 ? 'ha' : 'm²'}` : null;

    const kelurahan = p.WADMKD ?? p.wadmkd ?? p.Kelurahan ?? p.kelurahan;
    const kecamatan = p.WADMKC ?? p.wadmkc ?? p.Kecamatan ?? p.kecamatan;
    const kota = p.WADMKK ?? p.wadmkk ?? p.Kota ?? p.kota;

    const rincian: string[] = [`Hak: ${hakText}`];
    if (zonaFormatted) rincian.push(`Zona: ${zonaFormatted}`);
    if (luasText) rincian.push(`Luas: ${luasText}`);
    const lokasi = [kelurahan, kecamatan, kota].filter(Boolean).map((x) => String(x).trim()).filter(Boolean).join(', ');
    if (lokasi) rincian.push(`Lokasi: ${lokasi}`);

    return [tr('Bidang Tanah (ATR/BPN)', 'Land Parcel (ATR/BPN)'), judulText, rincian.join('\n'), `${tr('Sumber', 'Source')}: Satu Data DKI Jakarta`];
}

/** Isi popup sesuai layer asal fitur. */
export function isiPopup(layer: string, p: Record<string, any>, idFitur?: unknown): IsiPopup {
    if (layer === 'rdtr') return isiPopupRdtr(p);
    if (layer === 'legalitas' || layer === 'persil') return isiPopupLegal(p, idFitur);
    return isiPopupUmum(p);
}

/** Atribusi sumber data yang tampil di pojok peta (HTML). */
export const ATRIBUSI_DATA =
    'Transit: <a href="https://data.commute.shiorilabs.id/">Commute Data Platform</a> (ODbL) · Banjir: InaRISK & BNPB · Zona: RDTR DKI 2022 · PM2.5: SatPM ACAG (CC BY 4.0) · Bus Bodetabek: Opentransum';
