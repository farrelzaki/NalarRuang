**PRAKTIKUM P3 \- PROJECT SCOPE, WBS & WBS DICTIONARY**

**Manajemen Proyek Teknologi Informasi (MPTI)**

**Tujuan praktikum:** mendefinisikan batas proyek, mengidentifikasi deliverables, mendekomposisi total scope menjadi WBS yang detail, dan menyusun WBS Dictionary untuk setiap work package.

Gunakan proyek TI kelompok yang sama dengan Project Charter. WBS harus cukup detail untuk menjadi dasar resource assignment dan schedule pada pertemuan berikutnya.

**A. Identitas Kelompok dan Proyek**

| Field | Isian |
| :---- | :---- |
| Nama Proyek | NalarRuang: Platform Sistem Informasi Geografis (SIG) untuk analitik tata ruang independen yang memberikan data objektif berbasis pemetaan multi-layer |
| Kelas / Kelompok | Kelompok 4 \- Developer Rumah |
| Project Manager | Izdihar Izzan Wibowo (J0403241016) |
| Anggota Tim | 1\. Nur'Afia Avanza (J0403241008) 2\. Izdihar Izzan Wibowo (J0403241016) 3\. Adzkia Nifa Adha (J0403241103) 4\. Raden Mas Galih Pradityo (J0403241030) 5\. Farrel Muhammad Zaki (J0403241085) |
| Sumber Proyek / Mata Kuliah Asal | Sistem Informasi Geografis dan Manajemen Proyek Teknologi Informasi |

**B. Review Scope dari Project Charter**

| Aspek | Isian |
| :---- | :---- |
| Project Objective | Membangun platform GIS analitik tata ruang untuk membantu pengguna menemukan lokasi hunian ideal (*liveable space*) di Jabodetabek, yang dikurasi secara spesifik berdasarkan preferensi gaya hidup personal (seperti mobilitas transit, akses berkendara, atau kebutuhan sosial/hiburan).  |
| High-Level Scope | Ekstraksi dan pemrosesan data spasial menggunakan QGIS dan Overpass API, pengembangan aplikasi web peta interaktif, integrasi pemetaan *multi-layer* (Lingkungan, Kualitas Hidup, Inklusivitas, Mobilitas), serta pengembangan fitur penilaian kawasan (*Smart Point Inspector*) berbasis persona gaya hidup.  |
| Key Deliverables pada Charter | Dokumen spesifikasi produk (PRD/WBS), purwarupa UI/UX dengan *single typeface design*, arsitektur basis data, *dataset* spasial (GeoJSON), aplikasi web fungsional (MVP), dan dokumentasi pengujian.  |
| Catatan perubahan/penajaman sejak P1 | Pergeseran nilai utama (*core value*) dari "mengatasi asimetri informasi properti" menjadi "personalisasi pencarian kawasan hunian ideal berdasarkan metrik preferensi gaya hidup pengguna".  |

**C. Scope Boundary**

| IN SCOPE | OUT OF SCOPE |
| :---- | :---- |
| Pengembangan antarmuka peta interaktif web (Visual Explorer) dengan navigasi pan/zoom dan filter dinamis | Aplikasi mobile native (Android/iOS) |
| Pemetaan 6 Layer Data Spasial: Historis & Risiko, Ekosistem Mikro & Gaya Hidup, Inklusivitas, Mobilitas & Transit, Mesin Waktu, Legalitas Lahan | Listing iklan/transaksi properti |
| Algoritma Requirement Search (pencarian bottom-up berbasis spatial intersection & Top 3 rekomendasi) | Pembuatan data primer tata ruang (survei lapangan) |
| Smart Point Inspector dengan metrik persona (Commuter, Driver, Social & Vibe, Zen Score) | Analisis spasial di luar area Jabodetabek |
| Commute Simulator (estimasi jarak & waktu tempuh Pin A \- Pin B) |  |
| Pengolahan data spasial sekunder menggunakan QGIS & Overpass API |  |

Tuliskan batas secara eksplisit. Item out-of-scope membantu mencegah scope creep dan salah persepsi.

**D. Deliverables dan Acceptance Criteria  (Per Tahapan di Metodologi yang dipilih)**

| ID | Deliverable (Tahapan Scrum) | Deskripsi | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| D1 | Requirements Specification (Sprint 0 \- Discovery & Product Backlog) | Hasil Sprint Planning awal: empat persona gaya hidup (Commuter, Driver, Social & Vibe, Zen) terdefinisi, kebutuhan dipecah menjadi Product Backlog berisi user story yang sudah diprioritaskan, dan SRS/PRD disepakati bersama Product Owner. | Definition of Done: Product Backlog tersusun dan diprioritaskan, seluruh user story memiliki acceptance criteria, dan SRS ditinjau serta di-sign-off oleh PM / Internal Tim maupun Dosen Pengampu. |
| D2 | System Design (Sprint 0 \- Design & Architecture Baseline) | Design baseline yang dihasilkan pada akhir Sprint 0: prototipe UI Figma dengan tipografi tunggal (Plus Jakarta Sans), ERD dan skema basis data spasial PostGIS, rancangan arsitektur Laravel-Tailwind-PostGIS, rancangan algoritma, serta environment pengembangan (repo, scaffolding, staging). | Definition of Done: seluruh artefak desain direview tim, konsisten dengan Product Backlog, dan environment pengembangan siap dipakai Sprint 1\. |
| D3 | Spatial Data Pipeline (Sprint 1 \- Increment 1\) | Increment pertama pada sisi data: keenam layer data spasial diolah di QGIS (bersumber dari Overpass API dan sumber sekunder lain), dibersihkan, distandardisasi atributnya, lalu diekspor menjadi GeoJSON siap impor ke PostGIS. | Definition of Done: seluruh berkas GeoJSON lolos validasi skema dan geometri, berhasil diimpor ke PostGIS tanpa error, serta diterima pada Sprint Review 1\. |
| D4 | Web Application (Product Increment) (Sprint 1-3 \- Increment 1, 2 & 3\) | Potentially shippable increment yang bertambah tiap sprint: Sprint 1 (Core Web Map/Visual Explorer \+ 2 layer), Sprint 2 (Requirement Search \+ API \+ 2 layer), Sprint 3 (Smart Point Inspector & Persona Grading, Commute Simulator \+ 2 layer sisa). Setiap sprint ditutup Sprint Review dan Sprint Retrospective. | Definition of Done: setiap increment berjalan stabil di environment staging, memenuhi acceptance criteria user story terkait, dan diterima Product Owner pada Sprint Review 1, 2, dan 3\. |
| D5 | Tested Application & Release (Release Sprint \- Hardening & Release) | Sprint terakhir untuk hardening produk: unit testing, integration testing, usability testing, perbaikan defect, User Acceptance Testing (UAT), deployment ke environment produksi, dokumentasi pengguna dan teknis, serta serah terima final. | Definition of Done: fungsi utama lulus seluruh test case, defect kritis nihil, UAT diterima Sponsor dan Dosen Pengampu, aplikasi ter-deploy, dan berita acara serah terima ditandatangani. |

**Kalender Sprint (Baseline Penjadwalan)**

*Project Charter telah disetujui dan WBS disusun pada awal September 2026\. Eksekusi sprint dimulai 7 September 2026 dan produk final diserahterimakan pada 27 November 2026 (total 12 minggu / 60 hari kerja).*

| Sprint | Periode | Durasi | Fokus Increment | Deliverable | Sprint Event Penutup |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Sprint 0** | 7 \- 25 Sep 2026 | 3 minggu | Discovery, Product Backlog, Design & Architecture Baseline | D1, D2 | Sprint Planning & Backlog Refinement |
| **Sprint 1** | 28 Sep \- 16 Okt 2026 | 3 minggu | Spatial Data Pipeline (6 layer), Core Web Map, 2 layer pertama | D3, D4 | Sprint Review 1 \- 16 Okt 2026 |
| **Sprint 2** | 19 Okt \- 6 Nov 2026 | 3 minggu | Requirement Search, RESTful API, Layer Inklusivitas & Mobilitas | D4 | Sprint Review 2 \- 6 Nov 2026 |
| **Sprint 3** | 9 \- 20 Nov 2026 | 2 minggu | Point Inspector & Persona Grading, Commute Simulator, 2 layer sisa | D4 | Sprint Review 3 \- 20 Nov 2026 |
| **Release Sprint** | 23 \- 27 Nov 2026 | 1 minggu | Testing menyeluruh, UAT, deployment, dokumentasi, serah terima | D5 | Final Demonstration & Handover \- 27 Nov 2026 |

**E. WBS Decomposition Worksheet**

Mulai dari 1.0 \= nama proyek. Pecah menjadi major deliverables/work areas, lalu dekomposisi sampai work package. Tambahkan baris sesuai kebutuhan. Tandai Yes hanya untuk level terendah yang akan dibuatkan WBS Dictionary.

