/**
 * Peta Visual Explorer (UI01). Satu-satunya tempat yang menyentuh `L` (CLAUDE.md).
 * Basemap OSM standar; layer dari /api/layers; seleksi, Top 3, isochrone, dan rute mengikuti kartografi design-system.md bagian 9.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Point, Polygon } from 'geojson';
import type { AksesLahanMasuk, AksesLahanProps, CommuteResponse, HasilSearch, JenisAkses, JenisZona, LayerKey, ZonaLahan, ZonaLahanProps } from '@/types';
import type { Bahasa } from '@/lib/bahasa';
import * as gaya from './gaya';
import { simpanTampilan, tampilanTerakhir } from './tampilan';
import { ATRIBUSI_DATA, isiPopupLegal, isiPopupRdtr, isiPopupUmum, popupHtml, ponsel, tr, warnaEkosistem, type IsiPopup } from './isiPeta';
import { AlatLahan, LapisanKapasitas, type ModeLahan } from './GambarLahan';
import { AlatZona, type TeksZona } from './ZonaLahan';
import { AlatAkses, type TeksAkses } from './AksesLahan';

export type TitikPeta = { lat: number; lng: number };

/** Mode kamera bilah alat: tampak atas, miring, atau 3D (hanya MapLibre; Leaflet selalu tampak atas). */
export type ModeKamera = 'atas' | 'miring' | '3d';

/** Props bersama untuk semua mesin peta (Leaflet dan MapLibre). */
export type PropsPeta = {
    layer: Partial<Record<LayerKey, FeatureCollection>>;
    aktif?: Partial<Record<LayerKey, boolean>>;
    tahun: number;
    top3: HasilSearch[] | null;
    top3Aktif: number | null;
    wilayahTerpilih: Geometry | null;
    pin: TitikPeta | null;
    isochrone?: FeatureCollection | null;
    rute: CommuteResponse | null;
    ruteA: TitikPeta | null;
    ruteB: TitikPeta | null;
    moda: 'mobil' | 'transit';
    /** True saat klik peta dipakai untuk menaruh titik (alat Titik/Area atau rute A/B): popup fitur dan klik Top 3 tidak dibuka, klik diteruskan ke peta. */
    modeRute: boolean;
    bahasa: Bahasa;
    /** Alat Area: titik sudut yang sedang digambar (belum selesai). */
    sudutArea?: TitikPeta[];
    modeKamera?: ModeKamera;
    /** Perintah zoom dari bilah alat; `kunci` berubah tiap klik. */
    perintahZoom?: { arah: 1 | -1; kunci: number } | null;
    /** `paskan`: zoom disesuaikan supaya geometri pas di layar (mis. lahan yang baru diimpor); tanpa itu hanya pusat peta yang dipindah. */
    terbangKe: { geometri?: Geometry; titik?: TitikPeta; kunci: number; paskan?: boolean } | null;
    onKlikPeta: (t: TitikPeta) => void;
    onLihatDetail: (t: TitikPeta) => void;
    onPilihTop3: (i: number) => void;
    onBatasPeta?: () => void;
    onBboxChange?: (layerKey: LayerKey, bbox: string) => void;
    /** Uji Lahan (FR-23): mode alat gambar; kunci baru = mulai ulang gambar. null = alat mati. */
    alatLahan?: { mode: ModeLahan; kunci: number } | null;
    /** Ubah angka ini untuk menutup poligon yang sedang digambar (tombol Selesai). */
    selesaiLahan?: number;
    /** Kavling/jalan/tapak dari POST /api/lahan. */
    kapasitasLahan?: FeatureCollection | null;
    /** Bentuk lahan yang sudah ada saat alat gambar dimulai (kembali dari 3D di peta): dipulihkan, bukan kotak baru. Hanya Leaflet. */
    lahanAwal?: Polygon | null;
    /** Hasil Uji Lahan sebagai fitur ekstrusi 3D (lib/ekstrusi3d.ts); non-null = tampil 3D di peta. Hanya MapLibre. */
    ekstrusiLahan?: FeatureCollection | null;
    onLahanBerubah?: (g: Polygon | null, tarik?: boolean) => void;
    /** Kotak menjadi poligon karena titiknya ditambah/dihapus di peta. */
    onLahanMode?: (mode: ModeLahan) => void;
    /** Seluruh lahan diputar `derajat` (searah jarum jam) terhadap `pusat`; zona dan akses diputar pemanggil. */
    onLahanPutar?: (g: Polygon, derajat: number, pusat: { lat: number; lng: number }) => void;
    /** Bentuk lahan tertahan di batas ukuran maksimum (20 ha); dipakai untuk menampilkan notifikasi. */
    onLahanBatas?: () => void;
    /** Kunci baru = pulihkan bentuk lahan ke `geom` (undo/redo); tidak memicu onLahanBerubah. */
    pulihLahan?: { geom: Polygon; kunci: number } | null;
    /** Zona dari respons /api/lahan (bawaan pola atau hasil potong zona pengguna). */
    zonaLahan?: FeatureCollection<Polygon | MultiPolygon, ZonaLahanProps> | null;
    /** Zona pengguna (belum dipotong); null = zona bawaan pola. */
    zonaManual?: ZonaLahan[] | null;
    onZonaBerubah?: (zona: ZonaLahan[], tarik: boolean) => void;
    /** uid zona yang dipilih di panel layer (disorot di peta; hanya zona ini yang menampilkan titik sudut). */
    zonaDipilih?: string | null;
    /** Zona dipilih/dilepas dari peta (klik pegangannya, klik peta kosong). */
    onPilihZona?: (uid: string | null) => void;
    /** Lahan terkunci: digambar tanpa pegangan dan tidak bisa diubah dari peta. */
    kunciLahan?: boolean;
    /** Jenis isi hasil (mis. 'slot') dan nomor zona (id server) yang disembunyikan dari peta; hanya tampilan. */
    isiSembunyi?: string[];
    zonaSembunyi?: number[];
    /** Kunci baru = tambahkan satu zona berjenis ini di tengah lahan. */
    tambahZona?: { jenis: JenisZona; kunci: number; geometri?: Polygon | null } | null;
    /** Gerbang kendaraan dan pintu gedung yang ditaruh pengguna. */
    akses?: AksesLahanMasuk[];
    aksesServer?: FeatureCollection<Point, AksesLahanProps> | null;
    /** Lebar gerbang baru sebelum ada jawaban server (m). */
    lebarGerbang?: number;
    onAksesBerubah?: (akses: AksesLahanMasuk[], tarik: boolean) => void;
    tambahAkses?: { jenis: JenisAkses; kunci: number } | null;
    className?: string;
};

