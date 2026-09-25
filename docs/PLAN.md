# Rencana Pembangunan NalarRuang

Status: **aktif** · Versi 1.0 · Cakupan: Sprint 0 sampai Release Sprint (7 Sep – 27 Nov 2026)

---

## 1. Konteks

SRS v1.0 dan WBS sudah mengunci *apa* yang dibangun dan *mengapa*. Dokumen ini
mengunci *dengan apa*, *dalam urutan apa*, dan *apa yang belum diputuskan*.

Tiga hal membentuk keputusan di bawah ini:

- **Tiga orang menulis kode bersamaan** (Farrel, Adzkia, Nur'Afia), masing-masing
  dibantu agen AI. Kode membosankan dengan batas modul yang jelas lebih berharga
  daripada kode pintar yang menuntut koordinasi terus-menerus.
- **Nilainya ada di data.** Skor persona dan Top 3 rekomendasi hanya sebaik enam
  layer di PostGIS (SRS D02). Pipeline data adalah jalur kritis, bukan pekerjaan
  sampingan.
- **Penilaian terjadi di Sprint Review**, di depan dosen. Setiap sprint harus
  berakhir dengan sesuatu yang berjalan di staging, bukan setengah jadi di laptop.

## 2. Stack dan alasannya

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Backend | Laravel | Ditetapkan SRS B01 dan SW02. Tim backend sudah memakainya. |
| Jembatan | Inertia.js | Halaman React dirender dari rute Laravel tanpa API terpisah untuk navigasi. Lihat ADR-0002. |
| Frontend | React | Charter dan Deskripsi Proyek menyebut React; Nur'Afia mengimplementasikan komponen UI. Lihat ADR-0002. |
| Peta | Leaflet | Ditetapkan SRS B01. Open-source, tanpa biaya lisensi (asumsi WBS 1.4.1). |
| Gaya | Tailwind CSS | Ditetapkan SRS B01. |
| Tipografi | Plus Jakarta Sans, satu-satunya | Ditetapkan SRS B03. Dibundel lewat paket npm, bukan Google Fonts, supaya tidak ada ketergantungan CDN saat demo. |
| Basis data | PostgreSQL + PostGIS | Ditetapkan SRS SW01. `ST_Intersects` dan `ST_DWithin` adalah inti Requirement Search dan Persona Grading. |
| Pengolahan data | QGIS + Overpass API | Ditetapkan SRS SW03. Pra-pemrosesan luring, hasilnya GeoJSON. |
| Tes | PHPUnit/Pest | Untuk logika skor, pemeringkatan, dan endpoint. Lihat bagian 5. |

### Yang sengaja TIDAK dipakai

| Teknologi | Disebut di | Kenapa tidak |
| --- | --- | --- |
| MongoDB | Charter, Deskripsi | Hanya dibutuhkan untuk hasil scraping NLP, yang tidak ada di WBS. Lihat ADR-0001. |
| Pipeline NLP / scraping Python | Charter, Deskripsi | Tidak ada work package-nya di WBS. SRS TBD-11 membuka kemungkinan parsing query, bukan scraping. |
| Cron job Python otomatis | Deskripsi | Data diolah sekali di QGIS lalu diimpor (SRS SW03). |
| Mapbox | Charter | SRS menetapkan Leaflet. Basemap cukup dari tile OSM. |

## 3. Kalender sprint

Diambil dari WBS bagian D. Tanggal Charter (demo 13 Okt, final 1 Des) **tidak**
dipakai; lihat ADR-0001.

| Sprint | Periode | Fokus | Deliverable | Penutup |
| --- | --- | --- | --- | --- |
| **Sprint 0** | 7 – 25 Sep | Discovery, backlog, desain, arsitektur, repo, staging | D1, D2 | Sprint Planning |
| **Sprint 1** | 28 Sep – 16 Okt | Pipeline data 6 layer, Core Map, 2 layer pertama | D3, D4 | **Sprint Review 1 — 16 Okt** |
| **Sprint 2** | 19 Okt – 6 Nov | Requirement Search, RESTful API, layer Inklusivitas & Mobilitas | D4 | **Sprint Review 2 — 6 Nov** |
| **Sprint 3** | 9 – 20 Nov | Point Inspector, Persona Grading, Commute Simulator, 2 layer sisa | D4 | **Sprint Review 3 — 20 Nov** |
| **Release** | 23 – 27 Nov | Testing, UAT, deployment, dokumentasi, serah terima | D5 | **Final & Handover — 27 Nov** |

### Gerbang Sprint Review

Satu pertanyaan di tiap gerbang: **apa yang bisa didemokan di staging?**
Kalau jawabannya "belum ada", sprint berikutnya dimulai dengan menutup itu,
bukan fitur baru.

| Gerbang | Wajib berjalan di staging |
| --- | --- |
| Review 1 | Peta pan/zoom, 2 layer bisa di-toggle, data dari PostGIS lewat API |
| Review 2 | Requirement Search mengembalikan tepat 3 hasil, fly-to, 4 layer |
| Review 3 | Point Inspector + skor 4 persona, Commute Simulator, 6 layer |
| Final | Semua FR-01..FR-21, test plan lulus, domain produksi aktif |

## 4. Keputusan yang masih terbuka

Jangan putuskan sendiri. Tanyakan ke pemiliknya, atau tulis ADR berstatus
`Diusulkan`.

| Kode | Pertanyaan | Pemilik | Menghambat |
| --- | --- | --- | --- |
| **TBD-QGIS** | Peran QGIS yang diharapkan dosen: sekadar pengolahan data, QGIS Server (WMS/WFS), atau ekspor qgis2web? | Tanya dosen SIG | Arsitektur penyajian layer |
| **TBD-ROUTE** | Mesin routing Commute Simulator. Charter menganggarkan Google Distance Matrix; SRS tidak menyebut. Pilihan lain: OpenRouteService, OSRM, atau estimasi jarak lurus × faktor. Moda transportasi publik paling sulit. | Farrel + Galih | FR-10, FR-11 (Sprint 3) |
| TBD-02 | Wireframe/mockup Figma | Nur'Afia | `docs/DESAIN-UI.md`, komponen UI |
| TBD-04 | ERD dan DDL PostGIS | Galih + Farrel | Migrasi (WBS 1.4.6.1) |
| TBD-05 | Bobot formula skor persona | Galih | Persona Grading |
| TBD-06 | Target performa kuantitatif (render, respons API) | Tim | Optimasi query (WBS 1.4.6.3) |
| TBD-08 | Nama singkat enam layer untuk UI | Nur'Afia | Panel layer |
| TBD-09 | Ambang bintang untuk poligon (jumlah fasilitas per wilayah) | Galih | FR-09 |
| TBD-10 | Ambang radius bintang 0–2 untuk titik | Galih | FR-09 |
| TBD-11 | Parsing query teks bebas: keyword matching atau NLP | Tim | FR-05 |

TBD-11 punya rekomendasi awal: **keyword matching dengan kamus kecil** (nama
kecamatan + kata kunci seperti "transum", "bebas banjir", "dekat tol"). NLP
tidak punya work package di WBS dan tidak akan selesai dalam 12 minggu.

## 5. Apa yang dites, dan apa yang tidak

**Wajib dites** — logika murni yang salahnya tidak kelihatan di layar:

- Formula skor persona (titik vs poligon, batas tiap bintang).
- Pemeringkatan Requirement Search: **selalu tepat 3 hasil** (Business Rule 1).
- Parsing query teks bebas.
- Estimasi waktu tempuh.
- Endpoint API: bentuk respons sesuai `docs/KONTRAK.md`.

**Tidak wajib dites:** komponen React, tampilan Leaflet, migrasi. Yang
terakhir cukup terbukti dengan `php artisan migrate:fresh` tanpa error.

## 6. Risiko

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Data layer Inklusivitas & Legalitas tipis di OSM/ATR | Layer kosong di sebagian besar peta | Tampilkan cakupan data apa adanya; skor menandai "data tidak lengkap" (UC-05) |
| Staging gratis mati saat Sprint Review | Demo gagal | Siapkan demo lokal cadangan sebelum tiap review |
| GeoJSON besar membuat peta lambat | Melanggar SRS 5.1 | Filter bounding box di API, simplifikasi geometri, clustering titik |
| Kontrak API berubah di tengah sprint | Frontend rusak diam-diam | Aturan beku di `docs/KONTRAK.md` |
| Peran QGIS tidak sesuai harapan dosen | Nilai SIG berkurang | TBD-QGIS ditanyakan di Sprint 1, sebelum layer ketiga |