| No. | WBS ID | Parent WBS | WBS Element / Work Package | Level | Related Deliverable |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | **1.0** | \- | **Platform NalarRuang: Personalisasi Pencarian Hunian Ideal (MVP)** | 1 | D1-D5 |
| 2 | **1.1** | 1.0 | **Requirements & Analysis** | 2 | D1 |
| 3 | 1.1.1 | 1.1 | Requirements Elicitation — Identifikasi Stakeholder | 3 | D1 |
| 4 | 1.1.2 | 1.1 | Requirements Analysis — Analisis Kebutuhan Fungsional & Nonfungsional | 3 | D1 |
| 5 | 1.1.3 | 1.1 | Data Source Requirements — Evaluasi Sumber Data Spasial Multilayer (6 Layer) | 3 | D1 |
| 6 | 1.1.4 | 1.1 | Requirements Specification | 3 | D1 |
| 7 | 1.1.4.1 | 1.1.4 | Penyusunan Dokumen SRS | 4 | D1 |
| 8 | 1.1.4.2 | 1.1.4 | Finalisasi & Sign-off Spesifikasi (PM / Internal Tim) | 4 | D1 |
| 10 | **1.2** | 1.0 | **System & UI/UX Design** | 2 | D2 |
| 11 | 1.2.1 | 1.2 | UI/UX Design | 3 | D2 |
| 12 | 1.2.1.1 | 1.2.1 | User Flow Dual-Mode Spatial Search | 4 | D2 |
| 13 | 1.2.1.2 | 1.2.1 | Wireframe Peta, Panel Layer & Point Inspector | 4 | D2 |
| 14 | 1.2.1.3 | 1.2.1 | Interactive Prototype Figma (Tipografi Plus Jakarta Sans) | 4 | D2 |
| 15 | 1.2.1.4 | 1.2.1 | Design Review Internal dengan Tim | 4 | D2 |
| 16 | 1.2.2 | 1.2 | Spatial Database Design — Perancangan Basis Data Spasial | 3 | D2 |
| 17 | 1.2.3 | 1.2 | Application Architecture Design | 3 | D2 |
| 18 | 1.2.4 | 1.2 | Development Environment & Infrastructure Setup | 3 | D2 |
| 19 | 1.2.5 | 1.2 | Konfigurasi Domain & Hosting Awal (Staging, Gratis) | 3 | D2 |
| 20 | **1.3** | 1.0 | **Spatial Data Pipeline (QGIS Data Sourcing & Cleaning)** | 2 | D3 |
| 21 | 1.3.1 | 1.3 | Akuisisi Data 6 Layer (Historis, Ekosistem, Inklusivitas, Mobilitas, Future Planning, Legalitas) | 3 | D3 |
| 22 | 1.3.2 | 1.3 | Data Cleaning, Standardisasi Atribut, & Export GeoJSON | 3 | D3 |
| 23 | **1.4** | 1.0 | **Web Application Development (Laravel API & Tailwind UI)** | 2 | D4 |
| 24 | 1.4.1 | 1.4 | Core Map Module | 3 | D4 |
| 25 | 1.4.2 | 1.4 | Pengembangan Modul Requirement Search | 3 | D4 |
| 26 | 1.4.3 | 1.4 | Implementasi Multi-Layer Mapping pada Peta Interaktif | 3 | D4 |
| 27 | 1.4.4 | 1.4 | Smart Point Inspector | 3 | D4 |
| 28 | 1.4.5 | 1.4 | Persona Grading Module | 3 | D4 |
| 29 | 1.4.6 | 1.4 | Backend & Spatial API Module | 3 | D4 |
| 30 | 1.4.6.1 | 1.4.6 | Implementasi Skema PostGIS | 4 | D4 |
| 31 | 1.4.6.2 | 1.4.6 | RESTful API Endpoint (Layer, Search, Persona) | 4 | D4 |
| 32 | 1.4.6.3 | 1.4.6 | Optimasi Query Spasial | 4 | D4 |
| 33 | 1.4.7 | 1.4 | Sprint Review, Demonstrasi Prototipe & Staging | 3 | D4 |
| 34 | **1.5** | 1.0 | **Testing & Deployment** | 2 | D5 |
| 35 | 1.5.1 | 1.5 | Test Planning | 3 | D5 |
| 36 | 1.5.2 | 1.5 | Testing (Unit, Integration, Usability, UAT) | 3 | D5 |
| 37 | 1.5.3 | 1.5 | Debugging | 3 | D5 |
| 38 | 1.5.4 | 1.5 | Deployment WebGIS App | 3 | D5 |
| 39 | 1.5.5 | 1.5 | User & Technical Documentation | 3 | D5 |
| 40 | 1.5.6 | 1.5 | Final Handover | 3 | D5 |

**F. WBS Tree / Hierarchy**

Tempel/gambar struktur WBS hierarkis kelompok pada area berikut. Struktur harus konsisten dengan WBS Decomposition Worksheet.

| ![][image1] [WBS TREE](https://drive.google.com/drive/folders/1zjmc6yo5lEhbPi9DCg57WLLEcrBZUAen?usp=sharing) |
| :---: |

**G. WBS Dictionary \- Isi dan dibuat untuk SETIAP Work Package**

Duplikasi tabel berikut untuk seluruh baris yang ditandai Work Package \= Yes. Estimated Duration dan Dependencies masih boleh berupa estimasi awal dan akan divalidasi pada perencanaan resource/schedule.

**1.1.1 Requirements Elicitation — Identifikasi Stakeholder**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.1.1 |
| **Work Package Name** | Requirements Elicitation — Identifikasi Stakeholder |
| **Parent WBS** | 1.1 |
| **Related Deliverable** | D1 |
| **Description** | Mengidentifikasi stakeholder proyek (Dosen Pengampu dan calon pengguna) sebagai dasar penggalian kebutuhan awal. Pengumpulan kebutuhan dilakukan langsung berdasarkan observasi kebutuhan pengguna riil, tanpa instrumen elisitasi formal maupun sesi khusus dengan sponsor (proyek belum memiliki sponsor). |
| **Output** | Daftar stakeholder proyek (Dosen Pengampu, calon pengguna) dan rekap kebutuhan awal hasil observasi. |
| **Acceptance Criteria** | Daftar stakeholder lengkap dan kebutuhan awal terdokumentasi, dikonfirmasi PM. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM), Seluruh Tim |
| **Dependencies** | \- |
| **Estimated Duration** | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Referensi riset gaya hidup & properti, observasi langsung tim |
| **Assumptions / Constraints** | Dosen Pengampu tersedia untuk konsultasi awal; belum ada sponsor proyek. |
| **Completion Evidence** | Dokumen daftar stakeholder & rekap kebutuhan awal. |

 

**1.1.2 Requirements Analysis — Analisis Kebutuhan Fungsional & Nonfungsional**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.1.2 |
| **Work Package Name** | Requirements Analysis — Analisis Kebutuhan Fungsional & Nonfungsional |
| **Parent WBS** | 1.1 |
| **Related Deliverable** | D1 |
| **Description** | Menganalisis dan merumuskan kebutuhan fungsional utama (Dual-Mode Spatial Search Engine, Multi-Layer Intelligent Mapping 6 layer, Smart Point Inspector & Persona Grading, Commute Simulator) sekaligus kebutuhan nonfungsional (performa rendering peta multi-layer, responsivitas UX, akurasi kalkulasi spasial). Untuk metrik persona grading tidak disusun pengukuran sendiri — mengacu pada standar walkability/livability internasional yang sudah ada (5-minute city, 10-minute city, walkable city, ketersediaan transportasi publik, dll). |
| **Output** | Daftar kebutuhan fungsional & nonfungsional terstruktur (user story/use case) beserta referensi standar walkability/livability internasional yang dipakai untuk persona grading. |
| **Acceptance Criteria** | Setiap kebutuhan fungsional dan nonfungsional dapat ditelusuri ke fitur inti PRD dan memiliki metrik/target yang dapat diuji pada tahap Testing. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.1.1 |
| **Estimated Duration** | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Hasil identifikasi kebutuhan awal, dokumen PRD, referensi standar livability/walkability internasional |
| **Assumptions / Constraints** | Tidak ada penambahan fitur di luar empat fitur inti PRD; bobot skor persona dapat disesuaikan setelah uji coba data nyata. |
| **Completion Evidence** | Dokumen daftar kebutuhan fungsional & nonfungsional. |

 

