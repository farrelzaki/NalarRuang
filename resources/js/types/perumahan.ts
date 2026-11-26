/**
 * Tipe untuk FR-24 (listing properti, disetujui PM dan tim 26 Nov 2026). Sengaja tetap dipisah dari
 * types/index.d.ts (kontrak bersama Farrel/Adzkia/Nur'Afia di docs/SISTEM.md bagian 2) karena model
 * datanya berbeda (data primer pengguna, bukan sekunder publik). Lihat docs/RENCANA.md TBD-12.
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
