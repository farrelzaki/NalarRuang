/** Detail Lokasi / Point Inspector (8.3–8.7, FR-08, FR-09, FR-17). Titik: bintang; wilayah: centang (SRS v1.2). */
import type { FaktaFasilitas, InspectResponse, Persona } from '@/types';
import { teksServer, useBahasa, type Bahasa } from '@/lib/bahasa';
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

/** "450 m" / "2,1 km" (EN: "2.1 km"). */
function jarak(meter: number, bahasa: Bahasa): string {
    return meter < 1000 ? `${Math.round(meter / 10) * 10} m` : `${(meter / 1000).toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

const INTI: [string, string][] = [
    ['Belum mendukung aktivitasmu', 'Does not support your routine yet'],
    ['Mungkin kurang optimal', 'May be less than ideal'],
    ['Cukup mendukung aktivitasmu', 'Supports your routine fairly well'],
    ['Sangat mendukung aktivitasmu', 'Strongly supports your routine'],
];
const UDARA: Record<string, [string, string]> = {
    sehat: ['sehat', 'healthy'],
    kurang_sehat: ['kurang sehat', 'moderate'],
    tidak_sehat: ['tidak sehat', 'unhealthy'],
    berbahaya: ['berbahaya', 'hazardous'],
};

/** Kesimpulan titik yang menyebut alasannya (T-033), mis. stasiun terdekat dan jaraknya. */
function kalimatTitik(p: Persona, s: number, f: FaktaFasilitas, bahasa: Bahasa): string {
    const en = bahasa === 'en';
    const label = PERSONA[p].label;
    const j = jarak(f.meter, bahasa);
    const n = f.nama?.trim();
    const baik = s >= 2;
    const dalam = n ? ` (${n})` : '';
    let alasan: string;
    if (p === 'commuter') {
        alasan = baik
            ? en ? `${n ? n + ' Station' : 'a station'} is ${j} away` : `terdapat Stasiun ${n || 'kereta'} yang berjarak ${j} dari lokasi`
            : en ? `the nearest station${dalam} is ${j} away` : `stasiun terdekat${dalam} berjarak ${j} dari lokasi`;
    } else if (p === 'driver') {
        alasan = baik
            ? en ? `the ${n ? n + ' toll gate' : 'nearest toll gate'} is ${j} away` : `terdapat Gerbang Tol ${n || 'terdekat'} yang berjarak ${j} dari lokasi`
            : en ? `the nearest toll gate${dalam} is ${j} away` : `gerbang tol terdekat${dalam} berjarak ${j} dari lokasi`;
    } else if (p === 'social_vibe') {
        const k = f.jumlah_1km ?? 0;
        alasan = k > 0
            ? en ? `there are ${k} cafés, restaurants, and activity spots within 1 km, the nearest${dalam} ${j} away` : `terdapat ${k} kafe, restoran, dan tempat aktivitas dalam radius 1 km, yang terdekat${dalam} ${j}`
            : en ? `the nearest hangout spot${dalam} is ${j} away` : `tempat nongkrong terdekat${dalam} berjarak ${j} dari lokasi`;
    } else {
        const u = UDARA[f.kualitas_udara ?? ''] ?? ['belum diketahui', 'unknown'];
        alasan = en ? `air quality is ${u[1]} and the nearest green space${dalam} is ${j} away` : `kualitas udara ${u[0]} dan ruang hijau terdekat${dalam} berjarak ${j}`;
    }
    const inti = INTI[Math.max(0, Math.min(3, s))][en ? 1 : 0];
    let k = en ? `For the ${label} lifestyle: ${inti} because ${alasan}.` : `Buat gaya hidup ${label}: ${inti} karena ${alasan}.`;
    if (p === 'zen' && (f.banjir === 'sedang' || f.banjir === 'tinggi')) {
        k += en ? ` Note: this spot is in a ${f.banjir === 'tinggi' ? 'high' : 'medium'} flood hazard area.` : ` Perhatikan: lokasi ini berada di area bahaya banjir kelas ${f.banjir}.`;
    }
    return s <= 1 ? k + (en ? ' Consider other locations.' : ' Pertimbangkan lokasi lain.') : k;
}

/** Kesimpulan wilayah dengan jumlah fasilitas utama di dalamnya. */
function kalimatWilayah(p: Persona, cocok: boolean, n: number, bahasa: Bahasa, dekat: { nama: string; meter: number } | null = null): string {
    const en = bahasa === 'en';
    const label = PERSONA[p].label;
    const benda: Record<Persona, [string, string, string]> = {
        commuter: ['stasiun', 'station', 'stations'],
        driver: ['gerbang tol', 'toll gate', 'toll gates'],
        social_vibe: ['kafe, restoran, mal, atau perpustakaan', 'café, restaurant, mall, or library', 'cafés, restaurants, malls, or libraries'],
        zen: ['ruang hijau', 'green space', 'green spaces'],
    };
    const [id, satu, banyak] = benda[p];
    // Belum ada di dalam kawasan: sebutkan yang terdekat di luar batas.
    const luar = n === 0 && dekat && dekat.meter > 0 ? jarakLuar(p, dekat, bahasa) : '';
    if (en) {
        const isi = n > 0 ? `${n} ${n === 1 ? satu : banyak} in this area` : `no ${satu} in this area yet${luar}`;
        return cocok ? `A match for the ${label} lifestyle: ${isi}.` : `Not yet a match for the ${label} lifestyle: ${isi}${p === 'zen' && n > 0 ? ', but the air quality is poor' : ''}.`;
    }
    const isi = n > 0 ? `ada ${n} ${id} di kawasan ini` : `belum ada ${id} di kawasan ini${luar}`;
    return cocok ? `Cocok untuk gaya hidup ${label}: ${isi}.` : `Belum cocok untuk gaya hidup ${label}: ${isi}${p === 'zen' && n > 0 ? ', tetapi kualitas udaranya kurang baik' : ''}.`;
}

/** "; terdekat Gerbang Tol Ciawi Selatan, 1,0 km dari batas kawasan". */
function jarakLuar(p: Persona, d: { nama: string; meter: number }, bahasa: Bahasa): string {
    const en = bahasa === 'en';
    const awalan: Record<Persona, [string, string]> = {
        commuter: ['Stasiun ', ' Station'],
        driver: ['Gerbang Tol ', ' toll gate'],
        social_vibe: ['', ''],
        zen: ['', ''],
    };
    const nama = d.nama ? (en ? `${d.nama}${awalan[p][1]}` : `${awalan[p][0]}${d.nama}`) : '';
    const j = jarak(d.meter, bahasa);
    return en ? `; the nearest${nama ? `, ${nama},` : ''} is ${j} from the area boundary` : `; terdekat${nama ? ` ${nama},` : ''} ${j} dari batas kawasan`;
}

/** Ringkasan fasilitas terdekat untuk panel area (sama gaya dengan ringkasan titik). */
function RingkasanWilayah({ data }: { data: Extract<InspectResponse, { jenis_geometri: 'wilayah' }> }) {
    const { t, bahasa } = useBahasa();
    if (!data.terdekat) return null;
    const baris: [Simbol, string][] = [];
    const tulis = (p: Persona, simbol: Simbol, label: [string, string]) => {
        const d = data.terdekat?.[p];
        if (!d) return;
        const n = data.jumlah_fasilitas[p];
        baris.push([
            simbol,
            n > 0
                ? t(`${n} ${label[0]} di kawasan ini`, `${n} ${label[1]} in this area`)
                : t(`${label[0][0].toUpperCase() + label[0].slice(1)} terdekat${d.nama ? ` ${d.nama}` : ''}, ${jarak(d.meter, bahasa)} dari batas`,
                    `Nearest ${label[1]}${d.nama ? ` ${d.nama}` : ''}, ${jarak(d.meter, bahasa)} from the boundary`),
        ]);
    };
    tulis('commuter', 'stasiun', ['stasiun', 'station(s)']);
    tulis('driver', 'tol', ['gerbang tol', 'toll gate(s)']);
    tulis('social_vibe', 'hijau', ['tempat aktivitas', 'activity spot(s)']);
    tulis('zen', 'rth', ['ruang hijau', 'green space(s)']);
    return (
        <div className="nr-layer-summary" aria-label={t('Fasilitas di sekitar kawasan', 'Facilities around this area')}>
            {baris.map(([s, teks]) => (
                <span key={s} className="nr-legend">
                    <SimbolPeta kind={s} />
                    {teks}
                </span>
            ))}
        </div>
    );
}

function IsiDetail({ data, sesi }: { data: InspectResponse; sesi: Persona[] }) {
    const { t, bahasa } = useBahasa();
    const titik = data.jenis_geometri === 'titik';
    const kesimpulan = sesi.map((p) => {
        const label = PERSONA[p].label;
        if (titik) {
            const s = data.stars[p];
            if (s == null) return null;
            const f = data.fakta?.[p];
            return f ? kalimatTitik(p, s, f, bahasa) : t(`Buat gaya hidup ${label}: ${FRASA[s][0]}`, `For the ${label} lifestyle: ${FRASA[s][1]}`);
        }
        return kalimatWilayah(p, data.match[p], data.jumlah_fasilitas?.[p] ?? 0, bahasa, data.terdekat?.[p] ?? null);
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
            {data.jenis_geometri === 'wilayah' && <RingkasanWilayah data={data} />}
            {kesimpulan.length > 0 && <KartuKesimpulan kalimat={kesimpulan} tidakLengkap={data.data_tidak_lengkap} />}
        </>
    );
}