**1.1.3 Data Source Requirements — Evaluasi Sumber Data Spasial Multilayer (6 Layer)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.1.3 |
| **Work Package Name** | Data Source Requirements — Evaluasi Sumber Data Spasial Multilayer (6 Layer) |
| **Parent WBS** | 1.1 |
| **Related Deliverable** | D1 |
| **Description** | Mengevaluasi ketersediaan dan format sumber data untuk keenam layer spasial: Historis & Risiko (banjir, elevasi, riwayat lahan, kriminalitas, AQI, noise), Ekosistem Mikro & Gaya Hidup (POI via Overpass API), Inklusivitas (fasilitas ramah disabilitas), Mobilitas & Transit (halte/stasiun, isochrone), Mesin Waktu/Future Planning (proyek infrastruktur), dan Legalitas Lahan (ATR/BPN). |
| **Output** | Matriks evaluasi sumber data untuk keenam layer spasial. |
| **Acceptance Criteria** | Sumber data untuk seluruh 6 layer terkonfirmasi dapat diakses dan kompatibel diolah di QGIS. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst) |
| **Dependencies** | 1.1.1 |
| **Estimated Duration** | 4 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Akses data InaRISK/DEMNAS, Overpass API, data pemerintah terbuka (ATR/BPN), referensi AQI & data kriminalitas publik |
| **Assumptions / Constraints** | Data yang dipakai merupakan data sekunder yang dapat diakses publik; cakupan data OSM & data terbuka pemerintah masih terbatas di sejumlah area dan perlu verifikasi manual. |
| **Completion Evidence** | Dokumen matriks evaluasi sumber data 6 layer spasial. |

 

**1.1.4.1 Penyusunan Dokumen SRS**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.1.4.1 |
| **Work Package Name** | Penyusunan Dokumen SRS |
| **Parent WBS** | 1.1.4 |
| **Related Deliverable** | D1 |
| **Description** | Menyusun Software Requirements Specification (SRS) yang merangkum kebutuhan fungsional, nonfungsional, dan sumber data enam layer terpilih. |
| **Output** | Dokumen SRS lengkap. |
| **Acceptance Criteria** | SRS memuat seluruh kebutuhan fungsional/nonfungsional dan sumber data yang telah dievaluasi. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM), Raden Mas Galih Pradityo (System Analyst) |
| **Dependencies** | 1.1.2, 1.1.3 |
| **Estimated Duration** | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Seluruh hasil analisis kebutuhan & evaluasi data |
| **Assumptions / Constraints** | Tidak ada perubahan kebutuhan besar sebelum SRS difinalisasi. |
| **Completion Evidence** | Draf dokumen SRS. |

 

**1.1.4.2 Finalisasi & Sign-off Spesifikasi**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.1.4.2 |
| **Work Package Name** | Finalisasi & Sign-off Spesifikasi |
| **Parent WBS** | 1.1.4 |
| **Related Deliverable** | D1 |
| **Description** | Merevisi SRS berdasarkan umpan balik dan memperoleh persetujuan (sign-off) akhir dari PM / Internal Tim atau Dosen Pengampu. |
| **Output** | Dokumen SRS final tersign-off, disepakati bersama PRD. |
| **Acceptance Criteria** | SRS final disetujui dan dikonfirmasi oleh PM / Internal Tim atau Dosen Pengampu. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.1.4.1 |
| **Estimated Duration** | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Draf SRS revisi |
| **Assumptions / Constraints** | Tidak ada perubahan kebutuhan mayor setelah sign-off. |
| **Completion Evidence** | SRS final bertanda tangan/konfirmasi tertulis PM / Internal Tim atau Dosen Pengampu. |

 

**1.2.1.1 User Flow Dual-Mode Spatial Search**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.1.1 |
| **Work Package Name** | User Flow Dual-Mode Spatial Search |
| **Parent WBS** | 1.2.1 |
| **Related Deliverable** | D2 |
| **Description** | Merancang alur pengguna untuk Visual Explorer (pan/zoom/filter) dan Requirement Search (input kebutuhan hingga fly-to rekomendasi). |
| **Output** | Diagram user flow Dual-Mode Spatial Search. |
| **Acceptance Criteria** | User flow mencakup seluruh skenario penggunaan kedua mode pencarian. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.1.4.2 |
| **Estimated Duration** | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | SRS final, tools diagram (Figma/FigJam) |
| **Assumptions / Constraints** | Fitur inti tidak berubah selama perancangan alur. |
| **Completion Evidence** | File diagram user flow. |

 

**1.2.1.2 Wireframe Peta, Panel Layer & Point Inspector**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.1.2 |
| **Work Package Name** | Wireframe Peta, Panel Layer & Point Inspector |
| **Parent WBS** | 1.2.1 |
| **Related Deliverable** | D2 |
| **Description** | Membuat wireframe low-fidelity untuk tampilan peta utama, panel toggle 6 layer, form Requirement Search, dan panel Smart Point Inspector. |
| **Output** | Wireframe seluruh halaman/komponen utama aplikasi. |
| **Acceptance Criteria** | Wireframe mencakup basemap, panel layer, form pencarian, dan point inspector sesuai user flow. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.2.1.1 |
| **Estimated Duration** | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Figma, hasil user flow |
| **Assumptions / Constraints** | Referensi tipografi mengikuti font tunggal Plus Jakarta Sans sesuai PRD. |
| **Completion Evidence** | File wireframe Figma. |

 

**1.2.1.3 Interactive Prototype Figma (Tipografi Plus Jakarta Sans)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.1.3 |
| **Work Package Name** | Interactive Prototype Figma (Tipografi Plus Jakarta Sans) |
| **Parent WBS** | 1.2.1 |
| **Related Deliverable** | D2 |
| **Description** | Mengembangkan interactive prototype antarmuka alur utama (basemap, panel layer, form search, point inspector) dengan tipografi tunggal Plus Jakarta Sans. |
| **Output** | Prototype antarmuka alur utama aplikasi. |
| **Acceptance Criteria** | Pengguna dapat menavigasi alur Visual Explorer dan Requirement Search pada prototype Figma. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.2.1.2 |
| **Estimated Duration** | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Figma, wireframe |
| **Assumptions / Constraints** | Komponen desain mengikuti design system tunggal (Plus Jakarta Sans) yang disepakati. |
| **Completion Evidence** | Link/file prototype Figma yang dapat diuji coba. |

 

**1.2.1.4 Design Review Internal dengan Tim**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.1.4 |
| **Work Package Name** | Design Review Internal dengan Tim |
| **Parent WBS** | 1.2.1 |
| **Related Deliverable** | D2 |
| **Description** | Mempresentasikan prototype kepada tim (dan Dosen Pengampu bila diperlukan) untuk validasi internal sebelum masuk tahap development. |
| **Output** | Catatan umpan balik desain. |
| **Acceptance Criteria** | Prototype disetujui internal tim atau revisi terdokumentasi dan ditindaklanjuti sebelum Sprint 1\. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer), Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.2.1.3 |
| **Estimated Duration** | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Prototype Figma, jadwal review |
| **Assumptions / Constraints** | Dosen memberi umpan balik tepat waktu bila dilibatkan. |
| **Completion Evidence** | Notulen review desain. |

 

**1.2.2 Spatial Database Design — Perancangan Basis Data Spasial**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.2 |
| **Work Package Name** | Spatial Database Design — Perancangan Basis Data Spasial |
| **Parent WBS** | 1.2 |
| **Related Deliverable** | D2 |
| **Description** | Mengidentifikasi entitas & atribut spasial untuk 6 layer, menyusun ERD basis data spasial (relasi antar layer dan skor persona), dan merancang skema tabel PostGIS (tipe geometri, indeks spasial) untuk mendukung query yang efisien. |
| **Output** | Dokumen entitas & atribut, diagram ERD, dan DDL skema PostGIS basis data spasial NalarRuang. |
| **Acceptance Criteria** | Entitas mencakup 6 layer prioritas, ERD tervalidasi System Analyst & Backend, dan skema PostGIS mencakup tipe geometri & indeks spasial sesuai kebutuhan performa. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer) |
| **Dependencies** | 1.1.3 |
| **Estimated Duration** | 5 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Hasil evaluasi sumber data, QGIS, tools ERD (dbdiagram), environment PostgreSQL+PostGIS |
| **Assumptions / Constraints** | Struktur data sumber tidak berubah signifikan; relasi antar tabel mengikuti kebutuhan query Requirement Search & Point Inspector; versi PostGIS mendukung fungsi spasial yang dibutuhkan. |
| **Completion Evidence** | Dokumen entitas & atribut, file ERD, dan script DDL skema PostGIS. |

 

**1.2.3 Application Architecture Design**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.3 |
| **Work Package Name** | Application Architecture Design |
| **Parent WBS** | 1.2 |
| **Related Deliverable** | D2 |
| **Description** | Merancang arsitektur sistem end-to-end (Laravel-Tailwind-PostGIS-QGIS), kontrak endpoint RESTful API untuk data 6 layer/Requirement Search/Point Inspector/Commute Simulator, serta logika algoritma Requirement Search (spatial intersection, Top 3 rekomendasi) dan formula skor Persona Grading (Commuter/Driver/Social & Vibe/Zen). |
| **Output** | Diagram arsitektur sistem, dokumen spesifikasi API, dan dokumen rancangan algoritma Requirement Search & Persona Grading. |
| **Acceptance Criteria** | Diagram arsitektur mencakup seluruh komponen PRD, spesifikasi API mencakup seluruh kebutuhan data frontend fitur inti, dan rancangan algoritma mencakup parameter input, formula skor, dan output terukur. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.2.2 |
| **Estimated Duration** | 6 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Tools diagram arsitektur, tools dokumentasi API (Postman/OpenAPI), hasil skema PostGIS & definisi kebutuhan |
| **Assumptions / Constraints** | Tidak ada penambahan komponen arsitektur di luar cakupan PRD; kontrak API disepakati sebelum development dimulai; bobot skor persona dapat disesuaikan pada tahap pengujian. |
| **Completion Evidence** | Diagram arsitektur final, dokumen spesifikasi API, dan dokumen rancangan algoritma disetujui System Analyst. |

 

