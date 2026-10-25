# Zonasi RDTR DKI Jakarta 2022

Pengganti status lahan contoh di layer Legalitas (temuan L-01). Belum dimuat ke seeder.

Sumber: layanan peta publik Dinas Citata DKI, tanpa token,
`tataruang.jakarta.go.id/.../RDTR_2022/Rencana_Pola_Ruang_RDTR_2022/FeatureServer/0`
(Rencana Pola Ruang RDTR WP DKI Jakarta 2022, Pergub DKI 31/2022). Atribusi: Pemprov DKI Jakarta.
Ditarik 25 Oktober 2026 dengan `python data/scripts/tarik_rdtr_dki.py`.

| Berkas | Isi |
| --- | --- |
| `zonasi_<kota>.geojson.gz` | 67.352 poligon (EPSG:4326, koordinat 5 desimal) dengan zona, sub-zona, KDB/KLB/KTB/KDH, luas, kelurahan, `id_kegiatan` |
| `kegiatan_subzona.csv` | Kegiatan diizinkan, terbatas, bersyarat, dan terbatas-bersyarat untuk tiap `id_kegiatan` |
| `ringkasan.json` | Jumlah poligon per kota dan per zona |

- Zona Badan Jalan (41.612 poligon) tidak disimpan karena tidak berguna untuk layer Legalitas.
- Kolom `kdb`, `klb`, `ktb`, `kdh` kadang berupa teks bertingkat menurut luas lahan, bukan angka tunggal.
- 80 poligon berzona "0" dan 2 tanpa zona dibiarkan apa adanya dari sumber.
- Tidak ada data pribadi atau data persil. Status hak per persil hanya tersedia lewat BHUMI/ATR BPN.
- Hanya Jakarta. Zonasi Bodetabek belum ada sumber terbuka (lihat dokumen kebutuhan data).
