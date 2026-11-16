/**
 * Panel Uji Lahan (FR-23): gambar lahan → luas, zona, banjir, kecocokan persona, dan estimasi kapasitas
 * rumah tapak / kos / apartemen dengan asumsi yang bisa digeser. Terinspirasi TestFit.
 */
import type { AsumsiLahan, LahanResponse, Persona, TipeLahan, TipeUnit } from '@/types';
import { teksServer, useBahasa, type Bahasa } from '@/lib/bahasa';
import { cx, PERSONA_IDS } from '@/lib/nalar';
import { Ikon, Keadaan } from './Dasar';
import { BarisSkor, KartuKesimpulan, kalimatWilayah } from './DetailLokasi';

export type ModeGambar = 'kotak' | 'poligon';

type Props = {
    mode: ModeGambar;
    onMode: (m: ModeGambar) => void;
    adaLahan: boolean;
    data: LahanResponse | null;
    memuat: boolean;
    galat: string | null;
    tipe: TipeLahan;
    onTipe: (t: TipeLahan) => void;
    asumsi: AsumsiLahan;
    onAsumsi: (a: AsumsiLahan) => void;
    sesi: Persona[];
    onGambarUlang: () => void;
    onSelesaiPoligon: () => void;
    onTutup: () => void;
};

const TIPE: { kunci: TipeLahan; label: [string, string] }[] = [
    { kunci: 'rumah', label: ['Rumah tapak', 'Landed house'] },
    { kunci: 'kos', label: ['Kos', 'Boarding house'] },
    { kunci: 'apartemen', label: ['Apartemen', 'Apartment'] },
];

type Slider = { kunci: keyof AsumsiLahan; label: [string, string]; min: number; max: number; step: number; satuan: string; persen?: boolean };

/** Rentang mengikuti KapasitasLahan::RENTANG di server. */
const SLIDER: Record<TipeLahan, Slider[]> = {
    rumah: [
        { kunci: 'lebar_kavling', label: ['Lebar kavling', 'Plot width'], min: 4, max: 20, step: 0.5, satuan: 'm' },
        { kunci: 'panjang_kavling', label: ['Panjang kavling', 'Plot depth'], min: 8, max: 30, step: 0.5, satuan: 'm' },
        { kunci: 'lebar_jalan', label: ['Lebar jalan', 'Road width'], min: 4, max: 15, step: 0.5, satuan: 'm' },
    ],
    kos: [
        { kunci: 'luas_kamar', label: ['Luas kamar', 'Room size'], min: 6, max: 30, step: 1, satuan: 'm²' },
        { kunci: 'sempadan', label: ['Sempadan bangunan', 'Building setback'], min: 0, max: 15, step: 0.5, satuan: 'm' },
        { kunci: 'rasio_parkir', label: ['Parkir mobil per kamar', 'Car parking per room'], min: 0, max: 2, step: 0.1, satuan: '' },
    ],
    apartemen: [
        { kunci: 'porsi_studio', label: ['Porsi studio (24 m²)', 'Studio share (24 m²)'], min: 0, max: 1, step: 0.05, satuan: '%', persen: true },
        { kunci: 'porsi_2br', label: ['Porsi 2 kamar (54 m²)', '2-bedroom share (54 m²)'], min: 0, max: 1, step: 0.05, satuan: '%', persen: true },
        { kunci: 'sempadan', label: ['Sempadan bangunan', 'Building setback'], min: 0, max: 15, step: 0.5, satuan: 'm' },
        { kunci: 'rasio_parkir', label: ['Parkir mobil per unit', 'Car parking per unit'], min: 0, max: 2, step: 0.1, satuan: '' },
    ],
};

const TIPE_UNIT: { kunci: TipeUnit; label: [string, string] }[] = [
    { kunci: 'studio', label: ['Studio', 'Studio'] },
    { kunci: '1br', label: ['1 kamar', '1 bedroom'] },
    { kunci: '2br', label: ['2 kamar', '2 bedrooms'] },
    { kunci: 'kamar', label: ['Kamar kos', 'Boarding room'] },
];

function angka(n: number, bahasa: Bahasa, desimal = 0): string {
    return n.toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID', { minimumFractionDigits: 0, maximumFractionDigits: desimal });
}

function luasTeks(m2: number, bahasa: Bahasa): string {
    return m2 >= 10000 ? `${angka(m2 / 10000, bahasa, 2)} ha` : `${angka(m2, bahasa)} m²`;
}

function IkonMode({ mode }: { mode: ModeGambar }) {
    return mode === 'kotak' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="14" rx="1" />
        </svg>
    ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9 11 4l9 5-3 11H7z" />
        </svg>
    );
}