**1.2.4 Development Environment & Infrastructure Setup**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.4 |
| **Work Package Name** | Development Environment & Infrastructure Setup |
| **Parent WBS** | 1.2 |
| **Related Deliverable** | D2 |
| **Description** | Membuat repository GitHub dengan branching strategy dan akses tim, serta menyiapkan boilerplate proyek Laravel \+ Tailwind CSS termasuk koneksi awal ke PostgreSQL+PostGIS. |
| **Output** | Repository GitHub aktif dengan branching strategy terdokumentasi, dan struktur proyek awal yang dapat dijalankan lokal. |
| **Acceptance Criteria** | Seluruh anggota tim memiliki akses repo sesuai strategi branch, dan boilerplate aplikasi berjalan tanpa error serta terhubung ke database lokal/staging. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.2.3 |
| **Estimated Duration** | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Akun GitHub tim (5 akun), PHP/Laravel, Node.js (Tailwind build), PostgreSQL+PostGIS lokal |
| **Assumptions / Constraints** | Seluruh anggota tim memiliki akun GitHub aktif; versi framework mengikuti rancangan arsitektur pada 1.2.3. |
| **Completion Evidence** | Link repository, dokumen branching strategy, dan commit inisialisasi proyek. |

 

**1.2.5 Konfigurasi Domain & Hosting Awal (Staging, Gratis)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.2.5 |
| **Work Package Name** | Konfigurasi Domain & Hosting Awal (Staging, Gratis) |
| **Parent WBS** | 1.2 |
| **Related Deliverable** | D2 |
| **Description** | Melakukan setup domain dan hosting awal (Cloud VPS/layanan tier gratis) untuk kebutuhan staging environment. |
| **Output** | Environment staging dapat diakses melalui domain/subdomain proyek. |
| **Acceptance Criteria** | Staging environment dapat diakses tim dan siap menerima deployment build Sprint 1\. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer) |
| **Dependencies** | 1.2.4 |
| **Estimated Duration** | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) |
| **Resources Needed** | Paket domain & hosting awal (tier gratis), Cloud VPS |
| **Assumptions / Constraints** | Menggunakan layanan staging gratis; anggaran domain berbayar dapat disiapkan kemudian bila diperlukan upgrade. |
| **Completion Evidence** | URL staging environment aktif. |

 

**1.3.1 Akuisisi Data 6 Layer (Historis, Ekosistem, Inklusivitas, Mobilitas, Future Planning, Legalitas)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.3.1 |
| **Work Package Name** | Akuisisi Data 6 Layer (Historis, Ekosistem, Inklusivitas, Mobilitas, Future Planning, Legalitas) |
| **Parent WBS** | 1.3 |
| **Related Deliverable** | D3 |
| **Description** | Mengumpulkan dan mendigitasi data untuk keenam layer spasial ke dalam proyek QGIS: Historis & Risiko (banjir, elevasi, riwayat lahan, kriminalitas, AQI, noise), Ekosistem Mikro & Gaya Hidup (POI via Overpass API), Inklusivitas (fasilitas ramah disabilitas), Mobilitas & Transit (halte/stasiun, isochrone map), Mesin Waktu/Future Planning (proyek infrastruktur), dan Legalitas Lahan (batas persil ATR/BPN). |
| **Output** | Enam layer data spasial mentah dalam format proyek QGIS. |
| **Acceptance Criteria** | Seluruh 6 layer tersedia dan tervisualisasi dengan benar di QGIS. |
| **Responsible / PIC** | Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst) |
| **Dependencies** | 1.1.3, 1.2.2 |
| **Estimated Duration** | 10 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) |
| **Resources Needed** | QGIS, Overpass API, akses data InaRISK/DEMNAS/AQI/kriminalitas publik, data GTFS/OSM, portal data pertanahan publik |
| **Assumptions / Constraints** | Sumber data sekunder tetap dapat diakses selama periode akuisisi; data jaringan jalan OSM cukup lengkap untuk kalkulasi isochrone; cakupan data terbuka ATR/BPN & data inklusivitas terbatas pada area yang tersedia publik. |
| **Completion Evidence** | File proyek QGIS untuk keenam layer data spasial. |

 

**1.3.2 Data Cleaning, Standardisasi Atribut, & Export GeoJSON**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.3.2 |
| **Work Package Name** | Data Cleaning, Standardisasi Atribut, & Export GeoJSON |
| **Parent WBS** | 1.3 |
| **Related Deliverable** | D3 |
| **Description** | Membersihkan geometri invalid, menstandardisasi skema atribut, menyelaraskan sistem koordinat keenam layer di QGIS, lalu mengekspornya menjadi berkas GeoJSON valid siap diimpor ke PostGIS. |
| **Output** | Enam layer data spasial yang bersih & konsisten, serta berkas GeoJSON valid untuk keenam layer. |
| **Acceptance Criteria** | Seluruh layer lolos pemeriksaan validitas geometri & konsistensi atribut, dan seluruh berkas GeoJSON lolos validasi skema serta dapat diimpor tanpa error ke PostGIS. |
| **Responsible / PIC** | Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst) |
| **Dependencies** | 1.3.1 |
| **Estimated Duration** | 4 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) |
| **Resources Needed** | QGIS, aturan validasi data yang disepakati, tools validasi GeoJSON |
| **Assumptions / Constraints** | Aturan standardisasi atribut disepakati bersama System Analyst sebelum cleaning; struktur atribut hasil cleaning tidak berubah signifikan pada tahap ekspor. |
| **Completion Evidence** | Laporan hasil cleaning & standardisasi atribut, berkas GeoJSON final, dan log hasil validasi. |

 

**1.4.1 Core Map Module**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.1 |
| **Work Package Name** | Core Map Module |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Mengintegrasikan library peta interaktif sebagai basemap dengan navigasi pan/zoom, mengimplementasikan highlight/dim dinamis area sesuai filter aktif (mode top-down Visual Explorer), dan melakukan optimasi rendering (lazy load layer, clustering titik) agar memenuhi target performa nonfungsional. |
| **Output** | Komponen basemap dengan navigasi pan/zoom, fitur highlight/dim dinamis berdasarkan filter, dan peningkatan performa rendering terukur. |
| **Acceptance Criteria** | Basemap tampil benar dan navigasi mulus tanpa lag; perubahan highlight terjadi real-time saat filter aktif; waktu render memenuhi target performa nonfungsional (1.1.2). |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer), Farrel Muhammad Zaki (Backend Developer) |
| **Dependencies** | 1.2.4, 1.2.1 |
| **Estimated Duration** | 8 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) |
| **Resources Needed** | Library pemetaan interaktif (Leaflet), Tailwind CSS, endpoint data layer, tools profiling frontend |
| **Assumptions / Constraints** | Library peta open-source mencukupi kebutuhan MVP tanpa biaya lisensi tambahan; struktur data layer dari backend sudah tersedia (endpoint stub jika perlu); optimasi dilakukan bertahap seiring penambahan layer. |
| **Completion Evidence** | Commit fitur basemap, highlight dinamis, dan laporan hasil profiling performa. |

 

**1.4.2 Pengembangan Modul Requirement Search**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.2 |
| **Work Package Name** | Pengembangan Modul Requirement Search |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Mengimplementasikan form input lokasi target & parameter kebutuhan pengguna, mengembangkan fungsi kalkulasi spatial intersection pada PostGIS untuk Top 3 rekomendasi, dan mengimplementasikan animasi kamera peta (fly-to) menuju titik rekomendasi hasil pencarian. |
| **Output** | Komponen form Requirement Search, endpoint/fungsi backend Top 3 rekomendasi, dan fitur fly-to animation terintegrasi. |
| **Acceptance Criteria** | Pengguna dapat memasukkan lokasi & parameter kebutuhan tanpa error; hasil rekomendasi konsisten & relevan; kamera peta berpindah mulus ke titik rekomendasi. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer), Raden Mas Galih Pradityo (System Analyst), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.2.1, 1.3.2, 1.2.3 |
| **Estimated Duration** | 8 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) |
| **Resources Needed** | Wireframe, komponen UI form (Tailwind), environment PostGIS, library pemetaan interaktif |
| **Assumptions / Constraints** | Daftar parameter kebutuhan mengikuti hasil rancangan algoritma (1.2.3); data 6 layer telah tersedia di PostGIS sebelum implementasi algoritma; library peta mendukung animasi kamera bawaan. |
| **Completion Evidence** | Commit fitur form, fungsi spatial intersection, dan fitur fly-to beserta hasil uji fungsional. |

 

