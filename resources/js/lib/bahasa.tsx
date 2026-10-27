/**
 * Pilihan bahasa antarmuka: Indonesia (bawaan, SRS B02) atau Inggris.
 * Teks ditulis berpasangan di tempat pemakaiannya: t('Detail Lokasi', 'Location Details').
 * Pilihan bahasa disimpan di localStorage; ini preferensi tampilan, bukan data pribadi atau persona.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Bahasa = 'id' | 'en';
/** Pasangan teks [Indonesia, Inggris]. */
export type Dwi = readonly [string, string];

const KUNCI = 'nalarruang.bahasa';
let aktif: Bahasa = 'id';

/** Untuk kode di luar React (mis. popup Leaflet di Map/). */
export function bahasaAktif(): Bahasa {
    return aktif;
}

export function pilihTeks(bahasa: Bahasa, teks: string | Dwi, en?: string): string {
    if (typeof teks !== 'string') return bahasa === 'en' ? teks[1] : teks[0];
    return bahasa === 'en' && en !== undefined ? en : teks;
}

function bacaAwal(): Bahasa {
    try {
        return localStorage.getItem(KUNCI) === 'en' ? 'en' : 'id';
    } catch {
        return 'id';
    }
}

type Konteks = {
    bahasa: Bahasa;
    setBahasa: (b: Bahasa) => void;
    t: (teks: string | Dwi, en?: string) => string;
};

const KonteksBahasa = createContext<Konteks>({ bahasa: 'id', setBahasa: () => {}, t: (teks) => pilihTeks('id', teks) });

export function BahasaProvider({ children }: { children: ReactNode }) {
    const [bahasa, setState] = useState<Bahasa>(bacaAwal);
    aktif = bahasa;

    useEffect(() => {
        document.documentElement.lang = bahasa;
    }, [bahasa]);

    const setBahasa = useCallback((b: Bahasa) => {
        try {
            localStorage.setItem(KUNCI, b);
        } catch {
            // Tanpa penyimpanan, pilihan tetap berlaku selama halaman terbuka.
        }
        setState(b);
    }, []);

    const nilai = useMemo<Konteks>(() => ({ bahasa, setBahasa, t: (teks, en) => pilihTeks(bahasa, teks, en) }), [bahasa, setBahasa]);
    return <KonteksBahasa.Provider value={nilai}>{children}</KonteksBahasa.Provider>;
}

export function useBahasa(): Konteks {
    return useContext(KonteksBahasa);
}

/** Tombol ganti bahasa "ID / EN". */
export function PilihBahasa({ className, gelap }: { className?: string; gelap?: boolean }) {
    const { bahasa, setBahasa, t } = useBahasa();
    return (
        <div className={['nr-lang', gelap && 'nr-lang--dark', className].filter(Boolean).join(' ')} role="group" aria-label={t('Bahasa', 'Language')}>
            {(['id', 'en'] as const).map((b) => (
                <button key={b} type="button" className="nr-lang__opt" aria-pressed={bahasa === b} lang={b} onClick={() => setBahasa(b)} title={b === 'id' ? 'Bahasa Indonesia' : 'English'}>
                    {b.toUpperCase()}
                </button>
            ))}
        </div>
    );
}

const TIPE_KAWASAN: Record<string, string> = {
    Permukiman: 'Residential',
    'Permukiman dekat stasiun': 'Residential near station',
    'Kawasan hijau': 'Green area',
    'Pusat aktivitas': 'Activity hub',
};

const KELAS: Record<string, string> = { rendah: 'low', sedang: 'medium', tinggi: 'high' };

/** Angka desimal gaya Indonesia (1,2 km) ke gaya Inggris (1.2 km). */
const desimal = (s: string) => s.replace(/(\d),(\d)/g, '$1.$2');

/**
 * Terjemahan teks yang dikirim API (kontrak API tetap berbahasa Indonesia).
 * Pola teks di sini harus mengikuti app/Http/Controllers/Api dan app/Services/PersonaScoring.php.
 */
