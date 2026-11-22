/**
 * Panel layer Uji Lahan (FR-23), mirip panel layer di aplikasi editor: daftar layer (lahan, zona bangunan/parkir/taman),
 * tampil/sembunyi, kunci, ganti nama, urutan, duplikat, hapus, dan sub-layer (masking). Isi hasil hitungan (unit, kavling, slot, ...)
 * hanya bisa disembunyikan per jenis.
 *
 * Semua perubahan daftar zona lewat `onUbah(daftarBaru)`; logikanya murni di lib/layerLahan.ts. Zona bawaan pola (belum
 * diubah pengguna) ikut tampil; mengubah apa pun menjadikannya zona pengguna.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { JenisZona, ZonaLahan } from '@/types';
import { useBahasa } from '@/lib/bahasa';
import {
    aturInduk, bisaJadiInduk, buatUid, duplikatZona, hapusZona, pindahUrutan, resetTarik, serupa, setKunci, setKunciBanyak, setSembunyi, setSembunyiBanyak, ubahNama, urutanTampil, WARNA_ZONA,
} from '@/lib/layerLahan';
import { Ikon } from './Dasar';

export type IsiLayer = { jenis: string; jumlah: number };

export type PropsLayerLahan = {
    /** Daftar layer yang tampil (zona pengguna, atau zona bawaan pola bila belum ada). */
    zona: ZonaLahan[];
    /** luas (m²) per uid dari hasil server, bila ada. */
    luas: ReadonlyMap<string, number>;
    manual: boolean;
    dipilih: string | null;
    onPilih: (uid: string | null) => void;
    onUbah: (zona: ZonaLahan[]) => void;
    lahanTerkunci: boolean;
    onKunciLahan: (kunci: boolean) => void;
    /** Isi hasil hitungan (unit, kavling, slot, ...) yang ada sekarang, dan jenis yang disembunyikan. */
    isi: IsiLayer[];
    isiSembunyi: string[];
    onIsi: (jenis: string, tampil: boolean) => void;
};

const LABEL_JENIS: Record<JenisZona, [string, string]> = { bangunan: ['Gedung', 'Building'], parkir: ['Parkir', 'Parking'], taman: ['Taman', 'Park'] };

const LABEL_ISI: Record<string, [string, string]> = {
    unit: ['Unit', 'Units'],
    kavling: ['Kavling', 'Plots'],
    jalan: ['Jalan', 'Roads'],
    koridor: ['Koridor', 'Corridors'],
    taman: ['Taman', 'Greenery'],
    parkir: ['Parkir', 'Parking'],
    slot: ['Slot parkir', 'Parking stalls'],
    lobi: ['Lobi', 'Lobbies'],
    jalur: ['Jalur pejalan', 'Walkways'],
    inti: ['Inti', 'Cores'],
    void: ['Void', 'Voids'],
    tapak: ['Tapak', 'Footprint'],
    akses: ['Jalan masuk', 'Access roads'],
};

const angka = (n: number, bahasa: string) => n.toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID', { maximumFractionDigits: 0 });

