/**
 * Alat gambar lahan untuk Uji Lahan (FR-23). Hanya Leaflet, tanpa plugin (CLAUDE.md: jangan menambah dependensi).
 *
 * - Kotak: kotak awal muncul di tengah layar; tarik pegangan sudut untuk mengubah ukuran (seperti TestFit),
 *   tarik pegangan tengah untuk memindahkan.
 * - Poligon: klik sudut-sudut lahan, klik titik pertama (atau tombol Selesai) untuk menutup. Setelah tertutup,
 *   titik sudut bisa digeser dan titik tengah sisi bisa ditarik untuk menambah sudut baru.
 *
 * Hasil dikirim sebagai GeoJSON Polygon [lng, lat] (konversi koordinat hanya di folder Map/).
 */
import L from 'leaflet';
import type { FeatureCollection, Polygon } from 'geojson';

export type ModeLahan = 'kotak' | 'poligon';

const WARNA = '#e4572e';

const gayaLahan: L.PathOptions = { color: WARNA, weight: 2.5, fillColor: WARNA, fillOpacity: 0.08, dashArray: undefined };
const gayaDraf: L.PolylineOptions = { color: WARNA, weight: 2, dashArray: '6 6', interactive: false };

function ikonPegangan(jenis: 'sudut' | 'tengah' | 'geser' | 'awal'): L.DivIcon {
    const ukuran = jenis === 'geser' ? 28 : jenis === 'tengah' ? 12 : 16;
    return L.divIcon({
        className: `nr-lahan-pegangan nr-lahan-pegangan--${jenis}`,
        iconSize: [ukuran, ukuran],
        iconAnchor: [ukuran / 2, ukuran / 2],
        html: jenis === 'geser'
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/></svg>'
            : '',
    });
}

export class AlatLahan {
    private peta: L.Map;
    private grup: L.LayerGroup;
    private onUbah: (g: Polygon | null, tarik?: boolean) => void;
    private onTarik?: (titik: L.LatLng[], kotak: boolean) => void;
    private terakhirKirim = 0;
    /** True selama sudut, titik tengah, atau pegangan geser sedang ditarik. */
    ditarik = false;
    private mode: ModeLahan | null = null;
    private titik: L.LatLng[] = [];
    private tertutup = false;
    private poligon: L.Polygon | null = null;
    private draf: L.Polyline | null = null;
    private pegangan: L.Marker[] = [];
    private zoomGandaAwal = true;

    /**
     * onUbah: lahan berubah (tarik = true selama masih ditarik, dikirim paling sering tiap 100 ms).
     * onTarik: dipanggil tiap gerakan tarik, untuk melenturkan isi kapasitas tanpa menunggu server.
     */
    constructor(peta: L.Map, onUbah: (g: Polygon | null, tarik?: boolean) => void, onTarik?: (titik: L.LatLng[], kotak: boolean) => void) {
        this.peta = peta;
        this.onUbah = onUbah;
        this.onTarik = onTarik;
        this.grup = L.layerGroup().addTo(peta);
        this.klik = this.klik.bind(this);
        this.gerak = this.gerak.bind(this);
    }

    /** Mulai mode baru dari awal. null = matikan alat dan hapus gambar. */
    mulai(mode: ModeLahan | null): void {
        this.bersihkan();
        this.mode = mode;
        const wadah = this.peta.getContainer();
        wadah.classList.toggle('nr-gambar-lahan', mode !== null);
        if (!mode) {
            this.onUbah(null);
            return;
        }
        this.zoomGandaAwal = this.peta.doubleClickZoom.enabled();
        this.peta.doubleClickZoom.disable();
        if (mode === 'kotak') {
            this.kotakAwal();
        } else {
            this.peta.on('click', this.klik);
            this.peta.on('mousemove', this.gerak);
            wadah.classList.add('nr-gambar-lahan--titik');
        }
    }

    /** Tutup poligon yang sedang digambar (tombol Selesai di panel). */
    selesai(): void {
        if (this.mode === 'poligon' && !this.tertutup && this.titik.length >= 3) this.tutupPoligon();
    }

    hapus(): void {
        this.mulai(null);
        this.grup.remove();
    }

    // ---- Kotak ----

    private kotakAwal(): void {
        const b = this.peta.getBounds();
        const pusat = b.getCenter();
        // Sekitar seperlima lebar layar, dengan rasio 4:3.
        const dLng = (b.getEast() - b.getWest()) / 10;
        const dLat = dLng * 0.75 * Math.cos((pusat.lat * Math.PI) / 180);
        this.titik = [
            L.latLng(pusat.lat + dLat, pusat.lng - dLng),
            L.latLng(pusat.lat + dLat, pusat.lng + dLng),
            L.latLng(pusat.lat - dLat, pusat.lng + dLng),
            L.latLng(pusat.lat - dLat, pusat.lng - dLng),
        ];
        this.tertutup = true;
        this.gambar();
        this.kirim();
    }

