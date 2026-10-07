/** Komponen landing (design-system.md bagian 10), di-porting dari design system NalarRuang. */
import { Link } from '@inertiajs/react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { PilihBahasa, useBahasa } from '@/lib/bahasa';
import { cx, SUMBER } from '@/lib/nalar';
import { Ikon } from '../Dasar';

const foto = (src: string, posisi = 'center'): CSSProperties => ({ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: posisi });

export function HeroLanding({ onMenu }: { onMenu: () => void }) {
    const { t } = useBahasa();
    return (
        <div>
            <div className="ed-hero ed-photo" style={{ ...foto('/images/foto-bundaran-hi.jpg', 'center 40%'), height: 773 }}>
                <div className="ed-header">
                    <button type="button" className="ed-hbtn" onClick={onMenu}>
                        MENU<span style={{ color: 'var(--hero-muted)' }}>∷</span>
                    </button>
                    <span className="ed-brand">
                        <img src="/images/logo-nalarruang.svg" width={31} height={31} alt="" />
                        NalarRuang
                    </span>
                    <span className="ed-header__kanan">
                        <PilihBahasa gelap />
                        <Link className="ed-hbtn ed-hbtn--sm" href="/peta">
                            {t('Menuju Peta', 'Go to Map')}
                        </Link>
                    </span>
                </div>
                <div style={{ paddingTop: 158 }}>
                    <div className="ed-kicker">
                        <span>{t('Data Spasial', 'Spatial Data')}</span>
                        <span className="ed-kicker__x">×</span>
                        <span>Persona</span>
                        <span className="ed-kicker__x">×</span>
                        <span>{t('Rekomendasi', 'Recommendation')}</span>
                    </div>
                    <h1 className="ed-hero__title">
                        {t('Hunian yang cocok.', 'A home that fits.')}
                        <br />
                        {t('Kota yang terbaca.', 'A city you can read.')}
                    </h1>
                    <p className="ed-hero__sub">{t('Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif.', 'Find your ideal living space with comprehensive urban spatial data analysis.')}</p>
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
        <div className="ed-cols">
            {kolom.map((k) => (
                <div key={k.judul} className="ed-col">
                    <h3 className="ed-col__title">{k.judul}</h3>
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
            <div className="ed-vision__frame">
                <div className="ed-vision__photo ed-photo ed-bw" style={foto('/images/foto-bundaran-hi.jpg')} />
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
            <div className="ed-mission__cols">
                {misi.map((t, i) => (
                    <div key={i} className="ed-mission__col">
                        <span className="ed-mission__num">0{i + 1}</span>
                        <p className="ed-mission__text">{t}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function KartuFotoPersona({ nama, desc, src, rotasi, posisi }: { nama: string; desc: string; src: string; rotasi?: number; posisi?: string }) {
    return (
        <div className="ed-persona-card ed-photo" style={{ ...foto(src, posisi), transform: rotasi ? `rotate(${rotasi}deg)` : undefined }}>
            <div className="ed-persona-card__text">
                <p className="ed-persona-card__name">{nama}</p>
                <p className="ed-persona-card__desc">{desc}</p>
            </div>
        </div>
    );
}

export function KartuFitur({ judul, desc, gambar }: { judul: string; desc: string; gambar: string }) {
    const { t } = useBahasa();
    return (
        <article className="ed-feature">
            <div className="ed-feature__frame">
                <div className="ed-feature__img" style={{ ...foto(gambar), filter: 'grayscale(0.35)' }} role="img" aria-label={t(`Cuplikan peta ${judul}`, `${judul} map preview`)} />
            </div>
            <h3 className="ed-feature__title">{judul}</h3>
            <p className="ed-body">{desc}</p>
            <Link className="ed-link" href="/peta" style={{ marginTop: 20 }}>
                {t('Pelajari', 'Learn more')}
                <Ikon name="arrow-up-right" size={16} />
            </Link>
        </article>
    );
}

export function TileLayer({ judul, src, tinggi = 236, posisi }: { judul: string; src: string; tinggi?: number; posisi?: string }) {
    return (
        <div className="ed-tile ed-photo ed-bw" style={{ ...foto(src, posisi), height: tinggi }}>
            <div className="ed-tile__shade" />
            <p className="ed-tile__title">{judul}</p>
        </div>
    );
}

export function StripSumberData() {
    const { t } = useBahasa();
    return (
        <div style={{ textAlign: 'center' }}>
            <h2 className="ed-title" style={{ fontSize: 36, lineHeight: '40px', marginBottom: 40, color: 'var(--navy-ink)' }}>
                {t('Sumber Data Terbuka', 'Open Data Sources')}
            </h2>
            <div className="ed-logos">
                {SUMBER.map((s) => (
                    <span key={s}>
                        <Ikon name="database" size={20} />
                        {s}
                    </span>
                ))}
            </div>
            <Link className="ed-link" href="/peta" style={{ marginTop: 48, paddingBottom: 6, borderBottom: '2px solid var(--line)' }}>
                {t('Buka Peta Interaktif', 'Open Interactive Map')}
                <Ikon name="arrow-up-right" size={16} />
            </Link>
        </div>
    );
}

export function KartuLangkah({ langkah }: { langkah: { no: string; judul: string; teks: string; foto?: string }[] }) {
    return (
        <div className="ed-steps" style={{ gridTemplateColumns: `repeat(${langkah.length}, 1fr)` }}>
            {langkah.map((s, i) => {
                const terakhir = i === langkah.length - 1;
                return (
                    <div key={s.no} className={cx('ed-step', terakhir && 'ed-step--current', terakhir && 'ed-photo')} style={terakhir && s.foto ? foto(s.foto) : undefined}>
                        <div>
                            <h3 className="ed-step__title">{s.judul}</h3>
                            <p className="ed-step__text">{s.teks}</p>
                        </div>
                        <span className="ed-step__num">{s.no}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function CobaSekarang() {
    const { t } = useBahasa();
    return (
        <section className="ed-try" id="coba">
            <div className="ed-try__card">
                <div className="ed-try__shot" style={{ backgroundImage: 'url(/images/coba-sekarang.jpg)' }} />
                <div className="ed-try__veil" />
                <div className="ed-try__inner">
                    <span className="ed-try__tag">{t('Interaktif', 'Interactive')}</span>
                    <h2 className="ed-try__title">{t('Coba Sekarang', 'Try It Now')}</h2>
                    <p className="ed-try__text">{t('Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu.', 'Use search, layer filters, and personas to simulate finding your ideal area.')}</p>
                    <Link className="ed-try__btn" href="/peta">
                        {t('Buka Peta', 'Open Map')}
                        <Ikon name="arrow-right" size={14} strokeWidth={2.5} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export function AccordionFAQ({ butir }: { butir: { q: string; a: string }[] }) {
    const [buka, setBuka] = useState(0);
    return (
        <div className="ed-faq">
            {butir.map((it, i) => {
                const terbuka = buka === i;
                return (
                    <div key={i} className="ed-faq__item">
                        <button type="button" className="ed-faq__q" aria-expanded={terbuka} onClick={() => setBuka(terbuka ? -1 : i)}>
                            {it.q}
                            <Ikon name={terbuka ? 'minus' : 'plus'} size={28} strokeWidth={1.5} />
                        </button>
                        {terbuka && <p className="ed-faq__a">{it.a}</p>}
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
                    {t('Mulai Cari Hunian', 'Start Finding a Home')}
                </Link>
            </div>
            <div style={{ padding: '0 73px 38px' }}>
                <div className="ed-footer">
                    <div>
                        <div className="ed-footer__label">{t('Hubungi Kami', 'Contact Us')}</div>
                        Sekolah Vokasi IPB
                        <br />
                        Bogor, Jawa Barat, Indonesia
                    </div>
                    <div>
                        <div className="ed-footer__label">{t('Kontak', 'Contact')}</div>
                        {t('Kerja Sama', 'Partnerships')}
                        <br />
                        kolaborasi@nalaruang.id
                        <br />
                        Media
                        <br />
                        media@nalaruang.id
                    </div>
                    <div>
                        <div className="ed-footer__label">{t('Ikuti', 'Follow')}</div>
                        {['instagram', 'linkedin', 'youtube'].map((s) => (
                            <span key={s} className="ed-social">
                                <Ikon name={s} size={18} label={s} />
                            </span>
                        ))}
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
