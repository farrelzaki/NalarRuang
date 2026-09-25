# Rencana NalarRuang

Status: **aktif** · Cakupan: Sprint 0 sampai Release Sprint (7 Sep – 27 Nov 2026)

Dokumen ini menjawab: **dengan apa kita membangun, kapan, siapa mengerjakan
apa, dan apa yang belum diputuskan.** Bentuk sistemnya ada di `SISTEM.md`.

---

## 1. Acuan

Acuan cakupan, fitur, teknologi, dan jadwal adalah **SRS v1.0** dan **WBS &
WBS Dictionary** (`sumber/SRS.md`, `sumber/WBS.md`). Project Charter
(`sumber/CHARTER.md`) hanya riwayat; SRS 1.4 dan 2.1 sendiri mencatat bahwa
nilai utama proyek sudah bergeser sejak Charter.

Selisih yang paling sering membingungkan:

| Hal | Charter (usang) | SRS + WBS (berlaku) |
| --- | --- | --- |
| Layer | 3: Banjir, Transportasi, Komersial Mikro | 6: Historis & Risiko, Ekosistem Mikro & Gaya Hidup, Inklusivitas, Mobilitas & Transit, Mesin Waktu, Legalitas Lahan |
| Data | Pipeline Python, NLP scraping, MongoDB | Diolah di QGIS → GeoJSON → PostGIS |
| Fitur | Web Map, Layer Filter, Point Inspector | + Requirement Search, Persona Grading, Commute Simulator, onboarding persona |
| Jadwal | Final 1 Des | Final **27 Nov** |

Kalau SRS dan WBS bertentangan satu sama lain, berhenti dan tanyakan PM.

## 2. Stack

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Backend | Laravel | SRS B01, SW02 |
| Jembatan | Inertia.js | Halaman React dirender dari rute Laravel: satu repo, satu deploy, tanpa CORS |
| Frontend | React | Antarmuka berbagi banyak state di satu halaman peta (persona sesi, layer aktif, pin commute). Charter juga menugaskan komponen UI React ke Nur'Afia |
| Peta | Leaflet | SRS B01. Open-source, tanpa biaya lisensi |
| Gaya | Tailwind CSS | SRS B01 |
| Tipografi | Plus Jakarta Sans, satu-satunya | SRS B03. Dibundel lokal, bukan dari Google Fonts |
| Basis data | PostgreSQL + PostGIS | SRS SW01 |
| Pengolahan data | QGIS + Overpass API | SRS SW03, pra-pemrosesan luring |
| Tes | PHPUnit/Pest | Lihat bagian 6 |

SRS tidak menyebut kerangka kerja JavaScript; Inertia + React adalah pilihan
tim di atas bunyi SRS. Blade + Alpine dan SPA terpisah dipertimbangkan dan
tidak dipilih.

**Sengaja tidak dipakai:** MongoDB, pipeline NLP/scraping, cron job Python
(tidak punya work package di WBS), dan Mapbox (SRS menetapkan Leaflet).

## 3. Kalender sprint

| Sprint | Periode | Fokus | Penutup |
| --- | --- | --- | --- |
| **Sprint 0** | 7 – 25 Sep | Discovery, backlog, desain, arsitektur, repo, staging | Sprint Planning |
| **Sprint 1** | 28 Sep – 16 Okt | Pipeline data 6 layer, Core Map, 2 layer pertama | **Review 1 — 16 Okt** |
| **Sprint 2** | 19 Okt – 6 Nov | Requirement Search, RESTful API, layer Inklusivitas & Mobilitas | **Review 2 — 6 Nov** |
| **Sprint 3** | 9 – 20 Nov | Point Inspector, Persona Grading, Commute Simulator, 2 layer sisa | **Review 3 — 20 Nov** |
| **Release** | 23 – 27 Nov | Testing, UAT, deployment, dokumentasi, serah terima | **Final — 27 Nov** |

Di tiap review, pertanyaannya satu: **apa yang bisa didemokan di staging?**

| Gerbang | Wajib berjalan di staging |
| --- | --- |
| Review 1 | Peta pan/zoom, 2 layer bisa di-toggle, data dari PostGIS lewat API |
| Review 2 | Requirement Search mengembalikan tepat 3 hasil, fly-to, 4 layer |
| Review 3 | Point Inspector + skor 4 persona, Commute Simulator, 6 layer |
| Final | Semua FR-01..FR-21, test plan lulus, domain produksi aktif |

## 4. Siapa mengerjakan apa

Diambil dari kolom *Responsible / PIC* di WBS Dictionary. Kalau WBS berubah,
tabel ini ikut berubah.

| Orang | Peran | Coding bersama agen? |
| --- | --- | --- |
| Farrel Muhammad Zaki | Backend Developer | Ya |
| Adzkia Nifa Adha | Backend/GIS Developer | Ya |
| Nur'Afia Avanza | UI/UX Designer, frontend | Ya |
| Raden Mas Galih Pradityo | System Analyst | Tidak — analisis, QGIS, rancangan data |
| Izdihar Izzan Wibowo | Project Manager, Scrum Master | Tidak — backlog, review, serah terima |