type Props = PropsPeta;

let modeRuteAktif = false;

const PUSAT: L.LatLngExpression = [-6.43, 106.81];
const BATAS_DATA = L.latLngBounds([-6.56, 106.7], [-6.28, 106.92]);
const BATAS_PETA = L.latLngBounds([-6.85, 106.15], [-5.85, 107.35]);
const PADDING_KIRI = L.point(392, 80);
const PADDING_KANAN = L.point(80, 90);

function padding(): { paddingTopLeft: L.Point; paddingBottomRight: L.Point } {
    return ponsel()
        ? { paddingTopLeft: L.point(16, 120), paddingBottomRight: L.point(16, Math.round(window.innerHeight * 0.55) + 16) }
        : { paddingTopLeft: PADDING_KIRI, paddingBottomRight: PADDING_KANAN };
}


function topengRedup(geometri: Geometry[]): L.Polygon {
    const luar: L.LatLngExpression[] = [[-7.6, 105.4], [-7.6, 108.2], [-5.4, 108.2], [-5.4, 105.4]];
    const cincin = (c: number[][]) => c.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
    const lubang: L.LatLngTuple[][] = [];
    for (const g of geometri) {
        if (g.type === 'Polygon') lubang.push(cincin(g.coordinates[0]));
        else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => lubang.push(cincin(p[0])));
    }
    return L.polygon([luar, ...lubang], { pane: 'nrSeleksi', interactive: false, stroke: false, fillColor: '#0f1b3d', fillOpacity: 0.18 });
}

