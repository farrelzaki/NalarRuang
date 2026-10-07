/** Detail Lokasi / Point Inspector (8.3–8.7, FR-08, FR-09, FR-17). Titik: bintang; wilayah: centang (SRS v1.2). */
import type { InspectResponse, Persona } from '@/types';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { cx, FRASA, PERSONA, PERSONA_IDS, type Simbol } from '@/lib/nalar';
import { Bintang, Ikon, Keadaan, SimbolPeta } from './Dasar';

function BadgeProfil() {
    const { t } = useBahasa();
    return (
        <span className="nr-badge" aria-hidden="true">
            {t('Profil Anda', 'Your Profile')}
        </span>
    );
}

function BarisSkor({ persona, score, match, sesi }: { persona: Persona; score?: number | null; match?: boolean; sesi: boolean }) {
    const { t } = useBahasa();
    const info = PERSONA[persona];
    const wilayah = match !== undefined;
    const kurang = !wilayah && score == null;
    const label = `${info.label}, ${kurang ? t('data kurang', 'insufficient data') : wilayah ? (match ? t('cocok', 'match') : t('belum cocok', 'not a match yet')) : t(`${score} dari 3 bintang`, `${score} of 3 stars`)}${sesi ? t(', profil anda', ', your profile') : ''}`;
    return (
        <div className={cx('nr-persona-row', sesi && 'nr-persona-row--session')} role="listitem" aria-label={label}>
            <span className="nr-persona-row__icon">
                <Ikon name={info.ikon} size={18} />
            </span>
            <span className="nr-persona-row__name">{info.label}</span>
            {sesi && <BadgeProfil />}
            {kurang ? (
                <span className="nr-stars__na">{t('Data kurang', 'Insufficient data')}</span>
            ) : wilayah ? (
                <span className={cx('nr-match', !match && 'nr-match--no', !sesi && 'nr-match--muted')} aria-hidden="true">
                    <span className="nr-match__dot">
                        <Ikon name={match ? 'check' : 'minus'} size={12} strokeWidth={3} />
                    </span>
                    {match ? t('Cocok', 'Match') : t('Belum cocok', 'Not yet')}
                </span>
            ) : (
                <Bintang score={score ?? 0} muted={!sesi} />
            )}
        </div>
    );
}

export function KartuKesimpulan({ kalimat, tidakLengkap }: { kalimat: string[]; tidakLengkap?: boolean }) {
    const { t } = useBahasa();
    return (
        <div className="nr-summary">
            <div className="nr-summary__label">{t('Kesimpulan Singkat', 'Quick Summary')}</div>
            {kalimat.map((k, i) => (
                <p key={i} className="nr-summary__text">
                    {k}
                </p>
            ))}
            {tidakLengkap && <p className="nr-summary__note">{t('Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.', 'Some data at this location is incomplete, so the score may change.')}</p>}
        </div>
    );
}

type Props = {
    data: InspectResponse | null;
    memuat: boolean;
    galat?: string | null;
    sesi: Persona[];
    onTutup: () => void;
};

export function DetailLokasi({ data, memuat, galat, sesi, onTutup }: Props) {
    const { t } = useBahasa();
    return (
        <aside className="nr-inspector nr-float" aria-labelledby="nr-inspector-name">
            <div className="nr-inspector__head">
                <h2 className="nr-inspector__title">{t('Detail Lokasi', 'Location Details')}</h2>
                <button type="button" className="nr-iconbtn" aria-label={t('Tutup detail lokasi', 'Close location details')} onClick={onTutup} style={{ color: 'var(--navy-900)' }}>
                    <Ikon name="x" size={18} />
                </button>
            </div>
            {memuat || !data ? (
                galat ? <Keadaan kind="galat" title={t('Data belum tersedia di sini', 'No data available here yet')} text={galat} /> : <Keadaan kind="memuat" title={t('Memuat detail lokasi', 'Loading location details')} />
            ) : (
                <IsiDetail data={data} sesi={sesi} />
            )}
        </aside>
    );
}

function IsiDetail({ data, sesi }: { data: InspectResponse; sesi: Persona[] }) {
    const { t } = useBahasa();
    const titik = data.jenis_geometri === 'titik';
    const kesimpulan = sesi.map((p) => {
        const label = PERSONA[p].label;
        if (titik) {
            const s = data.stars[p];
            return s == null ? null : t(`Buat gaya hidup ${label}: ${FRASA[s][0]}`, `For the ${label} lifestyle: ${FRASA[s][1]}`);
        }
        return data.match[p] ? t(`Cocok untuk gaya hidup ${label}.`, `A match for the ${label} lifestyle.`) : t(`Belum cocok untuk gaya hidup ${label}.`, `Not yet a match for the ${label} lifestyle.`);
    }).filter((k): k is string => k !== null);

    return (
        <>
            <div className="nr-inspector__place">
                <span className="nr-inspector__pin">
                    <Ikon name="map-pin" size={22} />
                </span>
                <div>
                    <div className="nr-eyebrow">{titik ? t('Titik Terpilih', 'Selected Point') : t('Area Terpilih', 'Selected Area')}</div>
                    <h3 className="nr-inspector__name" id="nr-inspector-name">
                        {teksServer(data.nama)}
                    </h3>
                    <div className="nr-inspector__addr">{teksServer(data.wilayah)}</div>
                </div>
            </div>
            <div className="nr-inspector__section" role="list" aria-label={t('Kecocokan gaya hidup', 'Lifestyle match')}>
                <h4 className="nr-inspector__subtitle">{t('Kecocokan Gaya Hidup', 'Lifestyle Match')}</h4>
                {PERSONA_IDS.map((p) =>
                    titik ? (
                        <BarisSkor key={p} persona={p} score={data.stars[p]} sesi={sesi.includes(p)} />
                    ) : (
                        <BarisSkor key={p} persona={p} match={data.match[p]} sesi={sesi.includes(p)} />
                    ),
                )}
            </div>
            {titik && data.ringkasan_layer.length > 0 && (
                <div className="nr-layer-summary" aria-label={t('Data layer di lokasi ini', 'Layer data at this location')}>
                    {data.ringkasan_layer.map((l, i) => (
                        <span key={i} className="nr-legend">
                            <SimbolPeta kind={l.jenis as Simbol} />
                            {teksServer(l.teks)}
                        </span>
                    ))}
                </div>
            )}
            {kesimpulan.length > 0 && <KartuKesimpulan kalimat={kesimpulan} tidakLengkap={data.data_tidak_lengkap} />}
        </>
    );
}
