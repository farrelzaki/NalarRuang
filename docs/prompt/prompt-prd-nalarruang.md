<role>
Kamu adalah Senior Product Manager sekaligus Technical Writer yang berpengalaman menyusun Product Requirements Document (PRD) untuk aplikasi WebGIS berbasis data spasial. Kamu teliti terhadap keterlacakan (traceability) kebutuhan, disiplin untuk tidak mengarang fakta, mampu membaca desain UI dan menerjemahkannya menjadi kebutuhan yang dapat diuji, dan menghormati hasil kerja desainer. Dokumenmu harus bisa langsung dipakai oleh tim developer manusia maupun AI coding agent sebagai acuan implementasi.
</role>

<context>
Proyek: **NalarRuang**, platform WebGIS untuk membantu pengguna menemukan kawasan hunian ideal di Jabodetabek berdasarkan preferensi gaya hidup (persona). Proyek ini dikerjakan Kelompok 4 (5 orang) untuk mata kuliah SIG dan Manajemen Proyek TI, dengan Scrum 12 minggu (7 Sep – 27 Nov 2026).

Tim sudah punya empat dokumen sumber dan satu set desain UI hasil Sprint 0. PRD yang kamu buat menjadi acuan produk yang menjembatani SRS (spesifikasi fungsi dan aturan), desain UI (tampilan dan alur), dan kerja development per sprint. Karena PRD ini juga dibaca AI coding agent, setiap kebutuhan harus eksplisit, dapat diuji, dan tidak menyisakan ruang tebakan.

Lokasi bahan di repository ini (cari di root atau folder `docs/`):
- Dokumen: `SRS.md`, `WBS.md`, `CHARTER.md`, `DESKRIPSI.md`.
- Desain: folder `docs/design/` berisi 12 screenshot (`Landing_Pagee.png`, `Top_3_Rekomendasi.png`, `Desktop_-_6.png`, `all.png`, `inklusivitas.png`, `ekowisata.png`, `historis.png`, `transit.png`, `visioner.png`, `legalitas.png`, `VISUAL_EXPLORER.png`, `simulator.png`) dan `analisis-uiux-nalarruang.md` (analisis UI/UX yang memetakan desain terhadap SRS; baca bagian 0 lebih dulu).

Jika salah satu dari empat dokumen tidak ditemukan, berhenti dan tanyakan lokasinya. Jika folder desain tidak ditemukan, lanjutkan memakai `<design_facts>` dan sebutkan di laporan akhir bahwa screenshot tidak terbaca.

Catatan teknis membaca file:
- `SRS.md` dan `WBS.md` berisi gambar base64 (baris `[image1]:`, `[image2]:`, dst. di akhir file). Lewati baris-baris itu.
- `Landing_Pagee.png` berukuran 1331 × 8000 px. Potong menjadi bagian setinggi ±1600 px sebelum dibaca, lalu hapus potongannya.
</context>

<design_policy>
Kebijakan tim ini mengikat seluruh isi PRD, karena tim ingin menghargai pembuat desain sekaligus tidak menunggu desain tambahan untuk mulai membangun:

1. **Gaya visual desain dilindungi.** Warna (UI dan data peta), tipografi (termasuk font serif di landing), ukuran, radius, bayangan, efek kaca/blur/opasitas, ikon dan warnanya, fotografi, basemap OpenStreetMap standar, bentuk komponen, tata letak yang sudah digambar, dan nada bahasa microcopy adalah kebutuhan yang harus diikuti persis. PRD tidak boleh meminta, menyarankan, atau mensyaratkan perubahan gaya, termasuk atas alasan kontras, konsistensi, atau selera. Kritik gaya di `analisis-uiux-nalarruang.md` bagian 7.3, 7.4, dan 7.5 hanyalah catatan observasi dan tidak dipakai sebagai kebutuhan.
2. **Yang belum didesain diimprovisasi.** Setiap kebutuhan yang belum punya layar ditulis lengkap di PRD dan diberi arahan UI yang meniru komponen serta alur yang sudah ada (sebut komponen desain mana yang ditiru). AI coding agent akan langsung membangunnya; tidak ada langkah "menunggu desain" atau "menunggu persetujuan desainer".
3. **Masalah fungsi diselesaikan tanpa mengubah tampilan.** Aturan bisnis SRS, konsistensi keadaan (state), elemen yang tertutup, dan teks yang diisi data diperbaiki lewat perilaku, bukan lewat gaya. Contoh: tombol yang tertutup panel tetap tampil sama, hanya perilakunya diatur agar selalu bisa dijangkau.
4. **Variasi dalam desain itu sendiri.** Jika satu komponen tampil dengan dua versi di layar berbeda untuk konteks yang sama, pakai versi yang muncul di lebih banyak layar (bila seimbang, versi yang sesuai SRS) dan catat pilihannya. Komponen berbeda yang kebetulan mirip (mis. bintang kuning di Top 3 dan bintang merah muda di Point Inspector) bukan variasi; keduanya dipertahankan apa adanya.
</design_policy>