    /** Sudut i ditarik: sudut seberangnya tetap, dua sudut lain mengikuti supaya tetap kotak. */
    private tarikSudutKotak(i: number, ll: L.LatLng): void {
        const seberang = this.titik[(i + 2) % 4];
        const utara = Math.max(ll.lat, seberang.lat);
        const selatan = Math.min(ll.lat, seberang.lat);
        const barat = Math.min(ll.lng, seberang.lng);
        const timur = Math.max(ll.lng, seberang.lng);
        this.titik = [L.latLng(utara, barat), L.latLng(utara, timur), L.latLng(selatan, timur), L.latLng(selatan, barat)];
    }

    // ---- Poligon ----

    private klik(e: L.LeafletMouseEvent): void {
        if (this.mode !== 'poligon' || this.tertutup) return;
        this.peta.closePopup();
        // Klik dekat titik pertama menutup poligon.
        if (this.titik.length >= 3) {
            const p0 = this.peta.latLngToContainerPoint(this.titik[0]);
            if (p0.distanceTo(e.containerPoint) < 14) {
                this.tutupPoligon();
                return;
            }
        }
        this.titik.push(e.latlng);
        this.gambar();
    }

    private gerak(e: L.LeafletMouseEvent): void {
        if (this.mode !== 'poligon' || this.tertutup || !this.titik.length) return;
        const garis = [...this.titik, e.latlng];
        if (this.titik.length >= 2) garis.push(this.titik[0]);
        if (!this.draf) this.draf = L.polyline(garis, { ...gayaDraf, pane: 'nrSeleksi' }).addTo(this.grup);
        else this.draf.setLatLngs(garis);
    }

    private tutupPoligon(): void {
        this.tertutup = true;
        this.peta.off('click', this.klik);
        this.peta.off('mousemove', this.gerak);
        this.peta.getContainer().classList.remove('nr-gambar-lahan--titik');
        this.gambar();
        this.kirim();
    }

    // ---- Gambar & pegangan ----

    private gambar(): void {
        this.draf?.remove();
        this.draf = null;
        this.poligon?.remove();
        this.poligon = null;
        this.pegangan.forEach((m) => m.remove());
        this.pegangan = [];

        if (!this.titik.length) return;

        if (this.tertutup) {
            this.poligon = L.polygon(this.titik, { ...gayaLahan, pane: 'nrSeleksi', className: 'nr-lahan', bubblingMouseEvents: false }).addTo(this.grup);
        } else if (this.titik.length >= 2) {
            this.draf = L.polyline(this.titik, { ...gayaDraf, pane: 'nrSeleksi' }).addTo(this.grup);
        }

        this.titik.forEach((ll, i) => {
            const awal = !this.tertutup && i === 0 && this.titik.length >= 3;
            const m = L.marker(ll, { icon: ikonPegangan(awal ? 'awal' : 'sudut'), draggable: this.tertutup, keyboard: false, zIndexOffset: 1000 }).addTo(this.grup);
            if (awal) m.on('click', () => this.tutupPoligon());
            if (this.tertutup) {
                m.on('drag', (e) => {
                    const baru = (e.target as L.Marker).getLatLng();
                    if (this.mode === 'kotak') {
                        this.tarikSudutKotak(i, baru);
                        this.perbaruiPosisi(i);
                    } else {
                        this.titik[i] = baru;
                        this.poligon?.setLatLngs(this.titik);
                        this.perbaruiPosisi(i);
                    }
                    this.saatTarik();
                });
                m.on('dragend', () => this.akhirTarik());
            }
            this.pegangan.push(m);
        });

        if (!this.tertutup) return;

        // Titik tengah sisi (khusus poligon): tarik untuk menambah sudut baru.
        if (this.mode === 'poligon') {
            this.titik.forEach((a, i) => {
                const b = this.titik[(i + 1) % this.titik.length];
                const tengah = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
                const m = L.marker(tengah, { icon: ikonPegangan('tengah'), draggable: true, keyboard: false, zIndexOffset: 900 }).addTo(this.grup);
                m.on('dragstart', () => {
                    this.titik.splice(i + 1, 0, tengah);
                });
                m.on('drag', (e) => {
                    this.titik[i + 1] = (e.target as L.Marker).getLatLng();
                    this.poligon?.setLatLngs(this.titik);
                    this.saatTarik();
                });
                m.on('dragend', () => this.akhirTarik());
                this.pegangan.push(m);
            });
        }

        // Pegangan tengah untuk memindahkan seluruh lahan.
        const pusat = this.pusat();
        let awalGeser = pusat;
        let titikAwal: L.LatLng[] = [];
        const geser = L.marker(pusat, { icon: ikonPegangan('geser'), draggable: true, keyboard: false, zIndexOffset: 1100, title: 'Geser lahan' }).addTo(this.grup);
        geser.on('dragstart', () => {
            awalGeser = geser.getLatLng();
            titikAwal = this.titik.map((t) => L.latLng(t.lat, t.lng));
        });
        geser.on('drag', () => {
            const kini = geser.getLatLng();
            const dLat = kini.lat - awalGeser.lat;
            const dLng = kini.lng - awalGeser.lng;
            this.titik = titikAwal.map((t) => L.latLng(t.lat + dLat, t.lng + dLng));
            this.poligon?.setLatLngs(this.titik);
            this.saatTarik();
        });
        geser.on('dragend', () => this.akhirTarik());
        this.pegangan.push(geser);
    }

