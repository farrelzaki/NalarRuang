/** Drawer menu (8.14, FR-18–21) dan dialog persona onboarding (8.15, FR-13, FR-14). */
import { useEffect, useRef, useState } from 'react';
import type { Persona } from '@/types';
import { PilihBahasa, useBahasa, type Dwi } from '@/lib/bahasa';
import { PERSONA, PERSONA_IDS, SUMBER, type Simbol } from '@/lib/nalar';
import { Ikon, SimbolPeta, Wordmark } from './Dasar';

export type TabMenu = 'persona' | 'legenda' | 'tentang';

type DrawerProps = {
    tab: TabMenu;
    onTab: (t: TabMenu) => void;
    terpilih: Persona[];
    onUbahPersona: (p: Persona) => void;
    onTutup: () => void;
};

export function DrawerMenu({ tab, onTab, terpilih, onUbahPersona, onTutup }: DrawerProps) {
    const { t } = useBahasa();
    const tutupRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        tutupRef.current?.focus();
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onTutup();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onTutup]);

    const tabs: [TabMenu, string, string][] = [
        ['persona', 'Persona', 'users'],
        ['legenda', t('Legenda', 'Legend'), 'map'],
        ['tentang', t('Tentang', 'About'), 'info'],
    ];
    return (
        <div className="nr-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="nr-drawer__head">
                <Wordmark />
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <PilihBahasa />
                    <button ref={tutupRef} type="button" className="nr-drawer__close" aria-label={t('Tutup menu', 'Close menu')} onClick={onTutup}>
                        <Ikon name="x" size={15} />
                    </button>
                </span>
            </div>
            <div className="nr-tabs" role="tablist">
                {tabs.map(([k, label, ikon]) => (
                    <button key={k} type="button" className="nr-tab" role="tab" aria-selected={tab === k} onClick={() => onTab(k)}>
                        <Ikon name={ikon} size={12} />
                        {label}
                    </button>
                ))}
            </div>
            <div className="nr-drawer__body" role="tabpanel">
                {tab === 'persona' && (
                    <>
                        <h3 className="nr-drawer__heading">{t('Ubah Preferensi Persona', 'Change Persona Preferences')}</h3>
                        <p className="nr-drawer__text">{t('Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.', 'Choose the personas that reflect your daily life. Recommendations on the map update instantly.')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {PERSONA_IDS.map((p) => {
                                const on = terpilih.includes(p);
                                return (
                                    <button key={p} type="button" className="nr-pcard" role="checkbox" aria-checked={on} onClick={() => onUbahPersona(p)}>
                                        <span className="nr-pcard__box">
                                            <Ikon name={on ? 'check' : PERSONA[p].ikon} size={14} strokeWidth={on ? 3 : 2} />
                                        </span>
                                        <span>
                                            <span className="nr-pcard__name">{PERSONA[p].label}</span>
                                            <span className="nr-pcard__desc">{t(PERSONA[p].desc)}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
                {tab === 'legenda' && <IsiLegenda />}
                {tab === 'tentang' && <IsiTentang />}
            </div>
        </div>
    );
}

function IsiLegenda() {
    const { t } = useBahasa();
    const baris: [Dwi, Simbol[], Dwi | null][] = [
        [['Historis & Risiko', 'History & Risk'], ['banjir'], ['Area rawan banjir historis (merah).', 'Historical flood-prone area (red).']],
        [['Ekosistem Mikro', 'Micro Ecosystem'], ['hijau'], ['Ruang hijau, taman & fasilitas gaya hidup (hijau).', 'Green space, parks & lifestyle amenities (green).']],
        [['Legalitas Lahan', 'Land Legality'], ['legal'], ['Pemetaan zona bidang tanah legal (ungu).', 'Legal land parcel zones (purple).']],
        [['Mobilitas & Transit', 'Mobility & Transit'], ['mrt', 'krl-bogor', 'krl-rangkas', 'lrt', 'stasiun', 'waktu'], null],
        [['Inklusivitas', 'Inclusivity'], ['trotoar', 'akses'], ['Trotoar layak (biru putus-putus) & titik akses disabilitas (biru).', 'Proper sidewalks (dashed blue) & disability access points (blue).']],
    ];
    return (
        <>
            <h3 className="nr-drawer__heading">{t('Legenda Peta', 'Map Legend')}</h3>
            <p className="nr-drawer__text">{t('Panduan membaca simbol dan warna pada Visual Explorer.', 'A guide to the symbols and colours in the Visual Explorer.')}</p>
            {baris.map(([judul, simbol, teks]) => (
                <div key={judul[0]} className="nr-lgrow">
                    <span className="nr-lgrow__syms">
                        {simbol.map((s) => (
                            <SimbolPeta key={s} kind={s} />
                        ))}
                    </span>
                    <span>
                        <span className="nr-lgrow__title">{t(judul)}</span>
                        {teks ? (
                            <span className="nr-lgrow__text">{t(teks)}</span>
                        ) : (
                            <>
                                <span className="nr-lgrow__text">{t('MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih).', 'MRT (solid orange) · KRL Red · KRL Green · LRT (solid purple) · Station (white dot).')}</span>
                                <span className="nr-lgrow__text" style={{ marginTop: 4 }}>
                                    {t('Garis putus-putus ungu = ', 'Dashed purple line = ')}
                                    <b>{t('Mesin Waktu', 'Time Machine')}</b> {t('(proyek 2026–2030).', '(2026–2030 projects).')}
                                </span>
                            </>
                        )}
                    </span>
                </div>
            ))}
        </>
    );
}

function Istilah({ judul, children }: { judul: string; children: string }) {
    return (
        <div className="nr-term">
            <p className="nr-term__title">{judul}</p>
            <p className="nr-term__text">{children}</p>
        </div>
    );
}

function IsiTentang() {
    const { t } = useBahasa();
    return (
        <>
            <h3 className="nr-drawer__heading">{t('Tentang NalarRuang 2.0', 'About NalarRuang 2.0')}</h3>
            <p className="nr-drawer__text" style={{ color: 'var(--ink-55)' }}>
                {t(
                    'Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka.',
                    'A spatial analytics platform that helps you choose where to live in Greater Jakarta (Jabodetabek) using open data.',
                )}
            </p>
            <Istilah judul="Isochrone">{t('Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik.', 'The area reachable within a given time from a single point.')}</Istilah>
            <Istilah judul="Point Inspector">{t('Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta.', 'An area evaluation panel (0–3 stars) that appears when you click the map.')}</Istilah>
            <Istilah judul="Commute Simulator">{t('Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum.', 'Estimated time & cost calculator: private vehicle vs public transport.')}</Istilah>
            <Istilah judul="Persona Grading">{t('3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok.', '3★ Great match · 2★ Fair · 1★ Poor match.')}</Istilah>
            <Istilah judul={t('Sumber data', 'Data sources')}>{SUMBER.join(' · ') + t('. Peta dasar © OpenStreetMap contributors.', '. Basemap © OpenStreetMap contributors.')}</Istilah>
            <Istilah judul={t('Catatan', 'Note')}>
                {t(
                    'Skor dan rekomendasi merupakan estimasi dari data sekunder publik, bukan penilaian resmi. Versi demo: sebagian atribut (mis. kualitas udara, status lahan) masih data contoh. Dibuat oleh Kelompok 4 — Developer Rumah, IPB University.',
                    'Scores and recommendations are estimates from public secondary data, not official assessments. Demo version: some attributes (e.g. air quality, land status) are still sample data. Built by Group 4 — Developer Rumah, IPB University.',
                )}
            </Istilah>
        </>
    );
}

export function DialogPersona({ awal, onMulai }: { awal: Persona[]; onMulai: (p: Persona[]) => void }) {
    const { t } = useBahasa();
    const [terpilih, setTerpilih] = useState<Persona[]>(awal);
    const [peringatan, setPeringatan] = useState(false);
    const kartuPertama = useRef<HTMLButtonElement>(null);
    useEffect(() => kartuPertama.current?.focus(), []);

    const balik = (p: Persona) => {
        setPeringatan(false);
        setTerpilih((t) => (t.includes(p) ? t.filter((x) => x !== p) : [...t, p]));
    };

    return (
        <div className="nr-dialog" role="dialog" aria-modal="true" aria-labelledby="nr-dialog-title">
            <PilihBahasa className="nr-dialog__lang" />
            <div>
                <h2 className="nr-dialog__title" id="nr-dialog-title">
                    {t('Pilih Persona mu!', 'Choose your Persona!')}
                </h2>
                <p className="nr-dialog__lead">{t('Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.', 'Choose at least one persona that describes your daily life to get well-targeted housing recommendations.')}</p>
            </div>
            <div>
                <div className="nr-dialog__cards">
                    {PERSONA_IDS.map((p, i) => {
                        const info = PERSONA[p];
                        const on = terpilih.includes(p);
                        return (
                            <button key={p} ref={i === 0 ? kartuPertama : undefined} type="button" className="nr-dcard" role="checkbox" aria-checked={on} onClick={() => balik(p)}>
                                <span className="nr-dcard__top">
                                    <Ikon name={info.ikon} size={32} strokeWidth={1.5} />
                                    <span className="nr-dcard__check">{on && <Ikon name="check" size={16} strokeWidth={3} />}</span>
                                </span>
                                <span className="nr-dcard__meta">
                                    {info.no}
                                    <span className="nr-dcard__tag">{t(info.tag)}</span>
                                </span>
                                <span className="nr-dcard__name">{info.label}</span>
                                <span className="nr-dcard__desc">{t(info.desc)}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="nr-dialog__foot">
                    {peringatan && (
                        <p className="nr-dialog__warn" role="alert">
                            {t('Pilih minimal satu persona dulu, ya.', 'Please choose at least one persona first.')}
                        </p>
                    )}
                    <button
                        type="button"
                        className="nr-dialog__go"
                        aria-disabled={terpilih.length === 0}
                        onClick={() => (terpilih.length ? onMulai(terpilih) : setPeringatan(true))}
                    >
                        {t('Mulai Jelajah', 'Start Exploring')}
                        <Ikon name="arrow-right" size={40} strokeWidth={1.75} />
                    </button>
                </div>
            </div>
        </div>
    );
}