export function PanelLahan(props: Props) {
    const { t } = useBahasa();
    const { data, mode } = props;

    return (
        <aside className="nr-inspector nr-lahan nr-float" aria-labelledby="nr-lahan-judul">
            <div className="nr-inspector__head">
                <h2 className="nr-inspector__title" id="nr-lahan-judul">{t('Uji Lahan', 'Site Test')}</h2>
                <button type="button" className="nr-iconbtn" aria-label={t('Tutup Uji Lahan', 'Close Site Test')} onClick={props.onTutup} style={{ color: 'var(--navy-900)' }}>
                    <Ikon name="x" size={18} />
                </button>
            </div>

            <div className="nr-lahan__alat">
                <div className="nr-iso__modes nr-lahan__mode" role="group" aria-label={t('Cara menggambar lahan', 'How to draw the site')}>
                    {(['kotak', 'poligon'] as ModeGambar[]).map((m) => (
                        <button key={m} type="button" className="nr-iso__modebtn" aria-pressed={mode === m} onClick={() => props.onMode(m)}>
                            <IkonMode mode={m} />
                            <span>{m === 'kotak' ? t('Kotak', 'Box') : t('Poligon', 'Polygon')}</span>
                        </button>
                    ))}
                </div>
                <button type="button" className="nr-lahan__ulang" onClick={props.onGambarUlang} title={t('Gambar ulang', 'Redraw')}>
                    <Ikon name="rotate-ccw" size={14} />
                    <span>{t('Ulang', 'Reset')}</span>
                </button>
            </div>

            {!props.adaLahan && (
                <div className="nr-lahan__petunjuk" role="status">
                    {mode === 'kotak' ? (
                        <p>{t('Tarik titik sudut kotak oranye untuk mengubah ukuran lahan, atau tarik ikon tengah untuk memindahkannya.', 'Drag the orange corners to resize the site, or drag the centre icon to move it.')}</p>
                    ) : (
                        <>
                            <p>{t('Klik sudut-sudut lahan di peta. Klik titik pertama untuk menutup, lalu tarik titiknya untuk merapikan.', 'Click the site corners on the map. Click the first point to close it, then drag the points to adjust.')}</p>
                            <button type="button" className="nr-btn nr-lahan__selesai" onClick={props.onSelesaiPoligon}>
                                {t('Selesai menggambar', 'Finish drawing')}
                            </button>
                        </>
                    )}
                </div>
            )}

            {props.adaLahan && (
                <div className="nr-lahan__tipe" role="tablist" aria-label={t('Tipe bangunan', 'Building type')}>
                    {TIPE.map((x) => (
                        <button key={x.kunci} type="button" role="tab" aria-selected={props.tipe === x.kunci} className={cx('nr-lahan__tab', props.tipe === x.kunci && 'nr-lahan__tab--aktif')} onClick={() => props.onTipe(x.kunci)}>
                            {t(x.label[0], x.label[1])}
                        </button>
                    ))}
                </div>
            )}

            {props.adaLahan && props.galat && <Keadaan kind="galat" title={t('Lahan belum bisa diuji', 'This site cannot be tested yet')} text={teksServer(props.galat)} />}
            {props.adaLahan && !props.galat && !data && <Keadaan kind="memuat" title={t('Menghitung lahan', 'Calculating the site')} />}
            {props.adaLahan && !props.galat && data && <IsiLahan {...props} data={data} />}
        </aside>
    );
}

