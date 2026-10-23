/** Simulator Rute (8.8, FR-10, FR-11, FR-16). Titik A/B dipilih di peta atau diketik (saran dari /api/lokasi). */
import { useEffect, useState } from 'react';
import type { CommuteResponse, LangkahRute, SaranLokasi } from '@/types';
import { api } from '@/lib/api';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { cx, rupiah, WARNA_LIN } from '@/lib/nalar';
import { Ikon, Keadaan, Toggle } from './Dasar';

export type Moda = 'mobil' | 'transit';
export type TitikRute = { lat: number; lng: number; label: string } | null;

type Props = {
    a: TitikRute;
    b: TitikRute;
    menunggu: 'a' | 'b' | null;
    hasil: CommuteResponse | null;
    memuat: boolean;
    moda: Moda;
    onModa: (m: Moda) => void;
    lewatTol: boolean;
    onLewatTol: () => void;
    hindariGg: boolean;
    onHindariGg: () => void;
    hargaBbm: number;
    onHargaBbm: (rp: number) => void;
    onPilihDiPeta: (titik: 'a' | 'b') => void;
    onIsiTitik: (kunci: 'a' | 'b', titik: NonNullable<TitikRute>) => void;
    onReset: () => void;
    onTutup: () => void;
};

export function SimulatorRute({ a, b, menunggu, hasil, memuat, moda, onModa, lewatTol, onLewatTol, hindariGg, onHindariGg, hargaBbm, onHargaBbm, onPilihDiPeta, onIsiTitik, onReset, onTutup }: Props) {
    const { t, bahasa } = useBahasa();
    const lengkap = !!(a && b && hasil);
    const baris = (huruf: 'A' | 'B', titik: TitikRute, kunci: 'a' | 'b') => (
        <KolomTitik huruf={huruf} titik={titik} menunggu={menunggu === kunci} onPilihDiPeta={() => onPilihDiPeta(kunci)} onIsi={(x) => onIsiTitik(kunci, x)} />
    );

    const kotak = (kunci: Moda, ikon: string, label: string) => {
        const m = kunci === 'mobil' ? hasil?.pribadi : hasil?.publik;
        const kosong = !lengkap;
        const na = lengkap && !m;
        return (
            <button
                type="button"
                className="nr-mode"
                aria-pressed={lengkap && moda === kunci}
                disabled={kosong || na}
                onClick={() => onModa(kunci)}
                aria-label={label + (kosong ? '' : na ? t(', tidak tersedia', ', not available') : `, ${m!.waktu_menit} ${t('menit', 'minutes')}, ${rupiah(m!.biaya)}`)}
            >
                <span className="nr-mode__label">
                    <Ikon name={ikon} size={12} />
                    {label}
                </span>
                {kosong ? (
                    <span className="nr-mode__time" style={{ color: 'var(--ink-40)' }}>
                        {memuat ? '…' : '—'}
                    </span>
                ) : na ? (
                    <>
                        <span className="nr-mode__na">{t('Tidak tersedia', 'Not available')}</span>
                        <span className="nr-mode__cost">{kunci === 'transit' ? t('Tidak ada stasiun atau halte di dekat titik', 'No station or stop near the point') : t('Coba titik yang lebih dekat ke jalan', 'Try a point closer to a road')}</span>
                    </>
                ) : (
                    <>
                        <span>
                            <span className="nr-mode__time">{m!.waktu_menit}</span>
                            <span className="nr-mode__unit">{t('mnt', 'min')}</span>
                        </span>
                        <span className="nr-mode__cost">{rupiah(m!.biaya)}</span>
                    </>
                )}
            </button>
        );
    };

    const jarak = hasil?.pribadi?.jarak_km ?? hasil?.publik?.jarak_km;
    const langkah = lengkap && moda === 'transit' ? hasil?.publik?.langkah : undefined;
    const rincian = lengkap && moda === 'transit' && hasil?.publik && !langkah ? `${teksServer(hasil.publik.rincian)}. ` : '';

    return (
        <section className="nr-route nr-float" aria-label={t('Simulator Rute', 'Route Simulator')}>
            <div className="nr-route__head">
                <span className="nr-label">{t('Simulator Rute', 'Route Simulator')}</span>
                {lengkap && jarak != null && <span className="nr-route__dist">{jarak.toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID')} km</span>}
                {(a || b) && (
                    <button type="button" className="nr-iconbtn" aria-label={t('Reset rute', 'Reset route')} title="Reset" onClick={onReset}>
                        <Ikon name="rotate-ccw" size={14} />
                    </button>
                )}
                <button type="button" className="nr-iconbtn" aria-label={t('Tutup Simulator Rute', 'Close Route Simulator')} onClick={onTutup}>
                    <Ikon name="x" size={14} />
                </button>
            </div>
            <div className="nr-route__points">
                {baris('A', a, 'a')}
                {baris('B', b, 'b')}
            </div>
            <div className="nr-route__modes" role="group" aria-label={t('Moda', 'Mode')}>
                {kotak('mobil', 'car', t('Mobil', 'Car'))}
                {kotak('transit', 'tram-front', 'Transit')}
            </div>
            {lengkap && moda === 'mobil' && (
                <div className="nr-route__opsi">
                    <span>{t('Lewat jalan tol', 'Use toll roads')}</span>
                    <Toggle checked={lewatTol} label={t('Lewat jalan tol', 'Use toll roads')} onChange={onLewatTol} />
                </div>
            )}
            {lengkap && moda === 'mobil' && (
                <div className="nr-route__opsi">
                    <span>{t('Hindari ruas ganjil-genap', 'Avoid odd-even roads')}</span>
                    <Toggle checked={hindariGg} label={t('Hindari ruas ganjil-genap', 'Avoid odd-even roads')} onChange={onHindariGg} />
                </div>
            )}
            {lengkap && moda === 'mobil' && <InfoGanjilGenap gg={hasil?.pribadi?.ganjil_genap} />}
            {lengkap && moda === 'mobil' && <IsianBbm nilai={hargaBbm} onSimpan={onHargaBbm} />}
            {langkah && <DaftarLangkah langkah={langkah} biayaOjol={hasil?.publik?.biaya_ojol ?? 0} biayaTransum={hasil?.publik?.biaya_transum} />}
            {memuat && <Keadaan kind="memuat" title={t('Menghitung rute', 'Calculating route')} />}
            {lengkap && (
                <p className="nr-route__foot">
                    {rincian}
                    {moda === 'mobil' && hasil?.pribadi?.biaya_bbm != null &&
                        t(
                            `BBM ${rupiah(hasil.pribadi.biaya_bbm)} + tol ${rupiah(hasil.pribadi.biaya_tol ?? 0)} (perkiraan). `,
                            `Fuel ${rupiah(hasil.pribadi.biaya_bbm)} + tolls ${rupiah(hasil.pribadi.biaya_tol ?? 0)} (estimate). `,
                        )}
                    {t('Estimasi tanpa lalu lintas real-time.', 'Estimate without real-time traffic.')}
                </p>
            )}
        </section>
    );
}

/** Keterangan ganjil-genap DKI (Pergub 88/2019) untuk rute mobil (T-024). */
function InfoGanjilGenap({ gg }: { gg?: { hindari: boolean; ruas: string[] } }) {
    const { t } = useBahasa();
    if (!gg) return null;
    const ruas = gg.ruas.join(', ');
    const jam = t('Berlaku Senin–Jumat 06.00–10.00 & 16.00–21.00 WIB, kecuali libur nasional.', 'Applies Mon–Fri 06:00–10:00 & 16:00–21:00, except public holidays.');
    let teks: string;
    if (gg.hindari) {
        teks = ruas
            ? t(`Ruas ganjil-genap yang tidak bisa dihindari: ${ruas}.`, `Odd-even roads that could not be avoided: ${ruas}.`)
            : t('Rute tidak menyusuri ruas ganjil-genap.', 'The route avoids odd-even roads.');
    } else {
        if (!ruas) return null;
        teks = t(`Rute melewati ruas ganjil-genap: ${ruas}. ${jam}`, `The route uses odd-even roads: ${ruas}. ${jam}`);
    }
    return (
        <p className={cx('nr-route__gg', gg.hindari && !ruas && 'nr-route__gg--aman')} role="status">
            <Ikon name={gg.hindari && !ruas ? 'check' : 'info'} size={12} />
            <span>{teks}</span>
        </p>
    );
}

/** Langkah perjalanan transportasi umum ala aplikasi navigasi (T-042). */
function DaftarLangkah({ langkah, biayaOjol, biayaTransum }: { langkah: LangkahRute[]; biayaOjol: number; biayaTransum?: number }) {
    const { t, bahasa } = useBahasa();
    const jarak = (m: number) =>
        m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID', { maximumFractionDigits: 1 })} km`;
    const tempat = (s: string) => (s === 'tujuan' ? t('tujuan', 'your destination') : s);
    return (
        <ol className="nr-langkah" aria-label={t('Langkah perjalanan', 'Journey steps')}>
            {langkah.map((l, i) => {
                let ikon = 'footprints';
                let warna = 'var(--ink-40)';
                let judul: string;
                let ket: string;
                if (l.tipe === 'jalan') {
                    judul = t(`Jalan kaki ke ${tempat(l.ke)}`, `Walk to ${tempat(l.ke)}`);
                    ket = `${l.menit} ${t('mnt', 'min')} · ${jarak(l.meter)}`;
                } else if (l.tipe === 'ojol') {
                    ikon = 'bike';
                    warna = 'var(--green-500)';
                    judul = t(`Naik ojek online ke ${tempat(l.ke)}`, `Take a ride-hailing motorbike to ${tempat(l.ke)}`);
                    ket = `${l.menit} ${t('mnt', 'min')} · ${jarak(l.meter)} · ±${rupiah(l.biaya ?? 0)}`;
                } else if (l.tipe === 'pindah') {
                    judul = t(`Pindah di ${l.di}`, `Transfer at ${l.di}`) + (l.ke && l.ke !== l.di ? ` → ${l.ke}` : '');
                    ket = `${t('Jalan', 'Walk')} ${jarak(l.meter)} · ${l.menit} ${t('mnt', 'min')}`;
                } else {
                    const n = l as Extract<LangkahRute, { tipe: 'naik' }>;
                    ikon = n.jenis === 'tj' ? 'bus-front' : 'tram-front';
                    warna = WARNA_LIN[n.lin] ?? 'var(--navy-900)';
                    judul = t(`${n.moda}: ${n.dari} → ${n.ke}`, `${n.moda}: ${n.dari} → ${n.ke}`);
                    ket = `${n.henti} ${n.jenis === 'tj' ? t('halte', n.henti > 1 ? 'stops' : 'stop') : t('stasiun', n.henti > 1 ? 'stations' : 'station')} · ${n.menit} ${t('mnt', 'min')}`;
                }
                return (
                    <li key={i} className={cx('nr-langkah__baris', l.tipe === 'naik' && 'nr-langkah__baris--naik')} style={{ ['--warna' as string]: warna }}>
                        <span className="nr-langkah__ikon" aria-hidden="true">
                            <Ikon name={ikon} size={13} />
                        </span>
                        <span className="nr-langkah__teks">
                            <span className="nr-langkah__judul">{judul}</span>
                            <span className="nr-langkah__ket">{ket}</span>
                        </span>
                    </li>
                );
            })}
            {(biayaOjol > 0 || biayaTransum != null) && (
                <li className="nr-langkah__biaya">
                    {biayaOjol > 0
                        ? t(`Tarif transum ${rupiah(biayaTransum ?? 0)} + ojol ±${rupiah(biayaOjol)}`, `Transit fare ${rupiah(biayaTransum ?? 0)} + ride-hailing ±${rupiah(biayaOjol)}`)
                        : t(`Tarif resmi ${rupiah(biayaTransum ?? 0)}`, `Official fare ${rupiah(biayaTransum ?? 0)}`)}
                </li>
            )}
        </ol>
    );
}

function IsianBbm({ nilai, onSimpan }: { nilai: number; onSimpan: (rp: number) => void }) {
    const { t } = useBahasa();
    const [teks, setTeks] = useState(String(nilai));
    useEffect(() => setTeks(String(nilai)), [nilai]);
    const simpan = () => {
        const rp = Math.round(Number(teks.replace(/\D/g, '')));
        if (rp >= 5000 && rp <= 30000) onSimpan(rp);
        else setTeks(String(nilai));
    };
    return (
        <label className="nr-route__opsi">
            <span>{t('Harga BBM per liter (Rp)', 'Fuel price per litre (Rp)')}</span>
            <input
                className="nr-route__bbm"
                inputMode="numeric"
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                onBlur={simpan}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                aria-label={t('Harga BBM per liter dalam rupiah', 'Fuel price per litre in rupiah')}
            />
        </label>
    );
}

/** Kolom titik A/B: bisa diketik (min. 3 huruf) dengan saran lokasi, atau dipilih di peta. */
function KolomTitik({ huruf, titik, menunggu, onPilihDiPeta, onIsi }: {
    huruf: 'A' | 'B';
    titik: TitikRute;
    menunggu: boolean;
    onPilihDiPeta: () => void;
    onIsi: (t: NonNullable<TitikRute>) => void;
}) {
    const { t } = useBahasa();
    const [teks, setTeks] = useState('');
    const [ketik, setKetik] = useState(false);
    const [saran, setSaran] = useState<SaranLokasi[]>([]);

    useEffect(() => {
        const q = teks.trim();
        if (!ketik || q.length < 3) {
            setSaran([]);
            return;
        }
        const ctrl = new AbortController();
        const jeda = setTimeout(() => api.lokasi(q, ctrl.signal).then((r) => setSaran(r.hasil)).catch(() => {}), 300);
        return () => {
            clearTimeout(jeda);
            ctrl.abort();
        };
    }, [teks, ketik]);

    const pilih = (s: SaranLokasi) => {
        onIsi({ lat: s.lat, lng: s.lng, label: `${s.nama}, ${s.keterangan}` });
        setKetik(false);
        setSaran([]);
    };
    const jenis = { wilayah: t('Kelurahan', 'Area'), stasiun: t('Stasiun', 'Station'), halte: t('Halte', 'Stop'), poi: t('Tempat', 'Place') };

    return (
        <div className="nr-route__row">
            <span className={cx('nr-route__dot', huruf === 'A' && 'nr-route__dot--a')} aria-hidden="true">
                {huruf}
            </span>
            <label className="nr-route__field">
                <span className="nr-sr">{huruf === 'A' ? t('Titik asal', 'Origin') : t('Titik tujuan', 'Destination')}</span>
                <input
                    className="nr-route__input"
                    value={ketik ? teks : titik ? teksServer(titik.label) : ''}
                    placeholder={menunggu ? t('Klik peta atau ketik nama tempat…', 'Click the map or type a place…') : t('Ketik nama tempat atau pilih di peta', 'Type a place or pick on the map')}
                    onFocus={() => {
                        setKetik(true);
                        setTeks('');
                    }}
                    onChange={(e) => setTeks(e.target.value)}
                    onBlur={() => setTimeout(() => setKetik(false), 150)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && saran[0]) pilih(saran[0]);
                        if (e.key === 'Escape') (e.currentTarget as HTMLInputElement).blur();
                    }}
                    role="combobox"
                    aria-expanded={saran.length > 0}
                    aria-autocomplete="list"
                />
                {!titik && !ketik && (
                    <button type="button" className="nr-linkcaps" onClick={onPilihDiPeta}>
                        {t('Pilih di peta', 'Pick on map')}
                    </button>
                )}
                {ketik && saran.length > 0 && (
                    <ul className="nr-route__saran" role="listbox">
                        {saran.map((s, i) => (
                            <li key={`${s.jenis}-${s.nama}-${i}`} role="option" aria-selected={i === 0}>
                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pilih(s)}>
                                    <span className="nr-route__saran-nama">{s.nama}</span>
                                    <span className="nr-route__saran-ket">{s.jenis === 'wilayah' ? s.keterangan : jenis[s.jenis]}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </label>
        </div>
    );
}