| Sprint | WBS | Pekerjaan | PIC |
| --- | --- | --- | --- |
| 0 | 1.2.1.x | User flow, wireframe, prototipe Figma | Nur'Afia |
| 0 | 1.2.2 | ERD dan DDL PostGIS | Galih, **Farrel** |
| 0 | 1.2.3 | Arsitektur, kontrak API, rancangan algoritma | Galih, Izdihar, **Farrel**, Adzkia |
| 0 | 1.2.4 | Repo, branching, boilerplate Laravel + PostGIS | Izdihar, **Farrel**, Adzkia |
| 0 | 1.2.5 | Staging gratis | **Farrel** |
| 1 | 1.3.1–1.3.2 | Akuisisi dan cleaning 6 layer di QGIS, ekspor GeoJSON | Adzkia, Galih |
| 1 | 1.4.6.1 | Migrasi skema PostGIS | **Farrel** |
| 1 | 1.4.1 | Core Map: basemap, pan/zoom, highlight/dim | Nur'Afia, **Farrel** |
| 1–3 | 1.4.3 | Multi-layer mapping (2 layer per sprint) | **Farrel**, Adzkia, Nur'Afia |
| 2 | 1.4.2 | Requirement Search | Nur'Afia, Galih, Adzkia |
| 2 | 1.4.6.2 | RESTful API | **Farrel**, Adzkia |
| 2 | 1.4.6.3 | Optimasi query spasial | **Farrel** |
| 3 | 1.4.4 | Panel Point Inspector | Nur'Afia |
| 3 | 1.4.5 | Persona Grading + Commute Simulator | Galih, **Farrel**, Nur'Afia |
| 3 | 1.5.1 | Test plan | Galih, Izdihar |
| R | 1.5.2 | Testing dan UAT | Seluruh tim |
| R | 1.5.3–1.5.4 | Debugging, deployment produksi | **Farrel**, Adzkia (+ Nur'Afia untuk debugging) |
| R | 1.5.5 | Dokumentasi pengguna & teknis | Nur'Afia, Galih, **Farrel**, Adzkia |
| R | 1.5.6 | Serah terima | Izdihar |

**Status Sprint 0:** SRS v1.0 sudah disetujui dan repo sudah ada. Status
1.2.1 (Figma), 1.2.2 (ERD), 1.2.4 (boilerplate), dan 1.2.5 (staging) belum
diketahui.

**Pembagian endpoint Farrel–Adzkia (usulan, belum disepakati):** Farrel
memegang `layers`, `inspect`, dan `commute` (satu paket dengan skema, optimasi
query, dan 1.4.5); Adzkia memegang `search` (ia ikut di 1.4.2).

**Urutan kerja Farrel berikutnya:** boilerplate (1.2.4) → ERD bersama Galih
(1.2.2) → staging (1.2.5) → migrasi (1.4.6.1) → bekukan kontrak API bersama
Adzkia dan Nur'Afia.

## 5. Keputusan yang masih terbuka

Jangan putuskan sendiri; tanyakan ke pemiliknya.

| Kode | Pertanyaan | Pemilik |
| --- | --- | --- |
| **TBD-QGIS** | Peran QGIS yang diharapkan dosen: sekadar pengolahan data, QGIS Server (WMS/WFS), atau qgis2web? Tanyakan sebelum layer ketiga. | Dosen SIG |
| **TBD-ROUTE** | Mesin routing Commute Simulator: Google Distance Matrix (anggaran Charter), OpenRouteService, OSRM, atau estimasi jarak × faktor. Moda publik paling sulit. | Farrel, Galih |
| TBD-02 | Wireframe/mockup Figma | Nur'Afia |
| TBD-04 | ERD dan DDL PostGIS | Galih, Farrel |
| TBD-05 | Bobot formula skor persona | Galih |
| TBD-06 | Target performa (render, respons API) | Tim |
| TBD-08 | Nama singkat enam layer untuk UI | Nur'Afia |
| TBD-09 | Ambang bintang untuk poligon | Galih |
| TBD-10 | Ambang radius bintang 0–2 untuk titik | Galih |
| TBD-11 | Parsing query teks bebas. Rekomendasi: keyword matching dengan kamus kecil; NLP tidak punya work package. | Tim |

## 6. Tes

**Wajib dites** — logika murni yang salahnya tidak kelihatan di layar: formula
skor persona (titik vs poligon), pemeringkatan search (**selalu tepat 3**),
parsing query, estimasi waktu tempuh, dan bentuk respons endpoint.

**Tidak wajib:** komponen React, tampilan Leaflet, migrasi (cukup
`php artisan migrate:fresh` tanpa error).

## 7. Risiko

| Risiko | Mitigasi |
| --- | --- |
| Data Inklusivitas & Legalitas tipis | Tampilkan cakupan apa adanya; skor menandai "data tidak lengkap" (UC-05) |
| Staging gratis mati saat review | Siapkan demo lokal cadangan |
| GeoJSON besar membuat peta lambat | Filter bounding box, simplifikasi geometri, clustering titik |
| Kontrak API berubah di tengah sprint | Aturan beku di `SISTEM.md` bagian 2 |
| Peran QGIS tidak sesuai harapan dosen | TBD-QGIS ditanyakan di awal Sprint 1 |
