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
    private onUbah: (g: Polygon | null) => void;
    private mode: ModeLahan | null = null;
    private titik: L.LatLng[] = [];
    private tertutup = false;
    private poligon: L.Polygon | null = null;
    private draf: L.Polyline | null = null;
    private pegangan: L.Marker[] = [];
    private zoomGandaAwal = true;

    constructor(peta: L.Map, onUbah: (g: Polygon | null) => void) {
        this.peta = peta;
        this.onUbah = onUbah;
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
                });
                m.on('dragend', () => {
                    this.gambar();
                    this.kirim();
                });
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
                });
                m.on('dragend', () => {
                    this.gambar();
                    this.kirim();
                });
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
        });
        geser.on('dragend', () => {
            this.gambar();
            this.kirim();
        });
        this.pegangan.push(geser);
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

    private kirim(): void {
        if (!this.tertutup || this.titik.length < 3) {
            this.onUbah(null);
            return;
        }
        const cincin = this.titik.map((t) => [Number(t.lng.toFixed(7)), Number(t.lat.toFixed(7))]);
        cincin.push([...cincin[0]]);
        this.onUbah({ type: 'Polygon', coordinates: [cincin] });
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

/** Gaya hasil kapasitas: kavling, jalan, tapak bangunan. */
export function gambarKapasitas(fc: FeatureCollection, label: (p: Record<string, unknown>) => string | null): L.GeoJSON {
    return L.geoJSON(fc, {
        pane: 'nrLahanIsi',
        interactive: false,
        style: (f) => {
            const jenis = f?.properties?.jenis;
            if (jenis === 'jalan') return { stroke: false, fillColor: '#9aa3b5', fillOpacity: 0.55 };
            if (jenis === 'tapak') return { color: '#1f3b6e', weight: 1.5, fillColor: '#3b6fd8', fillOpacity: 0.45 };
            return { color: '#ffffff', weight: 0.8, fillColor: '#f2994a', fillOpacity: 0.75 };
        },
        onEachFeature: (f, layer) => {
            const teks = label((f.properties ?? {}) as Record<string, unknown>);
            if (teks) layer.bindTooltip(teks, { permanent: true, direction: 'center', className: 'nr-lahan-label' });
        },
    });
}
