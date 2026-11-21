/**
 * Bilah alat peta di tengah bawah (Pekerjaan Belum Selesai, "Cara memakai peta"):
 * alat Jelajah / Titik / Area, mode tampilan 2D / Miring / 3D (hanya MapLibre), dan zoom.
 * Saat alat aktif, satu baris petunjuk tampil di atas bilah; alat Area menambah Urungkan, Hapus, Selesai.
 * Alat Titik menampilkan pilihan jangkauan waktu tempuh (isochrone, T-056): moda dan menit; bentuknya dihitung server.
 */
import type { ModeKamera } from '@/Map/PetaExplorer';
import { useBahasa } from '@/lib/bahasa';
import { ISOCHRONE_MINUTES, ISOCHRONE_MODES, type IsochroneMode } from '@/lib/nalar';
import { Ikon } from './Dasar';

export type Alat = 'jelajah' | 'titik' | 'area';

type Props = {
    alat: Alat;
    onAlat: (a: Alat) => void;
    /** Alat Jelajah/Titik/Area disembunyikan saat Simulator Rute memakai klik peta untuk titik A/B. */
    alatTersedia: boolean;
    modeKamera: ModeKamera;
    onModeKamera: (m: ModeKamera) => void;
    /** Tombol 2D/Miring/3D hanya untuk peta MapLibre. */
    kameraTersedia: boolean;
    onZoom: (arah: 1 | -1) => void;
    jumlahSudut: number;
    teksLuas: string | null;
    memuatArea: boolean;
    onUrungkan: () => void;
    onHapus: () => void;
    onSelesai: () => void;
    /** Alat Titik: jangkauan waktu tempuh. */
    jangkauan: { mode: IsochroneMode; menit: number; memuat: boolean; onMode: (m: IsochroneMode) => void; onMenit: (n: number) => void };
};

const IKON_MODA: Record<IsochroneMode, string> = { pedestrian: 'footprints', bicycle: 'bike', auto: 'car' };

