/**
 * Pratinjau 3D Uji Lahan (FR-23) dengan three.js. Modul ini hanya dimuat saat pengguna membuka tampilan 3D
 * (lewat React.lazy di Pages/Peta.tsx), jadi peta Leaflet dan halaman lain tidak ikut menanggung beratnya.
 *
 * Bentuk diambil dari `bangunModelLahan` (lib/ekstrusi3d), sama dengan 3D di peta: gaya realistis (dinding, pita jendela,
 * dak, atap limas genteng, tandon) atau gaya warna (unit berwarna per tipe + garis tiap lantai). Pelat tipis (jalan, taman,
 * parkir, slot) jadi bidang datar; atap limas dibentuk miring sungguhan (di peta MapLibre disusun bertingkat).
 *
 * Koordinat: x ke timur, z ke selatan (meter dari pusat lahan), y ke atas. Konversi GeoJSON [lng, lat] di sini saja.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Geometry, Polygon, Position } from 'geojson';
import type { LahanResponse } from '@/types';
import { atapLimas, bangunModelLahan, JENIS_PELAT, type Gaya3D } from '@/lib/ekstrusi3d';


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

/** Atap limas dari `atapLimas` (meter, [x, utara]) setinggi y0 sampai puncak: dua trapesium, dua segitiga, dan plafon tritisan. */
function geometriLimas(a: NonNullable<ReturnType<typeof atapLimas>>, y0: number): THREE.BufferGeometry {
    const v = ([x, n]: [number, number], y: number) => [x, y, -n];
    const [A, B, C, D] = a.sudut.map((t) => v(t, y0));
    const [R1, R2] = a.bubungan.map((t) => v(t, y0 + a.tinggi));
    const segitiga = [A, B, R2, A, R2, R1, C, D, R1, C, R1, R2, B, C, R2, D, A, R1, A, C, B, A, D, C];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segitiga.flat(), 3));
    return g;
}

/** Garis keliling sebuah cincin pada ketinggian y. */
function garisCincin(cincin: Position[], p: Proyeksi, y: number): THREE.Vector3[] {
    const titik = cincin.map(p).map(([x, n]) => new THREE.Vector3(x, y, -n));
    const pasangan: THREE.Vector3[] = [];
    for (let i = 0; i < titik.length - 1; i++) pasangan.push(titik[i], titik[i + 1]);
    return pasangan;
}

export type Adegan3D = { perbarui(data: LahanResponse, lahan: Polygon | null, gaya?: Gaya3D): void; hancurkan(): void };