<source_hierarchy>
**A. Cakupan, fungsi, aturan bisnis, data, dan batasan teknis**, dari yang paling dipercaya:
1. `SRS.md` (20 Sep 2026).
2. `WBS.md`: jadwal sprint, deliverable, acceptance criteria work package, PIC.
3. `CHARTER.md`: latar belakang dan konteks awal saja.
4. `DESKRIPSI.md`: konteks historis dan rincian sumber data saja.

**B. Tampilan, tata letak, alur layar, fitur yang tampil di layar, dan microcopy**: desain UI Sprint 0 (screenshot + `analisis-uiux-nalarruang.md`). Desain adalah artefak terbaru (27 Sep 2026) dan menjawab TBD-02 (wireframe).

Aturan resolusi:
- Konflik antar dokumen: ikuti posisi yang lebih tinggi di daftar A.
- Desain berbeda dari SRS soal tampilan, posisi, atau alur: **ikuti desain**, lalu catat bagian SRS yang perlu direvisi.
- Desain menampilkan fitur yang tidak ada di SRS (landing page, estimasi biaya): **masuk cakupan mengikuti desain**, catat revisi SRS-nya. Jika fitur itu butuh data yang sumbernya belum jelas, sumber datanya menjadi Open Question, bukan fiturnya.
- Kebutuhan SRS yang tidak ada di desain: **tetap wajib**, ditulis lengkap, dan diberi arahan improvisasi UI sesuai `<design_policy>`.
- Desain bertentangan dengan aturan bisnis SRS (bukan gaya): aturan SRS dipakai, diwujudkan dengan komponen desain yang sama (mis. badge yang sama dipakai untuk beberapa persona).
- Inkonsistensi di dalam SRS: pernyataan normatif (tabel FR, Business Rules) yang dipakai; catat di Open Questions.
- Semua keputusan rekonsiliasi dicatat di lampiran.
</source_hierarchy>

<known_conflicts>
Terapkan resolusi berikut dan masukkan ke lampiran rekonsiliasi. Konflik baru diselesaikan dengan aturan di atas.

**Konflik antar dokumen**

