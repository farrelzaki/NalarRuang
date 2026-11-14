/**
 * Peta Visual Explorer (UI01) di atas MapLibre GL JS + OpenFreeMap, dengan mode kamera 2D, Miring, dan 3D.
 * Props dan perilaku sama dengan PetaExplorer (Leaflet); dipilih oleh PetaPilihan bila WebGL tersedia.
 *
 * Catatan skala: zoom MapLibre = zoom Leaflet − 1 (ubin 512 px), jadi ambang zoom di sini satu lebih kecil.
 * Urutan gambar dijaga dengan layer "slot" kosong: poligon < garis < titik < stasiun < seleksi < rute.
 */
import { useEffect, useRef, useState } from 'react';
import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString, Polygon, Position } from 'geojson';
import type { LayerKey } from '@/types';
import * as gaya from './gaya';
import { ATRIBUSI_DATA, isiPopup, lingkaranCincin, popupHtml, ponsel, tr, warnaEkosistem } from './isiPeta';
import { GAYA_PETA, muatMapLibre, type MapLibreGL } from './maplibre';
import type { ModeKamera, PropsPeta, TitikPeta } from './PetaExplorer';

type Props = PropsPeta & { onGagal?: (alasan: string) => void };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Apa = any;

const PUSAT: [number, number] = [106.81, -6.43];
const ZOOM_AWAL = 12;
const BATAS_PETA: [[number, number], [number, number]] = [[106.15, -6.85], [107.35, -5.85]];
const ZOOM_LEGALITAS = 13;

const SLOT = ['poligon', 'garis', 'titik', 'stasiun', 'seleksi', 'rute', 'atas'] as const;
type Slot = (typeof SLOT)[number];
const idSlot = (s: Slot) => `nr-slot-${s}`;
/** Layer ditaruh tepat di bawah slot berikutnya, sehingga berada di kelompok slot-nya. */
const sebelum = (s: Slot) => idSlot(SLOT[SLOT.indexOf(s) + 1] ?? 'atas');

/** Font label diambil dari gaya peta dasar, agar pasti tersedia di server glyph OpenFreeMap. */
let FONT: string[] = ['Noto Sans Regular'];

function fontDariGaya(m: Apa): string[] {
    const daftar: string[][] = [];
    for (const l of m.getStyle()?.layers ?? []) {
        const f = l?.layout?.['text-font'];
        if (Array.isArray(f) && f.every((x: unknown) => typeof x === 'string')) daftar.push(f as string[]);
    }
    return daftar.find((f) => f.some((x) => /bold/i.test(x))) ?? daftar[0] ?? FONT;
}
const NAVY = '#0f1b3d';

let modeRuteAktif = false;

function padding(): { top: number; bottom: number; left: number; right: number } {
    return ponsel()
        ? { top: 120, left: 16, right: 16, bottom: Math.round(window.innerHeight * 0.55) + 16 }
        : { top: 80, left: 392, right: 80, bottom: 90 };
}

const idSumber = (k: string) => `nr-src-${k}`;
const kunciDariSumber = (s: string) => s.replace(/^nr-src-/, '');

/* ---------------- Data: properti gaya dihitung sekali di JS ---------------- */

function denganProperti(fc: FeatureCollection, tambah: (f: Feature) => Record<string, unknown>): FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: fc.features
            .filter((f) => f.geometry)
            .map((f) => ({ ...f, properties: { ...(f.properties ?? {}), ...tambah(f) } })),
    };
}

function siapkanData(k: LayerKey, fc: FeatureCollection): FeatureCollection {
    const p = (f: Feature) => (f.properties ?? {}) as Record<string, any>;
    switch (k) {
        case 'historis_risiko':
            return denganProperti(fc, (f) => {
                const g = p(f).jenis === 'genangan' ? gaya.genangan : gaya.banjirTingkat(Number(p(f).tingkat));
                return { _warna: g.fillColor ?? g.color, _isi: g.fillOpacity ?? 0.3, _garis: g.opacity ?? 0.6, _tebal: g.weight ?? 0.5 };
            });
        case 'ekosistem':
            return denganProperti(fc, (f) => ({ _warna: warnaEkosistem(f) }));
        case 'mobilitas':
            return denganProperti(fc, (f) => {
                const j = p(f).jenis;
                if (j === 'mrt') return { _warna: gaya.warna.mrt() };
                if (j === 'lrt') return { _warna: gaya.warna.lrtLin(p(f).lin ?? '') };
                if (j === 'krl') return { _warna: gaya.warna.krl(p(f).lin ?? 'lain') };
                if (j === 'brt') return { _warna: p(f).warna ?? NAVY };
                return {};
            });
        case 'mesin_waktu':
            return denganProperti(fc, (f) => ({ _warna: gaya.mesinWaktu(p(f).moda).color }));
        case 'rdtr':
            return denganProperti(fc, (f) => ({ _warna: gaya.gayaRdtr(p(f).NAMOBJ ?? p(f).NAMZON_1 ?? p(f).ZONA ?? p(f).peruntukan).fillColor }));
        default:
            return denganProperti(fc, () => ({}));
    }
}

/* ---------------- Definisi layer per kunci ---------------- */

