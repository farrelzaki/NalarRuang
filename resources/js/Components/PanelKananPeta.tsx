/** Panel Layer Spasial (8.9), Profil Persona (8.10), tombol merek (8.11), tombol LAYER/PERSONA (8.12), slider tahun (8.13), dan kontrol Isochrone (T-056). */
import type { LayerKey, Persona } from '@/types';
import { useBahasa } from '@/lib/bahasa';
import {
    cx,
    ISOCHRONE_MINUTES,
    ISOCHRONE_MODES,
    LAYERS,
    PERSONA,
    PERSONA_IDS,
    SUBFITUR,
    type IsochroneMode,
    type Simbol,
} from '@/lib/nalar';
import { Ikon, PanelKanan, SimbolPeta, Toggle, Wordmark } from './Dasar';

export type StatusLayer = 'loading' | 'error' | undefined;

type PanelLayerProps = {
    aktif: Partial<Record<LayerKey, boolean>>;
    status: Partial<Record<LayerKey, StatusLayer>>;
    onToggle: (k: LayerKey) => void;
    onCobaLagi: (k: LayerKey) => void;
    /** Baris legenda yang dimatikan (T-034). */
    subMati: Simbol[];
    onSubToggle: (s: Simbol) => void;
    onTutup: () => void;
};

export function PanelLayer({ aktif, status, onToggle, onCobaLagi, subMati, onSubToggle, onTutup }: PanelLayerProps) {
    const { t } = useBahasa();
    return (
        <PanelKanan title={t('Layer Spasial', 'Spatial Layers')} onClose={onTutup}>
            {LAYERS.map((l) => {
                const st = status[l.key];
                const nyala = !!aktif[l.key] && st !== 'error';
                return (
                    <div key={l.key} className={cx('nr-layer', nyala && 'nr-layer--active')}>
                        <div className="nr-layer__top">
                            <span className="nr-layer__title">{t(l.title)}</span>
                            {st === 'loading' ? (
                                <Ikon name="loader-circle" size={16} className="nr-spin" label={t('Memuat layer', 'Loading layer')} />
                            ) : (
                                <Toggle checked={nyala} label={t(l.title)} disabled={st === 'error'} onChange={() => onToggle(l.key)} />
                            )}
                        </div>
                        {st === 'error' ? (
                            <span>
                                <span className="nr-layer__error">{t('Layer gagal dimuat.', 'Layer failed to load.')}</span>
                                <button type="button" className="nr-linkcaps" onClick={() => onCobaLagi(l.key)}>
                                    {t('Coba lagi', 'Try again')}
                                </button>
                            </span>
                        ) : nyala ? (
                            <div className={cx('nr-layer__legend', l.grid && 'nr-layer__legend--grid')}>
                                {l.legend.map(([simbol, teks]) =>
                                    l.legend.length > 1 && SUBFITUR[simbol] ? (
                                        <button
                                            key={simbol}
                                            type="button"
                                            role="checkbox"
                                            aria-checked={!subMati.includes(simbol)}
                                            className="nr-legend nr-legend--pilih"
                                            title={subMati.includes(simbol) ? t('Tampilkan', 'Show') : t('Sembunyikan', 'Hide')}
                                            onClick={() => onSubToggle(simbol)}
                                        >
                                            <span className="nr-legend__cek" aria-hidden="true">
                                                {!subMati.includes(simbol) && <Ikon name="check" size={9} strokeWidth={3.5} />}
                                            </span>
                                            <SimbolPeta kind={simbol} />
                                            {t(teks)}
                                        </button>
                                    ) : (
                                        <span key={simbol} className="nr-legend">
                                            <SimbolPeta kind={simbol} />
                                            {t(teks)}
                                        </span>
                                    ),
                                )}
                            </div>
                        ) : (
                            <span className="nr-layer__desc">{t(l.desc)}</span>
                        )}
                    </div>
                );
            })}
        </PanelKanan>
    );
}

export function PanelProfilPersona({ terpilih, onUbah, onTutup }: { terpilih: Persona[]; onUbah: (p: Persona) => void; onTutup: () => void }) {
    const { t } = useBahasa();
    return (
        <PanelKanan title={t('Profil Persona', 'Persona Profile')} className="nr-rpanel--persona" onClose={onTutup}>
            {PERSONA_IDS.map((p) => {
                const on = terpilih.includes(p);
                return (
                    <button key={p} type="button" className="nr-popt" role="checkbox" aria-checked={on} onClick={() => onUbah(p)}>
                        {PERSONA[p].label}
                        <span className="nr-cbox">{on && <Ikon name="check" size={12} strokeWidth={3} />}</span>
                    </button>
                );
            })}
        </PanelKanan>
    );
}

