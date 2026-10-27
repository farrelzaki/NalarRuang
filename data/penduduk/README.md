# Estimasi penduduk per kelurahan (B-09)

Untuk menormalkan jumlah POI OSM per penduduk (bias pemetaan, temuan I-04). Disetujui kelompok 27 Oktober 2026.
Dibuat dengan `python data/scripts/penduduk_kelurahan.py`. Belum dimuat ke seeder.

| Berkas | Isi |
| --- | --- |
| `penduduk_2025_kelurahan.csv` | Estimasi penduduk 2025, luas, dan kepadatan untuk 1.503 kelurahan |
| `pembanding_jakarta_pusat.csv` | Estimasi dibanding data resmi DKB Semester 2 2024 untuk 44 kelurahan Jakarta Pusat |

Sumber: WorldPop R2025A, Indonesia 2025, constrained 100 m (CC BY 4.0; atribusi "WorldPop, www.worldpop.org").
Pembanding: DKB S2 2024 Sudin Dukcapil Jakarta Pusat (PDF publik). Kota lain tidak menerbitkan tabel per
kelurahan yang terbuka.

## Seberapa bisa dipercaya

- Total per kota cocok: DKI 10,98 juta (resmi sekitar 11 juta), Jakarta Pusat 1,10 juta (DKB 1,06 juta).
- Per kelurahan lemah: dari 42 kelurahan Jakarta Pusat yang bisa dicocokkan, median rasio 1,0, tetapi
  separuhnya meleset lebih dari 33% (rentang 0,31 sampai 8,0). Kelurahan perkantoran seperti Gambir dan
  Bendungan Hilir dihitung terlalu tinggi karena model membagi penduduk menurut luas bangunan.
- Karena itu angka ini sebaiknya dipakai sebagai kelas kepadatan (rendah/sedang/tinggi) atau dirata-rata per
  kecamatan, bukan ditampilkan sebagai jumlah penduduk pasti per kelurahan.