**1.4.3 Implementasi Multi-Layer Mapping pada Peta Interaktif**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.3 |
| **Work Package Name** | Implementasi Multi-Layer Mapping pada Peta Interaktif |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Mengembangkan overlay keenam layer spasial pada peta interaktif: Historis & Risiko (safety), Ekosistem Mikro & Gaya Hidup (livability), Inklusivitas (accessibility), Mobilitas & Transit (beserta isochrone), Mesin Waktu (dengan timeline slider), dan Legalitas Lahan — seluruhnya dapat diaktifkan/dinonaktifkan pengguna. |
| **Output** | Enam layer overlay interaktif pada peta (toggle on/off) beserta kontrol timeline slider untuk Layer Mesin Waktu. |
| **Acceptance Criteria** | Seluruh layer tampil akurat sesuai data GeoJSON dan dapat di-toggle tanpa jeda rendering; timeline slider menampilkan/menyembunyikan trase proyek sesuai tahun yang dipilih. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.4.1, 1.4.6, 1.3.2 |
| **Estimated Duration** | 18 hari kerja \- tersebar Sprint 1 s.d. Sprint 3 |
| **Resources Needed** | GeoJSON keenam layer, environment PostGIS, skema warna indeks risiko yang disepakati tim |
| **Assumptions / Constraints** | Skema warna indeks risiko telah disepakati tim; cakupan data POI/fasilitas inklusif/legalitas lahan memadai di area target; data linimasa proyek infrastruktur bersifat estimasi. |
| **Completion Evidence** | Commit keenam layer & demonstrasi bertahap pada Sprint Review (1.4.7). |

 

**1.4.4 Smart Point Inspector**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.4 |
| **Work Package Name** | Smart Point Inspector |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Mengimplementasikan panel pintar (tooltip/side-panel) yang muncul saat pengguna mengeklik titik/poligon pada peta, menampilkan detail informasi lokasi. |
| **Output** | Komponen UI Panel Point Inspector yang berfungsi. |
| **Acceptance Criteria** | Panel muncul saat titik/poligon diklik dan dapat ditutup kembali tanpa error UI. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.4.1 |
| **Estimated Duration** | 3 hari kerja \- Sprint 3 (9-20 Nov 2026\) |
| **Resources Needed** | Wireframe/prototype Figma, komponen UI (Tailwind) |
| **Assumptions / Constraints** | Struktur data respons API Point Inspector telah disepakati pada 1.2.3. |
| **Completion Evidence** | Commit komponen UI & screenshot. |

 

**1.4.5 Persona Grading Module**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.5 |
| **Work Package Name** | Persona Grading Module |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Mengembangkan fungsi kalkulasi keempat skor persona — Commuter Score (akses transit & trotoar), Driver Score (lebar jalan, jarak tol, SPBU), Social & Vibe Score (rasio kafe/restoran/hiburan), dan Zen Score (polusi suara, keamanan, banjir, RTH) — serta fitur Commute Simulator: penempatan Pin A (hunian) & Pin B (kantor/kampus) dengan kalkulasi jarak dan estimasi waktu tempuh (kendaraan pribadi & transit). |
| **Output** | Fungsi backend keempat skor persona (tampil di panel Point Inspector), dan fitur Commute Simulator dengan estimasi waktu tempuh dua moda. |
| **Acceptance Criteria** | Keempat skor tampil konsisten di panel Point Inspector sesuai bobot layer yang ditentukan; estimasi jarak & waktu tempuh tampil untuk kedua moda berdasarkan data lalu lintas historis. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer), Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.4.3, 1.1.2, 1.2.3 |
| **Estimated Duration** | 9 hari kerja \- Sprint 3 (9-20 Nov 2026\) |
| **Resources Needed** | Definisi bobot skor, environment backend, layer Mobilitas & Transit |
| **Assumptions / Constraints** | Bobot penilaian tiap komponen skor disepakati tim sebelum implementasi; data lalu lintas historis yang tersedia cukup untuk estimasi wajar. |
| **Completion Evidence** | Commit fungsi skor persona & fitur Commute Simulator beserta hasil uji perhitungan/fungsional. |

 

**1.4.6.1 Implementasi Skema PostGIS**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.6.1 |
| **Work Package Name** | Implementasi Skema PostGIS |
| **Parent WBS** | 1.4.6 |
| **Related Deliverable** | D4 |
| **Description** | Menerapkan skema PostGIS hasil rancangan (1.2.2) ke environment development/staging. |
| **Output** | Basis data PostGIS aktif sesuai skema rancangan. |
| **Acceptance Criteria** | Seluruh tabel dan indeks spasial berhasil dibuat tanpa error migrasi. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer) |
| **Dependencies** | 1.2.2, 1.2.4 |
| **Estimated Duration** | 2 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) |
| **Resources Needed** | Environment PostgreSQL+PostGIS, script DDL |
| **Assumptions / Constraints** | Tidak ada perubahan skema besar setelah implementasi awal. |
| **Completion Evidence** | Migration script & hasil verifikasi tabel. |

 

**1.4.6.2 RESTful API Endpoint (Layer, Search, Persona)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.6.2 |
| **Work Package Name** | RESTful API Endpoint (Layer, Search, Persona) |
| **Parent WBS** | 1.4.6 |
| **Related Deliverable** | D4 |
| **Description** | Mengembangkan endpoint RESTful API Laravel untuk data enam layer, Requirement Search, dan skor persona sesuai spesifikasi API (1.2.3). |
| **Output** | Endpoint API layer data, search, dan persona yang dapat dikonsumsi frontend. |
| **Acceptance Criteria** | Seluruh endpoint mengembalikan data sesuai kontrak API dan lulus uji fungsional dasar. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.4.6.1, 1.2.3, 1.3.2 |
| **Estimated Duration** | 4 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) |
| **Resources Needed** | Environment Laravel, dokumentasi API |
| **Assumptions / Constraints** | Kontrak API pada 1.2.3 tidak berubah signifikan selama development. |
| **Completion Evidence** | Commit endpoint & hasil uji Postman/OpenAPI. |

 

**1.4.6.3 Optimasi Query Spasial**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.6.3 |
| **Work Package Name** | Optimasi Query Spasial |
| **Parent WBS** | 1.4.6 |
| **Related Deliverable** | D4 |
| **Description** | Mengoptimasi query spasial PostGIS (indexing, bounding box filter) agar respons API layer data memenuhi target performa. |
| **Output** | Query API layer data dengan waktu respons yang lebih optimal. |
| **Acceptance Criteria** | Waktu respons endpoint memenuhi target performa nonfungsional (1.1.2). |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer) |
| **Dependencies** | 1.4.6.2 |
| **Estimated Duration** | 2 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) |
| **Resources Needed** | Tools profiling query PostGIS |
| **Assumptions / Constraints** | Volume data uji merepresentasikan kondisi produksi secara wajar. |
| **Completion Evidence** | Laporan hasil optimasi query (before/after). |

 

**1.4.7 Sprint Review, Demonstrasi Prototipe & Staging**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.4.7 |
| **Work Package Name** | Sprint Review, Demonstrasi Prototipe & Staging |
| **Parent WBS** | 1.4 |
| **Related Deliverable** | D4 |
| **Description** | Menyelenggarakan Sprint Review, Demonstrasi Prototipe, dan validasi staging environment secara berkala per modul/fitur (bukan dipecah per sprint), mencakup Core Map Module, Requirement Search, Multi-Layer Mapping, Smart Point Inspector, Persona Grading, dan Commute Simulator — kepada Dosen Pengampu. |
| **Output** | Demonstrasi increment per modul fitur beserta catatan umpan balik dan action item Retrospective. |
| **Acceptance Criteria** | Setiap modul fitur didemokan di staging environment dan diterima Dosen Pengampu sebelum lanjut ke modul berikutnya. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM), Seluruh Tim |
| **Dependencies** | 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6 |
| **Estimated Duration** | 3 hari kerja \- tersebar Sprint 1 s.d. Sprint 3 |
| **Resources Needed** | Environment staging, materi presentasi |
| **Assumptions / Constraints** | Setiap modul fitur stabil di staging sebelum direview; review per modul dinilai lebih terorganisir dan jelas dibanding review per sprint. |
| **Completion Evidence** | Notulen Sprint Review & Retrospective per modul beserta dokumentasi umpan balik. |

 

**1.5.1 Test Planning**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.1 |
| **Work Package Name** | Test Planning |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Menyusun rencana pengujian (test plan) mencakup unit, integration, usability, dan UAT beserta skenario dan kriteria lulus uji. |
| **Output** | Dokumen test plan. |
| **Acceptance Criteria** | Test plan mencakup seluruh jenis pengujian dan disetujui PM. |
| **Responsible / PIC** | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.4.7 |
| **Estimated Duration** | 2 hari kerja \- Sprint 3 (9-20 Nov 2026\) |
| **Resources Needed** | SRS, hasil development seluruh modul |
| **Assumptions / Constraints** | Seluruh fitur MVP telah selesai dikembangkan sebelum pengujian dimulai. |
| **Completion Evidence** | Dokumen test plan final. |

 

