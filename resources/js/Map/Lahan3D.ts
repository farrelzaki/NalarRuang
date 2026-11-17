/**
 * Pratinjau 3D Uji Lahan (FR-23) dengan three.js. Modul ini hanya dimuat saat pengguna membuka tampilan 3D
 * (lewat React.lazy di Pages/Peta.tsx), jadi peta Leaflet dan halaman lain tidak ikut menanggung beratnya.
 *
 * Isi gambar diambil apa adanya dari respons POST /api/lahan:
 * - unit diekstrusi setinggi lantai x tinggi per lantai, berwarna per tipe (studio/1BR/2BR/kamar), garis tiap lantai;
 * - koridor dan inti ikut setinggi gedung; gedung parkir (pola wrap) setinggi lantai parkirnya;
 * - kavling rumah tapak menjadi rumah (tapak sesuai KDB) setinggi lantainya;
 * - jalan, taman, parkir permukaan, slot sebagai bidang datar.
 *
 * Koordinat: x ke timur, z ke selatan (meter dari pusat lahan), y ke atas. Konversi GeoJSON [lng, lat] di sini saja.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Feature, Geometry, Polygon, Position } from 'geojson';
import type { LahanResponse } from '@/types';

const WARNA_UNIT: Record<string, number> = { studio: 0x2fbf71, '1br': 0x4a90e2, '2br': 0x7b5cd6, kamar: 0x4a90e2 };
const WARNA_ATAP = [0xf2994a, 0xe8833a, 0xf5b06b];

type Proyeksi = (p: Position) => [number, number];

function proyeksi(lat0: number, lng0: number): Proyeksi {
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const ky = 110574;
    // [x, utara]; utara dipetakan ke -z oleh rotasi bentuk.
    return ([lng, lat]) => [(lng - lng0) * kx, (lat - lat0) * ky];
}

/** Daftar poligon (cincin luar + lubang) dari Polygon/MultiPolygon. */
function poligon(g: Geometry | null | undefined): Position[][][] {
    if (!g) return [];
    if (g.type === 'Polygon') return [g.coordinates];
    if (g.type === 'MultiPolygon') return g.coordinates;
    return [];
}

function bentuk(cincin: Position[][], p: Proyeksi, skala = 1): THREE.Shape | null {
    const luar = cincin[0];
    if (!luar || luar.length < 4) return null;
    let titik = luar.slice(0, -1).map(p);
    if (skala !== 1) {
        const cx = titik.reduce((s, t) => s + t[0], 0) / titik.length;
        const cy = titik.reduce((s, t) => s + t[1], 0) / titik.length;
        titik = titik.map(([x, y]) => [cx + (x - cx) * skala, cy + (y - cy) * skala]);
    }
    const s = new THREE.Shape(titik.map(([x, y]) => new THREE.Vector2(x, y)));
    if (skala === 1) {
        for (const lubang of cincin.slice(1)) {
            if (lubang.length >= 4) s.holes.push(new THREE.Path(lubang.slice(0, -1).map(p).map(([x, y]) => new THREE.Vector2(x, y))));
        }
    }
    return s;
}

/** Ekstrusi bentuk dari ketinggian y0 setebal tinggi (bidang XY diputar ke XZ, utara = -z). */
function ekstrusi(s: THREE.Shape, tinggi: number, y0 = 0): THREE.BufferGeometry {
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.05, tinggi), bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return g;
}

function datar(s: THREE.Shape, y: number): THREE.BufferGeometry {
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    return g;
}

/** Garis keliling sebuah cincin pada ketinggian y. */
function garisCincin(cincin: Position[], p: Proyeksi, y: number): THREE.Vector3[] {
    const titik = cincin.map(p).map(([x, n]) => new THREE.Vector3(x, y, -n));
    const pasangan: THREE.Vector3[] = [];
    for (let i = 0; i < titik.length - 1; i++) pasangan.push(titik[i], titik[i + 1]);
    return pasangan;
}

