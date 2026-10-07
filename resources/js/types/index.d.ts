/**
 * Tipe yang mencerminkan kontrak API (docs/SISTEM.md bagian 2).
 * Milik bersama Farrel, Adzkia, dan Nur'Afia: ubah hanya setelah kontrak disepakati.
 */

export type Persona = 'commuter' | 'driver' | 'social' | 'zen';

export type LayerKey = 'historis' | 'ekosistem' | 'inklusivitas' | 'mobilitas' | 'waktu' | 'legalitas';

/** Respons GET /api/health (setup; bukan bagian kontrak fitur). */
export type HealthResponse = {
    status: 'ok' | 'error';
    database: string;
    postgis: string | null;
};
