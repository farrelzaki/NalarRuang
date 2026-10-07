/** Drawer menu (8.14, FR-18–21) dan dialog persona onboarding (8.15, FR-13, FR-14). */
import { useEffect, useRef, useState } from 'react';
import type { Persona } from '@/types';
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
    const tutupRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        tutupRef.current?.focus();
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onTutup();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onTutup]);

    const tabs: [TabMenu, string, string][] = [
        ['persona', 'Persona', 'users'],
        ['legenda', 'Legenda', 'map'],
        ['tentang', 'Tentang', 'info'],
    ];
    return (
        <div className="nr-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="nr-drawer__head">
                <Wordmark />
                <button ref={tutupRef} type="button" className="nr-drawer__close" aria-label="Tutup menu" onClick={onTutup}>
                    <Ikon name="x" size={15} />
                </button>
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
                        <h3 className="nr-drawer__heading">Ubah Preferensi Persona</h3>
                        <p className="nr-drawer__text">Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.</p>
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
                                            <span className="nr-pcard__desc">{PERSONA[p].desc}</span>
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
    const baris: [string, Simbol[], string | null][] = [
        ['Historis & Risiko', ['banjir'], 'Area rawan banjir historis (merah).'],
        ['Ekosistem Mikro', ['hijau'], 'Ruang hijau, taman & fasilitas gaya hidup (hijau).'],
        ['Legalitas Lahan', ['legal'], 'Pemetaan zona bidang tanah legal (ungu).'],
        ['Mobilitas & Transit', ['mrt', 'krl-bogor', 'krl-rangkas', 'lrt', 'stasiun', 'waktu'], null],
        ['Inklusivitas', ['trotoar', 'akses'], 'Trotoar layak (biru putus-putus) & titik akses disabilitas (biru).'],
    ];
    return (
        <>
            <h3 className="nr-drawer__heading">Legenda Peta</h3>
            <p className="nr-drawer__text">Panduan membaca simbol dan warna pada Visual Explorer.</p>
            {baris.map(([judul, simbol, teks]) => (
                <div key={judul} className="nr-lgrow">
                    <span className="nr-lgrow__syms">
                        {simbol.map((s) => (
                            <SimbolPeta key={s} kind={s} />
                        ))}
                    </span>
                    <span>
                        <span className="nr-lgrow__title">{judul}</span>
                        {teks ? (
                            <span className="nr-lgrow__text">{teks}</span>
                        ) : (
                            <>
                                <span className="nr-lgrow__text">MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih).</span>
                                <span className="nr-lgrow__text" style={{ marginTop: 4 }}>
                                    Garis putus-putus ungu = <b>Mesin Waktu</b> (proyek 2026–2030).
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
    return (
        <>
            <h3 className="nr-drawer__heading">Tentang NalarRuang 2.0</h3>
            <p className="nr-drawer__text" style={{ color: 'var(--ink-55)' }}>
                Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka.
            </p>
            <Istilah judul="Isochrone">Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik.</Istilah>
            <Istilah judul="Point Inspector">Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta.</Istilah>
            <Istilah judul="Commute Simulator">Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum.</Istilah>
            <Istilah judul="Persona Grading">3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok.</Istilah>
            <Istilah judul="Sumber data">{SUMBER.join(' · ') + '. Peta dasar © OpenStreetMap contributors.'}</Istilah>
            <Istilah judul="Catatan">
                Skor dan rekomendasi merupakan estimasi dari data sekunder publik, bukan penilaian resmi. Versi demo: sebagian atribut (mis. kualitas udara, status lahan) masih data contoh. Dibuat oleh Kelompok 4 — Developer Rumah, IPB University.
            </Istilah>
        </>
    );
}

export function DialogPersona({ awal, onMulai }: { awal: Persona[]; onMulai: (p: Persona[]) => void }) {
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
            <div>
                <h2 className="nr-dialog__title" id="nr-dialog-title">
                    Pilih Persona mu!
                </h2>
                <p className="nr-dialog__lead">Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.</p>
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
                                    <span className="nr-dcard__tag">{info.tag}</span>
                                </span>
                                <span className="nr-dcard__name">{info.label}</span>
                                <span className="nr-dcard__desc">{info.desc}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="nr-dialog__foot">
                    {peringatan && (
                        <p className="nr-dialog__warn" role="alert">
                            Pilih minimal satu persona dulu, ya.
                        </p>
                    )}
                    <button
                        type="button"
                        className="nr-dialog__go"
                        aria-disabled={terpilih.length === 0}
                        onClick={() => (terpilih.length ? onMulai(terpilih) : setPeringatan(true))}
                    >
                        Mulai Jelajah
                        <Ikon name="arrow-right" size={40} strokeWidth={1.75} />
                    </button>
                </div>
            </div>
        </div>
    );
}
