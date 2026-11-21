/**
 * Pusat dan zoom terakhir peta, dibagi antar-mesin (MapLibre dan Leaflet) supaya pergantian mesin
 * (mis. Uji Lahan yang hanya ada di Leaflet) tidak melempar pengguna kembali ke tampilan awal.
 * Zoom disimpan dalam skala Leaflet; MapLibre memakai zoom Leaflet − 1 (ubin 512 px).
 */
export type Tampilan = { lat: number; lng: number; zoomLeaflet: number };

let terakhir: Tampilan | null = null;

export const simpanTampilan = (t: Tampilan): void => {
    terakhir = t;
};

export const tampilanTerakhir = (): Tampilan | null => terakhir;