**1.5.2 Testing (Unit, Integration, Usability, UAT)**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.2 |
| **Work Package Name** | Testing (Unit, Integration, Usability, UAT) |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Menguji logika bisnis backend Laravel (unit testing), sinkronisasi PostGIS & pipeline data spasial dengan frontend (integration testing), kemudahan navigasi & kejelasan fitur bersama pengguna uji (usability testing), serta pelaksanaan User Acceptance Testing (UAT) bersama Dosen Pengampu pada sesi demonstrasi produk akhir. |
| **Output** | Laporan hasil unit test, integration test, usability test, dan berita acara/hasil UAT. |
| **Acceptance Criteria** | Seluruh unit test kritis lulus sesuai target coverage; data 6 layer tampil akurat tanpa error integrasi; UX Dual-Mode Search & Point Inspector berfungsi baik menurut peserta uji; Dosen Pengampu menyatakan aplikasi memenuhi kebutuhan yang disepakati pada SRS. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst), Nur'Afia Avanza (UI/UX Designer), Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.5.1 |
| **Estimated Duration** | 6 hari kerja \- Release Sprint (23-27 Nov 2026\) |
| **Resources Needed** | Framework testing PHP (PHPUnit), environment staging terintegrasi penuh, perangkat & peserta uji, SRS |
| **Assumptions / Constraints** | Kode backend telah melalui code review internal; data GeoJSON hasil pipeline QGIS tidak berubah selama pengujian; tersedia peserta uji perwakilan target pengguna; seluruh defect kritis diperbaiki sebelum sesi UAT. |
| **Completion Evidence** | Laporan hasil unit/integration/usability test dan berita acara UAT. |

 

**1.5.3 Debugging**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.3 |
| **Work Package Name** | Debugging |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Memperbaiki defect kritis yang ditemukan pada tahap Testing (unit, integration, usability, UAT). |
| **Output** | Daftar defect yang telah diperbaiki dan diverifikasi ulang. |
| **Acceptance Criteria** | Seluruh defect berprioritas kritis/tinggi telah diperbaiki dan lulus retest. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Nur'Afia Avanza (UI/UX Designer) |
| **Dependencies** | 1.5.2 |
| **Estimated Duration** | 2 hari kerja \- Release Sprint (23-27 Nov 2026\) |
| **Resources Needed** | Backlog defect, environment staging |
| **Assumptions / Constraints** | Defect non-kritis dapat dijadwalkan setelah demo akhir jika waktu terbatas. |
| **Completion Evidence** | Log perbaikan defect & hasil retest. |

 

**1.5.4 Deployment WebGIS App**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.4 |
| **Work Package Name** | Deployment WebGIS App |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Menyiapkan environment produksi (Cloud VPS, domain, hosting) dan melakukan deployment build final aplikasi WebGIS NalarRuang ke environment produksi beserta setup demo akhir. |
| **Output** | Environment produksi terkonfigurasi dan aplikasi NalarRuang versi final ter-deploy serta dapat diakses. |
| **Acceptance Criteria** | Environment produksi terkonfigurasi (SSL, domain aktif) dan lulus smoke test dasar; aplikasi dapat diakses melalui domain produksi tanpa error kritis. |
| **Responsible / PIC** | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.5.3 |
| **Estimated Duration** | 2 hari kerja \- Release Sprint (23-27 Nov 2026\) |
| **Resources Needed** | Cloud VPS, domain, build final aplikasi |
| **Assumptions / Constraints** | Kapasitas VPS produksi mencukupi kebutuhan demo akhir; tidak ada perubahan kode besar setelah Testing selesai. |
| **Completion Evidence** | URL aplikasi produksi aktif & log deployment. |

 

**1.5.5 User & Technical Documentation**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.5 |
| **Work Package Name** | User & Technical Documentation |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Menyusun panduan penggunaan aplikasi Web GIS NalarRuang (Visual Explorer, Requirement Search, Point Inspector) sekaligus dokumentasi teknis (arsitektur, skema database, API, pipeline QGIS) untuk keperluan maintenance ke depan. |
| **Output** | Panduan pengguna dan dokumen teknis sistem NalarRuang. |
| **Acceptance Criteria** | Panduan pengguna menjelaskan navigasi & fitur inti dengan langkah yang dapat diikuti; dokumentasi teknis mencakup arsitektur, skema PostGIS, spesifikasi API, dan alur pipeline data. |
| **Responsible / PIC** | Nur'Afia Avanza (UI/UX Designer), Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) |
| **Dependencies** | 1.5.4 |
| **Estimated Duration** | 4 hari kerja \- Release Sprint (23-27 Nov 2026\) |
| **Resources Needed** | Aplikasi final, seluruh dokumen desain & source code, template dokumentasi |
| **Assumptions / Constraints** | Fitur & versi aplikasi tidak berubah setelah dokumentasi disusun. |
| **Completion Evidence** | Dokumen panduan pengguna dan dokumen teknis final. |

 

**1.5.6 Final Handover**

| Field | Isian |
| :---- | :---- |
| **WBS ID** | 1.5.6 |
| **Work Package Name** | Final Handover |
| **Parent WBS** | 1.5 |
| **Related Deliverable** | D5 |
| **Description** | Menyerahterimakan aplikasi, source code, dan seluruh dokumentasi kepada Dosen Pengampu. |
| **Output** | Berita acara serah terima proyek. |
| **Acceptance Criteria** | Dosen Pengampu menerima aplikasi, source code, dan dokumentasi lengkap pada Final Demonstration 27 November 2026\. |
| **Responsible / PIC** | Izdihar Izzan Wibowo (PM) |
| **Dependencies** | 1.5.5, 1.5.2 |
| **Estimated Duration** | 1 hari kerja \- Release Sprint (23-27 Nov 2026\) |
| **Resources Needed** | Seluruh deliverable proyek |
| **Assumptions / Constraints** | Final Demonstration & Handover terlaksana sesuai jadwal 27 November 2026\. |
| **Completion Evidence** | Berita acara serah terima bertanda tangan/konfirmasi Dosen Pengampu. |

 

**H. Rekap Work Package**

