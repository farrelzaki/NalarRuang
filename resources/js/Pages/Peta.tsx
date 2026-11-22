/**
 * Visual Explorer (UI01–UI05). Tata letak design-system.md bagian 5: search + satu panel di kolom kiri,
 * tombol merek kanan atas, LAYER/PERSONA + panel kanan di kanan bawah; tengah bawah: slider tahun di atas bilah alat
 * (Jelajah / Titik / Area, mode tampilan 2D / Miring / 3D, zoom).
 */
import { Head, Link } from '@inertiajs/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, Geometry, Polygon } from 'geojson';
import type { AksesLahanMasuk, AsumsiLahan, CommuteResponse, JenisAkses, JenisZona, LahanRequest, PolaLahan, ZonaLahanMasuk, HasilSearch, InspectResponse, LahanResponse, LayerKey, LayerResponse, Persona, SaranLokasi, TipeLahan } from '@/types';
import { api } from '@/lib/api';
import { useProyekLahan } from '@/lib/proyekLahan';
import { dariServer, keZonaApi, rapikan } from '@/lib/layerLahan';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { bacaPersonaSesi, PERSONA, simpanPersonaSesi, SUBFITUR, type IsochroneMode, type Simbol } from '@/lib/nalar';
import type { ModeKamera, TitikPeta } from '@/Map/PetaExplorer';
import PetaPilihan, { type MesinPeta } from '@/Map/PetaPilihan';
import { luasPoligonM2, teksLuas } from '@/Map/isiPeta';
import { BilahAlat, type Alat } from '@/Components/BilahAlat';
import { Toast, type NadaToast } from '@/Components/Dasar';
import { PanelFilter, PanelLokasi, PanelTop3, SearchBar, type ModeCari } from '@/Components/Pencarian';
import { DetailLokasi } from '@/Components/DetailLokasi';
import { SimulatorRute, type Moda, type TitikRute } from '@/Components/SimulatorRute';
import { PanelLayer, PanelProfilPersona, SliderTahun, TombolLayerPersona, TombolMerek, type PanelKananKey, type StatusLayer } from '@/Components/PanelKananPeta';
import { DialogPersona, DrawerMenu, type TabMenu } from '@/Components/MenuPersona';
import { Panduan, sudahLihatPanduan } from '@/Components/Panduan';
import { PanelLahan, type ModeGambar } from '@/Components/PanelLahan';

const Pratinjau3D = lazy(() => import('@/Components/Pratinjau3D'));

type PanelKiri = 'top3' | 'lokasi' | 'filter' | 'detail' | 'rute' | 'lahan' | null;

type InspectDenganIsochrone = InspectResponse & {
    isochrone?: FeatureCollection | null;
    isochrone_meta?: {
        mode: IsochroneMode;
        minutes: number;
        aktif: boolean;
    } | null;
};

const LAYER_AWAL: LayerKey[] = ['mobilitas'];

const LUAS_AREA_MAKS = 25_000_000;
const SUDUT_MAKS = 60;
const KUNCI_KAMERA = 'nr-mode-kamera';

function kameraTersimpan(): ModeKamera {
    try {
        const v = sessionStorage.getItem(KUNCI_KAMERA);
        return v === 'miring' || v === '3d' ? v : 'atas';
    } catch {
        return 'atas';
    }
}

/** Moda jangkauan bawaan alat Titik: mobil untuk Driver saja, selain itu jalan kaki. */
function modeDefaultPersona(p: Persona[]): IsochroneMode {
    return p.includes('driver') && !p.includes('commuter') ? 'auto' : 'pedestrian';
}

