/** Komponen landing (design-system.md bagian 10), di-porting dari design system NalarRuang. */
import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { PilihBahasa, useBahasa } from '@/lib/bahasa';
import { cx, SUMBER } from '@/lib/nalar';
import { Ikon } from '../Dasar';

const foto = (src: string, posisi = 'center'): CSSProperties => ({ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: posisi });

/**
 * Foto hero dan jejak lampu mobil. Koordinat jalur memakai ukuran asli foto (viewBox), dan SVG memakai
 * `slice` seperti background-size: cover, jadi jejak selalu menempel di bundaran berapa pun lebar layar.
 * Bila foto diganti, perbarui `lebar`, `tinggi`, dan titik jalur di bawah.
 */
const FOTO_HERO = {
    src: '/images/foto-bundaran-hi.jpg',
    lebar: 460,
    tinggi: 343,
    // Jalur kiri: lalu lintas menjauh (lampu belakang merah). Kanan: mendekat (lampu depan putih).
    // Bundaran: busur depan air mancur (kuning). Busur belakang tidak digambar karena tertutup air.
    jalur: [
        { d: 'M-12 326 C 50 310 112 294 152 285', warna: 'merah', durasi: 5.2, tunda: 0 },
        { d: 'M-12 336 C 60 318 120 299 160 288', warna: 'merah', durasi: 6.4, tunda: 1.7 },
        { d: 'M108 279 A 118 12 0 0 0 344 279', warna: 'kuning', durasi: 4.6, tunda: 0.6 },
        { d: 'M300 286 C 352 293 410 305 472 322', warna: 'putih', durasi: 4.8, tunda: 0.9 },
        { d: 'M296 290 C 350 299 404 314 472 334', warna: 'putih', durasi: 6.1, tunda: 2.4 },
    ],
} as const;

function LatarHero() {
    const { src, lebar, tinggi, jalur } = FOTO_HERO;
    return (
        <div className="ed-hero__latar" aria-hidden="true">
            <svg viewBox={`0 0 ${lebar} ${tinggi}`} preserveAspectRatio="xMidYMid slice">
                <defs>
                    <filter id="ed-pendar" x="-20%" y="-200%" width="140%" height="500%">
                        <feGaussianBlur stdDeviation="1.6" />
                    </filter>
                </defs>
                <g className="ed-hero__kamera">
                    <image href={src} width={lebar} height={tinggi} preserveAspectRatio="xMidYMid slice" />
                    <rect width={lebar} height={tinggi} className="ed-hero__gelap" />
                    <g className="ed-hero__lampu">
                        {jalur.map((j, i) => (
                            <g key={i} className={`ed-jejak ed-jejak--${j.warna}`}>
                                {/* Sisa cahaya sepanjang lajur, seperti foto bukaan lama. */}
                                <path d={j.d} pathLength={100} filter="url(#ed-pendar)" className="ed-jejak__dasar" />
                                {/* Dua mobil per lajur, berselang setengah putaran: ekor berpendar dan kepala yang terang. */}
                                {[0, 0.5].map((fase) => (
                                    <g key={fase} style={{ '--durasi': `${j.durasi}s`, '--tunda': `${j.tunda + fase * j.durasi}s` } as CSSProperties}>
                                        <path d={j.d} pathLength={100} filter="url(#ed-pendar)" className="ed-jejak__ekor" />
                                        <path d={j.d} pathLength={100} className="ed-jejak__kepala" />
                                    </g>
                                ))}
                            </g>
                        ))}
                    </g>
                </g>
            </svg>
            <div className="ed-hero__butir" />
        </div>
    );
}

