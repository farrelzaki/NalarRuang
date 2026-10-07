/** Landing page (FR-22, UI06). Urutan seksi design-system.md bagian 10. */
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    AccordionFAQ,
    BandCTA,
    CobaSekarang,
    HeroLanding,
    JudulSeksi,
    KartuFitur,
    KartuFotoPersona,
    KartuLangkah,
    KolomFitur,
    MisiKami,
    StripSumberData,
    TileLayer,
    VisiKami,
} from '@/Components/Landing/Seksi';
import { Ikon } from '@/Components/Dasar';
import { useBahasa } from '@/lib/bahasa';
import { PERSONA } from '@/lib/nalar';

const MENU: [string, string, string][] = [
    ['Visi & Misi', 'Vision & Mission', '#visi'],
    ['Persona', 'Personas', '#persona'],
    ['Fitur', 'Features', '#fitur'],
    ['Layer', 'Layers', '#layer'],
    ['Cara Kerja', 'How It Works', '#cara-kerja'],
    ['FAQ', 'FAQ', '#faq'],
];

export default function Landing() {
    const { t } = useBahasa();
    const [menu, setMenu] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = 'editorial';
        return () => {
            delete document.documentElement.dataset.theme;
        };
    }, []);

    return (
        <>
            <Head title={t('Hunian yang cocok. Kota yang terbaca.', 'A home that fits. A city you can read.')} />
            <div className="ed-page">
                <HeroLanding onMenu={() => setMenu(true)} />

                <section className="ed-sec" id="visi">
                    <JudulSeksi intro={t('Mengurai Visi,', 'Unpacking the Vision,')} judul={t('Menata Kota Bersama.', 'Shaping the City Together.')} />
                    <div style={{ marginTop: 64 }}>
                        <KolomFitur
                            kolom={[
                                {
                                    judul: t('Spasial', 'Spatial'),
                                    teks: t(
                                        'Menganalisis data ruang kota secara komprehensif. Menghindari asumsi buta, tapi membantu pencarian berbasis bukti. Fokus pada fakta jarak dan aksesibilitas.',
                                        'Analyse urban spatial data comprehensively. No blind assumptions, only evidence-based search. Focused on the facts of distance and accessibility.',
                                    ),
                                },
                                {
                                    judul: 'Persona',
                                    teks: t(
                                        'Menyesuaikan dengan gaya hidupmu. Kenyamanan tanpa kemudahan akses adalah mustahil. Kami merangkul kebutuhan unik perjalanan setiap orang.',
                                        'Tailored to your lifestyle. Comfort without easy access is impossible. We embrace everyone’s unique travel needs.',
                                    ),
                                },
                                {
                                    judul: t('Rekomendasi', 'Recommendation'),
                                    teks: t(
                                        'Belajar dari pola kehidupan kota terbaik. Memberikan pilihan kawasan hunian secara terbuka. Mengadaptasi data makro perkotaan ke realita kebutuhan mikromu.',
                                        'Learning from the best urban living patterns. Offering housing areas openly. Adapting macro urban data to the reality of your micro needs.',
                                    ),
                                },
                            ]}
                        />
                    </div>
                </section>

                <div className="ed-wrap">
                    <VisiKami />
                    <MisiKami />
                </div>

                <section className="ed-sec" id="persona">
                    <div style={{ textAlign: 'center' }}>
                        <h2 className="ed-title" style={{ fontSize: 64, lineHeight: '61px' }}>
                            {t('Empat Cara', 'Four Ways')}
                            <br />
                            {t('Memandang Suatu Kota.', 'of Seeing a City.')}
                        </h2>
                        <p className="ed-lead-tengah">
                            {t(
                                'Pilihanmu dapat beririsan. Temukan persona yang paling menggambarkan keseharianmu untuk mendapatkan hasil pencarian hunian terbaik.',
                                'Your choices can overlap. Find the personas that best describe your daily life to get the best home search results.',
                            )}
                        </p>
                    </div>
                    <div className="ed-persona-row">
                        <KartuFotoPersona nama="Commuter" desc={t(PERSONA.commuter.desc)} src="/images/foto-bundaran-hi.jpg" rotasi={-4} />
                        <KartuFotoPersona nama="Social & Vibe" desc={t(PERSONA.social_vibe.desc)} src="/images/foto-interior-malam.jpg" rotasi={-1.5} />
                        <KartuFotoPersona nama="Driver" desc={t(PERSONA.driver.desc)} src="/images/foto-aerial-jakarta.jpg" rotasi={1} />
                        <KartuFotoPersona nama="Zen" desc={t(PERSONA.zen.desc)} src="/images/foto-aerial-jakarta.jpg" posisi="center 85%" rotasi={4} />
                    </div>
                </section>

                <section className="ed-sec" id="fitur">
                    <JudulSeksi varian="kiri" eyebrow={t('Fitur Utama', 'Key Features')} judul={t('Tiga cara menjelajah.', 'Three ways to explore.')} />
                    <div className="ed-fitur-grid">
                        <KartuFitur judul="Requirement Search" desc={t('Ketik kebutuhanmu, dapatkan tiga kawasan paling cocok lengkap dengan persen kecocokan.', 'Type what you need and get the three best-matching areas with a match percentage.')} gambar="/images/fitur-search.jpg" />
                        <KartuFitur judul="Smart Point Inspector" desc={t('Klik titik mana pun untuk melihat skor 0–3 bintang per persona dan kesimpulannya.', 'Click any point to see a 0–3 star score per persona and a summary.')} gambar="/images/fitur-inspector.jpg" />
                        <KartuFitur judul="Commute Simulator" desc={t('Bandingkan waktu dan biaya mobil pribadi dengan transportasi umum.', 'Compare the time and cost of driving with public transport.')} gambar="/images/fitur-commute.jpg" />
                    </div>
                </section>

                <section className="ed-sec ed-layer-sec" id="layer">
                    <div>
                        <h2 className="ed-title" style={{ fontSize: 64, lineHeight: '61px' }}>
                            {t('Enam layer,', 'Six layers,')}
                            <br />
                            {t('satu kota.', 'one city.')}
                        </h2>
                        <p className="ed-body" style={{ marginTop: 24, maxWidth: 420 }}>
                            {t(
                                'Berbagai data spasial digabungkan menjadi enam layer interaktif untuk memberikan perspektif komprehensif tentang kelayakan hunian, risiko bencana, dan ekosistem di sekitarnya.',
                                'Diverse spatial data combined into six interactive layers for a comprehensive view of livability, disaster risk, and the surrounding ecosystem.',
                            )}
                        </p>
                    </div>
                    <div className="ed-tiles">
                        <div className="ed-tiles__col">
                            <TileLayer judul={t('Historis & Risiko', 'History & Risk')} src="/images/foto-bundaran-hi.jpg" />
                            <TileLayer judul={t('Mobilitas & Transit', 'Mobility & Transit')} src="/images/foto-aerial-jakarta.jpg" tinggi={300} />
                        </div>
                        <div className="ed-tiles__col" style={{ marginTop: 48 }}>
                            <TileLayer judul={t('Ekosistem Mikro', 'Micro Ecosystem')} src="/images/foto-aerial-jakarta.jpg" posisi="center 80%" tinggi={276} />
                            <TileLayer judul={t('Mesin Waktu', 'Time Machine')} src="/images/foto-interior-malam.jpg" />
                        </div>
                        <div className="ed-tiles__col">
                            <TileLayer judul={t('Inklusivitas', 'Inclusivity')} src="/images/foto-bundaran-hi.jpg" posisi="center 90%" tinggi={216} />
                            <TileLayer judul={t('Legalitas Lahan', 'Land Legality')} src="/images/foto-aerial-jakarta.jpg" posisi="center 20%" tinggi={260} />
                        </div>
                    </div>
                </section>

                <section className="ed-sec">
                    <StripSumberData />
                </section>

                <section className="ed-sec" id="cara-kerja">
                    <JudulSeksi
                        varian="kurung"
                        eyebrow={t('[ Cara Kerja ]', '[ How It Works ]')}
                        judul={
                            <>
                                {t('Dari Data Terbuka', 'From Open Data')}
                                <br />
                                {t('ke Rekomendasi.', 'to Recommendations.')}
                            </>
                        }
                    />
                    <div style={{ marginTop: 64 }}>
                        <KartuLangkah
                            langkah={[
                                { no: '01', judul: t('Kumpulkan', 'Collect'), teks: t('Data publik mentah dihimpun dari OpenStreetMap, InaRISK, dan ATR/BPN.', 'Raw public data is gathered from OpenStreetMap, InaRISK, and ATR/BPN.') },
                                { no: '02', judul: t('Olah', 'Process'), teks: t('Pembersihan dan penataan struktur data di QGIS menjadi enam layer spasial.', 'Data is cleaned and structured in QGIS into six spatial layers.') },
                                { no: '03', judul: t('Hitung', 'Score'), teks: t('Interseksi spasial dan pembobotan skor persona (0–3 bintang).', 'Spatial intersection and persona score weighting (0–3 stars).') },
                                {
                                    no: '04',
                                    judul: t('Tampilkan', 'Present'),
                                    teks: t('Rekomendasi 3 besar, Point Inspector, dan hasil Commute Simulator disajikan.', 'Top 3 recommendations, the Point Inspector, and Commute Simulator results are presented.'),
                                    foto: '/images/foto-interior-malam.jpg',
                                },
                            ]}
                        />
                    </div>
                </section>

                <CobaSekarang />

                <section className="ed-sec ed-faq-sec" id="faq">
                    <div>
                        <div className="ed-eyebrow" style={{ color: 'var(--faq-eyebrow)' }}>
                            {t('Pertanyaan Umum', 'Common Questions')}
                        </div>
                        <h2 className="ed-title" style={{ fontSize: 60, lineHeight: '57.6px' }}>
                            {t('Yang sering', 'Frequently')}
                            <br />
                            {t('ditanyakan.', 'asked.')}
                        </h2>
                    </div>
                    <AccordionFAQ
                        butir={[
                            { q: t('Apakah NalarRuang gratis?', 'Is NalarRuang free?'), a: t('Ya. Semua fitur bisa dipakai tanpa akun dan tanpa login.', 'Yes. Every feature works without an account or login.') },
                            {
                                q: t('Datanya dari mana?', 'Where does the data come from?'),
                                a: t(
                                    'Dari sembilan sumber data terbuka: InaRISK (BNPB), DEMNAS (BIG), IQAir, BPS, OpenStreetMap lewat Overpass API, GTFS Transjakarta, Jakarta Satu Data, ATR/BPN, dan JUTPI Phase 3.',
                                    'From nine open data sources: InaRISK (BNPB), DEMNAS (BIG), IQAir, BPS, OpenStreetMap via the Overpass API, GTFS Transjakarta, Jakarta Satu Data, ATR/BPN, and JUTPI Phase 3.',
                                ),
                            },
                            {
                                q: t('Bagaimana skor bintang dihitung?', 'How are star scores calculated?'),
                                a: t(
                                    'Untuk titik, dari jarak ke fasilitas utama persona: 3 bintang bila ≤ 1,2 km (15-minute city), 2 bintang ≤ 2,5 km, 1 bintang ≤ 5 km. Zen memakai kualitas udara dan jarak ke ruang hijau. Wilayah diberi centang cocok atau belum cocok.',
                                    'For a point, from the distance to the persona’s key facility: 3 stars if ≤ 1.2 km (15-minute city), 2 stars ≤ 2.5 km, 1 star ≤ 5 km. Zen uses air quality and distance to green space. Areas get a match / not-yet-a-match tick.',
                                ),
                            },
                            {
                                q: t('Apakah preferensiku disimpan?', 'Are my preferences stored?'),
                                a: t('Tidak. Pilihan persona hanya hidup selama sesi browser dan tidak dikirim untuk disimpan ke server.', 'No. Your persona choices live only in the browser session and are never sent to the server for storage.'),
                            },
                        ]}
                    />
                </section>

                <BandCTA />

                {menu && (
                    <div className="ed-menu" role="dialog" aria-modal="true" aria-label="Menu">
                        <button type="button" className="ed-menu__tutup" aria-label={t('Tutup menu', 'Close menu')} onClick={() => setMenu(false)}>
                            <Ikon name="x" size={24} />
                        </button>
                        <nav>
                            {MENU.map(([id, en, href]) => (
                                <a key={href} href={href} onClick={() => setMenu(false)}>
                                    {t(id, en)}
                                </a>
                            ))}
                            <a href="/peta">{t('Buka Peta', 'Open Map')}</a>
                        </nav>
                    </div>
                )}
            </div>
        </>
    );
}