/** Model 3D isi hasil (tanpa tanah, lampu, kamera): dipakai pratinjau dan ekspor .glb. Meter; x ke timur, z ke selatan, y ke atas. */
export function buatModel(d: LahanResponse, lahanGeo: Polygon | null, gaya: Gaya3D = 'realistis'): THREE.Group {
    const isi = new THREE.Group();
    const p = proyeksi(d.pusat.lat, d.pusat.lng);
    const tinggiLantai = d.ringkasan?.tinggi_lantai_m ?? 3.2;
    const lantai = Math.max(1, d.kapasitas.lantai || 1);

    // Kumpulkan geometri per jenis + warna lalu gabungkan: ratusan unit tetap ringan digambar.
    const ember = new Map<string, { jenis: string; warna: string; geo: THREE.BufferGeometry[] }>();
    const masuk = (jenis: string, warna: string, geo: THREE.BufferGeometry) => {
        const kunci = `${jenis}|${warna}`;
        const e = ember.get(kunci) ?? { jenis, warna, geo: [] };
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
    if (lahanGeo) garis.push(...garisCincin(lahanGeo.coordinates[0], p, 0.15));

    // Bentuk sama dengan 3D di peta (lib/ekstrusi3d): pelat tipis jadi bidang datar, balok diekstrusi, atap limas dibentuk miring.
    const model = bangunModelLahan(d, lahanGeo, gaya);
    for (const f of model.prisma) {
        const { jenis, tinggi, dasar, warna } = f.properties;
        const s = bentuk(f.geometry.coordinates, p);
        if (!s) continue;
        if (JENIS_PELAT.includes(jenis)) masuk(jenis, warna, datar(s, Math.min(0.16, tinggi * 0.2)));
        else masuk(jenis, warna, ekstrusi(s, tinggi - dasar, dasar));
    }
    for (const l of model.limas) {
        const atap = atapLimas(l.cincin.slice(0, -1).map(p));
        if (atap) masuk(l.jenis, l.warna, geometriLimas(atap, l.dasar));
    }

    // Gerbang: dua tiang di titik gerbang; pintu: kanopi kecil.
    for (const a of d.akses?.features ?? []) {
        const [x, n] = p(a.geometry.coordinates);
        if (a.properties.jenis === 'gerbang') {
            const setengah = Number(a.properties.lebar ?? 6) / 2 + 0.3;
            for (const dx of [-setengah, setengah]) {
                const tiang = new THREE.BoxGeometry(0.6, 3, 0.6);
                tiang.translate(x + dx, 1.5, -n);
                masuk('gerbang', '#b45309', tiang);
            }
        } else {
            const kanopi = new THREE.BoxGeometry(4, 0.3, 4);
            kanopi.translate(x, 3.2, -n);
            masuk('pintu', '#7c3aed', kanopi);
        }
    }

    // Gaya warna: garis tiap lantai di sekeliling zona gedung, supaya jumlah lantai terbaca seperti di TestFit
    // (gaya realistis sudah memperlihatkan lantai lewat pita jendela).
    if (gaya === 'warna' && d.tipe !== 'rumah' && d.tipe !== 'pribadi') {
        for (const z of d.zona?.features ?? []) {
            if (z.properties.jenis !== 'bangunan') continue;
            for (const c of poligon(z.geometry)) {
                for (let i = 1; i <= lantai; i++) {
                    for (const r of c) garis.push(...garisCincin(r, p, i * tinggiLantai));
                }
            }
        }
    }

    for (const e of ember.values()) {
        const g = mergeGeometries(e.geo, false);
        e.geo.forEach((x) => x.dispose());
        if (!g) continue;
        g.computeVertexNormals();
        const kaca = e.jenis === 'kaca' || e.jenis === 'lobi';
        const mat = new THREE.MeshLambertMaterial({
            color: new THREE.Color(e.warna),
            transparent: kaca,
            opacity: kaca ? 0.92 : 1,
            side: JENIS_PELAT.includes(e.jenis) || e.jenis === 'atap' ? THREE.DoubleSide : THREE.FrontSide,
        });
        const mesh = new THREE.Mesh(g, mat);
        mesh.name = e.jenis; // nama terbaca di Blender saat model .glb dibuka
        isi.add(mesh);
    }
    if (garis.length) {
        const g = new THREE.BufferGeometry().setFromPoints(garis);
        isi.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1d2433, transparent: true, opacity: 0.35 })));
    }
    return isi;
}

export function buatAdegan(wadah: HTMLElement, data: LahanResponse, lahan: Polygon | null, gaya: Gaya3D = 'realistis'): Adegan3D {
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

    const bangun = (d: LahanResponse, lahanGeo: Polygon | null, g: Gaya3D) => {
        scene.remove(isi);
        bersihkan(isi);
        isi = buatModel(d, lahanGeo, g);
        scene.add(isi);

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
    bangun(data, lahan, gaya);

    let jalan = true;
    const putar = () => {
        if (!jalan) return;
        kendali.update();
        renderer.render(scene, kamera);
        requestAnimationFrame(putar);
    };
    requestAnimationFrame(putar);

    return {
        perbarui: (d, l, g = 'realistis') => bangun(d, l, g),
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
