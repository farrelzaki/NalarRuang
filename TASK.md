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
