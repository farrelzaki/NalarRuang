from ubah import edit

edit('resources/js/Components/MenuPersona.tsx', [
("import { PERSONA, PERSONA_IDS, SUMBER, type Simbol } from '@/lib/nalar';", "import { PilihBahasa, useBahasa, type Dwi } from '@/lib/bahasa';\nimport { PERSONA, PERSONA_IDS, SUMBER, type Simbol } from '@/lib/nalar';"),
("""    const tutupRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        tutupRef.current?.focus();""", """    const { t } = useBahasa();
    const tutupRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        tutupRef.current?.focus();"""),
("""    const tabs: [TabMenu, string, string][] = [
        ['persona', 'Persona', 'users'],
        ['legenda', 'Legenda', 'map'],
        ['tentang', 'Tentang', 'info'],
    ];""", """    const tabs: [TabMenu, string, string][] = [
        ['persona', 'Persona', 'users'],
        ['legenda', t('Legenda', 'Legend'), 'map'],
        ['tentang', t('Tentang', 'About'), 'info'],
    ];"""),
("""                <Wordmark />
                <button ref={tutupRef} type="button" className="nr-drawer__close" aria-label="Tutup menu" onClick={onTutup}>
                    <Ikon name="x" size={15} />
                </button>""", """                <Wordmark />
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <PilihBahasa />
                    <button ref={tutupRef} type="button" className="nr-drawer__close" aria-label={t('Tutup menu', 'Close menu')} onClick={onTutup}>
                        <Ikon name="x" size={15} />
                    </button>
                </span>"""),
('<h3 className="nr-drawer__heading">Ubah Preferensi Persona</h3>', "<h3 className=\"nr-drawer__heading\">{t('Ubah Preferensi Persona', 'Change Persona Preferences')}</h3>"),
('<p className="nr-drawer__text">Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.</p>',
 "<p className=\"nr-drawer__text\">{t('Pilih persona yang mewakili keseharianmu. Ini akan mengubah rekomendasi di peta secara instan.', 'Choose the personas that reflect your daily life. Recommendations on the map update instantly.')}</p>"),
('<span className="nr-pcard__desc">{PERSONA[p].desc}</span>', '<span className="nr-pcard__desc">{t(PERSONA[p].desc)}</span>'),
("""function IsiLegenda() {
    const baris: [string, Simbol[], string | null][] = [
        ['Historis & Risiko', ['banjir'], 'Area rawan banjir historis (merah).'],
        ['Ekosistem Mikro', ['hijau'], 'Ruang hijau, taman & fasilitas gaya hidup (hijau).'],
        ['Legalitas Lahan', ['legal'], 'Pemetaan zona bidang tanah legal (ungu).'],
        ['Mobilitas & Transit', ['mrt', 'krl-bogor', 'krl-rangkas', 'lrt', 'stasiun', 'waktu'], null],
        ['Inklusivitas', ['trotoar', 'akses'], 'Trotoar layak (biru putus-putus) & titik akses disabilitas (biru).'],
    ];
    return (
        <>
            <h3 className="nr-drawer__heading">Legenda Peta</h3>
            <p className="nr-drawer__text">Panduan membaca simbol dan warna pada Visual Explorer.</p>
            {baris.map(([judul, simbol, teks]) => (
                <div key={judul} className="nr-lgrow">""", """function IsiLegenda() {
    const { t } = useBahasa();
    const baris: [Dwi, Simbol[], Dwi | null][] = [
        [['Historis & Risiko', 'History & Risk'], ['banjir'], ['Area rawan banjir historis (merah).', 'Historical flood-prone area (red).']],
        [['Ekosistem Mikro', 'Micro Ecosystem'], ['hijau'], ['Ruang hijau, taman & fasilitas gaya hidup (hijau).', 'Green space, parks & lifestyle amenities (green).']],
        [['Legalitas Lahan', 'Land Legality'], ['legal'], ['Pemetaan zona bidang tanah legal (ungu).', 'Legal land parcel zones (purple).']],
        [['Mobilitas & Transit', 'Mobility & Transit'], ['mrt', 'krl-bogor', 'krl-rangkas', 'lrt', 'stasiun', 'waktu'], null],
        [['Inklusivitas', 'Inclusivity'], ['trotoar', 'akses'], ['Trotoar layak (biru putus-putus) & titik akses disabilitas (biru).', 'Proper sidewalks (dashed blue) & disability access points (blue).']],
    ];
    return (
        <>
            <h3 className="nr-drawer__heading">{t('Legenda Peta', 'Map Legend')}</h3>
            <p className="nr-drawer__text">{t('Panduan membaca simbol dan warna pada Visual Explorer.', 'A guide to the symbols and colours in the Visual Explorer.')}</p>
            {baris.map(([judul, simbol, teks]) => (
                <div key={judul[0]} className="nr-lgrow">"""),
('<span className="nr-lgrow__title">{judul}</span>', '<span className="nr-lgrow__title">{t(judul)}</span>'),
('<span className="nr-lgrow__text">{teks}</span>', '<span className="nr-lgrow__text">{t(teks)}</span>'),
('<span className="nr-lgrow__text">MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih).</span>',
 "<span className=\"nr-lgrow__text\">{t('MRT (oranye solid) · KRL Merah · KRL Hijau · LRT (ungu solid) · Stasiun (titik putih).', 'MRT (solid orange) · KRL Red · KRL Green · LRT (solid purple) · Station (white dot).')}</span>"),
("""                                    Garis putus-putus ungu = <b>Mesin Waktu</b> (proyek 2026–2030).""",
 """                                    {t('Garis putus-putus ungu = ', 'Dashed purple line = ')}
                                    <b>{t('Mesin Waktu', 'Time Machine')}</b> {t('(proyek 2026–2030).', '(2026–2030 projects).')}"""),
("""function IsiTentang() {
    return (
        <>
            <h3 className="nr-drawer__heading">Tentang NalarRuang 2.0</h3>
            <p className="nr-drawer__text" style={{ color: 'var(--ink-55)' }}>
                Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka.
            </p>
            <Istilah judul="Isochrone">Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik.</Istilah>
            <Istilah judul="Point Inspector">Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta.</Istilah>
            <Istilah judul="Commute Simulator">Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum.</Istilah>
            <Istilah judul="Persona Grading">3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok.</Istilah>
            <Istilah judul="Sumber data">{SUMBER.join(' · ') + '. Peta dasar © OpenStreetMap contributors.'}</Istilah>
            <Istilah judul="Catatan">
                Skor dan rekomendasi merupakan estimasi dari data sekunder publik, bukan penilaian resmi. Versi demo: sebagian atribut (mis. kualitas udara, status lahan) masih data contoh. Dibuat oleh Kelompok 4 — Developer Rumah, IPB University.
            </Istilah>
        </>""", """function IsiTentang() {
    const { t } = useBahasa();
    return (
        <>
            <h3 className="nr-drawer__heading">{t('Tentang NalarRuang 2.0', 'About NalarRuang 2.0')}</h3>
            <p className="nr-drawer__text" style={{ color: 'var(--ink-55)' }}>
                {t(
                    'Platform analitik spasial untuk membantu keputusan memilih tempat tinggal di kawasan Jabodetabek berdasarkan data terbuka.',
                    'A spatial analytics platform that helps you choose where to live in Greater Jakarta (Jabodetabek) using open data.',
                )}
            </p>
            <Istilah judul="Isochrone">{t('Area yang bisa dijangkau dalam batas waktu tertentu dari satu titik.', 'The area reachable within a given time from a single point.')}</Istilah>
            <Istilah judul="Point Inspector">{t('Panel evaluasi kawasan (0–3 Bintang) yang muncul saat klik peta.', 'An area evaluation panel (0–3 stars) that appears when you click the map.')}</Istilah>
            <Istilah judul="Commute Simulator">{t('Kalkulator waktu & biaya estimasi kendaraan pribadi vs transportasi umum.', 'Estimated time & cost calculator: private vehicle vs public transport.')}</Istilah>
            <Istilah judul="Persona Grading">{t('3★ Sangat Cocok · 2★ Cukup · 1★ Kurang Cocok.', '3★ Great match · 2★ Fair · 1★ Poor match.')}</Istilah>
            <Istilah judul={t('Sumber data', 'Data sources')}>{SUMBER.join(' · ') + t('. Peta dasar © OpenStreetMap contributors.', '. Basemap © OpenStreetMap contributors.')}</Istilah>
            <Istilah judul={t('Catatan', 'Note')}>
                {t(
                    'Skor dan rekomendasi merupakan estimasi dari data sekunder publik, bukan penilaian resmi. Versi demo: sebagian atribut (mis. kualitas udara, status lahan) masih data contoh. Dibuat oleh Kelompok 4 — Developer Rumah, IPB University.',
                    'Scores and recommendations are estimates from public secondary data, not official assessments. Demo version: some attributes (e.g. air quality, land status) are still sample data. Built by Group 4 — Developer Rumah, IPB University.',
                )}
            </Istilah>
        </>"""),
("""    const [terpilih, setTerpilih] = useState<Persona[]>(awal);""", """    const { t } = useBahasa();
    const [terpilih, setTerpilih] = useState<Persona[]>(awal);"""),
("""                    Pilih Persona mu!
""", """                    {t('Pilih Persona mu!', 'Choose your Persona!')}
"""),
('<p className="nr-dialog__lead">Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.</p>',
 "<p className=\"nr-dialog__lead\">{t('Pilih minimal satu persona yang menggambarkan keseharianmu untuk mendapatkan rekomendasi dan kurasi hunian yang tepat sasaran.', 'Choose at least one persona that describes your daily life to get well-targeted housing recommendations.')}</p>"),
('<span className="nr-dcard__tag">{info.tag}</span>', '<span className="nr-dcard__tag">{t(info.tag)}</span>'),
('<span className="nr-dcard__desc">{info.desc}</span>', '<span className="nr-dcard__desc">{t(info.desc)}</span>'),
("""                            Pilih minimal satu persona dulu, ya.
""", """                            {t('Pilih minimal satu persona dulu, ya.', 'Please choose at least one persona first.')}
"""),
("""                        Mulai Jelajah
""", """                        {t('Mulai Jelajah', 'Start Exploring')}
"""),
])