type DefLayer = { slot: Slot; interaktif: boolean; spec: Record<string, unknown> };

const jenis = (...j: string[]) => (j.length === 1 ? ['==', ['get', 'jenis'], j[0]] : ['in', ['get', 'jenis'], ['literal', j]]);
const poligon = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false];

function definisiLayer(k: LayerKey): DefLayer[] {
    const src = idSumber(k);
    const L = (id: string, slot: Slot, interaktif: boolean, spec: Record<string, unknown>): DefLayer => ({ slot, interaktif, spec: { id: `nr-${k}-${id}`, source: src, ...spec } });

    switch (k) {
        case 'historis_risiko':
            return [
                L('isi', 'poligon', true, { type: 'fill', filter: poligon, paint: { 'fill-color': ['get', '_warna'], 'fill-opacity': ['get', '_isi'] } }),
                L('tepi', 'poligon', false, { type: 'line', paint: { 'line-color': ['get', '_warna'], 'line-width': ['get', '_tebal'], 'line-opacity': ['get', '_garis'] } }),
            ];
        case 'ekosistem':
            return [
                L('rth', 'poligon', true, { type: 'fill', filter: ['all', jenis('rth'), poligon], paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.25 } }),
                L('rth-tepi', 'poligon', false, { type: 'line', filter: jenis('rth'), paint: { 'line-color': '#22c55e', 'line-width': 1, 'line-opacity': 0.9 } }),
                L('poi', 'titik', true, {
                    type: 'circle', minzoom: 13, filter: jenis('poi'),
                    paint: { 'circle-radius': 5, 'circle-color': ['get', '_warna'], 'circle-opacity': 0.9, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
                }),
            ];
        case 'inklusivitas':
            return [
                L('trotoar', 'garis', true, { type: 'line', filter: jenis('trotoar'), paint: { 'line-color': '#0ea5e9', 'line-width': 2, 'line-opacity': 0.9, 'line-dasharray': [2, 2] } }),
                L('akses', 'titik', true, {
                    type: 'circle', minzoom: 12, filter: jenis('akses'),
                    paint: { 'circle-radius': 5, 'circle-color': '#0ea5e9', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
                }),
            ];
        case 'mobilitas':
            return [
                L('gg', 'poligon', true, { type: 'fill', minzoom: 12, filter: ['all', jenis('ganjil_genap'), poligon], paint: { 'fill-color': '#9f1239', 'fill-opacity': 0.45 } }),
                L('gg-garis', 'poligon', true, { type: 'line', minzoom: 12, filter: jenis('ganjil_genap'), paint: { 'line-color': '#9f1239', 'line-width': 1, 'line-opacity': 0.7 } }),
                L('brt', 'garis', true, { type: 'line', filter: jenis('brt'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', '_warna'], 'line-width': 3, 'line-opacity': 0.85 } }),
                L('rel-casing', 'garis', false, { type: 'line', filter: jenis('krl', 'mrt', 'lrt'), layout: { 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 6 } }),
                L('rel', 'garis', true, { type: 'line', filter: jenis('mrt', 'lrt'), layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', '_warna'], 'line-width': 5 } }),
                L('krl', 'garis', true, { type: 'line', filter: jenis('krl'), layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', '_warna'], 'line-width': 4, 'line-dasharray': [2.5, 1.5] } }),
                L('halte', 'titik', true, {
                    type: 'symbol', minzoom: 14, filter: jenis('halte'),
                    layout: { 'icon-image': ['case', ['to-boolean', ['get', 'brt']], 'nr-halte-brt', 'nr-halte'], 'icon-allow-overlap': true, 'icon-ignore-placement': true },
                }),
                L('tol', 'titik', true, {
                    type: 'symbol', minzoom: 12, filter: jenis('tol'),
                    layout: { 'icon-image': 'nr-tol', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
                }),
                L('stasiun', 'stasiun', true, {
                    type: 'circle', filter: jenis('stasiun'),
                    paint: { 'circle-radius': 6, 'circle-color': '#fbf9f6', 'circle-stroke-color': NAVY, 'circle-stroke-width': 2.5 },
                }),
                L('stasiun-label', 'stasiun', false, {
                    type: 'symbol', minzoom: 12, filter: jenis('stasiun'),
                    layout: { 'text-field': ['get', 'nama'], 'text-font': FONT, 'text-size': 12, 'text-anchor': 'bottom', 'text-offset': [0, -0.9], 'text-padding': 2 },
                    paint: { 'text-color': NAVY, 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 },
                }),
            ];
        case 'mesin_waktu':
            return [
                L('proyek', 'garis', true, { type: 'line', filter: jenis('proyek'), paint: { 'line-color': ['get', '_warna'], 'line-width': 5, 'line-dasharray': [2, 1.6] } }),
                L('stasiun', 'stasiun', true, {
                    type: 'circle', minzoom: 10, filter: jenis('stasiun_rencana'),
                    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6], 'circle-color': '#fbf9f6', 'circle-stroke-color': ['get', '_warna'], 'circle-stroke-width': 2.5 },
                }),
                L('stasiun-label', 'stasiun', false, {
                    type: 'symbol', minzoom: 13, filter: jenis('stasiun_rencana'),
                    layout: { 'text-field': ['get', 'nama'], 'text-font': FONT, 'text-size': 11, 'text-anchor': 'bottom', 'text-offset': [0, -0.9], 'text-padding': 2 },
                    paint: { 'text-color': ['get', '_warna'], 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 },
                }),
            ];
        case 'rdtr':
            return [
                L('isi', 'poligon', true, { type: 'fill', filter: poligon, paint: { 'fill-color': ['get', '_warna'], 'fill-opacity': 0.45 } }),
                L('tepi', 'poligon', false, { type: 'line', paint: { 'line-color': '#475569', 'line-width': 1, 'line-opacity': 0.8 } }),
            ];
        case 'legalitas':
        case 'persil':
            return [
                L('isi', 'poligon', true, { type: 'fill', filter: poligon, paint: { 'fill-color': '#8b5cf6', 'fill-opacity': 0.35 } }),
                L('tepi', 'poligon', false, { type: 'line', paint: { 'line-color': '#6d28d9', 'line-width': 1.2, 'line-opacity': 0.85 } }),
            ];
        default:
            return [];
    }
}

const filterTahun = (tahun: number) => ['<=', ['coalesce', ['to-number', ['get', 'tahun']], 0], tahun];
/** Filter tahun slider digabung dengan filter jenis bawaan layer Mesin Waktu (garis atau stasiun). */
const denganTahun = (dasar: unknown, tahun: number) => (dasar ? ['all', dasar, filterTahun(tahun)] : filterTahun(tahun));

/* ---------------- Geometri bantu ---------------- */

function luasBertanda(cincin: Position[]): number {
    let s = 0;
    for (let i = 0; i < cincin.length - 1; i++) s += cincin[i][0] * cincin[i + 1][1] - cincin[i + 1][0] * cincin[i][1];
    return s / 2;
}

/** Poligon redup selebar Jabodetabek+ dengan lubang di wilayah Top 3 (arah lubang dibalik dari cincin luar). */
function topengRedup(geometri: Geometry[]): Feature<Polygon> {
    const luar: Position[] = [[105.4, -7.6], [108.2, -7.6], [108.2, -5.4], [105.4, -5.4], [105.4, -7.6]];
    const arahLuar = Math.sign(luasBertanda(luar));
    const lubang: Position[][] = [];
    const tambah = (c: Position[]) => lubang.push(Math.sign(luasBertanda(c)) === arahLuar ? [...c].reverse() : c);
    for (const g of geometri) {
        if (g.type === 'Polygon') tambah(g.coordinates[0]);
        else if (g.type === 'MultiPolygon') g.coordinates.forEach((p) => tambah(p[0]));
    }
    return { type: 'Feature', properties: { peran: 'topeng' }, geometry: { type: 'Polygon', coordinates: [luar, ...lubang] } };
}

function kumpulkanKoordinat(g: Geometry, keluar: Position[]): void {
    switch (g.type) {
        case 'Point': keluar.push(g.coordinates); break;
        case 'MultiPoint': case 'LineString': g.coordinates.forEach((c) => keluar.push(c)); break;
        case 'MultiLineString': case 'Polygon': g.coordinates.forEach((r) => r.forEach((c) => keluar.push(c))); break;
        case 'MultiPolygon': g.coordinates.forEach((p) => p.forEach((r) => r.forEach((c) => keluar.push(c)))); break;
        case 'GeometryCollection': g.geometries.forEach((x) => kumpulkanKoordinat(x, keluar)); break;
    }
}

function kotakBatas(koordinat: Position[]): [[number, number], [number, number]] | null {
    if (!koordinat.length) return null;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of koordinat) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return Number.isFinite(x0) ? [[x0, y0], [x1, y1]] : null;
}

/* ---------------- Ikon ---------------- */

const IKON: { id: string; url: string; tinggi: number }[] = [
    { id: 'nr-tol', url: '/images/peta/tol.png', tinggi: 19 },
    { id: 'nr-halte', url: '/images/peta/halte.png', tinggi: 18 },
    { id: 'nr-halte-brt', url: '/images/peta/halte-brt.png', tinggi: 20 },
];

function muatIkon(m: Apa): Promise<void> {
    const satu = (i: (typeof IKON)[number]) =>
        Promise.resolve(m.loadImage(i.url))
            .then((r: Apa) => {
                const img = r?.data ?? r;
                if (img && !m.hasImage(i.id)) m.addImage(i.id, img, { pixelRatio: Math.max(1, img.height / i.tinggi) });
            })
            .catch((e: unknown) => console.warn(`[NalarRuang] Ikon ${i.url} gagal dimuat:`, e));
    return Promise.all(IKON.map(satu)).then(() => tambahPanah(m));
}

/** Panah arah rute: chevron putih 24 px (tampil 12 px), menghadap ke kanan = arah garis. */
function tambahPanah(m: Apa): void {
    if (m.hasImage('nr-panah')) return;
    const s = 24;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const g = c.getContext('2d');
    if (!g) return;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(5, 5);
    g.lineTo(15, 12);
    g.lineTo(5, 19);
    g.stroke();
    m.addImage('nr-panah', g.getImageData(0, 0, s, s), { pixelRatio: 2 });
}

/* ---------------- Penanda HTML ---------------- */

function elemen(html: string): HTMLElement {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLElement;
}

const PIN_SVG = '<svg width="30" height="38" viewBox="-15 -36 30 38"><path d="M0 0 C-3.5 -8 -13 -14 -13 -23 A13 13 0 1 1 13 -23 C13 -14 3.5 -8 0 0Z" fill="#0f1b3d" stroke="#fff" stroke-width="2"/><circle cy="-23" r="4.5" fill="#fff"/></svg>';

/* ---------------- Mode kamera: 2D, Miring, 3D ---------------- */

const DEM_TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/** Gedung 3D dari layer `building` tile OpenMapTiles (OpenFreeMap) dan medan dari AWS Terrarium. */
function pasang3D(m: Apa): void {
    const sumberVektor = Object.entries(m.getStyle()?.sources ?? {}).find(([, v]: [string, Apa]) => v?.type === 'vector')?.[0];
    if (sumberVektor && !m.getLayer('nr-gedung')) {
        m.addLayer(
            {
                id: 'nr-gedung',
                type: 'fill-extrusion',
                source: sumberVektor,
                'source-layer': 'building',
                minzoom: 13,
                layout: { visibility: 'none' },
                paint: {
                    'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#e7e3dc', 40, '#d6d0c6', 150, '#bdb5a8'],
                    'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['coalesce', ['get', 'render_height'], 6]],
                    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                    'fill-extrusion-opacity': 0.85,
                },
            },
            idSlot('poligon'),
        );
    }
    if (!m.getSource('nr-dem')) {
        m.addSource('nr-dem', { type: 'raster-dem', tiles: [DEM_TERRARIUM], tileSize: 256, maxzoom: 14, encoding: 'terrarium', attribution: 'Terrain Tiles: Mapzen, AWS' });
    }
}

function terapkanKamera(m: Apa, mode: ModeKamera, animasi: boolean): void {
    const miring = mode !== 'atas';
    for (const h of [m.dragRotate, m.touchPitch]) (miring ? h?.enable : h?.disable)?.call(h);
    if (miring) {
        m.touchZoomRotate?.enableRotation?.();
        m.keyboard?.enableRotation?.();
    } else {
        m.touchZoomRotate?.disableRotation?.();
        m.keyboard?.disableRotation?.();
    }
    if (m.getLayer('nr-gedung')) m.setLayoutProperty('nr-gedung', 'visibility', mode === '3d' ? 'visible' : 'none');
    m.setTerrain(mode === '3d' && m.getSource('nr-dem') ? { source: 'nr-dem', exaggeration: 1.5 } : null);
    const tujuan = mode === 'atas' ? { pitch: 0, bearing: 0 } : { pitch: mode === '3d' ? 60 : 50, bearing: m.getBearing() || -17 };
    if (animasi) m.easeTo({ ...tujuan, duration: 800 });
    else m.jumpTo(tujuan);
}

/* ---------------- Komponen ---------------- */

export default function PetaMapLibre(props: Props) {
    const wadah = useRef<HTMLDivElement>(null);
    const peta = useRef<Apa>(null);
    const mb = useRef<MapLibreGL>(null);
    const [siap, setSiap] = useState(false);
    const tergambar = useRef<Partial<Record<LayerKey, FeatureCollection>>>({});
    const idInteraktif = useRef<Set<string>>(new Set());
    const penandaSeleksi = useRef<Apa[]>([]);
    const penandaRute = useRef<Apa[]>([]);
    const popup = useRef<Apa>(null);
    const panggil = useRef(props);
    panggil.current = props;
    modeRuteAktif = props.modeRute;

    // Inisialisasi peta.
    useEffect(() => {
        let batal = false;
        let m: Apa = null;
        muatMapLibre()
            .then((maplibregl) => {
                if (batal || !wadah.current) return;
                mb.current = maplibregl;
                m = new maplibregl.Map({
                    container: wadah.current,
                    style: GAYA_PETA,
                    center: PUSAT,
                    zoom: ZOOM_AWAL,
                    minZoom: ponsel() ? 8 : 9,
                    maxZoom: 18,
                    maxBounds: BATAS_PETA,
                    pitch: 0,
                    maxPitch: 75,
                    dragRotate: false,
                    pitchWithRotate: false,
                    touchPitch: false,
                    attributionControl: false,
                });
                m.touchZoomRotate.disableRotation();
                m.keyboard?.disableRotation?.();
                // Zoom dan mode kamera ada di bilah alat tengah bawah (props perintahZoom dan modeKamera).
                m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATRIBUSI_DATA }), 'bottom-right');
                peta.current = m;

                let dimuat = false;
                const waktuHabis = window.setTimeout(() => {
                    if (!dimuat) panggil.current.onGagal?.('Peta MapLibre tidak selesai dimuat dalam 20 detik.');
                }, 20000);
                m.on('error', (e: Apa) => {
                    console.warn('[NalarRuang] Galat MapLibre:', e?.error ?? e);
                    // Gaya OpenFreeMap tidak bisa diambil sebelum peta siap: kembali ke Leaflet.
                    if (!dimuat && !m.isStyleLoaded?.() && Number(e?.error?.status) >= 400) {
                        window.clearTimeout(waktuHabis);
                        panggil.current.onGagal?.(`Gaya peta OpenFreeMap gagal dimuat (HTTP ${e.error.status}).`);
                    }
                });

                m.on('load', () => {
                    dimuat = true;
                    window.clearTimeout(waktuHabis);
                    FONT = fontDariGaya(m);
                    for (const s of SLOT) m.addLayer({ id: idSlot(s), type: 'background', layout: { visibility: 'none' } });
                    pasang3D(m);
                    pasangSeleksi(m);
                    pasangRute(m);
                    terapkanKamera(m, panggil.current.modeKamera ?? 'atas', false);
                    muatIkon(m).then(() => {
                        if (!batal) setSiap(true);
                    });
                });

                // Batas peta: toast bila pengguna mentok di tepi (maks. sekali per 5 detik).
                let terakhirBatas = 0;
                m.on('drag', () => {
                    const b = m.getBounds();
                    const e = 0.002;
                    const mentok = b.getWest() <= BATAS_PETA[0][0] + e || b.getEast() >= BATAS_PETA[1][0] - e
                        || b.getSouth() <= BATAS_PETA[0][1] + e || b.getNorth() >= BATAS_PETA[1][1] - e;
                    if (mentok && Date.now() - terakhirBatas > 5000) {
                        terakhirBatas = Date.now();
                        panggil.current.onBatasPeta?.();
                    }
                });

                // Legalitas dimuat per layar mulai zoom 13 (setara zoom 14 Leaflet).
                m.on('moveend', () => {
                    const pp = panggil.current;
                    if (m.getZoom() < ZOOM_LEGALITAS || !(pp.aktif?.legalitas ?? true) || popup.current?.isOpen?.()) return;
                    const b = m.getBounds();
                    const bbox = `${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)}`;
                    pp.onBboxChange?.('legalitas', bbox);
                    pp.onBboxChange?.('persil', bbox);
                });

                const kelasZoom = () => {
                    const z = m.getZoom();
                    wadah.current?.classList.toggle('nr-zoom-jauh', z < 12);
                    wadah.current?.classList.toggle('nr-zoom-sedang', z < 14);
                };
                m.on('zoomend', kelasZoom);
                kelasZoom();

                m.on('click', (e: Apa) => klik(m, e));
                m.on('mousemove', (e: Apa) => {
                    const ids = layerInteraktifAda(m);
                    const kena = ids.length ? m.queryRenderedFeatures(e.point, { layers: ids }).length > 0 : false;
                    m.getCanvas().style.cursor = kena ? 'pointer' : '';
                });
            })
            .catch((e: Error) => {
                if (!batal) panggil.current.onGagal?.(e.message);
            });
        return () => {
            batal = true;
            popup.current?.remove();
            m?.remove();
            peta.current = null;
        };
    }, []);

    function layerInteraktifAda(m: Apa): string[] {
        const ids = [...idInteraktif.current].filter((id) => m.getLayer(id));
        if (!modeRuteAktif && m.getLayer('nr-seleksi-top3-isi')) ids.unshift('nr-seleksi-top3-isi');
        return ids;
    }

    function klik(m: Apa, e: Apa): void {
        const ll: TitikPeta = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        // Wilayah Top 3 berada di atas layer data, sama seperti pane seleksi di Leaflet.
        if (m.getLayer('nr-seleksi-top3-isi')) {
            const t = m.queryRenderedFeatures(e.point, { layers: ['nr-seleksi-top3-isi'] })[0];
            if (t) {
                panggil.current.onPilihTop3(Number(t.properties?.urutan));
                return;
            }
        }
        if (!modeRuteAktif) {
            const ids = [...idInteraktif.current].filter((id) => m.getLayer(id));
            const f = ids.length ? m.queryRenderedFeatures(e.point, { layers: ids })[0] : null;
            if (f) {
                bukaPopup(m, f, e.lngLat);
                return;
            }
        }
        panggil.current.onKlikPeta(ll);
    }

    function bukaPopup(m: Apa, f: Apa, lngLat: Apa): void {
        const p = (f.properties ?? {}) as Record<string, any>;
        const isi = isiPopup(kunciDariSumber(String(f.source)), p, f.id);
        popup.current?.remove();
        const pp = new mb.current.Popup({ closeButton: true, closeOnClick: true, maxWidth: ponsel() ? '260px' : '320px', className: 'nr-popup-maplibre', offset: 8, focusAfterOpen: false })
            .setLngLat(lngLat)
            .setHTML(popupHtml(...isi))
            .addTo(m);
        pp.getElement()?.querySelector('[data-detail]')?.addEventListener('click', () => {
            pp.remove();
            panggil.current.onLihatDetail({ lat: lngLat.lat, lng: lngLat.lng });
        });
        popup.current = pp;
    }

    // Teks kontrol mengikuti bahasa; popup ditutup agar teksnya tidak tertinggal di bahasa lama.
    useEffect(() => {
        const set = (sel: string, teks: string) => {
            const el = wadah.current?.querySelector(sel);
            el?.setAttribute('title', teks);
            el?.setAttribute('aria-label', teks);
        };
        set('.maplibregl-ctrl-attrib-button', tr('Sumber data peta', 'Map data sources'));
        popup.current?.remove();
    }, [props.bahasa, siap]);

    // Sinkronisasi layer data.
    useEffect(() => {
        const m = peta.current;
        if (!m || !siap) return;
        const semua = new Set<LayerKey>([...(Object.keys(tergambar.current) as LayerKey[]), ...(Object.keys(props.layer) as LayerKey[])]);
        for (const k of semua) {
            let fc = props.layer[k];
            // Data Legalitas juga disimpan di kunci "persil" (alias); jangan digambar dua kali.
            if (k === 'persil' && fc && fc === props.layer.legalitas) fc = undefined;
            const ada = Boolean(fc?.features?.length);
            const defs = definisiLayer(k);
            if (!ada) {
                for (const d of defs) {
                    const id = String(d.spec.id);
                    if (m.getLayer(id)) m.removeLayer(id);
                    idInteraktif.current.delete(id);
                }
                if (m.getSource(idSumber(k))) m.removeSource(idSumber(k));
                delete tergambar.current[k];
                continue;
            }
            if (tergambar.current[k] === fc) continue;
            const data = siapkanData(k, fc!);
            const sumber = m.getSource(idSumber(k));
            if (sumber) sumber.setData(data);
            else m.addSource(idSumber(k), { type: 'geojson', data });
            for (const d of defs) {
                const id = String(d.spec.id);
                if (!m.getLayer(id)) {
                    const spec = k === 'mesin_waktu' ? { ...d.spec, filter: denganTahun(d.spec.filter, props.tahun) } : d.spec;
                    m.addLayer(spec, sebelum(d.slot));
                }
                if (d.interaktif) idInteraktif.current.add(id);
            }
            tergambar.current[k] = fc;
        }
    }, [props.layer, props.aktif, siap]);

    // Slider Mesin Waktu.
    useEffect(() => {
        const m = peta.current;
        if (!m || !siap) return;
        for (const d of definisiLayer('mesin_waktu')) {
            const id = String(d.spec.id);
            if (m.getLayer(id)) m.setFilter(id, denganTahun(d.spec.filter, props.tahun) as never);
        }
    }, [props.tahun, siap]);

    // Mode kamera dan zoom dari bilah alat.
    useEffect(() => {
        const m = peta.current;
        if (!m || !siap) return;
        terapkanKamera(m, props.modeKamera ?? 'atas', true);
    }, [props.modeKamera, siap]);

    useEffect(() => {
        const m = peta.current;
        const z = props.perintahZoom;
        if (!m || !z) return;
        if (z.arah > 0) m.zoomIn();
        else m.zoomOut();
    }, [props.perintahZoom?.kunci]);

    // Seleksi: topeng redup, wilayah Top 3, wilayah terpilih, lingkaran Titik, area gambar, nomor peringkat, pin titik.
    useEffect(() => {
        const m = peta.current;
        if (!m || !siap) return;
        const fitur: Feature[] = [];
        if (props.top3?.length) {
            fitur.push(topengRedup(props.top3.map((r) => r.geometri as Geometry)));
            props.top3.forEach((r, i) => fitur.push({ type: 'Feature', properties: { peran: 'top3', urutan: i, aktif: props.top3Aktif === i }, geometry: r.geometri as Geometry }));
        }
        if (props.wilayahTerpilih) fitur.push({ type: 'Feature', properties: { peran: 'terpilih' }, geometry: props.wilayahTerpilih });
        if (props.lingkaran) {
            fitur.push({ type: 'Feature', properties: { peran: 'lingkaran' }, geometry: { type: 'Polygon', coordinates: [lingkaranCincin(props.lingkaran.pusat, props.lingkaran.meter)] } });
        }
        const sudut = props.sudutArea ?? [];
        if (sudut.length) {
            const xy = sudut.map((p) => [p.lng, p.lat]);
            if (xy.length >= 3) fitur.push({ type: 'Feature', properties: { peran: 'area' }, geometry: { type: 'Polygon', coordinates: [[...xy, xy[0]]] } });
            else if (xy.length === 2) fitur.push({ type: 'Feature', properties: { peran: 'area' }, geometry: { type: 'LineString', coordinates: xy } });
            xy.forEach((c, i) => fitur.push({ type: 'Feature', properties: { peran: 'sudut', pertama: i === 0 }, geometry: { type: 'Point', coordinates: c } }));
        }
        m.getSource('nr-seleksi')?.setData({ type: 'FeatureCollection', features: fitur });

        penandaSeleksi.current.forEach((p) => p.remove());
        penandaSeleksi.current = [];
        props.top3?.forEach((r, i) => {
            const el = elemen(`<span class="nr-peringkat">${i + 1}</span>`);
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                panggil.current.onPilihTop3(i);
            });
            penandaSeleksi.current.push(new mb.current.Marker({ element: el }).setLngLat([r.pusat.lng, r.pusat.lat]).addTo(m));
        });
        if (props.pin) {
            const el = elemen(`<div class="nr-pin-maplibre" aria-hidden="true">${PIN_SVG}</div>`);
            penandaSeleksi.current.push(new mb.current.Marker({ element: el, anchor: 'bottom', offset: [0, 2] }).setLngLat([props.pin.lng, props.pin.lat]).addTo(m));
        }
    }, [props.top3, props.top3Aktif, props.wilayahTerpilih, props.pin, props.lingkaran, props.sudutArea, siap]);

    // Rute A→B: rel berwarna per lin, ojol, jalan kaki, mobil, stasiun, panah arah, titik A/B.
    useEffect(() => {
        const m = peta.current;
        if (!m || !siap) return;
        const fitur: Feature[] = [];
        const garis = (g: LineString | MultiLineString, sifat: Record<string, unknown>) => fitur.push({ type: 'Feature', properties: sifat, geometry: g });
        const r = props.rute;
        if (r?.publik) {
            const kuat = props.moda === 'transit';
            const tebal = kuat ? 5 : 3.5;
            const op = kuat ? 1 : 0.4;
            const rel = r.publik.geometri.rel;
            garis(rel, { peran: 'casing', _tebal: tebal + 3, _opasitas: op });
            const bagian = rel.type === 'MultiLineString' ? rel.coordinates : [rel.coordinates];
            const linRuas = new Map<number, string>();
            r.publik.langkah?.forEach((l) => l.tipe === 'naik' && l.garis != null && linRuas.set(l.garis, l.lin));
            bagian.forEach((c, i) => garis({ type: 'LineString', coordinates: c }, { peran: 'garis', _warna: gaya.warna.lin(linRuas.get(i) ?? 'bogor'), _tebal: tebal, _opasitas: op, _panah: kuat }));
            r.publik.geometri.ojol?.forEach((w) => garis(w, { peran: 'ojol', _opasitas: op }));
            r.publik.geometri.jalan_kaki.forEach((w) => garis(w, { peran: 'kaki', _opasitas: op }));
            r.publik.stasiun.forEach((s) =>
                fitur.push({ type: 'Feature', properties: { peran: 'stasiun', nama: s.nama, _label: kuat, _opasitas: kuat ? 1 : 0.5 }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } }),
            );
        }
        if (r?.pribadi) {
            const kuat = props.moda === 'mobil';
            const tebal = kuat ? 5 : 3.5;
            const op = kuat ? 1 : 0.4;
            garis(r.pribadi.geometri, { peran: 'casing', _tebal: tebal + 3, _opasitas: op });
            garis(r.pribadi.geometri, { peran: 'garis', _warna: NAVY, _tebal: tebal, _opasitas: op, _panah: kuat });
        }
        m.getSource('nr-rute')?.setData({ type: 'FeatureCollection', features: fitur });

        penandaRute.current.forEach((p) => p.remove());
        penandaRute.current = [];
        const ab = (t: TitikPeta | null, huruf: 'A' | 'B') => {
            if (!t) return;
            const el = elemen(`<span class="nr-route__dot ${huruf === 'A' ? 'nr-route__dot--a' : ''} nr-ab">${huruf}</span>`);
            el.style.pointerEvents = 'none';
            penandaRute.current.push(new mb.current.Marker({ element: el }).setLngLat([t.lng, t.lat]).addTo(m));
        };
        ab(props.ruteA, 'A');
        ab(props.ruteB, 'B');

        if (r && (r.pribadi || r.publik)) {
            const koordinat: Position[] = [];
            if (r.pribadi) kumpulkanKoordinat(r.pribadi.geometri, koordinat);
            if (r.publik) kumpulkanKoordinat(r.publik.geometri.rel, koordinat);
            if (props.ruteA) koordinat.push([props.ruteA.lng, props.ruteA.lat]);
            if (props.ruteB) koordinat.push([props.ruteB.lng, props.ruteB.lat]);
            const kotak = kotakBatas(koordinat);
            if (kotak) m.fitBounds(kotak, { padding: padding(), animate: false, maxZoom: 17 });
        }
    }, [props.rute, props.moda, props.ruteA, props.ruteB, siap]);

    // Pindah ke wilayah atau titik tanpa mengubah zoom (sama dengan versi Leaflet).
    useEffect(() => {
        const m = peta.current;
        const t = props.terbangKe;
        if (!m || !t) return;
        if (t.geometri) {
            const koordinat: Position[] = [];
            kumpulkanKoordinat(t.geometri, koordinat);
            const k = kotakBatas(koordinat);
            if (k) m.jumpTo({ center: [(k[0][0] + k[1][0]) / 2, (k[0][1] + k[1][1]) / 2] });
        } else if (t.titik) {
            m.jumpTo({ center: [t.titik.lng, t.titik.lat] });
        }
    }, [props.terbangKe?.kunci, siap]);

    return <div ref={wadah} className={`${props.className ?? ''} nr-peta-maplibre`} role="region" aria-label="Peta Jabodetabek, klik untuk melihat detail lokasi" />;
}

