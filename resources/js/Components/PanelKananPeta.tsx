/** Panel Layer Spasial (8.9), Profil Persona (8.10), tombol merek (8.11), tombol LAYER/PERSONA (8.12), slider tahun (8.13). */
import type { LayerKey, Persona } from '@/types';
import { useBahasa } from '@/lib/bahasa';
import { cx, LAYERS, PERSONA, PERSONA_IDS } from '@/lib/nalar';
import { Ikon, PanelKanan, SimbolPeta, Toggle, Wordmark } from './Dasar';

export type StatusLayer = 'loading' | 'error' | undefined;

type PanelLayerProps = {
    aktif: Partial<Record<LayerKey, boolean>>;
    status: Partial<Record<LayerKey, StatusLayer>>;
    onToggle: (k: LayerKey) => void;
    onCobaLagi: (k: LayerKey) => void;
    onTutup: () => void;
};

export function PanelLayer({ aktif, status, onToggle, onCobaLagi, onTutup }: PanelLayerProps) {
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
                                {l.legend.map(([simbol, teks]) => (
                                    <span key={simbol} className="nr-legend">
                                        <SimbolPeta kind={simbol} />
                                        {t(teks)}
                                    </span>
                                ))}
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
        <button type="button" className="nr-brandbtn" aria-label={t('Buka menu NalarRuang', 'Open NalarRuang menu')} aria-expanded={terbuka} onClick={onKlik}>
            <Wordmark />
            <Ikon name="menu" size={16} color="var(--ink-40)" />
        </button>
    );
}

export type PanelKananKey = 'layer' | 'persona' | null;

export function TombolLayerPersona({ terbuka, onKlik }: { terbuka: PanelKananKey; onKlik: (k: 'layer' | 'persona') => void }) {
    const tombol = (k: 'layer' | 'persona', ikon: string, label: string) => (
        <button type="button" className="nr-capsbtn" aria-expanded={terbuka === k} onClick={() => onKlik(k)}>
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