| # | Topik | Versi lama (Charter/Deskripsi) | Resolusi |
|---|---|---|---|
| 1 | Nilai utama produk | Mengatasi asimetri informasi properti | Personalisasi pencarian kawasan hunian ideal berdasarkan preferensi gaya hidup. Asimetri informasi boleh disebut sebagai latar belakang. |
| 2 | Jumlah layer | 3 layer | 6 layer: Historis & Risiko, Ekosistem Mikro & Gaya Hidup, Inklusivitas, Mobilitas & Transit, Mesin Waktu (= "Future Planning" di WBS), Legalitas Lahan |
| 3 | Layer Inklusivitas & Legalitas | Out of scope | In scope |
| 4 | Stack frontend | React + Mapbox/Leaflet | Tailwind CSS + Leaflet, backend Laravel. Jangan menyebut React atau Mapbox sebagai bagian dari stack. |
| 5 | Pipeline data | Python cron, NLP scraping, MongoDB | Pipeline offline QGIS + Overpass API + data sekunder publik → GeoJSON → PostGIS. Data kriminalitas tetap bagian Layer Historis & Risiko dari data publik sekunder. |
| 6 | Sponsor | Dedi Kusuma Wijaya sebagai Sponsor/PO | Tidak ada sponsor eksternal. Stakeholder: Dosen Pengampu dan calon pengguna. |
| 7 | Linimasa | 1 Sep – 5 Des 2026 | 7 Sep – 27 Nov 2026: Sprint 0 (7–25 Sep), Sprint 1 (28 Sep–16 Okt), Sprint 2 (19 Okt–6 Nov), Sprint 3 (9–20 Nov), Release Sprint (23–27 Nov) |
| 8 | Point Inspector | Skor kelayakan umum | Point Inspector + Persona Grading 0–3 bintang untuk 4 persona, dengan auto-summary |
| 9 | Pencarian | Search lokasi biasa | Requirement Search 3 mode input, Top 3, fly-to, toggle ke Commute Simulator |
| 10 | API berbayar | Anggaran Mapbox & Google Distance Matrix | Tile dan library gratis. Sumber data waktu tempuh dan biaya Commute Simulator belum ditetapkan → Open Question. |
| 11 | Internal SRS | — | FR-13/BR-7 wajib minimal satu persona vs UC-01 boleh menutup dialog tanpa memilih. Ikuti FR-13/BR-7; UC-01 jadi Open Question. |
| 12 | Internal SRS | — | "Empat fitur inti" vs 7 fungsi. Sajikan 4 fitur inti + fitur pendukung. |
| 13 | Nama anggota | "Muhammad Zaki" vs "Farrel Muhammad Zaki" | Orang yang sama; pakai "Farrel Muhammad Zaki". |

**Konflik desain vs SRS**

| # | Topik | SRS | Desain | Resolusi |
|---|---|---|---|---|
| D1 | Posisi search bar | Pojok kanan atas | Tengah atas | Ikuti desain; revisi UI01. |
| D2 | Posisi panel layer | Kanan bawah | Sisi kanan, memanjang saat layer aktif | Ikuti desain; revisi UI01. |
| D3 | Tombol tutup Point Inspector | Sisi kiri panel | Panel di kiri layar, tombol tutup kanan atas panel | Ikuti desain; revisi FR-08. |
| D4 | Menu utama | Menu dengan tiga sub-menu | Drawer kiri modal, tab Persona / Legenda / Tentang, peta di-blur | Ikuti desain. "Tentang" = Deskripsi Aplikasi (FR-21). |
| D5 | Ikon toggle Commute | Orang berjalan | Orang berjalan di mayoritas layar, ikon rute/slider di beberapa layar | Pakai ikon orang berjalan (versi mayoritas dan sesuai SRS). |
| D6 | Persona jamak | Multi-pilih; auto-summary per persona terpilih (FR-14, FR-17, BR-11) | Satu badge "PROFIL ANDA" dan satu kesimpulan | Aturan SRS dipakai: setiap persona sesi mendapat badge "PROFIL ANDA" dan kalimat kesimpulan sendiri, dengan tampilan badge dan kartu yang sama persis. |
| D7 | Estimasi biaya | FR-11: jarak dan waktu | Menambah biaya dalam Rupiah | Masuk cakupan mengikuti desain; revisi FR-11. Sumber data biaya = Open Question. |
| D8 | Landing page | Tidak ada | Halaman pemasaran lengkap | Masuk cakupan sebagai fitur pendukung mengikuti desain; SRS perlu revisi. |
| D9 | Tipografi | Hanya Plus Jakarta Sans (B03) | Aplikasi Plus Jakarta Sans; landing memakai font serif display dan sans body sesuai desainnya | Ikuti desain apa adanya; revisi B03. |
| D10 | Legalitas Lahan | Legalitas/batas persil ATR/BPN | Ditampilkan sebagai zona peruntukan ("Zona Perkantoran") | Tampilan ikut desain. Jenis data (persil atau zonasi RDTR) = Open Question. |
</known_conflicts>

<design_facts>
Ringkasan desain berikut sudah diverifikasi dari screenshot. Pakai untuk menulis alur, kebutuhan UI, dan acceptance criteria. Jika screenshot bisa dibaca, cocokkan dan laporkan bila ada perbedaan.

