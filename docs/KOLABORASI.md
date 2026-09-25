# Aturan Main Tim & Agen AI

Status: **aktif** · Berlaku untuk manusia maupun agen AI

---

## Masalah yang sedang kita hindari

Tiga orang menulis kode di repo yang sama, pada saat yang sama, masing-masing
dibantu agen AI dengan alur kerja berbeda. Agen AI punya satu kebiasaan yang
sangat berbahaya dalam situasi ini: **ia gemar merapikan.** Diminta menambah
satu fitur, ia ikut menata ulang impor, mengganti nama variabel, dan
"memperbaiki" file di sebelahnya.

Pada proyek satu orang itu tidak apa-apa. Pada proyek dengan beberapa agen
menulis bersamaan, itu menghasilkan konflik merge yang membingungkan, tepat
menjelang Sprint Review ketika tidak ada waktu untuk menyelesaikannya.

Seluruh aturan di bawah ini turun dari satu gagasan: **buat tabrakan menjadi
mustahil secara struktural, bukan mengandalkan kehati-hatian.**

## Pembagian wilayah

Pembagian pekerjaan per sprint ada di **[`RENCANA.md`](RENCANA.md)** bagian 4.
Pembagian folder di bawah ini adalah **usulan** sampai scaffolding selesai dan
struktur foldernya nyata.

| Folder | Pemilik |
| --- | --- |
| Kontrak API (`docs/SISTEM.md` bagian 2), `resources/js/types/` | **Farrel, Adzkia, Nur'Afia bersama** (beku — ubah hanya setelah sepakat) |
| `database/migrations/`, `app/Models/` | **Farrel** |
| `app/Http/Controllers/Api/`, `app/Services/` | **Farrel** dan **Adzkia**, dibagi per endpoint (lihat `docs/RENCANA.md` bagian 4) |
| `database/seeders/`, `data/` | **Adzkia** (bersama Galih untuk isi QGIS) |
| `resources/js/Pages/`, `Components/`, `Map/`, `resources/css/` | **Nur'Afia** (Farrel membantu di Core Map) |
| `composer.json`, `package.json`, `.env.example`, konfigurasi | **Farrel** |
| `docs/` selain kontrak API | Siapa saja, umumkan di grup dulu |
| `docs/sumber/` | Tidak ada. Hanya dibaca. Pembaruan dokumen resmi disalin ulang oleh PM. |

**Aturannya satu kalimat: jangan menyunting berkas di folder orang lain.**
Kalau kamu butuh perubahan di sana, minta orangnya lewat grup. Perlu satu
pesan, dan menyelamatkan setengah jam penyelesaian konflik.

Kalau ada yang menyimpang dari pembagian ini untuk sementara (misalnya satu
orang menalangi pekerjaan yang lain karena terhambat), cukup sepakati di grup,
lalu tulis di deskripsi PR siapa yang mengerjakan apa.

## Untuk agen AI

Empat aturan ini penting. Yang pertama paling penting.

1. **Jangan pernah menyentuh berkas di luar folder yang diklaim.** Tidak untuk
   merapikan impor. Tidak untuk memperbaiki typo. Tidak untuk "sekalian".
   Kalau kamu melihat bug di folder orang lain, laporkan, jangan perbaiki.

2. **Butuh sesuatu yang belum ada? Jangan bangun sendiri.** Pakai bentuk dari
   kontrak API, lalu tulis mock lokal. Membangun versimu sendiri dari
   milik orang lain berarti nanti ada dua implementasi yang harus digabung.

3. **Kontrak API beku** setelah disepakati. Perubahan hanya setelah
   disepakati, dalam satu commit tersendiri. Lihat `docs/SISTEM.md` bagian 2.

4. **Jangan menambah dependensi tanpa memberi tahu.** `composer.json` dan
   `package.json` adalah berkas yang benar-benar dipakai bersama dan paling
   sering menimbulkan konflik.

## Git

**Branch per fitur, lalu pull request ke `main`.** `main` harus selalu bisa
di-deploy ke staging, karena staging yang mati di hari Sprint Review sama
dengan tidak punya increment.

```bash
git checkout main && git pull --rebase
git checkout -b fitur/api-layer          # satu branch, satu pekerjaan
# ... kerja, commit kecil ...
git add app/Http/Controllers/Api        # tambahkan folder kamu saja, jangan `git add .`
git commit -m "api: endpoint layer dengan filter bbox"
git pull --rebase origin main            # WAJIB sebelum push
git push -u origin fitur/api-layer
# buka PR ke main, minta satu reviewer
```

- **Nama branch:** `fitur/…`, `perbaikan/…`, `docs/…`, `data/…`.
- **Satu reviewer** cukup, dari orang yang kodenya bersinggungan. PR yang
  mengubah kontrak API butuh persetujuan ketiga orang.
- **Branch berumur pendek.** Lebih dari tiga hari tanpa merge berarti terlalu
  besar; pecah.
- **Commit kecil, sering.** Commit besar menyembunyikan apa yang rusak dan kapan.
- **Jangan `git add .`.** Perintah itu menyapu berkas orang lain yang kebetulan
  belum di-commit, termasuk `.env`.
- **Awalan pesan commit dengan modul:** `api:`, `db:`, `data:`, `map:`, `ui:`,
  `search:`, `persona:`, `commute:`, `docs:`. Dengan begitu `git log --oneline`
  langsung terbaca sebagai laporan kemajuan, dan ini berguna saat menyusun
  bahan Sprint Review.

## Titik sinkronisasi

Berhenti sejenak dan bicara pada titik-titik ini. Semuanya bertepatan dengan
gerbang Sprint Review di `docs/RENCANA.md` bagian 3.

| Kapan | Yang dibahas |
| --- | --- |
| Akhir Sprint 0 | Sepakati dan bekukan kontrak API. **Belum boleh coding paralel backend–frontend sebelum ini beres.** |
| Awal Sprint 1 | Boilerplate jalan di laptop semua orang? Staging bisa menerima deploy? Kalau belum, semua pindah ke masalah itu. |
| 16 Okt — Review 1 | Core Map + 2 layer dari PostGIS. Mock dicabut, data asli terpasang. |
| 6 Nov — Review 2 | Gerbang cakupan. Jujur soal apa yang tidak akan selesai, lalu buang dari backlog bersama PM. |
| 20 Nov — Review 3 | Pembekuan fitur. Setelah titik ini hanya perbaikan bug. |
| 27 Nov — Final | Tidak ada lagi yang menyentuh kode di hari demo. |

## Kalau terjadi konflik merge

Kalau muncul konflik, itu tandanya ada aturan yang terlewat. Jangan langsung
menyelesaikan sendiri — tanya dulu siapa yang menyentuh berkas itu.

Pengecualian: `composer.lock` dan `package-lock.json`. Keduanya memang dipakai
bersama; selesaikan dengan mempertahankan kedua sisi berkas manifesnya, lalu
jalankan `composer install` atau `npm install` sekali lagi.

## Kalau salah satu terhambat

Yang paling tidak bergantung pada apa pun adalah `app/Services/`: logika murni
skor persona dan pemeringkatan, bisa dites dengan data tiruan, tidak butuh
peta maupun data QGIS yang final. Kalau ada yang menganggur karena menunggu
sesuatu, di sinilah tempat paling aman untuk membantu.

Yang paling **tidak** boleh dikerjakan bersamaan adalah `composer.json`,
`package.json`, dan kontrak API. Ketiganya menyentuh semua orang sekaligus.
