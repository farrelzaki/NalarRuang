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

### [ ] Tahap 2 dokumentasi setelah UI/UX masuk

- Prioritas: Sedang
- Pemicu: prototipe Figma (TBD-02) tersedia
- Tujuan: Melengkapi `docs/SISTEM.md` (arsitektur, kontrak API, antarmuka) sesuai desain.

### [ ] Konfirmasi peran QGIS ke dosen (TBD-QGIS)

- Prioritas: Tinggi
- Tujuan: Tahu apakah QGIS cukup untuk pengolahan data, atau harus menyajikan layer (QGIS Server WMS/WFS, qgis2web). Menentukan arsitektur penyajian layer.
- Batas waktu: sebelum layer ketiga dikerjakan di Sprint 1.

### [ ] 1.2.2 Desain basis data spasial (bersama Galih)

- Prioritas: Tinggi
- Tujuan: ERD dan DDL PostGIS untuk enam layer. Menutup TBD-04. Status Sprint 0 belum diketahui.

### [ ] 1.2.4 Boilerplate Laravel + Inertia + React + PostGIS

- Prioritas: Tinggi
- Tujuan: Proyek berjalan lokal dan tersambung ke PostGIS. Isi *Perintah* dan *Versi yang dikunci* di `CLAUDE.md`, versi diverifikasi ke Packagist/npm.

### [ ] 1.2.5 Staging gratis

- Prioritas: Tinggi
- Tujuan: Staging bisa menerima deploy Sprint 1.

### [ ] 1.4.6.1 Migrasi skema PostGIS

- Prioritas: Tinggi · Sprint 1
- Tujuan: Semua tabel dan indeks GIST terbentuk tanpa error migrasi.

### [ ] 1.4.1 dan 1.4.3 Core Map dan multi-layer (bersama Nur'Afia, Adzkia)

- Prioritas: Tinggi · Sprint 1–3

### [ ] 1.4.6.2 RESTful API dan 1.4.6.3 optimasi query (bersama Adzkia)

- Prioritas: Tinggi · Sprint 2
- Catatan: pembagian endpoint masih usulan di `docs/RENCANA.md` bagian 4.

### [ ] 1.4.5 Persona Grading dan Commute Simulator (bersama Galih, Nur'Afia)

- Prioritas: Sedang · Sprint 3
- Dependensi: TBD-05, TBD-09, TBD-ROUTE.

### [ ] 1.5.3–1.5.5 Debugging, deployment produksi, dokumentasi

- Prioritas: Sedang · Release Sprint

<!-- Tambahkan task berikutnya di sini tanpa perlu membuat rencana panjang. Gunakan status [ ]. -->

## Selesai

<!-- Pindahkan task selesai ke sini jika riwayatnya masih berguna. Sertakan hasil dan verifikasi terakhir. -->

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
