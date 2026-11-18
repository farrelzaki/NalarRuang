/**
 * Gerbang dan pintu Uji Lahan (FR-23): penanda yang bisa ditambah, digeser, dan dihapus sendiri.
 * - `gerbang` (kendaraan, mobil/motor) selalu menempel ke tepi lahan;
 * - `pintu` (masuk/keluar gedung) selalu menempel ke tepi zona bangunan.
 * Server memakai titik ini untuk jalan akses, letak parkir, lobi, dan jalur pejalan. Hanya Leaflet, tanpa plugin.
 * Koordinat ditukar sebagai [lng, lat] (konversi hanya di folder Map/).
 */
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import type { AksesLahanMasuk, JenisAkses } from '@/types';

export type TeksAkses = { label: Record<JenisAkses, string>; hapus: string };

/** Titik terdekat pada kumpulan cincin (meter kira-kira, lng diskalakan cos lintang). */
function tempel(t: L.LatLng, cincin: L.LatLng[][]): L.LatLng {
    return tempelRuas(t, cincin).titik;
}

/** Seperti tempel(), plus arah satuan ruas tepi tempat titik itu menempel (sumbu x = timur terskala, y = utara). */
function tempelRuas(t: L.LatLng, cincin: L.LatLng[][]): { titik: L.LatLng; ux: number; uy: number } {
    let terbaik = t;
    let arah: [number, number] = [1, 0];
    let jarak = Infinity;
    const kos = Math.cos((t.lat * Math.PI) / 180);
    for (const r of cincin) {
        for (let i = 0; i < r.length; i++) {
            const a = r[i];
            const b = r[(i + 1) % r.length];
            const ax = a.lng * kos;
            const bx = b.lng * kos;
            const px = t.lng * kos;
            const dx = bx - ax;
            const dy = b.lat - a.lat;
            const p2 = dx * dx + dy * dy;
            const u = p2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (t.lat - a.lat) * dy) / p2)) : 0;
            const qx = ax + u * dx;
            const qy = a.lat + u * dy;
            const d = (px - qx) ** 2 + (t.lat - qy) ** 2;
            if (d < jarak) {
                jarak = d;
                terbaik = L.latLng(qy, qx / kos);
                const n = Math.sqrt(p2) || 1;
                arah = [dx / n, dy / n];
            }
        }
    }
    return { titik: terbaik, ux: arah[0], uy: arah[1] };
}

const LEBAR_MIN = 2.5;
const LEBAR_MAKS = 30;

/** Dua ujung gerbang selebar `lebar` m di sepanjang arah tepi. */
function ujung(c: L.LatLng, ux: number, uy: number, lebar: number): [L.LatLng, L.LatLng] {
    const kos = Math.cos((c.lat * Math.PI) / 180);
    const m = lebar / 2 / 111320;
    return [L.latLng(c.lat - m * uy, c.lng - (m * ux) / kos), L.latLng(c.lat + m * uy, c.lng + (m * ux) / kos)];
}

function ikon(jenis: JenisAkses, teks: TeksAkses): L.DivIcon {
    return L.divIcon({
        className: `nr-akses nr-akses--${jenis}`,
        iconSize: null as unknown as L.PointExpression,
        iconAnchor: [0, 0],
        html: `<span class="nr-akses__isi"><span class="nr-akses__titik"></span><span class="nr-akses__label">${teks.label[jenis]}</span><button type="button" class="nr-akses__hapus" data-hapus title="${teks.hapus}" aria-label="${teks.hapus}">×</button></span>`,
    });
}

export class AlatAkses {
    private peta: L.Map;
    private grup: L.LayerGroup;
    private akses: AksesLahanMasuk[] = [];
    private lahan: L.LatLng[] = [];
    private gedung: L.LatLng[][] = [];
    private terakhirKirim = 0;
    private onUbah: (akses: AksesLahanMasuk[], tarik: boolean) => void;
    private teks: TeksAkses;
    /** Lebar gerbang bila belum diatur dan belum ada dari server (m). */
    private lebarBawaan = 6;
    /** True selama gerbang/pintu ditarik; tampilan baru ditunda sampai tarikan selesai. */
    ditarik = false;

    constructor(peta: L.Map, onUbah: (akses: AksesLahanMasuk[], tarik: boolean) => void, teks: TeksAkses) {
        this.peta = peta;
        this.onUbah = onUbah;
        this.teks = teks;
        this.grup = L.layerGroup().addTo(peta);
        // Label digeser beberapa piksel ke luar lahan, jadi posisinya dihitung ulang setiap zoom.
        peta.on('zoomend', () => {
            if (!this.ditarik && this.akses.length) this.gambar();
        });
    }

