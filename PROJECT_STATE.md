# PROJECT_STATE.md

File ini adalah snapshot ringkas kondisi pekerjaan agar sesi berikutnya dapat dilanjutkan tanpa membaca seluruh riwayat percakapan.

Perbarui saat memulai sesi, melewati checkpoint, membuat keputusan penting, menemukan blocker, mengubah arah, berhenti di tengah pekerjaan, atau menyelesaikan task. Jangan menyalin seluruh daftar task atau percakapan ke file ini.

## Metadata

- Terakhir diperbarui: 2026-09-29
- Mode kerja: `competition`
- Status sesi: Berjalan
- Task aktif: Penyelarasan dokumen dan artifact ke desain final + masukan Izdihar (Tahap A–C)
- Fase aktif: Handoff
- Checkpoint terakhir: Tahap A (dokumen), B (artifact Design System), dan C (kanvas) selesai; menunggu tinjauan
- Konfirmasi pengguna terakhir: Figma section revisi final; ikuti desain dan ubah SRS/WBS agar sesuai; improvisasi sendiri yang belum didesain

## Scope Yang Disetujui

Mengganti konteks seluruh `.md` dari proyek lama (disalin dari proyek
sebelumnya) ke NalarRuang. **Logika proses kerja agen tidak diubah**: mode
`competition`, checkpoint, aturan approval, klasifikasi perubahan, format
laporan, dan template task tetap. Yang diganti hanya konteks.

Atas permintaan pengguna, sistem ADR (`docs/PERUBAHAN.md`, `docs/perubahan/`)
dihapus karena tidak diminta, dan `docs/` digabung menjadi tiga berkas.

Dikerjakan di branch `docs/restrukturisasi-nalarruang`. Belum di-commit.

## Tujuan Saat Ini

Dokumentasi mencerminkan NalarRuang supaya agen dan anggota tim yang membaca
repo tidak salah konteks. Tahap 2 (setelah desain Figma masuk): melengkapi `docs/SISTEM.md`.

## Progress

- Belum ada kode sama sekali. Repo hanya berisi dokumentasi.
- Sprint 0 berakhir hari ini (25 Sep). Sprint 1 mulai 28 Sep.
- SRS v1.0 sudah disetujui.

## Sudah Selesai

- Dokumen resmi dipindah ke `docs/sumber/` (SRS, WBS, CHARTER, DESKRIPSI).
- Dokumen proyek lama dihapus; masih ada di riwayat git.
- Ditulis ulang: `CLAUDE.md`, `README.md`, `TASK.md`, `docs/KOLABORASI.md`.
- `docs/` kini tiga berkas: `RENCANA.md` (acuan, stack, jadwal, pembagian kerja,
  TBD), `SISTEM.md` (arsitektur, kontrak API draf, batasan UI), `KOLABORASI.md`.

## Langkah Berikutnya Yang Diusulkan

1. Pengguna meninjau diff, lalu commit dan PR branch ini.
2. Pastikan status Sprint 0 bagian Farrel: 1.2.2 (ERD), 1.2.4 (boilerplate),
   1.2.5 (staging). Semuanya "belum diketahui" di `docs/RENCANA.md`.
3. Scaffolding Laravel + Inertia + React (WBS 1.2.4), lalu isi bagian
   *Perintah* dan *Versi yang dikunci* di `CLAUDE.md`.
4. Bekukan kontrak API (`docs/SISTEM.md` bagian 2) bersama Adzkia dan Nur'Afia.

## Blocker Dan Hal Yang Belum Diketahui

- **Peran QGIS** yang diharapkan dosen belum jelas (TBD-QGIS). Tanyakan ke dosen.
- **Mesin routing Commute Simulator** belum dipilih (TBD-ROUTE).
- ERD (TBD-04) belum ada di repo. Desain final ada di Figma (TBD-02 selesai).
- Pembagian endpoint Farrel vs Adzkia masih usulan.

## Keputusan Penting

- SRS v1.0 + WBS adalah acuan; Project Charter hanya riwayat.
  Enam layer, tanpa MongoDB/NLP, data diolah di QGIS lalu diimpor ke PostGIS,
  final 27 November 2026.
- Stack: Laravel + Inertia + React, Leaflet, Tailwind, PostgreSQL + PostGIS (kini tercantum di SRS v1.2).
- **Acuan UI (29 Sep):** Figma section "putih kayak bhumi yang udah di revisi" final. Bila berbeda dengan dokumen, desain yang diikuti dan SRS/WBS disesuaikan (SRS v1.2, WBS 1.4.8 baru, FR-22 landing page).
- **Masukan Izdihar (29 Sep):** isi peta Figma hanya ilustrasi (aturan Kartografi `design-system.md` bagian 9); sembilan sumber data (InaRISK, DEMNAS, IQAir, BPS, Overpass API, GTFS Transjakarta, Jakarta Satu Data, ATR/BPN, JUTPI Phase 3); skor titik 3/2/1/0 bintang = ≤1,2/≤2,5/≤5/>5 km ke satu fasilitas utama per persona; Zen dari kualitas udara dikurangi jarak RTH; wilayah memakai centang cocok/belum cocok (SRS v1.2, TBD-09 selesai).
- Audit sumber data dan rancangan algoritma Requirement Search/Commute: artifact https://claude.ai/artifact/PwTA6cASf1zAJQCDuVrz7b.
- Bila prompt tugas bertabrakan dengan `docs/RENCANA.md`, RENCANA yang dipakai
  (keputusan pengguna 27 Sep); contoh: React tetap disebut di PRD dan design system.
- Design system v2.0 (29 Sep): nilai dari section revisi. Artifact Design System
  (https://claude.ai/artifact/7R7qPFSeWx7aVjzCt4GxDR) dan kanvas contoh
  (https://claude.ai/artifact/LtCEm8pdhnp5MUtQ2bTtJY) sudah mengikuti desain final. PRD v1.1 di `prd.md`.
- Contoh visual peta di artifact memakai tile OSM asli (Bojong Gede–Citayam) dan data nyata; peta tiruan tidak dipakai lagi.
- Tombol LAYER/PERSONA dan zoom di bawah 28 (bukan 16) agar tidak menutupi atribusi Leaflet (`design-system.md` bagian 5).
- Git: branch per fitur + PR ke `main`.
- Yang coding bersama agen: Farrel, Adzkia, Nur'Afia. Izdihar dan Galih tidak.
