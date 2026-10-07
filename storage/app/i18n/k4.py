from ubah import edit

S = 'resources/js/Components/Landing/Seksi.tsx'
edit(S, [
("import { cx, SUMBER } from '@/lib/nalar';", "import { PilihBahasa, useBahasa } from '@/lib/bahasa';\nimport { cx, SUMBER } from '@/lib/nalar';"),
("""export function HeroLanding({ onMenu }: { onMenu: () => void }) {
    return (""", """export function HeroLanding({ onMenu }: { onMenu: () => void }) {
    const { t } = useBahasa();
    return ("""),
("""                    <Link className="ed-hbtn ed-hbtn--sm" href="/peta">
                        Menuju Peta
                    </Link>""", """                    <span className="ed-header__kanan">
                        <PilihBahasa gelap />
                        <Link className="ed-hbtn ed-hbtn--sm" href="/peta">
                            {t('Menuju Peta', 'Go to Map')}
                        </Link>
                    </span>"""),
("""                        <span>Data Spasial</span>""", """                        <span>{t('Data Spasial', 'Spatial Data')}</span>"""),
("""                        <span>Rekomendasi</span>""", """                        <span>{t('Rekomendasi', 'Recommendation')}</span>"""),
("""                        Hunian yang cocok.
                        <br />
                        Kota yang terbaca.""", """                        {t('Hunian yang cocok.', 'A home that fits.')}
                        <br />
                        {t('Kota yang terbaca.', 'A city you can read.')}"""),
('<p className="ed-hero__sub">Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif.</p>',
 "<p className=\"ed-hero__sub\">{t('Temukan ruang hidup idealmu dengan analisis data spasial perkotaan yang komprehensif.', 'Find your ideal living space with comprehensive urban spatial data analysis.')}</p>"),
("""export function VisiKami() {
    return (""", """export function VisiKami() {
    const { t } = useBahasa();
    return ("""),
("""                    Menjadi pionir platform inteligensi tata ruang yang meredefinisi standar eksplorasi hunian di Jabodetabek, mengonversi kompleksitas data spasial menjadi wawasan
                    terpersonalisasi guna memberdayakan keputusan hidup yang presisi.""", """                    {t(
                        'Menjadi pionir platform inteligensi tata ruang yang meredefinisi standar eksplorasi hunian di Jabodetabek, mengonversi kompleksitas data spasial menjadi wawasan terpersonalisasi guna memberdayakan keputusan hidup yang presisi.',
                        'To pioneer a spatial intelligence platform that redefines how people explore homes in Jabodetabek, turning complex spatial data into personalised insight that empowers precise life decisions.',
                    )}"""),
("""export function MisiKami() {
    const misi = [
        'Menyediakan integrasi pemetaan data spasial multi-layer (mencakup historis & risiko, ekosistem mikro, inklusivitas, dan mobilitas) yang transparan dan mudah diakses oleh publik.',
        'Menghadirkan pengalaman pencarian kawasan hunian yang berpusat pada pengguna (user-centric) melalui sistem grading berbasis persona gaya hidup (Commuter, Driver, Social & Vibe, Zen).',
        'Mendobrak asimetri informasi tata ruang dengan menyajikan alat analitik interaktif, seperti Smart Point Inspector dan Commute Simulator, guna mendukung pengambilan keputusan yang tepat dan berbasis data.',
    ];""", """export function MisiKami() {
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
    ];"""),
("""export function KartuFitur({ judul, desc, gambar }: { judul: string; desc: string; gambar: string }) {
    return (""", """export function KartuFitur({ judul, desc, gambar }: { judul: string; desc: string; gambar: string }) {
    const { t } = useBahasa();
    return ("""),
("aria-label={`Cuplikan peta ${judul}`}", "aria-label={t(`Cuplikan peta ${judul}`, `${judul} map preview`)}"),
("""                Pelajari
""", """                {t('Pelajari', 'Learn more')}
"""),
("""export function StripSumberData() {
    return (""", """export function StripSumberData() {
    const { t } = useBahasa();
    return ("""),
("""                Sumber Data Terbuka
""", """                {t('Sumber Data Terbuka', 'Open Data Sources')}
"""),
("""                Buka Peta Interaktif
""", """                {t('Buka Peta Interaktif', 'Open Interactive Map')}
"""),
("""export function CobaSekarang() {
    return (""", """export function CobaSekarang() {
    const { t } = useBahasa();
    return ("""),
('<span className="ed-try__tag">Interaktif</span>', "<span className=\"ed-try__tag\">{t('Interaktif', 'Interactive')}</span>"),
('<h2 className="ed-try__title">Coba Sekarang</h2>', "<h2 className=\"ed-try__title\">{t('Coba Sekarang', 'Try It Now')}</h2>"),
('<p className="ed-try__text">Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu.</p>',
 "<p className=\"ed-try__text\">{t('Gunakan fitur pencarian, filter layer, dan persona untuk mensimulasikan pencarian kawasan idealmu.', 'Use search, layer filters, and personas to simulate finding your ideal area.')}</p>"),
("""                        Buka Peta
                        <Ikon name="arrow-right\"""", """                        {t('Buka Peta', 'Open Map')}
                        <Ikon name="arrow-right\""""),
("""export function BandCTA() {
    return (""", """export function BandCTA() {
    const { t } = useBahasa();
    return ("""),
("""                    Siap membaca
                    <br />
                    kotamu sendiri?""", """                    {t('Siap membaca', 'Ready to read')}
                    <br />
                    {t('kotamu sendiri?', 'your own city?')}"""),
("font: '400 19px/30.9px var(--font-inter)', color: 'var(--stone-50-80)' }}>Pilih persona, buka peta, dan lihat kotamu dari sudut yang berbeda.</p>",
 "font: '400 19px/30.9px var(--font-sans)', color: 'var(--stone-50-80)' }}>\n                    {t('Pilih persona, buka peta, dan lihat kotamu dari sudut yang berbeda.', 'Choose a persona, open the map, and see your city from a different angle.')}\n                </p>"),
("""                    Mulai Cari Hunian
""", """                    {t('Mulai Cari Hunian', 'Start Finding a Home')}
"""),
('<div className="ed-footer__label">Hubungi Kami</div>', "<div className=\"ed-footer__label\">{t('Hubungi Kami', 'Contact Us')}</div>"),
('<div className="ed-footer__label">Kontak</div>\n                        Kerja Sama', "<div className=\"ed-footer__label\">{t('Kontak', 'Contact')}</div>\n                        {t('Kerja Sama', 'Partnerships')}"),
('<div className="ed-footer__label">Ikuti</div>', "<div className=\"ed-footer__label\">{t('Ikuti', 'Follow')}</div>"),
('<span>Skor dan rekomendasi merupakan estimasi dari data sekunder publik.</span>', "<span>{t('Skor dan rekomendasi merupakan estimasi dari data sekunder publik.', 'Scores and recommendations are estimates from public secondary data.')}</span>"),
])

