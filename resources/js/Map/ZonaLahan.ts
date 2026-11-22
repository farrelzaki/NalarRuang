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
import type { JenisZona, ZonaLahan, ZonaLahanProps } from '@/types';
import { buatUid, WARNA_ZONA } from '@/lib/layerLahan';

export { WARNA_ZONA };

/** Data layer yang ikut zona (nama, kunci, sembunyi, induk); dikirim balik apa adanya saat zona berubah. */
type MetaZona = Omit<ZonaLahan, 'jenis' | 'geometri'>;

type Zona = { jenis: JenisZona; cincin: L.LatLng[][]; idServer: number; meta: MetaZona; /** Larangan otomatis dari area banjir: dihitung server, hanya digambar. */ otomatis?: boolean };

const esc = (t: string): string => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const IKON_KUNCI = '<svg class="nr-zona-geser__kunci" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

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
 * Titik label/pegangan geser: rata-rata titik sudut bila jatuh di dalam zona; bila tidak (zona berbentuk U atau
 * berlubang, mis. parkir yang mengelilingi menara), titik kisi di dalam zona yang paling dekat ke rata-rata itu.
 */
function pusat(c: L.LatLng[][]): L.LatLng {
    const luar = c[0] ?? [];
    const n = luar.length || 1;
    const rata = L.latLng(luar.reduce((s, t) => s + t.lat, 0) / n, luar.reduce((s, t) => s + t.lng, 0) / n);
    const masuk = (t: L.LatLng) => didalam(t, luar) && !c.slice(1).some((lubang) => didalam(t, lubang));
    if (masuk(rata) || luar.length < 3) return rata;

    const b = L.latLngBounds(luar);
    let terbaik: L.LatLng | null = null;
    let jarak = Infinity;
    const N = 24;
    for (let i = 1; i < N; i++) {
        for (let j = 1; j < N; j++) {
            const t = L.latLng(b.getSouth() + ((b.getNorth() - b.getSouth()) * i) / N, b.getWest() + ((b.getEast() - b.getWest()) * j) / N);
            if (!masuk(t)) continue;
            const d = (t.lat - rata.lat) ** 2 + (t.lng - rata.lng) ** 2;
            if (d < jarak) {
                jarak = d;
                terbaik = t;
            }
        }
    }
    return terbaik ?? rata;
}

