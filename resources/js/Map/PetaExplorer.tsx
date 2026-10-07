/**
 * Peta Visual Explorer (UI01). Satu-satunya tempat yang menyentuh `L` (CLAUDE.md).
 * Basemap OSM standar; layer dari /api/layers; seleksi, Top 3, dan rute mengikuti kartografi design-system.md bagian 9.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson';
import type { CommuteResponse, HasilSearch, LayerKey } from '@/types';
import { bahasaAktif, pilihTeks, type Bahasa } from '@/lib/bahasa';
import * as gaya from './gaya';

export type TitikPeta = { lat: number; lng: number };

type Props = {
    layer: Partial<Record<LayerKey, FeatureCollection>>;
    tahun: number;
    top3: HasilSearch[] | null;
    top3Aktif: number | null;
    wilayahTerpilih: Geometry | null;
    pin: TitikPeta | null;
    rute: CommuteResponse | null;
    ruteA: TitikPeta | null;
    ruteB: TitikPeta | null;
    moda: 'mobil' | 'transit';
    modeRute: boolean;
    bahasa: Bahasa;
    terbangKe: { geometri?: Geometry; titik?: TitikPeta; kunci: number } | null;
    onKlikPeta: (t: TitikPeta) => void;
    onLihatDetail: (t: TitikPeta) => void;
    onPilihTop3: (i: number) => void;
    className?: string;
};

/** Diperbarui dari props; dibaca handler klik fitur yang dibuat di luar komponen. */
let modeRuteAktif = false;

const PUSAT: L.LatLngExpression = [-6.43, 106.81];
const BATAS_DATA = L.latLngBounds([-6.56, 106.7], [-6.28, 106.92]);
/** Padding agar konten tidak tertutup kolom kiri (392 px) dan panel kanan (design-system.md bagian 5). */
const PADDING_KIRI = L.point(392, 80);
const PADDING_KANAN = L.point(80, 90);
/** Layar ponsel: panel kiri jadi lembar bawah (±55% tinggi layar), lihat aplikasi.css. */
const ponsel = () => window.innerWidth < 768;
function padding(): { paddingTopLeft: L.Point; paddingBottomRight: L.Point } {
    return ponsel()
        ? { paddingTopLeft: L.point(16, 120), paddingBottomRight: L.point(16, Math.round(window.innerHeight * 0.55) + 16) }
        : { paddingTopLeft: PADDING_KIRI, paddingBottomRight: PADDING_KANAN };
}

