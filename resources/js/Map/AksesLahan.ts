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
    let terbaik = t;
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
            }
        }
    }
    return terbaik;
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
    /** True selama gerbang/pintu ditarik; tampilan baru ditunda sampai tarikan selesai. */
    ditarik = false;

    constructor(peta: L.Map, onUbah: (akses: AksesLahanMasuk[], tarik: boolean) => void, teks: TeksAkses) {
        this.peta = peta;
        this.onUbah = onUbah;
        this.teks = teks;
        this.grup = L.layerGroup().addTo(peta);
    }

    setTeks(teks: TeksAkses): void {
        this.teks = teks;
    }

    /**
     * Tampilkan akses. Posisi dari server (sudah menempel ke tepi lahan/gedung) dipakai bila ada untuk id yang sama;
     * selain itu posisi lokal.
     */
    tampilkan(
        akses: AksesLahanMasuk[],
        dariServer: FeatureCollection<Point, { id: number; jenis: JenisAkses }> | null | undefined,
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
            return s && s.properties.jenis === a.jenis ? { jenis: a.jenis, titik: [s.geometry.coordinates[0], s.geometry.coordinates[1]] } : a;
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
            const m = L.marker(L.latLng(a.titik[1], a.titik[0]), {
                icon: ikon(a.jenis, this.teks),
                draggable: true,
                keyboard: false,
                zIndexOffset: 1200,
            }).addTo(this.grup);
            m.on('drag', () => {
                const tepi = this.tepi(a.jenis);
                const t = tepi.length ? tempel(m.getLatLng(), tepi) : m.getLatLng();
                m.setLatLng(t);
                this.akses[i] = { jenis: a.jenis, titik: [t.lng, t.lat] };
                this.ditarik = true;
                const kini = performance.now();
                if (kini - this.terakhirKirim >= 100) {
                    this.terakhirKirim = kini;
                    this.kirim(true);
                }
            });
            m.on('dragend', () => {
                this.ditarik = false;
                this.kirim(false);
            });
            m.on('click', (e: L.LeafletMouseEvent) => {
                const sasaran = e.originalEvent?.target as HTMLElement | null;
                if (!sasaran?.closest('[data-hapus]')) return;
                L.DomEvent.stop(e.originalEvent);
                this.akses = this.akses.filter((_, k) => k !== i);
                this.gambar();
                this.kirim(false);
            });
        });
    }

    private kirim(tarik: boolean): void {
        this.onUbah(this.akses.map((a) => ({ jenis: a.jenis, titik: [a.titik[0], a.titik[1]] })), tarik);
    }
}
