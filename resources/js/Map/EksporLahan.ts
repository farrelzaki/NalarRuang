/**
 * Ekspor model 3D Uji Lahan (FR-23) ke berkas .glb (glTF biner) untuk Blender, SketchUp, atau penampil 3D lain.
 * Modul ini membawa three.js dan GLTFExporter, jadi hanya dimuat saat pengguna menekan Unduh (import() dinamis di Pages/Peta.tsx).
 *
 * Model sama dengan pratinjau 3D (`buatModel` di Lahan3D.ts): satuan meter, x ke timur, z ke selatan, y ke atas, titik nol di pusat lahan.
 * Bahan Lambert diganti MeshStandardMaterial supaya warnanya terbaca benar oleh penampil glTF.
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { Polygon } from 'geojson';
import type { LahanResponse } from '@/types';
import { buatModel } from './Lahan3D';

export async function eksporGLB(data: LahanResponse, lahan: Polygon | null): Promise<ArrayBuffer> {
    const model = buatModel(data, lahan);
    model.name = 'NalarRuang-Uji-Lahan';
    model.traverse((o) => {
        const m = o as THREE.Mesh;
        const lama = m.material as THREE.MeshLambertMaterial | undefined;
        if (!m.isMesh || !lama) return;
        m.material = new THREE.MeshStandardMaterial({ color: lama.color, roughness: 0.9, metalness: 0, transparent: lama.transparent, opacity: lama.opacity, side: lama.side });
        lama.dispose();
    });
    const adegan = new THREE.Scene();
    adegan.name = 'NalarRuang';
    adegan.userData = { sumber: 'NalarRuang Uji Lahan', tipe: data.tipe, lantai: data.kapasitas.lantai, jumlah: data.kapasitas.jumlah, satuan: data.kapasitas.satuan, luas_m2: data.luas_m2 };
    adegan.add(model);
    try {
        const hasil = await new GLTFExporter().parseAsync(adegan, { binary: true, onlyVisible: true });
        if (!(hasil instanceof ArrayBuffer)) throw new Error('Ekspor GLB tidak menghasilkan data biner.');
        return hasil;
    } finally {
        model.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            (m.material as THREE.Material | undefined)?.dispose();
        });
    }
}
