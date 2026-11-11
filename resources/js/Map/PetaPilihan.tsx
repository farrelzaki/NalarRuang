/**
 * Memilih mesin peta: Mapbox GL JS bila token ada dan browser mendukung WebGL, selain itu Leaflet.
 * Bila Mapbox gagal dimuat (CDN, token ditolak, waktu habis), peta otomatis beralih ke Leaflet.
 * `?mesin=leaflet` selalu memaksa Leaflet, untuk membandingkan atau sebagai jalan keluar saat demo.
 */
import { useState } from 'react';
import PetaExplorer, { type PropsPeta } from './PetaExplorer';
import PetaMapbox from './PetaMapbox';
import { mapboxBolehDipakai } from './mapbox';

export default function PetaPilihan(props: PropsPeta) {
    const [mesin, setMesin] = useState<'mapbox' | 'leaflet'>(() => (mapboxBolehDipakai() ? 'mapbox' : 'leaflet'));

    if (mesin === 'mapbox') {
        return (
            <PetaMapbox
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