    /** Letak label: sedikit di luar tepi (menjauhi pusat lahan untuk gerbang, pusat gedung untuk pintu) agar garis dan ujungnya terlihat. */
    private letakLabel(titik: L.LatLng, jenis: JenisAkses): L.LatLng {
        const acuan = jenis === 'gerbang' ? this.lahan : (this.gedung[0] ?? []);
        if (acuan.length < 3) return titik;
        const pusat = this.peta.latLngToLayerPoint(L.latLngBounds(acuan).getCenter());
        const p = this.peta.latLngToLayerPoint(titik);
        const d = p.subtract(pusat);
        const n = Math.hypot(d.x, d.y) || 1;
        return this.peta.layerPointToLatLng(p.add(L.point((d.x / n) * 26, (d.y / n) * 26)));
    }

    setTeks(teks: TeksAkses): void {
        this.teks = teks;
    }

    setLebarBawaan(lebar: number): void {
        this.lebarBawaan = lebar;
    }

    /**
     * Tampilkan akses. Posisi dari server (sudah menempel ke tepi lahan/gedung) dipakai bila ada untuk id yang sama;
     * selain itu posisi lokal.
     */
    tampilkan(
        akses: AksesLahanMasuk[],
        dariServer: FeatureCollection<Point, { id: number; jenis: JenisAkses; lebar: number }> | null | undefined,
        lahan: L.LatLng[],
        gedung: L.LatLng[][],
    ): void {
        this.lahan = lahan;
        this.gedung = gedung;
        if (this.ditarik) return;
        const server = new Map((dariServer?.features ?? []).map((f) => [f.properties.id, f] as const));
        this.akses = akses.map((a, i) => {
            const s = server.get(i);
            // Hanya bila jenisnya sama: setelah hapus, nomor lama dari server bisa menunjuk akses lain.
            return s && s.properties.jenis === a.jenis
                ? { jenis: a.jenis, titik: [s.geometry.coordinates[0], s.geometry.coordinates[1]], lebar: a.lebar ?? s.properties.lebar }
                : a;
        });
        this.gambar();
    }

    /** Tambah gerbang di tengah sisi lahan paling selatan yang belum punya gerbang, atau pintu di tepi gedung terdekat. */
    tambah(jenis: JenisAkses, lahan: L.LatLng[], gedung: L.LatLng[][]): AksesLahanMasuk[] | null {
        this.lahan = lahan;
        this.gedung = gedung;
        let titik: L.LatLng | null = null;
        if (jenis === 'gerbang' && lahan.length >= 3) {
            const sisi = lahan
                .map((a, i) => {
                    const b = lahan[(i + 1) % lahan.length];
                    return L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
                })
                .sort((p, q) => p.lat - q.lat);
            const ada = this.akses.filter((a) => a.jenis === 'gerbang').map((a) => L.latLng(a.titik[1], a.titik[0]));
            titik = sisi.find((p) => ada.every((g) => this.peta.distance(p, g) > 10)) ?? sisi[0];
        } else if (jenis === 'pintu' && gedung.length) {
            const gerbang = this.akses.find((a) => a.jenis === 'gerbang');
            const acuan = gerbang
                ? L.latLng(gerbang.titik[1], gerbang.titik[0])
                : L.latLng(Math.min(...lahan.map((t) => t.lat)), lahan.reduce((s, t) => s + t.lng, 0) / Math.max(1, lahan.length));
            titik = tempel(acuan, gedung);
        }
        if (!titik) return null;
        this.akses = [...this.akses, { jenis, titik: [titik.lng, titik.lat] }];
        this.gambar();
        this.kirim(false);
        return this.akses;
    }

    kosongkan(): void {
        this.akses = [];
        this.grup.clearLayers();
    }

    hancurkan(): void {
        this.grup.clearLayers();
        this.grup.remove();
    }

    private tepi(jenis: JenisAkses): L.LatLng[][] {
        return jenis === 'gerbang' ? (this.lahan.length >= 3 ? [this.lahan] : []) : this.gedung;
    }