export type Adegan3D = { perbarui(data: LahanResponse, lahan: Polygon | null): void; hancurkan(): void };

export function buatAdegan(wadah: HTMLElement, data: LahanResponse, lahan: Polygon | null): Adegan3D {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xeef1f5);
    wadah.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xeef1f5, 600, 1600);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c2cf, 1.6));
    const matahari = new THREE.DirectionalLight(0xffffff, 1.4);
    matahari.position.set(-120, 220, 160);
    scene.add(matahari);

    const tanah = new THREE.Mesh(new THREE.CircleGeometry(1500, 48), new THREE.MeshLambertMaterial({ color: 0xe4e8ee }));
    tanah.rotation.x = -Math.PI / 2;
    tanah.position.y = -0.05;
    scene.add(tanah);

    const kamera = new THREE.PerspectiveCamera(45, 1, 0.5, 5000);
    const kendali = new OrbitControls(kamera, renderer.domElement);
    kendali.enableDamping = true;
    kendali.maxPolarAngle = Math.PI / 2.05;
    kendali.minDistance = 10;
    kendali.maxDistance = 1500;

    let isi = new THREE.Group();
    scene.add(isi);
    let pertama = true;

    const bersihkan = (g: THREE.Object3D) => {
        g.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mat = m.material as THREE.Material | THREE.Material[] | undefined;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose();
        });
    };

    const bangun = (d: LahanResponse, lahanGeo: Polygon | null) => {
        scene.remove(isi);
        bersihkan(isi);
        isi = new THREE.Group();
        scene.add(isi);

        const p = proyeksi(d.pusat.lat, d.pusat.lng);
        const tinggiLantai = d.ringkasan?.tinggi_lantai_m ?? 3.2;
        const lantai = Math.max(1, d.kapasitas.lantai || 1);
        const tinggiGedung = lantai * tinggiLantai;

        // Kumpulkan geometri per warna lalu gabungkan: ratusan unit tetap ringan digambar.
        const ember = new Map<string, { warna: number; transparan?: number; geo: THREE.BufferGeometry[] }>();
        const masuk = (kunci: string, warna: number, geo: THREE.BufferGeometry, transparan?: number) => {
            const e = ember.get(kunci) ?? { warna, transparan, geo: [] };
            if (geo.index) {
                const tanpaIndeks = geo.toNonIndexed();
                geo.dispose();
                e.geo.push(tanpaIndeks);
            } else {
                e.geo.push(geo);
            }
            ember.set(kunci, e);
        };
        const garis: THREE.Vector3[] = [];

        if (lahanGeo) {
            const s = bentuk(lahanGeo.coordinates, p);
            if (s) masuk('lahan', 0xf6f3ec, datar(s, 0));
            garis.push(...garisCincin(lahanGeo.coordinates[0], p, 0.15));
        }

        const fitur = (d.geometri_kapasitas?.features ?? []) as Feature<Geometry, Record<string, unknown>>[];
        const kdb = Math.min(0.9, Math.max(0.3, (d.intensitas?.kdb ?? 60) / 100));
        for (const f of fitur) {
            const pr = f.properties ?? {};
            const jenis = String(pr.jenis ?? '');
            for (const c of poligon(f.geometry)) {
                const s = bentuk(c, p, jenis === 'kavling' ? Math.sqrt(kdb) : 1);
                if (!s) continue;
                switch (jenis) {
                    case 'unit':
                        masuk(`unit-${pr.tipe}`, WARNA_UNIT[String(pr.tipe)] ?? 0x4a90e2, ekstrusi(s, tinggiGedung - 0.3));
                        break;
                    case 'koridor':
                        masuk('koridor', 0x59606e, ekstrusi(s, tinggiGedung - 0.6));
                        break;
                    case 'inti':
                        masuk('inti', 0x9aa3b2, ekstrusi(s, tinggiGedung + 3));
                        break;
                    case 'tapak':
                        masuk('tapak', 0x3b6fd8, ekstrusi(s, tinggiGedung));
                        break;
                    case 'kavling': {
                        masuk(`atap-${Number(pr.varian ?? 0) % 3}`, WARNA_ATAP[Number(pr.varian ?? 0) % 3], ekstrusi(s, tinggiGedung));
                        const kav = bentuk(c, p);
                        if (kav) masuk('pekarangan', 0xd9e7cf, datar(kav, 0.06));
                        break;
                    }
                    case 'parkir': {
                        const lp = Number(pr.lantai ?? 1);
                        if (lp > 1) masuk('gedung-parkir', 0x8a919c, ekstrusi(s, lp * 3), 0.85);
                        else masuk('aspal', 0x7b818b, datar(s, 0.08));
                        break;
                    }
                    case 'slot':
                        masuk('slot', 0xc9d1db, datar(s, 0.12));
                        break;
                    case 'jalan':
                        masuk('jalan', 0x6b7280, datar(s, 0.07));
                        break;
                    case 'taman':
                    case 'void':
                        masuk('taman', 0x9fd3a6, datar(s, 0.09));
                        break;
                }
            }
        }

        // Garis tiap lantai di sekeliling zona gedung, supaya jumlah lantai terbaca seperti di TestFit.
        if (d.tipe !== 'rumah') {
            for (const z of d.zona?.features ?? []) {
                if (z.properties.jenis !== 'bangunan') continue;
                for (const c of poligon(z.geometry)) {
                    for (let i = 1; i <= lantai; i++) {
                        for (const r of c) garis.push(...garisCincin(r, p, i * tinggiLantai));
                    }
                }
            }
        }

        for (const [kunci, e] of ember) {
            const g = mergeGeometries(e.geo, false);
            e.geo.forEach((x) => x.dispose());
            if (!g) continue;
            g.computeVertexNormals();
            const mat = new THREE.MeshLambertMaterial({
                color: e.warna,
                transparent: e.transparan !== undefined,
                opacity: e.transparan ?? 1,
                side: kunci === 'lahan' || kunci === 'taman' || kunci === 'jalan' || kunci === 'aspal' || kunci === 'slot' || kunci === 'pekarangan' ? THREE.DoubleSide : THREE.FrontSide,
            });
            isi.add(new THREE.Mesh(g, mat));
        }
        if (garis.length) {
            const g = new THREE.BufferGeometry().setFromPoints(garis);
            isi.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1d2433, transparent: true, opacity: 0.35 })));
        }

        if (pertama) {
            // Kamera pertama kali: pandangan miring dari tenggara, cukup jauh untuk seluruh lahan dan tinggi gedung.
            const kotak = new THREE.Box3().setFromObject(isi);
            const ukuran = kotak.getSize(new THREE.Vector3());
            const r = Math.max(ukuran.x, ukuran.z, ukuran.y * 1.5, 40);
            kamera.position.set(r * 0.9, r * 0.75 + ukuran.y, r * 1.1);
            kendali.target.set(0, ukuran.y * 0.25, 0);
            kendali.update();
            pertama = false;
        }
    };

    const ukur = () => {
        const w = wadah.clientWidth || 1;
        const h = wadah.clientHeight || 1;
        renderer.setSize(w, h, false);
        kamera.aspect = w / h;
        kamera.updateProjectionMatrix();
    };
    const pengamat = new ResizeObserver(ukur);
    pengamat.observe(wadah);
    ukur();
    bangun(data, lahan);

    let jalan = true;
    const putar = () => {
        if (!jalan) return;
        kendali.update();
        renderer.render(scene, kamera);
        requestAnimationFrame(putar);
    };
    requestAnimationFrame(putar);

    return {
        perbarui: (d, l) => bangun(d, l),
        hancurkan: () => {
            jalan = false;
            pengamat.disconnect();
            kendali.dispose();
            bersihkan(scene);
            renderer.dispose();
            renderer.domElement.remove();
        },
    };
}