export function teksServer(s: string, bahasa: Bahasa = aktif): string {
    if (bahasa === 'id' || !s) return s;
    if (TIPE_KAWASAN[s]) return TIPE_KAWASAN[s];
    const aturan: [RegExp, (...m: string[]) => string][] = [
        [/^Stasiun (.*), ([\d.,]+ k?m)$/, (_, n, j) => `${n ? n + ' Station' : 'Station'}, ${desimal(j)}`],
        [/^Kafe atau restoran terdekat ([\d.,]+ k?m)$/, (_, j) => `Nearest café or restaurant ${desimal(j)}`],
        [/^Gerbang Tol (.+), ([\d.,]+ k?m)$/, (_, n, j) => `${n} toll gate, ${desimal(j)}`],
        [/^Gerbang tol terdekat ([\d.,]+ k?m)$/, (_, j) => `Nearest toll gate ${desimal(j)}`],
        [/^Area bahaya banjir kelas (\w+) \(InaRISK\)$/, (_, k) => `Flood hazard area, ${KELAS[k] ?? k} class (InaRISK)`],
        [/^Di luar area bahaya banjir InaRISK$/, () => 'Outside InaRISK flood hazard area'],
        [/^Di luar area data contoh$/, () => 'Outside the sample data area'],
        [/^Di luar cakupan NalarRuang \(Jabodetabek\)$/, () => 'Outside NalarRuang coverage (Greater Jakarta)'],
        [/^Lokasi ini di luar Jabodetabek, jadi belum bisa dinilai\.$/, () => 'This location is outside Greater Jakarta, so it cannot be rated yet.'],
        [/^Tergenang saat banjir 1 Januari 2020 \(BNPB\)$/, () => 'Flooded on 1 January 2020 (BNPB)'],
        [/^Titik ini berada di (.+), bukan kawasan hunian\.$/, (_, t) => `This point is in a non-residential area: ${t}.`],
        [/^Zona (.+) \(RDTR DKI 2022\)$/, (_, z) => `Zone ${z.replace(/KLB ([\d,]+)/, (_m: string, v: string) => `FAR ${desimal(v)}`).replace('KDB', 'BCR')} (Jakarta RDTR 2022)`],
        [/^Kawasan permukiman\.$/, () => 'Residential area.'],
        [/^NalarRuang hanya mencakup Jabodetabek\.$/, () => 'NalarRuang only covers Greater Jakarta (Jabodetabek).'],
        [/^Kami belum memahami pencarianmu\./, () => 'We could not understand your search. Try a need such as "near a station" or an area name.'],
        [/^Titik terpilih$/, () => 'Selected point'],
        [/^Belum ada kawasan yang cocok\.?$/, () => 'No matching area yet'],
        [/^Wilayah tidak ditemukan\.$/, () => 'Area not found.'],
        [/^Permukiman di area data contoh\.$/, () => 'Residential area in the sample data.'],
    ];
    // Rincian rute umum: "Jalan 9 mnt · KRL Bogor 65 mnt · Pindah 600 m · TransJakarta 9 14 mnt · Jalan 7 mnt".
    if (/^(Jalan|Ojol) \d+ mnt · /.test(s)) {
        return s
            .split(' · ')
            .map((b) => b.replace(/^Jalan (\d+) mnt$/, 'Walk $1 min').replace(/^Ojol (\d+) mnt$/, 'Ride-hailing $1 min').replace(/^Pindah (\d+) m$/, 'Transfer, walk $1 m').replace(/ (\d+) mnt$/, ' $1 min'))
            .join(' · ');
    }
    for (const [pola, ganti] of aturan) {
        const m = s.match(pola);
        if (m) return ganti(...m);
    }
    // Alasan Top 3: "Stasiun 1,2 km, 5 kafe/restoran, minim area banjir."
    if (/kafe\/restoran|minim area banjir|^Stasiun (< )?[\d,]+ km|^PM2\.5|^Taman |^Gerbang tol |^Jauh dari tol/i.test(s)) {
        const bagian = s.replace(/\.$/, '').split(', ').map((b) =>
            b
                .replace(/^stasiun ((< )?[\d,]+ km)$/i, (_, j) => `station ${desimal(j)}`)
                .replace(/^taman ((< )?[\d,]+ km)$/i, (_, j) => `park ${desimal(j)}`)
                .replace(/^gerbang tol ((< )?[\d,]+ km)$/i, (_, j) => `toll gate ${desimal(j)}`)
                .replace(/^jauh dari tol \(([\d,]+ km)\)$/i, (_, j) => `far from toll roads (${desimal(j)})`)
                .replace(/^(\d+) kafe\/restoran$/, (_, n) => `${n} cafés/restaurants`)
                .replace(/^minim area banjir$/, 'minimal flood area'),
        );
        const teks = bagian.join(', ');
        return teks.charAt(0).toUpperCase() + teks.slice(1) + '.';
    }
    return s;
}
