# PROJECT_STATE.md

File ini adalah snapshot ringkas kondisi pekerjaan agar sesi berikutnya dapat dilanjutkan tanpa membaca seluruh riwayat percakapan.

Perbarui saat memulai sesi, melewati checkpoint, membuat keputusan penting, menemukan blocker, mengubah arah, berhenti di tengah pekerjaan, atau menyelesaikan task. Jangan menyalin seluruh daftar task atau percakapan ke file ini.

## Metadata

- Terakhir diperbarui: 2026-09-25
- Mode kerja: `competition`
- Status sesi: Berjalan
- Task aktif: Restrukturisasi dokumentasi NalarRuang (tahap 1)
- Fase aktif: Handoff
- Checkpoint terakhir: Verification (grep sisa konteks lama bersih, tautan relatif valid, `docs/sumber/` hanya rename)
- Konfirmasi pengguna terakhir: "lanjutkan" — menjalankan rencana restrukturisasi tahap 1

## Scope Yang Disetujui

Mengganti konteks seluruh `.md` dari proyek lama (disalin dari proyek
sebelumnya) ke NalarRuang. **Logika proses kerja agen tidak diubah**: mode
`competition`, checkpoint, aturan approval, klasifikasi perubahan, format
laporan, template task, dan sistem ADR tetap. Yang diganti hanya konteks.

Dikerjakan di branch `docs/restrukturisasi-nalarruang`. Belum di-commit.

## Tujuan Saat Ini

Dokumentasi mencerminkan NalarRuang supaya agen dan anggota tim yang membaca
repo tidak salah konteks. Tahap 2 (setelah desain Figma masuk): menyempurnakan
`docs/DESAIN-UI.md`, `docs/KONTRAK.md`, dan `docs/ARSITEKTUR.md`.

## Progress

- Belum ada kode sama sekali. Repo hanya berisi dokumentasi.
- Sprint 0 berakhir hari ini (25 Sep). Sprint 1 mulai 28 Sep.
- SRS v1.0 sudah disetujui.

## Sudah Selesai

- Dokumen resmi dipindah ke `docs/sumber/` (SRS, WBS, CHARTER, DESKRIPSI).
- Dokumen proyek lama dihapus; masih ada di riwayat git.
- Ditulis ulang: `CLAUDE.md`, `README.md`, `docs/PLAN.md`, `docs/ARSITEKTUR.md`,
  `docs/KONTRAK.md` (draf), `docs/EKSEKUSI.md`, `docs/KOLABORASI.md`,
  `docs/PERUBAHAN.md`. Baru: `docs/DESAIN-UI.md`, ADR-0001, ADR-0002.

## Langkah Berikutnya Yang Diusulkan

1. Pengguna meninjau diff, lalu commit dan PR branch ini.
2. Pastikan status Sprint 0 bagian Farrel: 1.2.2 (ERD), 1.2.4 (boilerplate),
   1.2.5 (staging). Semuanya "belum diketahui" di `docs/EKSEKUSI.md`.
3. Scaffolding Laravel + Inertia + React (WBS 1.2.4), lalu isi bagian
   *Perintah* dan *Versi yang dikunci* di `CLAUDE.md`.
4. Bekukan `docs/KONTRAK.md` bersama Adzkia dan Nur'Afia.

## Blocker Dan Hal Yang Belum Diketahui

- **Peran QGIS** yang diharapkan dosen belum jelas (TBD-QGIS). Tanyakan ke dosen.
- **Mesin routing Commute Simulator** belum dipilih (TBD-ROUTE).
- Desain Figma (TBD-02) dan ERD (TBD-04) belum ada di repo.
- Pembagian endpoint Farrel vs Adzkia masih usulan.

## Keputusan Penting

- **ADR-0001:** SRS v1.0 + WBS adalah acuan; Project Charter hanya riwayat.
  Enam layer, tanpa MongoDB/NLP, data diolah di QGIS lalu diimpor ke PostGIS,
  final 27 November 2026.
- **ADR-0002:** Laravel + Inertia + React, Leaflet, Tailwind, PostgreSQL + PostGIS.
- Git: branch per fitur + PR ke `main`.
- Yang coding bersama agen: Farrel, Adzkia, Nur'Afia. Izdihar dan Galih tidak.