function ikonSudut(jenis: JenisZona, pilih = false): L.DivIcon {
    const s = pilih ? 13 : 11;
    return L.divIcon({ className: `nr-zona-sudut nr-zona-sudut--${jenis}${pilih ? ' nr-zona-sudut--pilih' : ''}`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
}

function ikonGeser(jenis: JenisZona, label: string, judulHapus: string, kunci: boolean, sorot: boolean): L.DivIcon {
    const aksi = kunci ? IKON_KUNCI : `<button type="button" class="nr-zona-geser__hapus" data-hapus title="${esc(judulHapus)}" aria-label="${esc(judulHapus)}">×</button>`;
    return L.divIcon({
        className: `nr-zona-geser nr-zona-geser--${jenis}${kunci ? ' nr-zona-geser--kunci' : ''}${sorot ? ' nr-zona-geser--sorot' : ''}`,
        // Ukuran mengikuti isi (CSS); jangkar di tengah lewat transform di CSS.
        iconSize: null as unknown as L.PointExpression,
        iconAnchor: [0, 0],
        // Ringkas: titik berwarna; nama dan tombol hapus muncul saat kursor di atasnya atau zona dipilih di panel layer.
        html: `<span class="nr-zona-geser__isi" title="${esc(label)}"><span class="nr-zona-geser__label">${esc(label)}</span>${aksi}</span>`,
    });
}

export type TeksZona = { label: Record<JenisZona, string>; otomatis: string; hapus: string };

export class AlatZona {
    private grup: L.LayerGroup;
    private zona: Zona[] = [];
    private manual = false;
    private poligon: L.Polygon[] = [];
    private terakhirKirim = 0;
    private onUbah: (zona: ZonaLahan[], tarik: boolean) => void;
    /**
     * uid zona yang dipilih (dari panel layer atau klik pegangannya di peta): garis lebih tebal, dan hanya zona inilah yang
     * menampilkan titik sudut, supaya titik sudut zona yang berimpit tidak saling menumpuk.
     */
    private sorotUid: string | null = null;
    private onTarik: (idServer: number, cincin: L.LatLng[][]) => void;
    /** Pengguna memilih zona di peta (klik/tarik pegangannya) atau melepas pilihan (klik peta kosong). */
    private onPilih?: (uid: string | null) => void;
    private teks: TeksZona;
    /** True selama sebuah zona ditarik; tampilan dari server ditunda sampai tarikan selesai. */
    ditarik = false;

    constructor(
        peta: L.Map,
        onUbah: (zona: ZonaLahan[], tarik: boolean) => void,
        onTarik: (idServer: number, cincin: L.LatLng[][]) => void,
        teks: TeksZona,
        onPilih?: (uid: string | null) => void,
    ) {
        this.onUbah = onUbah;
        this.onTarik = onTarik;
        this.teks = teks;
        this.onPilih = onPilih;
        this.grup = L.layerGroup().addTo(peta);
        // Klik di peta (bukan di pegangan) melepas pilihan zona.
        peta.on('click', () => {
            if (this.sorotUid !== null) this.pilih(null);
        });
    }

    /** Pilih zona dari peta: digambar ulang di sini dan dikabarkan ke panel layer. */
    private pilih(uid: string | null): void {
        this.sorot(uid);
        this.onPilih?.(uid);
    }

    setTeks(teks: TeksZona): void {
        this.teks = teks;
    }

    /**
     * Tampilkan zona. `manual` (zona pengguna, belum dipotong) didahulukan supaya pegangan tetap di tempat yang ditarik;
     * tanpa itu dipakai zona bawaan dari server.
     */
    tampilkan(fc: FeatureCollection<Polygon | MultiPolygon, ZonaLahanProps> | null | undefined, manual: ZonaLahan[] | null): void {
        const jalankan = () => {
            if (manual) {
                this.zona = manual.map((z, i) => {
                    const { jenis, geometri, ...meta } = z;
                    return { jenis, cincin: keLatLng(geometri.coordinates), idServer: i, meta };
                });
                // Larangan otomatis (banjir) ada di hasil server saja; digambar tanpa pegangan dan tidak ikut dikirim balik.
                for (const f of fc?.features ?? []) {
                    if (!f.properties.otomatis) continue;
                    const g = f.geometry;
                    const c = g.type === 'Polygon' ? g.coordinates : g.coordinates[0];
                    if (c?.length) this.zona.push({ jenis: f.properties.jenis, cincin: keLatLng(c), idServer: f.properties.id, meta: { uid: `otomatis-${f.properties.id}`, nama: this.teks.otomatis }, otomatis: true });
                }
                this.manual = true;
            } else {
                this.zona = (fc?.features ?? []).flatMap((f) => {
                    const g = f.geometry;
                    // Zona bawaan selalu Polygon; MultiPolygon (jarang) diambil bagian pertamanya.
                    const c = g.type === 'Polygon' ? g.coordinates : g.coordinates[0];
                    return c?.length ? [{ jenis: f.properties.jenis, cincin: keLatLng(c), idServer: f.properties.id, meta: { uid: `srv-${f.properties.id}`, ...(f.properties.otomatis ? { nama: this.teks.otomatis } : {}) }, ...(f.properties.otomatis ? { otomatis: true } : {}) }] : [];
                });
                this.manual = false;
            }
            this.gambar();
        };
        // Selama zona ditarik, tampilan dari server dilewati: keadaan di alat ini yang paling baru.
        if (!this.ditarik) jalankan();
    }

    /**
     * Tambah zona baru. Dengan `geometri` (hasil penempatan pintar) zona dibuat di bentuk itu; tanpa itu berbentuk kotak seluas
     * kira-kira 15 % lahan di tengah lahan.
     */
    tambah(jenis: JenisZona, lahan: L.LatLng[], geometri?: Polygon | null): void {
        let cincin: L.LatLng[][];
        if (geometri) {
            cincin = keLatLng(geometri.coordinates);
        } else {
            if (lahan.length < 3) return;
            const b = L.latLngBounds(lahan);
            const c = b.getCenter();
            const dLat = (b.getNorth() - b.getSouth()) * 0.2;
            const dLng = (b.getEast() - b.getWest()) * 0.2;
            cincin = [[L.latLng(c.lat + dLat, c.lng - dLng), L.latLng(c.lat + dLat, c.lng + dLng), L.latLng(c.lat - dLat, c.lng + dLng), L.latLng(c.lat - dLat, c.lng - dLng)]];
        }
        const uid = buatUid();
        this.zona.push({
            jenis,
            cincin,
            idServer: -1,
            meta: { uid, tarik: Date.now() },
        });
        this.manual = true;
        // Zona baru langsung terpilih supaya titik sudutnya bisa ditarik.
        this.sorotUid = uid;
        this.gambar();
        this.kirim(false);
        this.onPilih?.(uid);
    }

    /** Sorot zona dengan uid ini (null = tanpa sorotan); digambar ulang bila berubah. */
    sorot(uid: string | null): void {
        if (this.sorotUid === uid) return;
        this.sorotUid = uid;
        if (!this.ditarik) this.gambar();
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
            // Layer disembunyikan dari peta (hitungan tetap memakainya); layer terkunci hanya digambar, tanpa pegangan.
            if (z.meta.sembunyi) return;
            const kunci = !!z.meta.kunci || !!z.otomatis;
            const sorot = this.sorotUid === z.meta.uid;
            const warna = WARNA_ZONA[z.jenis];
            const pol = L.polygon(z.cincin, {
                pane: 'nrZona',
                interactive: false,
                color: warna,
                weight: sorot ? 4 : 2,
                dashArray: kunci && !z.otomatis ? undefined : '6 4',
                // Larangan bangun diarsir merah tipis supaya jelas bahwa tidak ada yang dibangun di sana.
                fill: z.jenis === 'larangan',
                fillColor: warna,
                fillOpacity: 0.14,
            }).addTo(this.grup);
            this.poligon[i] = pol;

            // Titik sudut hanya untuk zona yang dipilih (dan tidak terkunci), digambar paling atas.
            if (!kunci && sorot) z.cincin.forEach((cincin, r) => {
                cincin.forEach((t, k) => {
                    const m = L.marker(t, { icon: ikonSudut(z.jenis, true), draggable: true, keyboard: false, zIndexOffset: 1200, pane: 'markerPane' }).addTo(this.grup);
                    m.on('dragstart', () => {
                        z.meta.tarik = Date.now();
                    });
                    m.on('drag', () => {
                        z.cincin[r][k] = m.getLatLng();
                        pol.setLatLngs(z.cincin);
                        this.saatTarik(i);
                    });
                    m.on('dragend', () => this.akhirTarik());
                });
            });

            const g = L.marker(pusat(z.cincin), {
                icon: ikonGeser(z.jenis, z.meta.nama ?? this.teks.label[z.jenis], this.teks.hapus, kunci, sorot),
                draggable: !kunci,
                keyboard: false,
                zIndexOffset: 900,
            }).addTo(this.grup);
            let awal = g.getLatLng();
            let asal: L.LatLng[][] = [];
            g.on('dragstart', () => {
                z.meta.tarik = Date.now();
                // Menarik pegangan juga memilih zona itu (tanpa menggambar ulang di tengah tarikan).
                if (this.sorotUid !== z.meta.uid) {
                    this.sorotUid = z.meta.uid;
                    this.onPilih?.(z.meta.uid);
                }
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
                if (kunci || !sasaran?.closest('[data-hapus]')) {
                    // Klik pegangan = pilih zona (klik lagi = lepas).
                    if (!z.otomatis) this.pilih(sorot ? null : z.meta.uid);
                    return;
                }
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
        this.kirim(false);
        this.gambar();
    }

    private kirim(tarik: boolean): void {
        if (!this.manual) return;
        this.onUbah(
            this.zona.filter((z) => !z.otomatis).map((z) => ({ ...z.meta, jenis: z.jenis, geometri: { type: 'Polygon' as const, coordinates: keCincin(z.cincin) } })),
            tarik,
        );
    }
}
