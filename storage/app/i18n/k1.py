from ubah import edit

edit('resources/js/Components/Dasar.tsx', [
("import { cx, type Simbol } from '@/lib/nalar';", "import { useBahasa } from '@/lib/bahasa';\nimport { cx, type Simbol } from '@/lib/nalar';"),
("""    const nilai = Math.max(0, Math.min(3, score));
""", """    const { t } = useBahasa();
    const nilai = Math.max(0, Math.min(3, score));
"""),
('<span className="nr-stars__zero">0 dari 3</span>', "<span className=\"nr-stars__zero\">{t('0 dari 3', '0 of 3')}</span>"),
("""    if (kind === 'memuat') {""", """    const { t } = useBahasa();
    if (kind === 'memuat') {"""),
("aria-label={title ?? 'Memuat'}", "aria-label={title ?? t('Memuat', 'Loading')}"),
("""export function PanelKanan({ title, className, onClose, children }: { title: string; className?: string; onClose: () => void; children: ReactNode }) {
""", """export function PanelKanan({ title, className, onClose, children }: { title: string; className?: string; onClose: () => void; children: ReactNode }) {
    const { t } = useBahasa();
"""),
("aria-label={`Tutup ${title.toLowerCase()}`}", "aria-label={`${t('Tutup', 'Close')} ${title.toLowerCase()}`}"),
])

edit('resources/js/Components/DetailLokasi.tsx', [
("import { cx, FRASA,", "import { teksServer, useBahasa } from '@/lib/bahasa';\nimport { cx, FRASA,"),
("""function BadgeProfil() {
    return (
        <span className="nr-badge" aria-hidden="true">
            Profil Anda
        </span>""", """function BadgeProfil() {
    const { t } = useBahasa();
    return (
        <span className="nr-badge" aria-hidden="true">
            {t('Profil Anda', 'Your Profile')}
        </span>"""),
("""    const info = PERSONA[persona];
    const wilayah""", """    const { t } = useBahasa();
    const info = PERSONA[persona];
    const wilayah"""),
("const label = `${info.label}, ${kurang ? 'data kurang' : wilayah ? (match ? 'cocok' : 'belum cocok') : `${score} dari 3 bintang`}${sesi ? ', profil anda' : ''}`;",
 "const label = `${info.label}, ${kurang ? t('data kurang', 'insufficient data') : wilayah ? (match ? t('cocok', 'match') : t('belum cocok', 'not a match yet')) : t(`${score} dari 3 bintang`, `${score} of 3 stars`)}${sesi ? t(', profil anda', ', your profile') : ''}`;"),
('<span className="nr-stars__na">Data kurang</span>', "<span className=\"nr-stars__na\">{t('Data kurang', 'Insufficient data')}</span>"),
("{match ? 'Cocok' : 'Belum cocok'}\n", "{match ? t('Cocok', 'Match') : t('Belum cocok', 'Not yet')}\n"),
("""export function KartuKesimpulan({ kalimat, tidakLengkap }: { kalimat: string[]; tidakLengkap?: boolean }) {
    return (""", """export function KartuKesimpulan({ kalimat, tidakLengkap }: { kalimat: string[]; tidakLengkap?: boolean }) {
    const { t } = useBahasa();
    return ("""),
('<div className="nr-summary__label">Kesimpulan Singkat</div>', "<div className=\"nr-summary__label\">{t('Kesimpulan Singkat', 'Quick Summary')}</div>"),
("Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.</p>", "{t('Sebagian data di lokasi ini belum lengkap, jadi skornya bisa berubah.', 'Some data at this location is incomplete, so the score may change.')}</p>"),
("""export function DetailLokasi({ data, memuat, galat, sesi, onTutup }: Props) {
    return (""", """export function DetailLokasi({ data, memuat, galat, sesi, onTutup }: Props) {
    const { t } = useBahasa();
    return ("""),
('<h2 className="nr-inspector__title">Detail Lokasi</h2>', "<h2 className=\"nr-inspector__title\">{t('Detail Lokasi', 'Location Details')}</h2>"),
('aria-label="Tutup detail lokasi"', "aria-label={t('Tutup detail lokasi', 'Close location details')}"),
('<Keadaan kind="galat" title="Data belum tersedia di sini" text={galat} /> : <Keadaan kind="memuat" title="Memuat detail lokasi" />',
 "<Keadaan kind=\"galat\" title={t('Data belum tersedia di sini', 'No data available here yet')} text={galat} /> : <Keadaan kind=\"memuat\" title={t('Memuat detail lokasi', 'Loading location details')} />"),
("""    const titik = data.jenis_geometri === 'titik';
    const kesimpulan""", """    const { t } = useBahasa();
    const titik = data.jenis_geometri === 'titik';
    const kesimpulan"""),
("return s == null ? null : `Buat gaya hidup ${label}: ${FRASA[s]}`;", "return s == null ? null : t(`Buat gaya hidup ${label}: ${FRASA[s][0]}`, `For the ${label} lifestyle: ${FRASA[s][1]}`);"),
("return `${data.match[p] ? 'Cocok' : 'Belum cocok'} untuk gaya hidup ${label}.`;", "return data.match[p] ? t(`Cocok untuk gaya hidup ${label}.`, `A match for the ${label} lifestyle.`) : t(`Belum cocok untuk gaya hidup ${label}.`, `Not yet a match for the ${label} lifestyle.`);"),
("{titik ? 'Titik Terpilih' : 'Area Terpilih'}", "{titik ? t('Titik Terpilih', 'Selected Point') : t('Area Terpilih', 'Selected Area')}"),
("                        {data.nama}\n", "                        {teksServer(data.nama)}\n"),
('<div className="nr-inspector__addr">{data.wilayah}</div>', '<div className="nr-inspector__addr">{teksServer(data.wilayah)}</div>'),
('aria-label="Kecocokan gaya hidup"', "aria-label={t('Kecocokan gaya hidup', 'Lifestyle match')}"),
('<h4 className="nr-inspector__subtitle">Kecocokan Gaya Hidup</h4>', "<h4 className=\"nr-inspector__subtitle\">{t('Kecocokan Gaya Hidup', 'Lifestyle Match')}</h4>"),
('aria-label="Data layer di lokasi ini"', "aria-label={t('Data layer di lokasi ini', 'Layer data at this location')}"),
("                            {l.teks}\n", "                            {teksServer(l.teks)}\n"),
])