function esc(s: unknown): string {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Teks peta mengikuti bahasa aktif saat dibuat (popup dibuat ulang setiap dibuka). */
const tr = (id: string, en: string) => pilihTeks(bahasaAktif(), id, en);

function popupHtml(jenis: string, judul: string, isi: string, sumber: string): string {
    return `<div class="nr-popup" role="dialog" aria-label="${esc(judul)}">
        <div class="nr-popup__top"><div><div class="nr-eyebrow">${esc(jenis)}</div><h3 class="nr-popup__title">${esc(judul)}</h3></div></div>
        <p class="nr-popup__body">${esc(isi)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
            <span class="nr-popup__src">${esc(sumber)}</span>
            <button type="button" class="nr-linkcaps" data-detail>${esc(tr('Lihat detail', 'View details'))}
                <svg class="nr-svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
        </div></div>`;
}

const JENIS_LABEL: Record<string, [string, string]> = {
    banjir: ['Bahaya banjir', 'Flood hazard'], rth: ['Ruang terbuka hijau', 'Green open space'], poi: ['Kafe & restoran', 'Cafés & restaurants'],
    akses: ['Akses disabilitas', 'Disability access'], trotoar: ['Trotoar', 'Sidewalk'], krl: ['Jalur KRL', 'KRL line'], mrt: ['Jalur MRT', 'MRT line'],
    lrt: ['Jalur LRT', 'LRT line'], stasiun: ['Stasiun', 'Station'], halte: ['Halte', 'Bus stop'], tol: ['Gerbang tol', 'Toll gate'],
    proyek: ['Proyek infrastruktur', 'Infrastructure project'], legal: ['Bidang lahan', 'Land parcel'],
};

/** Kosakata atribut data contoh (data/geojson/demo) yang tampil di popup. */
const ISTILAH_EN: Record<string, string> = {
    Kafe: 'Café', Restoran: 'Restaurant', 'Makanan cepat saji': 'Fast food', Mal: 'Mall', rendah: 'low', sedang: 'medium', tinggi: 'high',
    'Dalam pembangunan': 'Under construction', 'SHGB dalam proses': 'SHGB in process', Permukiman: 'Residential', permukiman: 'residential',
};
const istilah = (v: unknown) => (bahasaAktif() === 'en' ? (ISTILAH_EN[String(v)] ?? String(v)) : String(v));

function labelJenis(jenis: string): string {
    const l = JENIS_LABEL[jenis];
    return l ? tr(l[0], l[1]) : tr('Fitur', 'Feature');
}

function deskripsi(p: Record<string, any>): string {
    switch (p.jenis) {
        case 'banjir': return tr(`Indeks bahaya banjir kelas ${p.kelas ?? '—'} menurut kajian InaRISK.`, `Flood hazard index: ${istilah(p.kelas ?? '—')} class, per the InaRISK assessment.`);
        case 'rth': return (p.nama ? `${p.nama}. ` : '') + tr('Ruang terbuka hijau publik.', 'Public green open space.');
        case 'poi': return p.kategori ? `${istilah(p.kategori)}.` : tr('Tempat makan dan nongkrong.', 'A place to eat and hang out.');
        case 'stasiun': return `${p.moda ? String(p.moda).toUpperCase() : tr('Stasiun', 'Station')}${p.lin ? ` · ${tr('Lin', 'Line')} ${p.lin}` : ''}.`;
        case 'krl': case 'mrt': case 'lrt': return p.nama ?? tr('Jalur kereta.', 'Railway line.');
        case 'proyek': return `${p.status ? istilah(p.status) : tr('Proyek', 'Project')}${p.tahun ? `, target ${p.tahun}` : ''}.`;
        case 'legal': return tr(`Status contoh: ${p.status ?? '—'}. Peruntukan: ${p.peruntukan ?? 'permukiman'}.`, `Sample status: ${istilah(p.status ?? '—')}. Land use: ${istilah(p.peruntukan ?? 'permukiman')}.`);
        case 'akses': return tr('Fasilitas ditandai ramah kursi roda.', 'Facility marked as wheelchair-friendly.');
        default: return p.nama ?? '';
    }
}

/** Panah arah sepanjang garis, tiap ±600 m (design-system.md 9.3). */
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
    const panggil = useRef(props);
    panggil.current = props;
    modeRuteAktif = props.modeRute;

    // Inisialisasi peta sekali.
    useEffect(() => {
        if (!wadah.current) return;
        const m = L.map(wadah.current, { zoomControl: false, minZoom: 9, maxZoom: 19, preferCanvas: false }).setView(PUSAT, 13);
        L.control.zoom({ position: 'bottomright', zoomInTitle: tr('Perbesar peta', 'Zoom in'), zoomOutTitle: tr('Perkecil peta', 'Zoom out') }).addTo(m);
        m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(m);
        m.createPane('nrPoligon').style.zIndex = '410';
        m.createPane('nrGaris').style.zIndex = '420';
        m.createPane('nrTitik').style.zIndex = '430';
        m.createPane('nrStasiun').style.zIndex = '440';
        m.createPane('nrSeleksi').style.zIndex = '450';
        m.createPane('nrRute').style.zIndex = '460';
        grupSeleksi.current = L.layerGroup().addTo(m);
        grupRute.current = L.layerGroup().addTo(m);

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
            m.remove();
            peta.current = null;
        };
    }, []);

    // Bahasa: judul tombol zoom. Popup tidak perlu digambar ulang karena isinya dibuat saat dibuka.
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

    // Layer data.
    useEffect(() => {
        const m = peta.current;
        if (!m) return;
        for (const [k, grup] of Object.entries(grupLayer.current)) {
            if (!props.layer[k as LayerKey]) {
                grup?.remove();
                delete grupLayer.current[k as LayerKey];
            }
        }
        for (const [k, fc] of Object.entries(props.layer) as [LayerKey, FeatureCollection][]) {
            if (!fc || grupLayer.current[k]) continue;
            grupLayer.current[k] = gambarLayer(k, fc, props.tahun).addTo(m);
        }
    }, [props.layer]);

    // Filter tahun Mesin Waktu (FR-04): gambar ulang layer itu.
    useEffect(() => {
        const m = peta.current;
        const fc = props.layer.mesin_waktu;
        if (!m || !fc) return;
        grupLayer.current.mesin_waktu?.remove();
        grupLayer.current.mesin_waktu = gambarLayer('mesin_waktu', fc, props.tahun).addTo(m);
    }, [props.tahun]);

    // Seleksi: Top 3, wilayah terpilih, pin titik.
    useEffect(() => {
        const g = grupSeleksi.current;
        if (!g) return;
        g.clearLayers();
        props.top3?.forEach((r, i) => {
            const aktif = props.top3Aktif === i;
            L.geoJSON(r.geometri as Geometry, { pane: 'nrSeleksi', style: { ...gaya.top3, weight: aktif ? 3.5 : 2.5, fillOpacity: aktif ? 0.14 : 0.08 } })
                .on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    panggil.current.onPilihTop3(i);
                })
                .addTo(g);
            L.marker([r.pusat.lat, r.pusat.lng], {
                pane: 'nrSeleksi',
                icon: L.divIcon({ className: '', html: `<span class="nr-peringkat">${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
            })
                .on('click', () => panggil.current.onPilihTop3(i))
                .addTo(g);
        });
        if (props.wilayahTerpilih) {
            L.geoJSON(props.wilayahTerpilih, { pane: 'nrSeleksi', style: gaya.terpilih, interactive: false }).addTo(g);
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
    }, [props.top3, props.top3Aktif, props.wilayahTerpilih, props.pin]);

    // Rute Simulator (9.3): mengikuti jalan dan rel, berpanah, A isi navy, B putih.
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
            L.geoJSON(r.publik.geometri.rel, { pane: 'nrRute', interactive: false, style: { color: gaya.warna.krl('bogor'), weight: tebal, opacity: kuat ? 1 : 0.4 } }).addTo(grup);
            r.publik.geometri.jalan_kaki.forEach((w) => L.geoJSON(w, { pane: 'nrRute', interactive: false, style: { ...gaya.ruteJalanKaki, opacity: kuat ? 1 : 0.4 } }).addTo(grup));
            r.publik.stasiun.forEach((s) =>
                L.circleMarker([s.lat, s.lng], { pane: 'nrRute', radius: 6, color: '#0f1b3d', weight: 2.5, fillColor: '#fbf9f6', fillOpacity: 1, opacity: kuat ? 1 : 0.5 })
                    .bindTooltip(s.nama, { permanent: kuat, direction: 'top', offset: [0, -8], className: 'nr-maplabel' })
                    .addTo(grup),
            );
            if (kuat) panahArah((r.publik.geometri.rel as LineString).coordinates as [number, number][]).forEach((p) => p.addTo(grup));
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
            if (b.isValid()) m.flyToBounds(b, { ...padding(), duration: 1 });
        }
    }, [props.rute, props.moda, props.ruteA, props.ruteB]);

    // Fly-to (FR-07).
    useEffect(() => {
        const m = peta.current;
        const t = props.terbangKe;
        if (!m || !t) return;
        const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (t.geometri) {
            const b = L.geoJSON(t.geometri).getBounds();
            if (b.isValid()) {
                const opsi = { ...padding(), maxZoom: 16 };
                kurangiGerak ? m.fitBounds(b, opsi) : m.flyToBounds(b, { ...opsi, duration: 1.2 });
            }
        } else if (t.titik) {
            // Titik ditaruh di tengah area peta yang tidak tertutup panel.
            const b = L.latLng(t.titik.lat, t.titik.lng).toBounds(1);
            const opsi = { ...padding(), maxZoom: Math.max(m.getZoom(), 15) };
            kurangiGerak ? m.fitBounds(b, opsi) : m.flyToBounds(b, { ...opsi, duration: 1.2 });
        }
    }, [props.terbangKe?.kunci]);

    return <div ref={wadah} className={props.className} role="region" aria-label="Peta Jabodetabek, klik untuk melihat detail lokasi" />;
}

/** Gambar satu layer sesuai kartografi. Mesin Waktu difilter tahun (FR-04). */
function gambarLayer(k: LayerKey, fc: FeatureCollection, tahun: number): L.LayerGroup {
    const g = L.layerGroup();
    const popup = (f: Feature, l: L.Layer) => {
        const p = (f.properties ?? {}) as Record<string, any>;
        (l as L.Path).bindPopup(() => popupHtml(labelJenis(p.jenis), p.nama ?? labelJenis(p.jenis), deskripsi(p), `${tr('Sumber', 'Source')}: ${p.sumber ?? 'OSM'}`), {
            closeButton: true,
            autoPanPaddingTopLeft: ponsel() ? L.point(16, 120) : PADDING_KIRI,
            autoPanPaddingBottomRight: ponsel() ? L.point(16, 90) : L.point(414, 90),
            minWidth: 240,
            maxWidth: 300,
            className: 'nr-popup-leaflet',
        });
        // Saat memilih titik rute, klik fitur diteruskan ke peta alih-alih membuka popup.
        const path = l as L.Path & { _openPopup: L.LeafletEventHandlerFn };
        path.off('click', path._openPopup, path);
        path.on('click', (e: L.LeafletMouseEvent) => {
            if (modeRuteAktif) return;
            L.DomEvent.stop(e);
            path.openPopup(e.latlng);
        });
    };

    if (k === 'historis_risiko') {
        L.geoJSON(fc, { pane: 'nrPoligon', style: (f) => gaya.banjir(f?.properties?.kelas), onEachFeature: popup }).addTo(g);
    } else if (k === 'ekosistem') {
        L.geoJSON(fc, {
            pane: 'nrPoligon',
            filter: (f) => f.properties?.jenis === 'rth',
            style: gaya.rth,
            onEachFeature: popup,
        }).addTo(g);
        L.geoJSON(fc, {
            pane: 'nrTitik',
            filter: (f) => f.properties?.jenis === 'poi',
            pointToLayer: (_f, ll) => L.circleMarker(ll, { pane: 'nrTitik', radius: 5, color: '#fff', weight: 2, fillColor: '#22c55e', fillOpacity: 0.8, className: 'nr-poi' }),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'inklusivitas') {
        L.geoJSON(fc, {
            pane: 'nrGaris',
            filter: (f) => f.properties?.jenis === 'trotoar',
            style: gaya.trotoar,
            onEachFeature: popup,
        }).addTo(g);
        L.geoJSON(fc, {
            pane: 'nrTitik',
            filter: (f) => f.properties?.jenis === 'akses',
            pointToLayer: (_f, ll) => L.circleMarker(ll, { pane: 'nrTitik', radius: 5, color: '#fff', weight: 2, fillColor: '#0ea5e9', fillOpacity: 1 }),
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'mobilitas') {
        const garis = fc.features.filter((f) => ['krl', 'mrt', 'lrt'].includes(f.properties?.jenis));
        L.geoJSON({ type: 'FeatureCollection', features: garis } as FeatureCollection, { pane: 'nrGaris', style: gaya.casing, interactive: false }).addTo(g);
        L.geoJSON({ type: 'FeatureCollection', features: garis } as FeatureCollection, {
            pane: 'nrGaris',
            style: (f) => {
                const j = f?.properties?.jenis;
                if (j === 'mrt') return { color: gaya.warna.mrt(), weight: 5, opacity: 1 };
                if (j === 'lrt') return { color: gaya.warna.lrt(), weight: 5, opacity: 1 };
                return { color: gaya.warna.krl(f?.properties?.lin ?? 'lain'), weight: 4, opacity: 1, dashArray: '10 6' };
            },
            onEachFeature: popup,
        }).addTo(g);
        L.geoJSON({ type: 'FeatureCollection', features: fc.features.filter((f) => f.properties?.jenis === 'halte') } as FeatureCollection, {
            pane: 'nrTitik',
            pointToLayer: (_f, ll) => L.circleMarker(ll, { pane: 'nrTitik', radius: 3, color: '#fff', weight: 1.2, fillColor: '#0f1b3d', fillOpacity: 1, className: 'nr-halte' }),
            onEachFeature: popup,
        }).addTo(g);
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
            style: gaya.mesinWaktu,
            onEachFeature: popup,
        }).addTo(g);
    } else if (k === 'legalitas') {
        L.geoJSON(fc, { pane: 'nrPoligon', style: gaya.legal, onEachFeature: popup }).addTo(g);
    }
    return g;
}

export { BATAS_DATA };
