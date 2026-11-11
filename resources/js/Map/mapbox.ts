/**
 * Pemuat Mapbox GL JS. Pustaka diambil dari CDN resmi Mapbox saat dibutuhkan, bukan dari npm,
 * sehingga package.json tidak berubah dan pengguna tanpa token tidak mengunduhnya sama sekali.
 *
 * Token: VITE_MAPBOX_TOKEN di .env (token publik `pk.…`, dibatasi per URL di dasbor Mapbox).
 * Tanpa token, tanpa WebGL, atau dengan `?mesin=leaflet`, aplikasi memakai peta Leaflet.
 */

export const VERSI_MAPBOX = '3.28.1';
const DASAR = `https://api.mapbox.com/mapbox-gl-js/v${VERSI_MAPBOX}`;

/** Gaya peta dasar: terang, dekat dengan desain "putih kayak bhumi". */
export const GAYA_MAPBOX = 'mapbox://styles/mapbox/light-v11';

export const TOKEN_MAPBOX: string = String(import.meta.env.VITE_MAPBOX_TOKEN ?? '').trim();

/** Objek global `mapboxgl` dari CDN. Tipenya sengaja longgar: paket tipe tidak dipasang. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapboxGL = any;

export function webglAda(): boolean {
    try {
        const c = document.createElement('canvas');
        return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
        return false;
    }
}

/** Mesin yang diminta lewat URL: `?mesin=leaflet` atau `?mesin=mapbox`. */
function mesinDariUrl(): string | null {
    try {
        return new URLSearchParams(window.location.search).get('mesin');
    } catch {
        return null;
    }
}

export function mapboxBolehDipakai(): boolean {
    if (mesinDariUrl() === 'leaflet') return false;
    return TOKEN_MAPBOX.startsWith('pk.') && webglAda();
}

let janji: Promise<MapboxGL> | null = null;

export function muatMapbox(batasMs = 15000): Promise<MapboxGL> {
    const w = window as unknown as { mapboxgl?: MapboxGL };
    if (w.mapboxgl) return Promise.resolve(w.mapboxgl);
    if (janji) return janji;
    janji = new Promise<MapboxGL>((selesai, gagal) => {
        if (!document.querySelector('link[data-nr-mapbox]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = `${DASAR}/mapbox-gl.css`;
            css.dataset.nrMapbox = '1';
            document.head.appendChild(css);
        }
        const js = document.createElement('script');
        js.src = `${DASAR}/mapbox-gl.js`;
        js.async = true;
        const waktu = window.setTimeout(() => gagal(new Error('Mapbox GL JS terlalu lama dimuat.')), batasMs);
        js.onload = () => {
            window.clearTimeout(waktu);
            if (w.mapboxgl) selesai(w.mapboxgl);
            else gagal(new Error('Mapbox GL JS dimuat, tetapi objek mapboxgl tidak ada.'));
        };
        js.onerror = () => {
            window.clearTimeout(waktu);
            gagal(new Error('Mapbox GL JS gagal dimuat dari CDN.'));
        };
        document.head.appendChild(js);
    }).catch((e) => {
        janji = null;
        throw e;
    });
    return janji;
}
