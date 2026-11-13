# Video demo kartu fitur (landing)

Kartu "Tiga cara menjelajah" memutar video ini saat disorot. Selama berkas belum ada, kartu tetap memakai gambar
(`public/images/fitur-*.jpg`), jadi halaman tidak rusak.

| Berkas | Isi yang direkam |
| --- | --- |
| `demo-search.mp4` | Mengetik kebutuhan di kotak cari, lalu Top 3 muncul dan peta terbang ke kawasan pertama. |
| `demo-inspector.mp4` | Klik satu titik di peta, Point Inspector terbuka dengan bintang per persona. |
| `demo-commute.mp4` | Pilih asal dan tujuan, rute mobil vs transportasi umum tergambar beserta waktu dan biaya. |

Saran: 6 sampai 10 detik dan bisa diulang mulus, rasio 4:3 (mis. 1200×900), tanpa suara, H.264, di bawah 2 MB.
Rekam dari `/peta` di laptop (OBS atau perekam layar bawaan), potong, lalu kompres, misalnya:

    ffmpeg -i rekaman.mov -vf "crop=1200:900,fps=30" -an -c:v libx264 -preset veryfast -crf 28 -movflags +faststart demo-search.mp4
