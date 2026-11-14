# Proyek Mesin Waktu 2026-2040

Pengganti 2 proyek dengan tahun perkiraan di data demo (temuan L-03). Sesuai kesimpulan kelompok, daftar
dikurasi manual (tidak memakai GISTARU), rentang 2026-2040, dengan video JUTPI 3 sebagai panduan dan tiap
proyek dikutip ke sumber resmi atau berita yang mengutip operator.

| Berkas | Isi |
| --- | --- |
| `proyek.csv` | 15 proyek: nama, moda, status per Oktober 2026, tahun target, sumber, tanggal sumber |
| `proyek.geojson` | Proyek yang sama dengan garis dari OSM bila ada (10 dari 15); `tahun: null` berarti belum ada target resmi |
| `kandidat_osm.geojson` | Semua garis rel/jalan yang sedang dibangun atau direncanakan di OSM, untuk memeriksa pasangan |

Dibuat dengan `python data/scripts/tarik_proyek_osm.py` (setelah `tarik_osm_tambahan.py` mengunduh ekstrak OSM).

- Fase 2A MRT belum dipisah per segmen di OSM, jadi segmen 1 dan 2 memakai garis yang sama.
- Tol Japek II Selatan kini bertahun 2027 (Kementerian PU, Juli 2026), bukan 2030 seperti di data demo.
- Belum ada garis: LRT Manggarai–Dukuh Atas, MRT Fase 2B, MRT East-West Fase 2, Tol Serpong–Bogor, Tol Sentul Selatan–Karawang Barat.

## Video rujukan dan pembanding (14 Nov 2026)

- Video: *The Future of Jakarta Metropolitan Metro Network* (Toritransit, 29 Agu 2025),
  https://youtu.be/DNarc_hZMXY. Animasi jaringan JUTPI3 per fase dengan tahun; video sendiri menandai tahun
  bertanda * sebagai belum final. Tidak ada teks/subtitle, jadi fase dan tahun dibaca dari layar.
- `fase_video_jutpi3.csv`: 28 fase dari video (16 bertahun 2019-2040, 12 bertanda 20XX), dengan padanannya
  di ModaHub dan di `proyek.csv`. Ujung fase yang labelnya kecil perlu dicek ulang.
- ModaHub (https://modahub.petakpeta.com, mode "Masa Depan") memuat jaringan JUTPI3 2045 yang sama sebagai
  garis per lin (bukan per fase, tanpa tahun). Lisensi JUTPI3 di sana: CC BY-NC 4.0. Belum diunduh ke repo.
- Keputusan tim 14 Nov: rentang Mesin Waktu boleh melebar sampai 2045 (fase 20XX ditampilkan sebagai
  "Rencana 2045").
