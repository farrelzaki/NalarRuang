/**
 * Visual Explorer (UI01–UI05). Tata letak design-system.md bagian 5: search + satu panel di kolom kiri,
 * tombol merek kanan atas, LAYER/PERSONA + panel kanan di kanan bawah; tengah bawah: slider tahun di atas bilah alat
 * (Jelajah / Titik / Area, mode tampilan 2D / Miring / 3D, zoom).
 */
import { Head, Link } from '@inertiajs/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FeatureCollection, Geometry, Polygon } from 'geojson';
import type { CommuteResponse, JenisAkses, JenisZona, LahanRequest, HasilSearch, InspectResponse, LahanResponse, LayerKey, LayerResponse, Persona, SaranLokasi } from '@/types';
import { api } from '@/lib/api';
import { useProyekLahan } from '@/lib/proyekLahan';
import { buatUid, dariServer, keZonaApi, rapikan } from '@/lib/layerLahan';
import { luasM2 } from '@/lib/batasLahan';
import { kebutuhanLuas, tempatkanZona } from '@/lib/penempatan';
import { teksServer, useBahasa } from '@/lib/bahasa';
import { bacaPersonaSesi, PERSONA, simpanPersonaSesi, SUBFITUR, type IsochroneMode, type Simbol } from '@/lib/nalar';
import type { ModeKamera, TitikPeta } from '@/Map/PetaExplorer';
import PetaPilihan, { type MesinPeta } from '@/Map/PetaPilihan';
import { luasPoligonM2, teksLuas } from '@/Map/isiPeta';
import { mapLibreBolehDipakai } from '@/Map/maplibre';
import { bangunEkstrusi } from '@/lib/ekstrusi3d';
import { bacaBerkas, bangunGeoJSON, bungkusProyek, EKSTENSI, namaBerkas, type DesainImpor } from '@/lib/berkasLahan';
import { simpanBerkas } from '@/lib/simpanBerkas';
import { buatSkema, namaBerikut, type SkemaLahan } from '@/lib/skemaLahan';
import { bacaSesi, gantiTipe, KUNCI_SESI, tulisSesi, type SimpananTipe } from '@/lib/simpanTab';
import { putarDesain } from '@/lib/putar';
import { bangunCsv, bangunHtml, judul as judulLaporan } from '@/lib/laporanLahan';
import { BilahAlat, type Alat } from '@/Components/BilahAlat';
import { Toast, type NadaToast } from '@/Components/Dasar';
import { PanelFilter, PanelLokasi, PanelTop3, SearchBar, type ModeCari } from '@/Components/Pencarian';
import { DetailLokasi } from '@/Components/DetailLokasi';
import { SimulatorRute, type Moda, type TitikRute } from '@/Components/SimulatorRute';
import { PanelLayer, PanelProfilPersona, SliderTahun, TombolLayerPersona, TombolMerek, type PanelKananKey, type StatusLayer } from '@/Components/PanelKananPeta';
import { DialogPersona, DrawerMenu, type TabMenu } from '@/Components/MenuPersona';
import { Panduan, sudahLihatPanduan } from '@/Components/Panduan';
import { PanelLahan, type JenisLaporan, type JenisUnduhan, type ModeGambar } from '@/Components/PanelLahan';

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
    const [terbangKe, setTerbangKe] = useState<{ geometri?: Geometry; titik?: TitikPeta; kunci: number; paskan?: boolean } | null>(null);
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
        isiSisa: isiSisaLahan,
        targetJumlah: targetLahan,
        kunciUkuran: kunciUkuranLahan,
        laranganBanjir: laranganBanjirLahan,
        setGeom: setGeomLahan,
        setAsumsi: setAsumsiLahan,
        setZona: setZonaLahan,
        setAkses: setAksesLahan,
    } = proyekLahan;
    const [hasilLahan, setHasilLahan] = useState<LahanResponse | null>(null);
    const [tambahZona, setTambahZona] = useState<{ jenis: JenisZona; kunci: number; geometri?: Polygon | null } | null>(null);
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
    /** Luas taman dari sisa lahan (zona tambahan dari server, tidak ada di daftar layer), bila opsinya aktif. */
    const sisaTaman = useMemo(() => {
        if (!zonaLahan || !isiSisaLahan) return undefined;
        return hasilLahan?.zona?.features.find((f) => f.properties.id === zonaLahan.length)?.properties.luas_m2;
    }, [zonaLahan, isiSisaLahan, hasilLahan?.zona]);
    const zonaSembunyi = useMemo(() => (zonaLahan ?? []).flatMap((z, i) => (z.sembunyi ? [i] : [])), [zonaLahan]);
    const [tambahAkses, setTambahAkses] = useState<{ jenis: JenisAkses; kunci: number } | null>(null);
    const [tampil3D, setTampil3D] = useState(false);
    // Hasil Uji Lahan 3D langsung di peta (MapLibre). Kamera sebelumnya diingat supaya kembali ke 2D memulihkannya.
    const [lahan3DPeta, setLahan3DPeta] = useState(false);
    const [bisa3DPeta] = useState(mapLibreBolehDipakai);
    const kameraSebelum3D = useRef<ModeKamera | null>(null);
    const [layarPenuh, setLayarPenuh] = useState(false);
    const [mengunduh, setMengunduh] = useState(false);
    /** Skema yang disimpan untuk dibandingkan; hanya di sesi ini (lib/skemaLahan.ts). */
    const [skema, setSkema] = useState<SkemaLahan[]>([]);
    /** Pengaturan tab tipe bangunan lain (lib/simpanTab.ts); tab aktif ada di proyekLahan. */
    const simpananTipe = useRef<SimpananTipe>({});
    /** Mode gambar terakhir (Kotak/Poligon), ikut disimpan di sesi. */
    const modeTerakhir = useRef<ModeGambar>('kotak');
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
            ...(zonaLahan && isiSisaLahan && tipeLahan !== 'rumah' ? { isi_sisa: 'rekomendasi' as const } : {}),
            ...(targetLahan ? { target: { jumlah: targetLahan, kunci_ukuran: kunciUkuranLahan } } : {}),
            ...(laranganBanjirLahan ? { larangan_banjir: laranganBanjirLahan } : {}),
            ...(aksesLahan.length ? { akses: aksesLahan } : {}),
        };
        const jeda = setTimeout(() => kirimLahan.current(badan), lahanDariPeta.current ? 0 : 350);
        lahanDariPeta.current = false;
        return () => clearTimeout(jeda);
    }, [panelKiri, geomLahan, tipeLahan, asumsiLahan, persona, polaLahan, zonaLahan, aksesLahan, isiSisaLahan, targetLahan, kunciUkuranLahan, laranganBanjirLahan]);

    useEffect(() => batalLahan, []);

    const keluar3DPeta = () => {
        setLahan3DPeta(false);
        if (kameraSebelum3D.current) {
            setModeKamera(kameraSebelum3D.current);
            kameraSebelum3D.current = null;
        }
    };
    const masuk3DPeta = () => {
        if (!hasilLahan || !geomLahan) return;
        kameraSebelum3D.current = modeKamera;
        setModeKamera('miring');
        setLahan3DPeta(true);
    };

    /**
     * Panel Uji Lahan ditutup: alat gambar dan hasil dilepas, tetapi desain (lahan, semua tab, skema) tetap diingat di memori dan
     * sessionStorage sampai tab browser ditutup; membuka panel lagi memulihkannya. Menghapus desain hanya lewat tombol Ulang.
     */
    const resetLahan = () => {
        batalLahan();
        keluar3DPeta();
        setAlatLahan(null);
        setHasilLahan(null);
        setGalatLahan(null);
        setPulihLahan(null);
        setZonaDipilih(null);
        setLahanTerkunci(false);
        setIsiSembunyi([]);
        setTampil3D(false);
    };

    const mulaiLahan = (mode: ModeGambar) => {
        batalLahan();
        keluar3DPeta();
        // Gambar dari awal: simpanan tab lain dan sesi ikut dilupakan (skema tetap).
        simpananTipe.current = {};
        try {
            sessionStorage.removeItem(KUNCI_SESI);
        } catch {
            /* tanpa sessionStorage: cukup di memori */
        }
        modeTerakhir.current = mode;
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

    /**
     * Penempatan pintar: zona baru ditaruh di ruang kosong terbesar, seluas kebutuhan (kekurangan KDH untuk taman, kekurangan slot untuk
     * parkir), tidak menabrak layer terkunci. Bila ruang kosong habis, zona baru menimpa layer yang tidak terkunci.
     */
    const tambahkanZona = (jenis: JenisZona) => {
        if (!geomLahan) return;
        if (lahan3DPeta) {
            kabar(t('Kembali ke 2D dulu untuk menambah zona.', 'Go back to 2D first to add a zone.'), 'warning');
            return;
        }
        const luasLahan = hasilLahan?.luas_m2 ?? luasM2(geomLahan.coordinates[0].map(([lng, lat]) => ({ lat, lng })));
        const parkir = hasilLahan?.kapasitas?.parkir;
        const kebutuhan = kebutuhanLuas(jenis, {
            luasLahanM2: luasLahan,
            kdhTerpakai: hasilLahan?.ringkasan?.kdh_terpakai,
            kdhBatas: hasilLahan?.ringkasan?.kdh_batas,
            slotKurang: parkir ? Math.max(0, parkir.butuh - parkir.muat) : 0,
            jenisParkir: parkir?.jenis ?? null,
        });
        const hasil = tempatkanZona(geomLahan, daftarZona.map((z) => ({ geometri: z.geometri, kunci: z.kunci })), kebutuhan);
        if (!hasil) {
            kabar(t('Tidak ada ruang untuk zona baru: seluruh lahan tertutup layer terkunci.', 'No room for a new zone: the whole site is covered by locked layers.'), 'warning');
            return;
        }
        if (!hasil.bebas) kabar(t('Ruang kosong habis, jadi zona baru menimpa layer yang tidak terkunci.', 'No free space left, so the new zone overlaps unlocked layers.'));
        setTambahZona({ jenis, kunci: Date.now(), geometri: hasil.geometri });
    };

    /** Unduh desain: model 3D (.glb), data proyek (dibuka lagi lewat Impor), atau GeoJSON. Persona sesi tidak ikut tersimpan. */
    const unduhLahan = async (jenis: JenisUnduhan) => {
        if (!geomLahan || mengunduh) return;
        const waktu = new Date();
        const nama = namaBerkas(tipeLahan, waktu);
        setMengunduh(true);
        try {
            if (jenis === 'proyek') {
                const berkas = bungkusProyek(proyekLahan.snap, hasilLahan, waktu);
                if (!berkas) return;
                simpanBerkas(new Blob([JSON.stringify(berkas, null, 2)], { type: 'application/json' }), nama + EKSTENSI);
                kabar(t('Data proyek tersimpan. Buka lagi lewat Impor.', 'Project data saved. Reopen it with Import.'), 'success');
            } else if (jenis === 'geojson') {
                const fc = bangunGeoJSON(proyekLahan.snap, hasilLahan, waktu);
                if (!fc) return;
                simpanBerkas(new Blob([JSON.stringify(fc)], { type: 'application/geo+json' }), nama + '.geojson');
                kabar(t('GeoJSON tersimpan.', 'GeoJSON saved.'), 'success');
            } else {
                if (!hasilLahan) return;
                // three.js dan GLTFExporter baru diunduh saat dipakai.
                const { eksporGLB } = await import('@/Map/EksporLahan');
                simpanBerkas(new Blob([await eksporGLB(hasilLahan, geomLahan)], { type: 'model/gltf-binary' }), nama + '.glb');
                kabar(t('Model 3D tersimpan (.glb).', '3D model saved (.glb).'), 'success');
            }
        } catch (e) {
            console.warn('[NalarRuang] Gagal membuat berkas Uji Lahan:', e);
            kabar(t('Berkas tidak bisa dibuat. Coba lagi.', 'The file could not be created. Please try again.'), 'warning');
        } finally {
            setMengunduh(false);
        }
    };

    /** Pulihkan satu desain utuh (dari berkas atau skema): lokasi dan bentuk lahan sama persis, hasil dihitung ulang server. */
    const terapkanDesain = (desain: DesainImpor, mode: ModeGambar = 'poligon') => {
        batalLahan();
        keluar3DPeta();
        // Proyek baru (riwayat undo dimulai ulang). Alat gambar dimulai dengan bentuk ini (lahanAwal), bukan kotak baru.
        proyekLahan.mulaiBaru(desain);
        setPulihLahan(null);
        setZonaDipilih(null);
        setLahanTerkunci(false);
        setIsiSembunyi([]);
        setHasilLahan(null);
        setGalatLahan(null);
        lahanDariPeta.current = true;
        modeTerakhir.current = mode;
        setAlatLahan({ mode, kunci: Date.now() });
        setTerbangKe({ geometri: desain.geom, kunci: Date.now(), paskan: true });
    };

    const simpanSkema = () => {
        const baru = buatSkema(proyekLahan.snap, hasilLahan, namaBerikut(skema, t('Skema', 'Scheme')), buatUid(), Date.now());
        if (!baru) return;
        setSkema((s) => [...s, baru]);
        kabar(t(`${baru.nama} tersimpan. Ubah pengaturan lalu simpan lagi untuk membandingkan.`, `${baru.nama} saved. Change the settings and save again to compare.`), 'success');
    };
    const bukaSkema = (id: string) => {
        const s = skema.find((x) => x.id === id);
        if (!s?.snap.geom) return;
        terapkanDesain({ ...s.snap, geom: s.snap.geom });
        kabar(t(`${s.nama} dibuka.`, `${s.nama} opened.`), 'info');
    };

    /** Laporan hasil yang sedang tampil: CSV diunduh, PDF lewat dialog cetak (iframe tersembunyi tanpa skrip). */
    const buatLaporan = (jenis: JenisLaporan) => {
        if (!hasilLahan || !geomLahan) return;
        const bahan = { snap: proyekLahan.snap, hasil: hasilLahan, skema, waktu: new Date(), t, locale: bahasa === 'en' ? 'en-US' : 'id-ID' };
        if (jenis === 'csv') {
            simpanBerkas(new Blob([bangunCsv(bahan)], { type: 'text/csv;charset=utf-8' }), namaBerkas(tipeLahan, bahan.waktu) + '.csv');
            kabar(t('Laporan CSV tersimpan.', 'CSV report saved.'), 'success');
            return;
        }
        const bingkai = document.createElement('iframe');
        bingkai.setAttribute('aria-hidden', 'true');
        bingkai.title = judulLaporan(bahan);
        bingkai.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;';
        bingkai.srcdoc = bangunHtml(bahan);
        bingkai.onload = () => {
            try {
                bingkai.contentWindow?.focus();
                bingkai.contentWindow?.print();
            } catch {
                kabar(t('Dialog cetak tidak bisa dibuka. Pakai Laporan CSV, atau cetak dari peramban lain.', 'The print dialog could not open. Use the CSV report, or print from another browser.'), 'warning');
            }
            window.setTimeout(() => bingkai.remove(), 60_000);
        };
        document.body.appendChild(bingkai);
    };

    /** Buka berkas desain: lokasi dan bentuk lahan dipulihkan sama persis, hasil dihitung ulang server. Menggantikan desain yang sedang dibuka. */
    const imporLahan = async (berkas: File) => {
        if (berkas.size > 2_000_000) {
            kabar(t('Berkas terlalu besar untuk berkas Uji Lahan.', 'That file is too large to be a Site Test file.'), 'warning');
            return;
        }
        let teks: string;
        try {
            teks = await berkas.text();
        } catch {
            kabar(t('Berkas tidak bisa dibaca.', 'The file could not be read.'), 'warning');
            return;
        }
        const r = bacaBerkas(teks);
        if (!r.ok) {
            kabar(teksServer(r.galat), 'warning');
            return;
        }
        terapkanDesain(r.desain);
        kabar(
            r.peringatan.length
                ? t(`Berkas dibuka dengan ${r.peringatan.length} penyesuaian: ${r.peringatan.slice(0, 2).join('; ')}.`, `File opened with ${r.peringatan.length} adjustment(s): ${r.peringatan.slice(0, 2).join('; ')}.`)
                : r.sumber === 'geojson'
                  ? t('Bentuk lahan dari GeoJSON dibuka. Asumsi memakai nilai bawaan.', 'Site shape opened from GeoJSON. Assumptions use defaults.')
                  : t('Desain lahan dibuka di lokasi yang sama.', 'Site design opened at the same location.'),
            r.peringatan.length ? 'warning' : 'success',
        );
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

    // Ctrl+Z / Ctrl+Y (atau Ctrl+Shift+Z) dan Esc selama panel Uji Lahan terbuka; tidak mengganggu pengetikan di kolom isian.
    useEffect(() => {
        if (panelKiri !== 'lahan') return;
        const tekan = (e: KeyboardEvent) => {
            // Esc melepas zona yang dipilih (titik sudutnya ikut hilang).
            if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                setZonaDipilih(null);
                return;
            }
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
        // Desain yang masih diingat (panel pernah ditutup, atau halaman di-refresh) dibuka lagi persis seperti ditinggal.
        const diMemori = proyekLahan.snap.geom;
        let sesi: ReturnType<typeof bacaSesi> = null;
        if (!diMemori) {
            try {
                sesi = bacaSesi(sessionStorage.getItem(KUNCI_SESI));
            } catch {
                sesi = null;
            }
        }
        if (diMemori) {
            terapkanDesain({ ...proyekLahan.snap, geom: diMemori }, modeTerakhir.current);
            kabar(t('Desain lahan terakhir dibuka lagi. Tekan Ulang untuk mulai dari awal.', 'Your last site design is back. Press Reset to start over.'));
        } else if (sesi) {
            simpananTipe.current = sesi.simpanan;
            setSkema(sesi.skema);
            terapkanDesain({ ...sesi.snap, geom: sesi.snap.geom! }, sesi.mode);
            kabar(t('Desain lahan terakhir dibuka lagi. Tekan Ulang untuk mulai dari awal.', 'Your last site design is back. Press Reset to start over.'));
        } else {
            mulaiLahan('kotak');
            kabar(t('Tarik sudut kotak untuk mengatur luas lahan, atau pilih Poligon untuk menggambar bentuk bebas.', 'Drag the box corners to set the site size, or choose Polygon to draw a free shape.'));
        }
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

    // Simpanan sesi: desain (tanpa persona) ditulis ke sessionStorage, jadi bertahan saat panel ditutup dan halaman di-refresh,
    // lalu hilang saat tab browser ditutup.
    useEffect(() => {
        if (!proyekLahan.snap.geom) return;
        const jeda = setTimeout(() => {
            try {
                const teks = tulisSesi({ snap: proyekLahan.snap, simpanan: simpananTipe.current, mode: modeTerakhir.current, skema });
                if (teks) sessionStorage.setItem(KUNCI_SESI, teks);
            } catch {
                /* penyimpanan penuh atau tidak tersedia: desain tetap ada di memori */
            }
        }, 300);
        return () => clearTimeout(jeda);
    }, [proyekLahan.snap, skema]);

    // Tampilan 3D di peta hanya berlaku selama panel Uji Lahan terbuka.
    useEffect(() => {
        if (panelKiri !== 'lahan' && lahan3DPeta) keluar3DPeta();
    }, [panelKiri]);
    const ekstrusiLahan = useMemo(
        () => (panelKiri === 'lahan' && lahan3DPeta && hasilLahan && geomLahan ? bangunEkstrusi(hasilLahan, geomLahan) : null),
        [panelKiri, lahan3DPeta, hasilLahan, geomLahan],
    );

    // Layar penuh: seluruh halaman peta (panel dan bilah ikut), bukan hanya kanvas. Tidak ada di peramban tanpa Fullscreen API (mis. iPhone).
    useEffect(() => {
        const ubah = () => setLayarPenuh(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', ubah);
        return () => document.removeEventListener('fullscreenchange', ubah);
    }, []);
    const bisaLayarPenuh = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
    const toggleLayarPenuh = () => {
        const aksi = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        aksi.catch(() => kabar(t('Layar penuh tidak bisa dibuka di peramban ini.', 'Full screen is not available in this browser.'), 'warning'));
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
                    // Menggambar dan mengedit Uji Lahan (FR-23) hanya ada di Leaflet: selama panelnya terbuka peta memakai Leaflet,
                    // kecuali saat hasilnya dilihat 3D di peta (MapLibre).
                    paksaLeaflet={panelKiri === 'lahan' && !(lahan3DPeta && bisa3DPeta)}
                    onMapLibreGagal={() => {
                        if (lahan3DPeta) {
                            keluar3DPeta();
                            kabar(t('Peta 3D tidak bisa dimuat. Kembali ke tampilan 2D.', 'The 3D map could not be loaded. Back to the 2D view.'), 'warning');
                        }
                    }}
                    lahanAwal={panelKiri === 'lahan' ? geomLahan : null}
                    ekstrusiLahan={ekstrusiLahan}
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
                    onLahanPutar={(g, derajat, pusat) => {
                        // Satu langkah undo: lahan, zona yang ditarik sendiri (beserta arah parkirnya), dan gerbang/pintu berputar bersama.
                        lahanDariPeta.current = true;
                        proyekLahan.ubah((lama) => ({ geom: g, ...putarDesain(lama.zona, lama.akses, pusat, derajat) }), 'putar');
                        kabar(t(`Lahan diputar ${Math.round(derajat)}°.`, `Site rotated ${Math.round(derajat)}°.`));
                    }}
                    onLahanMode={(mode) => {
                        modeTerakhir.current = mode;
                        setAlatLahan((a) => (a ? { ...a, mode } : a));
                    }}
                    onLahanBerubah={(g) => {
                        lahanDariPeta.current = true;
                        setGeomLahan(g);
                    }}
                    zonaLahan={panelKiri === 'lahan' && geomLahan ? (hasilLahan?.zona ?? null) : null}
                    zonaManual={zonaLahan}
                    zonaDipilih={zonaDipilih}
                    onPilihZona={setZonaDipilih}
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
                            onTipe={(x) => {
                                // Tiap tab mengingat pengaturannya sendiri: tab lama disimpan, tab baru dipulihkan (atau bawaan). Satu langkah undo.
                                const r = gantiTipe(proyekLahan.snap, simpananTipe.current, x);
                                simpananTipe.current = r.simpanan;
                                setZonaDipilih(null);
                                proyekLahan.ubah(() => r.snap, 'tipe');
                            }}
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
                            onTambahZona={tambahkanZona}
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
                                isiSisa: isiSisaLahan,
                                bolehIsiSisa: tipeLahan !== 'rumah',
                                luasSisaTaman: sisaTaman,
                                // Mengaktifkan menjadikan zona bawaan sebagai zona sendiri (opsi hanya berlaku untuk zona sendiri).
                                onIsiSisa: (v) => {
                                    lahanDariPeta.current = true;
                                    proyekLahan.ubah((lama) => ({ isiSisa: v, zona: lama.zona ?? dariServer(hasilLahan?.zona) }), 'isiSisa');
                                },
                                isi: isiLahan,
                                isiSembunyi,
                                onIsi: (jenis, tampil) => setIsiSembunyi((s) => (tampil ? s.filter((j) => j !== jenis) : [...s.filter((j) => j !== jenis), jenis])),
                            }}
                            akses={aksesLahan}
                            onAkses={setAksesLahan}
                            onTambahAkses={(jenis) =>
                                lahan3DPeta
                                    ? kabar(t('Kembali ke 2D dulu untuk menaruh gerbang atau pintu.', 'Go back to 2D first to place a gate or door.'), 'warning')
                                    : setTambahAkses({ jenis, kunci: Date.now() })
                            }
                            on3D={() => setTampil3D(true)}
                            skema={skema}
                            onSimpanSkema={simpanSkema}
                            onBukaSkema={bukaSkema}
                            onHapusSkema={(id) => setSkema((s) => s.filter((x) => x.id !== id))}
                            onLaporan={buatLaporan}
                            onUnduh={unduhLahan}
                            onImpor={imporLahan}
                            mengunduh={mengunduh}
                            asumsi={asumsiLahan}
                            onAsumsi={setAsumsiLahan}
                            targetJumlah={targetLahan}
                            kunciUkuran={kunciUkuranLahan}
                            laranganBanjir={laranganBanjirLahan}
                            onLaranganBanjir={(n) => {
                                lahanDariPeta.current = true;
                                proyekLahan.ubah({ laranganBanjir: n }, 'laranganBanjir');
                            }}
                            // Satu langkah undo: target, kunci ukuran, dan (saat target dilepas) asumsi hasil pencarian ikut berubah bersama.
                            onTarget={(p) => {
                                lahanDariPeta.current = true;
                                proyekLahan.ubah(
                                    (lama) => ({
                                        targetJumlah: p.jumlah === undefined ? lama.targetJumlah : p.jumlah,
                                        kunciUkuran: p.kunciUkuran ?? lama.kunciUkuran,
                                        ...(p.asumsi ? { asumsi: p.asumsi } : {}),
                                    }),
                                    'target',
                                );
                            }}
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
                        layarPenuh={bisaLayarPenuh ? { aktif: layarPenuh, onToggle: toggleLayarPenuh } : null}
                        lahan3D={panelKiri === 'lahan' && bisa3DPeta && hasilLahan && geomLahan ? { aktif: lahan3DPeta, onToggle: lahan3DPeta ? keluar3DPeta : masuk3DPeta } : null}
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