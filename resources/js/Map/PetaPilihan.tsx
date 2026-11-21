/**
 * Memilih mesin peta: MapLibre GL JS + OpenFreeMap bila browser mendukung WebGL, selain itu Leaflet.
 * Bila MapLibre gagal dimuat (CDN atau gaya peta tidak terjangkau, waktu habis), peta otomatis beralih ke Leaflet.
 * `?mesin=leaflet` selalu memaksa Leaflet, untuk membandingkan atau sebagai jalan keluar saat demo.
 * Pergantian mesin mempertahankan pusat dan zoom peta (`tampilan.ts`).
 */
import { useEffect, useState } from 'react';
import PetaExplorer, { type PropsPeta } from './PetaExplorer';
import PetaMapLibre from './PetaMapLibre';
import { mapLibreBolehDipakai } from './maplibre';

export type MesinPeta = 'maplibre' | 'leaflet';

type PropsPilihan = PropsPeta & {
    onMesin?: (mesin: MesinPeta) => void;
    /** Paksa Leaflet sementara (Uji Lahan FR-23 hanya ada di Leaflet); kembali ke MapLibre saat false. */
    paksaLeaflet?: boolean;
};

export default function PetaPilihan({ onMesin, paksaLeaflet, ...props }: PropsPilihan) {
    const [mesinDasar, setMesin] = useState<MesinPeta>(() => (mapLibreBolehDipakai() ? 'maplibre' : 'leaflet'));
    const mesin: MesinPeta = paksaLeaflet ? 'leaflet' : mesinDasar;
    useEffect(() => onMesin?.(mesin), [mesin]);

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