| WBS ID | Work Package | PIC | Estimated Duration | Dependency Utama | Acceptance Criteria Ringkas |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **1.1.1** | Requirements Elicitation — Identifikasi Stakeholder | Izdihar Izzan Wibowo (PM), Seluruh Tim | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) | \- | Daftar stakeholder lengkap dan kebutuhan awal terdokumentasi, dikonfirmasi PM. |
| **1.1.2** | Requirements Analysis — Analisis Kebutuhan Fungsional & Nonfungsional | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM) | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.1 | Setiap kebutuhan fungsional dan nonfungsional dapat ditelusuri ke fitur inti PRD dan memiliki metrik/target yang dapat diuji pada tahap Testing. |
| **1.1.3** | Data Source Requirements — Evaluasi Sumber Data Spasial Multilayer (6 Layer) | Raden Mas Galih Pradityo (System Analyst) | 4 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.1 | Sumber data untuk seluruh 6 layer terkonfirmasi dapat diakses dan kompatibel diolah di QGIS. |
| **1.1.4.1** | Penyusunan Dokumen SRS | Izdihar Izzan Wibowo (PM), Raden Mas Galih Pradityo (System Analyst) | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.2, 1.1.3 | SRS memuat seluruh kebutuhan fungsional/nonfungsional dan sumber data yang telah dievaluasi. |
| **1.1.4.2** | Finalisasi & Sign-off Spesifikasi (PM / Internal Tim) | Izdihar Izzan Wibowo (PM) | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.4.1 | SRS final disetujui dan dikonfirmasi oleh PM / Internal Tim atau Dosen Pengampu. |
| **1.2.1.1** | User Flow Dual-Mode Spatial Search | Nur'Afia Avanza (UI/UX Designer) | 2 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.4.2 | User flow mencakup seluruh skenario penggunaan kedua mode pencarian. |
| **1.2.1.2** | Wireframe Peta, Panel Layer & Point Inspector | Nur'Afia Avanza (UI/UX Designer) | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.1.1 | Wireframe mencakup basemap, panel layer, form pencarian, dan point inspector sesuai user flow. |
| **1.2.1.3** | Interactive Prototype Figma (Tipografi Plus Jakarta Sans) | Nur'Afia Avanza (UI/UX Designer) | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.1.2 | Pengguna dapat menavigasi alur Visual Explorer dan Requirement Search pada prototype Figma. |
| **1.2.1.4** | Design Review Internal dengan Tim | Nur'Afia Avanza (UI/UX Designer), Izdihar Izzan Wibowo (PM) | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.1.3 | Prototype disetujui internal tim atau revisi terdokumentasi dan ditindaklanjuti sebelum Sprint 1\. |
| **1.2.2** | Spatial Database Design — Perancangan Basis Data Spasial | Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer) | 5 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.1.3 | Entitas mencakup 6 layer prioritas, ERD tervalidasi System Analyst & Backend, dan skema PostGIS mencakup tipe geometri & indeks spasial sesuai kebutuhan performa. |
| **1.2.3** | Application Architecture Design | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) | 6 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.2 | Diagram arsitektur mencakup seluruh komponen PRD, spesifikasi API mencakup seluruh kebutuhan data frontend fitur inti, dan rancangan algoritma mencakup parameter input, formula skor, dan output terukur. |
| **1.2.4** | Development Environment & Infrastructure Setup | Izdihar Izzan Wibowo (PM), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) | 3 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.3 | Seluruh anggota tim memiliki akses repo sesuai strategi branch, dan boilerplate aplikasi berjalan tanpa error serta terhubung ke database lokal/staging. |
| **1.2.5** | Konfigurasi Domain & Hosting Awal (Staging, Gratis) | Farrel Muhammad Zaki (Backend Developer) | 1 hari kerja \- Sprint 0 (7-25 Sep 2026\) | 1.2.4 | Staging environment dapat diakses tim dan siap menerima deployment build Sprint 1\. |
| **1.3.1** | Akuisisi Data 6 Layer (Historis, Ekosistem, Inklusivitas, Mobilitas, Future Planning, Legalitas) | Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst) | 10 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) | 1.1.3, 1.2.2 | Seluruh 6 layer tersedia dan tervisualisasi dengan benar di QGIS. |
| **1.3.2** | Data Cleaning, Standardisasi Atribut, & Export GeoJSON | Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst) | 4 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) | 1.3.1 | Seluruh layer lolos pemeriksaan validitas geometri & konsistensi atribut, dan seluruh berkas GeoJSON lolos validasi skema serta dapat diimpor tanpa error ke PostGIS. |
| **1.4.1** | Core Map Module | Nur'Afia Avanza (UI/UX Designer), Farrel Muhammad Zaki (Backend Developer) | 8 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) | 1.2.4, 1.2.1 | Basemap tampil benar dan navigasi mulus tanpa lag; perubahan highlight terjadi real-time saat filter aktif; waktu render memenuhi target performa nonfungsional (1.1.2). |
| **1.4.2** | Pengembangan Modul Requirement Search | Nur'Afia Avanza (UI/UX Designer), Raden Mas Galih Pradityo (System Analyst), Adzkia Nifa Adha (Backend/GIS Developer) | 8 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) | 1.2.1, 1.3.2, 1.2.3 | Pengguna dapat memasukkan lokasi & parameter kebutuhan tanpa error; hasil rekomendasi konsisten & relevan; kamera peta berpindah mulus ke titik rekomendasi. |
| **1.4.3** | Implementasi Multi-Layer Mapping pada Peta Interaktif | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Nur'Afia Avanza (UI/UX Designer) | 18 hari kerja \- tersebar Sprint 1 s.d. Sprint 3 | 1.4.1, 1.4.6, 1.3.2 | Seluruh layer tampil akurat sesuai data GeoJSON dan dapat di-toggle tanpa jeda rendering; timeline slider menampilkan/menyembunyikan trase proyek sesuai tahun yang dipilih. |
| **1.4.4** | Smart Point Inspector | Nur'Afia Avanza (UI/UX Designer) | 3 hari kerja \- Sprint 3 (9-20 Nov 2026\) | 1.4.1 | Panel muncul saat titik/poligon diklik dan dapat ditutup kembali tanpa error UI. |
| **1.4.5** | Persona Grading Module | Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer), Nur'Afia Avanza (UI/UX Designer) | 9 hari kerja \- Sprint 3 (9-20 Nov 2026\) | 1.4.3, 1.1.2, 1.2.3 | Keempat skor tampil konsisten di panel Point Inspector sesuai bobot layer yang ditentukan; estimasi jarak & waktu tempuh tampil untuk kedua moda berdasarkan data lalu lintas historis. |
| **1.4.6.1** | Implementasi Skema PostGIS | Farrel Muhammad Zaki (Backend Developer) | 2 hari kerja \- Sprint 1 (28 Sep-16 Okt 2026\) | 1.2.2, 1.2.4 | Seluruh tabel dan indeks spasial berhasil dibuat tanpa error migrasi. |
| **1.4.6.2** | RESTful API Endpoint (Layer, Search, Persona) | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) | 4 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) | 1.4.6.1, 1.2.3, 1.3.2 | Seluruh endpoint mengembalikan data sesuai kontrak API dan lulus uji fungsional dasar. |
| **1.4.6.3** | Optimasi Query Spasial | Farrel Muhammad Zaki (Backend Developer) | 2 hari kerja \- Sprint 2 (19 Okt-6 Nov 2026\) | 1.4.6.2 | Waktu respons endpoint memenuhi target performa nonfungsional (1.1.2). |
| **1.4.7** | Sprint Review, Demonstrasi Prototipe & Staging | Izdihar Izzan Wibowo (PM), Seluruh Tim | 3 hari kerja \- tersebar Sprint 1 s.d. Sprint 3 | 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6 | Setiap modul fitur didemokan di staging environment dan diterima Dosen Pengampu sebelum lanjut ke modul berikutnya. |
| **1.5.1** | Test Planning | Raden Mas Galih Pradityo (System Analyst), Izdihar Izzan Wibowo (PM) | 2 hari kerja \- Sprint 3 (9-20 Nov 2026\) | 1.4.7 | Test plan mencakup seluruh jenis pengujian dan disetujui PM. |
| **1.5.2** | Testing (Unit, Integration, Usability, UAT) | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Raden Mas Galih Pradityo (System Analyst), Nur'Afia Avanza (UI/UX Designer), Izdihar Izzan Wibowo (PM) | 6 hari kerja \- Release Sprint (23-27 Nov 2026\) | 1.5.1 | Seluruh unit test kritis lulus sesuai target coverage; data 6 layer tampil akurat tanpa error integrasi; UX Dual-Mode Search & Point Inspector berfungsi baik menurut peserta uji; Dosen Pengampu menyatakan aplikasi memenuhi kebutuhan yang disepakati pada SRS. |
| **1.5.3** | Debugging | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer), Nur'Afia Avanza (UI/UX Designer) | 2 hari kerja \- Release Sprint (23-27 Nov 2026\) | 1.5.2 | Seluruh defect berprioritas kritis/tinggi telah diperbaiki dan lulus retest. |
| **1.5.4** | Deployment WebGIS App | Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) | 2 hari kerja \- Release Sprint (23-27 Nov 2026\) | 1.5.3 | Environment produksi terkonfigurasi (SSL, domain aktif) dan lulus smoke test dasar; aplikasi dapat diakses melalui domain produksi tanpa error kritis. |
| **1.5.5** | User & Technical Documentation | Nur'Afia Avanza (UI/UX Designer), Raden Mas Galih Pradityo (System Analyst), Farrel Muhammad Zaki (Backend Developer), Adzkia Nifa Adha (Backend/GIS Developer) | 4 hari kerja \- Release Sprint (23-27 Nov 2026\) | 1.5.4 | Panduan pengguna menjelaskan navigasi & fitur inti dengan langkah yang dapat diikuti; dokumentasi teknis mencakup arsitektur, skema PostGIS, spesifikasi API, dan alur pipeline data. |
| **1.5.6** | Final Handover | Izdihar Izzan Wibowo (PM) | 1 hari kerja \- Release Sprint (23-27 Nov 2026\) | 1.5.5, 1.5.2 | Dosen Pengampu menerima aplikasi, source code, dan dokumentasi lengkap pada Final Demonstration 27 November 2026\. |