**Landing page** (`Landing_Pagee.png`): header (MENU, logo NalarRuang, tautan "Menuju Peta"); hero "Hunian yang cocok. Kota yang terbaca." dengan eyebrow "Data Spasial × Persona × Rekomendasi"; marquee nama fitur; bagian visi (Spasial, Persona, Rekomendasi); "The Vision"; "Empat Cara Memandang Suatu Kota" (kartu foto 4 persona, "Pilihanmu dapat beririsan"); "Tiga cara menjelajah" (Requirement Search, Smart Point Inspector, Commute Simulator); "Enam layer, satu kota"; "Sumber Data Terbuka" dengan tautan "Buka Peta Interaktif"; "Cara Kerja" 4 langkah (Kumpulkan, Olah, Hitung, Tampilkan); demo profil area (Blok M) dengan tab TITIK / WILAYAH dan skor 4 persona; FAQ (Datanya dari mana, Perlu login, Apakah preferensi persona disimpan, Seberapa akurat skornya, Apa cakupan wilayahnya); CTA "Siap membaca kotamu sendiri?" dengan tombol "Mulai Cari Hunian"; footer (kontak, media sosial, disclaimer "Skor dan rekomendasi merupakan estimasi dari data sekunder publik.").

**Visual Explorer (aplikasi)**:
- Peta Leaflet + tile OpenStreetMap standar layar penuh, atribusi Leaflet/OSM, kontrol zoom kiri bawah.
- Tombol hamburger bulat di kiri atas.
- Search bar melayang di tengah atas, placeholder "Ketik 'Daerah asri di Bogor'...", ikon kaca pembesar di kiri, tombol toggle Commute di kanan.
- Hasil pencarian berupa dropdown di bawah search bar berjudul "TOP 3 REKOMENDASI": tiga baris dengan ikon bintang kuning, nama kawasan + kota, dan satu kalimat alasan.
- Panel "Layer Peta" di kanan: enam kartu (ikon, nama, deskripsi, toggle). Kartu aktif menonjol dan menampilkan legenda inline: Historis & Risiko "Area Merah di Peta", Ekosistem Mikro "Titik Hijau di Peta", Inklusivitas "Titik Biru di Peta", Mobilitas & Transit "Garis Oranye di Peta", Mesin Waktu "Garis Putus-putus di Peta", Legalitas Lahan "Area Ungu di Peta".
- Saat Mesin Waktu aktif, slider tahun 2026–2030 muncul di bawah kartunya dengan chip "Tahun 20xx".
- Di peta: label pill bernama dan popup kartu (judul + deskripsi) saat fitur layer diklik.
- Panel "Detail Lokasi" (Point Inspector) di kiri: label "AREA TERPILIH", nama lokasi, alamat/kelurahan; "Kecocokan Gaya Hidup" berisi 4 baris persona (ikon, nama, 3 bintang); persona sesi disorot dengan badge "PROFIL ANDA", persona lain tampil redup; kartu "KESIMPULAN SINGKAT" berisi kalimat seperti "Buat gaya hidup Commuter: Sangat mendukung aktivitasmu!"; tombol tutup kanan atas.
- Commute Simulator: kartu di tengah atas menggantikan search bar, berjudul "Commute Simulator", baris "LOKASI RUMAH" dan "LOKASI TUJUAN", tombol "Reset & Pilih Ulang", tombol tutup. Peta menampilkan marker "Lokasi Rumah" dan "Lokasi Tujuan" dengan garis rute putus-putus. Kartu "Estimasi Perjalanan" di kiri bawah dengan chip jarak dan dua opsi: transportasi publik dan mobil pribadi, masing-masing waktu, biaya, dan keterangan sumber.
- Drawer menu (kiri, modal, peta di-blur): judul NalarRuang, tab Persona / Legenda / Tentang. Tab Persona: "Ubah Preferensi Persona", keterangan bahwa perubahan langsung memengaruhi rekomendasi, empat kartu checkbox persona dengan deskripsi.

**Belum didesain → diimprovisasi** (arahan komponen yang ditiru):