function panahArah(coords: [number, number][], tiapMeter = 600): L.Marker[] {
    const hasil: L.Marker[] = [];
    let sisa = tiapMeter / 2;
    for (let i = 0; i < coords.length - 1; i++) {
        const a = L.latLng(coords[i][1], coords[i][0]);
        const b = L.latLng(coords[i + 1][1], coords[i + 1][0]);
        const d = a.distanceTo(b);
        let jalan = 0;
        while (sisa <= d - jalan) {
            jalan += sisa;
            const f = jalan / d;
            const p = L.latLng(a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f);
            const sudut = (Math.atan2(-(b.lat - a.lat), (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180)) * 180) / Math.PI;
            hasil.push(
                L.marker(p, {
                    interactive: false,
                    icon: L.divIcon({
                        className: 'nr-panah',
                        html: `<svg width="12" height="12" viewBox="-6 -6 12 12" style="transform:rotate(${sudut}deg)"><path d="M-3.5 -3.5 L1.5 0 L-3.5 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                        iconSize: [12, 12],
                    }),
                }),
            );
            sisa = tiapMeter;
        }
        sisa -= d - jalan;
    }
    return hasil;
}

function titikAB(t: TitikPeta, huruf: 'A' | 'B'): L.Marker {
    return L.marker([t.lat, t.lng], {
        interactive: false,
        zIndexOffset: 1000,
        icon: L.divIcon({ className: '', html: `<span class="nr-route__dot ${huruf === 'A' ? 'nr-route__dot--a' : ''} nr-ab">${huruf}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
    });
}

export default function PetaExplorer(props: Props) {
    const wadah = useRef<HTMLDivElement>(null);
    const peta = useRef<L.Map | null>(null);
    const grupLayer = useRef<Partial<Record<LayerKey, L.LayerGroup>>>({});
    const grupSeleksi = useRef<L.LayerGroup | null>(null);
    const grupRute = useRef<L.LayerGroup | null>(null);
    const grupKapasitas = useRef<L.LayerGroup | null>(null);
    const alat = useRef<AlatLahan | null>(null);
    /** Kunci alat gambar yang sudah dimulai (untuk membedakan "mulai ulang" dari "mode berganti dari peta"). */
    const kunciAlat = useRef<number | null>(null);
    const tergambar = useRef<Partial<Record<LayerKey, FeatureCollection>>>({});
    const panggil = useRef(props);
    panggil.current = props;
    modeRuteAktif = props.modeRute;

    // Pindah ke alat Titik/Area (atau mode rute): tutup popup fitur yang masih terbuka.
    useEffect(() => {
        if (props.modeRute) peta.current?.closePopup();
    }, [props.modeRute]);

    useEffect(() => {
        if (!wadah.current) return;
        const m = L.map(wadah.current, {
            zoomControl: false,
            minZoom: ponsel() ? 9 : 10,
            maxZoom: 19,
            maxBounds: BATAS_PETA,
            maxBoundsViscosity: 1,
            preferCanvas: false,
        }).setView(tampilanTerakhir() ? [tampilanTerakhir()!.lat, tampilanTerakhir()!.lng] : PUSAT, tampilanTerakhir() ? Math.round(tampilanTerakhir()!.zoomLeaflet) : 13);
        m.on('moveend', () => {
            const c = m.getCenter();
            simpanTampilan({ lat: c.lat, lng: c.lng, zoomLeaflet: m.getZoom() });
        });
        let terakhirBatas = 0;
        m.on('drag', () => {
            const v = m.getBounds();
            const e = 0.002;
            const mentok = v.getWest() <= BATAS_PETA.getWest() + e || v.getEast() >= BATAS_PETA.getEast() - e
                || v.getSouth() <= BATAS_PETA.getSouth() + e || v.getNorth() >= BATAS_PETA.getNorth() - e;
            if (mentok && Date.now() - terakhirBatas > 5000) {
                terakhirBatas = Date.now();
                panggil.current.onBatasPeta?.();
            }
        });
        // Tombol zoom ada di bilah alat tengah bawah (perintahZoom), bukan kontrol Leaflet.
        m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution:
                `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ${ATRIBUSI_DATA}`,
        }).addTo(m);
        m.createPane('nrPoligon').style.zIndex = '410';
        m.createPane('nrGaris').style.zIndex = '420';
        m.createPane('nrTitik').style.zIndex = '430';
        m.createPane('nrStasiun').style.zIndex = '440';
        m.createPane('nrLahanIsi').style.zIndex = '445';
        m.createPane('nrZona').style.zIndex = '448';
        m.createPane('nrSeleksi').style.zIndex = '450';
        m.createPane('nrRute').style.zIndex = '460';
        grupSeleksi.current = L.layerGroup().addTo(m);
        grupRute.current = L.layerGroup().addTo(m);
        grupKapasitas.current = L.layerGroup().addTo(m);

        const muatBboxFitur = () => {
            const m = peta.current;
            if (!m) return;
            const z = m.getZoom();

            const legalitasAktif = panggil.current.aktif?.legalitas ?? true;

            if (z >= 14 && legalitasAktif && !m.hasLayer(L.Popup.prototype)) {
                const b = m.getBounds();
                const bboxStr = `${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)}`;
                if (panggil.current.onBboxChange) {
                    panggil.current.onBboxChange('legalitas', bboxStr);
                    panggil.current.onBboxChange('persil', bboxStr);
                }
            }
        };

        m.on('moveend zoomend', muatBboxFitur);
        m.on('click', (e: L.LeafletMouseEvent) => panggil.current.onKlikPeta({ lat: e.latlng.lat, lng: e.latlng.lng }));
        m.on('popupopen', (e: L.PopupEvent) => {
            const el = e.popup.getElement()?.querySelector('[data-detail]');
            const ll = e.popup.getLatLng();
            el?.addEventListener('click', () => {
                m.closePopup();
                if (ll) panggil.current.onLihatDetail({ lat: ll.lat, lng: ll.lng });
            });
        });
        m.on('zoomend', () => {
            const z = m.getZoom();
            wadah.current?.classList.toggle('nr-zoom-jauh', z < 13);
            wadah.current?.classList.toggle('nr-zoom-sedang', z < 15);
        });
        m.fire('zoomend');
        peta.current = m;
        return () => {
            alat.current = null;
            alatZona.current = null;
            alatAkses.current = null;
            lapisan.current = null;
            m.remove();
            peta.current = null;
        };
    }, []);

    useEffect(() => {
        const set = (sel: string, teks: string) => {
            const el = wadah.current?.querySelector(sel);
            el?.setAttribute('title', teks);
            el?.setAttribute('aria-label', teks);
        };
        set('.leaflet-control-zoom-in', tr('Perbesar peta', 'Zoom in'));
        set('.leaflet-control-zoom-out', tr('Perkecil peta', 'Zoom out'));
        peta.current?.closePopup();
    }, [props.bahasa]);

    useEffect(() => {
        const m = peta.current;
        if (!m) return;

        for (const k of Object.keys(grupLayer.current) as LayerKey[]) {
            const fc = props.layer[k];
            if (!fc || !fc.features || fc.features.length === 0) {
                grupLayer.current[k]?.remove();
                delete grupLayer.current[k];
                delete tergambar.current[k];
            }
        }

        for (const [k, fc] of Object.entries(props.layer) as [LayerKey, FeatureCollection][]) {
            if (!fc || !fc.features || fc.features.length === 0) continue;

            if (grupLayer.current[k] && tergambar.current[k] !== fc) {
                grupLayer.current[k]?.remove();
                delete grupLayer.current[k];
            }

            if (!grupLayer.current[k]) {
                grupLayer.current[k] = gambarLayer(k, fc, props.tahun).addTo(m);
                tergambar.current[k] = fc;
            }
        }
    }, [props.layer, props.aktif]);

    useEffect(() => {
        const m = peta.current;
        const fc = props.layer.mesin_waktu;
        if (!m || !fc) return;
        grupLayer.current.mesin_waktu?.remove();
        grupLayer.current.mesin_waktu = gambarLayer('mesin_waktu', fc, props.tahun).addTo(m);
    }, [props.tahun]);

    useEffect(() => {
        const g = grupSeleksi.current;
        if (!g) return;
        g.clearLayers();
        if (props.top3?.length) topengRedup(props.top3.map((r) => r.geometri as Geometry)).addTo(g);
        props.top3?.forEach((r, i) => {
            const aktif = props.top3Aktif === i;
            L.geoJSON(r.geometri as Geometry, { pane: 'nrSeleksi', style: { ...gaya.top3, weight: aktif ? 3.5 : 2.5, fillOpacity: aktif ? 0.14 : 0.08 } })
                .on('click', (e) => {
                    if (modeRuteAktif) return;
                    L.DomEvent.stopPropagation(e);
                    panggil.current.onPilihTop3(i);
                })
                .addTo(g);
            L.marker([r.pusat.lat, r.pusat.lng], {
                pane: 'nrSeleksi',
                icon: L.divIcon({ className: '', html: `<span class="nr-peringkat">${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
            })
                .on('click', (e) => {
                    if (modeRuteAktif) peta.current?.fire('click', e);
                    else panggil.current.onPilihTop3(i);
                })
                .addTo(g);
        });
        if (props.wilayahTerpilih) {
            L.geoJSON(props.wilayahTerpilih, { pane: 'nrSeleksi', style: gaya.terpilih, interactive: false }).addTo(g);
        }
        // Alat Titik: poligon jangkauan waktu tempuh (isochrone, T-056) menggantikan lingkaran radius tetap.
        if (props.pin && props.isochrone?.features?.length) {
            L.geoJSON(props.isochrone, { pane: 'nrSeleksi', interactive: false, style: gaya.isochrone }).addTo(g);
        }
        const sudut = props.sudutArea ?? [];
        if (sudut.length) {
            const ll = sudut.map((p) => L.latLng(p.lat, p.lng));
            if (ll.length >= 3) L.polygon(ll, { pane: 'nrSeleksi', interactive: false, color: '#0f1b3d', weight: 2, dashArray: '6 4', fillColor: '#0f1b3d', fillOpacity: 0.12 }).addTo(g);
            else L.polyline(ll, { pane: 'nrSeleksi', interactive: false, color: '#0f1b3d', weight: 2, dashArray: '6 4' }).addTo(g);
            ll.forEach((p, i) => L.circleMarker(p, { pane: 'nrSeleksi', interactive: false, radius: i === 0 ? 6 : 4.5, color: '#0f1b3d', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }).addTo(g));
        }
        if (props.pin) {
            L.marker([props.pin.lat, props.pin.lng], {
                pane: 'nrSeleksi',
                interactive: false,
                icon: L.divIcon({
                    className: '',
                    html: '<svg width="30" height="38" viewBox="-15 -36 30 38"><path d="M0 0 C-3.5 -8 -13 -14 -13 -23 A13 13 0 1 1 13 -23 C13 -14 3.5 -8 0 0Z" fill="#0f1b3d" stroke="#fff" stroke-width="2"/><circle cy="-23" r="4.5" fill="#fff"/></svg>',
                    iconSize: [30, 38],
                    iconAnchor: [15, 36],
                }),
            }).addTo(g);
        }
    }, [props.top3, props.top3Aktif, props.wilayahTerpilih, props.pin, props.isochrone, props.sudutArea]);

    // Zoom dari bilah alat.
    useEffect(() => {
        const m = peta.current;
        const z = props.perintahZoom;
        if (!m || !z) return;
        if (z.arah > 0) m.zoomIn();
        else m.zoomOut();
    }, [props.perintahZoom?.kunci]);

    // Isochrone baru: peta menyesuaikan agar seluruh jangkauan terlihat.
    useEffect(() => {
        const m = peta.current;
        if (!m || !props.isochrone?.features?.length) return;
        const b = L.geoJSON(props.isochrone).getBounds();
        if (b.isValid()) m.fitBounds(b, { ...padding(), maxZoom: 16, animate: true });
    }, [props.isochrone]);

    useEffect(() => {
        const g = grupRute.current;
        if (!g) return;
        g.clearLayers();
        const r = props.rute;
        if (r?.publik) {
            const kuat = props.moda === 'transit';
            const tebal = kuat ? 5 : 3.5;
            const grup = L.layerGroup().addTo(g);
            L.geoJSON(r.publik.geometri.rel, { pane: 'nrRute', interactive: false, style: { color: '#fff', weight: tebal + 3, opacity: kuat ? 1 : 0.4 } }).addTo(grup);
            const rel = r.publik.geometri.rel;
            const bagianRel = rel.type === 'MultiLineString' ? rel.coordinates : [rel.coordinates];
            const linRuas = new Map<number, string>();
            r.publik.langkah?.forEach((l) => l.tipe === 'naik' && l.garis != null && linRuas.set(l.garis, l.lin));
            bagianRel.forEach((c, i) =>
                L.polyline(
                    c.map(([x, y]) => [y, x] as L.LatLngTuple),
                    { pane: 'nrRute', interactive: false, color: gaya.warna.lin(linRuas.get(i) ?? 'bogor'), weight: tebal, opacity: kuat ? 1 : 0.4 },
                ).addTo(grup),
            );
            r.publik.geometri.ojol?.forEach((w) => L.geoJSON(w, { pane: 'nrRute', interactive: false, style: { ...gaya.ruteOjol, opacity: kuat ? 1 : 0.4 } }).addTo(grup));
            r.publik.geometri.jalan_kaki.forEach((w) => L.geoJSON(w, { pane: 'nrRute', interactive: false, style: { ...gaya.ruteJalanKaki, opacity: kuat ? 1 : 0.4 } }).addTo(grup));
            r.publik.stasiun.forEach((s) =>
                L.circleMarker([s.lat, s.lng], { pane: 'nrRute', radius: 6, color: '#0f1b3d', weight: 2.5, fillColor: '#fbf9f6', fillOpacity: 1, opacity: kuat ? 1 : 0.5 })
                    .bindTooltip(s.nama, { permanent: kuat, direction: 'top', offset: [0, -8], className: 'nr-maplabel' })
                    .addTo(grup),
            );
            if (kuat) {
                const rel = r.publik.geometri.rel;
                const bagian = rel.type === 'MultiLineString' ? rel.coordinates : [rel.coordinates];
                bagian.forEach((c) => panahArah(c as [number, number][]).forEach((p) => p.addTo(grup)));
            }
        }
        if (r?.pribadi) {
            const kuat = props.moda === 'mobil';
            const tebal = kuat ? 5 : 3.5;
            L.geoJSON(r.pribadi.geometri, { pane: 'nrRute', interactive: false, style: { ...gaya.ruteMobil.casing, weight: tebal + 3, opacity: kuat ? 1 : 0.4 } }).addTo(g);
            L.geoJSON(r.pribadi.geometri, { pane: 'nrRute', interactive: false, style: { ...gaya.ruteMobil.garis, weight: tebal, opacity: kuat ? 1 : 0.4 } }).addTo(g);
            if (kuat) panahArah(r.pribadi.geometri.coordinates as [number, number][]).forEach((p) => p.addTo(g));
        }
        if (props.ruteA) titikAB(props.ruteA, 'A').addTo(g);
        if (props.ruteB) titikAB(props.ruteB, 'B').addTo(g);

        const m = peta.current;
        if (m && r && (r.pribadi || r.publik)) {
            const b = L.latLngBounds([]);
            if (r.pribadi) b.extend(L.geoJSON(r.pribadi.geometri).getBounds());
            if (r.publik) b.extend(L.geoJSON(r.publik.geometri.rel).getBounds());
            if (props.ruteA) b.extend([props.ruteA.lat, props.ruteA.lng]);
            if (props.ruteB) b.extend([props.ruteB.lat, props.ruteB.lng]);
            if (b.isValid()) m.fitBounds(b, { ...padding(), animate: false });
        }
    }, [props.rute, props.moda, props.ruteA, props.ruteB]);

    useEffect(() => {
        const m = peta.current;
        const t = props.terbangKe;
        if (!m || !t) return;
        if (t.geometri) {
            const b = L.geoJSON(t.geometri).getBounds();
            if (b.isValid()) {
                // Ruang kiri untuk panel di desktop (392 px), bawah untuk panel di ponsel dan bilah alat.
                if (t.paskan) m.fitBounds(b, ponsel() ? { paddingTopLeft: [16, 110], paddingBottomRight: [16, Math.round(window.innerHeight * 0.55) + 16], maxZoom: 19, animate: false } : { paddingTopLeft: [392, 80], paddingBottomRight: [80, 90], maxZoom: 19, animate: false });
                else m.setView(b.getCenter(), m.getZoom(), { animate: false });
            }
        } else if (t.titik) {
            m.setView([t.titik.lat, t.titik.lng], m.getZoom(), { animate: false });
        }
    }, [props.terbangKe?.kunci]);

    // Uji Lahan (FR-23): lapisan isi yang berganti halus; dibuat sekali bersama peta.
    const lapisan = useRef<LapisanKapasitas | null>(null);
    const labelIsi = (p: Record<string, unknown>): string | null => {
        if (p.jenis !== 'tapak' && p.jenis !== 'taman') return null;
        // Taman rumah tapak (dan taman kedua dst.) tidak membawa angka gedung: tanpa label.
        if (p.lantai == null || p.jumlah == null) return null;
        const satuan = String(p.satuan) === 'kamar' ? tr('kamar', 'rooms') : tr('unit', 'units');
        return `${p.lantai} ${tr('lantai', 'floors')} · ${p.jumlah} ${satuan}`;
    };

    const alatZona = useRef<AlatZona | null>(null);
    const alatAkses = useRef<AlatAkses | null>(null);
    const teksAkses = (): TeksAkses => ({
        label: { gerbang: tr('Gerbang', 'Gate'), pintu: tr('Pintu', 'Door') },
        hapus: tr('Hapus', 'Remove'),
    });
    /** Cincin zona bangunan dari hasil terakhir (tempat pintu menempel). */
    const cincinGedung = (): L.LatLng[][] =>
        (panggil.current.zonaLahan?.features ?? [])
            .filter((f) => f.properties.jenis === 'bangunan')
            .flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates))
            .flatMap((poli) => poli.map((r) => r.slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng))));
    const teksZona = (): TeksZona => ({
        label: { bangunan: tr('Gedung', 'Building'), parkir: tr('Parkir', 'Parking'), taman: tr('Taman', 'Park'), larangan: tr('Larangan bangun', 'No-build') },
        otomatis: tr('Larangan (banjir)', 'No-build (flood)'),
        hapus: tr('Hapus zona', 'Remove zone'),
    });

    // Uji Lahan (FR-23)
    useEffect(() => {
        const m = peta.current;
        if (!m) return;
        if (!alatAkses.current) {
            alatAkses.current = new AlatAkses(m, (a, tarik) => panggil.current.onAksesBerubah?.(a, tarik), teksAkses());
        }
        if (!alatZona.current) {
            alatZona.current = new AlatZona(
                m,
                (zona, tarik) => panggil.current.onZonaBerubah?.(zona, tarik),
                (id, cincin) => lapisan.current?.saringZona(id, cincin),
                teksZona(),
                (uid) => panggil.current.onPilihZona?.(uid),
            );
        }
        if (!lapisan.current && grupKapasitas.current) lapisan.current = new LapisanKapasitas(m, grupKapasitas.current, labelIsi);
        if (!alat.current) {
            alat.current = new AlatLahan(
                m,
                (g, tarik) => {
                    // Batas lahan terbaru: isi dipotong ke batas ini dan unit/kavling di luar batas langsung memudar.
                    lapisan.current?.saring(g ? g.coordinates[0].slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng)) : null);
                    panggil.current.onLahanBerubah?.(g, tarik);
                },
                (titik) => lapisan.current?.saring(titik),
                () => panggil.current.onLahanBatas?.(),
                (mode) => {
                    kunciAlat.current = panggil.current.alatLahan?.kunci ?? null;
                    panggil.current.onLahanMode?.(mode);
                },
                (g, derajat, pusat) => {
                    lapisan.current?.saring(g.coordinates[0].slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng)));
                    panggil.current.onLahanPutar?.(g, derajat, pusat);
                },
            );
        }
        // Kotak yang berubah menjadi poligon dari peta: panel ikut berganti mode, alat tidak perlu dimulai ulang.
        if (props.alatLahan && props.alatLahan.kunci === kunciAlat.current && alat.current.modeSekarang === props.alatLahan.mode) return;
        kunciAlat.current = props.alatLahan?.kunci ?? null;
        alat.current.mulai(props.alatLahan?.mode ?? null, props.alatLahan ? props.lahanAwal : null);
        if (!props.alatLahan) {
            alatZona.current?.kosongkan();
            alatAkses.current?.kosongkan();
        }
    }, [props.alatLahan?.mode, props.alatLahan?.kunci]);

    // Zona: tampil hanya bila lahan sudah punya hasil; pegangan zona pengguna tetap di tempat yang ditarik.
    useEffect(() => {
        const z = alatZona.current;
        if (!z) return;
        z.setTeks(teksZona());
        if (!props.alatLahan || !props.zonaLahan) z.kosongkan();
        else z.tampilkan(props.zonaLahan, props.zonaManual ?? null);
    }, [props.zonaLahan, props.zonaManual, props.alatLahan, props.bahasa]);

    useEffect(() => {
        if (props.tambahZona && alat.current) alatZona.current?.tambah(props.tambahZona.jenis, alat.current.titikSekarang(), props.tambahZona.geometri);
    }, [props.tambahZona?.kunci]);

    // Gerbang & pintu: tampil bila lahan sudah punya hasil; posisi dari server (sudah menempel tepi) bila ada.
    useEffect(() => {
        const a = alatAkses.current;
        if (!a) return;
        a.setTeks(teksAkses());
        a.setLebarBawaan(props.lebarGerbang ?? 6);
        if (!props.alatLahan || !props.zonaLahan) a.kosongkan();
        else a.tampilkan(props.akses ?? [], props.aksesServer, alat.current?.titikSekarang() ?? [], cincinGedung());
    }, [props.akses, props.aksesServer, props.zonaLahan, props.alatLahan, props.bahasa, props.lebarGerbang]);

    useEffect(() => {
        if (props.tambahAkses && alat.current) alatAkses.current?.tambah(props.tambahAkses.jenis, alat.current.titikSekarang(), cincinGedung());
    }, [props.tambahAkses?.kunci]);

    useEffect(() => {
        if (props.selesaiLahan) alat.current?.selesai();
    }, [props.selesaiLahan]);

    useEffect(() => {
        if (props.pulihLahan) alat.current?.pulihkan(props.pulihLahan.geom);
    }, [props.pulihLahan?.kunci]);

    // Panel layer: kunci lahan, sorot zona terpilih, sembunyikan isi hasil.
    useEffect(() => {
        alat.current?.kunci(!!props.kunciLahan);
    }, [props.kunciLahan, props.alatLahan?.kunci]);

    useEffect(() => {
        alatZona.current?.sorot(props.zonaDipilih ?? null);
    }, [props.zonaDipilih]);

    const kunciSembunyi = `${(props.isiSembunyi ?? []).join(',')}|${(props.zonaSembunyi ?? []).join(',')}`;
    useEffect(() => {
        lapisan.current?.setSembunyi(props.isiSembunyi ?? [], props.zonaSembunyi ?? []);
    }, [kunciSembunyi, props.kapasitasLahan]);

    useEffect(() => {
        const l = lapisan.current;
        if (!l) return;
        l.setLabel(labelIsi);
        l.perbarui(props.kapasitasLahan);
        // Hasil baru sudah memuat zona terbaru: lepas penyamaran per zona, kecuali zona masih ditarik.
        if (!alatZona.current?.ditarik) l.saringZona(null);
    }, [props.kapasitasLahan, props.bahasa]);

    return <div ref={wadah} data-tur="peta" className={props.className} role="region" aria-label="Peta Jabodetabek, klik untuk melihat detail lokasi" />;
}

const IKON_TOL = L.icon({ iconUrl: '/images/peta/tol.png', iconSize: [15, 19], className: 'nr-rambu' });
const IKON_HALTE = L.icon({ iconUrl: '/images/peta/halte.png', iconSize: [14, 18], className: 'nr-rambu' });
const IKON_BRT = L.icon({ iconUrl: '/images/peta/halte-brt.png', iconSize: [16, 20], className: 'nr-rambu' });

function grupDiLayar(fitur: Feature[], minZoom: number, buat: (f: Feature, ll: L.LatLng) => L.Marker, popup: (f: Feature, l: L.Layer) => void): L.LayerGroup {
    const g = L.layerGroup();
    const titik = fitur
        .filter((f) => f.geometry?.type === 'Point')
        .map((f) => ({ f, ll: L.latLng((f.geometry as Point).coordinates[1], (f.geometry as Point).coordinates[0]) }));
    let peta: L.Map | null = null;
    const atur = () => {
        if (!peta) return;
        g.clearLayers();
        if (peta.getZoom() < minZoom) return;
        const b = peta.getBounds().pad(0.3);
        for (const { f, ll } of titik) {
            if (!b.contains(ll)) continue;
            const m = buat(f, ll);
            popup(f, m);
            g.addLayer(m);
        }
    };
    g.on('add', (e) => {
        peta = (e.target as unknown as { _map: L.Map })._map;
        peta.on('moveend', atur);
        atur();
    });
    g.on('remove', () => {
        peta?.off('moveend', atur);
        peta = null;
    });
    return g;
}

function grupZoom(isi: L.Layer, minZoom: number): L.LayerGroup {
    const g = L.layerGroup();
    let peta: L.Map | null = null;
    const atur = () => {
        if (!peta) return;
        if (peta.getZoom() >= minZoom) {
            if (!g.hasLayer(isi)) g.addLayer(isi);
        } else g.removeLayer(isi);
    };
    g.on('add', (e) => {
        peta = (e.target as unknown as { _map: L.Map })._map;
        peta.on('zoomend', atur);
        atur();
    });
    g.on('remove', () => {
        peta?.off('remove', atur);
        peta = null;
    });
    return g;
}

/** Popup kartu PopupPeta (8.16); klik saat mode rute diteruskan ke peta. */
function pasangPopup(l: L.Layer, isi: IsiPopup, lebarMaks: number): void {
    (l as L.Path).bindPopup(() => popupHtml(...isi), {
        autoPan: false,
        closeButton: true,
        autoPanPaddingTopLeft: ponsel() ? L.point(16, 120) : PADDING_KIRI,
        autoPanPaddingBottomRight: ponsel() ? L.point(16, 90) : L.point(414, 90),
        minWidth: 240,
        maxWidth: lebarMaks,
        className: 'nr-popup-leaflet',
    });
    const path = l as L.Path & { _openPopup: L.LeafletEventHandlerFn };
    path.off('click', path._openPopup, path);
    path.on('click', (e: L.LeafletMouseEvent) => {
        if (modeRuteAktif) {
            // Path meneruskan klik ke peta sendiri; marker tidak, jadi diteruskan manual.
            if (l instanceof L.Marker) (l as L.Marker & { _map?: L.Map })._map?.fire('click', e);
            return;
        }
        L.DomEvent.stop(e);
        path.openPopup(e.latlng);
    });
}

function gambarLayer(k: LayerKey, fc: FeatureCollection, tahun: number): L.LayerGroup {
    const g = L.layerGroup();
    const kanvas = L.canvas({ pane: 'nrTitik', padding: 0.3 });
    const diKanvas = { renderer: L.canvas({ pane: 'nrPoligon', padding: 0.3 }) } as L.GeoJSONOptions;
    
    const popup = (f: Feature, l: L.Layer) => pasangPopup(l, isiPopupUmum((f.properties ?? {}) as Record<string, any>), 300);

    if (k === 'historis_risiko') {
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            ...diKanvas,
            style: (f) => (f?.properties?.jenis === 'genangan' ? gaya.genangan : gaya.banjirTingkat(Number(f?.properties?.tingkat))),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'kualitas_udara') {
        // Kualitas Udara (T-057): poligon kelurahan berwarna menurut kelas PM2.5 relatif.
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            ...diKanvas,
            style: (f) => gaya.udaraKelas(f?.properties?.kategori),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'ekosistem') {
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            ...diKanvas,
            filter: (f) => f.properties?.jenis === 'rth',
            style: gaya.rth,
            onEachFeature: popup,
        }).addTo(g);
        grupZoom(
            L.geoJSON(fc, {
                pane: 'nrTitik',
                filter: (f) => f.properties?.jenis === 'poi',
                pointToLayer: (f, ll) => L.circleMarker(ll, {
                    pane: 'nrTitik',
                    renderer: kanvas,
                    radius: 5,
                    color: '#fff',
                    weight: 2,
                    fillColor: warnaEkosistem(f),
                    fillOpacity: 0.9,
                }),
                onEachFeature: popup,
            }),
            14,
        ).addTo(g);
    } else if (k === 'inklusivitas') {
        L.geoJSON(fc, {
            pane: 'nrGaris',
            filter: (f) => f.properties?.jenis === 'trotoar',
            style: gaya.trotoar,
            onEachFeature: popup,
        }).addTo(g);
        grupZoom(
            L.geoJSON(fc, {
                pane: 'nrTitik',
                filter: (f) => f.properties?.jenis === 'akses',
                pointToLayer: (_f, ll) => L.circleMarker(ll, { pane: 'nrTitik', renderer: kanvas, radius: 5, color: '#fff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1 }),
                onEachFeature: popup,
            }),
            13,
        ).addTo(g);
    } else if (k === 'mobilitas') {
        grupZoom(
            L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'ganjil_genap') } as FeatureCollection, {
                pane: 'nrPoligon',
                ...diKanvas,
                style: { color: '#9f1239', weight: 1, opacity: 0.7, fillColor: '#9f1239', fillOpacity: 0.45 },
                onEachFeature: popup,
            }),
            13,
        ).addTo(g);
        L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'brt') } as FeatureCollection, {
            pane: 'nrGaris',
            ...diKanvas,
            style: (f) => ({ color: f?.properties?.warna ?? '#0f1b3d', weight: 3, opacity: 0.85 }),
            onEachFeature: popup,
        } as L.GeoJSONOptions).addTo(g);
        // Bus kota Bodetabek (T-046): rute eksisting tak putus, warna per operator.
        L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'bus') } as FeatureCollection, {
            pane: 'nrGaris',
            ...diKanvas,
            style: (f) => ({ color: f?.properties?.warna ?? '#0d9488', weight: 3, opacity: 0.85 }),
            onEachFeature: popup,
        } as L.GeoJSONOptions).addTo(g);
        // Semua rute eksisting (KRL, MRT, LRT) digambar tak putus; garis putus-putus hanya untuk proyek masa depan (T-059).
        const garis = fc.features.filter((f) => ['krl', 'mrt', 'lrt'].includes(f.properties?.jenis));
        L.geoJSON({ type: 'FeatureCollection', features: garis } as FeatureCollection, { pane: 'nrGaris', style: gaya.casing, interactive: false }).addTo(g);
        L.geoJSON({ type: 'FeatureCollection', features: garis } as FeatureCollection, {
            pane: 'nrGaris',
            style: (f) => {
                const j = f?.properties?.jenis;
                if (j === 'mrt') return { color: gaya.warna.mrt(), weight: 5, opacity: 1 };
                if (j === 'lrt') return { color: gaya.warna.lrtLin(f?.properties?.lin ?? ''), weight: 5, opacity: 1 };
                return { color: gaya.warna.krl(f?.properties?.lin ?? 'lain'), weight: 4, opacity: 1 };
            },
            onEachFeature: popup,
        }).addTo(g);
        grupDiLayar(
            fc.features.filter((f) => f.properties?.jenis === 'halte'),
            15,
            (f, ll) => L.marker(ll, { pane: 'nrTitik', icon: f.properties?.brt ? IKON_BRT : IKON_HALTE }),
            popup,
        ).addTo(g);
        grupZoom(
            L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'tol') } as FeatureCollection, {
                pane: 'nrTitik',
                pointToLayer: (_f, ll) => L.marker(ll, { pane: 'nrTitik', icon: IKON_TOL }),
                onEachFeature: popup,
            }),
            13,
        ).addTo(g);
        L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'stasiun') } as FeatureCollection, {
            pane: 'nrStasiun',
            pointToLayer: (f, ll) =>
                L.circleMarker(ll, { pane: 'nrStasiun', radius: 6, color: '#0f1b3d', weight: 2.5, fillColor: '#fbf9f6', fillOpacity: 1 }).bindTooltip(String(f.properties?.nama ?? ''), {
                    permanent: true,
                    direction: 'top',
                    offset: [0, -8],
                    className: 'nr-maplabel nr-label-stasiun',
                }),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'mesin_waktu') {
        L.geoJSON(fc, {
            pane: 'nrGaris',
            filter: (f) => !f.properties?.tahun || f.properties.tahun <= tahun,
            style: (f) => gaya.mesinWaktu(f?.properties),
            // Stasiun rencana JUTPI3: lingkaran putih bertepi warna proyek, nama saat disorot.
            pointToLayer: (f, ll) =>
                L.circleMarker(ll, { pane: 'nrStasiun', radius: 5, color: gaya.mesinWaktu(f.properties).color, weight: 2.5, fillColor: '#fbf9f6', fillOpacity: 1 }).bindTooltip(
                    String(f.properties?.nama ?? ''),
                    { direction: 'top', offset: [0, -6], className: 'nr-maplabel nr-label-stasiun' },
                ),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'rdtr') {
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            ...diKanvas,
            style: (f) => gaya.gayaRdtr(f?.properties?.NAMOBJ ?? f?.properties?.NAMZON_1 ?? f?.properties?.ZONA ?? f?.properties?.peruntukan),
            onEachFeature: (f, l) => pasangPopup(l, isiPopupRdtr((f.properties ?? {}) as Record<string, any>), 300),
        }).addTo(g);
    } else if (k === 'legalitas' || k === 'persil') {
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            ...diKanvas,
            style: gaya.gayaPersil ?? gaya.legal,
            onEachFeature: (f, l) => pasangPopup(l, isiPopupLegal((f.properties ?? {}) as Record<string, any>, f.id), 320),
        }).addTo(g);
    }
    return g;
}

export { BATAS_DATA };