export default function Peta() {
    const { t, bahasa } = useBahasa();
    const [persona, setPersona] = useState<Persona[]>([]);
    const [dialogPersona, setDialogPersona] = useState(false);
    const [siap, setSiap] = useState(false);
    const [panduan, setPanduan] = useState(false);
    const panduanDicek = useRef(false);

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
    const [modeCari, setModeCari] = useState<ModeCari>('rekomendasi');
    const [hasilLokasi, setHasilLokasi] = useState<SaranLokasi[] | null>(null);

    // Detail & Isochrone
    const [detail, setDetail] = useState<InspectDenganIsochrone | null>(null);
    const [memuatDetail, setMemuatDetail] = useState(false);
    const [galatDetail, setGalatDetail] = useState<string | null>(null);
    const [pin, setPin] = useState<TitikPeta | null>(null);
    const [isoMode, setIsoMode] = useState<IsochroneMode>('pedestrian');
    const [isoMinutes, setIsoMinutes] = useState<number>(10);
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
    const [lewatTol, setLewatTol] = useState(true);
    const [hargaBbm, setHargaBbm] = useState(10000);
    const [hindariGg, setHindariGg] = useState(false);
    const [jenisKendaraan, setJenisKendaraan] = useState<'mobil' | 'motor'>('mobil');
    const [konsumsiBbm, setKonsumsiBbm] = useState(12);

    const handleUbahJenisKendaraan = (jenis: 'mobil' | 'motor') => {
        setJenisKendaraan(jenis);
        setKonsumsiBbm(jenis === 'motor' ? 40 : 12);

        // Motor wajib NON-TOL
        if (jenis === 'motor') {
            setLewatTol(false);
        }
    };

    // Bilah alat: Jelajah / Titik / Area, mode kamera, zoom
    const [alat, setAlat] = useState<Alat>('titik');
    const [sudutArea, setSudutArea] = useState<TitikPeta[]>([]);
    const [memuatArea, setMemuatArea] = useState(false);
    const areaTerakhir = useRef<TitikPeta[] | null>(null);
    const [modeKamera, setModeKamera] = useState<ModeKamera>(kameraTersimpan);
    const [mesin, setMesin] = useState<MesinPeta>('leaflet');
    const [perintahZoom, setPerintahZoom] = useState<{ arah: 1 | -1; kunci: number } | null>(null);

    // Uji Lahan (FR-23)
    const [alatLahan, setAlatLahan] = useState<{ mode: ModeGambar; kunci: number } | null>(null);
    const [selesaiLahan, setSelesaiLahan] = useState(0);
    // Desain lahan (lahan, tipe, asumsi, pola, zona, akses) hidup di satu proyek dengan riwayat undo/redo (lib/proyekLahan.ts).
    // Nama dan bentuk setternya sama dengan useState, jadi pemakai di bawah tidak berubah.
    const proyekLahan = useProyekLahan();
    const {
        geom: geomLahan,
        tipe: tipeLahan,
        asumsi: asumsiLahan,
        pola: polaLahan,
        zona: zonaLahan,
        akses: aksesLahan,
        setGeom: setGeomLahan,
        setTipe: setTipeLahan,
        setAsumsi: setAsumsiLahan,
        setPola: setPolaLahan,
        setZona: setZonaLahan,
        setAkses: setAksesLahan,
    } = proyekLahan;
    const [hasilLahan, setHasilLahan] = useState<LahanResponse | null>(null);
    const [tambahZona, setTambahZona] = useState<{ jenis: JenisZona; kunci: number } | null>(null);
    /** Kunci baru = peta diminta menggambar ulang bentuk lahan dari `geom` (setelah undo/redo). */
    const [pulihLahan, setPulihLahan] = useState<{ geom: Polygon; kunci: number } | null>(null);
    // Panel layer Uji Lahan: layer terpilih, lahan terkunci, dan jenis isi hasil yang disembunyikan (hanya tampilan, tanpa undo).
    const [zonaDipilih, setZonaDipilih] = useState<string | null>(null);
    const [lahanTerkunci, setLahanTerkunci] = useState(false);
    const [isiSembunyi, setIsiSembunyi] = useState<string[]>([]);
    /** Zona yang tampil di panel layer: zona pengguna, atau zona bawaan pola dari server bila belum ada. */
    const daftarZona = useMemo(() => zonaLahan ?? dariServer(hasilLahan?.zona), [zonaLahan, hasilLahan?.zona]);
    const luasZona = useMemo(() => {
        const m = new Map<string, number>();
        const fitur = hasilLahan?.zona?.features ?? [];
        if (zonaLahan) zonaLahan.forEach((z, i) => {
            const f = fitur.find((x) => x.properties.id === i);
            if (f) m.set(z.uid, f.properties.luas_m2);
        });
        else fitur.forEach((f) => m.set(`srv-${f.properties.id}`, f.properties.luas_m2));
        return m;
    }, [zonaLahan, hasilLahan?.zona]);
    /** Jenis isi hasil hitungan yang ada sekarang (unit, kavling, slot, ...) beserta jumlahnya. */
    const isiLahan = useMemo(() => {
        const hitung = new Map<string, number>();
        for (const f of hasilLahan?.geometri_kapasitas?.features ?? []) {
            const j = String((f.properties as { jenis?: unknown } | null)?.jenis ?? '');
            if (j) hitung.set(j, (hitung.get(j) ?? 0) + 1);
        }
        const urutan = ['unit', 'kavling', 'jalan', 'koridor', 'taman', 'parkir', 'slot', 'lobi', 'jalur', 'inti', 'void', 'tapak', 'akses'];
        return [...hitung.keys()].sort((a, b) => (urutan.indexOf(a) + 100) % 100 - (urutan.indexOf(b) + 100) % 100).map((jenis) => ({ jenis, jumlah: hitung.get(jenis) ?? 0 }));
    }, [hasilLahan?.geometri_kapasitas]);
    const zonaSembunyi = useMemo(() => (zonaLahan ?? []).flatMap((z, i) => (z.sembunyi ? [i] : [])), [zonaLahan]);
    const [tambahAkses, setTambahAkses] = useState<{ jenis: JenisAkses; kunci: number } | null>(null);
    const [tampil3D, setTampil3D] = useState(false);
    const [memuatLahan, setMemuatLahan] = useState(false);
    const [galatLahan, setGalatLahan] = useState<string | null>(null);
    /** True bila perubahan terakhir datang dari menggambar/menarik lahan (dikirim tanpa jeda). */
    const lahanDariPeta = useRef(false);
    // Satu permintaan /api/lahan berjalan sekaligus; permintaan baru selama itu hanya menyimpan yang terakhir di antrean.
    const lahanJalan = useRef<AbortController | null>(null);
    const lahanAntre = useRef<LahanRequest | null>(null);

    // Sub-fitur yang disembunyikan
    const [subMati, setSubMati] = useState<Simbol[]>([]);
    const layerTampil = useMemo(() => {
        const saring = subMati.map((s) => SUBFITUR[s]).filter((f): f is NonNullable<typeof f> => !!f);
        if (panelKiri === 'rute' && moda === 'transit' && rute?.publik) {
            saring.push((p) => ['krl', 'mrt', 'lrt', 'brt', 'stasiun', 'halte', 'tol', 'ganjil_genap'].includes(String(p.jenis)));
        }
        if (!saring.length) return layerData;
        const hasil: typeof layerData = {};
        for (const [k, fc] of Object.entries(layerData) as [LayerKey, LayerResponse][]) {
            const sisa = fc.features.filter((f) => !saring.some((cek) => cek((f.properties ?? {}) as Record<string, unknown>)));
            hasil[k] = sisa.length === fc.features.length ? fc : { ...fc, features: sisa };
        }
        return hasil;
    }, [layerData, subMati, panelKiri, moda, rute]);

    // Onboarding
    useEffect(() => {
        if (!siap || dialogPersona || panduanDicek.current) return;
        panduanDicek.current = true;
        if (new URLSearchParams(window.location.search).has('panduan') || !sudahLihatPanduan()) setPanduan(true);
    }, [siap, dialogPersona]);

    const kabar = useCallback((teks: string, nada: NadaToast = 'info') => setToast({ teks, nada, kunci: Date.now() }), []);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    // Persona sesi
    useEffect(() => {
        const dariUrl = new URLSearchParams(window.location.search).get('persona')?.split(',').filter((x): x is Persona => x in PERSONA);
        if (dariUrl?.length) simpanPersonaSesi(dariUrl);
        const p = dariUrl?.length ? dariUrl : bacaPersonaSesi();
        if (p?.length) {
            setPersona(p);
            setIsoMode(modeDefaultPersona(p));
        } else {
            setDialogPersona(true);
        }
        setSiap(true);
        LAYER_AWAL.forEach((k) => nyalakanLayer(k));
    }, []);

    const ubahPersonaSesi = (p: Persona[]) => {
        setPersona(p);
        setIsoMode(modeDefaultPersona(p));
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

    useEffect(() => {
        if (!detail) return;
        if (detail.jenis_geometri === 'titik') muatTitik({ lat: detail.lat, lng: detail.lng }, false, isoMode, isoMinutes);
        else if (detail.jenis_geometri === 'area') areaTerakhir.current && muatArea(areaTerakhir.current);
        else muatWilayah(detail.wilayah_id, false);
    }, [persona]);

    // Layer
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
                // Hapus juga kunci alias persil/legalitas agar data bersih total saat OFF
                if (k === 'legalitas') delete salin['persil'];
                if (k === 'persil') delete salin['legalitas'];
                return salin;
            });
        } else {
            nyalakanLayer(k);
        }
    };

    // Handler BBOX dynamic request untuk layer poligon berat (legalitas, persil, rdtr)
    const handleBboxChange = useCallback(async (layerKey: LayerKey, bbox: string) => {
        if (!layerAktif[layerKey]) return;

        try {
            const res = await fetch(`/api/layers/${layerKey}?bbox=${bbox}`);
            if (res.ok) {
                const data: LayerResponse = await res.json();
                setLayerData((d) => ({
                    ...d,
                    [layerKey]: data,
                    ...(layerKey === 'legalitas' ? { persil: data } : {}),
                    ...(layerKey === 'persil' ? { legalitas: data } : {}),
                }));
            }
        } catch (e) {
            console.error(`Gagal memuat BBOX layer ${layerKey}:`, e);
        }
    }, [layerAktif]);

    // Pencarian
    const jalankanCari = async (q: { q?: string; kota?: string[]; persona: Persona[] }) => {
        setDetail(null);
        setPin(null);
        setWilayahTerpilih(null);

        setPanelKiri('top3');
        setMencari(true);
        setHasil(null);
        setTop3Aktif(null);
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

    // Pencarian lokasi saja (T-060): hanya mencari tempat/daerah yang diketik, tanpa penilaian persona.
    const jalankanLokasi = async (q: string) => {
        setDetail(null);
        setPin(null);
        setWilayahTerpilih(null);
        setHasil(null);
        setTop3Aktif(null);
        setPanelKiri('lokasi');
        setMencari(true);
        setHasilLokasi(null);
        setPesanCari(undefined);
        try {
            if (q.length < 3) {
                setHasilLokasi([]);
                setPesanCari(t('Ketik minimal 3 huruf.', 'Type at least 3 letters.'));
                return;
            }
            const r = await api.lokasi(q);
            setHasilLokasi(r.hasil);
            setPesanCari(r.message);
            if (r.hasil.length === 1) pilihLokasi(r.hasil[0]);
        } catch (e) {
            setHasilLokasi([]);
            setPesanCari((e as Error).message);
        } finally {
            setMencari(false);
        }
    };

    const pilihLokasi = (s: SaranLokasi) => {
        setHasilLokasi(null);
        muatTitik({ lat: s.lat, lng: s.lng }, true);
    };

    const ubahModeCari = (m: ModeCari) => {
        if (m === modeCari) return;
        setModeCari(m);
        if (panelKiri === 'top3' || panelKiri === 'lokasi') {
            setPanelKiri(null);
            setHasil(null);
            setHasilLokasi(null);
            setTop3Aktif(null);
        }
    };

    const pilihTop3 = (i: number) => {
        const r = hasil?.[i];
        if (!r) return;
        setTop3Aktif(i);
        setTerbangKe({ geometri: r.geometri, kunci: Date.now() });
        muatWilayah(r.wilayah_id);
    };

    // Detail lokasi berbasis Travel-Time Isochrone (T-056)
    async function muatTitik(
        lokasi: TitikPeta,
        terbang = false,
        modeParam: IsochroneMode = isoMode,
        minutesParam: number = isoMinutes,
    ) {
        batalDetail.current?.abort();
        const ctrl = new AbortController();
        batalDetail.current = ctrl;

        setHasil(null);
        setHasilLokasi(null);
        setKueri('');
        setPesanCari(undefined);
        setTop3Aktif(null);

        setPanelKiri('detail');
        setPin(lokasi);
        setWilayahTerpilih(null);
        setMemuatDetail(true);
        setGalatDetail(null);
        if (terbang) setTerbangKe({ titik: lokasi, kunci: Date.now() });

        try {
            setDetail(await api.titik(lokasi.lat, lokasi.lng, persona, ctrl.signal, { mode: modeParam, minutes: minutesParam }));
        } catch (e) {
            if ((e as Error).name !== 'AbortError') {
                setGalatDetail(t('Layer ini belum punya data untuk lokasi yang kamu pilih.', 'This layer has no data for the location you picked yet.'));
            }
        } finally {
            setMemuatDetail(false);
        }
    }

    // Ganti moda/menit jangkauan: titik yang sedang dibuka dihitung ulang.
    const titikTerbuka = panelKiri === 'detail' && pin && detail?.jenis_geometri !== 'area' && !wilayahTerpilih ? pin : null;
    const ubahIsoMode = (modeBaru: IsochroneMode) => {
        setIsoMode(modeBaru);
        if (titikTerbuka) muatTitik(titikTerbuka, false, modeBaru, isoMinutes);
    };

    const ubahIsoMinutes = (menitBaru: number) => {
        setIsoMinutes(menitBaru);
        if (titikTerbuka) muatTitik(titikTerbuka, false, isoMode, menitBaru);
    };

    async function muatWilayah(id: number | null, tampilkanPanel = true) {
        if (!id) return;
        batalDetail.current?.abort();
        const ctrl = new AbortController();
        batalDetail.current = ctrl;

        if (tampilkanPanel) {
            setHasil(null);
            setKueri('');
            setPesanCari(undefined);
            setTop3Aktif(null);
            setPanelKiri('detail');
        }
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

    /** Nilai area yang digambar lewat GET /api/inspect?area=... */
    async function muatArea(sudut: TitikPeta[]) {
        batalDetail.current?.abort();
        const ctrl = new AbortController();
        batalDetail.current = ctrl;
        setMemuatArea(true);
        try {
            const d = await api.area(sudut, persona, ctrl.signal);
            areaTerakhir.current = sudut;
            setHasil(null);
            setKueri('');
            setPesanCari(undefined);
            setTop3Aktif(null);
            setPin(null);
            setGalatDetail(null);
            setDetail(d);
            if (d.jenis_geometri !== 'titik') setWilayahTerpilih(d.geometri);
            setSudutArea([]);
            setPanelKiri('detail');
        } catch (e) {
            if ((e as Error).name !== 'AbortError') kabar(teksServer((e as Error).message), 'danger');
        } finally {
            setMemuatArea(false);
        }
    }

    const luasGambar = useMemo(() => (sudutArea.length >= 3 ? luasPoligonM2(sudutArea) : 0), [sudutArea]);

    const selesaiArea = () => {
        if (sudutArea.length < 3) {
            kabar(t('Area butuh minimal 3 titik sudut.', 'An area needs at least 3 corner points.'), 'warning');
            return;
        }
        if (luasGambar > LUAS_AREA_MAKS) {
            kabar(t('Area terlalu luas (maksimal 25 km²). Urungkan beberapa titik.', 'The area is too large (at most 25 km²). Undo some points.'), 'warning');
            return;
        }
        muatArea(sudutArea);
    };

    const gantiAlat = (a: Alat) => {
        setAlat(a);
        if (a !== 'area') setSudutArea([]);
    };

    const gantiKamera = (m: ModeKamera) => {
        setModeKamera(m);
        try {
            sessionStorage.setItem(KUNCI_KAMERA, m);
        } catch {
            /* tanpa sessionStorage: mode tidak diingat */
        }
    };

    // Rute
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

        // Jika jenis kendaraan adalah motor, paksa lewatTol menjadi false
        const tolAktif = jenisKendaraan === 'motor' ? false : lewatTol;

        api.rute(ruteA, ruteB, ctrl.signal, tolAktif, hargaBbm, hindariGg)
            .then((r) => {
                setRute(r);
                setModa((m) => (m === 'transit' && r.publik ? 'transit' : r.pribadi ? 'mobil' : 'transit'));
                if (!r.pribadi && !r.publik) kabar(t('Estimasi tidak tersedia untuk titik ini. Coba titik yang lebih dekat ke jalan.', 'No estimate for this point. Try a point closer to a road.'), 'warning');
            })
            .catch((e) => e.name !== 'AbortError' && kabar(t('Estimasi tidak tersedia. Coba lagi sebentar.', 'Estimate unavailable. Please try again shortly.'), 'danger'))
            .finally(() => setMemuatRute(false));

        return () => ctrl.abort();
    }, [ruteA?.lat, ruteA?.lng, ruteB?.lat, ruteB?.lng, lewatTol, hargaBbm, hindariGg, jenisKendaraan]);

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
            if (panelKiri === 'lahan') resetLahan();
            setPanelKiri('rute');
            setPin(null);
            setWilayahTerpilih(null);
            setMenunggu(ruteA ? (ruteB ? null : 'b') : 'a');
            kabar(t('Klik peta untuk menaruh titik A (asal), lalu titik B (tujuan).', 'Click the map to place point A (origin), then point B (destination).'));
        }
    };

    // Uji Lahan: hitung ulang setiap lahan, tipe, asumsi, atau persona berubah.
    const kirimLahan = useRef<(badan: LahanRequest) => void>(() => {});
    kirimLahan.current = (badan: LahanRequest) => {
        if (lahanJalan.current) {
            lahanAntre.current = badan;
            return;
        }
        const ctrl = new AbortController();
        lahanJalan.current = ctrl;
        setMemuatLahan(true);
        api.lahan(badan, ctrl.signal)
            .then((r) => {
                setHasilLahan(r);
                setGalatLahan(null);
            })
            .catch((e) => {
                if ((e as Error).name === 'AbortError') return;
                setHasilLahan(null);
                setGalatLahan((e as Error).message || t('Lahan belum bisa dihitung. Coba lagi sebentar.', 'The site could not be calculated. Please try again shortly.'));
            })
            .finally(() => {
                if (lahanJalan.current === ctrl) lahanJalan.current = null;
                if (ctrl.signal.aborted) return;
                const berikut = lahanAntre.current;
                lahanAntre.current = null;
                if (berikut) kirimLahan.current(berikut);
                else setMemuatLahan(false);
            });
    };

    const batalLahan = () => {
        lahanJalan.current?.abort();
        lahanJalan.current = null;
        lahanAntre.current = null;
    };

    useEffect(() => {
        if (panelKiri !== 'lahan' || !geomLahan) {
            batalLahan();
            setMemuatLahan(false);
            return;
        }
        // Lahan yang digambar/ditarik langsung dikirim (antrean membatasi lajunya); slider dan ketikan diberi jeda 350 ms.
        const badan: LahanRequest = {
            geometri: geomLahan,
            tipe: tipeLahan,
            asumsi: asumsiLahan,
            persona,
            ...(polaLahan ? { pola: polaLahan } : {}),
            ...(zonaLahan ? { zona: keZonaApi(zonaLahan) } : {}),
            ...(aksesLahan.length ? { akses: aksesLahan } : {}),
        };
        const jeda = setTimeout(() => kirimLahan.current(badan), lahanDariPeta.current ? 0 : 350);
        lahanDariPeta.current = false;
        return () => clearTimeout(jeda);
    }, [panelKiri, geomLahan, tipeLahan, asumsiLahan, persona, polaLahan, zonaLahan, aksesLahan]);

    useEffect(() => batalLahan, []);

    const resetLahan = () => {
        batalLahan();
        setAlatLahan(null);
        setHasilLahan(null);
        setGalatLahan(null);
        // Tipe bangunan dipertahankan; yang lain kembali ke awal dan riwayat undo dibuang.
        proyekLahan.mulaiBaru({ geom: null, tipe: tipeLahan, asumsi: {}, pola: null, zona: null, akses: [] });
        setPulihLahan(null);
        setZonaDipilih(null);
        setLahanTerkunci(false);
        setIsiSembunyi([]);
        setTampil3D(false);
    };

    const mulaiLahan = (mode: ModeGambar) => {
        batalLahan();
        // Gambar ulang: lahan, zona, dan akses dikosongkan; tipe, asumsi, dan pola dipertahankan.
        proyekLahan.mulaiBaru({ ...proyekLahan.snap, geom: null, zona: null, akses: [] });
        setPulihLahan(null);
        setZonaDipilih(null);
        setLahanTerkunci(false);
        setIsiSembunyi([]);
        setHasilLahan(null);
        setGalatLahan(null);
        setAlatLahan({ mode, kunci: Date.now() });
    };

    // Undo/redo desain lahan. Zona dan akses digambar dari props, jadi cukup bentuk lahan yang diminta digambar ulang
    // (alat gambar menyimpan bentuknya sendiri); hasil server dihitung ulang tanpa jeda.
    const terapkanSnapLahan = (s: ReturnType<typeof proyekLahan.undo>) => {
        if (!s) return;
        lahanDariPeta.current = true;
        if (s.geom) setPulihLahan({ geom: s.geom, kunci: Date.now() });
    };
    const urungLahan = () => terapkanSnapLahan(proyekLahan.undo());
    const ulangLahan = () => terapkanSnapLahan(proyekLahan.redo());
    const urungLahanRef = useRef(urungLahan);
    const ulangLahanRef = useRef(ulangLahan);
    urungLahanRef.current = urungLahan;
    ulangLahanRef.current = ulangLahan;

    // Ctrl+Z / Ctrl+Y (atau Ctrl+Shift+Z) selama panel Uji Lahan terbuka; tidak mengganggu pengetikan di kolom isian.
    useEffect(() => {
        if (panelKiri !== 'lahan') return;
        const tekan = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const el = e.target as HTMLElement | null;
            const mengetik =
                !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable || (el.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes((el as HTMLInputElement).type)));
            if (mengetik) return;
            const k = e.key.toLowerCase();
            if (k === 'z' && !e.shiftKey) {
                e.preventDefault();
                urungLahanRef.current();
            } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
                e.preventDefault();
                ulangLahanRef.current();
            }
        };
        window.addEventListener('keydown', tekan);
        return () => window.removeEventListener('keydown', tekan);
    }, [panelKiri]);

    const toggleLahan = () => {
        if (panelKiri === 'lahan') {
            setPanelKiri(null);
            resetLahan();
            return;
        }
        if (panelKiri === 'rute') {
            setRute(null);
            setRuteA(null);
            setRuteB(null);
            setMenunggu(null);
        }
        setPanelKiri('lahan');
        setPin(null);
        setDetail(null);
        setHasil(null);
        setTop3Aktif(null);
        setWilayahTerpilih(null);
        mulaiLahan('kotak');
        kabar(t('Tarik sudut kotak untuk mengatur luas lahan, atau pilih Poligon untuk menggambar bentuk bebas.', 'Drag the box corners to set the site size, or choose Polygon to draw a free shape.'));
    };

    // Klik peta
    const klikPeta = (titik: TitikPeta) => {
        // Saat Uji Lahan aktif, klik peta dipakai alat gambar (Map/GambarLahan.ts).
        if (panelKiri === 'lahan') return;
        if (panelKiri === 'rute') {
            if (menunggu === 'a' || (!ruteA && menunggu !== 'b')) {
                setelTitikRute(titik, 'a');
                setMenunggu('b');
            } else if (menunggu === 'b' || !ruteB) {
                setelTitikRute(titik, 'b');
                setMenunggu(null);
            }
            return;
        }
        if (alat === 'jelajah') return;
        if (alat === 'area') {
            if (memuatArea) return;
            if (sudutArea.length === 0 && detail?.jenis_geometri === 'area') setWilayahTerpilih(null);
            if (sudutArea.length >= SUDUT_MAKS) {
                kabar(t(`Maksimal ${SUDUT_MAKS} titik sudut. Tekan Selesai.`, `At most ${SUDUT_MAKS} corner points. Press Done.`), 'warning');
                return;
            }
            setSudutArea((s) => [...s, titik]);
            return;
        }
        setTop3Aktif(null);
        muatTitik(titik);
    };

    const tutupPanelKiri = () => {
        areaTerakhir.current = null;
        if (panelKiri === 'lahan') resetLahan();
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

    // Dipakai tur panduan: tutup panel/mode yang dibuka langkah sebelumnya agar target langkah berikutnya tidak tertutup.
    const bersihkanUntukPanduan = () => {
        if (panelKiri === 'lahan') resetLahan();
        areaTerakhir.current = null;
        setAlat('titik');
        setSudutArea([]);
        setDrawer(null);
        setPanelKanan(null);
        setPanelKiri(null);
        setPin(null);
        setWilayahTerpilih(null);
        setDetail(null);
        setHasil(null);
        setHasilLokasi(null);
        setTop3Aktif(null);
        setKueri('');
        setRute(null);
        setRuteA(null);
        setRuteB(null);
        setMenunggu(null);
    };

    const labelPersona = persona.map((p) => PERSONA[p].label).join(' & ') || 'Commuter';
    const mesinWaktuAktif = !!layerAktif.mesin_waktu;
    const proyekDiTahun = (layerData.mesin_waktu?.features ?? []).filter((f) => !f.properties?.tahun || f.properties.tahun <= tahun).length;
    const modeRute = panelKiri === 'rute';
    const gambarArea = !modeRute && alat === 'area';
    const pinTampil = panelKiri === 'detail' ? pin : null;

    return (
        <>
            <Head title={t('Peta', 'Map')} />
            <main className="nr-app" data-mode={modeRute ? 'rute' : undefined} data-alat={modeRute || panelKiri === 'lahan' ? undefined : alat}>
                {panelKiri === 'lahan' && tampil3D && hasilLahan && (
                    // three.js baru diunduh saat pratinjau 3D dibuka, jadi halaman peta tidak bertambah berat.
                    <Suspense fallback={<div className="nr-3d nr-3d--muat">{t('Menyiapkan tampilan 3D…', 'Preparing 3D view…')}</div>}>
                        <Pratinjau3D data={hasilLahan} lahan={geomLahan} onTutup={() => setTampil3D(false)} />
                    </Suspense>
                )}
                <PetaPilihan
                    // Uji Lahan (FR-23) hanya ada di Leaflet: selama panelnya terbuka peta memakai Leaflet.
                    paksaLeaflet={panelKiri === 'lahan'}
                    className="nr-app__peta"
                    layer={layerTampil}
                    aktif={layerAktif}
                    tahun={tahun}
                    top3={panelKiri === 'top3' && !gambarArea ? hasil : null}
                    top3Aktif={top3Aktif}
                    wilayahTerpilih={wilayahTerpilih}
                    pin={pinTampil}
                    isochrone={pinTampil && detail?.jenis_geometri === 'titik' ? (detail.isochrone ?? null) : null}
                    sudutArea={gambarArea ? sudutArea : undefined}
                    modeKamera={modeKamera}
                    perintahZoom={perintahZoom}
                    onMesin={setMesin}
                    rute={panelKiri === 'rute' ? rute : null}
                    ruteA={panelKiri === 'rute' ? ruteA : null}
                    ruteB={panelKiri === 'rute' ? ruteB : null}
                    moda={moda}
                    // Popup fitur dan klik wilayah Top 3 hanya di alat Jelajah; alat Titik/Area dan mode rute memakai klik untuk menaruh titik.
                    modeRute={modeRute || alat !== 'jelajah' || panelKiri === 'lahan'}
                    bahasa={bahasa}
                    terbangKe={terbangKe}
                    onKlikPeta={klikPeta}
                    onLihatDetail={(t) => muatTitik(t, true)}
                    onPilihTop3={pilihTop3}
                    onBatasPeta={() => kabar(t('Anda sudah mencapai batas maksimum peta.', 'You have reached the edge of the map.'), 'warning')}
                    onBboxChange={handleBboxChange}
                    alatLahan={panelKiri === 'lahan' ? alatLahan : null}
                    selesaiLahan={selesaiLahan}
                    pulihLahan={pulihLahan}
                    onLahanBatas={() => kabar(t('Batas maksimum Uji Lahan 20 hektare tercapai. Lahan tidak bisa diperbesar lagi.', 'The 20-hectare Site Test limit is reached. The site cannot grow any further.'), 'warning')}
                    kapasitasLahan={panelKiri === 'lahan' && geomLahan ? (hasilLahan?.geometri_kapasitas ?? null) : null}
                    onLahanBerubah={(g) => {
                        lahanDariPeta.current = true;
                        setGeomLahan(g);
                    }}
                    zonaLahan={panelKiri === 'lahan' && geomLahan ? (hasilLahan?.zona ?? null) : null}
                    zonaManual={zonaLahan}
                    zonaDipilih={zonaDipilih}
                    kunciLahan={lahanTerkunci}
                    isiSembunyi={isiSembunyi}
                    zonaSembunyi={zonaSembunyi}
                    onZonaBerubah={(z) => {
                        lahanDariPeta.current = true;
                        setZonaLahan(rapikan(z));
                    }}
                    tambahZona={tambahZona}
                    akses={aksesLahan}
                    aksesServer={panelKiri === 'lahan' && geomLahan ? (hasilLahan?.akses ?? null) : null}
                    onAksesBerubah={(a) => {
                        lahanDariPeta.current = true;
                        setAksesLahan(a);
                    }}
                    tambahAkses={tambahAkses}
                    lebarGerbang={tipeLahan === 'rumah' ? (asumsiLahan.lebar_jalan ?? 8) : tipeLahan === 'kos' ? 3 : 6}
                />

                <div className="nr-app__kiri">
                    <div className="nr-app__atas" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <Link
                            href="/"
                            style={{
                                width: '48px',
                                height: '48px',
                                display: 'grid',
                                placeItems: 'center',
                                background: 'var(--white)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--line)',
                                color: 'var(--navy-900)',
                                flexShrink: 0,
                            }}
                            title="Kembali ke Beranda"
                            aria-label="Kembali ke Beranda"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                        </Link>

                        <SearchBar
                            mode={modeCari}
                            onMode={ubahModeCari}
                            nilai={kueri}
                            onUbah={setKueri}
                            onCari={(q) => (modeCari === 'lokasi' ? jalankanLokasi(q) : jalankanCari({ q, persona }))}
                            memuat={mencari}
                            commute={panelKiri === 'rute'}
                            onToggleCommute={toggleCommute}
                            filterTerbuka={panelKiri === 'filter'}
                            onToggleFilter={() => {
                                // Filter kota & persona hanya untuk rekomendasi: dari mode lokasi, otomatis pindah ke rekomendasi.
                                setModeCari('rekomendasi');
                                setHasilLokasi(null);
                                setPanelKiri(panelKiri === 'filter' ? null : 'filter');
                            }}
                        />

                        <button
                            type="button"
                            className="nr-lahan-tombol"
                            aria-pressed={panelKiri === 'lahan'}
                            onClick={toggleLahan}
                            title={t('Uji Lahan: gambar lahan dan hitung kapasitasnya', 'Site Test: draw a site and estimate its capacity')}
                            aria-label={t('Uji Lahan', 'Site Test')}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
                                <rect x="8" y="8" width="8" height="8" rx="1" />
                            </svg>
                        </button>
                    </div>

                    {panelKiri === 'top3' && <PanelTop3 personaLabel={labelPersona} hasil={hasil} memuat={mencari} pesan={pesanCari} aktif={top3Aktif} onPilih={pilihTop3} />}
                    {panelKiri === 'lokasi' && <PanelLokasi hasil={hasilLokasi} memuat={mencari} pesan={pesanCari} onPilih={pilihLokasi} />}
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
                    {panelKiri === 'lahan' && alatLahan && (
                        <PanelLahan
                            mode={alatLahan.mode}
                            onMode={mulaiLahan}
                            adaLahan={!!geomLahan}
                            data={hasilLahan}
                            memuat={memuatLahan}
                            galat={galatLahan}
                            tipe={tipeLahan}
                            onTipe={(x) =>
                                // Satu langkah undo: ganti tipe mengosongkan asumsi, pola, dan zona; rumah tapak tidak punya pintu gedung bersama.
                                proyekLahan.ubah(
                                    (lama) => ({
                                        tipe: x,
                                        asumsi: {},
                                        pola: null,
                                        zona: null,
                                        akses: x === 'rumah' ? lama.akses.filter((y) => y.jenis === 'gerbang') : lama.akses,
                                    }),
                                    'tipe',
                                )
                            }
                            pola={polaLahan}
                            onPola={(x) => proyekLahan.ubah({ pola: x, zona: null }, 'pola')}
                            bisaUndo={proyekLahan.bisaUndo}
                            bisaRedo={proyekLahan.bisaRedo}
                            onUndo={urungLahan}
                            onRedo={ulangLahan}
                            zonaManual={!!zonaLahan}
                            onAturUlangZona={() => {
                                setZonaLahan(null);
                                setZonaDipilih(null);
                            }}
                            onTambahZona={(jenis) => setTambahZona({ jenis, kunci: Date.now() })}
                            layer={{
                                zona: daftarZona,
                                luas: luasZona,
                                manual: !!zonaLahan,
                                dipilih: zonaDipilih,
                                onPilih: setZonaDipilih,
                                onUbah: (z) => {
                                    lahanDariPeta.current = true;
                                    setZonaLahan(rapikan(z));
                                },
                                lahanTerkunci,
                                onKunciLahan: setLahanTerkunci,
                                isi: isiLahan,
                                isiSembunyi,
                                onIsi: (jenis, tampil) => setIsiSembunyi((s) => (tampil ? s.filter((j) => j !== jenis) : [...s.filter((j) => j !== jenis), jenis])),
                            }}
                            akses={aksesLahan}
                            onAkses={setAksesLahan}
                            onTambahAkses={(jenis) => setTambahAkses({ jenis, kunci: Date.now() })}
                            on3D={() => setTampil3D(true)}
                            asumsi={asumsiLahan}
                            onAsumsi={setAsumsiLahan}
                            sesi={persona}
                            onGambarUlang={() => mulaiLahan(alatLahan.mode)}
                            onSelesaiPoligon={() => setSelesaiLahan(Date.now())}
                            onTutup={tutupPanelKiri}
                        />
                    )}
                    {panelKiri === 'rute' && (
                        <SimulatorRute
                            a={ruteA}
                            b={ruteB}
                            menunggu={menunggu}
                            hasil={rute}
                            memuat={memuatRute}
                            moda={moda}
                            onModa={setModa}
                            jenisKendaraan={jenisKendaraan}
                            onUbahJenisKendaraan={handleUbahJenisKendaraan}
                            konsumsiBbm={konsumsiBbm}
                            onUbahKonsumsiBbm={setKonsumsiBbm}
                            lewatTol={lewatTol}
                            onLewatTol={() => setLewatTol((x) => !x)}
                            hindariGg={hindariGg}
                            onHindariGg={() => setHindariGg((x) => !x)}
                            hargaBbm={hargaBbm}
                            onHargaBbm={setHargaBbm}
                            onPilihDiPeta={(k) => setMenunggu(k)}
                            onIsiTitik={(k, titik) => {
                                if (k === 'a') setRuteA(titik);
                                else setRuteB(titik);
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
                            <PanelLayer
                                aktif={layerAktif}
                                status={layerStatus}
                                onToggle={toggleLayer}
                                onCobaLagi={(k) => nyalakanLayer(k)}
                                subMati={subMati}
                                onSubToggle={(s) => setSubMati((m) => (m.includes(s) ? m.filter((x) => x !== s) : [...m, s]))}
                                onTutup={() => setPanelKanan(null)}
                            />
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

                <div className="nr-app__bilah">
                    <BilahAlat
                        alat={alat}
                        onAlat={gantiAlat}
                        alatTersedia={!modeRute && panelKiri !== 'lahan'}
                        modeKamera={modeKamera}
                        onModeKamera={gantiKamera}
                        kameraTersedia={mesin === 'maplibre'}
                        onZoom={(arah) => setPerintahZoom({ arah, kunci: Date.now() })}
                        jumlahSudut={sudutArea.length}
                        teksLuas={luasGambar ? teksLuas(luasGambar) : null}
                        memuatArea={memuatArea}
                        onUrungkan={() => setSudutArea((s) => s.slice(0, -1))}
                        onHapus={() => setSudutArea([])}
                        onSelesai={selesaiArea}
                        jangkauan={{ mode: isoMode, menit: isoMinutes, memuat: memuatDetail && detail?.jenis_geometri !== 'area', onMode: ubahIsoMode, onMenit: ubahIsoMinutes }}
                    />
                </div>

                <aside className="nr-app__catatan nr-float" aria-label={t('Keterangan data', 'Data notice')}>
                    <span className="nr-app__catatan-dot" aria-hidden="true" />
                    <span>
                        <b>{t('Versi demo', 'Demo version')}</b>
                        <span className="nr-app__catatan-pendek">{t(' · data sekunder publik', ' · public secondary data')}</span>
                        <span className="nr-app__catatan-panjang">{t(
                            ' · Semua layer dari data publik (OSM, InaRISK, BNPB, RDTR DKI, satelit PM2.5, rencana JUTPI3 via ModaHub). Udara adalah rata-rata tahunan satelit; zona lahan baru untuk DKI; status kepemilikan tidak ditampilkan.',
                            ' · All layers come from public data (OSM, InaRISK, BNPB, Jakarta RDTR, satellite PM2.5). Air is a satellite annual average; zoning covers Jakarta only; ownership status is not shown.',
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
                        <DrawerMenu
                            tab={drawer}
                            onTab={setDrawer}
                            terpilih={persona}
                            onUbahPersona={balikPersona}
                            onTutup={() => setDrawer(null)}
                            onPanduan={() => {
                                setDrawer(null);
                                setPanelKiri(null);
                                setPanelKanan(null);
                                setPanduan(true);
                            }}
                        />
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

                {panduan && (
                    <Panduan
                        onBersihkan={bersihkanUntukPanduan}
                        onSelesai={(dilewati) => {
                            setPanduan(false);
                            if (dilewati) kabar(t('Panduan dilewati. Buka lagi kapan saja lewat Menu > Panduan.', 'Guide skipped. Reopen it anytime from Menu > Guide.'), 'warning');
                        }}
                    />
                )}
            </main>
        </>
    );
}