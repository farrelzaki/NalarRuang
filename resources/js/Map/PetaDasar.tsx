import { useEffect, useRef } from 'react';
import L from 'leaflet';

/**
 * Peta dasar Visual Explorer. Satu-satunya tempat yang boleh menyentuh `L` adalah folder Map/ (CLAUDE.md).
 * Basemap OSM standar tanpa pewarnaan ulang, zoom di kanan bawah (design-system.md 8.18, 13.2).
 */
const PUSAT_JABODETABEK: L.LatLngExpression = [-6.2, 106.82];

type Props = {
    className?: string;
};

export default function PetaDasar({ className }: Props) {
    const wadah = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!wadah.current) return;

        const peta = L.map(wadah.current, { zoomControl: false }).setView(PUSAT_JABODETABEK, 11);
        L.control.zoom({ position: 'bottomright' }).addTo(peta);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(peta);

        return () => {
            peta.remove();
        };
    }, []);

    return <div ref={wadah} className={className} role="region" aria-label="Peta Jabodetabek" />;
}