    /** Titik lahan saat ini (salinan). */
    titikSekarang(): L.LatLng[] {
        return this.titik.map((t) => L.latLng(t.lat, t.lng));
    }

    get modeKotak(): boolean {
        return this.mode === 'kotak';
    }

    /** Tiap gerakan tarik: isi dilenturkan langsung, lahan dikirim untuk dihitung ulang (dibatasi 100 ms). */
    private saatTarik(): void {
        this.ditarik = true;
        this.onTarik?.(this.titik, this.mode === 'kotak');
        const kini = performance.now();
        if (kini - this.terakhirKirim >= 100) {
            this.terakhirKirim = kini;
            this.kirim(true);
        }
    }

    private akhirTarik(): void {
        this.ditarik = false;
        this.gambar();
        this.kirim();
    }

    /** Saat menarik, pindahkan pegangan sudut lain (kotak) tanpa menggambar ulang semuanya. */
    private perbaruiPosisi(kecuali?: number): void {
        this.poligon?.setLatLngs(this.titik);
        this.titik.forEach((ll, i) => {
            if (i !== kecuali && this.pegangan[i]) this.pegangan[i].setLatLng(ll);
        });
    }

    private pusat(): L.LatLng {
        const n = this.titik.length;
        const lat = this.titik.reduce((s, t) => s + t.lat, 0) / n;
        const lng = this.titik.reduce((s, t) => s + t.lng, 0) / n;
        return L.latLng(lat, lng);
    }

    private kirim(tarik = false): void {
        if (!this.tertutup || this.titik.length < 3) {
            this.onUbah(null);
            return;
        }
        const cincin = this.titik.map((t) => [Number(t.lng.toFixed(7)), Number(t.lat.toFixed(7))]);
        cincin.push([...cincin[0]]);
        this.onUbah({ type: 'Polygon', coordinates: [cincin] }, tarik);
    }

    private bersihkan(): void {
        this.peta.off('click', this.klik);
        this.peta.off('mousemove', this.gerak);
        const wadah = this.peta.getContainer();
        wadah.classList.remove('nr-gambar-lahan', 'nr-gambar-lahan--titik');
        if (this.mode !== null && this.zoomGandaAwal) this.peta.doubleClickZoom.enable();
        this.grup.clearLayers();
        this.titik = [];
        this.tertutup = false;
        this.poligon = null;
        this.draf = null;
        this.pegangan = [];
    }
}

/** Warna tipe unit mengikuti pola TestFit: hijau, biru, ungu. Kamar kos memakai biru. */
export const WARNA_UNIT: Record<string, string> = { studio: '#2fbf71', '1br': '#4a90e2', '2br': '#7b5cd6', kamar: '#4a90e2' };

const WARNA_ATAP = ['#f2994a', '#e8833a', '#f5b06b'];