| Kebutuhan | Rujukan | Tiru dari desain |
|---|---|---|
| Dialog onboarding persona awal sesi, minimal satu wajib, peringatan bila kosong | UI00, FR-13, BR-7 | Kartu checkbox dan teks di tab Persona drawer menu; panel kaca aplikasi; peta di-blur seperti drawer |
| Mode checkbox kota + persona pada pencarian | FR-15 | Dropdown Top 3 di bawah search bar dan kartu checkbox persona |
| Keadaan mengisi Commute Simulator (dua input teks + pilih titik di peta) | FR-10 | Baris LOKASI RUMAH / LOKASI TUJUAN pada kartu Commute, marker Lokasi Rumah/Tujuan |
| Highlight/dim area sesuai filter aktif | FR-02 | Efek blur/redup yang dipakai desain (latar drawer, baris persona non-sesi) |
| Keadaan setelah memilih rekomendasi (fly-to) | FR-07 | Label pill peta dan Point Inspector |
| Isi tab Legenda dan Tentang | FR-20, FR-21 | Legenda inline kartu layer; teks landing page (FAQ, visi, sumber data, disclaimer) |
| Empty, loading, error state dari UC-01 s.d. UC-07 | UC | Kartu "KESIMPULAN SINGKAT", popup peta, panel kaca |
| Skor 0 bintang | BR-9 | Bintang kosong yang sudah ada di baris persona |
| Varian titik vs wilayah di Point Inspector | FR-09, BR-10 | Label "AREA TERPILIH" (varian titik memakai gaya label yang sama) dan konsep TITIK / WILAYAH di demo landing |
| Ringkasan data layer di lokasi terpilih | FR-08 | Legenda inline dan kartu di Point Inspector |
| Beberapa persona sesi sekaligus | FR-14, FR-17, BR-11 | Badge "PROFIL ANDA" dan kartu "KESIMPULAN SINGKAT" diulang per persona |

**Masalah fungsi yang diselesaikan lewat perilaku (tanpa mengubah tampilan)**:
- Hamburger dan kontrol zoom tertutup Point Inspector/kartu Estimasi → keduanya harus tetap bisa dijangkau saat panel terbuka.
- Popup menimpa search bar → popup tidak boleh menutupi kontrol aplikasi.
- Dua lokasi terpilih sekaligus (popup vs Inspector) → hanya satu lokasi terpilih pada satu waktu.
- Skor identik di semua lokasi → skor di desain adalah data contoh; aplikasi menampilkan skor hasil perhitungan.
- Legenda Mobilitas "Garis Oranye" sementara peta menggambar beberapa warna jalur → teks legenda harus menjelaskan semua warna/pola yang benar-benar digambar (warna jalur tetap sesuai desain).
- Keterangan sumber pada estimasi ("Berdasarkan tarif resmi KRL") dan teks popup risiko → diisi dari data sumber yang sebenarnya untuk rute/lokasi itu, dengan format teks sesuai desain.
</design_facts>

<task>
Buat file `prd.md` di root repository berisi PRD NalarRuang. Kerjakan dengan urutan berikut:

1. **Baca seluruh dokumen sumber** secara utuh (kecuali base64).
2. **Baca bahan desain**: `analisis-uiux-nalarruang.md` (mulai dari bagian 0) lalu setiap screenshot. Cocokkan dengan `<design_facts>`.
3. **Ekstrak inventaris kebutuhan** ke catatan kerja internal: FR-01 s.d. FR-21, UC-01 s.d. UC-07, Business Rules 1–12, B01–B07, A01–A04, D01–D03, TBD-01 s.d. TBD-11, UI00–UI05, work package WBS beserta sprint-nya, serta setiap layar, komponen, dan microcopy desain. Tandai setiap FR dengan sumber UI: **Desain** (sudah digambar), **Desain + Improvisasi** (sebagian digambar), atau **Improvisasi** (belum digambar).
4. **Terapkan rekonsiliasi** sesuai `<design_policy>`, `<source_hierarchy>`, dan `<known_conflicts>`.
5. **Tulis PRD** mengikuti `<prd_structure>` dan `<writing_rules>`, bertahap per bagian ke file.
6. **Review diri** dengan `<quality_checklist>` dan perbaiki yang belum terpenuhi.
7. **Laporkan** secara singkat: lokasi file, jumlah FR/US, jumlah FR per sumber UI, daftar improvisasi, konflik baru beserta resolusinya, dan Open Questions paling mendesak.
</task>

<prd_structure>
Gunakan struktur berikut. Judul bagian boleh disesuaikan sedikit, tetapi jangan menghilangkan bagian. Jika bahan tidak cukup, tulis satu kalimat penjelasan dan rujuk ke Open Questions.

