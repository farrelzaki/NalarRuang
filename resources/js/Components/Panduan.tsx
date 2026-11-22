/**
 * Onboarding Visual Explorer (T-061): tur interaktif yang mengunci layar seperti tutorial OpenStreetMap.
 * Tiap langkah menyorot satu fitur dan baru bisa dilanjutkan setelah pengguna benar-benar mencobanya
 * (klik tombol, mengetik lalu menekan Enter, atau mengklik peta). Melewati tur memunculkan peringatan.
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

/** klik: pengguna harus mengklik target; kirim: harus mengisi kolom lalu menekan Enter. */
type Syarat = 'klik' | 'kirim';
type Langkah = { target?: string; ikon: string; judul: Dwi; isi: Dwi; syarat?: Syarat; tugas?: Dwi; berhasil?: Dwi };

const LANGKAH: Langkah[] = [
    {
        ikon: 'map-pin',
        judul: ['Selamat datang di NalarRuang', 'Welcome to NalarRuang'],
        isi: [
            'Temukan kawasan hunian di Jabodetabek yang cocok dengan gaya hidupmu. Di tur ini kamu langsung mencoba tiap fitur utama, bukan sekadar membaca.',
            'Find residential areas in Greater Jakarta that fit your lifestyle. In this tour you try each main feature yourself instead of just reading about it.',
        ],
    },
    {
        target: 'persona',
        ikon: 'users',
        judul: ['Persona gaya hidup', 'Lifestyle personas'],
        isi: [
            'Persona (Commuter, Driver, Social & Vibe, Zen) menentukan rekomendasi dan skor bintang di peta. Kamu bisa menggantinya kapan saja.',
            'Personas (Commuter, Driver, Social & Vibe, Zen) shape the recommendations and star scores on the map. You can change them anytime.',
        ],
        syarat: 'klik',
        tugas: ['Klik tombol Persona yang menyala untuk membuka profil persona.', 'Click the highlighted Persona button to open the persona profile.'],
        berhasil: ['Bagus! Di panel itu kamu bisa mengganti persona.', 'Nice! You can switch personas in that panel.'],
    },
    {
        target: 'mode',
        ikon: 'map-pin',
        judul: ['Dua mode pencarian', 'Two search modes'],
        isi: [
            'Ikon lokasi mencari tempat atau daerah yang kamu ketik. Ikon bintang mencari Top 3 kawasan yang cocok dengan persona.',
            'The location icon finds the place or area you type. The star icon finds the Top 3 areas that match your persona.',
        ],
        syarat: 'klik',
        tugas: ['Klik salah satu ikon pada saklar mode untuk mencobanya.', 'Click either icon on the mode switch to try it.'],
        berhasil: ['Mode pencarian berpindah. Kamu bisa mengubahnya lagi kapan saja.', 'Search mode switched. You can change it again anytime.'],
    },
    {
        target: 'cari',
        ikon: 'search',
        judul: ['Cari di peta', 'Search the map'],
        isi: [
            'Mode lokasi: ketik nama tempat, misalnya "Stasiun Depok". Mode bintang: tulis kebutuhanmu, misalnya "dekat stasiun di Depok".',
            'Location mode: type a place name, e.g. "Depok Station". Star mode: describe what you need, e.g. "near a station in Depok".',
        ],
        syarat: 'kirim',
        tugas: ['Ketik sesuatu di kolom pencarian, lalu tekan Enter.', 'Type something in the search box, then press Enter.'],
        berhasil: ['Pencarian berjalan. Hasilnya muncul di panel kiri.', 'Search done. Results appear in the left panel.'],
    },
    {
        target: 'filter',
        ikon: 'sliders-horizontal',
        judul: ['Atur kota dan persona pencarian', 'Set search cities and personas'],
        isi: [
            'Tombol ini membuka pilihan kota dan persona yang dipakai saat mencari rekomendasi.',
            'This button opens the cities and personas used when searching for recommendations.',
        ],
        syarat: 'klik',
        tugas: ['Klik tombol pengaturan yang menyala.', 'Click the highlighted settings button.'],
        berhasil: ['Pilihan kota dan persona terbuka.', 'The city and persona options are open.'],
    },
    {
        target: 'layer',
        ikon: 'layers',
        judul: ['Layer data', 'Data layers'],
        isi: [
            'Nyalakan Historis & Risiko, Ekosistem Mikro, Kualitas Udara, Inklusivitas, Mobilitas & Transit, Mesin Waktu, dan Legalitas Lahan sesuai yang ingin kamu lihat.',
            'Turn on History & Risk, Micro Ecosystem, Air Quality, Inclusivity, Mobility & Transit, Time Machine, and Land Legality as needed.',
        ],
        syarat: 'klik',
        tugas: ['Klik tombol Layer yang menyala untuk melihat daftar layer.', 'Click the highlighted Layer button to see the layer list.'],
        berhasil: ['Daftar layer terbuka. Nyalakan yang kamu butuhkan.', 'The layer list is open. Switch on what you need.'],
    },
    {
        target: 'alat',
        ikon: 'hand',
        judul: ['Alat peta', 'Map tools'],
        isi: [
            'Jelajah hanya menggeser peta. Titik menilai satu titik dengan sekali klik. Area menilai lahan yang kamu gambar sebagai poligon.',
            'Explore only pans the map. Point scores a single spot with one click. Area scores a plot you draw as a polygon.',
        ],
        syarat: 'klik',
        tugas: ['Klik salah satu alat di bilah bawah untuk mencobanya.', 'Click any tool on the bottom bar to try it.'],
        berhasil: ['Alat berpindah. Untuk langkah berikutnya alat Titik diaktifkan otomatis.', 'Tool switched. The Point tool is switched on automatically for the next step.'],
    },
    {
        target: 'peta',
        ikon: 'star',
        judul: ['Nilai titik atau area', 'Rate a point or an area'],
        isi: [
            'Dengan alat Titik, klik di mana saja pada peta untuk melihat skor bintang 0–3 per persona, beserta stasiun, gerbang tol, ruang hijau, dan risiko banjir di sekitarnya.',
            'With the Point tool, click anywhere on the map to see a 0–3 star score per persona, plus nearby stations, toll gates, green space, and flood risk.',
        ],
        syarat: 'klik',
        tugas: ['Klik satu titik di peta.', 'Click any point on the map.'],
        berhasil: ['Titik terpilih. Skor dan detailnya muncul di panel kiri.', 'Point selected. Its scores and details appear in the left panel.'],
    },
    {
        target: 'rute',
        ikon: 'send',
        judul: ['Simulasi perjalanan', 'Commute simulator'],
        isi: [
            'Bandingkan waktu dan biaya mobil dengan transportasi umum dari titik A ke B, lengkap dengan opsi tol dan ganjil-genap.',
            'Compare travel time and cost by car and public transport from A to B, with toll and odd-even options.',
        ],
        syarat: 'klik',
        tugas: ['Klik tombol Commute Simulator yang menyala.', 'Click the highlighted Commute Simulator button.'],
        berhasil: ['Simulator terbuka. Klik peta untuk menaruh titik A dan B.', 'The simulator is open. Click the map to place points A and B.'],
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

type PanduanProps = {
    /** `dilewati` true bila pengguna memilih melewati tur sebelum selesai. */
    onSelesai: (dilewati: boolean) => void;
    /** Dipanggil tiap pindah langkah dan saat tur ditutup: induk menutup panel yang terbuka agar target tidak tertutup. */
    onBersihkan?: () => void;
};

export function Panduan({ onSelesai, onBersihkan }: PanduanProps) {
    const { t } = useBahasa();
    const [i, setI] = useState(0);
    const [kotak, setKotak] = useState<Kotak | null>(null);
    const [posisi, setPosisi] = useState<{ top: number; left: number } | null>(null);
    const [tuntasSet, setTuntasSet] = useState<number[]>([]);
    const [peringatan, setPeringatan] = useState(false);
    const kartu = useRef<HTMLDivElement>(null);
    const lanjutRef = useRef<HTMLButtonElement>(null);
    const bersihkanRef = useRef(onBersihkan);
    bersihkanRef.current = onBersihkan;
    const l = LANGKAH[i];
    const akhir = i === LANGKAH.length - 1;
    const tuntas = tuntasSet.includes(i);
    const terkunci = !!l.syarat && !tuntas;
    // Target yang hampir selebar layar (peta) tidak disorot dengan kotak; layar lain dikunci lewat CSS.
    const targetPeta = l.target === 'peta';

    const selesai = (dilewati: boolean) => {
        bersihkanRef.current?.();
        tandaiSelesai(); // Dilewati pun tidak diulang tiap kunjungan; peringatan sudah ditampilkan sebelum memilih lewati.
        onSelesai(dilewati);
    };

    // Mulai langkah baru dari layar yang bersih, lalu pasang pendeteksi syarat langkah.
    useEffect(() => {
        if (i > 0) bersihkanRef.current?.();
        if (!l.syarat || !l.target) return;
        const target = l.target;
        const cek = (e: Event) => {
            const el = document.querySelector<HTMLElement>(`[data-tur="${target}"]`);
            if (!el || !(e.target instanceof Node) || !el.contains(e.target)) return;
            if (l.syarat === 'kirim') {
                const isi = el.querySelector<HTMLInputElement>('input');
                if (!isi || !isi.value.trim()) return;
            }
            setTuntasSet((x) => (x.includes(i) ? x : [...x, i]));
        };
        const peristiwa = l.syarat === 'kirim' ? 'submit' : 'click';
        document.addEventListener(peristiwa, cek, true);
        return () => document.removeEventListener(peristiwa, cek, true);
    }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

    // Ukur target yang disorot (lewati langkah bila targetnya tidak tampil, mis. saat mode rute).
    useLayoutEffect(() => {
        const ukur = () => {
            const el = l.target && !targetPeta ? document.querySelector<HTMLElement>(`[data-tur="${l.target}"]`) : null;
            const r = el?.getBoundingClientRect();
            setKotak(r && r.width > 0 ? { top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 } : null);
        };
        ukur();
        window.addEventListener('resize', ukur);
        return () => window.removeEventListener('resize', ukur);
    }, [l.target, targetPeta]);

    // Letakkan kartu di bawah/atas target, tetap di dalam layar.
    useLayoutEffect(() => {
        const k = kartu.current;
        if (!k) return;
        const w = k.offsetWidth;
        const h = k.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (targetPeta) {
            // Peta memenuhi layar: kartu di tengah bawah supaya peta tetap bisa diklik.
            setPosisi({ top: Math.max(16, vh - h - 110), left: Math.max(16, (vw - w) / 2) });
            return;
        }
        if (!kotak) {
            setPosisi({ top: Math.max(16, (vh - h) / 2), left: Math.max(16, (vw - w) / 2) });
            return;
        }
        const bawah = kotak.top + kotak.height + 12;
        const top = bawah + h <= vh - 16 ? bawah : Math.max(16, kotak.top - h - 12);
        const left = Math.min(Math.max(16, kotak.left + kotak.width / 2 - w / 2), vw - w - 16);
        setPosisi({ top, left });
    }, [kotak, i, tuntas, peringatan, targetPeta]);

    useEffect(() => {
        if (!terkunci) lanjutRef.current?.focus();
    }, [i, tuntas, peringatan]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const tombol = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                setPeringatan(true);
            }
        };
        window.addEventListener('keydown', tombol);
        return () => window.removeEventListener('keydown', tombol);
    }, []);

    const lanjut = () => {
        if (terkunci) return;
        if (akhir) selesai(false);
        else setI(i + 1);
    };

    // Empat panel pemblokir mengelilingi target: hanya target yang bisa diklik, sisanya terkunci.
    const vw = typeof window === 'undefined' ? 0 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 0 : window.innerHeight;
    const bolehKlikTarget = !!l.syarat && !!kotak;

    return (
        <div className={`nr-tur${targetPeta ? ' nr-tur--peta' : ''}`} role="dialog" aria-modal="true" aria-labelledby="nr-tur-judul">
            {kotak ? (
                <>
                    <div className="nr-tur__sorot" style={kotak} aria-hidden="true" />
                    <div className="nr-tur__blok" style={{ top: 0, left: 0, width: vw, height: Math.max(0, kotak.top) }} aria-hidden="true" />
                    <div className="nr-tur__blok" style={{ top: kotak.top + kotak.height, left: 0, width: vw, height: Math.max(0, vh - kotak.top - kotak.height) }} aria-hidden="true" />
                    <div className="nr-tur__blok" style={{ top: kotak.top, left: 0, width: Math.max(0, kotak.left), height: kotak.height }} aria-hidden="true" />
                    <div className="nr-tur__blok" style={{ top: kotak.top, left: kotak.left + kotak.width, width: Math.max(0, vw - kotak.left - kotak.width), height: kotak.height }} aria-hidden="true" />
                    {!bolehKlikTarget && <div className="nr-tur__blok" style={kotak} aria-hidden="true" />}
                </>
            ) : targetPeta ? null : (
                <div className="nr-tur__redup nr-tur__blok" aria-hidden="true" />
            )}
            <div ref={kartu} className="nr-tur__kartu" style={posisi ?? { visibility: 'hidden' }}>
                <div className="nr-tur__kepala">
                    <span className="nr-tur__ikon" aria-hidden="true">
                        <Ikon name={l.ikon} size={16} />
                    </span>
                    <span className="nr-tur__langkah">
                        {i + 1} / {LANGKAH.length}
                    </span>
                    <button type="button" className="nr-tur__lewati" onClick={() => setPeringatan(true)}>
                        {t('Lewati', 'Skip')}
                    </button>
                </div>
                {peringatan ? (
                    <div className="nr-tur__peringatan" role="alertdialog" aria-labelledby="nr-tur-peringatan-judul">
                        <h2 id="nr-tur-peringatan-judul" className="nr-tur__judul">
                            <Ikon name="triangle-alert" size={16} /> {t('Yakin lewati panduan?', 'Skip the guide?')}
                        </h2>
                        <p className="nr-tur__isi">
                            {t(
                                'Tanpa panduan, kamu mungkin tidak tahu cara menilai titik di peta, memakai dua mode pencarian, atau menyalakan layer. Panduan bisa dibuka lagi lewat Menu > Panduan.',
                                'Without the guide you may miss how to score a point on the map, use the two search modes, or switch on layers. You can reopen it from Menu > Guide.',
                            )}
                        </p>
                        <div className="nr-tur__aksi">
                            <button type="button" className="nr-tur__kembali" onClick={() => selesai(true)}>
                                {t('Tetap lewati', 'Skip anyway')}
                            </button>
                            <button ref={lanjutRef} type="button" className="nr-tur__lanjut" onClick={() => setPeringatan(false)}>
                                {t('Lanjutkan panduan', 'Continue guide')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 id="nr-tur-judul" className="nr-tur__judul">
                            {t(l.judul)}
                        </h2>
                        <p className="nr-tur__isi">{t(l.isi)}</p>
                        {l.syarat && l.tugas && (
                            <p className={`nr-tur__tugas${tuntas ? ' is-tuntas' : ''}`} role="status">
                                <Ikon name={tuntas ? 'check' : 'arrow-right'} size={14} strokeWidth={tuntas ? 3 : 2} />
                                <span>{tuntas && l.berhasil ? t(l.berhasil) : t(l.tugas)}</span>
                            </p>
                        )}
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
                            <button ref={lanjutRef} type="button" className="nr-tur__lanjut" disabled={terkunci} onClick={lanjut}>
                                {akhir ? t('Mulai jelajah', 'Start exploring') : t('Lanjut', 'Next')}
                                {!akhir && <Ikon name="arrow-right" size={14} />}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
