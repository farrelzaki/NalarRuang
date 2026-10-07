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

const MENU = [
    ['Visi & Misi', '#visi'],
    ['Persona', '#persona'],
    ['Fitur', '#fitur'],
    ['Layer', '#layer'],
    ['Cara Kerja', '#cara-kerja'],
    ['FAQ', '#faq'],
];

export default function Landing() {
    const [menu, setMenu] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.theme = 'editorial';
        return () => {
            delete document.documentElement.dataset.theme;
        };
    }, []);

    return (
        <>
            <Head title="Hunian yang cocok. Kota yang terbaca." />
            <div className="ed-page">
                <HeroLanding onMenu={() => setMenu(true)} />

                <section className="ed-sec" id="visi">
                    <JudulSeksi intro="Mengurai Visi," judul="Menata Kota Bersama." />
                    <div style={{ marginTop: 64 }}>
                        <KolomFitur
                            kolom={[
                                { judul: 'Spasial', teks: 'Menganalisis data ruang kota secara komprehensif. Menghindari asumsi buta, tapi membantu pencarian berbasis bukti. Fokus pada fakta jarak dan aksesibilitas.' },
                                { judul: 'Persona', teks: 'Menyesuaikan dengan gaya hidupmu. Kenyamanan tanpa kemudahan akses adalah mustahil. Kami merangkul kebutuhan unik perjalanan setiap orang.' },
                                { judul: 'Rekomendasi', teks: 'Belajar dari pola kehidupan kota terbaik. Memberikan pilihan kawasan hunian secara terbuka. Mengadaptasi data makro perkotaan ke realita kebutuhan mikromu.' },
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
                            Empat Cara
                            <br />
                            Memandang Suatu Kota.
                        </h2>
                        <p className="ed-lead-tengah">
                            Pilihanmu dapat beririsan. Temukan persona yang paling menggambarkan keseharianmu untuk mendapatkan hasil pencarian hunian terbaik.
                        </p>
                    </div>
                    <div className="ed-persona-row">
                        <KartuFotoPersona nama="Commuter" desc="Mengutamakan akses transit, seperti stasiun dan halte." src="/images/foto-bundaran-hi.jpg" rotasi={-4} />
                        <KartuFotoPersona nama="Social & Vibe" desc="Mengutamakan hiburan, kafe, dan restoran." src="/images/foto-interior-malam.jpg" rotasi={-1.5} />
                        <KartuFotoPersona nama="Driver" desc="Mengutamakan akses jalan utama dan gerbang tol." src="/images/foto-aerial-jakarta.jpg" rotasi={1} />
                        <KartuFotoPersona nama="Zen" desc="Mengutamakan keamanan, minim polusi, dan ruang terbuka hijau." src="/images/foto-aerial-jakarta.jpg" posisi="center 85%" rotasi={4} />
                    </div>
                </section>

                <section className="ed-sec" id="fitur">
                    <JudulSeksi varian="kiri" eyebrow="Fitur Utama" judul="Tiga cara menjelajah." />
                    <div className="ed-fitur-grid">
                        <KartuFitur judul="Requirement Search" desc="Ketik kebutuhanmu, dapatkan tiga kawasan paling cocok lengkap dengan persen kecocokan." gambar="/images/fitur-search.jpg" />
                        <KartuFitur judul="Smart Point Inspector" desc="Klik titik mana pun untuk melihat skor 0–3 bintang per persona dan kesimpulannya." gambar="/images/fitur-inspector.jpg" />
                        <KartuFitur judul="Commute Simulator" desc="Bandingkan waktu dan biaya mobil pribadi dengan transportasi umum." gambar="/images/fitur-commute.jpg" />
                    </div>
                </section>

                <section className="ed-sec ed-layer-sec" id="layer">
                    <div>
                        <h2 className="ed-title" style={{ fontSize: 64, lineHeight: '61px' }}>
                            Enam layer,
                            <br />
                            satu kota.
                        </h2>
                        <p className="ed-body" style={{ marginTop: 24, maxWidth: 420 }}>
                            Berbagai data spasial digabungkan menjadi enam layer interaktif untuk memberikan perspektif komprehensif tentang kelayakan hunian, risiko bencana, dan ekosistem di sekitarnya.
                        </p>
                    </div>
                    <div className="ed-tiles">
                        <div className="ed-tiles__col">
                            <TileLayer judul="Historis & Risiko" src="/images/foto-bundaran-hi.jpg" />
                            <TileLayer judul="Mobilitas & Transit" src="/images/foto-aerial-jakarta.jpg" tinggi={300} />
                        </div>
                        <div className="ed-tiles__col" style={{ marginTop: 48 }}>
                            <TileLayer judul="Ekosistem Mikro" src="/images/foto-aerial-jakarta.jpg" posisi="center 80%" tinggi={276} />
                            <TileLayer judul="Mesin Waktu" src="/images/foto-interior-malam.jpg" />
                        </div>
                        <div className="ed-tiles__col">
                            <TileLayer judul="Inklusivitas" src="/images/foto-bundaran-hi.jpg" posisi="center 90%" tinggi={216} />
                            <TileLayer judul="Legalitas Lahan" src="/images/foto-aerial-jakarta.jpg" posisi="center 20%" tinggi={260} />
                        </div>
                    </div>
                </section>

                <section className="ed-sec">
                    <StripSumberData />
                </section>

                <section className="ed-sec" id="cara-kerja">
                    <JudulSeksi
                        varian="kurung"
                        eyebrow="[ Cara Kerja ]"
                        judul={
                            <>
                                Dari Data Terbuka
                                <br />
                                ke Rekomendasi.
                            </>
                        }
                    />
                    <div style={{ marginTop: 64 }}>
                        <KartuLangkah
                            langkah={[
                                { no: '01', judul: 'Kumpulkan', teks: 'Data publik mentah dihimpun dari OpenStreetMap, InaRISK, dan ATR/BPN.' },
                                { no: '02', judul: 'Olah', teks: 'Pembersihan dan penataan struktur data di QGIS menjadi enam layer spasial.' },
                                { no: '03', judul: 'Hitung', teks: 'Interseksi spasial dan pembobotan skor persona (0–3 bintang).' },
                                { no: '04', judul: 'Tampilkan', teks: 'Rekomendasi 3 besar, Point Inspector, dan hasil Commute Simulator disajikan.', foto: '/images/foto-interior-malam.jpg' },
                            ]}
                        />
                    </div>
                </section>

                <CobaSekarang />

                <section className="ed-sec ed-faq-sec" id="faq">
                    <div>
                        <div className="ed-eyebrow" style={{ color: 'var(--faq-eyebrow)' }}>
                            Pertanyaan Umum
                        </div>
                        <h2 className="ed-title" style={{ fontSize: 60, lineHeight: '57.6px' }}>
                            Yang sering
                            <br />
                            ditanyakan.
                        </h2>
                    </div>
                    <AccordionFAQ
                        butir={[
                            { q: 'Apakah NalarRuang gratis?', a: 'Ya. Semua fitur bisa dipakai tanpa akun dan tanpa login.' },
                            {
                                q: 'Datanya dari mana?',
                                a: 'Dari sembilan sumber data terbuka: InaRISK (BNPB), DEMNAS (BIG), IQAir, BPS, OpenStreetMap lewat Overpass API, GTFS Transjakarta, Jakarta Satu Data, ATR/BPN, dan JUTPI Phase 3.',
                            },
                            { q: 'Bagaimana skor bintang dihitung?', a: 'Untuk titik, dari jarak ke fasilitas utama persona: 3 bintang bila ≤ 1,2 km (15-minute city), 2 bintang ≤ 2,5 km, 1 bintang ≤ 5 km. Zen memakai kualitas udara dan jarak ke ruang hijau. Wilayah diberi centang cocok atau belum cocok.' },
                            { q: 'Apakah preferensiku disimpan?', a: 'Tidak. Pilihan persona hanya hidup selama sesi browser dan tidak dikirim untuk disimpan ke server.' },
                        ]}
                    />
                </section>

                <BandCTA />

                {menu && (
                    <div className="ed-menu" role="dialog" aria-modal="true" aria-label="Menu">
                        <button type="button" className="ed-menu__tutup" aria-label="Tutup menu" onClick={() => setMenu(false)}>
                            <Ikon name="x" size={24} />
                        </button>
                        <nav>
                            {MENU.map(([label, href]) => (
                                <a key={href} href={href} onClick={() => setMenu(false)}>
                                    {label}
                                </a>
                            ))}
                            <a href="/peta">Buka Peta</a>
                        </nav>
                    </div>
                )}
            </div>
        </>
    );
}