L = 'resources/js/Pages/Landing.tsx'
edit(L, [
("import { Ikon } from '@/Components/Dasar';", "import { Ikon } from '@/Components/Dasar';\nimport { useBahasa } from '@/lib/bahasa';\nimport { PERSONA } from '@/lib/nalar';"),
("""const MENU = [
    ['Visi & Misi', '#visi'],
    ['Persona', '#persona'],
    ['Fitur', '#fitur'],
    ['Layer', '#layer'],
    ['Cara Kerja', '#cara-kerja'],
    ['FAQ', '#faq'],
];

export default function Landing() {
    const [menu, setMenu] = useState(false);
""", """const MENU: [string, string, string][] = [
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
"""),
('<Head title="Hunian yang cocok. Kota yang terbaca." />', "<Head title={t('Hunian yang cocok. Kota yang terbaca.', 'A home that fits. A city you can read.')} />"),
('<JudulSeksi intro="Mengurai Visi," judul="Menata Kota Bersama." />', "<JudulSeksi intro={t('Mengurai Visi,', 'Unpacking the Vision,')} judul={t('Menata Kota Bersama.', 'Shaping the City Together.')} />"),
("""                                { judul: 'Spasial', teks: 'Menganalisis data ruang kota secara komprehensif. Menghindari asumsi buta, tapi membantu pencarian berbasis bukti. Fokus pada fakta jarak dan aksesibilitas.' },
                                { judul: 'Persona', teks: 'Menyesuaikan dengan gaya hidupmu. Kenyamanan tanpa kemudahan akses adalah mustahil. Kami merangkul kebutuhan unik perjalanan setiap orang.' },
                                { judul: 'Rekomendasi', teks: 'Belajar dari pola kehidupan kota terbaik. Memberikan pilihan kawasan hunian secara terbuka. Mengadaptasi data makro perkotaan ke realita kebutuhan mikromu.' },""",
"""                                {
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
                                },"""),
("""                            Empat Cara
                            <br />
                            Memandang Suatu Kota.""", """                            {t('Empat Cara', 'Four Ways')}
                            <br />
                            {t('Memandang Suatu Kota.', 'of Seeing a City.')}"""),
("""                            Pilihanmu dapat beririsan. Temukan persona yang paling menggambarkan keseharianmu untuk mendapatkan hasil pencarian hunian terbaik.""",
 """                            {t(
                                'Pilihanmu dapat beririsan. Temukan persona yang paling menggambarkan keseharianmu untuk mendapatkan hasil pencarian hunian terbaik.',
                                'Your choices can overlap. Find the personas that best describe your daily life to get the best home search results.',
                            )}"""),
('desc="Mengutamakan akses transit, seperti stasiun dan halte."', 'desc={t(PERSONA.commuter.desc)}'),
('desc="Mengutamakan hiburan, kafe, dan restoran."', 'desc={t(PERSONA.social_vibe.desc)}'),
('desc="Mengutamakan akses jalan utama dan gerbang tol."', 'desc={t(PERSONA.driver.desc)}'),
('desc="Mengutamakan keamanan, minim polusi, dan ruang terbuka hijau."', 'desc={t(PERSONA.zen.desc)}'),
('<JudulSeksi varian="kiri" eyebrow="Fitur Utama" judul="Tiga cara menjelajah." />', "<JudulSeksi varian=\"kiri\" eyebrow={t('Fitur Utama', 'Key Features')} judul={t('Tiga cara menjelajah.', 'Three ways to explore.')} />"),
('desc="Ketik kebutuhanmu, dapatkan tiga kawasan paling cocok lengkap dengan persen kecocokan."', "desc={t('Ketik kebutuhanmu, dapatkan tiga kawasan paling cocok lengkap dengan persen kecocokan.', 'Type what you need and get the three best-matching areas with a match percentage.')}"),
('desc="Klik titik mana pun untuk melihat skor 0–3 bintang per persona dan kesimpulannya."', "desc={t('Klik titik mana pun untuk melihat skor 0–3 bintang per persona dan kesimpulannya.', 'Click any point to see a 0–3 star score per persona and a summary.')}"),
('desc="Bandingkan waktu dan biaya mobil pribadi dengan transportasi umum."', "desc={t('Bandingkan waktu dan biaya mobil pribadi dengan transportasi umum.', 'Compare the time and cost of driving with public transport.')}"),
("""                            Enam layer,
                            <br />
                            satu kota.""", """                            {t('Enam layer,', 'Six layers,')}
                            <br />
                            {t('satu kota.', 'one city.')}"""),
("""                            Berbagai data spasial digabungkan menjadi enam layer interaktif untuk memberikan perspektif komprehensif tentang kelayakan hunian, risiko bencana, dan ekosistem di sekitarnya.""",
 """                            {t(
                                'Berbagai data spasial digabungkan menjadi enam layer interaktif untuk memberikan perspektif komprehensif tentang kelayakan hunian, risiko bencana, dan ekosistem di sekitarnya.',
                                'Diverse spatial data combined into six interactive layers for a comprehensive view of livability, disaster risk, and the surrounding ecosystem.',
                            )}"""),
('<TileLayer judul="Historis & Risiko"', "<TileLayer judul={t('Historis & Risiko', 'History & Risk')}"),
('<TileLayer judul="Mobilitas & Transit"', "<TileLayer judul={t('Mobilitas & Transit', 'Mobility & Transit')}"),
('<TileLayer judul="Ekosistem Mikro"', "<TileLayer judul={t('Ekosistem Mikro', 'Micro Ecosystem')}"),
('<TileLayer judul="Mesin Waktu"', "<TileLayer judul={t('Mesin Waktu', 'Time Machine')}"),
('<TileLayer judul="Inklusivitas"', "<TileLayer judul={t('Inklusivitas', 'Inclusivity')}"),
('<TileLayer judul="Legalitas Lahan"', "<TileLayer judul={t('Legalitas Lahan', 'Land Legality')}"),
('eyebrow="[ Cara Kerja ]"', "eyebrow={t('[ Cara Kerja ]', '[ How It Works ]')}"),
("""                                Dari Data Terbuka
                                <br />
                                ke Rekomendasi.""", """                                {t('Dari Data Terbuka', 'From Open Data')}
                                <br />
                                {t('ke Rekomendasi.', 'to Recommendations.')}"""),
("""                                { no: '01', judul: 'Kumpulkan', teks: 'Data publik mentah dihimpun dari OpenStreetMap, InaRISK, dan ATR/BPN.' },
                                { no: '02', judul: 'Olah', teks: 'Pembersihan dan penataan struktur data di QGIS menjadi enam layer spasial.' },
                                { no: '03', judul: 'Hitung', teks: 'Interseksi spasial dan pembobotan skor persona (0–3 bintang).' },
                                { no: '04', judul: 'Tampilkan', teks: 'Rekomendasi 3 besar, Point Inspector, dan hasil Commute Simulator disajikan.', foto: '/images/foto-interior-malam.jpg' },""",
"""                                { no: '01', judul: t('Kumpulkan', 'Collect'), teks: t('Data publik mentah dihimpun dari OpenStreetMap, InaRISK, dan ATR/BPN.', 'Raw public data is gathered from OpenStreetMap, InaRISK, and ATR/BPN.') },
                                { no: '02', judul: t('Olah', 'Process'), teks: t('Pembersihan dan penataan struktur data di QGIS menjadi enam layer spasial.', 'Data is cleaned and structured in QGIS into six spatial layers.') },
                                { no: '03', judul: t('Hitung', 'Score'), teks: t('Interseksi spasial dan pembobotan skor persona (0–3 bintang).', 'Spatial intersection and persona score weighting (0–3 stars).') },
                                {
                                    no: '04',
                                    judul: t('Tampilkan', 'Present'),
                                    teks: t('Rekomendasi 3 besar, Point Inspector, dan hasil Commute Simulator disajikan.', 'Top 3 recommendations, the Point Inspector, and Commute Simulator results are presented.'),
                                    foto: '/images/foto-interior-malam.jpg',
                                },"""),
("""                            Pertanyaan Umum
""", """                            {t('Pertanyaan Umum', 'Common Questions')}
"""),
("""                            Yang sering
                            <br />
                            ditanyakan.""", """                            {t('Yang sering', 'Frequently')}
                            <br />
                            {t('ditanyakan.', 'asked.')}"""),
("""                            { q: 'Apakah NalarRuang gratis?', a: 'Ya. Semua fitur bisa dipakai tanpa akun dan tanpa login.' },
                            {
                                q: 'Datanya dari mana?',
                                a: 'Dari sembilan sumber data terbuka: InaRISK (BNPB), DEMNAS (BIG), IQAir, BPS, OpenStreetMap lewat Overpass API, GTFS Transjakarta, Jakarta Satu Data, ATR/BPN, dan JUTPI Phase 3.',
                            },
                            { q: 'Bagaimana skor bintang dihitung?', a: 'Untuk titik, dari jarak ke fasilitas utama persona: 3 bintang bila ≤ 1,2 km (15-minute city), 2 bintang ≤ 2,5 km, 1 bintang ≤ 5 km. Zen memakai kualitas udara dan jarak ke ruang hijau. Wilayah diberi centang cocok atau belum cocok.' },
                            { q: 'Apakah preferensiku disimpan?', a: 'Tidak. Pilihan persona hanya hidup selama sesi browser dan tidak dikirim untuk disimpan ke server.' },""",
"""                            { q: t('Apakah NalarRuang gratis?', 'Is NalarRuang free?'), a: t('Ya. Semua fitur bisa dipakai tanpa akun dan tanpa login.', 'Yes. Every feature works without an account or login.') },
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
                            },"""),
('<div className="ed-menu" role="dialog" aria-modal="true" aria-label="Menu">', "<div className=\"ed-menu\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Menu\">"),
('aria-label="Tutup menu"', "aria-label={t('Tutup menu', 'Close menu')}"),
("""                            {MENU.map(([label, href]) => (
                                <a key={href} href={href} onClick={() => setMenu(false)}>
                                    {label}
                                </a>
                            ))}
                            <a href="/peta">Buka Peta</a>""", """                            {MENU.map(([id, en, href]) => (
                                <a key={href} href={href} onClick={() => setMenu(false)}>
                                    {t(id, en)}
                                </a>
                            ))}
                            <a href="/peta">{t('Buka Peta', 'Open Map')}</a>"""),
])
