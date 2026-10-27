/** Data bersama UI (design-system.md bagian 8, 11). ID persona dan layer mengikuti kontrak API (docs/SISTEM.md bagian 2). */
import type { LayerKey, Persona } from '@/types';
import type { Dwi } from './bahasa';

export const PERSONA_IDS: Persona[] = ['commuter', 'driver', 'social_vibe', 'zen'];

export const PERSONA: Record<Persona, { label: string; ikon: string; no: string; tag: Dwi; desc: Dwi }> = {
    commuter: { label: 'Commuter', ikon: 'tram-front', no: '01', tag: ['Akses transit paling utama', 'Transit access comes first'], desc: ['Mengutamakan akses transit, seperti stasiun dan halte.', 'Prioritises transit access, such as stations and bus stops.'] },
    driver: { label: 'Driver', ikon: 'car', no: '02', tag: ['Dekat Gerbang Tol', 'Toll Gate Nearby'], desc: ['Fokus pencarian jarak radius dengan gerbang tol terdekat.', 'Prioritises radius distance to the nearest toll gates.'] },
    social_vibe: { label: 'Social & Vibe', ikon: 'coffee', no: '03', tag: ['Dekat seru-serunya kota', 'Close to the city buzz'], desc: ['Mengutamakan hiburan, kafe, dan restoran.', 'Prioritises entertainment, cafés, and restaurants.'] },
    zen: { label: 'Zen', ikon: 'leaf', no: '04', tag: ['Tenang, hijau, lega', 'Quiet, green, spacious'], desc: ['Mengutamakan udara yang lebih bersih dan taman atau ruang terbuka hijau di dekat rumah.', 'Prioritises cleaner air and parks or green open space close to home.'] },
};

export const FRASA: Dwi[] = [
    ['Belum mendukung aktivitasmu, pertimbangkan lokasi lain.', 'Does not support your activities yet, consider another location.'],
    ['Mungkin kurang optimal, pertimbangkan lokasi lain.', 'May be less than ideal, consider another location.'],
    ['Cukup mendukung aktivitasmu.', 'Reasonably supports your activities.'],
    ['Sangat mendukung aktivitasmu!', 'Strongly supports your activities!'],
];

export type Simbol =
    | 'banjir' | 'genangan' | 'hijau' | 'rth' | 'akses' | 'trotoar' | 'mrt' | 'lrt' | 'krl-bogor' | 'krl-rangkas'
    | 'krl-cikarang' | 'krl-lain' | 'krl-tangerang' | 'krl-priok' | 'krl-bandara' | 'lrt-jabodebek' | 'brt' | 'stasiun' | 'halte' | 'halte-brt' | 'tol' | 'gg' | 'waktu' | 'waktu-tol' | 'legal' | 'rute' | 'jalan-kaki' | 'terpilih';