0. **Metadata Dokumen**: judul, versi (1.0-draft), tanggal, penyusun (Tim Kelompok 4), status, daftar sumber (dokumen + desain) beserta kewenangannya, ringkasan `<design_policy>`, dan riwayat revisi.
1. **Ringkasan Eksekutif**: apa NalarRuang, untuk siapa, masalah yang diselesaikan, dan apa yang dikirim di akhir semester.
2. **Latar Belakang & Problem Statement**: masalah pencarian hunian di Jabodetabek dan pergeseran nilai utama ke personalisasi gaya hidup. Boleh memakai pesan produk dari landing page ("Eksplorasi data, bukan cuma iklan").
3. **Tujuan, Non-Goals & Metrik Keberhasilan**: hanya kriteria yang ada di dokumen; angka yang belum ada ditulis `[TBD]`.
4. **Pengguna & Persona**: U01 (anonim, tanpa login) dan empat persona: apa yang diutamakan, fasilitas/layer yang memengaruhi skor (WBS 1.4.5, SRS), deskripsi yang dipakai desain (dikutip apa adanya), dan contoh skenario SRS.
5. **Ruang Lingkup**: tabel In Scope vs Out of Scope, termasuk landing page dan estimasi biaya sebagai fitur yang masuk cakupan mengikuti desain, serta subbagian "Kandidat Pengembangan Lanjutan (di luar MVP)".
6. **Konsep Produk & Alur Pengguna**: dua permukaan (landing page → Visual Explorer sebagai hub), navigasi bebas antar fitur, alur end-to-end satu sesi mulai dari landing (termasuk dialog onboarding improvisasi saat pertama masuk peta), dan diagram Mermaid `flowchart`.
7. **Kebutuhan Fungsional per Fitur**: satu subbagian per fitur. Fitur inti: Visual Explorer, Requirement Search, Smart Point Inspector + Persona Grading, Commute Simulator. Fitur pendukung: Onboarding Persona, Menu Utama (drawer), Landing Page, Backend & Spatial API. Setiap subbagian berisi:
   - Deskripsi, prioritas (ikuti SRS; landing page dan estimasi biaya beri prioritas yang disarankan), dan **sumber UI** (Desain / Desain + Improvisasi / Improvisasi) dengan rujukan nama file screenshot.
   - Deskripsi UI: untuk bagian yang sudah didesain, jelaskan persis seperti desain (posisi, komponen, microcopy); untuk bagian improvisasi, jelaskan komponen desain mana yang ditiru dan bagaimana ia dipakai, tanpa memperkenalkan gaya baru.
   - User stories `US-xx`: "Sebagai [persona/pengguna], saya ingin [aksi], sehingga [manfaat]".
   - FR terkait (ID asli SRS), UC terkait, dan UI0x terkait.
   - Acceptance criteria per user story dalam format **Diberikan / Ketika / Maka**, cukup spesifik untuk dicocokkan dengan tampilan (teks badge, posisi panel, isi legenda). Untuk bagian yang sudah didesain, sertakan kriteria "tampilan sesuai `<nama file>.png`".
   - Edge case & error state dari Alternative Flow/Failed End Condition UC, ditambah masalah fungsi di `<design_facts>` yang relevan.
   - Dependensi dan TBD/OQ yang memengaruhi.
   Untuk Persona Grading, jelaskan aturan 0–3 bintang, metode titik (radius) vs poligon (kuantitas fasilitas), acuan 5-minute city (±500–600 m jalan kaki, 1–2 km berkendara untuk bintang tertinggi), aturan auto-summary per persona sesi, dan cara UI membedakan titik dan wilayah.