edit('resources/js/Components/Pencarian.tsx', [
("import { cx, PERSONA, PERSONA_IDS } from '@/lib/nalar';", "import { teksServer, useBahasa } from '@/lib/bahasa';\nimport { cx, PERSONA, PERSONA_IDS } from '@/lib/nalar';"),
("""    const [fokus, setFokus] = useState(false);""", """    const { t } = useBahasa();
    const [fokus, setFokus] = useState(false);"""),
('placeholder="Telusuri kawasan atau alamat..."', "placeholder={t('Telusuri kawasan atau alamat...', 'Search an area or address...')}"),
('aria-label="Cari kawasan hunian"', "aria-label={t('Cari kawasan hunian', 'Search residential areas')}"),
('aria-label="Pilih kota dan persona" title="Pilih kota dan persona"', "aria-label={t('Pilih kota dan persona', 'Choose city and persona')} title={t('Pilih kota dan persona', 'Choose city and persona')}"),
('aria-label="Beralih ke Commute Simulator"', "aria-label={t('Beralih ke Commute Simulator', 'Switch to Commute Simulator')}"),
("""export function PanelTop3({ personaLabel, hasil, memuat, pesan, aktif, onPilih }: Top3Props) {
    return (""", """export function PanelTop3({ personaLabel, hasil, memuat, pesan, aktif, onPilih }: Top3Props) {
    const { t } = useBahasa();
    return ("""),
('aria-label="Top 3 rekomendasi"', "aria-label={t('Top 3 rekomendasi', 'Top 3 recommendations')}"),
('<span className="nr-label">Top 3 Rekomendasi</span>', "<span className=\"nr-label\">{t('Top 3 Rekomendasi', 'Top 3 Recommendations')}</span>"),
('<span className="nr-desc">Kawasan ideal berdasarkan profil {personaLabel}.</span>', "<span className=\"nr-desc\">{t(`Kawasan ideal berdasarkan profil ${personaLabel}.`, `Ideal areas for the ${personaLabel} profile.`)}</span>"),
('<Keadaan kind="memuat" title="Mencari kawasan" />', "<Keadaan kind=\"memuat\" title={t('Mencari kawasan', 'Searching areas')} />"),
("<Keadaan kind=\"kosong\" title={pesan ?? 'Belum ada kawasan yang cocok'} text=\"Coba longgarkan kata kunci atau pilih kota lain.\" />",
 "<Keadaan kind=\"kosong\" title={pesan ? teksServer(pesan) : t('Belum ada kawasan yang cocok', 'No matching area yet')} text={t('Coba longgarkan kata kunci atau pilih kota lain.', 'Try broader keywords or choose another city.')} />"),
("aria-label={`Peringkat ${i + 1} dari 3, ${r.nama}, ${r.match} persen cocok`}", "aria-label={t(`Peringkat ${i + 1} dari 3, ${r.nama}, ${r.match} persen cocok`, `Rank ${i + 1} of 3, ${r.nama}, ${r.match} percent match`)}"),
('<span className="nr-top3__type">{r.tipe_kawasan}</span>', '<span className="nr-top3__type">{teksServer(r.tipe_kawasan)}</span>'),
("""    const [kota, setKota] = useState<string[]>(['Bogor', 'Depok']);""", """    const { t } = useBahasa();
    const [kota, setKota] = useState<string[]>(['Bogor', 'Depok']);"""),
('<section className="nr-top3 nr-float" aria-label="Pilih kota dan persona">', "<section className=\"nr-top3 nr-float\" aria-label={t('Pilih kota dan persona', 'Choose city and persona')}>"),
('<span className="nr-label">Pilih Kota dan Persona</span>', "<span className=\"nr-label\">{t('Pilih Kota dan Persona', 'Choose City and Persona')}</span>"),
('<span className="nr-desc">Centang kota dan persona, lalu cari.</span>', "<span className=\"nr-desc\">{t('Centang kota dan persona, lalu cari.', 'Tick cities and personas, then search.')}</span>"),
('aria-label="Kota"', "aria-label={t('Kota', 'City')}"),
("                        Pakai persona sesi\n", "                        {t('Pakai persona sesi', 'Use session persona')}\n"),
("                        Cari\n", "                        {t('Cari', 'Search')}\n"),
])

