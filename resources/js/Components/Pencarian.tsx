/** Search bar (8.1) dan panel Top 3 / mode checkbox (8.2, FR-05, FR-06, FR-15). */
import { useState, type FormEvent } from 'react';
import type { HasilSearch, Persona } from '@/types';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { cx, PERSONA, PERSONA_IDS } from '@/lib/nalar';
import { Ikon, Keadaan } from './Dasar';

type SearchBarProps = {
    nilai: string;
    onUbah: (v: string) => void;
    onCari: (v: string) => void;
    memuat?: boolean;
    commute: boolean;
    onToggleCommute: () => void;
    filterTerbuka: boolean;
    onToggleFilter: () => void;
};

export function SearchBar({ nilai, onUbah, onCari, memuat, commute, onToggleCommute, filterTerbuka, onToggleFilter }: SearchBarProps) {
    const { t } = useBahasa();
    const [fokus, setFokus] = useState(false);
    const kirim = (e: FormEvent) => {
        e.preventDefault();
        if (nilai.trim()) onCari(nilai.trim());
    };
    return (
        <form className="nr-search nr-float" role="search" onSubmit={kirim}>
            <Ikon name={memuat ? 'loader-circle' : 'search'} size={16} className={memuat ? 'nr-spin' : undefined} />
            <input
                className="nr-search__input"
                placeholder={t('Telusuri kawasan atau alamat...', 'Search an area or address...')}
                value={nilai}
                onChange={(e) => onUbah(e.target.value)}
                onFocus={() => setFokus(true)}
                onBlur={() => setTimeout(() => setFokus(false), 150)}
                aria-label={t('Cari kawasan hunian', 'Search residential areas')}
                role="combobox"
                aria-expanded={false}
                aria-autocomplete="list"
                disabled={commute}
            />
            <span className="nr-search__tools">
                {(fokus || filterTerbuka) && !commute && (
                    <button type="button" className="nr-search__btn" aria-pressed={filterTerbuka} aria-label={t('Pilih kota dan persona', 'Choose city and persona')} title={t('Pilih kota dan persona', 'Choose city and persona')} onClick={onToggleFilter}>
                        <Ikon name="sliders-horizontal" size={16} />
                    </button>
                )}
                <button type="button" className="nr-search__btn" aria-pressed={commute} aria-label={t('Beralih ke Commute Simulator', 'Switch to Commute Simulator')} title="Commute Simulator" onClick={onToggleCommute}>
                    <Ikon name="car" size={16} />
                </button>
            </span>
        </form>
    );
}

type Top3Props = {
    personaLabel: string;
    hasil: HasilSearch[] | null;
    memuat: boolean;
    pesan?: string;
    aktif: number | null;
    onPilih: (i: number) => void;
};

export function PanelTop3({ personaLabel, hasil, memuat, pesan, aktif, onPilih }: Top3Props) {
    const { t } = useBahasa();
    return (
        <section className="nr-top3 nr-float" aria-label={t('Top 3 rekomendasi', 'Top 3 recommendations')}>
            <div className="nr-top3__head">
                <span className="nr-label">{t('Top 3 Rekomendasi', 'Top 3 Recommendations')}</span>
                <span className="nr-desc">{t(`Kawasan ideal berdasarkan profil ${personaLabel}.`, `Ideal areas for the ${personaLabel} profile.`)}</span>
            </div>
            <div className="nr-top3__list" role={hasil?.length ? 'listbox' : undefined}>
                {memuat ? (
                    <Keadaan kind="memuat" title={t('Mencari kawasan', 'Searching areas')} />
                ) : !hasil?.length ? (
                    <Keadaan kind="kosong" title={pesan ? teksServer(pesan) : t('Belum ada kawasan yang cocok', 'No matching area yet')} text={t('Coba longgarkan kata kunci atau pilih kota lain.', 'Try broader keywords or choose another city.')} />
                ) : (
                    hasil.map((r, i) => (
                        <button
                            key={r.wilayah_id}
                            type="button"
                            className="nr-top3__item"
                            role="option"
                            aria-selected={aktif === i}
                            aria-label={t(`Peringkat ${i + 1} dari 3, ${r.nama}, ${r.match} persen cocok`, `Rank ${i + 1} of 3, ${r.nama}, ${r.match} percent match`)}
                            onClick={() => onPilih(i)}
                        >
                            <span className="nr-top3__num">{i + 1}</span>
                            <span className="nr-top3__text">
                                <span className="nr-top3__name">{r.nama}</span>
                                <span className="nr-top3__type">{teksServer(r.tipe_kawasan)}</span>
                            </span>
                            <span className="nr-top3__match">
                                <span className={cx('nr-top3__pct', r.match < 50 && 'nr-top3__pct--low')}>{r.match}%</span>
                                <span className="nr-top3__lbl">Match</span>
                            </span>
                        </button>
                    ))
                )}
            </div>
        </section>
    );
}

const KOTA = ['Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi'];

type FilterProps = {
    personaSesi: Persona[];
    onCari: (kota: string[], persona: Persona[]) => void;
};

/** Mode checkbox (FR-15). Pilihan persona di sini hanya untuk pencarian ini (BR 12). */
export function PanelFilter({ personaSesi, onCari }: FilterProps) {
    const { t } = useBahasa();
    const [kota, setKota] = useState<string[]>(['Bogor', 'Depok']);
    const [persona, setPersona] = useState<Persona[]>(personaSesi);
    const balik = <T,>(daftar: T[], v: T) => (daftar.includes(v) ? daftar.filter((x) => x !== v) : [...daftar, v]);
    return (
        <section className="nr-top3 nr-float" aria-label={t('Pilih kota dan persona', 'Choose city and persona')}>
            <div className="nr-top3__head">
                <span className="nr-label">{t('Pilih Kota dan Persona', 'Choose City and Persona')}</span>
                <span className="nr-desc">{t('Centang kota dan persona, lalu cari.', 'Tick cities and personas, then search.')}</span>
            </div>
            <div className="nr-filter">
                <div className="nr-filter__cities" role="group" aria-label={t('Kota', 'City')}>
                    {KOTA.map((k) => (
                        <button key={k} type="button" className="nr-chipbtn" aria-pressed={kota.includes(k)} onClick={() => setKota(balik(kota, k))}>
                            {k}
                        </button>
                    ))}
                </div>
                <div role="group" aria-label="Persona" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {PERSONA_IDS.map((p) => {
                        const on = persona.includes(p);
                        return (
                            <button key={p} type="button" className="nr-popt nr-popt--sm" role="checkbox" aria-checked={on} onClick={() => setPersona(balik(persona, p))}>
                                {PERSONA[p].label}
                                <span className="nr-cbox">{on && <Ikon name="check" size={12} strokeWidth={3} />}</span>
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button type="button" className="nr-linkcaps" onClick={() => setPersona(personaSesi)}>
                        {t('Pakai persona sesi', 'Use session persona')}
                    </button>
                    <button type="button" className="nr-btn" disabled={!persona.length} onClick={() => onCari(kota, persona)}>
                        {t('Cari', 'Search')}
                    </button>
                </div>
            </div>
        </section>
    );
}