export function BilahAlat(p: Props) {
    const { t } = useBahasa();

    const alat: [Alat, string, string, string][] = [
        ['jelajah', 'hand', t('Jelajah', 'Explore'), t('Geser dan lihat peta tanpa menilai lokasi', 'Pan and browse the map without rating')],
        ['titik', 'map-pin', t('Titik', 'Point'), t('Klik peta sekali untuk menilai titik dan wilayah yang terjangkau dalam waktu tempuh tertentu', 'Click the map once to rate a point and the area reachable within a set travel time')],
        ['area', 'pentagon', t('Area', 'Area'), t('Klik sudut-sudut lahan sampai jadi poligon, lalu Selesai', 'Click the corners of a plot to draw a polygon, then Done')],
    ];
    const kamera: [ModeKamera, string, string][] = [
        ['atas', '2D', t('Tampak atas (2D)', 'Top view (2D)')],
        ['miring', t('Miring', 'Tilt'), t('Peta miring, bisa diputar', 'Tilted map, can rotate')],
        ['3d', '3D', t('3D: gedung dan medan', '3D: buildings and terrain')],
    ];

    let petunjuk: string | null = null;
    if (p.alatTersedia) {
        if (p.alat === 'jelajah') petunjuk = t('Jelajah: geser dan perbesar peta. Pilih Titik atau Area untuk menilai lokasi.', 'Explore: pan and zoom. Choose Point or Area to rate a location.');
        else if (p.alat === 'titik') petunjuk = t('Klik peta. Jangkauan:', 'Click the map. Reach:');
        else if (p.jumlahSudut === 0) petunjuk = t('Klik sudut-sudut lahan di peta. Minimal 3 titik, maksimal 25 km².', 'Click the corners of the plot on the map. At least 3 points, up to 25 km².');
        else if (p.jumlahSudut < 3) petunjuk = t(`${p.jumlahSudut} titik. Tambah ${3 - p.jumlahSudut} titik lagi.`, `${p.jumlahSudut} point(s). Add ${3 - p.jumlahSudut} more.`);
        else petunjuk = t(`${p.jumlahSudut} titik · ${p.teksLuas ?? ''}. Tambah titik atau tekan Selesai.`, `${p.jumlahSudut} points · ${p.teksLuas ?? ''}. Add points or press Done.`);
    }
    const areaAktif = p.alatTersedia && p.alat === 'area';
    const titikAktif = p.alatTersedia && p.alat === 'titik';
    const j = p.jangkauan;

    return (
        <div className="nr-bilah" role="toolbar" aria-label={t('Alat peta', 'Map tools')}>
            {petunjuk && (
                <div className="nr-bilah__petunjuk" role="status" aria-live="polite">
                    <span>{petunjuk}</span>
                    {titikAktif && (
                        <span className="nr-bilah__aksi nr-bilah__jangkauan">
                            <span className="nr-bilah__pilih" role="radiogroup" aria-label={t('Moda perjalanan', 'Travel mode')}>
                                {ISOCHRONE_MODES.map((m) => (
                                    <button key={m.value} type="button" role="radio" aria-checked={j.mode === m.value} className={j.mode === m.value ? 'aktif' : undefined} title={t(m.label)} onClick={() => j.onMode(m.value)}>
                                        <Ikon name={IKON_MODA[m.value]} size={14} />
                                        <span className="nr-bilah__label">{t(m.label)}</span>
                                    </button>
                                ))}
                            </span>
                            <span className="nr-bilah__pilih" role="radiogroup" aria-label={t('Waktu tempuh', 'Travel time')}>
                                {ISOCHRONE_MINUTES.map((n) => (
                                    <button key={n} type="button" role="radio" aria-checked={j.menit === n} className={j.menit === n ? 'aktif' : undefined} onClick={() => j.onMenit(n)}>
                                        {n} {t('mnt', 'min')}
                                    </button>
                                ))}
                            </span>
                            {j.memuat && <Ikon name="loader-circle" size={14} className="nr-spin" label={t('Menghitung jangkauan', 'Calculating reach')} />}
                        </span>
                    )}
                    {areaAktif && p.jumlahSudut > 0 && (
                        <span className="nr-bilah__aksi">
                            <button type="button" onClick={p.onUrungkan} disabled={p.memuatArea}>
                                <Ikon name="undo-2" size={14} />
                                {t('Urungkan', 'Undo')}
                            </button>
                            <button type="button" onClick={p.onHapus} disabled={p.memuatArea}>
                                <Ikon name="trash-2" size={14} />
                                {t('Hapus', 'Clear')}
                            </button>
                            <button type="button" className="nr-bilah__selesai" onClick={p.onSelesai} disabled={p.jumlahSudut < 3 || p.memuatArea}>
                                <Ikon name={p.memuatArea ? 'loader-circle' : 'check'} size={14} className={p.memuatArea ? 'nr-spin' : undefined} />
                                {t('Selesai', 'Done')}
                            </button>
                        </span>
                    )}
                </div>
            )}
            <div className="nr-bilah__baris">
                {p.alatTersedia && (
                    <div className="nr-bilah__grup" data-tur="alat" role="radiogroup" aria-label={t('Cara memakai peta', 'Map interaction')}>
                        {alat.map(([k, ikon, label, judul]) => (
                            <button key={k} type="button" role="radio" aria-checked={p.alat === k} className={p.alat === k ? 'aktif' : undefined} aria-label={label} title={judul} onClick={() => p.onAlat(k)}>
                                <Ikon name={ikon} size={16} />
                                <span className="nr-bilah__label">{label}</span>
                            </button>
                        ))}
                    </div>
                )}
                {p.kameraTersedia && (
                    <div className="nr-bilah__grup" role="radiogroup" aria-label={t('Mode tampilan peta', 'Map view mode')}>
                        {kamera.map(([k, label, judul]) => (
                            <button key={k} type="button" role="radio" aria-checked={p.modeKamera === k} className={p.modeKamera === k ? 'aktif' : undefined} title={judul} aria-label={judul} onClick={() => p.onModeKamera(k)}>
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="nr-bilah__grup">
                    <button type="button" title={t('Perkecil peta', 'Zoom out')} aria-label={t('Perkecil peta', 'Zoom out')} onClick={() => p.onZoom(-1)}>
                        <Ikon name="minus" size={16} />
                    </button>
                    <button type="button" title={t('Perbesar peta', 'Zoom in')} aria-label={t('Perbesar peta', 'Zoom in')} onClick={() => p.onZoom(1)}>
                        <Ikon name="plus" size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