edit('resources/js/Components/SimulatorRute.tsx', [
("import { cx, rupiah } from '@/lib/nalar';", "import { teksServer, useBahasa } from '@/lib/bahasa';\nimport { cx, rupiah } from '@/lib/nalar';"),
("""    const lengkap = !!(a && b && hasil);
    const baris = (huruf: 'A' | 'B', t: TitikRute, kunci: 'a' | 'b') => (""", """    const { t, bahasa } = useBahasa();
    const lengkap = !!(a && b && hasil);
    const baris = (huruf: 'A' | 'B', titik: TitikRute, kunci: 'a' | 'b') => ("""),
("{huruf === 'A' ? 'Titik asal' : 'Titik tujuan'}", "{huruf === 'A' ? t('Titik asal', 'Origin') : t('Titik tujuan', 'Destination')}"),
("value={t?.label ?? ''}", "value={titik ? teksServer(titik.label) : ''}"),
("placeholder={menunggu === kunci ? 'Klik lokasi di peta…' : 'Ketik alamat atau pilih di peta'}", "placeholder={menunggu === kunci ? t('Klik lokasi di peta…', 'Click a location on the map…') : t('Ketik alamat atau pilih di peta', 'Type an address or pick on the map')}"),
("                {!t && (", "                {!titik && ("),
("                        Pilih di peta\n", "                        {t('Pilih di peta', 'Pick on map')}\n"),
("aria-label={label + (kosong ? '' : na ? ', tidak tersedia' : `, ${m!.waktu_menit} menit, ${rupiah(m!.biaya)}`)}", "aria-label={label + (kosong ? '' : na ? t(', tidak tersedia', ', not available') : `, ${m!.waktu_menit} ${t('menit', 'minutes')}, ${rupiah(m!.biaya)}`)}"),
('<span className="nr-mode__na">Tidak tersedia</span>', "<span className=\"nr-mode__na\">{t('Tidak tersedia', 'Not available')}</span>"),
("{kunci === 'transit' ? 'Stasiun KRL terlalu jauh dari titik' : 'Coba titik yang lebih dekat ke jalan'}", "{kunci === 'transit' ? t('Stasiun KRL terlalu jauh dari titik', 'KRL station too far from the point') : t('Coba titik yang lebih dekat ke jalan', 'Try a point closer to a road')}"),
('<span className="nr-mode__unit">mnt</span>', "<span className=\"nr-mode__unit\">{t('mnt', 'min')}</span>"),
("const rincian = lengkap && moda === 'transit' && hasil?.publik ? `${hasil.publik.rincian}. ` : '';", "const rincian = lengkap && moda === 'transit' && hasil?.publik ? `${teksServer(hasil.publik.rincian)}. ` : '';"),
('aria-label="Simulator Rute"', "aria-label={t('Simulator Rute', 'Route Simulator')}"),
('<span className="nr-label">Simulator Rute</span>', "<span className=\"nr-label\">{t('Simulator Rute', 'Route Simulator')}</span>"),
("{jarak.toLocaleString('id-ID')} km", "{jarak.toLocaleString(bahasa === 'en' ? 'en-US' : 'id-ID')} km"),
('aria-label="Reset rute" title="Reset"', "aria-label={t('Reset rute', 'Reset route')} title=\"Reset\""),
('aria-label="Tutup Simulator Rute"', "aria-label={t('Tutup Simulator Rute', 'Close Route Simulator')}"),
('aria-label="Moda"', "aria-label={t('Moda', 'Mode')}"),
("{kotak('mobil', 'car', 'Mobil')}", "{kotak('mobil', 'car', t('Mobil', 'Car'))}"),
('<Keadaan kind="memuat" title="Menghitung rute" />', "<Keadaan kind=\"memuat\" title={t('Menghitung rute', 'Calculating route')} />"),
("{rincian}Estimasi tanpa lalu lintas real-time.</p>", "{rincian}{t('Estimasi tanpa lalu lintas real-time.', 'Estimate without real-time traffic.')}</p>"),
])

