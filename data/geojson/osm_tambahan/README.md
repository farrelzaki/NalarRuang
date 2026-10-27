# Data OSM tambahan (hasil uji pengguna)

Snapshot OpenStreetMap 27 Oktober 2026 (ekstrak provinsi DKI Jakarta, Jawa Barat, Banten dari
download.openstreetmap.fr), dipotong ke kotak Jabodetabek. Lisensi ODbL: wajib atribusi
"(c) OpenStreetMap contributors". Dibuat dengan `python data/scripts/tarik_osm_tambahan.py`. Belum dimuat ke seeder.

| Berkas | Isi | Untuk |
| --- | --- | --- |
| `non_hunian.geojson.gz` | 4.919 perairan, 1.210 makam, 541 bandara/landasan, 153 militer, 4.685 garis jalan tol | Menandai titik yang bukan area hunian (I-09) |
| `ruang_hijau.geojson.gz` | 15.606 poligon dengan tag asli (`leisure=park`, `landuse=forest`, ...) dan luas m²; 11.507 di atas 1.000 m² | Menyaring ruang hijau untuk skor Zen (I-07) |
| `gazetteer.csv` | 30.217 landmark (RS, kampus, mal, wisata, stasiun, kantor pemerintah, nama kawasan) dan 85.084 nama jalan (satu baris per nama per sel ±1 km) | Kotak cari lokasi (N-03, N-04) |
| `hiburan.geojson.gz` | 2.331 bioskop, teater, pusat seni, gelanggang olahraga, kolam renang umum, pusat kebugaran | Persona Social & Vibe (B-10) |

- Luas dihitung dengan proyeksi ekuirektangular lokal (galat < 1%).
- Fitur di tepi kotak bisa sedikit keluar dari Jabodetabek; potong dengan batas kelurahan saat dimuat ke PostGIS.
