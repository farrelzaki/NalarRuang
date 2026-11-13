/**
 * Memilih mesin peta: MapLibre GL JS + OpenFreeMap bila browser mendukung WebGL, selain itu Leaflet.
 * Bila MapLibre gagal dimuat (CDN atau gaya peta tidak terjangkau, waktu habis), peta otomatis beralih ke Leaflet.
 * `?mesin=leaflet` selalu memaksa Leaflet, untuk membandingkan atau sebagai jalan keluar saat demo.
 */
import { useState } from 'react';
import PetaExplorer, { type PropsPeta } from './PetaExplorer';
import PetaMapLibre from './PetaMapLibre';
import { mapLibreBolehDipakai } from './maplibre';

export default function PetaPilihan(props: PropsPeta) {
    const [mesin, setMesin] = useState<'maplibre' | 'leaflet'>(() => (mapLibreBolehDipakai() ? 'maplibre' : 'leaflet'));

    if (mesin === 'maplibre') {
        return (
            <PetaMapLibre
                {...props}
                onGagal={(alasan) => {
                    console.warn(`[NalarRuang] Beralih ke peta Leaflet: ${alasan}`);
                    setMesin('leaflet');
                }}
            />
        );
    }
    return <PetaExplorer {...props} />;
}
