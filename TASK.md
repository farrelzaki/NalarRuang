# TASK.md

Gunakan file ini untuk mencatat pekerjaan proyek. Satu task harus memiliki tujuan, scope, kriteria selesai, risiko, dan rencana verifikasi yang jelas.

## Status Task

- `[ ]` Belum dikerjakan atau berada di backlog.
- `[~]` Sedang dikerjakan.
- `[x]` Selesai dan sudah diverifikasi.
- `[-]` Dibatalkan dengan alasan yang dicatat.

## Prioritas

- `Tinggi`: menghambat pekerjaan lain atau sangat penting.
- `Sedang`: penting, tetapi tidak menghambat pekerjaan utama.
- `Rendah`: peningkatan atau pekerjaan yang dapat ditunda.

## Fase Competition

- `Scope`: tujuan, konteks, batasan, non-goals, dan kriteria sukses.
- `Discovery`: bukti dari file, struktur, implementasi, test, dan konfigurasi.
- `Analysis`: akar masalah, alternatif, rekomendasi, risiko, dan hal yang belum diketahui.
- `Plan`: file terdampak, urutan perubahan, dan rencana verifikasi.
- `Approval`: menunggu persetujuan pengguna sebelum menulis.
- `Implementation`: mengerjakan scope yang disetujui.
- `Verification`: menguji hasil, regresi, edge case, dan risiko yang relevan.
- `Handoff`: memperbarui state dan melaporkan hasil akhir.

## Task Aktif

### [~] Migrasi peta ke MapLibre GL JS + OpenFreeMap (2D)

