/** Data bersama UI (design-system.md bagian 8, 11). ID persona dan layer mengikuti kontrak API (docs/SISTEM.md bagian 2). */
import type { LayerKey, Persona } from '@/types';
import type { Dwi } from './bahasa';

export const PERSONA_IDS: Persona[] = ['commuter', 'driver', 'social_vibe', 'zen'];

export const PERSONA: Record<Persona, { label: string; ikon: string; no: string; tag: Dwi; desc: Dwi }> = {
    commuter: { label: 'Commuter', ikon: 'tram-front', no: '01', tag: ['Akses transit paling utama', 'Transit access comes first'], desc: ['Mengutamakan akses transit, seperti stasiun dan halte.', 'Prioritises transit access, such as stations and bus stops.'] },
    driver: { label: 'Driver', ikon: 'car', no: '02', tag: ['Jalan lancar, tol dekat', 'Smooth roads, toll nearby'], desc: ['Mengutamakan akses jalan utama dan gerbang tol.', 'Prioritises access to main roads and toll gates.'] },
    social_vibe: { label: 'Social & Vibe', ikon: 'coffee', no: '03', tag: ['Dekat seru-serunya kota', 'Close to the city buzz'], desc: ['Mengutamakan hiburan, kafe, dan restoran.', 'Prioritises entertainment, cafés, and restaurants.'] },
    zen: { label: 'Zen', ikon: 'leaf', no: '04', tag: ['Tenang, hijau, lega', 'Quiet, green, spacious'], desc: ['Mengutamakan keamanan, minim polusi, dan ruang terbuka hijau.', 'Prioritises safety, low pollution, and green open space.'] },
};

export const FRASA: Dwi[] = [
    ['Belum mendukung aktivitasmu, pertimbangkan lokasi lain.', 'Does not support your activities yet, consider another location.'],
    ['Mungkin kurang optimal, pertimbangkan lokasi lain.', 'May be less than ideal, consider another location.'],
    ['Cukup mendukung aktivitasmu.', 'Reasonably supports your activities.'],
    ['Sangat mendukung aktivitasmu!', 'Strongly supports your activities!'],
];

export type Simbol =
    | 'banjir' | 'hijau' | 'rth' | 'akses' | 'trotoar' | 'mrt' | 'lrt' | 'krl-bogor' | 'krl-rangkas'
    | 'krl-cikarang' | 'krl-lain' | 'stasiun' | 'halte' | 'waktu' | 'legal' | 'rute' | 'jalan-kaki' | 'terpilih';

export const LAYERS: { key: LayerKey; title: Dwi; desc: Dwi; grid?: boolean; legend: [Simbol, Dwi][] }[] = [
    { key: 'historis_risiko', title: ['Historis & Risiko', 'History & Risk'], desc: ['Area rawan banjir dan risiko bencana lain.', 'Flood-prone areas and other disaster risks.'],
      legend: [['banjir', ['Area rawan banjir (merah). Mengindikasikan area historis genangan air.', 'Flood-prone area (red). Indicates historical waterlogging.']]] },
    { key: 'ekosistem', title: ['Ekosistem Mikro', 'Micro Ecosystem'], desc: ['Kafe, restoran, ritel, dan ruang hijau.', 'Cafés, restaurants, retail, and green space.'],
      legend: [['hijau', ['Ruang terbuka hijau, taman, dan fasilitas gaya hidup.', 'Green open space, parks, and lifestyle amenities.']]] },
    { key: 'inklusivitas', title: ['Inklusivitas', 'Inclusivity'], desc: ['Aksesibilitas pedestrian dan fasilitas umum.', 'Pedestrian accessibility and public facilities.'],
      legend: [['trotoar', ['Trotoar dan akses pedestrian layak.', 'Proper sidewalks and pedestrian access.']], ['akses', ['Titik akses ramah disabilitas.', 'Disability-friendly access points.']]] },
    { key: 'mobilitas', title: ['Mobilitas & Transit', 'Mobility & Transit'], desc: ['Halte, stasiun KRL/MRT, dan jalur arteri.', 'Bus stops, KRL/MRT stations, and arterial roads.'], grid: true,
      legend: [['mrt', ['Jalur MRT (oranye).', 'MRT line (orange).']], ['krl-bogor', ['KRL Merah (Bogor).', 'KRL Red (Bogor).']], ['krl-rangkas', ['KRL Hijau (Rangkas).', 'KRL Green (Rangkas).']], ['krl-cikarang', ['KRL Biru (Cikarang).', 'KRL Blue (Cikarang).']], ['lrt', ['Jalur LRT (ungu).', 'LRT line (purple).']], ['stasiun', ['Stasiun transit.', 'Transit station.']]] },
    { key: 'mesin_waktu', title: ['Mesin Waktu', 'Time Machine'], desc: ['Proyek infrastruktur dan tata ruang masa depan.', 'Future infrastructure and spatial planning projects.'],
      legend: [['waktu', ['Proyek transportasi/LRT masa depan yang sedang dibangun.', 'Future transport/LRT projects under construction.']]] },
    { key: 'legalitas', title: ['Legalitas Lahan', 'Land Legality'], desc: ['Gambaran status kepemilikan dan peruntukan.', 'Overview of ownership status and land use.'],
      legend: [['legal', ['Pemetaan bidang tanah dan zona legal (ungu muda).', 'Land parcels and legal zones (light purple).']]] },
];

/** Sumber data menurut keputusan kelompok (docs/RENCANA.md bagian 2a). */
export const SUMBER = ['InaRISK (BNPB)', 'Pantau Banjir Jakarta', 'IQAir', 'Overpass API (OSM)', 'Commute Data Platform', 'GTFS TransJakarta', 'Biskita Trans Pakuan', 'BHUMI ATR/BPN'];

export function cx(...kelas: (string | false | null | undefined)[]): string {
    return kelas.filter(Boolean).join(' ');
}

export function rupiah(n: number): string {
    return 'Rp ' + n.toLocaleString('id-ID');
}

/** Persona sesi: hanya sessionStorage (CLAUDE.md aturan 2, FR-14). */
const KUNCI_PERSONA = 'nalarruang.persona';

export function bacaPersonaSesi(): Persona[] | null {
    try {
        const v = JSON.parse(sessionStorage.getItem(KUNCI_PERSONA) ?? 'null');
        return Array.isArray(v) && v.length ? v.filter((p: string) => (PERSONA_IDS as string[]).includes(p)) : null;
    } catch {
        return null;
    }
}

export function simpanPersonaSesi(p: Persona[]): boolean {
    try {
        sessionStorage.setItem(KUNCI_PERSONA, JSON.stringify(p));
        return true;
    } catch {
        return false;
    }
}