    private gambar(): void {
        this.grup.clearLayers();
        this.akses.forEach((a, i) => {
            const tepi = this.tepi(a.jenis);
            const gerbang = a.jenis === 'gerbang';
            const tempelKe = (t: L.LatLng) => (tepi.length ? tempelRuas(t, tepi) : { titik: t, ux: 1, uy: 0 });
            let ruas = tempelKe(L.latLng(a.titik[1], a.titik[0]));
            let lebar = a.lebar ?? this.lebarBawaan;

            // Gerbang = garis tebal di tepi lahan dengan pegangan di tiap ujung; tiap ujung diatur sendiri.
            const garis = gerbang
                ? L.polyline(ujung(ruas.titik, ruas.ux, ruas.uy, lebar), { pane: 'nrZona', interactive: false, color: '#b45309', weight: 7, opacity: 0.9, lineCap: 'butt' }).addTo(this.grup)
                : null;
            const pegangan = gerbang
                ? ujung(ruas.titik, ruas.ux, ruas.uy, lebar).map((t) =>
                      L.marker(t, {
                          icon: L.divIcon({ className: 'nr-akses-ujung', iconSize: [14, 14], iconAnchor: [7, 7] }),
                          draggable: true,
                          keyboard: false,
                          zIndexOffset: 1300,
                      }).addTo(this.grup),
                  )
                : [];

            const label = L.marker(this.letakLabel(ruas.titik, a.jenis), {
                icon: ikon(a.jenis, this.teks),
                draggable: true,
                keyboard: false,
                zIndexOffset: 1200,
            }).addTo(this.grup);

            const susun = () => {
                const [p, q] = ujung(ruas.titik, ruas.ux, ruas.uy, lebar);
                garis?.setLatLngs([p, q]);
                pegangan[0]?.setLatLng(p);
                pegangan[1]?.setLatLng(q);
                label.setLatLng(this.letakLabel(ruas.titik, a.jenis));
                this.akses[i] = { ...this.akses[i], titik: [ruas.titik.lng, ruas.titik.lat], ...(gerbang ? { lebar } : {}) };
            };

            // Label: geser seluruh gerbang/pintu di sepanjang tepi.
            label.on('drag', () => {
                ruas = tempelKe(label.getLatLng());
                susun();
                this.saatTarik();
            });
            label.on('dragend', () => this.akhirTarik());
            label.on('click', (e: L.LeafletMouseEvent) => {
                const sasaran = e.originalEvent?.target as HTMLElement | null;
                if (!sasaran?.closest('[data-hapus]')) return;
                L.DomEvent.stop(e.originalEvent);
                this.akses = this.akses.filter((_, k) => k !== i);
                this.gambar();
                this.kirim(false);
            });

            // Ujung: hanya ujung yang ditarik yang bergerak; ujung lain tetap. Lebar 2,5–30 m.
            pegangan.forEach((h, k) => {
                let tetap = pegangan[1 - k].getLatLng();
                h.on('dragstart', () => {
                    tetap = pegangan[1 - k].getLatLng();
                });
                h.on('drag', () => {
                    let t = tempelKe(h.getLatLng()).titik;
                    const jarak = this.peta.distance(tetap, t);
                    const pakai = Math.round(Math.max(LEBAR_MIN, Math.min(LEBAR_MAKS, jarak)) * 2) / 2;
                    if (jarak > 0 && Math.abs(pakai - jarak) > 0.01) {
                        const f = pakai / jarak;
                        t = L.latLng(tetap.lat + (t.lat - tetap.lat) * f, tetap.lng + (t.lng - tetap.lng) * f);
                    }
                    lebar = pakai;
                    ruas = tempelKe(L.latLng((tetap.lat + t.lat) / 2, (tetap.lng + t.lng) / 2));
                    // Pertahankan urutan ujung supaya ujung yang dipegang tetap di bawah kursor.
                    const tengah = ruas.titik;
                    const searah = (t.lat - tengah.lat) * ruas.uy + (t.lng - tengah.lng) * Math.cos((tengah.lat * Math.PI) / 180) * ruas.ux > 0;
                    if (searah !== (k === 1)) {
                        ruas = { ...ruas, ux: -ruas.ux, uy: -ruas.uy };
                    }
                    susun();
                    this.saatTarik();
                });
                h.on('dragend', () => this.akhirTarik());
            });
        });
    }

    private saatTarik(): void {
        this.ditarik = true;
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
        this.onUbah(this.akses.map((a) => ({ jenis: a.jenis, titik: [a.titik[0], a.titik[1]], ...(a.lebar !== undefined ? { lebar: a.lebar } : {}) })), tarik);
    }
}
