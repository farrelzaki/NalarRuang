/**
 * Panel Uji Lahan (FR-23): gambar lahan → luas, zona, banjir, kecocokan persona, dan estimasi kapasitas
 * rumah tapak / kos / apartemen dengan asumsi yang bisa digeser. Terinspirasi TestFit.
 */
import { useEffect, useState } from 'react';
import type { AksesLahanMasuk, AsumsiLahan, JenisAkses, JenisZona, LahanResponse, Persona, PolaLahan, RingkasanLahan, TipeLahan, TipeUnit } from '@/types';
import { teksServer, useBahasa, type Bahasa } from '@/lib/bahasa';
import { cx, PERSONA_IDS } from '@/lib/nalar';
import { Ikon, Keadaan } from './Dasar';
import { PanelLayerLahan, type PropsLayerLahan } from './PanelLayerLahan';
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
    /** Target jumlah yang dikunci (null = jumlah dihitung dari ukuran) dan kunci ukuran. */
    targetJumlah: number | null;
    kunciUkuran: boolean;
    /** Ubah target/kunci ukuran; `asumsi` dikirim bersama saat target dilepas (nilai hasil pencarian disalin supaya desain tidak melompat). */
    onTarget: (p: { jumlah?: number | null; kunciUkuran?: boolean; asumsi?: AsumsiLahan }) => void;
    /** Pola tata letak; null = bawaan tipe. */
    pola: PolaLahan | null;
    onPola: (p: PolaLahan) => void;
    /** Undo/redo desain lahan (Ctrl+Z / Ctrl+Y). */
    bisaUndo: boolean;
    bisaRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    /** True bila zona sudah ditarik/ditambah pengguna. */
    zonaManual: boolean;
    onAturUlangZona: () => void;
    onTambahZona: (j: JenisZona) => void;
    /** Panel layer (daftar zona, kunci, sembunyi, sub-layer, isi hasil). */
    layer: PropsLayerLahan;
    /** Gerbang dan pintu yang sudah ditaruh (paling banyak 6), bisa diubah angkanya dari panel. */
    akses: AksesLahanMasuk[];
    onAkses: (a: AksesLahanMasuk[]) => void;
    onTambahAkses: (j: JenisAkses) => void;
    on3D: () => void;
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
        { kunci: 'rasio_motor', label: ['Parkir motor per kamar', 'Motorbike parking per room'], min: 0, max: 3, step: 0.1, satuan: '' },
    ],
    apartemen: [
        { kunci: 'porsi_studio', label: ['Porsi studio (24 m²)', 'Studio share (24 m²)'], min: 0, max: 1, step: 0.05, satuan: '%', persen: true },
        { kunci: 'porsi_2br', label: ['Porsi 2 kamar (54 m²)', '2-bedroom share (54 m²)'], min: 0, max: 1, step: 0.05, satuan: '%', persen: true },
        { kunci: 'sempadan', label: ['Sempadan bangunan', 'Building setback'], min: 0, max: 15, step: 0.5, satuan: 'm' },
        { kunci: 'rasio_parkir', label: ['Parkir mobil per unit', 'Car parking per unit'], min: 0, max: 2, step: 0.1, satuan: '' },
    ],
};

/** Pola per tipe (urutan sama dengan KapasitasLahan::POLA; yang pertama bawaan). */
const POLA: Record<TipeLahan, { kunci: PolaLahan; label: [string, string]; ket: [string, string] }[]> = {
    rumah: [
        { kunci: 'grid', label: ['Grid', 'Grid'], ket: ['Jalan lingkar, taman di ujung', 'Ring road, park at one end'] },
        { kunci: 'cluster', label: ['Cluster', 'Cluster'], ket: ['Kavling sampai tepi, taman di tengah', 'Plots to the edge, central park'] },
    ],
    kos: [
        { kunci: 'keliling', label: ['Keliling', 'Perimeter'], ket: ['Kamar mengelilingi ruang tengah', 'Rooms around a courtyard'] },
        { kunci: 'koridor', label: ['Koridor', 'Corridor'], ket: ['Satu blok memanjang, parkir motor di depan', 'One long block, bike parking in front'] },
    ],
    apartemen: [
        { kunci: 'keliling', label: ['Keliling', 'Perimeter'], ket: ['Gedung di tepi, taman + parkir di tengah', 'Edge building, park + parking inside'] },
        { kunci: 'wrap', label: ['Wrap', 'Wrap'], ket: ['Gedung membungkus gedung parkir', 'Units wrap a parking garage'] },
        { kunci: 'tower', label: ['Tower', 'Tower'], ket: ['Satu menara tinggi, parkir permukaan', 'One tall tower, surface parking'] },
    ],
};