edit('resources/js/Components/PanelKananPeta.tsx', [
("import { cx, LAYERS, PERSONA, PERSONA_IDS } from '@/lib/nalar';", "import { useBahasa } from '@/lib/bahasa';\nimport { cx, LAYERS, PERSONA, PERSONA_IDS } from '@/lib/nalar';"),
("""export function PanelLayer({ aktif, status, onToggle, onCobaLagi, onTutup }: PanelLayerProps) {
    return (
        <PanelKanan title="Layer Spasial" onClose={onTutup}>""", """export function PanelLayer({ aktif, status, onToggle, onCobaLagi, onTutup }: PanelLayerProps) {
    const { t } = useBahasa();
    return (
        <PanelKanan title={t('Layer Spasial', 'Spatial Layers')} onClose={onTutup}>"""),
('<span className="nr-layer__title">{l.title}</span>', '<span className="nr-layer__title">{t(l.title)}</span>'),
('label="Memuat layer"', "label={t('Memuat layer', 'Loading layer')}"),
("<Toggle checked={nyala} label={l.title}", "<Toggle checked={nyala} label={t(l.title)}"),
('<span className="nr-layer__error">Layer gagal dimuat.</span>', "<span className=\"nr-layer__error\">{t('Layer gagal dimuat.', 'Layer failed to load.')}</span>"),
("                                    Coba lagi\n", "                                    {t('Coba lagi', 'Try again')}\n"),
("                                        {teks}\n", "                                        {t(teks)}\n"),
('<span className="nr-layer__desc">{l.desc}</span>', '<span className="nr-layer__desc">{t(l.desc)}</span>'),
("""export function PanelProfilPersona({ terpilih, onUbah, onTutup }: { terpilih: Persona[]; onUbah: (p: Persona) => void; onTutup: () => void }) {
    return (
        <PanelKanan title="Profil Persona\"""", """export function PanelProfilPersona({ terpilih, onUbah, onTutup }: { terpilih: Persona[]; onUbah: (p: Persona) => void; onTutup: () => void }) {
    const { t } = useBahasa();
    return (
        <PanelKanan title={t('Profil Persona', 'Persona Profile')}"""),
("""export function TombolMerek({ terbuka, onKlik }: { terbuka: boolean; onKlik: () => void }) {
    return (
        <button type="button" className="nr-brandbtn" aria-label="Buka menu NalarRuang\"""", """export function TombolMerek({ terbuka, onKlik }: { terbuka: boolean; onKlik: () => void }) {
    const { t } = useBahasa();
    return (
        <button type="button" className="nr-brandbtn" aria-label={t('Buka menu NalarRuang', 'Open NalarRuang menu')}"""),
("""export function SliderTahun({ tahun, onUbah, kosong }: { tahun: number; onUbah: (t: number) => void; kosong?: boolean }) {
""", """export function SliderTahun({ tahun, onUbah, kosong }: { tahun: number; onUbah: (t: number) => void; kosong?: boolean }) {
    const { t: tr } = useBahasa();
"""),
('aria-label="Tahun proyek infrastruktur"', "aria-label={tr('Tahun proyek infrastruktur', 'Infrastructure project year')}"),
("aria-valuetext={`Tahun ${tahun}`}", "aria-valuetext={`${tr('Tahun', 'Year')} ${tahun}`}"),
('{kosong && <p className="nr-slider__empty">Belum ada proyek di tahun ini.</p>}', "{kosong && <p className=\"nr-slider__empty\">{tr('Belum ada proyek di tahun ini.', 'No projects in this year yet.')}</p>}"),
])
