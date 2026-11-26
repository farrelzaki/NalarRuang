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
| Tipografi | Plus Jakarta Sans (seluruh teks); Fraunces (judul) | SRS B03. Tanpa Inter, Georgia, Playfair, DM Sans (keputusan Farrel 7 Okt 2026). Dibundel lokal, bukan dari Google Fonts |
| Basis data | PostgreSQL + PostGIS | SRS SW01 |
| Pengolahan data | QGIS + Overpass API | SRS SW03, pra-pemrosesan luring |
| Tes | PHPUnit/Pest | Lihat bagian 6 |

SRS tidak menyebut kerangka kerja JavaScript; Inertia + React adalah pilihan
tim di atas bunyi SRS. Blade + Alpine dan SPA terpisah dipertimbangkan dan
tidak dipilih.

**Sengaja tidak dipakai:** MongoDB, pipeline NLP/scraping, cron job Python
(tidak punya work package di WBS).

**Perubahan 12–13 Nov 2026 (disetujui Farrel):** peta dipindah ke MapLibre GL JS + peta dasar OpenFreeMap
(gratis, tanpa token; 13 Nov menggantikan rencana Mapbox karena Mapbox tanpa kartu kredit dibatasi 5.000 muat
peta per bulan). 2D dulu, mode miring/3D paling akhir. Leaflet tetap sebagai cadangan otomatis sampai MapLibre stabil. SRS B01/SW02 masih menyebut Leaflet dan perlu
diperbarui tim sebelum Review 3. Rencana: dokumen "Rencana Migrasi Peta NalarRuang" (Claude Docs).

## 2a. Sumber data per layer

Keputusan kelompok dari kolom *Kesimpulan* spreadsheet evaluasi sumber data
(diperbarui 8 Okt 2026). Kolom "Ditarik otomatis" = bisa diambil lewat API atau
unduhan resmi; sisanya diolah manual oleh tim data (Adzkia, Galih).

| Layer | Dipakai | Tidak dipakai | Ditarik otomatis | Diolah manual |
| --- | --- | --- | --- | --- |
| 1 Historis & Risiko | Bahaya banjir InaRISK (seluruh Jabodetabek); AQI | Elevasi DEMNAS, kriminalitas, kebisingan | InaRISK (ArcGIS REST); AQI Bodetabek lewat IQAir API (butuh kunci di `.env`). Catatan 21 Nov 2026: IQAir sudah dilepas dari UI (T-027); skor udara memakai PM2.5 satelit (ACAG SatPM) di `DataNyataSeeder` | Genangan detail Jakarta (pantaubanjir.jakarta.go.id); AQI historis Jakarta |
| 2 Ekosistem & Gaya Hidup | POI kafe/resto/mal, ruang hijau dari OSM | Google Places (berbayar, cadangan saja) | Overpass API → GeoJSON | — |
| 3 Inklusivitas | Fasilitas ramah disabilitas OSM (tag jarang; tampilkan apa adanya); halte TransJakarta ramah kursi roda | — | Overpass API; GTFS TransJakarta (`wheelchair_boarding`) | — |
| 4 Mobilitas & Transit | Stasiun, lin, transfer, tarif KRL/MRT/LRT Jakarta/LRT Jabodebek + TransJakarta; Biskita | Scraping Google Maps | Commute Data API (`api.commute.shiorilabs.id`, ODbL: cantumkan sumber); GTFS resmi TransJakarta (`gtfs.transjakarta.co.id`, juga di Mobility Database mdb-1909); JSON Biskita (opentransum); geometri rel dari OSM | — |
| 5 Mesin Waktu | Proyek 2026–2045: kurasi tim (tahun dari berita resmi) + jaringan JUTPI3 2045 | GISTARU | Garis JUTPI3 dari ModaHub (`data/mesin_waktu/jutpi3_modahub.geojson`, CC BY-NC 4.0) | Fase dan tahun dari video rujukan https://youtu.be/DNarc_hZMXY; `python data/scripts/gabung_jutpi3.py` |
| 6 Legalitas Lahan | Batas persil BHUMI ATR/BPN | — | — (BHUMI tidak membuka layanan unduh/WMS publik) | Keputusan tim: cari endpoint JSON BHUMI. Belum dikerjakan: perlu dipastikan tidak melanggar ketentuan ATR/BPN |
| Pencarian & grading | Batas desa/kelurahan (1.503 se-Jabodetabek, kode Kemendagri) | Batas OSM (tidak lengkap di Bekasi dan Kab. Tangerang) | Layanan ArcGIS REST BIG `BATAS_DESAKEL_AR` | — |
| Commute Simulator | Mobil: Valhalla (utamakan tol, cadangan OSRM) + perkiraan tarif tol, opsi hindari 23 ruas ganjil-genap (webmap ArcGIS Dishub DKI; Pintu Besar Selatan & Balikpapan belum ada di sumber); umum: tarif & rute Commute Data API + jalan kaki OSRM | Google Distance Matrix | Ya | — |

### Memuat data persil (Legalitas) ke Heroku