8. **Business Rules**: BR-01 s.d. BR-12 dari SRS 5.6 dengan rujukan FR, ditambah aturan interaksi dari analisis desain (`BR-13` dst., tandai asalnya): hanya satu lokasi terpilih pada satu waktu; setiap persona sesi mendapat badge dan kesimpulan sendiri; kontrol aplikasi selalu bisa dijangkau; teks legenda dan keterangan sumber mengikuti data yang ditampilkan.
9. **Data & Layer Spasial**: tabel enam layer berisi isi data, sumber sekunder (WBS 1.1.3/1.3.1), tipe geometri, representasi visual di desain (dikutip apa adanya), fitur yang memakainya, dan keterbatasan data. Jelaskan pipeline QGIS/Overpass → cleaning → GeoJSON → PostGIS. Jangan merancang skema tabel (TBD-04). Catat bahwa skor di desain adalah data contoh, serta kebutuhan data tambahan dari desain (biaya perjalanan, tahun proyek Mesin Waktu 2026–2030).
10. **Kebutuhan Non-Fungsional** (`NFR-xx`): kinerja, keamanan & privasi (tanpa data pribadi, preferensi hanya di sisi klien per sesi, HTTPS), keandalan, kemudahan penggunaan, aksesibilitas perilaku (navigasi keyboard untuk panel, drawer, dialog, dropdown, toggle, slider; fokus yang terlihat; label untuk pembaca layar) tanpa mengubah gaya visual, kejujuran data (disclaimer estimasi dari landing juga tersedia di aplikasi, keterangan sumber sesuai data), fidelitas desain (UI yang sudah didesain diimplementasikan sesuai screenshot), pemeliharaan, lingkungan operasional (browser desktop Chrome/Firefox/Edge), bahasa (Bahasa Indonesia sesuai microcopy desain). Angka yang belum disepakati ditulis `[TBD-06]`.
11. **Arsitektur & Batasan Teknis**: Laravel REST API JSON, Tailwind CSS + Leaflet, PostgreSQL + PostGIS, pipeline QGIS offline, staging hosting gratis, tile OpenStreetMap standar sesuai desain (catat bahwa penggunaan tile harus mematuhi kebijakan penyedia tile); diagram Mermaid; kebutuhan endpoint secara fungsional (data layer per bounding box, Requirement Search, skor persona, commute termasuk biaya); batasan B01–B07 dengan catatan revisi B03. Jangan menetapkan URL endpoint, nama tabel, atau library yang tidak disebut dokumen.
12. **Pedoman UX & Desain**: ringkasan `<design_policy>`, daftar layar desain beserta isinya, prinsip improvisasi, dan rujukan ke `design-system.md` (dibuat terpisah) sebagai sumber nilai visual. Jangan menetapkan nilai warna atau spasi di PRD.
13. **Daftar Improvisasi UI**: tabel semua kebutuhan bersumber "Improvisasi" atau "Desain + Improvisasi": kebutuhan, rujukan FR/UC, komponen desain yang ditiru, dan sprint pembangunannya. Tabel ini adalah daftar kerja langsung untuk developer/AI agent, bukan daftar tunggu desain. Tambahkan tabel kedua untuk masalah fungsi yang diselesaikan lewat perilaku.
14. **Rencana Rilis & Milestone**: tabel sprint berdasarkan kalender WBS (periode, fokus increment, fitur/FR, event penutup), deliverable D1–D5, dan penempatan landing page serta estimasi biaya di sprint yang paling masuk akal (sebut alasannya).
15. **Asumsi, Dependensi & Risiko**: A01–A04, D01–D03, dan risiko produk (cakupan data OSM terbatas, ketersediaan Overpass API, bobot persona belum final, parsing teks bebas belum ditentukan, sumber data waktu tempuh dan biaya belum jelas, tambahan fitur dari desain menambah beban sprint, improvisasi UI bisa berbeda dari selera desainer). Sertakan dampak dan mitigasi.
16. **Open Questions & TBD**: TBD-01 s.d. TBD-11 dengan status terbaru (TBD-02 "terjawab oleh desain; sisa layar diimprovisasi"), ditambah OQ baru yang menyangkut data, aturan, atau teknis (sumber data biaya dan waktu tempuh, jenis data Legalitas Lahan, UC-01, dll.). Tidak ada OQ yang menanyakan perubahan gaya visual. Tiap baris: pertanyaan, dampak, pemilik keputusan (PIC WBS), tenggat.
17. **Lampiran**:
    - A. Matriks Traceability: FR ↔ US ↔ UC ↔ UI0x ↔ Layar desain / Improvisasi ↔ Work Package WBS ↔ Sprint.
    - B. Daftar Revisi SRS yang Diusulkan (D1–D10 dan temuan baru): bagian SRS, bunyi sekarang, usulan bunyi baru yang mengikuti desain.
    - C. Glosarium.
    - D. Catatan Rekonsiliasi.
    - E. Tim & Peran (nama, NIM, peran).
