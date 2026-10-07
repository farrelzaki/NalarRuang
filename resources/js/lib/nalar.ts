/** Data bersama UI (design-system.md bagian 8, 11). ID persona dan layer mengikuti kontrak API (docs/SISTEM.md bagian 2). */
import type { LayerKey, Persona } from '@/types';

export const PERSONA_IDS: Persona[] = ['commuter', 'driver', 'social_vibe', 'zen'];

export const PERSONA: Record<Persona, { label: string; ikon: string; no: string; tag: string; desc: string }> = {
    commuter: { label: 'Commuter', ikon: 'tram-front', no: '01', tag: 'Akses transit paling utama', desc: 'Mengutamakan akses transit, seperti stasiun dan halte.' },
    driver: { label: 'Driver', ikon: 'car', no: '02', tag: 'Jalan lancar, tol dekat', desc: 'Mengutamakan akses jalan utama dan gerbang tol.' },
    social_vibe: { label: 'Social & Vibe', ikon: 'coffee', no: '03', tag: 'Dekat seru-serunya kota', desc: 'Mengutamakan hiburan, kafe, dan restoran.' },
    zen: { label: 'Zen', ikon: 'leaf', no: '04', tag: 'Tenang, hijau, lega', desc: 'Mengutamakan keamanan, minim polusi, dan ruang terbuka hijau.' },
};

export const FRASA = [
    'Belum mendukung aktivitasmu, pertimbangkan lokasi lain.',
    'Mungkin kurang optimal, pertimbangkan lokasi lain.',
    'Cukup mendukung aktivitasmu.',
    'Sangat mendukung aktivitasmu!',
];

export type Simbol =
    | 'banjir' | 'hijau' | 'rth' | 'akses' | 'trotoar' | 'mrt' | 'lrt' | 'krl-bogor' | 'krl-rangkas'
    | 'krl-cikarang' | 'krl-lain' | 'stasiun' | 'halte' | 'waktu' | 'legal' | 'rute' | 'jalan-kaki' | 'terpilih';

export const LAYERS: { key: LayerKey; title: string; desc: string; grid?: boolean; legend: [Simbol, string][] }[] = [
    { key: 'historis_risiko', title: 'Historis & Risiko', desc: 'Area rawan banjir dan risiko bencana lain.',
      legend: [['banjir', 'Area rawan banjir (merah). Mengindikasikan area historis genangan air.']] },
    { key: 'ekosistem', title: 'Ekosistem Mikro', desc: 'Kafe, restoran, ritel, dan ruang hijau.',
      legend: [['hijau', 'Ruang terbuka hijau, taman, dan fasilitas gaya hidup.']] },
    { key: 'inklusivitas', title: 'Inklusivitas', desc: 'Aksesibilitas pedestrian dan fasilitas umum.',
      legend: [['trotoar', 'Trotoar dan akses pedestrian layak.'], ['akses', 'Titik akses ramah disabilitas.']] },
    { key: 'mobilitas', title: 'Mobilitas & Transit', desc: 'Halte, stasiun KRL/MRT, dan jalur arteri.', grid: true,
      legend: [['mrt', 'Jalur MRT (oranye).'], ['krl-bogor', 'KRL Merah (Bogor).'], ['krl-rangkas', 'KRL Hijau (Rangkas).'], ['krl-cikarang', 'KRL Biru (Cikarang).'], ['lrt', 'Jalur LRT (ungu).'], ['stasiun', 'Stasiun transit.']] },
    { key: 'mesin_waktu', title: 'Mesin Waktu', desc: 'Proyek infrastruktur dan tata ruang masa depan.',
      legend: [['waktu', 'Proyek transportasi/LRT masa depan yang sedang dibangun.']] },
    { key: 'legalitas', title: 'Legalitas Lahan', desc: 'Gambaran status kepemilikan dan peruntukan.',
      legend: [['legal', 'Pemetaan bidang tanah dan zona legal (ungu muda).']] },
];

export const SUMBER = ['InaRISK (BNPB)', 'DEMNAS (BIG)', 'IQAir', 'BPS', 'Overpass API (OSM)', 'GTFS Transjakarta', 'Jakarta Satu Data', 'ATR/BPN', 'JUTPI Phase 3'];

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
