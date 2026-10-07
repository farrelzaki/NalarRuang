/**
 * Visual Explorer (UI01–UI05). Tata letak design-system.md bagian 5: search + satu panel di kolom kiri,
 * tombol merek kanan atas, LAYER/PERSONA + panel kanan di kanan bawah, slider tahun tengah bawah.
 */
import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Geometry } from 'geojson';
import type { CommuteResponse, HasilSearch, InspectResponse, LayerKey, LayerResponse, Persona } from '@/types';
import { api } from '@/lib/api';
import { useBahasa } from '@/lib/bahasa';
import { bacaPersonaSesi, PERSONA, simpanPersonaSesi } from '@/lib/nalar';
import PetaExplorer, { type TitikPeta } from '@/Map/PetaExplorer';
import { Toast, type NadaToast } from '@/Components/Dasar';
import { PanelFilter, PanelTop3, SearchBar } from '@/Components/Pencarian';
import { DetailLokasi } from '@/Components/DetailLokasi';
import { SimulatorRute, type Moda, type TitikRute } from '@/Components/SimulatorRute';
import { PanelLayer, PanelProfilPersona, SliderTahun, TombolLayerPersona, TombolMerek, type PanelKananKey, type StatusLayer } from '@/Components/PanelKananPeta';
import { DialogPersona, DrawerMenu, type TabMenu } from '@/Components/MenuPersona';

type PanelKiri = 'top3' | 'filter' | 'detail' | 'rute' | null;

const LAYER_AWAL: LayerKey[] = ['mobilitas'];

