/** Simulator Rute (8.8, FR-10, FR-11, FR-16). Titik A/B dipilih di peta atau diketik (saran dari /api/lokasi). */
import { useEffect, useState } from 'react';
import type { CommuteResponse, SaranLokasi } from '@/types';
import { api } from '@/lib/api';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { cx, rupiah } from '@/lib/nalar';
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
    hargaBbm: number;
    onHargaBbm: (rp: number) => void;
    onPilihDiPeta: (titik: 'a' | 'b') => void;
    onIsiTitik: (kunci: 'a' | 'b', titik: NonNullable<TitikRute>) => void;
    onReset: () => void;
    onTutup: () => void;
};

export function SimulatorRute({ a, b, menunggu, hasil, memuat, moda, onModa, lewatTol, onLewatTol, hargaBbm, onHargaBbm, onPilihDiPeta, onIsiTitik, onReset, onTutup }: Props) {
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
    const rincian = lengkap && moda === 'transit' && hasil?.publik ? `${teksServer(hasil.publik.rincian)}. ` : '';

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
            {lengkap && moda === 'mobil' && <IsianBbm nilai={hargaBbm} onSimpan={onHargaBbm} />}
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
