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
import type { FeatureCollection, Geometry, Polygon, Position } from 'geojson';
import { batasiKotak, batasiTitik, bolehTambahTitik, skalaKotakAwal, titikTerdekatRuas } from '@/lib/batasLahan';

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
    private onBatas?: () => void;
    private terakhirKirim = 0;
    private terakhirBatas = 0;
    /** Lahan terkunci: bentuknya digambar tanpa pegangan dan tidak bisa diubah dari peta. */
    private terkunci = false;
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
     * onTarik: dipanggil tiap gerakan tarik, untuk memotong dan memudarkan isi kapasitas tanpa menunggu server.
     * onBatas: bentuk lahan tertahan di batas ukuran maksimum (paling sering sekali tiap 2,5 detik), untuk notifikasi.
     */
    constructor(peta: L.Map, onUbah: (g: Polygon | null, tarik?: boolean) => void, onTarik?: (titik: L.LatLng[], kotak: boolean) => void, onBatas?: () => void) {
        this.peta = peta;
        this.onUbah = onUbah;
        this.onTarik = onTarik;
        this.onBatas = onBatas;
        this.grup = L.layerGroup().addTo(peta);
        this.klik = this.klik.bind(this);
        this.gerak = this.gerak.bind(this);
    }

    /**
     * Mulai mode baru dari awal. null = matikan alat dan hapus gambar.
     * `awal`: bentuk lahan yang sudah ada (peta dibuat ulang setelah tampilan 3D); dipulihkan tanpa memanggil `onUbah`,
     * jadi lahan di proyek tidak tertimpa kotak baru.
     */
    mulai(mode: ModeLahan | null, awal?: Polygon | null): void {
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
        if (awal && (awal.coordinates[0]?.length ?? 0) >= 4) {
            this.pulihkan(awal);
        } else if (mode === 'kotak') {
            this.kotakAwal();
        } else {
            this.peta.on('click', this.klik);
            this.peta.on('mousemove', this.gerak);
            wadah.classList.add('nr-gambar-lahan--titik');
        }
    }

    /** Kunci/buka lahan (layer "Lahan" di panel layer). Mengunci menghapus semua pegangan dari peta. */
    kunci(nilai: boolean): void {
        if (this.terkunci === nilai) return;
        this.terkunci = nilai;
        if (this.tertutup) this.gambar();
    }

    /** Tutup poligon yang sedang digambar (tombol Selesai di panel). */
    selesai(): void {
        if (this.mode === 'poligon' && !this.tertutup && this.titik.length >= 3) this.tutupPoligon();
    }

    /**
     * Pulihkan bentuk lahan dari luar (undo/redo). Tidak memanggil `onUbah`: pemanggil sudah memegang bentuk ini.
     * Isi di luar batas langsung dipotong lewat `onTarik`. Diabaikan bila alat sedang mati.
     */
    pulihkan(g: Polygon): void {
        if (!this.mode) return;
        const cincin = g.coordinates[0] ?? [];
        const titik = cincin.slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng));
        if (titik.length < 3) return;
        // Bila poligon belum ditutup, hentikan penangkapan klik: bentuk yang dipulihkan sudah lengkap.
        this.peta.off('click', this.klik);
        this.peta.off('mousemove', this.gerak);
        this.peta.getContainer().classList.remove('nr-gambar-lahan--titik');
        this.titik = titik;
        this.tertutup = true;
        this.ditarik = false;
        this.gambar();
        this.onTarik?.(this.titik, this.mode === 'kotak');
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
        let dLng = (b.getEast() - b.getWest()) / 10;
        let dLat = dLng * 0.75 * Math.cos((pusat.lat * Math.PI) / 180);
        // Zoom jauh membuat seperlima layar jauh di atas batas ukuran: kecilkan supaya kotak awal selalu sah.
        const skala = skalaKotakAwal(dLng, dLat, pusat.lat);
        dLng *= skala;
        dLat *= skala;
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
    private tarikSudutKotak(i: number, ll: L.LatLng): boolean {
        const seberang = this.titik[(i + 2) % 4];
        // Kotak yang melewati batas ukuran berhenti di batas (rasio tarikan tetap).
        const h = batasiKotak(seberang, ll);
        const utara = Math.max(h.titik.lat, seberang.lat);
        const selatan = Math.min(h.titik.lat, seberang.lat);
        const barat = Math.min(h.titik.lng, seberang.lng);
        const timur = Math.max(h.titik.lng, seberang.lng);
        this.titik = [L.latLng(utara, barat), L.latLng(utara, timur), L.latLng(selatan, timur), L.latLng(selatan, barat)];
        return h.terbatas;
    }

    /** Beri tahu bahwa bentuk tertahan di batas ukuran (dibatasi supaya notifikasi tidak menumpuk). */
    private kabarBatas(): void {
        const kini = performance.now();
        if (kini - this.terakhirBatas < 2500) return;
        this.terakhirBatas = kini;
        this.onBatas?.();
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
        // Titik yang membuat poligon melewati batas ukuran ditolak.
        if (this.titik.length >= 2 && !bolehTambahTitik(this.titik, e.latlng)) {
            this.kabarBatas();
            return;
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
            // Shift + klik di dekat sisi poligon menyisipkan titik sudut baru di sisi itu (seperti TestFit).
            if (this.mode === 'poligon') {
                this.poligon.on('click', (e) => {
                    if ((e.originalEvent as MouseEvent).shiftKey) this.sisipTitik(e.latlng);
                });
            }
        } else if (this.titik.length >= 2) {
            this.draf = L.polyline(this.titik, { ...gayaDraf, pane: 'nrSeleksi' }).addTo(this.grup);
        }

        // Lahan terkunci: hanya garis batas, tanpa pegangan sudut, titik tengah, maupun pegangan geser.
        if (this.tertutup && this.terkunci) return;

        this.titik.forEach((ll, i) => {
            const awal = !this.tertutup && i === 0 && this.titik.length >= 3;
            const m = L.marker(ll, { icon: ikonPegangan(awal ? 'awal' : 'sudut'), draggable: this.tertutup, keyboard: false, zIndexOffset: 1000 }).addTo(this.grup);
            if (awal) m.on('click', () => this.tutupPoligon());
            if (this.tertutup) {
                m.on('drag', (e) => {
                    const penanda = e.target as L.Marker;
                    const baru = penanda.getLatLng();
                    if (this.mode === 'kotak') {
                        if (this.tarikSudutKotak(i, baru)) {
                            penanda.setLatLng(this.titik[i]);
                            this.kabarBatas();
                        }
                        this.perbaruiPosisi(i);
                    } else {
                        // Titik berhenti di batas ukuran maksimum alih-alih mengikuti kursor.
                        const h = batasiTitik(this.titik, i, baru);
                        this.titik[i] = L.latLng(h.titik.lat, h.titik.lng);
                        if (h.terbatas) {
                            penanda.setLatLng(this.titik[i]);
                            this.kabarBatas();
                        }
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
                    const penanda = e.target as L.Marker;
                    const h = batasiTitik(this.titik, i + 1, penanda.getLatLng());
                    this.titik[i + 1] = L.latLng(h.titik.lat, h.titik.lng);
                    if (h.terbatas) {
                        penanda.setLatLng(this.titik[i + 1]);
                        this.kabarBatas();
                    }
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

    /** Sisipkan titik sudut di sisi poligon terdekat dari `ll` (hanya bila klik dalam 18 px dari sebuah sisi). Luas tidak berubah. */
    private sisipTitik(ll: L.LatLng): void {
        if (this.terkunci) return;
        const p = this.peta.latLngToLayerPoint(ll);
        let terbaik = { i: -1, x: 0, y: 0, jarak: Infinity };
        this.titik.forEach((a, i) => {
            const b = this.titik[(i + 1) % this.titik.length];
            const r = titikTerdekatRuas(p, this.peta.latLngToLayerPoint(a), this.peta.latLngToLayerPoint(b));
            if (r.jarak < terbaik.jarak) terbaik = { i, x: r.x, y: r.y, jarak: r.jarak };
        });
        if (terbaik.i < 0 || terbaik.jarak > 18) return;
        this.titik.splice(terbaik.i + 1, 0, this.peta.layerPointToLatLng(L.point(terbaik.x, terbaik.y)));
        this.gambar();
        this.kirim();
    }

    /** Titik lahan saat ini (salinan). */
    titikSekarang(): L.LatLng[] {
        return this.titik.map((t) => L.latLng(t.lat, t.lng));
    }

    get modeKotak(): boolean {
        return this.mode === 'kotak';
    }

    /** Tiap gerakan tarik: isi di luar batas langsung dipudarkan, lahan dikirim untuk dihitung ulang (dibatasi 100 ms). */
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

/** Gaya isi hasil kapasitas: kavling + jalan (rumah tapak), unit + koridor + taman + parkir (kos/apartemen). */
function gayaIsi(p: Record<string, unknown>): L.PathOptions {
            switch (p.jenis) {
                case 'jalan':
                    return { stroke: false, fillColor: '#8a93a6', fillOpacity: 0.6 };
                case 'unit':
                    return { color: '#1d2433', weight: 0.6, fillColor: WARNA_UNIT[String(p.tipe)] ?? '#4a90e2', fillOpacity: 0.92 };
                case 'koridor':
                    return { stroke: false, fillColor: '#3b4252', fillOpacity: 0.9 };
                case 'taman':
                    return { color: '#6fbf80', weight: 1, fillColor: '#bfe3c0', fillOpacity: 0.7 };
                case 'parkir':
                    return { stroke: false, fillColor: '#6b7280', fillOpacity: 0.55 };
                case 'slot':
                    return { color: '#ffffff', weight: 0.8, fillColor: '#2fbf71', fillOpacity: 0.55 };
                case 'akses':
                    return { color: '#ffffff', weight: 1, dashArray: '4 4', fillColor: '#5b6270', fillOpacity: 0.9 };
                case 'lobi':
                    return { color: '#1d2433', weight: 0.6, fillColor: '#f2b544', fillOpacity: 0.95 };
                case 'jalur':
                    return { stroke: false, fillColor: '#e2cf9f', fillOpacity: 0.9 };
                case 'inti':
                    return { color: '#1d2433', weight: 0.6, fillColor: '#9aa3b2', fillOpacity: 0.9 };
                case 'void':
                    return { color: '#e7a3a3', weight: 0.8, fillColor: '#f4b6b6', fillOpacity: 0.4 };
                case 'tapak':
                    return { color: '#1f3b6e', weight: 1.5, fillColor: '#3b6fd8', fillOpacity: 0.45 };
                default:
                    return { color: '#ffffff', weight: 0.8, fillColor: WARNA_ATAP[Number(p.varian ?? 0) % 3], fillOpacity: 0.85 };
            }
}


/** Isi yang tampil satu per satu dan dianimasikan muncul/hilang; sisanya (jalan, koridor, taman, parkir) berganti bentuk saja. */
const SATUAN_ISI = new Set(['unit', 'kavling', 'slot']);
const LAMA_HILANG = 280;

type ItemIsi = { layer: L.Polygon; jenis: string; tipe: string; pusat: [number, number]; luas: number; zona: number | null };

function cincinLuar(g: Geometry): Position[] {
    if (g.type === 'Polygon') return g.coordinates[0] ?? [];
    if (g.type === 'MultiPolygon') return g.coordinates.flatMap((p) => p[0] ?? []);
    return [];
}

/** Pusat (meter, kira-kira) dan luas (m²) dari cincin luar, cukup untuk mencocokkan isi lama dengan isi baru. */
function ukur(g: Geometry): { pusat: [number, number]; luas: number } {
    const c = cincinLuar(g);
    if (c.length === 0) return { pusat: [0, 0], luas: 0 };
    const kos = Math.cos(((c[0][1] ?? 0) * Math.PI) / 180);
    const m = c.map(([x, y]) => [x * 111320 * kos, y * 110574] as const);
    let luas = 0;
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < m.length; i++) {
        const [x1, y1] = m[i];
        const [x2, y2] = m[(i + 1) % m.length];
        luas += x1 * y2 - x2 * y1;
        sx += x1;
        sy += y1;
    }
    return { pusat: [sx / m.length, sy / m.length], luas: Math.abs(luas) / 2 };
}

function latLngsDari(g: Geometry): L.LatLng[][] | L.LatLng[][][] {
    if (g.type === 'MultiPolygon') return L.GeoJSON.coordsToLatLngs(g.coordinates, 2) as L.LatLng[][][];
    return L.GeoJSON.coordsToLatLngs((g as Polygon).coordinates, 1) as L.LatLng[][];
}

function didalam(t: L.LatLng, poli: L.LatLng[]): boolean {
    let isi = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
        const a = poli[i];
        const b = poli[j];
        if (a.lat > t.lat !== b.lat > t.lat && t.lng < ((b.lng - a.lng) * (t.lat - a.lat)) / (b.lat - a.lat) + a.lng) isi = !isi;
    }
    return isi;
}

/**
 * Lapisan hasil kapasitas yang berganti dengan halus: isi yang sama dengan hasil sebelumnya tetap di tempat
 * (warnanya bertransisi), isi baru muncul memudar, isi yang tidak ada lagi memudar hilang. Selama lahan ditarik,
 * lapisan dipotong ke batas lahan dan unit/kavling yang keluar batas langsung memudar.
 */
/** Label ringkasan di atas tepi utara lahan (di atas pegangan tengah tepi). */
const OPSI_LABEL: L.TooltipOptions = { permanent: true, direction: 'top', offset: [0, -14], className: 'nr-lahan-label' };

export class LapisanKapasitas {
    private peta: L.Map;
    private grup: L.LayerGroup;
    private label: (p: Record<string, unknown>) => string | null;
    private item: ItemIsi[] = [];
    private batas: L.LatLng[] | null = null;
    private zonaTarik = new Map<number, L.LatLng[][]>();
    private sembunyiJenis = new Set<string>();
    private sembunyiZona = new Set<number>();

    constructor(peta: L.Map, grup: L.LayerGroup, label: (p: Record<string, unknown>) => string | null) {
        this.peta = peta;
        this.grup = grup;
        this.label = label;
        this.pasangPotong = this.pasangPotong.bind(this);
        this.lepasPotong = this.lepasPotong.bind(this);
        peta.on('zoomstart', this.lepasPotong);
        peta.on('zoomend viewreset', this.pasangPotong);
    }

    setLabel(label: (p: Record<string, unknown>) => string | null): void {
        this.label = label;
    }

    perbarui(fc: FeatureCollection | null | undefined): void {
        const fitur = (fc?.features ?? []).filter((f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
        const sisa = new Set(this.item);
        const baru: ItemIsi[] = [];
        const urutanDasar = new Map<string, ItemIsi[]>();
        for (const it of this.item) {
            if (SATUAN_ISI.has(it.jenis)) continue;
            urutanDasar.set(it.jenis, [...(urutanDasar.get(it.jenis) ?? []), it]);
        }

        for (const f of fitur) {
            const p = (f.properties ?? {}) as Record<string, unknown>;
            const jenis = String(p.jenis ?? '');
            const tipe = String(p.tipe ?? '');
            const zona = typeof p.zona === 'number' ? p.zona : null;
            const u = ukur(f.geometry);
            let cocok: ItemIsi | undefined;
            if (SATUAN_ISI.has(jenis)) {
                let terbaik = 1.5;
                for (const it of sisa) {
                    if (it.jenis !== jenis) continue;
                    const d = Math.hypot(it.pusat[0] - u.pusat[0], it.pusat[1] - u.pusat[1]);
                    const rasio = it.luas > 0 ? u.luas / it.luas : 0;
                    if (d < terbaik && rasio > 0.75 && rasio < 1.33) {
                        terbaik = d;
                        cocok = it;
                    }
                }
            } else {
                cocok = urutanDasar.get(jenis)?.shift();
            }

            const gaya = gayaIsi(p);
            const teks = this.label(p);
            if (cocok) {
                sisa.delete(cocok);
                cocok.layer.setLatLngs(latLngsDari(f.geometry));
                cocok.layer.setStyle(gaya);
                cocok.layer.getElement()?.classList.remove('nr-isi-luar', 'nr-isi-hilang');
                if (teks) {
                    if (cocok.layer.getTooltip()) cocok.layer.setTooltipContent(teks);
                    else cocok.layer.bindTooltip(teks, OPSI_LABEL);
                    cocok.layer.getTooltip()?.setLatLng(this.posisiLabel(cocok.layer));
                } else if (cocok.layer.getTooltip()) {
                    cocok.layer.unbindTooltip();
                }
                baru.push({ ...cocok, tipe, pusat: u.pusat, luas: u.luas, zona });
            } else {
                const layer = L.polygon(latLngsDari(f.geometry), { ...gaya, pane: 'nrLahanIsi', interactive: false });
                if (teks) layer.bindTooltip(teks, OPSI_LABEL);
                layer.addTo(this.grup);
                layer.getTooltip()?.setLatLng(this.posisiLabel(layer));
                layer.getElement()?.classList.add(SATUAN_ISI.has(jenis) ? 'nr-isi-muncul' : 'nr-isi-pudar-masuk');
                baru.push({ layer, jenis, tipe, pusat: u.pusat, luas: u.luas, zona });
            }
        }

        for (const it of sisa) this.hapus(it.layer);
        this.item = baru;
        this.saring(this.batas);
        this.terapkanSembunyi();
    }

    /**
     * Sembunyikan isi hasil menurut jenis (mis. 'slot') dan menurut nomor zona (id server); hanya tampilan, hitungan tidak berubah.
     * Berlaku juga untuk isi yang datang kemudian.
     */
    setSembunyi(jenis: Iterable<string>, zona: Iterable<number>): void {
        this.sembunyiJenis = new Set(jenis);
        this.sembunyiZona = new Set(zona);
        this.terapkanSembunyi();
    }

    private terapkanSembunyi(): void {
        for (const it of this.item) {
            const sembunyi = this.sembunyiJenis.has(it.jenis) || (it.zona !== null && this.sembunyiZona.has(it.zona));
            it.layer.getElement()?.classList.toggle('nr-isi-sembunyi', sembunyi);
            it.layer.getTooltip()?.getElement()?.classList.toggle('nr-isi-sembunyi', sembunyi);
        }
    }

    /**
     * Zona yang sedang ditarik (id server -> cincin baru): unit/kavling/slot zona itu yang keluar zona langsung memudar,
     * bagian lain zona itu (koridor, inti, aspal parkir) disamarkan sampai hasil server datang. null = lepas semua.
     */
    saringZona(id: number | null, cincin?: L.LatLng[][]): void {
        if (id === null) this.zonaTarik.clear();
        else if (cincin) this.zonaTarik.set(id, cincin.map((r) => r.map((t) => L.latLng(t.lat, t.lng))));
        this.saring(this.batas);
    }

    /**
     * Label ringkasan ("N lantai · M kamar") ditaruh di luar tepi atas lahan supaya tidak menutupi denah; tanpa batas lahan,
     * di tengah bentuknya.
     */
    private posisiLabel(layer: L.Polygon): L.LatLng {
        if (!this.batas) return layer.getBounds().getCenter();
        const b = L.latLngBounds(this.batas);
        return L.latLng(b.getNorth(), b.getCenter().lng);
    }

    /** Batas lahan saat ini (atau null). Dipotong ke batas ini dan unit/kavling yang keluar batas dipudarkan. */
    saring(batas: L.LatLng[] | null): void {
        this.batas = batas && batas.length >= 3 ? batas.map((t) => L.latLng(t.lat, t.lng)) : null;
        this.pasangPotong();
        for (const it of this.item) {
            it.layer.getTooltip()?.setLatLng(this.posisiLabel(it.layer));
            const el = it.layer.getElement();
            if (!el) continue;
            const zona = it.zona !== null ? this.zonaTarik.get(it.zona) : undefined;
            if (!SATUAN_ISI.has(it.jenis)) {
                el.classList.toggle('nr-isi-luar', !!zona);
                continue;
            }
            // Titik sudut ditarik 10% ke pusatnya dulu, supaya unit yang tepat menempel batas tidak dianggap keluar.
            const c = it.layer.getBounds().getCenter();
            const titik = cincinPoligon(it.layer).map((t) => L.latLng(c.lat + 0.9 * (t.lat - c.lat), c.lng + 0.9 * (t.lng - c.lng)));
            const keluarLahan = this.batas ? !titik.every((t) => didalam(t, this.batas!)) : false;
            const keluarZona = zona ? !titik.every((t) => didalam(t, zona[0]) && !zona.slice(1).some((lubang) => didalam(t, lubang))) : false;
            el.classList.toggle('nr-isi-luar', keluarLahan || keluarZona);
        }
    }

    kosongkan(): void {
        for (const it of this.item) this.hapus(it.layer);
        this.item = [];
    }

    hancurkan(): void {
        this.kosongkan();
        this.peta.off('zoomstart', this.lepasPotong);
        this.peta.off('zoomend viewreset', this.pasangPotong);
        this.lepasPotong();
    }

    private hapus(layer: L.Polygon): void {
        const el = layer.getElement();
        if (!el) {
            this.grup.removeLayer(layer);
            return;
        }
        el.classList.add('nr-isi-hilang');
        layer.unbindTooltip();
        window.setTimeout(() => this.grup.removeLayer(layer), LAMA_HILANG);
    }

    /** Potong pane isi ke batas lahan (clip-path dalam koordinat layer point, sama dengan koordinat pane). */
    private pasangPotong(): void {
        const pane = this.peta.getPane('nrLahanIsi');
        if (!pane) return;
        if (!this.batas) {
            pane.style.clipPath = '';
            return;
        }
        const titik = this.batas.map((t) => this.peta.latLngToLayerPoint(t));
        pane.style.clipPath = `polygon(${titik.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ')})`;
    }

    private lepasPotong(): void {
        const pane = this.peta.getPane('nrLahanIsi');
        if (pane) pane.style.clipPath = '';
    }
}

function cincinPoligon(layer: L.Polygon): L.LatLng[] {
    const ll = layer.getLatLngs() as unknown[];
    const datar = (x: unknown): L.LatLng[] => (Array.isArray(x) ? x.flatMap(datar) : [x as L.LatLng]);
    return datar(ll);
}
