/**
 * Penyunting zona Uji Lahan (FR-23), mirip elemen "Garage" / "Building" / "Amenity" di TestFit: tiap zona (bangunan,
 * parkir, taman) bisa ditarik sendiri. Hanya Leaflet, tanpa plugin.
 *
 * - Titik sudut zona (termasuk tepi dalam zona berlubang) bisa digeser.
 * - Pegangan tengah memindahkan seluruh zona; tanda × di pegangan menghapus zona.
 * - Zona dari server (bawaan pola) baru menjadi "zona pengguna" begitu salah satunya ditarik, ditambah, atau dihapus.
 *
 * Koordinat ditukar sebagai GeoJSON [lng, lat] (konversi hanya di folder Map/).
 */
import L from 'leaflet';
import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { JenisZona, ZonaLahanMasuk, ZonaLahanProps } from '@/types';

export const WARNA_ZONA: Record<JenisZona, string> = { bangunan: '#3b6fd8', parkir: '#4b5563', taman: '#22a35a' };

type Zona = { jenis: JenisZona; cincin: L.LatLng[][]; idServer: number };

function keLatLng(c: Position[][]): L.LatLng[][] {
    // Titik penutup cincin dibuang; Leaflet menutup sendiri.
    return c.map((r) => r.slice(0, -1).map(([lng, lat]) => L.latLng(lat, lng)));
}

function keCincin(c: L.LatLng[][]): Position[][] {
    return c.map((r) => {
        const p = r.map((t) => [Number(t.lng.toFixed(7)), Number(t.lat.toFixed(7))]);
        return [...p, [...p[0]]];
    });
}

function pusat(c: L.LatLng[][]): L.LatLng {
    const luar = c[0] ?? [];
    const n = luar.length || 1;
    return L.latLng(luar.reduce((s, t) => s + t.lat, 0) / n, luar.reduce((s, t) => s + t.lng, 0) / n);
}

function ikonSudut(jenis: JenisZona): L.DivIcon {
    return L.divIcon({ className: `nr-zona-sudut nr-zona-sudut--${jenis}`, iconSize: [11, 11], iconAnchor: [5.5, 5.5] });
}

function ikonGeser(jenis: JenisZona, label: string, judulHapus: string): L.DivIcon {
    return L.divIcon({
        className: `nr-zona-geser nr-zona-geser--${jenis}`,
        // Ukuran mengikuti isi (CSS); jangkar di tengah lewat transform di CSS.
        iconSize: null as unknown as L.PointExpression,
        iconAnchor: [0, 0],
        html: `<span class="nr-zona-geser__isi"><span class="nr-zona-geser__label">${label}</span><button type="button" class="nr-zona-geser__hapus" data-hapus title="${judulHapus}" aria-label="${judulHapus}">×</button></span>`,
    });
}

export type TeksZona = { label: Record<JenisZona, string>; hapus: string };

export class AlatZona {
    private peta: L.Map;
    private grup: L.LayerGroup;
    private zona: Zona[] = [];
    private manual = false;
    private poligon: L.Polygon[] = [];
    private terakhirKirim = 0;
    private tertunda: (() => void) | null = null;
    private onUbah: (zona: ZonaLahanMasuk[], tarik: boolean) => void;
    private onTarik: (idServer: number, cincin: L.LatLng[][]) => void;
    private teks: TeksZona;
    /** True selama sebuah zona ditarik; tampilan dari server ditunda sampai tarikan selesai. */
    ditarik = false;

    constructor(
        peta: L.Map,
        onUbah: (zona: ZonaLahanMasuk[], tarik: boolean) => void,
        onTarik: (idServer: number, cincin: L.LatLng[][]) => void,
        teks: TeksZona,
    ) {
        this.peta = peta;
        this.onUbah = onUbah;
        this.onTarik = onTarik;
        this.teks = teks;
        this.grup = L.layerGroup().addTo(peta);
    }

    setTeks(teks: TeksZona): void {
        this.teks = teks;
    }

    /**
     * Tampilkan zona. `manual` (zona pengguna, belum dipotong) didahulukan supaya pegangan tetap di tempat yang ditarik;
     * tanpa itu dipakai zona bawaan dari server.
     */
    tampilkan(fc: FeatureCollection<Polygon | MultiPolygon, ZonaLahanProps> | null | undefined, manual: ZonaLahanMasuk[] | null): void {
        const jalankan = () => {
            if (manual) {
                this.zona = manual.map((z, i) => ({ jenis: z.jenis, cincin: keLatLng(z.geometri.coordinates), idServer: i }));
                this.manual = true;
            } else {
                this.zona = (fc?.features ?? []).flatMap((f) => {
                    const g = f.geometry;
                    // Zona bawaan selalu Polygon; MultiPolygon (jarang) diambil bagian pertamanya.
                    const c = g.type === 'Polygon' ? g.coordinates : g.coordinates[0];
                    return c?.length ? [{ jenis: f.properties.jenis, cincin: keLatLng(c), idServer: f.properties.id }] : [];
                });
                this.manual = false;
            }
            this.gambar();
        };
        if (this.ditarik) this.tertunda = jalankan;
        else jalankan();
    }

