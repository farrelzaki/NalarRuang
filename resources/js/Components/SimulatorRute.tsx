/** Simulator Rute (8.8, FR-10, FR-11, FR-16). Titik A/B dipilih di peta. */
import type { CommuteResponse } from '@/types';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { cx, rupiah } from '@/lib/nalar';
import { Ikon, Keadaan } from './Dasar';

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
    onPilihDiPeta: (titik: 'a' | 'b') => void;
    onReset: () => void;
    onTutup: () => void;
};

export function SimulatorRute({ a, b, menunggu, hasil, memuat, moda, onModa, onPilihDiPeta, onReset, onTutup }: Props) {
    const { t, bahasa } = useBahasa();
    const lengkap = !!(a && b && hasil);
    const baris = (huruf: 'A' | 'B', titik: TitikRute, kunci: 'a' | 'b') => (
        <div className="nr-route__row">
            <span className={cx('nr-route__dot', huruf === 'A' && 'nr-route__dot--a')} aria-hidden="true">
                {huruf}
            </span>
            <label className="nr-route__field">
                <span className="nr-sr">{huruf === 'A' ? t('Titik asal', 'Origin') : t('Titik tujuan', 'Destination')}</span>
                <input
                    className="nr-route__input"
                    readOnly
                    value={titik ? teksServer(titik.label) : ''}
                    placeholder={menunggu === kunci ? t('Klik lokasi di peta…', 'Click a location on the map…') : t('Ketik alamat atau pilih di peta', 'Type an address or pick on the map')}
                />
                {!titik && (
                    <button type="button" className="nr-linkcaps" onClick={() => onPilihDiPeta(kunci)}>
                        {t('Pilih di peta', 'Pick on map')}
                    </button>
                )}
            </label>
        </div>
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
                        <span className="nr-mode__cost">{kunci === 'transit' ? t('Stasiun KRL terlalu jauh dari titik', 'KRL station too far from the point') : t('Coba titik yang lebih dekat ke jalan', 'Try a point closer to a road')}</span>
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
            {memuat && <Keadaan kind="memuat" title={t('Menghitung rute', 'Calculating route')} />}
            {lengkap && <p className="nr-route__foot">{rincian}{t('Estimasi tanpa lalu lintas real-time.', 'Estimate without real-time traffic.')}</p>}
        </section>
    );
}
