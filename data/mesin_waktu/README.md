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