/** Gaya hasil kapasitas: kavling + jalan (rumah tapak), unit + koridor + taman + parkir (kos/apartemen). */
export function gambarKapasitas(fc: FeatureCollection, label: (p: Record<string, unknown>) => string | null): L.GeoJSON {
    return L.geoJSON(fc, {
        pane: 'nrLahanIsi',
        interactive: false,
        style: (f) => {
            const p = (f?.properties ?? {}) as Record<string, unknown>;
            switch (p.jenis) {
                case 'jalan':
                    return { stroke: false, fillColor: '#8a93a6', fillOpacity: 0.6 };
                case 'unit':
                    return { color: '#1d2433', weight: 0.6, fillColor: WARNA_UNIT[String(p.tipe)] ?? '#4a90e2', fillOpacity: 0.92 };
                case 'koridor':
                    return { stroke: false, fillColor: '#3b4252', fillOpacity: 0.9 };
                case 'taman':
                    return { color: '#e7a3a3', weight: 1, fillColor: '#f4b6b6', fillOpacity: 0.55 };
                case 'parkir':
                    return { stroke: false, fillColor: '#6b7280', fillOpacity: 0.55 };
                case 'slot':
                    return { color: '#ffffff', weight: 0.8, fillColor: '#2fbf71', fillOpacity: 0.55 };
                case 'tapak':
                    return { color: '#1f3b6e', weight: 1.5, fillColor: '#3b6fd8', fillOpacity: 0.45 };
                default:
                    return { color: '#ffffff', weight: 0.8, fillColor: WARNA_ATAP[Number(p.varian ?? 0) % 3], fillOpacity: 0.85 };
            }
        },
        onEachFeature: (f, layer) => {
            const teks = label((f.properties ?? {}) as Record<string, unknown>);
            if (teks) layer.bindTooltip(teks, { permanent: true, direction: 'center', className: 'nr-lahan-label' });
        },
    });
}

/** Geometri asli tiap poligon isi, supaya pelenturan selalu dihitung dari hasil server, bukan dari pelenturan sebelumnya. */
const asliLentur = new WeakMap<L.Polygon, unknown>();

type Ubah = (ll: L.LatLng) => L.LatLng;

/** Kotak: peta linear dari kotak batas lama ke kotak batas baru (tepat untuk tarik sudut kotak dan geser). */
function ubahKotak(dari: L.LatLng[], ke: L.LatLng[]): Ubah {
    const a = L.latLngBounds(dari);
    const b = L.latLngBounds(ke);
    const sy = (b.getNorth() - b.getSouth()) / (a.getNorth() - a.getSouth() || 1e-12);
    const sx = (b.getEast() - b.getWest()) / (a.getEast() - a.getWest() || 1e-12);
    return (ll) => L.latLng(b.getSouth() + (ll.lat - a.getSouth()) * sy, b.getWest() + (ll.lng - a.getWest()) * sx);
}

/** Poligon bebas: tiap titik ikut bergeser sebesar rata-rata pergeseran sudut, berbobot 1/jarak² (bagian dekat sudut yang ditarik ikut paling jauh). */
function ubahSudut(dari: L.LatLng[], ke: L.LatLng[]): Ubah {
    const kos = Math.cos((dari[0].lat * Math.PI) / 180);
    const geser = dari.map((d, i) => [ke[i].lat - d.lat, ke[i].lng - d.lng]);
    return (ll) => {
        let w = 0;
        let dy = 0;
        let dx = 0;
        for (let i = 0; i < dari.length; i++) {
            const jy = ll.lat - dari[i].lat;
            const jx = (ll.lng - dari[i].lng) * kos;
            const j2 = jy * jy + jx * jx;
            if (j2 < 1e-16) return L.latLng(ll.lat + geser[i][0], ll.lng + geser[i][1]);
            const b = 1 / j2;
            w += b;
            dy += b * geser[i][0];
            dx += b * geser[i][1];
        }
        return L.latLng(ll.lat + dy / w, ll.lng + dx / w);
    };
}

function petaDalam(x: unknown, f: (ll: L.LatLng) => L.LatLng): unknown {
    return Array.isArray(x) ? x.map((y) => petaDalam(y, f)) : f(x as L.LatLng);
}

/**
 * Lenturkan isi kapasitas (unit, kavling, jalan, taman, ...) mengikuti lahan yang sedang ditarik, tanpa menunggu server.
 * `dari` = lahan tempat isi itu dihitung, `ke` = lahan saat ini.
 */
export function lenturkan(grup: L.LayerGroup, dari: L.LatLng[], ke: L.LatLng[], kotak: boolean): void {
    if (dari.length < 3 || ke.length < 3) return;
    const ubah = !kotak && dari.length === ke.length ? ubahSudut(dari, ke) : ubahKotak(dari, ke);
    const jalan = (l: L.Layer): void => {
        if (l instanceof L.Polygon) {
            if (!asliLentur.has(l)) asliLentur.set(l, petaDalam(l.getLatLngs(), (ll) => L.latLng(ll.lat, ll.lng)));
            l.setLatLngs(petaDalam(asliLentur.get(l), ubah) as L.LatLng[][]);
            const tip = l.getTooltip();
            if (tip) tip.setLatLng(l.getBounds().getCenter());
        } else if (l instanceof L.LayerGroup) {
            l.eachLayer(jalan);
        }
    };
    grup.eachLayer(jalan);
}
