from ubah import edit

edit('resources/js/Map/PetaExplorer.tsx', [
("import * as gaya from './gaya';", "import { bahasaAktif, pilihTeks, type Bahasa } from '@/lib/bahasa';\nimport * as gaya from './gaya';"),
("""    modeRute: boolean;
""", """    modeRute: boolean;
    bahasa: Bahasa;
"""),
("""function popupHtml(jenis: string, judul: string, isi: string, sumber: string): string {""", """/** Teks peta mengikuti bahasa aktif saat dibuat (popup dibuat ulang setiap dibuka). */
const tr = (id: string, en: string) => pilihTeks(bahasaAktif(), id, en);

function popupHtml(jenis: string, judul: string, isi: string, sumber: string): string {"""),
("""data-detail>Lihat detail""", """data-detail>${esc(tr('Lihat detail', 'View details'))}"""),
("""const JENIS_LABEL: Record<string, string> = {
    banjir: 'Bahaya banjir', rth: 'Ruang terbuka hijau', poi: 'Kafe & restoran', akses: 'Akses disabilitas', trotoar: 'Trotoar',
    krl: 'Jalur KRL', mrt: 'Jalur MRT', lrt: 'Jalur LRT', stasiun: 'Stasiun', halte: 'Halte', tol: 'Gerbang tol', proyek: 'Proyek infrastruktur', legal: 'Bidang lahan',
};

function deskripsi(p: Record<string, any>): string {
    switch (p.jenis) {
        case 'banjir': return `Indeks bahaya banjir kelas ${p.kelas ?? '—'} menurut kajian InaRISK.`;
        case 'rth': return p.nama ? `${p.nama}. Ruang terbuka hijau publik.` : 'Ruang terbuka hijau publik.';
        case 'poi': return p.kategori ? `${p.kategori}.` : 'Tempat makan dan nongkrong.';
        case 'stasiun': return `${p.moda ? String(p.moda).toUpperCase() : 'Stasiun'}${p.lin ? ` · Lin ${p.lin}` : ''}.`;
        case 'krl': case 'mrt': case 'lrt': return p.nama ?? 'Jalur kereta.';
        case 'proyek': return `${p.status ?? 'Proyek'}${p.tahun ? `, target ${p.tahun}` : ''}.`;
        case 'legal': return `Status contoh: ${p.status ?? '—'}. Peruntukan: ${p.peruntukan ?? 'permukiman'}.`;
        case 'akses': return 'Fasilitas ditandai ramah kursi roda.';
        default: return p.nama ?? '';
    }
}""", """const JENIS_LABEL: Record<string, [string, string]> = {
    banjir: ['Bahaya banjir', 'Flood hazard'], rth: ['Ruang terbuka hijau', 'Green open space'], poi: ['Kafe & restoran', 'Cafés & restaurants'],
    akses: ['Akses disabilitas', 'Disability access'], trotoar: ['Trotoar', 'Sidewalk'], krl: ['Jalur KRL', 'KRL line'], mrt: ['Jalur MRT', 'MRT line'],
    lrt: ['Jalur LRT', 'LRT line'], stasiun: ['Stasiun', 'Station'], halte: ['Halte', 'Bus stop'], tol: ['Gerbang tol', 'Toll gate'],
    proyek: ['Proyek infrastruktur', 'Infrastructure project'], legal: ['Bidang lahan', 'Land parcel'],
};

/** Kosakata atribut data contoh (data/geojson/demo) yang tampil di popup. */
const ISTILAH_EN: Record<string, string> = {
    Kafe: 'Café', Restoran: 'Restaurant', 'Makanan cepat saji': 'Fast food', Mal: 'Mall', rendah: 'low', sedang: 'medium', tinggi: 'high',
    'Dalam pembangunan': 'Under construction', 'SHGB dalam proses': 'SHGB in process', Permukiman: 'Residential', permukiman: 'residential',
};
const istilah = (v: unknown) => (bahasaAktif() === 'en' ? (ISTILAH_EN[String(v)] ?? String(v)) : String(v));

function labelJenis(jenis: string): string {
    const l = JENIS_LABEL[jenis];
    return l ? tr(l[0], l[1]) : tr('Fitur', 'Feature');
}

function deskripsi(p: Record<string, any>): string {
    switch (p.jenis) {
        case 'banjir': return tr(`Indeks bahaya banjir kelas ${p.kelas ?? '—'} menurut kajian InaRISK.`, `Flood hazard index: ${istilah(p.kelas ?? '—')} class, per the InaRISK assessment.`);
        case 'rth': return (p.nama ? `${p.nama}. ` : '') + tr('Ruang terbuka hijau publik.', 'Public green open space.');
        case 'poi': return p.kategori ? `${istilah(p.kategori)}.` : tr('Tempat makan dan nongkrong.', 'A place to eat and hang out.');
        case 'stasiun': return `${p.moda ? String(p.moda).toUpperCase() : tr('Stasiun', 'Station')}${p.lin ? ` · ${tr('Lin', 'Line')} ${p.lin}` : ''}.`;
        case 'krl': case 'mrt': case 'lrt': return p.nama ?? tr('Jalur kereta.', 'Railway line.');
        case 'proyek': return `${p.status ? istilah(p.status) : tr('Proyek', 'Project')}${p.tahun ? `, target ${p.tahun}` : ''}.`;
        case 'legal': return tr(`Status contoh: ${p.status ?? '—'}. Peruntukan: ${p.peruntukan ?? 'permukiman'}.`, `Sample status: ${istilah(p.status ?? '—')}. Land use: ${istilah(p.peruntukan ?? 'permukiman')}.`);
        case 'akses': return tr('Fasilitas ditandai ramah kursi roda.', 'Facility marked as wheelchair-friendly.');
        default: return p.nama ?? '';
    }
}"""),
("""        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Perbesar peta', zoomOutTitle: 'Perkecil peta' }).addTo(m);""",
 """        L.control.zoom({ position: 'bottomright', zoomInTitle: tr('Perbesar peta', 'Zoom in'), zoomOutTitle: tr('Perkecil peta', 'Zoom out') }).addTo(m);"""),
("""    // Layer data.
""", """    // Bahasa: judul tombol zoom. Popup tidak perlu digambar ulang karena isinya dibuat saat dibuka.
    useEffect(() => {
        const set = (sel: string, teks: string) => {
            const el = wadah.current?.querySelector(sel);
            el?.setAttribute('title', teks);
            el?.setAttribute('aria-label', teks);
        };
        set('.leaflet-control-zoom-in', tr('Perbesar peta', 'Zoom in'));
        set('.leaflet-control-zoom-out', tr('Perkecil peta', 'Zoom out'));
        peta.current?.closePopup();
    }, [props.bahasa]);

    // Layer data.
"""),
("""        (l as L.Path).bindPopup(popupHtml(JENIS_LABEL[p.jenis] ?? 'Fitur', p.nama ?? JENIS_LABEL[p.jenis] ?? 'Tanpa nama', deskripsi(p), `Sumber: ${p.sumber ?? 'OSM'}`), {""",
 """        (l as L.Path).bindPopup(() => popupHtml(labelJenis(p.jenis), p.nama ?? labelJenis(p.jenis), deskripsi(p), `${tr('Sumber', 'Source')}: ${p.sumber ?? 'OSM'}`), {"""),
])