export function HeroLanding({ onMenu }: { onMenu: () => void }) {
    const { t } = useBahasa();
    return (
        <div>
            <div className="ed-hero ed-hero--hidup" style={{ height: 773 }}>
                <LatarHero />
                <div className="ed-header">
                    <button type="button" className="ed-hbtn" onClick={onMenu}>
                        MENU<span style={{ color: 'var(--hero-muted)' }}>∷</span>
                    </button>
                    <span className="nr-wordmark" style={{ color: 'var(--cream-100)', fontSize: 31 }}>
                        Nalar<i>Ruang</i>
                    </span>
                    <span className="ed-header__kanan">
                        <PilihBahasa gelap />
                        <Link className="ed-hbtn ed-hbtn--sm" href="/peta">
                            {t('Menuju Peta', 'Go to Map')}
                        </Link>
                    </span>
                </div>
                <div className="ed-hero__isi" style={{ paddingTop: 158 }}>
                    <div className="ed-kicker">
                        <span>{t('Data Spasial', 'Spatial Data')}</span>
                        <span className="ed-kicker__x">×</span>
                        <span>Persona</span>
                        <span className="ed-kicker__x">×</span>
                        <span>{t('Rekomendasi', 'Recommendation')}</span>
                    </div>
                    <h1 className="ed-hero__title">
                        <span className="ed-baris"><span>{t('Hunian yang cocok', 'A home that fits')}</span></span>
                        <span className="ed-baris"><span>{t('Kota yang terbaca', 'A city you can read')}</span></span>
                    </h1>
                    <p className="ed-hero__sub">{t('Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif.', 'Find your ideal living space with comprehensive urban spatial data analysis.')}</p>
                    <div style={{ marginTop: 28 }}>
                        <Link className="ed-btn" href="/peta">
                            {t('Buka Peta Interaktif', 'Open Interactive Map')}
                            <Ikon name="arrow-right" size={16} />
                        </Link>
                    </div>
                </div>
            </div>
            <div className="ed-marquee" aria-hidden="true">
                <div className="ed-marquee__jalur">
                    {[0, 1].map((ulang) =>
                        ['Commute Simulator', 'Visual Explorer', 'Requirement Search', 'Smart Point Inspector'].map((t) => (
                            <span key={`${ulang}-${t}`} className="ed-marquee__item">
                                <span>{t}</span>
                                <img src="/images/sparkle.svg" width={20} height={20} alt="" />
                            </span>
                        )),
                    )}
                </div>
            </div>
        </div>
    );
}

export function JudulSeksi({ varian, intro, eyebrow, judul }: { varian?: 'kiri' | 'kurung'; intro?: string; eyebrow?: string; judul: ReactNode }) {
    if (varian === 'kiri')
        return (
            <div>
                <div className="ed-eyebrow">{eyebrow}</div>
                <h2 className="ed-title" style={{ fontSize: 60, lineHeight: '57.6px' }}>
                    {judul}
                </h2>
            </div>
        );
    if (varian === 'kurung')
        return (
            <div style={{ textAlign: 'center' }}>
                <div className="ed-bracket">{eyebrow}</div>
                <h2 className="ed-title" style={{ fontSize: 60, lineHeight: '57.6px' }}>
                    {judul}
                </h2>
            </div>
        );
    return (
        <div style={{ textAlign: 'center' }}>
            {intro && <div className="ed-intro">{intro}</div>}
            <h2 className="ed-title" style={{ fontSize: 88, lineHeight: '88px' }}>
                {judul}
            </h2>
        </div>
    );
}

export function KolomFitur({ kolom }: { kolom: { judul: string; teks: string }[] }) {
    return (
        <div className="ed-cols" data-gerak="garis">
            {kolom.map((k, i) => (
                <div key={k.judul} className="ed-col" style={{ '--urut': i } as CSSProperties}>
                    <h3 className="ed-col__title">
                        <span>{k.judul}</span>
                    </h3>
                    <p className="ed-body" style={{ maxWidth: 280, margin: '0 auto' }}>
                        {k.teks}
                    </p>
                </div>
            ))}
        </div>
    );
}

