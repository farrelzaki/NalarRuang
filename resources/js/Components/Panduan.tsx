/**
 * Onboarding Visual Explorer: tur singkat yang menyorot tombol utama satu per satu.
 * Muncul sekali per peramban (tanda di localStorage, bukan preferensi persona), bisa dibuka lagi dari menu.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBahasa, type Dwi } from '@/lib/bahasa';
import { Ikon } from './Dasar';

const KUNCI = 'nr-panduan-v1';

export function sudahLihatPanduan(): boolean {
    try {
        return localStorage.getItem(KUNCI) === 'selesai';
    } catch {
        return false;
    }
}

function tandaiSelesai() {
    try {
        localStorage.setItem(KUNCI, 'selesai');
    } catch {
        /* mode privat: tur muncul lagi di kunjungan berikutnya */
    }
}

type Langkah = { target?: string; ikon: string; judul: Dwi; isi: Dwi };

const LANGKAH: Langkah[] = [
    {
        ikon: 'map-pin',
        judul: ['Selamat datang di NalarRuang', 'Welcome to NalarRuang'],
        isi: [
            'Temukan kawasan hunian di Jabodetabek yang cocok dengan gaya hidupmu. Ikuti tur singkat ini untuk mengenal fitur utamanya.',
            'Find residential areas in Greater Jakarta that fit your lifestyle. Take this short tour to get to know the main features.',
        ],
    },
    {
        target: 'persona',
        ikon: 'users',
        judul: ['Persona gaya hidup', 'Lifestyle personas'],
        isi: [
            'Pilih Commuter, Driver, Social & Vibe, atau Zen. Rekomendasi dan skor di peta menyesuaikan persona ini, dan bisa diganti kapan saja.',
            'Choose Commuter, Driver, Social & Vibe, or Zen. Recommendations and scores follow these personas, and you can change them anytime.',
        ],
    },
    {
        target: 'cari',
        ikon: 'search',
        judul: ['Cari kawasan', 'Search areas'],
        isi: [
            'Tulis kebutuhanmu, misalnya "dekat stasiun di Depok", atau nama kelurahan. NalarRuang memberi Top 3 kawasan yang paling cocok.',
            'Type what you need, e.g. "near a station in Depok", or a neighbourhood name. NalarRuang returns the Top 3 best-matching areas.',
        ],
    },
    {
        target: 'filter',
        ikon: 'sliders-horizontal',
        judul: ['Atur kota dan persona pencarian', 'Set search cities and personas'],
        isi: ['Tombol ini membuka pilihan kota dan persona yang dipakai saat mencari.', 'This button opens the cities and personas used for searching.'],
    },
    {
        target: 'layer',
        ikon: 'layers',
        judul: ['Enam layer data', 'Six data layers'],
        isi: [
            'Nyalakan Historis & Risiko, Ekosistem Mikro, Inklusivitas, Mobilitas & Transit, Mesin Waktu, dan Legalitas Lahan sesuai yang ingin kamu lihat.',
            'Turn on History & Risk, Micro Ecosystem, Inclusivity, Mobility & Transit, Time Machine, and Land Legality as needed.',
        ],
    },
    {
        ikon: 'star',
        judul: ['Periksa titik mana pun', 'Inspect any point'],
        isi: [
            'Klik di mana saja pada peta untuk melihat skor bintang 0–3 per persona, beserta stasiun, gerbang tol, ruang hijau, dan risiko banjir di sekitarnya.',
            'Click anywhere on the map to see a 0–3 star score per persona, plus nearby stations, toll gates, green space, and flood risk.',
        ],
    },
    {
        target: 'rute',
        ikon: 'send',
        judul: ['Simulasi perjalanan', 'Commute simulator'],
        isi: [
            'Bandingkan waktu dan biaya mobil dengan transportasi umum dari titik A ke B, lengkap dengan opsi tol dan ganjil-genap.',
            'Compare travel time and cost by car and public transport from A to B, with toll and odd-even options.',
        ],
    },
    {
        target: 'menu',
        ikon: 'menu',
        judul: ['Menu, legenda, dan bahasa', 'Menu, legend, and language'],
        isi: [
            'Legenda peta, ubah persona, ganti bahasa, dan buka panduan ini lagi ada di sini. Selamat menjelajah!',
            'The map legend, persona settings, language switch, and this guide are here. Happy exploring!',
        ],
    },
];