[image1]: <data:image/png;base64,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z58v50mfcWaZOXNmaj9dIDvBhwen+RtuuEH8uBhm3L59u/MwgWsxVRv4vdb/KxsdO3aUsmr/l3HjxjmOcMct/4LgkksukbzPtKXDrNbrrruuTFq+dO/ePbVPHZoL6mNm0mbiscceM61atZJ9fGrnzJkj/3s6rNOZCeuzN3bs2Kz+ex999FFqn0CtQN7PmjXL3HXXXanPLEy4oD2xPmPZSHfYLw9xFFr5dEjp2DLz3All9Oeff3YmC9kmuXz//fdSnr0wYMAAM3HiRGdywcRKaFFhn3LKKeLUePbZZ4tDe+vWrc0TTzxhatSoIZVl1apVzTPPPCOV+J133mkaNGhgBg8enHowx48fb3744QdzwAEHyP3xPcImcCwO2RzLzCUqSEQBhYs/ifNSuLg+worvAdfnfICPF43JfvvtZ2bPni37X331lTn55JN9XShWhZaSL24NtR9Cq1mzZubII48Uv8aePXuaevXqyTPPK1PtGW7F35EO0E033STf+eSTT6QME6yRWcCUvVWrVpmaNWvK55QhJqQg4jhm3rx55vLLL5ep6vaYGTNmSDkkcn2jRo1kksgee+whQoFzEV2dsknQ1T//+c9ybMWKFc2f/vQns3DhQqmIEWn4bFLusVLyf1DWmdlLg/rTTz+ZJUuWyHl22mmnVKeM33nMMceI3xdCoU6dOnJu7vess86SY7iXQw45ROoFBAmhBurXry8V+bXXXiu/yy0ulVv+BUG+Fi3uH8dz8pm68d5775W8qVu3rrntttskX0lv27atOeKII8ywYcPkPwWElq1j+f/4z8ifPn36mGnTponAIf9atGghQos6h/whn/icZ4H/btGiRak6HaH1+uuvi9DinvgdiGfEmM2D008/3dx4441yf3ZSEeKZ54XngYCsp556qrQXRPbmujybp512mrQFNPa0O8cff7zcI+2BFWmch/o+Pcgv7QqMGTNGnqXvvvtO7umOO+5IHVMewhRa/E+0tRbECb8NyJM33nhD8oHfWqlSJZnN37hxY1O9enWz5557ynGsLLBt2zapJzie//wPf/iDOfDAA6VcV6tWTQQy/zPXo7OCTzVtPaILgwr/Ix2lc845R8oj56Jtps3nWeB6PKNWbPEs7b///vLMIeg49wknnCAThjhPu3btzJVXXmn23Xff1G/zi9gJLWYFDhkyJPXnkQk2su4DDzwg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7bbbItMiMTrcG3SEaEFuonX++eebRN14443ukksuiYgWN7SIFje6SBgD1y699FLrNUCsSpQoYalwSOczffr0yHy0JDJPJ0kTLSBzrpe1XUvRF+bbym8usFQj0QoPEi2RKIhF9NdNWmJfGOFOTGg80EpD63thFjLni/SSVNESmUkyRCu3SWNF/Hj5uYQQ2Ymuz+lHoiViJhmiBd48kyIxDB482CbGFUJkL7o+px+JloiZZIkW0K/OZN9a4lveffdd/79WCJGF6PqcfiRaImaSKVpCCCESh67P6UeiJWJGoiWEEOFA1+f0k1TR6tixowU5+6db0RLb0qVLFxupEhT4TEIIIYJPXtdnkTqSJlokEwsaDKm9+eabbZ0s4E8++aStk0iSnB5eQskgfnZggusgINESQohwkNv1WaSWpIlWUImWFW/6FCCZ5C+//OL279/vPv7440h5kGDi6yAg0RJCiHAQputzppJVovXDDz+4//W//pc9MuHvaaedZnPZkTX2zDPPtG1OnjzpduzY4dszGGTyXIdCCCESz/Dhw/1FIsXk5hQZK1phR6IlhBAiFr799lv3zTff+ItFishruiSJVkCRaAkhhIiVKVOmxD3tj4iduXPnusOHD/uLDYlWQAmzaK1fv97mbGTuSy3JXZSsVAjhh7kqq1at6nr27KklBcsdd9zhdu/e7f8aIqRVtLy+zD179tiHXLdunfvyyy8tvcHRo0dtfdGiRWbnPO7atcu2P378uM0QzshBXlu2bJlbuXKlyQnrwPbY5YYNG2zUIRNuVq9e3X344Yf2ftdff7295k3gPHr0aGtyZf+dO3faexHPxb7eMR966CF7ZOJOtvnoo49cp06d3OLFiy3ea9SoUfY3XXPNNW7Lli1u+/btdgzixGIljKLF/zuvplORPOgu4G5KCCFE8AiEaDVo0MD179/ftW7d2pUtW9ZEC0EheL1Hjx4Wxd+iRQvXvn172x5xee+990yykK4ff/zRxOyTTz6x13kcNmxYZD49T7SQubZt27rKlSu7e+65x7Vp08b985//tG0QLYSKPFYjR450L730kn0mBO7EiRO2DZ9n9erVbsyYMbb95MmTXffu3e01hA3RatmypStVqpS1NpBGgv9vUfrMwyhatGSJ9HDgwAE3adIkf7EQQog0E7NoPfrooyZD0UtRoUXKkxhAoGgZ+umnn9x3331nIsXrPOcRoQJvn+h9ORYpG6Jfi+6n5njsz8J7sHjr0dsjZXwOtmfhvT143StjX7ZjYV/en3Kee+/DsaI/YyyETbSCmiYjm2jVqpW/SAghRJqJWbQS2aIl8iZsojV16lR/USjYtGmTPR46dMi6gD1mzpwZWQ8L//73v/1FQggh0kxGihZxWHTdhRmJVvLZtm2bdR97nHHGGfaIfFWqVClSHhYkWkIIETwyUrReffVVEwRvmp2BAwdaZvi7777bnXLKKRar9cc//tG6u+j6JJbr97//ve8o6UWilXzo6iX2j0EOtWvXtq5e4uqI+6OLPGxItERhIQyCmFLmqNWS3IU43qIMiBKZQ0aKFnJQvnz5yHNPtBidxdQ2jAb0YAQhQ2EJbg8SEi0RKxItURg6dOhgsaYitTAymGuQyD4yUrQyAYmWiBWJliiIZ555xl8kUsgrr7ziLxJZgEQroEi0ioaXWy1ReKNZw4BESxQEaXOEEKlFohVQSKoaBIImWiSiRXyIrSPGDrkg/xm51/isJLIlpxnrxFwNHTrUHTlyxCZbZSQh+dboSib9Bvtu3brVcqfBuHHjLB0H+ah4H45P/B77jx071o0fP96tWrXKHufMmWN/M93OTHmxYMECt2LFCsvvRn61EiVKmKTxOe+8807fX5EcJFpCCBE8EiJaJBwViYXEqkEgiKIFdIFcddVVNkKQQQ4LFy40KUKyvMSpQ4YMcceOHXPNmjWz5LiUE5g6a9Ysi9Uje//06dPdp59+atsjWsxGQGD8X/7yF1esWDGTJ/ZF4JhW6H/+539cmTJlXPHixW12AaZeuOyyy9xNN91kx7nrrrtsZgAvmB7JuvTSS03wko1ESwghgkdCRAsGDx5sCROfe+45LXEsTZs2dTNmzPD/e9NG0EQrFmjRQrSyBYmWEEIEj4SJlshMwixa2YZES2QajNL73e9+F3leunRp6+4H5lYVIgxItES+hFW0yFvz9NNP+4szGomWyEROPfVUe+Tac/7550fmp4Ugtf4LkRcSLZEQgiBaxGCxEENFgPuLL77oHnzwQYvh2rhxo8VLXX311W7JkiWW+R0Ru/LKKy3eiu0ffvhhm0ScAPZrr73WTZw40WKvCGonkSl30MRgde7c2WK4/vGPf1gsHXFaxIulG4mWEEIED4mWSAhBEi1asxj998UXX1iMFkHuxBAOGDDApmYiWSOjC+vUqWOB7M8++6yJGOVvv/22BblTzt/kpYrgeMgXUgVNmjQxCSPhLeVIXbqRaAkhRPCQaImEEATRSheIVhCQaImgQGwV05wVlnnz5lnKlWguuugia0HODdLfMIUWMOVabnjv7/8ctER7ePObCpFMEiZa3tD5bt26aYlj6dWrl012HDayWbSCgkQrO6ELvLBLqvj73/9uj7QM09VOyhS62YmpopueFmLy3z311FPuk08+sefMMTpmzBgr/+yzz0yI6PonRouu+6pVq1rdSCs1xzlw4IBr2bKle/nlly19CilY3n33Xbdz5057b9KxfPjhh65ixYruggsusM9AizRydeONN1qIAOs333yzu/jiiyNz4wqRaBIiWj179vQXBQK6hDyipz4gFgfoYvLWgwYJNsOERCv9SLREUFizZo2rXLmy1cHERiI5JAomsS8TLa9evdpt3rzZkgjXrVvX7d692/LeVahQwbr8EaZ77rknIlqU169f3x06dMg98sgjJlpkub/hhhvcunXrLMkwQfLIlzefIOECF154odXx7MPxypUr52699VbXqFEjV6pUKRMt8kBWr17d9xcIkTgSIlpBpXnz5pF1JpX28JqSybPkb1YOCt5dWViQaKUfiZYQQgSPjBUtpmlh9BnBzAQ+t27d2pqdt2/fbq1FvP7VV1/l2b+fboIy12Fh0Rxq6SeoLctCCJHNZKxohZ2wiZbiG9LPE0884S8SQgiRZiRaASVsogUEvor0QJyJf9SWEEKI9CPRCihhFC1gBM+0adMsQNXLa6UlecvcuXPdk08+6f8ahBBCBISUi9bBgwctKWRhYfQKvPHGGzb8109uZcCIwilTpuRIJFm+fPmoLfLOvxIN4gDEe0Vz5MiRHM8ZKUM82OzZs23YcDQkyYyVsIrW448/7i8SQgghspa0iBbUrFnT8rqcddZZNkno/v37bWTg2LFj3WmnnWaSRD6VVq1a2fYM2SWYnSR1CA3dJMiINzpv7dq17k9/+pMN8wVEiyB4cq+cffbZNkUKooVcMQ0LsE5OltNPP92yhrdp08aG+5KbhUB5eO2119zevXvtuH/729/sPcjBwmf54IMPbFjyihUrbNu33nrLPi/J9zgOMkZaCUTryy+/NCksbPeOREsIIYQIPzGLVrNmzdz06dNzLLFAYrlnnnnGhAMZ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>