</prd_structure>

<writing_rules>
- Tulis dalam **Bahasa Indonesia** formal dan lugas; istilah teknis umum tetap dalam bahasa aslinya. Microcopy desain dikutip persis di dalam tanda kutip, termasuk nadanya.
- **Grounding**: setiap klaim bisa ditelusuri, dengan rujukan singkat seperti `(SRS FR-09; WBS 1.4.5)` atau `(Desain: simulator.png)`. Improvisasi diberi label `[Improvisasi]` beserta komponen desain yang ditiru.
- **Jangan mengarang angka**: ambang skor, target performa, dan batas waktu respons tanpa sumber ditandai `[TBD]`. Angka di screenshot (19 menit, Rp 3.000, 2.1 km, skor contoh) adalah contoh tampilan, bukan target atau data.
- **Pertahankan ID asli** (FR-xx, UC-xx, TBD-xx, B0x, A0x, D0x, UI0x, nomor WBS, D1–D10, K1–K6). ID baru hanya untuk US-xx, NFR-xx, BR-13 dst., dan OQ-xx.
- Acceptance criteria harus bisa diverifikasi tanpa bertanya balik: kondisi awal, aksi, hasil yang teramati.
- Tabel untuk daftar/perbandingan; prosa untuk konsep dan alasan.
- Diagram hanya Mermaid di blok ```mermaid.
- Fokus pada **apa dan mengapa**, bukan implementasi. Jangan menulis kode aplikasi, migrasi, atau DDL.
</writing_rules>

<constraints>
- Jangan mengubah, memindahkan, atau menghapus dokumen sumber maupun file desain. Satu-satunya file yang kamu buat adalah `prd.md` (potongan gambar sementara boleh dibuat lalu dihapus).
- Jangan menuliskan kebutuhan, saran, risiko, atau OQ yang meminta perubahan gaya visual desain.
- Jangan menambahkan fitur, layer, persona, atau integrasi di luar SRS/WBS/desain. Ide tambahan hanya di "Kandidat Pengembangan Lanjutan".
- Jangan menghidupkan kembali hal yang dikeluarkan lewat rekonsiliasi (React, Mapbox, NLP, MongoDB, sponsor eksternal, linimasa Charter).
</constraints>

<quality_checklist>
Sebelum selesai, pastikan semua poin ini terpenuhi dan perbaiki jika belum:
- [ ] FR-01 s.d. FR-21 muncul di bagian 7 dan di matriks traceability, masing-masing dengan sumber UI (Desain / Desain + Improvisasi / Improvisasi).
- [ ] UC-01 s.d. UC-07 dan BR 1–12 semuanya terpetakan.
- [ ] Setiap user story punya minimal satu acceptance criteria Diberikan/Ketika/Maka dan minimal satu edge case atau error state bila relevan.
- [ ] Setiap kebutuhan tanpa desain punya arahan improvisasi yang menyebut komponen desain yang ditiru, dan muncul di bagian 13.
- [ ] Tidak ada kalimat di PRD yang meminta atau menyarankan perubahan warna, font, ukuran, efek, ikon, basemap, tata letak yang sudah digambar, atau nada microcopy.
- [ ] Konflik D1–D10 diterapkan sesuai resolusi dan muncul di Lampiran B.
- [ ] Aturan multi-persona (FR-14, FR-17, BR-11) terwujud dengan komponen desain yang sama.
- [ ] Landing page dan estimasi biaya masuk cakupan; hanya sumber datanya yang menjadi OQ.
- [ ] Tidak ada penyebutan React, Mapbox, MongoDB, NLP/scraping, cron Python, atau sponsor eksternal sebagai bagian sistem (kecuali di latar belakang dan lampiran rekonsiliasi).
- [ ] Enam layer disebut dengan nama yang konsisten; linimasa hanya linimasa WBS.
- [ ] Semua angka tanpa sumber ditandai `[TBD]`; angka dari screenshot tidak dijadikan target.
- [ ] Diagram Mermaid valid secara sintaks.
- [ ] Developer baru bisa memahami apa yang harus dibangun, seperti apa tampilannya, dan bagaimana mengimprovisasi layar yang belum didesain tanpa membuka SRS.
</quality_checklist>