type Kotak = { top: number; left: number; width: number; height: number };

export function Panduan({ onSelesai }: { onSelesai: () => void }) {
    const { t } = useBahasa();
    const [i, setI] = useState(0);
    const [kotak, setKotak] = useState<Kotak | null>(null);
    const [posisi, setPosisi] = useState<{ top: number; left: number } | null>(null);
    const kartu = useRef<HTMLDivElement>(null);
    const lanjutRef = useRef<HTMLButtonElement>(null);
    const l = LANGKAH[i];
    const akhir = i === LANGKAH.length - 1;

    const selesai = () => {
        tandaiSelesai();
        onSelesai();
    };

    // Ukur target yang disorot (lewati langkah bila targetnya tidak tampil, mis. saat mode rute).
    useLayoutEffect(() => {
        const ukur = () => {
            const el = l.target ? document.querySelector<HTMLElement>(`[data-tur="${l.target}"]`) : null;
            const r = el?.getBoundingClientRect();
            setKotak(r && r.width > 0 ? { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 } : null);
        };
        ukur();
        window.addEventListener('resize', ukur);
        return () => window.removeEventListener('resize', ukur);
    }, [l.target]);

    // Letakkan kartu di bawah/atas target, tetap di dalam layar.
    useLayoutEffect(() => {
        const k = kartu.current;
        if (!k) return;
        const w = k.offsetWidth;
        const h = k.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (!kotak) {
            setPosisi({ top: Math.max(16, (vh - h) / 2), left: Math.max(16, (vw - w) / 2) });
            return;
        }
        const bawah = kotak.top + kotak.height + 12;
        const top = bawah + h <= vh - 16 ? bawah : Math.max(16, kotak.top - h - 12);
        const left = Math.min(Math.max(16, kotak.left + kotak.width / 2 - w / 2), vw - w - 16);
        setPosisi({ top, left });
    }, [kotak, i]);

    useEffect(() => {
        lanjutRef.current?.focus();
    }, [i]);

    useEffect(() => {
        const tombol = (e: KeyboardEvent) => {
            if (e.key === 'Escape') selesai();
            if (e.key === 'ArrowRight') setI((x) => Math.min(x + 1, LANGKAH.length - 1));
            if (e.key === 'ArrowLeft') setI((x) => Math.max(x - 1, 0));
        };
        window.addEventListener('keydown', tombol);
        return () => window.removeEventListener('keydown', tombol);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="nr-tur" role="dialog" aria-modal="true" aria-labelledby="nr-tur-judul">
            {kotak ? <div className="nr-tur__sorot" style={kotak} aria-hidden="true" /> : <div className="nr-tur__redup" aria-hidden="true" />}
            <div ref={kartu} className="nr-tur__kartu" style={posisi ?? { visibility: 'hidden' }}>
                <div className="nr-tur__kepala">
                    <span className="nr-tur__ikon" aria-hidden="true">
                        <Ikon name={l.ikon} size={16} />
                    </span>
                    <span className="nr-tur__langkah">
                        {i + 1} / {LANGKAH.length}
                    </span>
                    <button type="button" className="nr-tur__lewati" onClick={selesai}>
                        {t('Lewati', 'Skip')}
                    </button>
                </div>
                <h2 id="nr-tur-judul" className="nr-tur__judul">
                    {t(l.judul)}
                </h2>
                <p className="nr-tur__isi">{t(l.isi)}</p>
                <div className="nr-tur__titik" aria-hidden="true">
                    {LANGKAH.map((_, n) => (
                        <span key={n} className={n === i ? 'is-aktif' : undefined} />
                    ))}
                </div>
                <div className="nr-tur__aksi">
                    {i > 0 && (
                        <button type="button" className="nr-tur__kembali" onClick={() => setI(i - 1)}>
                            {t('Kembali', 'Back')}
                        </button>
                    )}
                    <button ref={lanjutRef} type="button" className="nr-tur__lanjut" onClick={() => (akhir ? selesai() : setI(i + 1))}>
                        {akhir ? t('Mulai jelajah', 'Start exploring') : t('Lanjut', 'Next')}
                        {!akhir && <Ikon name="arrow-right" size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