export const LAYERS: { key: LayerKey; title: Dwi; desc: Dwi; grid?: boolean; legend: [Simbol, Dwi][] }[] = [
    { key: 'historis_risiko', title: ['Historis & Risiko', 'History & Risk'], desc: ['Area rawan banjir dan risiko bencana lain.', 'Flood-prone areas and other disaster risks.'],
      legend: [['banjir', ['Indeks bahaya banjir InaRISK (merah): makin pekat makin tinggi.', 'InaRISK flood hazard index (red): darker means higher.']], ['genangan', ['Genangan nyata banjir 1 Januari 2020 (biru, BNPB).', 'Actual flooding on 1 January 2020 (blue, BNPB).']]] },
    { key: 'ekosistem', title: ['Ekosistem Mikro', 'Micro Ecosystem'], desc: ['Kafe, restoran, mal, perpustakaan, dan ruang hijau.', 'Cafés, restaurants, malls, libraries, and green space.'],
      legend: [['rth', ['Ruang terbuka hijau dan taman.', 'Green open space and parks.']], ['hijau', ['Kafe, restoran, mal, dan perpustakaan.', 'Cafés, restaurants, malls, and libraries.']]] },
    { key: 'inklusivitas', title: ['Inklusivitas', 'Inclusivity'], desc: ['Aksesibilitas pedestrian dan fasilitas umum.', 'Pedestrian accessibility and public facilities.'],
      legend: [['trotoar', ['Trotoar dan akses pedestrian layak.', 'Proper sidewalks and pedestrian access.']], ['akses', ['Titik akses dan halte ramah kursi roda.', 'Wheelchair-friendly access points and stops.']]] },
    { key: 'mobilitas', title: ['Mobilitas & Transit', 'Mobility & Transit'], desc: ['Halte, stasiun KRL/MRT, dan jalur arteri.', 'Bus stops, KRL/MRT stations, and arterial roads.'], grid: true,
      legend: [['mrt', ['MRT Lin Utara-Selatan (merah).', 'MRT North-South Line (red).']], ['krl-bogor', ['KRL Lin Bogor (merah).', 'KRL Bogor Line (red).']], ['krl-rangkas', ['KRL Lin Rangkasbitung (hijau).', 'KRL Rangkasbitung Line (green).']], ['krl-cikarang', ['KRL Lin Cikarang (biru muda).', 'KRL Cikarang Line (light blue).']], ['krl-tangerang', ['KRL Lin Tangerang (cokelat).', 'KRL Tangerang Line (brown).']], ['krl-priok', ['KRL Lin Tanjung Priok (merah muda).', 'KRL Tanjung Priok Line (pink).']], ['krl-bandara', ['KA Bandara Soekarno-Hatta (biru tua).', 'Soekarno-Hatta Airport Rail (navy).']], ['lrt', ['LRT Jakarta (oranye).', 'LRT Jakarta (orange).']], ['lrt-jabodebek', ['LRT Jabodebek Bekasi (hijau tua) & Cibubur (biru tua).', 'LRT Jabodebek Bekasi (dark green) & Cibubur (dark blue).']], ['brt', ['Rute BRT TransJakarta (warna koridor).', 'TransJakarta BRT routes (corridor colours).']], ['stasiun', ['Stasiun transit.', 'Transit station.']], ['halte-brt', ['Halte BRT TransJakarta (perbesar peta).', 'TransJakarta BRT stop (zoom in).']], ['halte', ['Halte bus lain, termasuk Biskita (perbesar peta).', 'Other bus stops, incl. Biskita (zoom in).']], ['tol', ['Gerbang tol.', 'Toll gate.']], ['gg', ['Ruas ganjil-genap DKI (perbesar peta).', 'Jakarta odd-even roads (zoom in).']]] },
    { key: 'mesin_waktu', title: ['Mesin Waktu', 'Time Machine'], desc: ['Proyek infrastruktur dan tata ruang masa depan.', 'Future infrastructure and spatial planning projects.'],
      legend: [['waktu', ['Proyek MRT dan LRT, tampil mulai tahun targetnya.', 'MRT and LRT projects, shown from their target year.']], ['waktu-tol', ['Proyek jalan tol, tampil mulai tahun targetnya.', 'Toll road projects, shown from their target year.']]] },
    { key: 'legalitas', title: ['Legalitas Lahan', 'Land Legality'], desc: ['Peruntukan lahan menurut rencana tata ruang (RDTR).', 'Planned land use according to the zoning plan (RDTR).'],
      legend: [['legal', ['Kawasan permukiman; zona RDTR tersedia untuk DKI Jakarta (ungu muda).', 'Residential areas; RDTR zoning available for Jakarta (light purple).']]] },
];

/** Warna lin untuk langkah rute (sama dengan token peta di tokens.css). */
export const WARNA_LIN: Record<string, string> = {
    bogor: 'var(--map-krl-bogor)',
    rangkas: 'var(--map-krl-rangkas)',
    cikarang: 'var(--map-krl-cikarang)',
    tangerang: 'var(--map-krl-tangerang)',
    priok: 'var(--map-krl-priok)',
    bandara: 'var(--map-krl-bandara)',
    lain: 'var(--map-krl-lain)',
    mrt: 'var(--map-mrt)',
    lrt: 'var(--map-lrt)',
    'lrt-jakarta': 'var(--map-lrt)',
    'lrt-bekasi': 'var(--map-lrt-bekasi)',
    'lrt-cibubur': 'var(--map-lrt-cibubur)',
    kalayang: 'var(--map-kalayang)',
    tj: 'var(--navy-900)',
};