function IsiLahan({ data, memuat, tipe, asumsi, onAsumsi, sesi }: Props & { data: LahanResponse }) {
    const { t, bahasa } = useBahasa();
    const k = data.kapasitas;
    const satuan: Record<string, [string, string]> = { rumah: ['rumah', 'houses'], kamar: ['kamar', 'rooms'], unit: ['unit', 'units'] };
    const [satId, satEn] = satuan[k.satuan] ?? ['unit', 'units'];
    const asumsiZona = data.intensitas.sumber === 'asumsi';
    // Hasil dari server boleh tertinggal sebentar dari tab yang dipilih; jangan menampilkan angka tipe lain.
    const sesuai = data.tipe === tipe;
    const lebar = data.asumsi.lebar_kavling ?? 6;
    const panjang = data.asumsi.panjang_kavling ?? 15;

    const kesimpulan = sesi.map((p) => kalimatWilayah(p, data.match[p], data.jumlah_fasilitas[p] ?? 0, bahasa, data.terdekat[p] ?? null));

    return (
        <div className={cx('nr-lahan__isi', memuat && 'nr-lahan__isi--memuat')} aria-busy={memuat}>
            <div className={cx('nr-lahan__hasil', !sesuai && 'nr-lahan__hasil--lama')}>
                <div className="nr-eyebrow">{t('Estimasi kapasitas', 'Estimated capacity')}</div>
                <div className="nr-lahan__angka">
                    <span className="nr-lahan__jumlah">{angka(k.jumlah, bahasa)}</span>
                    <span className="nr-lahan__satuan">{t(satId, satEn)}</span>
                    {memuat && <Ikon name="loader-circle" size={16} className="nr-spin" label={t('Menghitung ulang', 'Recalculating')} />}
                </div>
                <ul className="nr-lahan__rinci">
                    {data.tipe === 'rumah' ? (
                        <>
                            <li>{t(`Kavling ${angka(lebar, bahasa, 1)} × ${angka(panjang, bahasa, 1)} m (${angka(k.luas_kavling_m2 ?? 0, bahasa)} m²)`, `Plots ${angka(lebar, bahasa, 1)} × ${angka(panjang, bahasa, 1)} m (${angka(k.luas_kavling_m2 ?? 0, bahasa)} m²)`)}</li>
                            <li>{t(`Bangunan ±${angka(k.luas_bangunan_per_unit_m2 ?? 0, bahasa)} m² per rumah, ${k.lantai} lantai`, `±${angka(k.luas_bangunan_per_unit_m2 ?? 0, bahasa)} m² per house, ${k.lantai} floor(s)`)}</li>
                            {k.porsi_jalan_fasum != null && <li>{t(`Jalan & sisa lahan ${angka(k.porsi_jalan_fasum * 100, bahasa)}%`, `Roads & leftover land ${angka(k.porsi_jalan_fasum * 100, bahasa)}%`)}</li>}
                        </>
                    ) : (
                        <>
                            <li>{t(`${k.lantai} lantai (maks. ${k.lantai_maks}), tapak ${luasTeks(k.luas_tapak_m2, bahasa)}`, `${k.lantai} floors (max ${k.lantai_maks}), footprint ${luasTeks(k.luas_tapak_m2, bahasa)}`)}</li>
                            <li>{t(`Total lantai ${luasTeks(k.luas_lantai_m2, bahasa)}, ${angka(k.luas_per_unit_m2 ?? 0, bahasa)} m² per ${satId}`, `Total floor area ${luasTeks(k.luas_lantai_m2, bahasa)}, ${angka(k.luas_per_unit_m2 ?? 0, bahasa)} m² per ${satEn.replace(/s$/, '')}`)}</li>
                        </>
                    )}
                    {k.unit_per_lantai != null && k.unit_per_lantai > 0 && <li>{t(`${angka(k.unit_per_lantai, bahasa)} ${satId} per lantai`, `${angka(k.unit_per_lantai, bahasa)} ${satEn} per floor`)}</li>}
                    {k.kepadatan_per_ha != null && <li>{t(`Kepadatan ${angka(k.kepadatan_per_ha, bahasa, 1)} ${satId}/ha`, `Density ${angka(k.kepadatan_per_ha, bahasa, 1)} ${satEn}/ha`)}</li>}
                </ul>
                {sesuai && data.tipe !== 'rumah' && (
                    <ul className="nr-lahan__legenda" aria-label={t('Komposisi unit', 'Unit mix')}>
                        {TIPE_UNIT.filter((u) => (k.komposisi?.[u.kunci] ?? 0) > 0).map((u) => (
                            <li key={u.kunci}>
                                <i className={`nr-lahan__warna nr-lahan__warna--${u.kunci}`} aria-hidden />
                                {t(u.label[0], u.label[1])} <b>{angka(k.komposisi?.[u.kunci] ?? 0, bahasa)}</b>
                            </li>
                        ))}
                        <li>
                            <i className="nr-lahan__warna nr-lahan__warna--taman" aria-hidden />
                            {t('Taman', 'Courtyard')}
                        </li>
                        {k.parkir && k.parkir.butuh > 0 && (
                            <li className={cx(k.parkir.muat < k.parkir.butuh && 'nr-lahan__kurang')}>
                                <i className="nr-lahan__warna nr-lahan__warna--parkir" aria-hidden />
                                {t('Parkir', 'Parking')} <b>{angka(k.parkir.muat, bahasa)}/{angka(k.parkir.butuh, bahasa)}</b>
                                {k.parkir.muat < k.parkir.butuh && t(' (sisanya basement)', ' (rest in basement)')}
                            </li>
                        )}
                    </ul>
                )}
            </div>

            <div className="nr-lahan__asumsi">
                <div className="nr-eyebrow">{t('Asumsi (geser untuk mengubah)', 'Assumptions (drag to change)')}</div>
                {SLIDER[tipe].map((s) => {
                    const nilai = Number(asumsi[s.kunci] ?? data.asumsi[s.kunci] ?? s.min);
                    const tampil = s.persen ? `${Math.round(nilai * 100)}%` : `${angka(nilai, bahasa, 1)} ${s.satuan}`;
                    return (
                        <label key={s.kunci} className="nr-lahan__slider">
                            <span className="nr-lahan__slider-atas">
                                <span>{t(s.label[0], s.label[1])}</span>
                                <b>{tampil}</b>
                            </span>
                            <input type="range" min={s.min} max={s.max} step={s.step} value={nilai} onChange={(e) => onAsumsi({ ...asumsi, [s.kunci]: Number(e.target.value) })} aria-valuetext={tampil} />
                        </label>
                    );
                })}
                {tipe !== 'rumah' && sesuai && k.lantai_maks > 0 && (
                    <label className="nr-lahan__slider">
                        <span className="nr-lahan__slider-atas">
                            <span>{t('Jumlah lantai', 'Number of floors')}</span>
                            <b>{asumsi.lantai ?? k.lantai_maks}{asumsi.lantai == null ? t(' (maks.)', ' (max)') : ''}</b>
                        </span>
                        <input type="range" min={1} max={k.lantai_maks} step={1} value={Math.min(asumsi.lantai ?? k.lantai_maks, k.lantai_maks)} onChange={(e) => onAsumsi({ ...asumsi, lantai: Number(e.target.value) })} />
                    </label>
                )}
            </div>

            <div className="nr-layer-summary" aria-label={t('Data lahan', 'Site data')}>
                <span className="nr-legend">
                    <b>{t('Luas', 'Area')}</b>&nbsp;{luasTeks(data.luas_m2, bahasa)} · {t('keliling', 'perimeter')} {angka(data.keliling_m, bahasa)} m
                </span>
                <span className="nr-legend">{teksServer(data.wilayah)}</span>
                <span className="nr-legend">
                    <b>{t('Zona', 'Zone')}</b>&nbsp;
                    {data.zonasi ? `${data.zonasi.zona}${data.zonasi.subzona ? ` (${data.zonasi.subzona})` : ''}, ${angka(data.zonasi.porsi * 100, bahasa)}% ${t('lahan', 'of site')}` : t('belum ada data zonasi resmi', 'no official zoning data')}
                </span>
                <span className={cx('nr-legend', asumsiZona && 'nr-lahan__asumsi-zona')}>
                    <b>KDB</b>&nbsp;{angka(data.intensitas.kdb, bahasa)}% · <b>KLB</b>&nbsp;{angka(data.intensitas.klb, bahasa, 2)}
                    &nbsp;({asumsiZona ? t('asumsi, bukan aturan resmi', 'assumption, not an official rule') : `RDTR DKI 2022${data.intensitas.alternatif === 2 ? t(', alternatif 2', ', option 2') : ''}`})
                </span>
                <span className="nr-legend">
                    <b>{t('Banjir', 'Flood')}</b>&nbsp;
                    {data.banjir.porsi_rawan > 0
                        ? t(`${angka(data.banjir.porsi_rawan * 100, bahasa)}% lahan rawan tergenang (InaRISK)`, `${angka(data.banjir.porsi_rawan * 100, bahasa)}% of the site is flood-prone (InaRISK)`)
                        : t('tidak di area rawan tergenang InaRISK', 'outside InaRISK flood-prone areas')}
                    {data.banjir.genangan_2020 ? t('; sebagian tergenang 1 Jan 2020', '; partly flooded on 1 Jan 2020') : ''}
                </span>
            </div>

            <div className="nr-inspector__section" role="list" aria-label={t('Kecocokan gaya hidup', 'Lifestyle match')}>
                <h4 className="nr-inspector__subtitle">{t('Kecocokan Gaya Hidup', 'Lifestyle Match')}</h4>
                {PERSONA_IDS.map((p) => (
                    <BarisSkor key={p} persona={p} match={data.match[p]} sesi={sesi.includes(p)} />
                ))}
            </div>

            {kesimpulan.length > 0 && <KartuKesimpulan kalimat={kesimpulan} />}

            {data.catatan.map((c) => (
                <p key={c} className="nr-summary__note" role="note">
                    {teksServer(c)}
                </p>
            ))}
        </div>
    );
}