Data hak tanah DKI (`layer_id = 'persil'`) tidak ada di repo dan tidak dimuat oleh seeder; isinya diimpor langsung
ke basis data. `DemoPetaSeeder` tidak menghapus layer ini (`LAYER_LUAR_REPO`), jadi deploy berikutnya tidak
menimpanya, dan impor persil juga tidak menyentuh layer lain. **Syarat:** asal dan izin sumber data sudah dipastikan
(lihat `PROJECT_STATE.md`, "Perlu ditinjau" no. 1).

Di laptop yang punya basis data lengkap (sesuaikan nama tabel bila persil tidak di `fitur_peta`):

```bash
# 0. Cek jumlah dan ukuran dulu
psql -U postgres -d nalarruang -c "SELECT count(*), pg_size_pretty(sum(pg_column_size(geom))) FROM fitur_peta WHERE layer_id = 'persil'"
# 1. Ekspor hanya persil (geometri disederhanakan ~0,5 m, hex EWKB)
psql -U postgres -d nalarruang -c "\copy (SELECT layer_id, jenis, nama, atribut, tahun, sumber, encode(ST_AsEWKB(ST_SimplifyPreserveTopology(geom, 0.000005)), 'hex') FROM fitur_peta WHERE layer_id = 'persil') TO 'persil.csv' WITH CSV HEADER"
# 2. Pastikan muat di paket Heroku Postgres
heroku pg:info -a <nama-app>
# 3. Ganti persil lama (hanya persil) lalu impor
heroku pg:psql -a <nama-app> -c "DELETE FROM fitur_peta WHERE layer_id = 'persil'"
heroku pg:psql -a <nama-app> -c "\copy fitur_peta (layer_id, jenis, nama, atribut, tahun, sumber, geom) FROM 'persil.csv' WITH CSV HEADER"
heroku pg:psql -a <nama-app> -c "ANALYZE fitur_peta"
```

Jangan me-restore `backup_nalarruang.sql` utuh ke Heroku: itu menimpa semua tabel.

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
| Final | Semua FR-01..FR-23, test plan lulus, domain produksi aktif |

## 4. Siapa mengerjakan apa

Diambil dari kolom *Responsible / PIC* di WBS Dictionary. Kalau WBS berubah,
tabel ini ikut berubah.