const ZONA_TAMBAH: { kunci: JenisZona; label: [string, string] }[] = [
    { kunci: 'bangunan', label: ['Gedung', 'Building'] },
    { kunci: 'parkir', label: ['Parkir', 'Parking'] },
    { kunci: 'taman', label: ['Taman', 'Park'] },
];

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
                <button type="button" className="nr-iconbtn" disabled={!props.bisaUndo} onClick={props.onUndo} title={t('Urungkan (Ctrl+Z)', 'Undo (Ctrl+Z)')} aria-label={t('Urungkan', 'Undo')} style={{ color: 'var(--navy-900)', opacity: props.bisaUndo ? 1 : 0.35 }}>
                    <Ikon name="undo-2" size={16} />
                </button>
                <button type="button" className="nr-iconbtn" disabled={!props.bisaRedo} onClick={props.onRedo} title={t('Ulangi (Ctrl+Y)', 'Redo (Ctrl+Y)')} aria-label={t('Ulangi', 'Redo')} style={{ color: 'var(--navy-900)', opacity: props.bisaRedo ? 1 : 0.35 }}>
                    <Ikon name="undo-2" size={16} style={{ transform: 'scaleX(-1)' }} />
                </button>
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

            {props.adaLahan && (
                <div className="nr-lahan__pola" role="radiogroup" aria-label={t('Pola tata letak', 'Layout pattern')}>
                    {POLA[props.tipe].map((x) => {
                        const aktif = (props.pola ?? (data && data.tipe === props.tipe ? data.pola : POLA[props.tipe][0].kunci)) === x.kunci;
                        return (
                            <button key={x.kunci} type="button" role="radio" aria-checked={aktif} className={cx('nr-lahan__polabtn', aktif && 'nr-lahan__polabtn--aktif')} onClick={() => props.onPola(x.kunci)} title={t(x.ket[0], x.ket[1])}>
                                <b>{t(x.label[0], x.label[1])}</b>
                                <span>{t(x.ket[0], x.ket[1])}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {props.adaLahan && data && (
                <div className="nr-lahan__zona">
                    <section className="nr-lahan__grup" aria-labelledby="nr-lahan-zona">
                        <div className="nr-lahan__grupkepala">
                            <h3 id="nr-lahan-zona">{t('Layer', 'Layers')}</h3>
                            {props.zonaManual && (
                                <button type="button" className="nr-lahan__tautan" onClick={props.onAturUlangZona}>
                                    <Ikon name="rotate-ccw" size={12} /> {t('Kembalikan bawaan', 'Reset to default')}
                                </button>
                            )}
                        </div>
                        <p className="nr-lahan__zona-teks">{t('Tarik garis putus-putus di peta untuk mengubah tiap zona.', 'Drag the dashed outlines on the map to reshape each zone.')}</p>
                        <div className="nr-lahan__tambah">
                            {ZONA_TAMBAH.filter((z) => z.kunci !== 'parkir' || props.tipe !== 'rumah').map((z) => (
                                <button key={z.kunci} type="button" className={`nr-lahan__zonabtn nr-lahan__zonabtn--${z.kunci}`} onClick={() => props.onTambahZona(z.kunci)}>
                                    + {t(z.label[0], z.label[1])}
                                </button>
                            ))}
                        </div>
                        <PanelLayerLahan {...props.layer} />
                    </section>

                    <section className="nr-lahan__grup" aria-labelledby="nr-lahan-akses">
                        <div className="nr-lahan__grupkepala">
                            <h3 id="nr-lahan-akses">{t('Akses', 'Access')}</h3>
                            <span className="nr-lahan__grupjumlah">{props.akses.length}/6</span>
                        </div>
                        <p className="nr-lahan__zona-teks">
                            {props.tipe === 'rumah'
                                ? t('Gerbang menempel di tepi lahan dan membuka jalan masuk ke jalan lingkungan.', 'Gates snap to the site edge and open an access road to the street network.')
                                : t('Gerbang membuka jalan masuk ke parkir; pintu menempel di tepi gedung dan menjadi lobi.', 'Gates open an access road to parking; doors snap to the building and become a lobby.')}
                        </p>
                        <div className="nr-lahan__tambah">
                            <button type="button" className="nr-lahan__zonabtn nr-lahan__aksesbtn--gerbang" disabled={props.akses.length >= 6} onClick={() => props.onTambahAkses('gerbang')}>
                                + {t('Gerbang', 'Gate')}
                            </button>
                            {props.tipe !== 'rumah' && (
                                <button type="button" className="nr-lahan__zonabtn nr-lahan__aksesbtn--pintu" disabled={props.akses.length >= 6} onClick={() => props.onTambahAkses('pintu')}>
                                    + {t('Pintu gedung', 'Building door')}
                                </button>
                            )}
                        </div>
                        {props.akses.length > 0 && <DaftarAkses akses={props.akses} server={data?.akses?.features.map((f) => f.properties) ?? []} onAkses={props.onAkses} />}
                    </section>

                    <button type="button" className="nr-lahan__btn3d" onClick={props.on3D}>
                        <Ikon name="layers" size={15} /> {t('Lihat 3D', 'View 3D')}
                    </button>
                </div>
            )}

            {props.adaLahan && props.galat && <Keadaan kind="galat" title={t('Lahan belum bisa diuji', 'This site cannot be tested yet')} text={teksServer(props.galat)} />}
            {props.adaLahan && !props.galat && !data && <Keadaan kind="memuat" title={t('Menghitung lahan', 'Calculating the site')} />}
            {props.adaLahan && !props.galat && data && <IsiLahan {...props} data={data} />}
        </aside>
    );
}

function IsiLahan({ data, memuat, tipe, asumsi, onAsumsi, sesi, targetJumlah, kunciUkuran, onTarget }: Props & { data: LahanResponse }) {
    const { t, bahasa } = useBahasa();
    const k = data.kapasitas;
    const satuan: Record<string, [string, string]> = { rumah: ['rumah', 'houses'], kamar: ['kamar', 'rooms'], unit: ['unit', 'units'] };
    const [satId, satEn] = satuan[k.satuan] ?? ['unit', 'units'];
    const asumsiZona = data.intensitas.sumber === 'asumsi';
    // Hasil dari server boleh tertinggal sebentar dari tab yang dipilih; jangan menampilkan angka tipe lain.
    const sesuai = data.tipe === tipe;
    const targetAktif = targetJumlah != null;
    // Dengan target aktif: lantai selalu otomatis; ukuran (kavling, kamar, komposisi unit) otomatis kecuali dikunci.
    const UKURAN_OTOMATIS: (keyof AsumsiLahan)[] = ['lebar_kavling', 'luas_kamar', 'porsi_studio', 'porsi_2br'];
    const otomatis = (kunci: keyof AsumsiLahan) => targetAktif && !kunciUkuran && UKURAN_OTOMATIS.includes(kunci);
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
                                {k.parkir.jenis === 'motor' ? t('Parkir motor', 'Bike parking') : t('Parkir mobil', 'Car parking')} <b>{angka(k.parkir.muat, bahasa)}/{angka(k.parkir.butuh, bahasa)}</b>
                                {k.parkir.lantai > 1 && t(` (${k.parkir.lantai} lantai)`, ` (${k.parkir.lantai} levels)`)}
                                {k.parkir.muat < k.parkir.butuh && t(' (sisanya basement)', ' (rest in basement)')}
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {sesuai && data.ringkasan && <Ringkasan r={data.ringkasan} parkir={k.parkir} />}

            <div className="nr-lahan__asumsi">
                <BlokTarget data={data} tipe={tipe} asumsi={asumsi} targetJumlah={targetJumlah} kunciUkuran={kunciUkuran} onTarget={onTarget} />
                <div className="nr-eyebrow">{t('Asumsi (geser untuk mengubah)', 'Assumptions (drag to change)')}</div>
                {SLIDER[tipe].map((s) => {
                    const nilai = Number((otomatis(s.kunci) ? data.asumsi[s.kunci] : asumsi[s.kunci]) ?? data.asumsi[s.kunci] ?? s.min);
                    const tampil = s.persen ? `${Math.round(nilai * 100)}%` : `${angka(nilai, bahasa, 1)} ${s.satuan}`;
                    return (
                        <label key={s.kunci} className="nr-lahan__slider">
                            <span className="nr-lahan__slider-atas">
                                <span>{t(s.label[0], s.label[1])}</span>
                                <b>{tampil}</b>
                            </span>
                            <input type="range" min={s.min} max={s.max} step={s.step} value={nilai} disabled={otomatis(s.kunci)} onChange={(e) => onAsumsi({ ...asumsi, [s.kunci]: Number(e.target.value) })} aria-valuetext={tampil} />
                        </label>
                    );
                })}
                {tipe !== 'rumah' && sesuai && k.lantai_maks > 0 && (
                    <label className="nr-lahan__slider">
                        <span className="nr-lahan__slider-atas">
                            <span>{t('Jumlah lantai', 'Number of floors')}</span>
                            <b>{targetAktif ? k.lantai : (asumsi.lantai ?? k.lantai_maks)}{!targetAktif && asumsi.lantai == null ? t(' (maks.)', ' (max)') : ''}{targetAktif ? t(' (otomatis)', ' (auto)') : ''}</b>
                        </span>
                        <input type="range" min={1} max={k.lantai_maks} step={1} value={Math.min(targetAktif ? k.lantai : (asumsi.lantai ?? k.lantai_maks), k.lantai_maks)} disabled={targetAktif} onChange={(e) => onAsumsi({ ...asumsi, lantai: Number(e.target.value) })} />
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

/** Bar ringkasan kepatuhan seperti tabel TestFit: angka terpakai vs batas RDTR, merah bila lewat batas. */
function Ringkasan({ r, parkir }: { r: RingkasanLahan; parkir?: { butuh: number; muat: number } }) {
    const { t, bahasa } = useBahasa();
    const langgar = (k: RingkasanLahan['pelanggaran'][number]) => r.pelanggaran.includes(k);
    const sel: { kunci: string; label: string; nilai: string; batas: string | null; merah: boolean; judul: string }[] = [
        { kunci: 'kdb', label: 'KDB', nilai: `${angka(r.kdb_terpakai, bahasa, 1)}%`, batas: `${angka(r.kdb_batas, bahasa)}%`, merah: langgar('kdb'), judul: t('Koefisien Dasar Bangunan: tapak bangunan dibanding luas lahan', 'Building coverage ratio') },
        { kunci: 'klb', label: 'KLB', nilai: angka(r.klb_terpakai, bahasa, 2), batas: angka(r.klb_batas, bahasa, 2), merah: langgar('klb'), judul: t('Koefisien Lantai Bangunan: total luas lantai dibanding luas lahan', 'Floor area ratio') },
        { kunci: 'kdh', label: 'KDH', nilai: `${angka(r.kdh_terpakai, bahasa, 1)}%`, batas: r.kdh_batas != null ? `≥${angka(r.kdh_batas, bahasa)}%` : null, merah: langgar('kdh'), judul: t('Koefisien Dasar Hijau: taman dibanding luas lahan', 'Green area ratio') },
        { kunci: 'tinggi', label: t('Tinggi', 'Height'), nilai: `${angka(r.tinggi_m, bahasa, 1)} m`, batas: null, merah: false, judul: t('Perkiraan tinggi gedung', 'Estimated building height') },
    ];
    if (parkir && parkir.butuh > 0) {
        sel.push({ kunci: 'parkir', label: t('Parkir', 'Parking'), nilai: angka(parkir.muat, bahasa), batas: angka(parkir.butuh, bahasa), merah: langgar('parkir'), judul: t('Slot yang muat dibanding yang dibutuhkan', 'Stalls provided vs required') });
    }

    return (
        <div className="nr-lahan__ringkasan" aria-label={t('Ringkasan aturan', 'Rules summary')}>
            {sel.map((x) => (
                <div key={x.kunci} className={cx('nr-lahan__ringsel', x.merah && 'nr-lahan__ringsel--merah')} title={x.judul}>
                    <span className="nr-lahan__ringlabel">{x.label}</span>
                    <b>{x.nilai}</b>
                    {x.batas && <span className="nr-lahan__ringbatas">{t('batas', 'limit')} {x.batas}</span>}
                </div>
            ))}
        </div>
    );
}

/**
 * Daftar gerbang dan pintu dengan lebar dan panjang yang bisa diketik sendiri.
 * Gerbang: lebar gerbang + panjang jalan masuk. Pintu: lebar bukaan + kedalaman lobi ke dalam gedung.
 * Panjang kosong = otomatis (angka otomatis dari server tampil sebagai petunjuk).
 */
function DaftarAkses({ akses, server, onAkses }: { akses: AksesLahanMasuk[]; server: { id: number; jenis: string; lebar: number; panjang?: number; otomatis?: boolean }[]; onAkses: (a: AksesLahanMasuk[]) => void }) {
    const { t, bahasa } = useBahasa();
    const ubah = (i: number, kunci: 'lebar' | 'panjang', teks: string) => {
        const n = Number(teks.replace(',', '.'));
        onAkses(
            akses.map((a, k) => {
                if (k !== i) return a;
                const salin = { ...a };
                if (teks.trim() === '' || !Number.isFinite(n)) delete salin[kunci];
                else salin[kunci] = n;
                return salin;
            }),
        );
    };
    let nGerbang = 0;
    let nPintu = 0;

    return (
        <ul className="nr-lahan__aksesdaftar" aria-label={t('Gerbang dan pintu', 'Gates and doors')}>
            {akses.map((a, i) => {
                const s = server.find((x) => x.id === i && x.jenis === a.jenis);
                const gerbang = a.jenis === 'gerbang';
                const nomor = gerbang ? ++nGerbang : ++nPintu;
                const otomatis = a.panjang === undefined;
                return (
                    <li key={i} className={`nr-lahan__aksesbaris nr-lahan__aksesbaris--${a.jenis}`}>
                        <div className="nr-lahan__akseskepala">
                            <i aria-hidden />
                            <b>{gerbang ? t(`Gerbang ${nomor}`, `Gate ${nomor}`) : t(`Pintu ${nomor}`, `Door ${nomor}`)}</b>
                            <span>{gerbang ? t('jalan masuk', 'access road') : t('lobi gedung', 'building lobby')}</span>
                            <button type="button" onClick={() => onAkses(akses.filter((_, k) => k !== i))} aria-label={t('Hapus', 'Remove')} title={t('Hapus', 'Remove')}>
                                ×
                            </button>
                        </div>
                        <div className="nr-lahan__aksesisian">
                            <label>
                                <span>{t('Lebar', 'Width')}</span>
                                <span className="nr-lahan__aksesangka">
                                    <input
                                        type="number"
                                        min={gerbang ? 2.5 : 1.5}
                                        max={gerbang ? 30 : 20}
                                        step={0.5}
                                        inputMode="decimal"
                                        value={a.lebar ?? ''}
                                        placeholder={s ? angka(s.lebar, bahasa, 1) : ''}
                                        onChange={(e) => ubah(i, 'lebar', e.target.value)}
                                        aria-label={gerbang ? t('Lebar gerbang (m)', 'Gate width (m)') : t('Lebar pintu (m)', 'Door width (m)')}
                                    />
                                    <em>m</em>
                                </span>
                            </label>
                            <label>
                                <span>
                                    {gerbang ? t('Panjang', 'Length') : t('Kedalaman', 'Depth')}
                                    {otomatis && <small>{t('otomatis', 'auto')}</small>}
                                </span>
                                <span className="nr-lahan__aksesangka">
                                    <input
                                        type="number"
                                        min={2}
                                        max={gerbang ? 300 : 40}
                                        step={1}
                                        inputMode="decimal"
                                        value={a.panjang ?? ''}
                                        placeholder={s?.panjang != null ? angka(s.panjang, bahasa, 0) : ''}
                                        onChange={(e) => ubah(i, 'panjang', e.target.value)}
                                        aria-label={gerbang ? t('Panjang jalan masuk (m), kosong = otomatis', 'Access road length (m), empty = automatic') : t('Kedalaman lobi (m), kosong = otomatis', 'Lobby depth (m), empty = automatic')}
                                    />
                                    <em>m</em>
                                </span>
                            </label>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * Target jumlah (kebalikan dari hitungan biasa): pengguna mengetik jumlah kamar/unit/rumah yang diinginkan, lalu lantai dan ukuran
 * menyesuaikan. "Kunci jumlah" menjaga jumlah itu walau lahan atau zona diubah; "kunci ukuran" menahan ukurannya (hanya lantai yang
 * menyesuaikan). Melepas kunci jumlah menyalin nilai hasil pencarian ke asumsi supaya desain tidak melompat.
 */
function BlokTarget({ data, tipe, asumsi, targetJumlah, kunciUkuran, onTarget }: Pick<Props, 'tipe' | 'asumsi' | 'targetJumlah' | 'kunciUkuran' | 'onTarget'> & { data: LahanResponse }) {
    const { t, bahasa } = useBahasa();
    const k = data.kapasitas;
    const aktif = targetJumlah != null;
    const [teks, setTeks] = useState(aktif ? String(targetJumlah) : '');
    // Ikuti perubahan dari luar (urungkan/ulangi, ganti tipe).
    useEffect(() => {
        setTeks(targetJumlah != null ? String(targetJumlah) : '');
    }, [targetJumlah]);

    const satuan: [string, string] = k.satuan === 'rumah' ? ['rumah', 'houses'] : k.satuan === 'kamar' ? ['kamar', 'rooms'] : ['unit', 'units'];
    const labelUkuran: [string, string] = tipe === 'rumah' ? ['Kunci ukuran kavling', 'Lock plot size'] : tipe === 'kos' ? ['Kunci ukuran kamar', 'Lock room size'] : ['Kunci komposisi unit', 'Lock unit mix'];
    const info = data.target;

    const lepas = () => {
        const hasil: AsumsiLahan = { ...asumsi };
        const d = data.asumsi;
        for (const kunci of ['lebar_kavling', 'luas_kamar', 'porsi_studio', 'porsi_2br', 'lantai'] as const) {
            const nilai = d[kunci];
            if (nilai !== undefined && nilai !== null) (hasil as Record<string, number | null | undefined>)[kunci] = nilai;
        }
        onTarget({ jumlah: null, asumsi: hasil });
    };

    const ukuranTeks = (u: NonNullable<LahanResponse['target']>['ukuran']): string => {
        if (u.nama === 'lebar_kavling') return t(`kavling lebar ${angka(u.nilai, bahasa, 1)} m`, `plot width ${angka(u.nilai, bahasa, 1)} m`);
        if (u.nama === 'luas_kamar') return t(`kamar ${angka(u.nilai, bahasa, 1)} m²`, `rooms ${angka(u.nilai, bahasa, 1)} m²`);
        return t(`rata-rata unit ${angka(u.nilai, bahasa, 1)} m²`, `average unit ${angka(u.nilai, bahasa, 1)} m²`);
    };

    return (
        <div className="nr-lahan__target">
            <div className="nr-eyebrow">{t('Target jumlah', 'Target count')}</div>
            <div className="nr-lahan__targetbaris">
                <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50000}
                    value={teks}
                    placeholder={String(k.jumlah)}
                    aria-label={t(`Target jumlah ${satuan[0]}`, `Target number of ${satuan[1]}`)}
                    onChange={(e) => {
                        setTeks(e.target.value);
                        const n = parseInt(e.target.value, 10);
                        // Kolom kosong tidak melepas target (supaya bisa menghapus lalu mengetik ulang); melepas saat meninggalkan kolom.
                        if (Number.isFinite(n) && n >= 1) onTarget({ jumlah: Math.min(50000, n) });
                    }}
                    onBlur={() => {
                        if (teks.trim() === '' && aktif) lepas();
                    }}
                />
                <span>{t(satuan[0], satuan[1])}</span>
            </div>
            <label className="nr-layer__sisa">
                <input type="checkbox" checked={aktif} onChange={(e) => (e.target.checked ? onTarget({ jumlah: Math.max(1, k.jumlah) }) : lepas())} />
                <span>{t('Kunci jumlah (lantai dan ukuran menyesuaikan)', 'Lock count (floors and size adapt)')}</span>
            </label>
            <label className="nr-layer__sisa">
                <input type="checkbox" checked={kunciUkuran} onChange={(e) => onTarget({ kunciUkuran: e.target.checked })} />
                <span>{t(labelUkuran[0], labelUkuran[1])}</span>
            </label>
            {aktif && info && info.tercapai && (
                <p className="nr-layer__catatan">
                    {t(`Tercapai: ${angka(info.jumlah, bahasa)} ${satuan[0]}`, `Reached: ${angka(info.jumlah, bahasa)} ${satuan[1]}`)}
                    {info.lantai ? t(`, ${info.lantai} lantai`, `, ${info.lantai} floors`) : ''}, {ukuranTeks(info.ukuran)}
                </p>
            )}
            {aktif && info && !info.tercapai && (
                <p className="nr-lahan__targetgagal" role="alert">
                    {t(`Target ${angka(info.diminta, bahasa)} ${satuan[0]} tidak muat. Terbanyak ${angka(info.maks, bahasa)} ${satuan[0]}`, `Target of ${angka(info.diminta, bahasa)} ${satuan[1]} does not fit. At most ${angka(info.maks, bahasa)} ${satuan[1]}`)}
                    {kunciUkuran ? t(' (ukuran dikunci).', ' (size locked).') : '.'}{' '}
                    {info.maks > 0 && (
                        <button type="button" className="nr-lahan__tautan" onClick={() => onTarget({ jumlah: info.maks })}>
                            {t('Pakai maksimum', 'Use the maximum')}
                        </button>
                    )}
                </p>
            )}
        </div>
    );
}
