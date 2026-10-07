/** Simulator Rute (8.8, FR-10, FR-11, FR-16). Titik A/B dipilih di peta. */
import type { CommuteResponse } from '@/types';
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
    const lengkap = !!(a && b && hasil);
    const baris = (huruf: 'A' | 'B', t: TitikRute, kunci: 'a' | 'b') => (
        <div className="nr-route__row">
            <span className={cx('nr-route__dot', huruf === 'A' && 'nr-route__dot--a')} aria-hidden="true">
                {huruf}
            </span>
            <label className="nr-route__field">
                <span className="nr-sr">{huruf === 'A' ? 'Titik asal' : 'Titik tujuan'}</span>
                <input
                    className="nr-route__input"
                    readOnly
                    value={t?.label ?? ''}
                    placeholder={menunggu === kunci ? 'Klik lokasi di peta…' : 'Ketik alamat atau pilih di peta'}
                />
                {!t && (
                    <button type="button" className="nr-linkcaps" onClick={() => onPilihDiPeta(kunci)}>
                        Pilih di peta
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
                aria-label={label + (kosong ? '' : na ? ', tidak tersedia' : `, ${m!.waktu_menit} menit, ${rupiah(m!.biaya)}`)}
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
                        <span className="nr-mode__na">Tidak tersedia</span>
                        <span className="nr-mode__cost">{kunci === 'transit' ? 'Stasiun KRL terlalu jauh dari titik' : 'Coba titik yang lebih dekat ke jalan'}</span>
                    </>
                ) : (
                    <>
                        <span>
                            <span className="nr-mode__time">{m!.waktu_menit}</span>
                            <span className="nr-mode__unit">mnt</span>
                        </span>
                        <span className="nr-mode__cost">{rupiah(m!.biaya)}</span>
                    </>
                )}
            </button>
        );
    };

    const jarak = hasil?.pribadi?.jarak_km ?? hasil?.publik?.jarak_km;
    const rincian = lengkap && moda === 'transit' && hasil?.publik ? `${hasil.publik.rincian}. ` : '';

    return (
        <section className="nr-route nr-float" aria-label="Simulator Rute">
            <div className="nr-route__head">
                <span className="nr-label">Simulator Rute</span>
                {lengkap && jarak != null && <span className="nr-route__dist">{jarak.toLocaleString('id-ID')} km</span>}
                {(a || b) && (
                    <button type="button" className="nr-iconbtn" aria-label="Reset rute" title="Reset" onClick={onReset}>
                        <Ikon name="rotate-ccw" size={14} />
                    </button>
                )}
                <button type="button" className="nr-iconbtn" aria-label="Tutup Simulator Rute" onClick={onTutup}>
                    <Ikon name="x" size={14} />
                </button>
            </div>
            <div className="nr-route__points">
                {baris('A', a, 'a')}
                {baris('B', b, 'b')}
            </div>
            <div className="nr-route__modes" role="group" aria-label="Moda">
                {kotak('mobil', 'car', 'Mobil')}
                {kotak('transit', 'tram-front', 'Transit')}
            </div>
            {memuat && <Keadaan kind="memuat" title="Menghitung rute" />}
            {lengkap && <p className="nr-route__foot">{rincian}Estimasi tanpa lalu lintas real-time.</p>}
        </section>
    );
}
