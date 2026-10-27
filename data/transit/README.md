# Data transit dan biaya untuk Commute Simulator

| Berkas | Isi | Sumber |
| --- | --- | --- |
| `headway_tj.csv` | Selang keberangkatan 753 pola perjalanan (240 rute) TransJakarta | GTFS resmi TransJakarta, `frequencies.txt` (`data/scripts/olah_jadwal_transit.py`) |
| `headway_krl.csv` | Selang KRL 6 lintas (Bogor, Cikarang, Rangkasbitung, Tangerang, Tanjung Priok, Bandara) per rentang jam | Jadwal KAI Commuter lewat API terbuka Comuline, diperbarui Maret 2025 (`data/scripts/olah_jadwal_krl.py`) |
| `headway_rel.csv` | Selang MRT, LRT Jabodebek, KRL Rangkasbitung | Berita yang mengutip operator; tanggal sumber per baris |
| `tarif.csv` | Tarif TransJakarta, KRL, MRT, LRT, ojol, tol utama, BBM | Tautan sumber dan tanggal akses per baris |
| `ganjil_genap_2026.csv` | 25 ruas ganjil genap 2026 dan perbandingannya dengan data demo | Koran Jakarta 24 Maret 2026, Pergub DKI 88/2019 |

Catatan:
- Rute TransJakarta yang sama punya beberapa pola (misal koridor 1: P23, P28, ...). Selang gabungan di
  halte yang dilalui beberapa pola lebih pendek daripada selang tiap pola.
- Selang KRL dihitung dari jadwal Maret 2025 (Gapeka saat itu) di stasiun acuan per lintas; jadwal KCI
  langsung menolak permintaan dari server kami. Selang LRT Jakarta belum ada sumber.
- Angka KRL Rangkasbitung dari jadwal (17-22 menit di Tanah Abang) lebih panjang daripada "sekitar 10 menit"
  di berita Juni 2026; berita itu kemungkinan menghitung semua kereta di petak Serpong.
- Jadwal MRT berasal dari 2023; perlu dicek ulang.
- Tarif ojol masih KP Menhub 667/2022 (berlaku 10 September 2022); belum ditemukan aturan yang lebih baru.
- Data demo masih memakai "Jl. Senen Raya" dan belum memuat Jl. Pintu Besar Selatan dan Jl. Balikpapan.