- Status: [~] Implementasi selesai di `fitur/peta-mapbox` (PR #3), menunggu uji tim
- Mode: standard (diminta dan disetujui langsung oleh Farrel, 12 Nov 2026; MapLibre disetujui 13 Nov)
- Prioritas: Tinggi
- Tujuan: peta memakai MapLibre + OpenFreeMap dengan fitur sama seperti Leaflet; mode miring/3D dikerjakan paling akhir.
- Non-goals: menghapus Leaflet, mengubah backend atau kontrak API. (Mode 2D/Miring/3D masuk scope 13 Nov.)

Kriteria selesai:

- [x] PetaMapLibre dengan props sama; cadangan otomatis ke Leaflet.
- [x] Uji asap dengan tiruan maplibregl lulus (41/41).
- [x] Mode 2D / Miring / 3D (gedung OpenFreeMap, medan AWS Terrarium).
- [x] Bilah alat tengah bawah: Jelajah / Titik / Area + mode tampilan + zoom; endpoint `inspect?area=` (13 Nov).
- [ ] `php artisan test` lulus (tes `test_inspect_area_*`, `AreaPoligonTest`).
- [ ] Daftar periksa paritas lulus dengan MapLibre asli (layer, legenda, popup, Top 3, Point Inspector, rute, Mesin Waktu, batas peta, HP).
- [ ] `npm run typecheck` dan `npm run build` bersih.
- [ ] SRS B01/SW02 diperbarui.

### [~] Uji Lahan ala TestFit (FR-23)

- Status: [~] Implementasi selesai di branch `fitur/uji-lahan`, menunggu uji lokal (PostGIS + browser) oleh Galih
- Mode: competition · Scope, Plan, dan Approval disetujui Galih 16 Nov 2026 (fitur disetujui PM; kontrak API disepakati tim)
- Prioritas: Tinggi (target sebelum Sprint Review 3, 20 Nov 2026)
- Tujuan: Pengguna menggambar lahan (kotak tarik sudut atau poligon), lalu melihat luas, zona RDTR + KDB/KLB, banjir, kecocokan persona, dan estimasi kapasitas rumah tapak (kavling digambar), kos, atau apartemen.
- Scope termasuk: `KapasitasLahan` + tes unit, `POST /api/lahan` + tes fitur, `kdb_teks`/`klb_teks` di `DataNyataSeeder`, `Map/GambarLahan.ts`, `PanelLahan`, integrasi `Peta.tsx`, kontrak di `docs/SISTEM.md` + `types/`, draf FR-23 di SRS.
- Non-goals: biaya/keuntungan, harga tanah, listing properti, layout AI per unit seperti TestFit.

Kriteria selesai:

- [x] Rumus kapasitas murni dan teruji (`tests/Unit/KapasitasLahanTest.php`, 13 tes).
- [x] `php artisan test --filter=Lahan` lulus di mesin dengan PostGIS (35 tes, 21 Nov 2026). Suite penuh: 77 tes, 72 lulus, 2 gagal di `ApiTest` (`test_inspect_zonasi_dan_bukan_hunian`, `test_ringkasan_banjir_memakai_tingkat_tampilan`); penyebabnya di isochrone `/api/inspect`, bukan Uji Lahan (lihat Catatan di bawah).
- [x] `npm run typecheck` dan `npm run build` lulus (21 Nov 2026, Node 26.13.1; build memberi peringatan chunk `Pratinjau3D` 566 kB > 500 kB).
- [ ] Uji manual di peta: kotak, poligon, tiga tipe, slider, lahan di DKI dan di luar DKI.
- [x] PM meninjau draf FR-23 di SRS (disetujui; SRS v1.5, konfirmasi Galih 21 Nov 2026).

Tahap 2 (17 Nov 2026, disetujui Galih): pola tata letak (rumah grid/cluster, kos keliling/koridor, apartemen
keliling/wrap/tower), zona bangunan/parkir/taman yang bisa ditarik/ditambah/dihapus sendiri (`Map/ZonaLahan.ts`),
parkir motor untuk kos, ringkasan KDB/KLB/KDH/tinggi/parkir yang merah bila lewat batas RDTR, dan pratinjau 3D
three.js yang dimuat malas (`Map/Lahan3D.ts`, `Components/Pratinjau3D.tsx`; dependensi baru `three` + `@types/three`).

- [x] Logika murni baru teruji (`tests/Unit/KapasitasLahanTest.php`, 23 tes).
- [x] `npm run typecheck` dan `php artisan test --filter=Lahan` lulus (21 Nov 2026).
- [ ] Uji manual: ganti pola, tarik/tambah/hapus zona, 3D ikut berubah saat lahan/zona ditarik.
- [ ] Tim diberi tahu soal dependensi `three` (CLAUDE.md: jangan menambah dependensi diam-diam).

Tahap 3 (18 Nov 2026, permintaan PM lewat Galih): gerbang kendaraan (mobil/motor, menempel tepi lahan) dan pintu gedung
(menempel tepi zona bangunan) yang bisa ditambah/digeser/dihapus sendiri (`Map/AksesLahan.ts`); gerbang membuka jalan
akses ke jalan lingkungan/parkir dan memindahkan parkir bawaan ke sisinya, pintu menjadi lobi + jalur pejalan.

- [x] Logika murni akses teruji (`tests/Unit/KapasitasLahanTest.php`, 25 tes).
- [x] `php artisan test --filter=Lahan` dan `npm run typecheck` lulus (21 Nov 2026).
- [ ] Uji manual: tambah/geser/hapus gerbang dan pintu, isi ikut berubah, tampil di 3D.

Tahap 4 (22 Nov 2026, revisi "ala TestFit", permintaan Galih; dikerjakan langsung di `main`, Fase 0–9):

- Batas 20 ha dengan notifikasi dan lahan tertahan di batas; undo/redo desain; panel layer ala editor (nama, kunci, sembunyi, urutan, duplikat, sub-layer/masking dengan prioritas); adaptasi antar zona; penempatan pintar zona baru dan isi sisa lahan dengan taman.
- Target jumlah (kamar/unit/rumah) dengan kunci ukuran; lantai lebih dulu, lalu ukuran unit.
- 3D langsung di peta (MapLibre) dan layar penuh; unduh model `.glb`, data proyek `.nalarruang.json`, GeoJSON; impor memulihkan lokasi dan bentuk yang sama.
- Sudut parkir 30–90°, padding dan Max Run, zona larangan bangun (manual dan otomatis dari area banjir InaRISK), simpan dan bandingkan skema, laporan CSV/PDF.
- Di luar cakupan (SRS): biaya, pro forma, dan harga properti sengaja tidak dibuat.
- [x] Logika murni di `resources/js/lib/` dites dengan `npm run test:js` (73 tes); `php artisan test` 105 tes; `npm run typecheck` dan `npm run build` lulus (22 Nov 2026).
- [x] Kontrak `POST /api/lahan` bertambah (semua opsional): `zona[].induk/prioritas`, jenis zona `larangan`, `isi_sisa_taman`, `target`, `larangan_banjir`, asumsi `sudut_parkir/padding_parkir/maks_baris`, properti `otomatis`; terdokumentasi di `docs/SISTEM.md`.
- [ ] Farrel, Adzkia, dan Nur'Afia diberi tahu soal tambahan kontrak dan berkas peta yang disentuh (`PetaExplorer`, `PetaMapLibre`, `PetaPilihan`, `BilahAlat`).
- [x] SRS v1.6 disusun (22 Nov 2026, atas permintaan Galih): FR-23, UI07, skenario, glosarium.
- [ ] Persetujuan PM atas SRS v1.6 (baris riwayat masih berstatus diajukan).
- [ ] Uji manual: layar penuh, dialog cetak PDF, larangan banjir di lahan yang benar-benar rawan, impor lewat dialog berkas.

Tahap 5 (23 Nov 2026, revisi TestFit tahap 2 atas permintaan Galih; rencana disetujui, satu fase satu commit):

- Gedung parkir pola wrap tampil sebagai gedung di 3D; panjang gerbang/pintu bawaan 1 m; tiap tab Rumah/Kos/Apartemen mengingat
  pengaturannya (sessionStorage, hilang saat tab browser ditutup; menutup panel tidak lagi menghapus desain); tambah/hapus titik
  lahan dan zona; putar seluruh desain (Shift = 15°); kunci arah parkir per zona + samakan; rekomendasi isi lahan kosong.
- [x] PHPUnit 109 tes, `npm run test:js` 84 tes, typecheck dan build lulus; tiap fase dicek di browser.
- [x] Kontrak (opsional, terdokumentasi di `docs/SISTEM.md`): `zona[].arah`, `isi_sisa`, properti `gedung` dan `isi_otomatis`; perilaku bawaan panjang akses jadi 1 m.
- [ ] Umumkan perubahan kontrak ke Farrel, Adzkia, Nur'Afia.
- [ ] Uji manual oleh Galih: putar dengan Shift, klik ganda titik, refresh dan tutup tab browser.

**Diperbaiki 21 Nov 2026 atas persetujuan Galih** (`ST_Dump` dipindah ke `LATERAL`, kunci cache jadi `isochrone_boundary_v3` agar hasil cadangan lama tidak terpakai; poligon `/expansion` nyata kini terbentuk, `ApiTest` inspect lulus; tes `test_daftar_layer_dan_data_layer` disesuaikan dari 6 ke 8 layer sesuai `LayerController`; suite penuh 76 dari 77 tes lulus, 0 gagal). Catatan asli temuan: di `InspectController::bangunPoligonBatasJalan` query `ST_Union(ST_MakePolygon(ST_ExteriorRing((ST_Dump(geom)).geom)))` ditolak PostgreSQL ("aggregate function calls cannot contain set-returning function calls"; diuji pada PG 17 dengan respons Valhalla `/expansion` nyata). `hitungIsochrone` menelan galatnya dan jatuh ke `/isochrone`, jadi di produksi tampak normal, tetapi penghalusan "garis tepi mengikuti jalan terluar" tidak pernah berjalan. Di tes, galat itu membuat transaksi terhenti dan dua tes `ApiTest` di atas gagal; tes itu juga memanggil Valhalla publik tanpa `Http::fake`.

### [~] Penyelarasan dokumen dan artifact ke desain final + masukan Izdihar (Tahap A–C)

- Status: [~] Tahap A, B, C selesai, menunggu tinjauan pengguna
- Fase: Handoff
- Mode: competition
- Prioritas: Tinggi
- Tujuan: Semua dokumen mengikuti desain Figma final (section "putih kayak bhumi yang udah di revisi") dan masukan Izdihar 29 Sep 2026.
- Konteks dan bukti awal: Figma section revisi dinyatakan final oleh pengguna; desain yang diikuti bila berbeda dengan dokumen, termasuk SRS/WBS. Masukan Izdihar: peta di Figma hanya ilustrasi (area kotak, pin di Monas, rute lurus tidak ditiru), sembilan sumber data, ambang bintang 1,2/2,5/5 km (15-minute city).
- Keputusan pengguna: skor titik memakai satu fasilitas utama per persona. Revisi 29 Sep (konfirmasi Izdihar, SRS v1.2): Zen = kualitas udara (sehat 3 … berbahaya 0) dikurangi jarak RTH; wilayah = centang cocok/belum cocok, tanpa bintang (TBD-09 selesai). Warna teks navy 40–55% dipertahankan sesuai Figma dengan catatan kontras.
- Scope termasuk: `docs/sumber/SRS.md` (v1.1, FR-22 landing), `docs/sumber/WBS.md` (1.4.8 baru), `design-system.md` v2.0 (termasuk Kartografi), `prd.md` v1.1, `docs/SISTEM.md`, `docs/RENCANA.md`, `docs/KOLABORASI.md`, `CLAUDE.md`, `AGENTS.md`, catatan arsip di analisis UI/UX, artifact Audit Sumber Data.
- Tahap B: artifact Design System dibangun ulang (tokens v3, 39 komponen, peta tiruan `CuplikanPeta`, aset Desain dan Foto baru). Tahap C: kanvas contoh berisi lima layar (Visual Explorer, Top 3, Simulator Rute, dialog persona, drawer).
- Non-goals: Menulis kode aplikasi.
- Dependensi: Tidak ada

Kriteria selesai:

- [x] Semua nilai visual di `design-system.md` berasal dari frame Figma revisi atau ditandai Improvisasi.
- [x] SRS/WBS/PRD/SISTEM konsisten: FR-01–22, ambang bintang, ikon toggle mobil, drawer, sumber data.
- [x] Tidak ada rujukan tersisa ke hamburger, orang berjalan, 5-minute city, atau panel kaca di dokumen aktif.
- [x] Artifact Design System dan kanvas contoh mengikuti desain final.
- [x] Peta tiruan diganti peta OSM asli dengan data nyata (kelurahan, rel, stasiun, RTH, POI, rute OSRM, bahaya banjir InaRISK); kanvas enam layar dibandingkan berdampingan dengan Figma.
- [ ] Ditinjau pengguna.

Checkpoint dan approval:

- Scope: Disetujui (29 Sep 2026)
- Discovery: Selesai (ekstraksi Figma 174:2)
- Plan: Disetujui ("ikuti desain ini ... ubah SRS dan WBS")
- Verification: grep istilah lama, `git diff --stat`

### [~] Masukan uji Izdihar (spreadsheet T-001–T-044)

- Status: [~] Fokus 23 Okt 2026: onboarding + bug peta, untuk dipamerkan Izdihar 24 Okt
- Mode: standard (permintaan langsung pengguna, perubahan langsung ke demo)
- Prioritas: Tinggi
- Sumber: Google Sheet `1x1CN84QKL0QdpSgcs34ImZzyL6fhNSo6Fz2M6pbr5oI` (kolom Work Status milik Izdihar; di sini status kerja kita)
- Hari ini (H) = dikerjakan 23 Okt. Butuh = menunggu data/keputusan.

| ID | Modul | Ringkas | Status |
| --- | --- | --- | --- |
| T-001–T-014 | Landing | Gambar kartu persona & layer, urutan kartu, logo, ukuran visi, tautan "Pelajari" | [x] |
| T-015 | Landing | Logo instansi sumber data + hapus IQAir | [x] logo; IQAir lihat T-027 |
| T-016–T-019, T-023 | Landing | Cuplikan peta, hapus "Interaktif", FAQ persona & layer, CTA "Cari Sekarang!", footer Coming Soon, tombol ke peta | [x] |
| T-020 | Landing | Kartu terlalu besar di desktop; Driver = dekat gerbang tol | [x] menunggu review |
| T-021 | Peta | Mobile: panel layer tertutup logo | [x] menunggu review |
| T-022 | Peta | Inspector sebut nama gerbang tol + jarak | [x] |
| T-024 | Peta | Rute mobil utamakan tol, saklar tol, saklar ganjil-genap, biaya BBM/tol terpisah, harga BBM bisa diatur, TransJakarta di transit | [x]; ojol first/last mile → T-042 |
| T-025 | Peta | Ikon pesawat kertas | [x] |
| T-026 | Landing | Judul tanpa titik, jarak judul–subjudul | [x] 23 Okt |
| T-027 | Landing | Hapus IQAir | [x] 23 Okt (logo & FAQ; skor Zen masih pakai kualitas udara contoh) |
| T-028 | Peta | Ikon gerbang tol = rambu jalan tol (gambar komentar) | [x] 23 Okt |
| T-029 | Peta | Ikon halte = rambu bus STOP; halte BRT = ikon "BRT" | [x] 23 Okt (BRT = halte koridor TransJakarta; tampil mulai zoom 15) |
| T-030 | Peta | Warna lin MRT, LRTJ, LRT Jabodebek, KRL, kereta bandara, BRT sesuai PDF Drive; tampilkan rute BRT | [x] 23 Okt (warna dari PDF Peta Integrasi JakLingko; 31 koridor BRT GTFS dengan warna resmi) |
| T-031 | Peta | Batas peta Jabodetabek + toast "Anda sudah mencapai batas maksimum peta"; batas zoom out | [x] 23 Okt (zoom out min. 10, HP 9) |
| T-032 | Peta | Lin KRL Cikarang (biru) melewati Cikarang | [x] 23 Okt (relasi KA lokal Walahar dibuang) |
| T-033 | Peta | Kesimpulan inspector lebih informatif (sebut nama & jarak fasilitas) | [x] 23 Okt (titik: nama & jarak fasilitas, jumlah kafe 1 km, udara & banjir untuk Zen; wilayah: jumlah fasilitas) |
| T-034 | Peta | Toggle per sub-fitur di layer Mobilitas (mis. hanya ruas ganjil-genap) | [x] 23 Okt (centang per baris legenda di semua layer berlegenda >1) |
| T-035 | Peta | Lin KRL Rangkasbitung berhenti di Maja, harus sampai Rangkasbitung | [x] 23 Okt (+ stasiun Citeras, Rangkasbitung) |
| T-036 | Peta | Lin MRT melewati Lebak Bulus | [x] 23 Okt (rel depo dipotong) |
| T-037 | Peta | Historis & Risiko data asli; banjir masuk kriteria Zen | [ ] Banjir sudah InaRISK asli; kriteria Zen butuh keputusan (SRS) |
| T-038 | Peta | Ekosistem: tambah RTH/taman (Zen), mal, perpustakaan | [x] 23 Okt (perpustakaan OSM; mal sudah ada; Zen tidak menghitung makam & lapangan golf) |
| T-039 | Peta | Mesin Waktu: bercak ungu acak | [x] 23 Okt |
| T-040 | Peta | Mesin Waktu 2030 hanya MRT & Tol Cikampek Selatan, garis putus-putus, tol merah | [x] 23 Okt (MRT 2029, tol 2030; warna MRT menunggu T-030) |
| T-041 | Peta | Legalitas lahan dari ATR/BPN | [ ] Butuh (situs ATR/BPN diblokir WAF; tidak di-scrape paksa) |
| T-042 | Peta | Simulator rute gaya Google Maps: langkah perjalanan, peta lin yang dilalui saja, ojol Rp15.000 bila first/last mile tanpa transum | [x] 23 Okt (ojol bila jalan kaki > 1 km/1,5 km rute; stasiun sampai 12 km) |
| T-043 | Peta | Ikon pengaturan di kolom cari harus selalu tampil | [x] 23 Okt |
| T-044 | Peta | Penjelasan cara kerja kolom cari (dijawab di komentar) | [x] 23 Okt (jawaban dikirim ke pengguna) |
| — | Peta | Onboarding singkat saat pertama membuka peta (permintaan Izdihar 23 Okt) | [x] 23 Okt (8 langkah; buka lagi lewat Menu → Panduan atau `?panduan=1`) |

<!--
Simpan hanya satu task yang sedang dikerjakan di bagian ini.
Salin template berikut saat membuat task baru. Jangan mengisi approval sebagai disetujui sebelum pengguna benar-benar menyetujuinya.

### [~] Judul task

- Status: [~] Sedang dikerjakan
- Fase: Scope / Discovery / Analysis / Plan / Approval / Implementation / Verification / Handoff
- Mode: competition / standard
- Prioritas: Tinggi / Sedang / Rendah
- Tujuan: Jelaskan hasil yang ingin dicapai.
- Konteks dan bukti awal: Tulis fakta yang sudah diketahui atau `Belum diperiksa`.
- Scope termasuk: Tulis bagian yang akan dikerjakan.
- Non-goals: Tulis bagian yang tidak akan dikerjakan.
- Dependensi: Tulis task atau kondisi yang harus tersedia, atau `Tidak ada`.

Kriteria selesai:

- [ ] Kriteria hasil pertama terpenuhi.
- [ ] Kriteria hasil kedua terpenuhi.
- [ ] Test atau pemeriksaan yang relevan berhasil.

Risiko dan asumsi:

- Risiko: Belum diidentifikasi.
- Asumsi: Belum diidentifikasi.

Rencana verifikasi:

- Tulis test, lint, build, pemeriksaan manual, atau pemeriksaan lain yang relevan.

Checkpoint dan approval:

- Scope: Menunggu
- Discovery: Menunggu
- Analysis: Menunggu
- Plan: Menunggu
- Approval sebelum implementasi: Menunggu
- Verification: Menunggu

Catatan:

- Tambahkan keputusan, blocker, atau konteks penting di sini.
-->

## Backlog

### [ ] Konfirmasi peran QGIS ke dosen (TBD-QGIS)

- Prioritas: Tinggi
- Tujuan: Tahu apakah QGIS cukup untuk pengolahan data, atau harus menyajikan layer (QGIS Server WMS/WFS, qgis2web). Menentukan arsitektur penyajian layer.
- Batas waktu: sebelum layer ketiga dikerjakan di Sprint 1.

### [ ] 1.2.2 Desain basis data spasial (bersama Galih)

- Prioritas: Tinggi
- Tujuan: ERD dan DDL PostGIS untuk enam layer. Menutup TBD-04. Status Sprint 0 belum diketahui.

### [ ] 1.5.3–1.5.5 Debugging, deployment produksi, dokumentasi

- Prioritas: Sedang · Release Sprint

<!-- Tambahkan task berikutnya di sini tanpa perlu membuat rencana panjang. Gunakan status [ ]. -->

## Selesai

<!-- Pindahkan task selesai ke sini jika riwayatnya masih berguna. Sertakan hasil dan verifikasi terakhir. -->

### [x] Pekerjaan inti Sprint 0–3 (dipindah dari Backlog, 21 Nov 2026)

- Hasil, dengan bukti di repo:
  - 1.2.4 Boilerplate Laravel + Inertia + React + PostGIS (7 Okt 2026); perintah dan versi di `CLAUDE.md`.
  - 1.2.5 Staging/deploy: `Procfile` Heroku dengan fase release `php artisan migrate --force && php artisan nalar:muat-data`.
  - 1.4.6.1 Migrasi skema PostGIS: `database/migrations/` (tabel `wilayah`, `fitur_peta`, `versi_data`); terbentuk di setiap `php artisan test`.
  - 1.4.1 dan 1.4.3 Core Map dan multi-layer: `resources/js/Map/PetaExplorer.tsx`, `GET /api/layers`.
  - 1.4.6.2 dan 1.4.6.3 RESTful API: `routes/api.php` (layers, search, inspect, commute, lokasi, lahan, health), indeks GIST.
  - 1.4.5 Persona Grading dan Commute Simulator: `PersonaScoring`, `InspectController`, `CommuteController`.
  - "Tahap 2 dokumentasi" (`docs/SISTEM.md`): terisi dan diselaraskan dengan kode pada 21 Nov 2026.
- Verifikasi: `php artisan test` 21 Nov 2026 → 72 dari 77 lulus, 2 gagal (bug isochrone, lihat Catatan Uji Lahan), `npm run typecheck` dan `npm run build` lulus. Belum diuji manual di browser pada tanggal ini.
- Masih terbuka: 1.2.2 ERD/DDL (TBD-04; skema di migrasi masih ditandai sementara), TBD-QGIS, TBD-ROUTE, TBD-05 (lihat `docs/RENCANA.md` bagian 5).

### [x] Restrukturisasi dokumentasi NalarRuang (tahap 1)

- Hasil: konteks proyek lama dihapus; `docs/` menjadi RENCANA, SISTEM, KOLABORASI; dokumen resmi di `docs/sumber/`. Sudah di-commit.

### [~] PRD, design system, dan kanvas wireframe NalarRuang

- Status: [~] Selesai dikerjakan, menunggu tinjauan pengguna dan desainer
- Mode: competition · Scope dan Plan disetujui 27 Sep 2026 (dua tahap)
- Hasil:
  - `prd.md` di root: 27 user story, FR-01–21, UC-01–07, BR-1–18, NFR-01–16, OQ-01–10.
  - `design-system.md` di root (v1.1, nilai dari Figma `ui-nalar-ruang`).
  - Artifact Design System https://claude.ai/artifact/7R7qPFSeWx7aVjzCt4GxDR: 118 warna, 58 gaya teks, 37 komponen React (`window.NalarRuang`) dengan preview, logo, 12 screenshot.
  - Kanvas Design https://claude.ai/artifact/LtCEm8pdhnp5MUtQ2bTtJY: 4 layar dirakit dari komponen design system.
- Sumber: `docs/prompt/*.md`, `docs/sumber/`, `docs/design/`, Figma node 159:4009.
- Verifikasi: checklist PRD (FR/UC/BR lengkap, istilah terlarang hanya di rekonsiliasi); `node --check` dan render server 37/37 komponen + 37/37 preview tanpa peringatan; tidak ada hex atau `var()` di luar `tokens.json`.
- Belum diverifikasi: tampilan artifact dan kanvas dilihat langsung di browser; lima nilai hasil sampling (lihat OQ-10 `design-system.md`).
