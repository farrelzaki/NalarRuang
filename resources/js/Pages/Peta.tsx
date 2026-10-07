import { Head } from '@inertiajs/react';
import PetaDasar from '@/Map/PetaDasar';

/** Visual Explorer (UI01). Kerangka setup: peta saja; panel dan kontrol menyusul per FR. */
export default function Peta() {
    return (
        <>
            <Head title="Peta" />
            <main className="relative h-dvh w-full bg-map-ground">
                <PetaDasar className="absolute inset-0" />
            </main>
        </>
    );
}