/** Sumber dan layer seleksi (di atas data, di bawah rute). */
function pasangSeleksi(m: Apa): void {
    m.addSource('nr-seleksi', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const peran = (p: string) => ['==', ['get', 'peran'], p];
    const tambah = (spec: Record<string, unknown>) => m.addLayer({ source: 'nr-seleksi', ...spec }, sebelum('seleksi'));
    tambah({ id: 'nr-seleksi-topeng', type: 'fill', filter: peran('topeng'), paint: { 'fill-color': NAVY, 'fill-opacity': 0.18 } });
    tambah({ id: 'nr-seleksi-top3-isi', type: 'fill', filter: peran('top3'), paint: { 'fill-color': NAVY, 'fill-opacity': ['case', ['to-boolean', ['get', 'aktif']], 0.14, 0.08] } });
    tambah({ id: 'nr-seleksi-top3-garis', type: 'line', filter: peran('top3'), paint: { 'line-color': NAVY, 'line-width': ['case', ['to-boolean', ['get', 'aktif']], 3.5, 2.5] } });
    tambah({ id: 'nr-seleksi-terpilih-isi', type: 'fill', filter: peran('terpilih'), paint: { 'fill-color': NAVY, 'fill-opacity': 0.08 } });
    tambah({ id: 'nr-seleksi-terpilih-garis', type: 'line', filter: peran('terpilih'), paint: { 'line-color': NAVY, 'line-width': 2.5 } });
    tambah({ id: 'nr-seleksi-lingkaran-isi', type: 'fill', filter: peran('lingkaran'), paint: { 'fill-color': NAVY, 'fill-opacity': 0.06 } });
    tambah({ id: 'nr-seleksi-lingkaran-garis', type: 'line', filter: peran('lingkaran'), paint: { 'line-color': NAVY, 'line-width': 1.5, 'line-dasharray': [3, 3] } });
    tambah({ id: 'nr-seleksi-area-isi', type: 'fill', filter: ['all', peran('area'), ['==', ['geometry-type'], 'Polygon']], paint: { 'fill-color': NAVY, 'fill-opacity': 0.12 } });
    tambah({ id: 'nr-seleksi-area-garis', type: 'line', filter: peran('area'), layout: { 'line-join': 'round' }, paint: { 'line-color': NAVY, 'line-width': 2, 'line-dasharray': [3, 2] } });
    tambah({
        id: 'nr-seleksi-sudut', type: 'circle', filter: peran('sudut'),
        paint: { 'circle-radius': ['case', ['to-boolean', ['get', 'pertama']], 6, 4.5], 'circle-color': '#ffffff', 'circle-stroke-color': NAVY, 'circle-stroke-width': 2 },
    });
}

/** Sumber dan layer rute (paling atas). */
function pasangRute(m: Apa): void {
    m.addSource('nr-rute', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const peran = (p: string) => ['==', ['get', 'peran'], p];
    const tambah = (spec: Record<string, unknown>) => m.addLayer({ source: 'nr-rute', ...spec }, sebelum('rute'));
    const bulat = { 'line-cap': 'round', 'line-join': 'round' };
    tambah({ id: 'nr-rute-casing', type: 'line', filter: peran('casing'), layout: bulat, paint: { 'line-color': '#ffffff', 'line-width': ['get', '_tebal'], 'line-opacity': ['get', '_opasitas'] } });
    tambah({ id: 'nr-rute-garis', type: 'line', filter: peran('garis'), layout: bulat, paint: { 'line-color': ['get', '_warna'], 'line-width': ['get', '_tebal'], 'line-opacity': ['get', '_opasitas'] } });
    tambah({ id: 'nr-rute-ojol', type: 'line', filter: peran('ojol'), layout: bulat, paint: { 'line-color': '#16a34a', 'line-width': 4, 'line-opacity': ['get', '_opasitas'], 'line-dasharray': [0.1, 2] } });
    tambah({ id: 'nr-rute-kaki', type: 'line', filter: peran('kaki'), layout: bulat, paint: { 'line-color': NAVY, 'line-width': 3, 'line-opacity': ['get', '_opasitas'], 'line-dasharray': [0.1, 2.3] } });
    tambah({
        id: 'nr-rute-panah', type: 'symbol', filter: ['all', peran('garis'), ['to-boolean', ['get', '_panah']]],
        layout: { 'symbol-placement': 'line', 'symbol-spacing': 90, 'icon-image': 'nr-panah', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
    });
    tambah({
        id: 'nr-rute-stasiun', type: 'circle', filter: peran('stasiun'),
        paint: { 'circle-radius': 6, 'circle-color': '#fbf9f6', 'circle-stroke-color': NAVY, 'circle-stroke-width': 2.5, 'circle-opacity': ['get', '_opasitas'], 'circle-stroke-opacity': ['get', '_opasitas'] },
    });
    tambah({
        id: 'nr-rute-stasiun-label', type: 'symbol', filter: ['all', peran('stasiun'), ['to-boolean', ['get', '_label']]],
        layout: { 'text-field': ['get', 'nama'], 'text-font': FONT, 'text-size': 12, 'text-anchor': 'bottom', 'text-offset': [0, -0.9], 'text-allow-overlap': true },
        paint: { 'text-color': NAVY, 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2 },
    });
}