type Prop = Record<string, unknown>;
const KRL_UTAMA = ['bogor', 'rangkas', 'cikarang', 'tangerang', 'priok', 'bandara'];
/**
 * Sub-fitur tiap baris legenda: fitur mana yang disembunyikan bila baris itu dimatikan (T-034).
 * Properti fitur dari /api/layers sudah diratakan (jenis, lin, brt, moda, ...).
 */
export const SUBFITUR: Partial<Record<Simbol, (p: Prop) => boolean>> = {
    banjir: (p) => p.jenis === 'banjir',
    genangan: (p) => p.jenis === 'genangan',
    rth: (p) => p.jenis === 'rth',
    hijau: (p) => p.jenis === 'poi',
    trotoar: (p) => p.jenis === 'trotoar',
    akses: (p) => p.jenis === 'akses',
    mrt: (p) => p.jenis === 'mrt',
    lrt: (p) => p.jenis === 'lrt' && !['lrt-bekasi', 'lrt-cibubur'].includes(String(p.lin)),
    'lrt-jabodebek': (p) => p.jenis === 'lrt' && ['lrt-bekasi', 'lrt-cibubur'].includes(String(p.lin)),
    'krl-tangerang': (p) => p.jenis === 'krl' && p.lin === 'tangerang',
    'krl-priok': (p) => p.jenis === 'krl' && p.lin === 'priok',
    'krl-bandara': (p) => p.jenis === 'krl' && p.lin === 'bandara',
    brt: (p) => p.jenis === 'brt',
    'krl-bogor': (p) => p.jenis === 'krl' && p.lin === 'bogor',
    'krl-rangkas': (p) => p.jenis === 'krl' && p.lin === 'rangkas',
    'krl-cikarang': (p) => p.jenis === 'krl' && p.lin === 'cikarang',
    'krl-lain': (p) => p.jenis === 'krl' && !KRL_UTAMA.includes(String(p.lin)),
    stasiun: (p) => p.jenis === 'stasiun',
    'halte-brt': (p) => p.jenis === 'halte' && p.brt === true,
    halte: (p) => p.jenis === 'halte' && p.brt !== true,
    tol: (p) => p.jenis === 'tol',
    gg: (p) => p.jenis === 'ganjil_genap',
    waktu: (p) => p.jenis === 'proyek' && p.moda !== 'tol',
    'waktu-tol': (p) => p.jenis === 'proyek' && p.moda === 'tol',
    legal: (p) => p.jenis === 'legal',
};

/** Sumber data menurut keputusan kelompok (docs/RENCANA.md bagian 2a). */
export const SUMBER: { nama: string; logo?: string }[] = [
    { nama: 'InaRISK (BNPB)', logo: '/images/logo/bnpb.png' },
    { nama: 'Batas desa BIG', logo: '/images/logo/big.png' },
    { nama: 'Pantau Banjir Jakarta', logo: '/images/logo/jakarta.png' },
    { nama: 'Overpass API (OSM)', logo: '/images/logo/osm.png' },
    { nama: 'Commute Data Platform', logo: '/images/logo/commute-data.png' },
    { nama: 'GTFS TransJakarta', logo: '/images/logo/transjakarta.png' },
    { nama: 'Biskita Trans Pakuan', logo: '/images/logo/trans-pakuan.png' },
    { nama: 'RDTR DKI Jakarta 2022', logo: '/images/logo/jakarta.png' },
    { nama: 'BNPB genangan banjir 2020', logo: '/images/logo/bnpb.png' },
    { nama: 'SatPM PM2.5 (ACAG, CC BY 4.0)' },
    { nama: 'Opentransum' },
];

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