export default function Peta() {
    const { t, bahasa } = useBahasa();
    const [persona, setPersona] = useState<Persona[]>([]);
    const [dialogPersona, setDialogPersona] = useState(false);
    const [siap, setSiap] = useState(false);

    const [panelKiri, setPanelKiri] = useState<PanelKiri>(null);
    const [panelKanan, setPanelKanan] = useState<PanelKananKey>(null);
    const [drawer, setDrawer] = useState<TabMenu | null>(null);
    const [toast, setToast] = useState<{ teks: string; nada: NadaToast; kunci: number } | null>(null);

    // Layer
    const [layerAktif, setLayerAktif] = useState<Partial<Record<LayerKey, boolean>>>({});
    const [layerStatus, setLayerStatus] = useState<Partial<Record<LayerKey, StatusLayer>>>({});
    const [layerData, setLayerData] = useState<Partial<Record<LayerKey, LayerResponse>>>({});
    const cacheLayer = useRef<Partial<Record<LayerKey, LayerResponse>>>({});
    const [tahun, setTahun] = useState(2026);

    // Pencarian
    const [kueri, setKueri] = useState('');
    const [hasil, setHasil] = useState<HasilSearch[] | null>(null);
    const [pesanCari, setPesanCari] = useState<string | undefined>();
    const [mencari, setMencari] = useState(false);
    const [top3Aktif, setTop3Aktif] = useState<number | null>(null);

    // Detail
    const [detail, setDetail] = useState<InspectResponse | null>(null);
    const [memuatDetail, setMemuatDetail] = useState(false);
    const [galatDetail, setGalatDetail] = useState<string | null>(null);
    const [pin, setPin] = useState<TitikPeta | null>(null);
    const [wilayahTerpilih, setWilayahTerpilih] = useState<Geometry | null>(null);
    const [terbangKe, setTerbangKe] = useState<{ geometri?: Geometry; titik?: TitikPeta; kunci: number } | null>(null);
    const batalDetail = useRef<AbortController | null>(null);

    // Rute
    const [ruteA, setRuteA] = useState<TitikRute>(null);
    const [ruteB, setRuteB] = useState<TitikRute>(null);
    const [menunggu, setMenunggu] = useState<'a' | 'b' | null>(null);
    const [rute, setRute] = useState<CommuteResponse | null>(null);
    const [memuatRute, setMemuatRute] = useState(false);
    const [moda, setModa] = useState<Moda>('mobil');

    const kabar = useCallback((teks: string, nada: NadaToast = 'info') => setToast({ teks, nada, kunci: Date.now() }), []);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    // Persona sesi: dialog di kunjungan pertama sesi (FR-13, FR-14).
    useEffect(() => {
        // ?persona=commuter,zen mengisi persona sesi langsung (tautan demo); tetap hanya disimpan di sessionStorage.
        const dariUrl = new URLSearchParams(window.location.search).get('persona')?.split(',').filter((x): x is Persona => x in PERSONA);
        if (dariUrl?.length) simpanPersonaSesi(dariUrl);
        const p = dariUrl?.length ? dariUrl : bacaPersonaSesi();
        if (p?.length) setPersona(p);
        else setDialogPersona(true);
        setSiap(true);
        LAYER_AWAL.forEach((k) => nyalakanLayer(k));
    }, []);

    const ubahPersonaSesi = (p: Persona[]) => {
        setPersona(p);
        if (!simpanPersonaSesi(p)) kabar(t('Gagal menyimpan preferensi. Coba pilih lagi.', 'Could not save your preferences. Please choose again.'), 'danger');
    };

    const balikPersona = (p: Persona) => {
        if (persona.includes(p) && persona.length === 1) {
            kabar(t('Pilih minimal satu persona dulu, ya.', 'Please choose at least one persona first.'), 'warning');
            return;
        }
        const baru = persona.includes(p) ? persona.filter((x) => x !== p) : [...persona, p];
        ubahPersonaSesi(baru);
        kabar(t('Preferensi persona tersimpan untuk sesi ini.', 'Persona preferences saved for this session.'), 'success');
    };

    // Perbarui kesimpulan detail saat persona berubah (FR-19, tanpa muat ulang).
    useEffect(() => {
        if (!detail) return;
        if (detail.jenis_geometri === 'titik') muatTitik({ lat: detail.lat, lng: detail.lng }, false);
        else muatWilayah(detail.wilayah_id, false);
    }, [persona]);

    // ---------- Layer ----------
    async function nyalakanLayer(k: LayerKey) {
        setLayerAktif((a) => ({ ...a, [k]: true }));
        if (cacheLayer.current[k]) {
            setLayerData((d) => ({ ...d, [k]: cacheLayer.current[k] }));
            return;
        }
        setLayerStatus((s) => ({ ...s, [k]: 'loading' }));
        try {
            const fc = await api.layer(k);
            cacheLayer.current[k] = fc;
            setLayerData((d) => ({ ...d, [k]: fc }));
            setLayerStatus((s) => ({ ...s, [k]: undefined }));
        } catch {
            setLayerStatus((s) => ({ ...s, [k]: 'error' }));
        }
    }

    const toggleLayer = (k: LayerKey) => {
        if (layerAktif[k]) {
            setLayerAktif((a) => ({ ...a, [k]: false }));
            setLayerData((d) => {
                const salin = { ...d };
                delete salin[k];
                return salin;
            });
        } else {
            nyalakanLayer(k);
        }
    };

    // ---------- Pencarian ----------
    const jalankanCari = async (q: { q?: string; kota?: string[]; persona: Persona[] }) => {
        setPanelKiri('top3');
        setMencari(true);
        setHasil(null);
        setTop3Aktif(null);
        setWilayahTerpilih(null);
        setPin(null);
        try {
            const r = await api.cari(q);
            setHasil(r.hasil);
            setPesanCari(r.message);
            if (r.hasil.length) {
                const semua = { type: 'GeometryCollection', geometries: r.hasil.map((h) => h.geometri) } as Geometry;
                setTerbangKe({ geometri: semua, kunci: Date.now() });
            }
        } catch (e) {
            setHasil([]);
            setPesanCari((e as Error).message);
        } finally {
            setMencari(false);
        }
    };

    const pilihTop3 = (i: number) => {
        const r = hasil?.[i];
        if (!r) return;
        setTop3Aktif(i);
        setTerbangKe({ geometri: r.geometri, kunci: Date.now() });
        muatWilayah(r.wilayah_id);
    };

    // ---------- Detail lokasi ----------
    async function muatTitik(lokasi: TitikPeta, terbang = false) {
        batalDetail.current?.abort();
        const ctrl = new AbortController();
        batalDetail.current = ctrl;
        setPanelKiri('detail');
        setPin(lokasi);
        setWilayahTerpilih(null);
        setMemuatDetail(true);
        setGalatDetail(null);
        if (terbang) setTerbangKe({ titik: lokasi, kunci: Date.now() });
        try {
            setDetail(await api.titik(lokasi.lat, lokasi.lng, persona, ctrl.signal));
        } catch (e) {
            if ((e as Error).name !== 'AbortError') setGalatDetail(t('Layer ini belum punya data untuk lokasi yang kamu pilih.', 'This layer has no data for the location you picked yet.'));
        } finally {
            setMemuatDetail(false);
        }
    }

    async function muatWilayah(id: number | null, tampilkanPanel = true) {
        if (!id) return;
        batalDetail.current?.abort();
        const ctrl = new AbortController();
        batalDetail.current = ctrl;
        if (tampilkanPanel) setPanelKiri('detail');
        setPin(null);
        setMemuatDetail(true);
        setGalatDetail(null);
        try {
            const d = await api.wilayah(id, persona, ctrl.signal);
            setDetail(d);
            if (d.jenis_geometri === 'wilayah') setWilayahTerpilih(d.geometri);
        } catch (e) {
            if ((e as Error).name !== 'AbortError') setGalatDetail(t('Data wilayah belum tersedia.', 'Area data is not available yet.'));
        } finally {
            setMemuatDetail(false);
        }
    }

    // ---------- Rute ----------
    const labelTitik = (t: TitikPeta) => `${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}`;

    const setelTitikRute = async (t: TitikPeta, kunci: 'a' | 'b') => {
        const info = await api.titik(t.lat, t.lng, persona).catch(() => null);
        const label = info ? `${info.nama}${info.wilayah && !info.wilayah.startsWith('Di luar') ? ', ' + info.wilayah.replace(/^Kec\. /, '') : ''}` : labelTitik(t);
        const titik = { ...t, label };
        if (kunci === 'a') setRuteA(titik);
        else setRuteB(titik);
        return titik;
    };

    useEffect(() => {
        if (!ruteA || !ruteB) return;
        const ctrl = new AbortController();
        setMemuatRute(true);
        setRute(null);
        api.rute(ruteA, ruteB, ctrl.signal)
            .then((r) => {
                setRute(r);
                setModa(r.pribadi ? 'mobil' : 'transit');
                if (!r.pribadi && !r.publik) kabar(t('Estimasi tidak tersedia untuk titik ini. Coba titik yang lebih dekat ke jalan.', 'No estimate for this point. Try a point closer to a road.'), 'warning');
            })
            .catch((e) => e.name !== 'AbortError' && kabar(t('Estimasi tidak tersedia. Coba lagi sebentar.', 'Estimate unavailable. Please try again shortly.'), 'danger'))
            .finally(() => setMemuatRute(false));
        return () => ctrl.abort();
    }, [ruteA?.lat, ruteA?.lng, ruteB?.lat, ruteB?.lng]);

    const resetRute = () => {
        setRuteA(null);
        setRuteB(null);
        setRute(null);
        setMenunggu('a');
    };

    const toggleCommute = () => {
        if (panelKiri === 'rute') {
            setPanelKiri(null);
            setMenunggu(null);
            setRute(null);
            setRuteA(null);
            setRuteB(null);
        } else {
            setPanelKiri('rute');
            setPin(null);
            setWilayahTerpilih(null);
            setMenunggu(ruteA ? (ruteB ? null : 'b') : 'a');
            kabar(t('Klik peta untuk menaruh titik A (asal), lalu titik B (tujuan).', 'Click the map to place point A (origin), then point B (destination).'));
        }
    };

    // ---------- Klik peta ----------
    const klikPeta = (t: TitikPeta) => {
        if (panelKiri === 'rute') {
            if (menunggu === 'a' || (!ruteA && menunggu !== 'b')) {
                setelTitikRute(t, 'a');
                setMenunggu('b');
            } else if (menunggu === 'b' || !ruteB) {
                setelTitikRute(t, 'b');
                setMenunggu(null);
            }
            return;
        }
        setTop3Aktif(null);
        muatTitik(t);
    };

    const tutupPanelKiri = () => {
        setPanelKiri(null);
        setPin(null);
        setWilayahTerpilih(null);
        setDetail(null);
        setTop3Aktif(null);
        if (panelKiri === 'rute') {
            setRute(null);
            setRuteA(null);
            setRuteB(null);
            setMenunggu(null);
        }
    };

    const labelPersona = persona.map((p) => PERSONA[p].label).join(' & ') || 'Commuter';
    const mesinWaktuAktif = !!layerAktif.mesin_waktu;
    const proyekDiTahun = (layerData.mesin_waktu?.features ?? []).filter((f) => !f.properties?.tahun || f.properties.tahun <= tahun).length;

    return (
        <>
            <Head title={t('Peta', 'Map')} />
            <main className="nr-app" data-mode={panelKiri === 'rute' ? 'rute' : undefined}>
                <PetaExplorer
                    className="nr-app__peta"
                    layer={layerData}
                    tahun={tahun}
                    top3={panelKiri === 'top3' || panelKiri === 'detail' ? hasil : null}
                    top3Aktif={top3Aktif}
                    wilayahTerpilih={wilayahTerpilih}
                    pin={panelKiri === 'detail' ? pin : null}
                    rute={panelKiri === 'rute' ? rute : null}
                    ruteA={panelKiri === 'rute' ? ruteA : null}
                    ruteB={panelKiri === 'rute' ? ruteB : null}
                    moda={moda}
                    modeRute={panelKiri === 'rute'}
                    bahasa={bahasa}
                    terbangKe={terbangKe}
                    onKlikPeta={klikPeta}
                    onLihatDetail={(t) => muatTitik(t, true)}
                    onPilihTop3={pilihTop3}
                />

                <div className="nr-app__kiri">
                    <SearchBar
                        nilai={kueri}
                        onUbah={setKueri}
                        onCari={(q) => jalankanCari({ q, persona })}
                        memuat={mencari}
                        commute={panelKiri === 'rute'}
                        onToggleCommute={toggleCommute}
                        filterTerbuka={panelKiri === 'filter'}
                        onToggleFilter={() => setPanelKiri(panelKiri === 'filter' ? null : 'filter')}
                    />
                    {panelKiri === 'top3' && <PanelTop3 personaLabel={labelPersona} hasil={hasil} memuat={mencari} pesan={pesanCari} aktif={top3Aktif} onPilih={pilihTop3} />}
                    {panelKiri === 'filter' && (
                        <PanelFilter
                            personaSesi={persona}
                            onCari={(kota, p) => {
                                setKueri('');
                                jalankanCari({ kota, persona: p });
                            }}
                        />
                    )}
                    {panelKiri === 'detail' && <DetailLokasi data={memuatDetail ? null : detail} memuat={memuatDetail} galat={galatDetail} sesi={persona} onTutup={tutupPanelKiri} />}
                    {panelKiri === 'rute' && (
                        <SimulatorRute
                            a={ruteA}
                            b={ruteB}
                            menunggu={menunggu}
                            hasil={rute}
                            memuat={memuatRute}
                            moda={moda}
                            onModa={setModa}
                            onPilihDiPeta={(k) => {
                                setMenunggu(k);
                                kabar(t(`Klik peta untuk menaruh titik ${k.toUpperCase()}.`, `Click the map to place point ${k.toUpperCase()}.`));
                            }}
                            onReset={resetRute}
                            onTutup={tutupPanelKiri}
                        />
                    )}
                </div>

                <div className="nr-app__merek">
                    <TombolMerek terbuka={!!drawer} onKlik={() => setDrawer('persona')} />
                </div>

                {panelKanan && (
                    <div className="nr-app__kanan">
                        {panelKanan === 'layer' ? (
                            <PanelLayer aktif={layerAktif} status={layerStatus} onToggle={toggleLayer} onCobaLagi={(k) => nyalakanLayer(k)} onTutup={() => setPanelKanan(null)} />
                        ) : (
                            <PanelProfilPersona terpilih={persona} onUbah={balikPersona} onTutup={() => setPanelKanan(null)} />
                        )}
                    </div>
                )}

                <div className="nr-app__tombol">
                    <TombolLayerPersona terbuka={panelKanan} onKlik={(k) => setPanelKanan(panelKanan === k ? null : k)} />
                </div>

                {mesinWaktuAktif && (
                    <div className="nr-app__slider">
                        <SliderTahun tahun={tahun} onUbah={setTahun} kosong={!!layerData.mesin_waktu && proyekDiTahun === 0} />
                    </div>
                )}

                <aside className="nr-app__catatan nr-float" aria-label={t('Keterangan data', 'Data notice')}>
                    <span className="nr-app__catatan-dot" aria-hidden="true" />
                    <span>
                        <b>{t('Versi demo', 'Demo version')}</b>
                        <span className="nr-app__catatan-pendek">{t(' · sebagian data contoh', ' · partly sample data')}</span>
                        <span className="nr-app__catatan-panjang">{t(
                            ' · Peta, batas wilayah, jalur KRL, dan area banjir dari data asli (OSM, InaRISK). Kualitas udara, status lahan, dan tahun proyek masih data contoh.',
                            ' · Map, boundaries, KRL lines, and flood areas are real data (OSM, InaRISK). Air quality, land status, and project years are sample data.',
                        )}</span>
                    </span>
                </aside>

                {toast && (
                    <div className="nr-app__toast" key={toast.kunci}>
                        <Toast tone={toast.nada}>{toast.teks}</Toast>
                    </div>
                )}

                {drawer && (
                    <div className="nr-app__lapisan">
                        <div className="nr-scrim" onClick={() => setDrawer(null)} />
                        <DrawerMenu tab={drawer} onTab={setDrawer} terpilih={persona} onUbahPersona={balikPersona} onTutup={() => setDrawer(null)} />
                    </div>
                )}

                {siap && dialogPersona && (
                    <div className="nr-app__lapisan nr-app__lapisan--tengah">
                        <div className="nr-scrim nr-scrim--dialog" />
                        <DialogPersona
                            awal={persona}
                            onMulai={(p) => {
                                ubahPersonaSesi(p);
                                setDialogPersona(false);
                                kabar(t('Preferensi persona tersimpan untuk sesi ini.', 'Persona preferences saved for this session.'), 'success');
                            }}
                        />
                    </div>
                )}
            </main>
        </>
    );
}