edit('resources/js/Pages/Peta.tsx', [
("import { api } from '@/lib/api';", "import { api } from '@/lib/api';\nimport { useBahasa } from '@/lib/bahasa';"),
("""export default function Peta() {
""", """export default function Peta() {
    const { t, bahasa } = useBahasa();
"""),
("kabar('Gagal menyimpan preferensi. Coba pilih lagi.', 'danger')", "kabar(t('Gagal menyimpan preferensi. Coba pilih lagi.', 'Could not save your preferences. Please choose again.'), 'danger')"),
("kabar('Pilih minimal satu persona dulu, ya.', 'warning')", "kabar(t('Pilih minimal satu persona dulu, ya.', 'Please choose at least one persona first.'), 'warning')"),
("""        ubahPersonaSesi(baru);
        kabar('Preferensi persona tersimpan untuk sesi ini.', 'success');""", """        ubahPersonaSesi(baru);
        kabar(t('Preferensi persona tersimpan untuk sesi ini.', 'Persona preferences saved for this session.'), 'success');"""),
("setGalatDetail('Layer ini belum punya data untuk lokasi yang kamu pilih.')", "setGalatDetail(t('Layer ini belum punya data untuk lokasi yang kamu pilih.', 'This layer has no data for the location you picked yet.'))"),
("setGalatDetail('Data wilayah belum tersedia.')", "setGalatDetail(t('Data wilayah belum tersedia.', 'Area data is not available yet.'))"),
("kabar('Estimasi tidak tersedia untuk titik ini. Coba titik yang lebih dekat ke jalan.', 'warning')", "kabar(t('Estimasi tidak tersedia untuk titik ini. Coba titik yang lebih dekat ke jalan.', 'No estimate for this point. Try a point closer to a road.'), 'warning')"),
("kabar('Estimasi tidak tersedia. Coba lagi sebentar.', 'danger')", "kabar(t('Estimasi tidak tersedia. Coba lagi sebentar.', 'Estimate unavailable. Please try again shortly.'), 'danger')"),
("kabar('Klik peta untuk menaruh titik A (asal), lalu titik B (tujuan).');", "kabar(t('Klik peta untuk menaruh titik A (asal), lalu titik B (tujuan).', 'Click the map to place point A (origin), then point B (destination).'));"),
("kabar(`Klik peta untuk menaruh titik ${k.toUpperCase()}.`);", "kabar(t(`Klik peta untuk menaruh titik ${k.toUpperCase()}.`, `Click the map to place point ${k.toUpperCase()}.`));"),
("""                                setDialogPersona(false);
                                kabar('Preferensi persona tersimpan untuk sesi ini.', 'success');""", """                                setDialogPersona(false);
                                kabar(t('Preferensi persona tersimpan untuk sesi ini.', 'Persona preferences saved for this session.'), 'success');"""),
('<Head title="Peta" />', "<Head title={t('Peta', 'Map')} />"),
("""                    modeRute={panelKiri === 'rute'}
""", """                    modeRute={panelKiri === 'rute'}
                    bahasa={bahasa}
"""),
])

edit('resources/js/Components/MenuPersona.tsx', [
("""        <div className="nr-dialog" role="dialog" aria-modal="true" aria-labelledby="nr-dialog-title">
""", """        <div className="nr-dialog" role="dialog" aria-modal="true" aria-labelledby="nr-dialog-title">
            <PilihBahasa className="nr-dialog__lang" />
"""),
])