export function TombolMerek({ terbuka, onKlik }: { terbuka: boolean; onKlik: () => void }) {
    const { t } = useBahasa();
    return (
        <button type="button" data-tur="menu" className="nr-brandbtn" aria-label={t('Buka menu NalarRuang', 'Open NalarRuang menu')} aria-expanded={terbuka} onClick={onKlik}>
            <Wordmark />
            <Ikon name="menu" size={16} color="var(--ink-40)" />
        </button>
    );
}

export type PanelKananKey = 'layer' | 'persona' | null;

export function TombolLayerPersona({ terbuka, onKlik }: { terbuka: PanelKananKey; onKlik: (k: 'layer' | 'persona') => void }) {
    const tombol = (k: 'layer' | 'persona', ikon: string, label: string) => (
        <button type="button" data-tur={k} className="nr-capsbtn" aria-expanded={terbuka === k} onClick={() => onKlik(k)}>
            <Ikon name={ikon} size={16} />
            {label}
        </button>
    );
    return (
        <div className="nr-capsgroup">
            {tombol('layer', 'map', 'Layer')}
            {tombol('persona', 'users', 'Persona')}
        </div>
    );
}

export function SliderTahun({ tahun, onUbah, kosong }: { tahun: number; onUbah: (t: number) => void; kosong?: boolean }) {
    const { t: tr } = useBahasa();
    const min = 2026;
    const max = 2030;
    const pct = ((tahun - min) / (max - min)) * 100;
    return (
        <div className="nr-slider">
            <div className="nr-slider__row">
                <span className="nr-slider__min">{min}</span>
                <span className="nr-slider__track">
                    <span className="nr-slider__rail" />
                    <span className="nr-slider__fill" style={{ width: `${pct}%` }} />
                    {[2026, 2027, 2028, 2029, 2030].map((t) => (
                        <span key={t} className="nr-slider__tick" style={{ left: `${((t - min) / (max - min)) * 100}%` }} />
                    ))}
                    <span className="nr-slider__knob" style={{ left: `${pct}%` }} />
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={tahun}
                        onChange={(e) => onUbah(Number(e.target.value))}
                        aria-label={tr('Tahun proyek infrastruktur', 'Infrastructure project year')}
                        aria-valuetext={`${tr('Tahun', 'Year')} ${tahun}`}
                    />
                </span>
                <span className="nr-slider__value">{tahun}</span>
            </div>
            {kosong && <p className="nr-slider__empty">{tr('Belum ada proyek di tahun ini.', 'No projects in this year yet.')}</p>}
        </div>
    );
}

type PanelIsochroneProps = {
    mode: IsochroneMode;
    minutes: number;
    memuat?: boolean;
    onUbahMode: (m: IsochroneMode) => void;
    onUbahMinutes: (mnt: number) => void;
};

function IkonModaIso({ mode }: { mode: IsochroneMode }) {
    if (mode === 'auto') {
        return (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
            </svg>
        );
    }
    if (mode === 'bicycle') {
        return (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18.5" cy="17.5" r="3.5" />
                <circle cx="5.5" cy="17.5" r="3.5" />
                <circle cx="15" cy="5" r="1" />
                <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
            </svg>
        );
    }
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="5" r="1.5" />
            <path d="m9 20 3-6 3 6" />
            <path d="m6 8 6 2 6-2" />
            <path d="M12 10v4" />
        </svg>
    );
}

export function PanelIsochrone({ mode, minutes, memuat, onUbahMode, onUbahMinutes }: PanelIsochroneProps) {
    const { t } = useBahasa();
    return (
        <aside className="nr-iso nr-float" aria-label={t('Kontrol jangkauan waktu tempuh', 'Travel time reach controls')}>
            <div className="nr-iso__head">
                <span className="nr-iso__title">{t('Jangkauan Isochrone', 'Isochrone Reach')}</span>
                {memuat && <Ikon name="loader-circle" size={14} className="nr-spin" label={t('Menghitung jangkauan', 'Calculating reach')} />}
            </div>

            <div className="nr-iso__modes" role="group" aria-label={t('Moda perjalanan', 'Travel mode')}>
                {ISOCHRONE_MODES.map((m) => (
                    <button
                        key={m.value}
                        type="button"
                        className="nr-iso__modebtn"
                        aria-pressed={mode === m.value}
                        onClick={() => onUbahMode(m.value)}
                    >
                        <IkonModaIso mode={m.value} />
                        <span>{t(m.label)}</span>
                    </button>
                ))}
            </div>

            <div className="nr-iso__row">
                <span className="nr-iso__lbl">{t('Waktu', 'Time')}</span>
                <div className="nr-iso__times" role="group" aria-label={t('Durasi waktu tempuh', 'Travel time duration')}>
                    {ISOCHRONE_MINUTES.map((mnt) => (
                        <button
                            key={mnt}
                            type="button"
                            className="nr-iso__timebtn"
                            aria-pressed={minutes === mnt}
                            onClick={() => onUbahMinutes(mnt)}
                        >
                            {mnt} {t('mnt', 'min')}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}