export function VisiKami() {
    const { t } = useBahasa();
    return (
        <section className="ed-vision">
            <div>
                <h2 className="ed-vision__title">Our Vision</h2>
                <p className="ed-vision__text">
                    {t(
                        'Menjadi pionir platform inteligensi tata ruang yang meredefinisi standar eksplorasi hunian di Jabodetabek, mengonversi kompleksitas data spasial menjadi wawasan terpersonalisasi guna memberdayakan keputusan hidup yang presisi.',
                        'To pioneer a spatial intelligence platform that redefines how people explore homes in Jabodetabek, turning complex spatial data into personalised insight that empowers precise life decisions.',
                    )}
                </p>
            </div>
            <div className="ed-vision__meja" data-gerak="cetak">
                <div className="ed-vision__frame">
                    <div className="ed-vision__photo ed-photo ed-bw" style={foto('/images/foto-bundaran-hi.jpg')} />
                    <div className="ed-vision__kilat" aria-hidden="true" />
                </div>
            </div>
        </section>
    );
}

export function MisiKami() {
    const { t } = useBahasa();
    const misi = [
        t(
            'Menyediakan integrasi pemetaan data spasial multi-layer (mencakup historis & risiko, ekosistem mikro, inklusivitas, dan mobilitas) yang transparan dan mudah diakses oleh publik.',
            'Provide integrated multi-layer spatial data mapping (history & risk, micro ecosystem, inclusivity, and mobility) that is transparent and easy for the public to access.',
        ),
        t(
            'Menghadirkan pengalaman pencarian kawasan hunian yang berpusat pada pengguna (user-centric) melalui sistem grading berbasis persona gaya hidup (Commuter, Driver, Social & Vibe, Zen).',
            'Deliver a user-centric home-area search experience through lifestyle persona grading (Commuter, Driver, Social & Vibe, Zen).',
        ),
        t(
            'Mendobrak asimetri informasi tata ruang dengan menyajikan alat analitik interaktif, seperti Smart Point Inspector dan Commute Simulator, guna mendukung pengambilan keputusan yang tepat dan berbasis data.',
            'Break spatial information asymmetry with interactive analytics tools, such as the Smart Point Inspector and Commute Simulator, to support sound, data-driven decisions.',
        ),
    ];
    return (
        <section className="ed-mission">
            <h2 className="ed-mission__title">Mission</h2>
            <div className="ed-mission__cols" data-gerak="odometer">
                {misi.map((t, i) => (
                    <div key={i} className="ed-mission__col" style={{ '--urut': i } as CSSProperties}>
                        <span className="ed-mission__num" aria-label={`0${i + 1}`}>
                            0
                            <span className="ed-odo" aria-hidden="true">
                                <span className="ed-odo__gulung" style={{ '--angka': i + 1 } as CSSProperties}>
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                        <span key={n}>{n}</span>
                                    ))}
                                </span>
                            </span>
                        </span>
                        <p className="ed-mission__text">{t}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

/**
 * Kartu persona. Kemiringan tidak ditulis per kartu: `.ed-persona-row` menyusunnya seperti kipas yang
 * simetris terhadap tengah (lihat gerak.css), dari indeks dan jumlah kartu.
 */
export function KartuFotoPersona({ nama, desc, src, posisi, indeks, jumlah }: { nama: string; desc: string; src: string; posisi?: string; indeks: number; jumlah: number }) {
    // -1.5, -0.5, 0.5, 1.5 untuk empat kartu: jarak bertanda dari sumbu tengah.
    const dariTengah = indeks - (jumlah - 1) / 2;
    return (
        <div className="ed-persona-card" style={{ '--k': dariTengah, '--k-abs': Math.abs(dariTengah) } as CSSProperties}>
            <div className="ed-persona-card__foto ed-photo" style={foto(src, posisi)} />
            <div className="ed-persona-card__text">
                <p className="ed-persona-card__name">{nama}</p>
                <p className="ed-persona-card__desc">{desc}</p>
            </div>
        </div>
    );
}

/**
 * Kartu fitur: diam menampilkan gambar; saat disorot (hover/fokus) gambar berganti video demo.
 * Video dimuat hanya saat dibutuhkan (preload="none"). Bila berkas video belum ada atau gagal,
 * kartu tetap memakai gambar. Di layar sentuh video diputar saat kartu terlihat.
 */
export function KartuFitur({ judul, desc, gambar, video }: { judul: string; desc: string; gambar: string; video?: string }) {
    const { t } = useBahasa();
    const kartu = useRef<HTMLElement>(null);
    const vid = useRef<HTMLVideoElement>(null);
    const [main, setMain] = useState(false);
    const [gagal, setGagal] = useState(false);

    const putar = () => {
        const v = vid.current;
        if (!v || gagal) return;
        v.play().catch(() => undefined);
    };
    const henti = () => {
        const v = vid.current;
        setMain(false);
        if (!v) return;
        v.pause();
        try {
            v.currentTime = 0;
        } catch {
            /* belum ada metadata */
        }
    };

    useEffect(() => {
        const el = kartu.current;
        if (!el || !video || typeof IntersectionObserver === 'undefined' || !window.matchMedia?.('(hover: none)').matches) return;
        const io = new IntersectionObserver(([d]) => (d.intersectionRatio > 0.6 ? putar() : henti()), { threshold: [0, 0.6] });
        io.observe(el);
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, gagal]);

    return (
        <article ref={kartu} className={cx('ed-feature', main && 'is-main')} onMouseEnter={putar} onMouseLeave={henti} onFocus={putar} onBlur={henti}>
            <div className="ed-feature__frame">
                <div className="ed-feature__img" style={{ ...foto(gambar), filter: 'grayscale(0.35)' }} role="img" aria-label={t(`Cuplikan peta ${judul}`, `${judul} map preview`)} />
                {video && !gagal && (
                    <video
                        ref={vid}
                        className="ed-feature__video"
                        src={video}
                        poster={gambar}
                        muted
                        loop
                        playsInline
                        preload="none"
                        aria-hidden="true"
                        tabIndex={-1}
                        onPlaying={() => setMain(true)}
                        onError={() => {
                            setGagal(true);
                            setMain(false);
                        }}
                    />
                )}
            </div>
            <h3 className="ed-feature__title">{judul}</h3>
            <p className="ed-body">{desc}</p>
        </article>
    );
}

/** Tile layer. Tanpa `lapis`: judul = nama layer. Dengan `lapis`: judul = contoh isi layer, nama layer jadi label kecil. */
export function TileLayer({ judul, lapis, src, tinggi = 236, posisi }: Tile) {
    return (
        <div className={cx('ed-tile', lapis && 'ed-tile--contoh')}>
            <div className="ed-tile__foto ed-photo ed-bw" style={{ ...foto(src, posisi), height: tinggi }} />
            <div className="ed-tile__shade" />
            <div className="ed-tile__teks">
                {lapis && <p className="ed-tile__lapis">{lapis}</p>}
                <p className="ed-tile__title">{judul}</p>
            </div>
        </div>
    );
}

type Tile = { judul: string; lapis?: string; src: string; tinggi?: number; posisi?: string };

/**
 * Tiga kolom foto layer yang terus bergulir vertikal (kolom tengah berlawanan arah), di bawah masker
 * gradien. Isi kolom digandakan agar putarannya mulus; salinan disembunyikan dari pembaca layar.
 * Berhenti saat disorot dan bila pengguna memilih kurangi gerakan.
 */
export function KolomLayer({ kolom }: { kolom: Tile[][] }) {
    return (
        <div className="ed-tiles" data-gerak="tiles">
            {kolom.map((isi, k) => (
                <div key={k} className={cx('ed-tiles__col', k % 2 === 1 && 'ed-tiles__col--turun')} style={{ '--urut': k, '--durasi': `${38 + k * 6}s` } as CSSProperties}>
                    <div className="ed-tiles__jalur">
                        {[0, 1].map((salinan) => (
                            <div key={salinan} className="ed-tiles__set" aria-hidden={salinan === 1 || undefined}>
                                {isi.map((tile, i) => (
                                    <TileLayer key={i} {...tile} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Susunan tiga baris berjalan: logo yang sama (BNPB, Pemprov DKI) sengaja dipisah ke baris berbeda. */
const BARIS_SUMBER = [
    ['InaRISK (BNPB)', 'Overpass API (OSM)', 'Biskita Trans Pakuan', 'RDTR DKI Jakarta 2022'],
    ['Batas desa BIG', 'Commute Data Platform', 'BNPB genangan banjir 2020', 'SatPM PM2.5 (ACAG, CC BY 4.0)'],
    ['Pantau Banjir Jakarta', 'GTFS TransJakarta', 'DKI-Siap ATR/BPN (Hak Tanah)', 'Opentransum', 'JUTPI3 2045 via ModaHub (CC BY-NC 4.0)'],
];

export function StripSumberData() {
    const { t } = useBahasa();
    return (
        <div style={{ textAlign: 'center' }}>
            <h2 className="ed-title" style={{ fontSize: 36, lineHeight: '40px', marginBottom: 40, color: 'var(--navy-ink)' }}>
                {t('Sumber Data Terbuka', 'Open Data Sources')}
            </h2>
            {/* Daftar lengkap untuk pembaca layar; baris bergerak di bawahnya hanya hiasan. */}
            <ul className="nr-sr">
                {SUMBER.map((s) => (
                    <li key={s.nama}>{s.nama}</li>
                ))}
            </ul>
            <div className="ed-logos ed-logos--jalan" aria-hidden="true" data-gerak="logos">
                {BARIS_SUMBER.map((nama, baris) => {
                    const isi = nama.map((n) => SUMBER.find((s) => s.nama === n)).filter((s): s is (typeof SUMBER)[number] => !!s);
                    return (
                        <div key={baris} className={cx('ed-logos__baris', baris === 1 && 'ed-logos__baris--balik')} style={{ '--urut': baris, '--durasi': `${34 + baris * 5}s` } as CSSProperties}>
                            <div className="ed-logos__jalur">
                                {[0, 1].map((salinan) =>
                                    isi.map((s) => (
                                        <span key={`${salinan}-${s.nama}`} className="ed-logos__item">
                                            {s.logo ? <img className="ed-logos__img" src={s.logo} alt="" /> : <Ikon name="database" size={20} />}
                                            {s.nama}
                                        </span>
                                    )),
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <Link className="ed-link" href="/peta" style={{ marginTop: 48, paddingBottom: 6, borderBottom: '2px solid var(--line)' }}>
                {t('Buka Peta Interaktif', 'Open Interactive Map')}
                <Ikon name="arrow-up-right" size={16} />
            </Link>
        </div>
    );
}

/**
 * Empat langkah cara kerja. Gambar tiap langkah hanya muncul saat langkah itu disorot; tanpa sorotan,
 * langkah terakhir tetap ditandai (navy) seperti desain. Di layar sentuh, ketukan menyorot langkah.
 */
export function KartuLangkah({ langkah }: { langkah: { no: string; judul: string; teks: string; foto: string }[] }) {
    return (
        <div className="ed-steps" style={{ gridTemplateColumns: `repeat(${langkah.length}, 1fr)` }}>
            {langkah.map((s, i) => (
                <div key={s.no} className={cx('ed-step', i === langkah.length - 1 && 'ed-step--current')}>
                    <div className="ed-step__foto ed-photo" style={foto(s.foto)} aria-hidden="true" />
                    <div>
                        <h3 className="ed-step__title">{s.judul}</h3>
                        <p className="ed-step__text">{s.teks}</p>
                    </div>
                    <span className="ed-step__num">{s.no}</span>
                </div>
            ))}
        </div>
    );
}

export function CobaSekarang() {
    const { t } = useBahasa();
    return (
        <section className="ed-try" id="coba">
            <div className="ed-try__card" data-gerak="sinema">
                <div className="ed-try__shot" style={{ backgroundImage: 'url(/images/coba-sekarang.jpg)' }} />
                <div className="ed-try__veil" />
                <div className="ed-try__gelap" aria-hidden="true" />
                <div className="ed-try__inner">
                    <h2 className="ed-try__title">{t('Coba Sekarang', 'Try It Now')}</h2>
                    <p className="ed-try__text">{t('Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu.', 'Use search, layer filters, and personas to simulate finding your ideal area.')}</p>
                    <Link className="ed-try__btn" href="/peta">
                        {t('Buka Peta', 'Open Map')}
                        <Ikon name="arrow-right" size={14} strokeWidth={2.5} />
                    </Link>
                </div>
                <div className="ed-try__bilah ed-try__bilah--atas" aria-hidden="true" />
                <div className="ed-try__bilah ed-try__bilah--bawah" aria-hidden="true" />
            </div>
        </section>
    );
}

export function AccordionFAQ({ butir }: { butir: { q: string; a: string }[] }) {
    const [buka, setBuka] = useState(0);
    return (
        <div className="ed-faq" data-gerak="faq">
            {butir.map((it, i) => {
                const terbuka = buka === i;
                return (
                    <div key={i} className={cx('ed-faq__item', terbuka && 'is-buka')} style={{ '--urut': i } as CSSProperties}>
                        <button type="button" className="ed-faq__q" aria-expanded={terbuka} aria-controls={`faq-${i}`} id={`faq-q-${i}`} onClick={() => setBuka(terbuka ? -1 : i)}>
                            {it.q}
                            <span className="ed-faq__tanda" aria-hidden="true" />
                        </button>
                        {/* Jawaban selalu dirender agar buka dan tutup sama-sama beranimasi; inert saat tertutup. */}
                        <div className="ed-faq__lipat" id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`} inert={!terbuka}>
                            <div className="ed-faq__a space-y-3">
                                {it.a.split('\n\n').map((paragraf, idx) => (
                                    <p key={idx}>{paragraf}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function BandCTA() {
    const { t } = useBahasa();
    return (
        <div className="ed-cta ed-photo" style={foto('/images/foto-bundaran-hi.jpg', 'center 60%')}>
            <div style={{ padding: '150px 23px 120px' }}>
                <h2 className="ed-title" style={{ fontSize: 76, lineHeight: '73px', color: 'var(--stone-50)' }}>
                    {t('Siap membaca', 'Ready to read')}
                    <br />
                    {t('kotamu sendiri?', 'your own city?')}
                </h2>
                <p style={{ margin: '19px 0', font: '400 19px/30.9px var(--font-sans)', color: 'var(--stone-50-80)' }}>
                    {t('Pilih persona, buka peta, dan lihat kotamu dari sudut yang berbeda.', 'Choose a persona, open the map, and see your city from a different angle.')}
                </p>
                <Link className="ed-btn" href="/peta">
                    {t('Cari Sekarang!', 'Find Now!')}
                </Link>
            </div>
            <div style={{ padding: '0 73px 38px' }}>
                <div className="ed-footer">
                    <div>
                        <div className="ed-footer__label">{t('Lokasi & Kontak', 'Location & Contact')}</div>
                        <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Coming Soon</p>
                    </div>
                    <div>
                        <div className="ed-footer__label">{t('Media Sosial', 'Social Media')}</div>
                        <p style={{ fontStyle: 'italic', opacity: 0.7 }}>Coming Soon</p>
                    </div>
                </div>
                <div className="ed-footer__base">
                    <span className="nr-wordmark" style={{ color: 'var(--cream-100)', fontSize: 12.9 }}>
                        Nalar<i>Ruang</i>
                    </span>
                    <span>{t('Skor dan rekomendasi merupakan estimasi dari data sekunder publik.', 'Scores and recommendations are estimates from public secondary data.')}</span>
                    <span>© 2026</span>
                </div>
            </div>
        </div>
    );
}