export function PanelLayerLahan(props: PropsLayerLahan) {
    const { t, bahasa } = useBahasa();
    const { zona, dipilih } = props;
    const [ganti, setGanti] = useState<string | null>(null);
    const pohon = useMemo(() => urutanTampil(zona), [zona]);
    const terpilih = zona.find((z) => z.uid === dipilih) ?? null;

    // Pilihan yang sudah tak ada (dihapus, undo) dilepas.
    useEffect(() => {
        if (dipilih && !terpilih) props.onPilih(null);
    }, [dipilih, terpilih]);

    const nomorJenis = useMemo(() => {
        const hitung: Record<string, number> = {};
        const hasil = new Map<string, number>();
        for (const z of zona) {
            hitung[z.jenis] = (hitung[z.jenis] ?? 0) + 1;
            hasil.set(z.uid, hitung[z.jenis]);
        }
        return hasil;
    }, [zona]);

    const namaDasar = (z: ZonaLahan): string => {
        const [id, en] = LABEL_JENIS[z.jenis];
        return `${t(id, en)} ${nomorJenis.get(z.uid) ?? ''}`.trim();
    };
    const tampilNama = (z: ZonaLahan) => z.nama ?? namaDasar(z);

    const terapkan = (baru: ZonaLahan[]) => {
        if (baru !== zona) props.onUbah(baru);
    };

    /** Ubah urutan: setelahnya urutan di daftar yang menentukan siapa menang saat bertumpuk (bukan siapa terakhir ditarik). */
    const geser = (arah: -1 | 1) => {
        if (!terpilih) return;
        const pindah = pindahUrutan(zona, terpilih.uid, arah);
        if (pindah !== zona) terapkan(resetTarik(pindah));
    };

    const kandidatInduk = terpilih ? zona.filter((z) => bisaJadiInduk(zona, terpilih.uid, z.uid)) : [];

    return (
        <div className="nr-layer">
            <ul className="nr-layer__daftar" role="list" aria-label={t('Layer lahan', 'Site layers')}>
                <li className="nr-layer__baris nr-layer__baris--lahan">
                    <i className="nr-layer__warna" style={{ background: '#e4572e' }} aria-hidden="true" />
                    <span className="nr-layer__nama nr-layer__nama--tetap">{t('Lahan', 'Site')}</span>
                    <button
                        type="button"
                        className={`nr-layer__ikon${props.lahanTerkunci ? ' is-aktif' : ''}`}
                        aria-pressed={props.lahanTerkunci}
                        title={props.lahanTerkunci ? t('Buka kunci lahan', 'Unlock site') : t('Kunci lahan', 'Lock site')}
                        onClick={() => props.onKunciLahan(!props.lahanTerkunci)}
                    >
                        <Ikon name={props.lahanTerkunci ? 'lock' : 'lock-open'} size={14} />
                    </button>
                </li>

                {pohon.map(({ zona: z, kedalaman }) => {
                    const aktif = z.uid === dipilih;
                    const luas = props.luas.get(z.uid);
                    return (
                        <li
                            key={z.uid}
                            className={`nr-layer__baris${aktif ? ' is-terpilih' : ''}${z.sembunyi ? ' is-sembunyi' : ''}`}
                            style={{ paddingLeft: 8 + kedalaman * 14 }}
                        >
                            <i className="nr-layer__warna" style={{ background: WARNA_ZONA[z.jenis] }} aria-hidden="true" />
                            {ganti === z.uid ? (
                                <input
                                    className="nr-layer__ubah"
                                    autoFocus
                                    defaultValue={tampilNama(z)}
                                    maxLength={40}
                                    aria-label={t('Nama layer', 'Layer name')}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onBlur={(e) => {
                                        const nilai = e.currentTarget.value.trim();
                                        // Nama kosong atau sama dengan nama bawaan = kembali ke nama bawaan.
                                        terapkan(ubahNama(zona, z.uid, nilai === namaDasar(z) ? '' : nilai));
                                        setGanti(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.currentTarget.blur();
                                        if (e.key === 'Escape') setGanti(null);
                                    }}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="nr-layer__nama"
                                    aria-pressed={aktif}
                                    title={t('Klik untuk memilih, klik dua kali untuk mengganti nama', 'Click to select, double-click to rename')}
                                    onClick={() => props.onPilih(aktif ? null : z.uid)}
                                    onDoubleClick={() => setGanti(z.uid)}
                                >
                                    {tampilNama(z)}
                                </button>
                            )}
                            {luas !== undefined && <span className="nr-layer__luas">{angka(luas, bahasa)} m²</span>}
                            <button
                                type="button"
                                className={`nr-layer__ikon${z.sembunyi ? ' is-aktif' : ''}`}
                                aria-pressed={!!z.sembunyi}
                                title={z.sembunyi ? t('Tampilkan di peta', 'Show on map') : t('Sembunyikan dari peta', 'Hide from map')}
                                onClick={() => terapkan(setSembunyi(zona, z.uid, !z.sembunyi))}
                            >
                                <Ikon name={z.sembunyi ? 'eye-off' : 'eye'} size={14} />
                            </button>
                            <button
                                type="button"
                                className={`nr-layer__ikon${z.kunci ? ' is-aktif' : ''}`}
                                aria-pressed={!!z.kunci}
                                title={z.kunci ? t('Buka kunci', 'Unlock') : t('Kunci (tidak bisa ditarik atau dihapus)', 'Lock (cannot be dragged or deleted)')}
                                onClick={() => terapkan(setKunci(zona, z.uid, !z.kunci))}
                            >
                                <Ikon name={z.kunci ? 'lock' : 'lock-open'} size={14} />
                            </button>
                        </li>
                    );
                })}
            </ul>

            {zona.length === 0 && <p className="nr-layer__kosong">{t('Belum ada zona. Tambahkan lewat tombol di atas.', 'No zones yet. Add one with the buttons above.')}</p>}
            {!props.manual && zona.length > 0 && (
                <p className="nr-layer__catatan">{t('Zona bawaan pola. Mengubah apa pun di sini menjadikannya zona sendiri.', 'Default pattern zones. Changing anything here turns them into your own zones.')}</p>
            )}

            {zona.length > 1 && (
                <p className="nr-layer__catatan">
                    {t('Saat layer bertumpuk, yang lain menyesuaikan diri: layer terkunci menang, lalu yang terakhir ditarik, lalu yang lebih atas di daftar.', 'When layers overlap, the others adapt: locked layers win, then the one dragged last, then the one higher in the list.')}
                </p>
            )}

            {terpilih && (
                <div className="nr-layer__alat" role="group" aria-label={t('Aksi layer terpilih', 'Selected layer actions')}>
                    <div className="nr-layer__tombol">
                        <button type="button" className="nr-layer__aksi" title={t('Naikkan urutan (lebih diutamakan saat bertumpuk)', 'Move up (wins when layers overlap)')} onClick={() => geser(-1)}>
                            <Ikon name="arrow-up" size={13} />
                        </button>
                        <button type="button" className="nr-layer__aksi" title={t('Turunkan urutan (kurang diutamakan saat bertumpuk)', 'Move down (loses when layers overlap)')} onClick={() => geser(1)}>
                            <Ikon name="arrow-down" size={13} />
                        </button>
                        <button type="button" className="nr-layer__aksi" title={t('Ganti nama', 'Rename')} onClick={() => setGanti(terpilih.uid)}>
                            <Ikon name="pencil" size={13} />
                        </button>
                        <button
                            type="button"
                            className="nr-layer__aksi"
                            title={t('Duplikat', 'Duplicate')}
                            onClick={() => {
                                const uid = buatUid();
                                // Salinan digeser sedikit (±0,0002°, sekitar 20 m) supaya terlihat terpisah.
                                terapkan(duplikatZona(zona, terpilih.uid, { dLat: -0.0002, dLng: 0.0002 }, uid, t('salinan', 'copy'), namaDasar(terpilih)));
                                props.onPilih(uid);
                            }}
                        >
                            <Ikon name="copy" size={13} />
                        </button>
                        <button
                            type="button"
                            className="nr-layer__aksi nr-layer__aksi--hapus"
                            disabled={!!terpilih.kunci}
                            title={terpilih.kunci ? t('Layer terkunci', 'Layer is locked') : t('Hapus layer', 'Delete layer')}
                            onClick={() => {
                                terapkan(hapusZona(zona, terpilih.uid));
                                props.onPilih(null);
                            }}
                        >
                            <Ikon name="trash-2" size={13} />
                        </button>
                    </div>

                    <label className="nr-layer__induk">
                        <span>{t('Sub-layer dari', 'Sub-layer of')}</span>
                        <select value={terpilih.induk ?? ''} onChange={(e) => terapkan(aturInduk(zona, terpilih.uid, e.target.value || undefined))}>
                            <option value="">{t('— (tidak ada)', '— (none)')}</option>
                            {kandidatInduk.map((z) => (
                                <option key={z.uid} value={z.uid}>
                                    {tampilNama(z)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {terpilih.induk && (
                        <p className="nr-layer__catatan">
                            {t('Dipotong ke bentuk induknya; induk kehilangan bagian ini (mis. taman sebagai halaman dalam gedung).', 'Clipped to its parent shape; the parent loses this area (e.g. a courtyard inside a building).')}
                        </p>
                    )}

                    <div className="nr-layer__serupa">
                        <button type="button" className="nr-lahan__tautan" onClick={() => terapkan(setKunciBanyak(zona, serupa(zona, terpilih.uid), !terpilih.kunci))}>
                            <Ikon name={terpilih.kunci ? 'lock-open' : 'lock'} size={12} /> {terpilih.kunci ? t('Buka semua sejenis', 'Unlock all of this kind') : t('Kunci semua sejenis', 'Lock all of this kind')}
                        </button>
                        <button type="button" className="nr-lahan__tautan" onClick={() => terapkan(setSembunyiBanyak(zona, serupa(zona, terpilih.uid), !terpilih.sembunyi))}>
                            <Ikon name={terpilih.sembunyi ? 'eye' : 'eye-off'} size={12} /> {terpilih.sembunyi ? t('Tampilkan semua sejenis', 'Show all of this kind') : t('Sembunyikan semua sejenis', 'Hide all of this kind')}
                        </button>
                    </div>
                </div>
            )}

            {props.isi.length > 0 && <IsiHasil {...props} />}
        </div>
    );
}

/** Daftar jenis isi hasil hitungan; tiap jenis bisa disembunyikan dari peta (hitungan tidak berubah). */
function IsiHasil({ isi, isiSembunyi, onIsi }: PropsLayerLahan) {
    const { t } = useBahasa();
    const wadah = useRef<HTMLDetailsElement | null>(null);
    return (
        <details className="nr-layer__isi" ref={wadah}>
            <summary>{t('Isi hasil hitungan', 'Calculated contents')}</summary>
            <ul role="list">
                {isi.map((x) => {
                    const [id, en] = LABEL_ISI[x.jenis] ?? [x.jenis, x.jenis];
                    const tampil = !isiSembunyi.includes(x.jenis);
                    return (
                        <li key={x.jenis}>
                            <label>
                                <input type="checkbox" checked={tampil} onChange={(e) => onIsi(x.jenis, e.target.checked)} />
                                <span>{t(id, en)}</span>
                                <small>{x.jumlah}</small>
                            </label>
                        </li>
                    );
                })}
            </ul>
        </details>
    );
}
