/**
 * Demo visual FR-24 DRAF (listing properti) — BELUM bagian kontrak resmi, dibuat untuk ditunjukkan
 * ke PM, bukan bagian alur produk NalarRuang (tidak ditautkan dari Landing/menu). Lihat
 * docs/RENCANA.md TBD-12. Peta sederhana sendiri (bukan Map/PetaExplorer) agar tidak menyentuh
 * peta utama yang sudah dipakai banyak fitur lain.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Head } from '@inertiajs/react';
import L from 'leaflet';
import { api } from '@/lib/api';
import { useBahasa } from '@/lib/bahasa';
import { Ikon, Toast } from '@/Components/Dasar';
import type { HargaSatuan, PerumahanFeatureCollection, PerumahanProperties, TipePerumahan } from '@/types/perumahan';

const PUSAT: L.LatLngExpression = [-6.3, 106.85];
const TIPE_LABEL: Record<TipePerumahan, [string, string]> = {
    rumah: ['Rumah', 'House'],
    kos: ['Kos', 'Boarding room'],
    apartemen: ['Apartemen', 'Apartment'],
};
const SATUAN_LABEL: Record<HargaSatuan, [string, string]> = {
    jual: ['dijual', 'for sale'],
    sewa_bulan: ['/bulan', '/month'],
    sewa_tahun: ['/tahun', '/year'],
};
const EMOJI: Record<TipePerumahan, string> = { rumah: '🏠', kos: '🛏️', apartemen: '🏢' };

const tokenKey = (id: number) => `nr-perumahan-token-${id}`;

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

export default function PerumahanDemo() {
    const { t } = useBahasa();
    const wadah = useRef<HTMLDivElement>(null);
    const peta = useRef<L.Map | null>(null);
    const grup = useRef<L.LayerGroup | null>(null);
    const markerBaru = useRef<L.Marker | null>(null);

    const [mode, setMode] = useState<'lihat' | 'tambah'>('lihat');
    const [titikBaru, setTitikBaru] = useState<{ lat: number; lng: number } | null>(null);
    const [terpilih, setTerpilih] = useState<PerumahanProperties | null>(null);
    const [memuat, setMemuat] = useState(false);
    const [mengirim, setMengirim] = useState(false);
    const [toast, setToast] = useState<{ tone: 'success' | 'danger'; teks: string } | null>(null);
    const [tersimpan, setTersimpan] = useState<{ id: number; token: string } | null>(null);

    const [nama, setNama] = useState('');
    const [tipe, setTipe] = useState<TipePerumahan>('rumah');
    const [harga, setHarga] = useState('');
    const [hargaSatuan, setHargaSatuan] = useState<HargaSatuan>('jual');
    const [kontakWa, setKontakWa] = useState('');
    const [deskripsi, setDeskripsi] = useState('');

    const gambarMarker = (fc: PerumahanFeatureCollection) => {
        const g = grup.current;
        if (!g) return;
        g.clearLayers();
        fc.features.forEach((f) => {
            const [lng, lat] = f.geometry.coordinates;
            L.marker([lat, lng], {
                icon: L.divIcon({ className: '', html: `<span class="nr-perumahan-pin">${EMOJI[f.properties.tipe]}</span>`, iconSize: [30, 30], iconAnchor: [15, 28] }),
            })
                .on('click', () => setTerpilih(f.properties))
                .addTo(g);
        });
    };

    const muatData = () => {
        const m = peta.current;
        if (!m) return;
        const b = m.getBounds();
        setMemuat(true);
        api.perumahan
            .cari([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
            .then(gambarMarker)
            .catch(() => setToast({ tone: 'danger', teks: t('Gagal memuat listing.', 'Failed to load listings.') }))
            .finally(() => setMemuat(false));
    };

    // Peta dibuat sekali.
    useEffect(() => {
        if (!wadah.current || peta.current) return;
        const m = L.map(wadah.current, { zoomControl: true }).setView(PUSAT, 10);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
        grup.current = L.layerGroup().addTo(m);
        peta.current = m;
        m.on('moveend', muatData);
        muatData();
        return () => {
            m.remove();
            peta.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Klik peta untuk pilih lokasi, hanya saat mode tambah dan belum ada titik; didaftar ulang tiap berubah.
    useEffect(() => {
        const m = peta.current;
        if (!m) return;
        const tangani = (e: L.LeafletMouseEvent) => {
            if (mode === 'tambah' && !titikBaru) setTitikBaru({ lat: e.latlng.lat, lng: e.latlng.lng });
        };
        m.on('click', tangani);
        return () => {
            m.off('click', tangani);
        };
    }, [mode, titikBaru]);

    // Tandai titik yang baru dipilih di peta.
    useEffect(() => {
        markerBaru.current?.remove();
        markerBaru.current = null;
        if (titikBaru && peta.current) {
            markerBaru.current = L.marker([titikBaru.lat, titikBaru.lng], {
                icon: L.divIcon({ className: '', html: '<span class="nr-perumahan-pin nr-perumahan-pin--baru">📍</span>', iconSize: [30, 30], iconAnchor: [15, 28] }),
            }).addTo(peta.current);
        }
    }, [titikBaru]);

    const mulaiTambah = () => {
        setTerpilih(null);
        setTersimpan(null);
        setMode('tambah');
    };

    const batalTambah = () => {
        setMode('lihat');
        setTitikBaru(null);
        setNama('');
        setHarga('');
        setKontakWa('');
        setDeskripsi('');
    };

    const kirim = () => {
        if (!titikBaru || !nama.trim() || !kontakWa.trim()) return;
        setMengirim(true);
        api.perumahan
            .unggah({
                nama: nama.trim(),
                deskripsi: deskripsi.trim() || undefined,
                tipe,
                harga: harga.trim() ? Number(harga.replace(/\D/g, '')) : undefined,
                harga_satuan: harga.trim() ? hargaSatuan : undefined,
                kontak_wa: kontakWa.trim(),
                lat: titikBaru.lat,
                lng: titikBaru.lng,
            })
            .then((r) => {
                localStorage.setItem(tokenKey(r.id), r.token_kelola);
                setTersimpan({ id: r.id, token: r.token_kelola });
                setToast({ tone: 'success', teks: t('Listing berhasil dipasang.', 'Listing published.') });
                muatData();
            })
            .catch((e: Error) => setToast({ tone: 'danger', teks: e.message }))
            .finally(() => setMengirim(false));
    };

    const hapusTerpilih = () => {
        if (!terpilih) return;
        const token = localStorage.getItem(tokenKey(terpilih.id));
        if (!token) return;
        api.perumahan
            .hapus(terpilih.id, token)
            .then(() => {
                localStorage.removeItem(tokenKey(terpilih.id));
                setTerpilih(null);
                setToast({ tone: 'success', teks: t('Listing dihapus.', 'Listing removed.') });
                muatData();
            })
            .catch((e: Error) => setToast({ tone: 'danger', teks: e.message }));
    };

    return (
        <>
            <Head title="Demo FR-24: Listing Properti" />
            <div style={{ position: 'relative', height: '100vh', width: '100vw', fontFamily: 'var(--font-sans)' }}>
                <div ref={wadah} style={{ position: 'absolute', inset: 0 }} />

                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, maxWidth: 320 }}>
                    <div style={{ background: 'var(--white)', borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--line)' }}>
                        <strong style={{ display: 'block', fontSize: 13 }}>Demo FR-24 — Listing Properti</strong>
                        <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                            {t('DRAF, belum disetujui PM. Bukan bagian produk NalarRuang.', 'DRAFT, not yet approved by the PM. Not part of the NalarRuang product.')}
                        </span>
                    </div>
                </div>

                {toast && (
                    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1300 }} onClick={() => setToast(null)}>
                        <Toast tone={toast.tone}>{toast.teks}</Toast>
                    </div>
                )}

                {mode === 'lihat' && !terpilih && (
                    <button
                        type="button"
                        onClick={mulaiTambah}
                        style={{
                            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 999,
                            background: 'var(--navy-900)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            boxShadow: 'var(--shadow-lg)',
                        }}
                    >
                        <Ikon name="plus" size={14} color="#fff" />
                        {t('Pasang listing', 'Add listing')}
                    </button>
                )}

                {mode === 'tambah' && !titikBaru && (
                    <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--white)', borderRadius: 12, padding: '10px 16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13 }}>{t('Klik lokasi di peta', 'Click a location on the map')}</span>
                        <button type="button" onClick={batalTambah} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                            <Ikon name="x" size={16} />
                        </button>
                    </div>
                )}

                {mode === 'tambah' && titikBaru && !tersimpan && (
                    <div style={{ position: 'absolute', top: 70, right: 12, zIndex: 1200, width: 300, background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>{t('Listing baru', 'New listing')}</strong>
                            <button type="button" onClick={batalTambah} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                <Ikon name="x" size={16} />
                            </button>
                        </div>
                        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                            {t('Nama', 'Name')}
                            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder={t('Rumah 2 lantai dekat stasiun', '2-storey house near the station')} style={inputStyle} />
                        </label>
                        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                            {t('Tipe', 'Type')}
                            <select value={tipe} onChange={(e) => setTipe(e.target.value as TipePerumahan)} style={inputStyle}>
                                {(Object.keys(TIPE_LABEL) as TipePerumahan[]).map((k) => (
                                    <option key={k} value={k}>
                                        {t(...TIPE_LABEL[k])}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <label style={{ fontSize: 11, color: 'var(--ink-60)', flex: 1 }}>
                                {t('Harga (opsional)', 'Price (optional)')}
                                <input inputMode="numeric" value={harga} onChange={(e) => setHarga(e.target.value)} placeholder="500000000" style={inputStyle} />
                            </label>
                            <label style={{ fontSize: 11, color: 'var(--ink-60)', width: 110 }}>
                                {t('Satuan', 'Unit')}
                                <select value={hargaSatuan} onChange={(e) => setHargaSatuan(e.target.value as HargaSatuan)} style={inputStyle}>
                                    {(Object.keys(SATUAN_LABEL) as HargaSatuan[]).map((k) => (
                                        <option key={k} value={k}>
                                            {t(...SATUAN_LABEL[k])}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                            {t('Nomor WhatsApp', 'WhatsApp number')}
                            <input value={kontakWa} onChange={(e) => setKontakWa(e.target.value)} placeholder="081234567890" style={inputStyle} />
                        </label>
                        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
                            {t('Deskripsi (opsional)', 'Description (optional)')}
                            <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </label>
                        <button
                            type="button"
                            disabled={mengirim || !nama.trim() || !kontakWa.trim()}
                            onClick={kirim}
                            style={{ marginTop: 4, padding: '10px', borderRadius: 8, background: 'var(--navy-900)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: mengirim ? 0.6 : 1 }}
                        >
                            {mengirim ? t('Mengirim...', 'Submitting...') : t('Pasang listing', 'Publish listing')}
                        </button>
                    </div>
                )}

                {tersimpan && (
                    <div style={{ position: 'absolute', top: 70, right: 12, zIndex: 1200, width: 300, background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-lg)', border: '1.5px solid var(--navy-900)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <strong style={{ fontSize: 13 }}>{t('Listing terpasang!', 'Listing published!')}</strong>
                        <p style={{ fontSize: 11, color: 'var(--ink-60)', margin: 0 }}>
                            {t('Kode hapus listing (disimpan otomatis di perangkat ini, tapi catat juga untuk jaga-jaga):', 'Listing delete code (saved automatically on this device, but note it down too):')}
                        </p>
                        <code style={{ fontSize: 11, background: 'var(--slate-50)', padding: 8, borderRadius: 6, wordBreak: 'break-all' }}>{tersimpan.token}</code>
                        <button type="button" onClick={batalTambah} style={{ marginTop: 4, padding: '8px', borderRadius: 8, background: 'var(--navy-900)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            {t('Selesai', 'Done')}
                        </button>
                    </div>
                )}

                {terpilih && mode === 'lihat' && (
                    <div style={{ position: 'absolute', top: 70, right: 12, zIndex: 1200, width: 300, background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <strong style={{ fontSize: 14 }}>
                                {EMOJI[terpilih.tipe]} {terpilih.nama}
                            </strong>
                            <button type="button" onClick={() => setTerpilih(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                <Ikon name="x" size={16} />
                            </button>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--ink-60)', textTransform: 'capitalize' }}>{t(...TIPE_LABEL[terpilih.tipe])}</span>
                        {terpilih.harga != null && (
                            <strong style={{ fontSize: 15 }}>
                                {rupiah(terpilih.harga)} {terpilih.harga_satuan && t(...SATUAN_LABEL[terpilih.harga_satuan])}
                            </strong>
                        )}
                        {terpilih.deskripsi && <p style={{ fontSize: 12, margin: 0, color: 'var(--ink-70)' }}>{terpilih.deskripsi}</p>}
                        <a
                            href={`https://wa.me/${terpilih.kontak_wa.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginTop: 4, textAlign: 'center', padding: '8px', borderRadius: 8, background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
                        >
                            {t('Hubungi via WhatsApp', 'Contact via WhatsApp')}
                        </a>
                        {typeof window !== 'undefined' && localStorage.getItem(tokenKey(terpilih.id)) && (
                            <button
                                type="button"
                                onClick={hapusTerpilih}
                                style={{ padding: '8px', borderRadius: 8, background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-600)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                                {t('Hapus listing saya', 'Delete my listing')}
                            </button>
                        )}
                    </div>
                )}

                {memuat && (
                    <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000, fontSize: 11, color: 'var(--ink-60)', background: 'var(--white-80)', padding: '4px 10px', borderRadius: 999 }}>
                        {t('Memuat...', 'Loading...')}
                    </div>
                )}
            </div>
        </>
    );
}

const inputStyle: CSSProperties = {
    display: 'block', width: '100%', marginTop: 4, padding: '7px 9px', borderRadius: 6,
    border: '1px solid var(--line)', fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--navy-900)', boxSizing: 'border-box',
};
