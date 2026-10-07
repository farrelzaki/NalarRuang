/** Detail Lokasi / Point Inspector (8.3–8.7, FR-08, FR-09, FR-17). Titik: bintang; wilayah: centang (SRS v1.2). */
import type { InspectResponse, Persona } from '@/types';
import { cx, FRASA, PERSONA, PERSONA_IDS, type Simbol } from '@/lib/nalar';
import { Bintang, Ikon, Keadaan, SimbolPeta } from './Dasar';

function BadgeProfil() {
    return (
        <span className="nr-badge" aria-hidden="true">
            Profil Anda
        </span>
    );
}

function BarisSkor({ persona, score, match, sesi }: { persona: Persona; score?: number | null; match?: boolean; sesi: boolean }) {
    const info = PERSONA[persona];
    const wilayah = match !== undefined;
    const kurang = !wilayah && score == null;
    const label = `${info.label}, ${kurang ? 'data kurang' : wilayah ? (match ? 'cocok' : 'belum cocok') : `${score} dari 3 bintang`}${sesi ? ', profil anda' : ''}`;
    return (
        <div className={cx('nr-persona-row', sesi && 'nr-persona-row--session')} role="listitem" aria-label={label}>
            <span className="nr-persona-row__icon">
                <Ikon name={info.ikon} size={18} />
            </span>
            <span className="nr-persona-row__name">{info.label}</span>
            {sesi && <BadgeProfil />}
            {kurang ? (
                <span className="nr-stars__na">Data kurang</span>
            ) : wilayah ? (
                <span className={cx('nr-match', !match && 'nr-match--no', !sesi && 'nr-match--muted')} aria-hidden="true">
                    <span className="nr-match__dot">
                        <Ikon name={match ? 'check' : 'minus'} size={12} strokeWidth={3} />
                    </span>
                    {match ? 'Cocok' : 'Belum cocok'}
                </span>
            ) : (
                <Bintang score={score ?? 0} muted={!sesi} />
            )}
        </div>
    );
}

export function KartuKesimpulan({ kalimat, tidakLengkap }: { kalimat: string[]; tidakLengkap?: boolean }) {
    return (
        <div className="nr-summary">
            <div className="nr-summary__label">Kesimpulan Singkat</div>
            {kalimat.map((k, i) => (
                <p key={i} className="nr-summary__text">
                    {k}
                </p>
            ))}
            {tidakLengkap && <p className="nr-summary__note">Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.</p>}
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
    return (
        <aside className="nr-inspector nr-float" aria-labelledby="nr-inspector-name">
            <div className="nr-inspector__head">
                <h2 className="nr-inspector__title">Detail Lokasi</h2>
                <button type="button" className="nr-iconbtn" aria-label="Tutup detail lokasi" onClick={onTutup} style={{ color: 'var(--navy-900)' }}>
                    <Ikon name="x" size={18} />
                </button>
            </div>
            {memuat || !data ? (
                galat ? <Keadaan kind="galat" title="Data belum tersedia di sini" text={galat} /> : <Keadaan kind="memuat" title="Memuat detail lokasi" />
            ) : (
                <IsiDetail data={data} sesi={sesi} />
            )}
        </aside>
    );
}

function IsiDetail({ data, sesi }: { data: InspectResponse; sesi: Persona[] }) {
    const titik = data.jenis_geometri === 'titik';
    const kesimpulan = sesi.map((p) => {
        const label = PERSONA[p].label;
        if (titik) {
            const s = data.stars[p];
            return s == null ? null : `Buat gaya hidup ${label}: ${FRASA[s]}`;
        }
        return `${data.match[p] ? 'Cocok' : 'Belum cocok'} untuk gaya hidup ${label}.`;
    }).filter((k): k is string => k !== null);

    return (
        <>
            <div className="nr-inspector__place">
                <span className="nr-inspector__pin">
                    <Ikon name="map-pin" size={22} />
                </span>
                <div>
                    <div className="nr-eyebrow">{titik ? 'Titik Terpilih' : 'Area Terpilih'}</div>
                    <h3 className="nr-inspector__name" id="nr-inspector-name">
                        {data.nama}
                    </h3>
                    <div className="nr-inspector__addr">{data.wilayah}</div>
                </div>
            </div>
            <div className="nr-inspector__section" role="list" aria-label="Kecocokan gaya hidup">
                <h4 className="nr-inspector__subtitle">Kecocokan Gaya Hidup</h4>
                {PERSONA_IDS.map((p) =>
                    titik ? (
                        <BarisSkor key={p} persona={p} score={data.stars[p]} sesi={sesi.includes(p)} />
                    ) : (
                        <BarisSkor key={p} persona={p} match={data.match[p]} sesi={sesi.includes(p)} />
                    ),
                )}
            </div>
            {titik && data.ringkasan_layer.length > 0 && (
                <div className="nr-layer-summary" aria-label="Data layer di lokasi ini">
                    {data.ringkasan_layer.map((l, i) => (
                        <span key={i} className="nr-legend">
                            <SimbolPeta kind={l.jenis as Simbol} />
                            {l.teks}
                        </span>
                    ))}
                </div>
            )}
            {kesimpulan.length > 0 && <KartuKesimpulan kalimat={kesimpulan} tidakLengkap={data.data_tidak_lengkap} />}
        </>
    );
}
