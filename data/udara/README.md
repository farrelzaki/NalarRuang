# Data kualitas udara

Pengganti nilai udara contoh di tabel `wilayah` (temuan I-01, I-02 di evaluasi uji pengguna). Dimuat oleh
`DataNyataSeeder`: kelas RELATIF antarkelurahan (keputusan tim 27 Okt 2026). 40% PM2.5 terendah = `sehat` (tampil "relatif bersih", 2024: <= 33,8 µg/m³), 40% berikutnya = `kurang_sehat` ("sedang", <= 39,6), 20% tertinggi = `tidak_sehat` ("relatif tercemar"); `berbahaya` hanya bila di atas 55 µg/m³. Semua kelas tetap di atas baku mutu nasional.

| Berkas | Isi | Sumber | Dibuat oleh |
| --- | --- | --- | --- |
| `pm25_satelit_2024_kelurahan.csv` | PM2.5 rata-rata tahun 2024 per kelurahan (1.503 kelurahan), dalam µg/m³ dan kelipatan baku mutu tahunan 15 µg/m³ (PP 22/2021) | SatPM V6.GL.03, ACAG Washington University, grid 0,01°, CC BY 4.0 | `data/scripts/udara_satelit.py` |
| `ispu_klh/YYYY-MM.csv` | Angka ISPU per jam (indeks 0–500, bukan konsentrasi) untuk 12 stasiun KLH di Bodetabek dan Marunda, mulai 24 Oktober 2026 | ISPU KLH, ispu.kemenlh.go.id | `data/scripts/rekam_ispu_klh.py`, dijalankan otomatis dua kali sehari |

ISPU DKI dari Satu Data Jakarta (5 stasiun, harian, Januari 2024 – November 2025) sudah ditarik terpisah
dan belum disimpan di sini.

## Catatan mutu

- Satelit dibanding 5 stasiun DKI: satelit 1–9 µg/m³ lebih tinggi, dan urutan antarstasiun tidak sama.
  Cocok untuk pola besar Jakarta–pinggiran, kurang tepat untuk membandingkan dua kelurahan bersebelahan.
- Semua kelurahan berada di atas baku mutu tahunan (nilai terendah 23,0 µg/m³).
- Situs ISPU KLH tidak menyimpan arsip; data hanya ada sejak perekam berjalan. Jam yang terlewat
  (misalnya situs sedang mati) tidak bisa diambil ulang.
- Wajib atribusi: "PM2.5: SatPM V6.GL.03, ACAG Washington University (CC BY 4.0)" dan "ISPU: KLH/BPLH".