    /** Tambah zona baru berbentuk kotak seluas kira-kira 15 % lahan di tengah lahan. */
    tambah(jenis: JenisZona, lahan: L.LatLng[]): void {
        if (lahan.length < 3) return;
        const b = L.latLngBounds(lahan);
        const c = b.getCenter();
        const dLat = (b.getNorth() - b.getSouth()) * 0.2;
        const dLng = (b.getEast() - b.getWest()) * 0.2;
        this.zona.push({
            jenis,
            cincin: [[L.latLng(c.lat + dLat, c.lng - dLng), L.latLng(c.lat + dLat, c.lng + dLng), L.latLng(c.lat - dLat, c.lng + dLng), L.latLng(c.lat - dLat, c.lng - dLng)]],
            idServer: -1,
        });
        this.manual = true;
        this.gambar();
        this.kirim(false);
    }

    kosongkan(): void {
        this.zona = [];
        this.manual = false;
        this.gambar();
    }

    hancurkan(): void {
        this.grup.clearLayers();
        this.grup.remove();
    }

    private gambar(): void {
        this.grup.clearLayers();
        this.poligon = [];
        this.zona.forEach((z, i) => {
            const warna = WARNA_ZONA[z.jenis];
            const pol = L.polygon(z.cincin, {
                pane: 'nrZona',
                interactive: false,
                color: warna,
                weight: 2,
                dashArray: '6 4',
                fill: false,
            }).addTo(this.grup);
            this.poligon[i] = pol;

            z.cincin.forEach((cincin, r) => {
                cincin.forEach((t, k) => {
                    const m = L.marker(t, { icon: ikonSudut(z.jenis), draggable: true, keyboard: false, zIndexOffset: 800, pane: 'markerPane' }).addTo(this.grup);
                    m.on('drag', () => {
                        z.cincin[r][k] = m.getLatLng();
                        pol.setLatLngs(z.cincin);
                        this.saatTarik(i);
                    });
                    m.on('dragend', () => this.akhirTarik());
                });
            });

            const g = L.marker(pusat(z.cincin), {
                icon: ikonGeser(z.jenis, this.teks.label[z.jenis], this.teks.hapus),
                draggable: true,
                keyboard: false,
                zIndexOffset: 900,
            }).addTo(this.grup);
            let awal = g.getLatLng();
            let asal: L.LatLng[][] = [];
            g.on('dragstart', () => {
                awal = g.getLatLng();
                asal = z.cincin.map((r) => r.map((t) => L.latLng(t.lat, t.lng)));
            });
            g.on('drag', () => {
                const kini = g.getLatLng();
                const dLat = kini.lat - awal.lat;
                const dLng = kini.lng - awal.lng;
                z.cincin = asal.map((r) => r.map((t) => L.latLng(t.lat + dLat, t.lng + dLng)));
                pol.setLatLngs(z.cincin);
                this.saatTarik(i);
            });
            g.on('dragend', () => this.akhirTarik());
            g.on('click', (e: L.LeafletMouseEvent) => {
                const sasaran = e.originalEvent?.target as HTMLElement | null;
                if (!sasaran?.closest('[data-hapus]')) return;
                L.DomEvent.stop(e.originalEvent);
                this.zona.splice(i, 1);
                this.manual = true;
                this.gambar();
                this.kirim(false);
            });
        });
    }

    private saatTarik(i: number): void {
        this.ditarik = true;
        this.manual = true;
        const z = this.zona[i];
        if (z && z.idServer >= 0) this.onTarik(z.idServer, z.cincin);
        const kini = performance.now();
        if (kini - this.terakhirKirim >= 100) {
            this.terakhirKirim = kini;
            this.kirim(true);
        }
    }

    private akhirTarik(): void {
        this.ditarik = false;
        // Keadaan di alat ini yang paling baru; tampilan dari server yang tertunda sudah usang.
        this.tertunda = null;
        this.kirim(false);
        this.gambar();
    }

    private kirim(tarik: boolean): void {
        if (!this.manual) return;
        this.onUbah(
            this.zona.map((z) => ({ jenis: z.jenis, geometri: { type: 'Polygon', coordinates: keCincin(z.cincin) } })),
            tarik,
        );
    }
}
