# Data transit dan biaya untuk Commute Simulator

| Berkas | Isi | Sumber |
| --- | --- | --- |
| `headway_tj.csv` | Selang keberangkatan 753 pola perjalanan (240 rute) TransJakarta | GTFS resmi TransJakarta, `frequencies.txt` (`data/scripts/olah_jadwal_transit.py`) |
| `headway_rel.csv` | Selang MRT, LRT Jabodebek, KRL Rangkasbitung | Berita yang mengutip operator; tanggal sumber per baris |
| `tarif.csv` | Tarif TransJakarta, KRL, MRT, LRT, ojol, tol utama, BBM | Tautan sumber dan tanggal akses per baris |
| `ganjil_genap_2026.csv` | 25 ruas ganjil genap 2026 dan perbandingannya dengan data demo | Koran Jakarta 24 Maret 2026, Pergub DKI 88/2019 |

Catatan:
- Rute TransJakarta yang sama punya beberapa pola (misal koridor 1: P23, P28, ...). Selang gabungan di
  halte yang dilalui beberapa pola lebih pendek daripada selang tiap pola.
- Selang KRL selain lintas Rangkasbitung dan LRT Jakarta belum ada sumber resmi; jadwal KCI menolak
  permintaan dari server kami. Bisa diisi manual dari aplikasi Access by KAI.
- Jadwal MRT berasal dari 2023; perlu dicek ulang.
- Tarif ojol masih KP Menhub 667/2022 (berlaku 10 September 2022); belum ditemukan aturan yang lebih baru.
- Data demo masih memakai "Jl. Senen Raya" dan belum memuat Jl. Pintu Besar Selatan dan Jl. Balikpapan.