| Orang | Peran | Coding bersama agen? |
| --- | --- | --- |
| Farrel Muhammad Zaki | Backend Developer | Ya |
| Adzkia Nifa Adha | Backend/GIS Developer | Ya |
| Nur'Afia Avanza | UI/UX Designer, frontend | Ya |
| Raden Mas Galih Pradityo | System Analyst | Ya, sejak 16 Nov 2026 — analisis, QGIS, rancangan data, dan ikut memegang backend atas izin tim. Perubahan yang menyentuh kode anggota lain ditanyakan ke Galih dulu |
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
| TBD-04 | ERD dan DDL PostGIS | Galih, Farrel |
| TBD-05 | Bobot formula skor persona (titik sudah ditetapkan: satu fasilitas utama per persona) | Galih |
| TBD-06 | Target performa (render, respons API) | Tim |
| TBD-11 | Parsing query teks bebas. Rekomendasi: keyword matching dengan kamus kecil; NLP tidak punya work package. | Tim |
| **TBD-12** | ~~Fitur listing properti (FR-24 di bawah) — perlu persetujuan PM tertulis sebelum dikerjakan.~~ **Disetujui PM dan tim (Farrel/Adzkia/Nur'Afia) 26 Nov 2026.** Menunggu PM memindahkan FR-24 resmi ke `docs/sumber/SRS.md` (pola FR-23) — administratif, bukan blocker. | PM |

### FR-24: Listing Properti — DISETUJUI PM (26 Nov 2026)

**Disetujui.** PM sudah meninjau dan menyetujui fitur ini, dan tim (Farrel/Adzkia/Nur'Afia) juga
sudah menyepakati kontraknya (dikonfirmasi Farrel 26 Nov 2026) serta asumsi sementara di bawah.
Backend + demo visual sudah di-merge ke `main`, kontrak API sudah dibekukan di `docs/SISTEM.md`
bagian 2. FR-24 masih perlu dipindah resmi (oleh PM) ke `docs/sumber/SRS.md` seperti pola FR-23
(Uji Lahan) — baris revisi bertanggal + entri tabel FR — tapi itu administratif; fitur sudah boleh
dikembangkan lebih lanjut.

**Status 26 Nov 2026 (Farrel):** backend (migration `listing_perumahan`,
`App\Http\Controllers\Api\PerumahanController`, rute `POST/GET /api/perumahan*`,
`DELETE /api/perumahan/{id}`, tes `tests/Feature/PerumahanTest.php`, 6/6 lulus) dan demo visual
(`/demo-perumahan`, tidak ditautkan dari Landing/menu) sudah di-merge ke `main`. Jawaban yang
dipakai (dipilih Farrel, disetujui PM) untuk lima pertanyaan di bawah: (1) siapa saja boleh
upload, kelola lewat `token_kelola` acak (tanpa verifikasi WA/OTP); (2) tampil langsung, tanpa
moderasi; (3) kedaluwarsa otomatis 90 hari; (4) boleh isi harga, tapi indikatif — sistem tidak
memproses pembayaran; (5) ya, tabel `listing_perumahan` terpisah dari `fitur_peta`/`wilayah`.
Cara coba: `php artisan migrate`, lalu buka `/demo-perumahan` atau `POST /api/perumahan` dengan
`nama`, `tipe` (`rumah`/`kos`/`apartemen`), `kontak_wa`, `lat`, `lng`, opsional `harga`+`harga_satuan`;
respons berisi `token_kelola` yang dipakai untuk `DELETE /api/perumahan/{id}`.

**Belum dikerjakan:** moderasi sungguhan (spam/listing palsu), verifikasi kontak WA, skor persona
untuk listing (belum nyambung ke Top 3/Point Inspector), dan menautkan `/demo-perumahan` ke
alur produk (menu/Landing) bila PM mau fitur ini tampil ke pengguna akhir, bukan cuma demo.

**Mengapa ini bukan sekadar tambahan fitur biasa:**
- SRS Business Rule 4 — *"sistem tidak melakukan pengumpulan data primer"* — penjual yang
  meng-upload lokasi perumahan berarti sistem mulai menerima dan menyimpan data primer dari
  pengguna, bukan hanya data sekunder publik seperti semua fitur sekarang.
- CLAUDE.md — *"Tanpa akun, tanpa login"* — agar penjual bisa diminta pertanggungjawaban atas
  listingnya (hapus, koreksi, moderasi spam), kemungkinan perlu identitas minimal (nomor
  WhatsApp terverifikasi OTP? token per-listing yang dikirim ke WA, bukan akun penuh?). Ini
  mengubah posisi produk dari "tanpa akun" menjadi "tanpa akun pencari, tapi ada identitas
  minimal penjual" — PM yang harus memutuskan apakah ini masih dalam koridor "tanpa akun".
- Berpotensi bersinggungan dengan larangan WBS "listing/transaksi properti di luar cakupan"
  (`docs/sumber/SRS.md` baris 135) — FR-23 (Uji Lahan) sengaja dibatasi "tidak mencakup biaya
  maupun harga properti (listing dan transaksi properti tetap di luar cakupan)". FR-24 perlu
  secara eksplisit dijelaskan ke PM sebagai perluasan cakupan itu, bukan penafsiran ulang.

**Pertanyaan yang sudah terjawab (disetujui PM 26 Nov 2026) — jawabannya ada di "Status" di atas:**
1. Siapa yang boleh upload? Siapa saja (rawan spam/listing palsu) atau perlu verifikasi (WA OTP)?
2. Perlu moderasi sebelum listing tampil di peta, atau tampil langsung?
3. Listing disimpan permanen atau punya masa berlaku (kedaluwarsa otomatis)?
4. Apakah ini tetap "estimasi/indikatif" seperti Uji Lahan, atau benar-benar listing transaksional
   (harga jual/sewa asli)? Ini menentukan apakah masih bisa dibilang bukan "listing/transaksi
   properti" dalam arti yang dilarang WBS.
5. Data lokasi yang diupload disimpan di tabel terpisah dari data sekunder publik yang ada
   (`fitur_peta`/`wilayah`), supaya jelas mana data primer pengguna vs data publik — setuju?

**Kontrak API — dibekukan di `docs/SISTEM.md` bagian 2** (disetujui Farrel/Adzkia/Nur'Afia 26 Nov
2026), lihat `app/Http/Controllers/Api/PerumahanController.php` dan `routes/api.php` untuk
implementasinya. Bentuk final (tanpa `geometri`/`foto[]`/`persona[]` seperti draf awal di bawah —
cukup `lat`/`lng` dan tanpa skor persona untuk sprint ini):

| Endpoint | Masukan | Keluaran |
| --- | --- | --- |
| `POST /api/perumahan` | `nama`, `tipe` (`rumah`/`kos`/`apartemen`), opsional `deskripsi`, opsional `harga`+`harga_satuan`, `kontak_wa`, `lat`, `lng` | `id`, `token_kelola` (sekali tampil, hash disimpan), `kedaluwarsa_pada` |
| `GET /api/perumahan/cari` | `bbox`, opsional `tipe` | `FeatureCollection` listing yang belum kedaluwarsa |
| `DELETE /api/perumahan/{id}` | `token_kelola` | 204, atau 403 bila token salah |

**Yang masih belum ada sama sekali:** UI (form upload, pin di peta, popup), aturan moderasi
sungguhan (spam/listing palsu belum ditangani — "tampil langsung" di atas cuma pilihan sementara
untuk demo), format verifikasi kontak (WA belum diverifikasi, cuma format nomor), dan bagaimana
menyambung ke Top 3/Point Inspector yang ada (skor persona belum dihitung untuk listing).
Semua ini sengaja ditunda sampai lima pertanyaan di atas terjawab.

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
