/**
 * Tipe untuk FR-24 (listing properti, disetujui PM 26 Nov 2026) — belum bagian kontrak resmi di
 * types/index.d.ts (milik bersama Farrel/Adzkia/Nur'Afia), sengaja dipisah supaya tidak tercampur
 * sampai Farrel/Adzkia/Nur'Afia sepakat membekukannya di sana. Lihat docs/RENCANA.md TBD-12.
 */
import type { FeatureCollection, Point } from 'geojson';

export type TipePerumahan = 'rumah' | 'kos' | 'apartemen';
export type HargaSatuan = 'jual' | 'sewa_bulan' | 'sewa_tahun';

export type PerumahanRequest = {
    nama: string;
    deskripsi?: string;
    tipe: TipePerumahan;
    harga?: number;
    harga_satuan?: HargaSatuan;
    kontak_wa: string;
    lat: number;
    lng: number;
};

export type PerumahanUnggahResponse = { id: number; token_kelola: string; kedaluwarsa_pada: string };

export type PerumahanProperties = {
    id: number;
    nama: string;
    deskripsi: string | null;
    tipe: TipePerumahan;
    harga: number | null;
    harga_satuan: HargaSatuan | null;
    kontak_wa: string;
};

export type PerumahanFeatureCollection = FeatureCollection<Point, PerumahanProperties>;
