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

### [~] Restrukturisasi dokumentasi NalarRuang (tahap 1)

- Status: [~] Implementasi dan verifikasi selesai, menunggu tinjauan pengguna
- Fase: Handoff
- Mode: competition
- Prioritas: Tinggi
- Tujuan: Seluruh `.md` di repo mencerminkan NalarRuang, bukan proyek lama yang dokumennya tersalin.
- Konteks dan bukti awal: Seluruh `.md` disalin dari proyek sebelumnya. Belum ada kode. Sumber konteks baru: SRS v1.0, WBS, Project Charter, Deskripsi Proyek (kini di `docs/sumber/`).
- Scope termasuk: Menulis ulang CLAUDE, README, PROJECT_STATE, TASK; menyunting baris konteks AGENTS; memindah dokumen resmi ke `docs/sumber/`; menghapus dokumen proyek lama termasuk sistem ADR; menggabungkan `docs/` menjadi RENCANA, SISTEM, KOLABORASI.
- Non-goals: Mengubah logika proses kerja agen (mode, checkpoint, approval, format laporan, template task). Menyunting isi dokumen di `docs/sumber/`. Menulis kode.
- Dependensi: Tidak ada

Kriteria selesai:

- [x] Tidak ada sisa konteks proyek lama di `.md` di luar `docs/sumber/`.
- [x] `AGENTS.md` hanya berubah di baris konteks.
- [x] Bagian kerangka `TASK.md` identik.
- [x] Semua tautan relatif menunjuk berkas yang ada.
- [x] `docs/sumber/` hanya rename, isi tidak berubah.
- [ ] Ditinjau pengguna, lalu di-commit dan PR.

Risiko dan asumsi:

- Risiko: Struktur folder dan pembagian endpoint di dokumen masih usulan; bisa berbeda setelah scaffolding.
- Asumsi: Status Sprint 0 (1.2.2–1.2.5) belum diketahui, ditulis apa adanya.

Rencana verifikasi:

- grep kata kunci proyek lama, `git diff AGENTS.md`, `git diff TASK.md`, cek tautan, `git diff --stat -M docs/sumber/`.

Checkpoint dan approval:

- Scope: Disetujui
- Discovery: Selesai
- Analysis: Selesai
- Plan: Selesai
- Approval sebelum implementasi: Disetujui
- Verification: Selesai

Catatan:

- Tahap 2 dikerjakan setelah desain Figma masuk.

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
- Dependensi: TBD-05, TBD-09, TBD-10, TBD-ROUTE.

### [ ] 1.5.3–1.5.5 Debugging, deployment produksi, dokumentasi

- Prioritas: Sedang · Release Sprint

<!-- Tambahkan task berikutnya di sini tanpa perlu membuat rencana panjang. Gunakan status [ ]. -->

## Selesai

<!-- Pindahkan task selesai ke sini jika riwayatnya masih berguna. Sertakan hasil dan verifikasi terakhir. -->
