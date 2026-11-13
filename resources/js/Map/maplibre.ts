/**
 * Pemuat MapLibre GL JS (fork open-source Mapbox GL JS, lisensi BSD-3-Clause).
 * Pustaka diambil dari CDN jsDelivr saat dibutuhkan, bukan dari npm, sehingga package.json tidak berubah.
 *
 * Peta dasar: OpenFreeMap (tile vektor OpenStreetMap, gratis, tanpa kunci API, tanpa kuota).
 * Tanpa WebGL atau dengan `?mesin=leaflet`, aplikasi memakai peta Leaflet.
 */

export const VERSI_MAPLIBRE = '5.24.0';
const DASAR = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSI_MAPLIBRE}/dist`;

/** Gaya peta dasar: Positron, terang dan bersih, dekat dengan desain "putih kayak bhumi". */
export const GAYA_PETA = 'https://tiles.openfreemap.org/styles/positron';

/** Objek global `maplibregl` dari CDN. Tipenya sengaja longgar: paket tipe tidak dipasang. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapLibreGL = any;

export function webglAda(): boolean {
    try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        return false;
    }
}

/** Mesin yang diminta lewat URL: `?mesin=leaflet` memaksa Leaflet. */
function mesinDariUrl(): string | null {
    try {
        return new URLSearchParams(window.location.search).get('mesin');
    } catch {
        return null;
    }
}

export function mapLibreBolehDipakai(): boolean {
    return mesinDariUrl() !== 'leaflet' && webglAda();
}

let janji: Promise<MapLibreGL> | null = null;

export function muatMapLibre(batasMs = 15000): Promise<MapLibreGL> {
    const w = window as unknown as { maplibregl?: MapLibreGL };
    if (w.maplibregl) return Promise.resolve(w.maplibregl);
    if (janji) return janji;
    janji = new Promise<MapLibreGL>((selesai, gagal) => {
        if (!document.querySelector('link[data-nr-maplibre]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `${DASAR}/maplibre-gl.css`;
            css.dataset.nrMaplibre = '1';
            document.head.appendChild(css);
        }
        const js = document.createElement('script');
        js.src = `${DASAR}/maplibre-gl.js`;
        js.async = true;
        const waktu = window.setTimeout(() => gagal(new Error('MapLibre GL JS terlalu lama dimuat.')), batasMs);
        js.onload = () => {
            window.clearTimeout(waktu);
            if (w.maplibregl) selesai(w.maplibregl);
            else gagal(new Error('MapLibre GL JS dimuat, tetapi objek maplibregl tidak ada.'));
        };
        js.onerror = () => {
            window.clearTimeout(waktu);
            gagal(new Error('MapLibre GL JS gagal dimuat dari CDN.'));
        };
        document.head.appendChild(js);
    }).catch((e) => {
        janji = null;
        throw e;
    });
    return janji;
}
