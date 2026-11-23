/**
 * Tipe untuk FR-24 DRAF (listing properti) — BELUM bagian kontrak resmi, sengaja dipisah dari
 * types/index.d.ts (milik bersama Farrel/Adzkia/Nur'Afia) supaya tidak tercampur dengan kontrak
 * yang sudah dibekukan. Lihat docs/RENCANA.md TBD-12.
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
