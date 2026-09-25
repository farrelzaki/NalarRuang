# NalarRuang — Panduan Agen & Kontributor

> Baca file ini dulu. Ia sengaja pendek dan bersifat penunjuk arah.
> Detail ada di `docs/`. Jangan salin isi `docs/` ke sini.

## Hubungan dengan AGENTS.md

Repo ini punya dua kumpulan aturan yang **saling melengkapi, bukan bersaing**:

| Berkas | Mengatur | Menjawab |
| --- | --- | --- |
| `AGENTS.md`, `TASK.md`, `PROJECT_STATE.md` | **Proses** | Bagaimana cara agen bekerja: checkpoint, persetujuan, pelaporan. |
| `CLAUDE.md`, `docs/` | **Sistem** | Apa yang dibangun: stack, kontrak, arsitektur, batasan UI. |

Keduanya berlaku sekaligus. Ikuti alur kerja `AGENTS.md` (mode `competition`:
Scope, Discovery, Analysis, Plan, Approval, baru menulis), **dan** patuhi
keputusan teknis di `docs/`. Kalau keduanya tampak bertentangan, itu tanda
salah satunya perlu diperbarui — berhenti dan tanya, jangan pilih sendiri.

## Apa ini

**NalarRuang** — platform WebGIS untuk menemukan kawasan hunian ideal di
**Jabodetabek** berdasarkan preferensi gaya hidup. Pengguna memilih persona
(Commuter, Driver, Social & Vibe, Zen), lalu menjelajah peta enam layer,
mencari lokasi (Top 3 rekomendasi), memeriksa titik (skor bintang 0–3 per
persona), dan mensimulasikan waktu tempuh. Tanpa akun, tanpa login.

Proyek kelompok **Kelompok 4 — Developer Rumah** (Teknologi Rekayasa Perangkat
Lunak, IPB University) untuk mata kuliah **Sistem Informasi Geografis** dan
**Manajemen Proyek Teknologi Informasi**. Sprint 0 mulai 7 September 2026,
serah terima final **27 November 2026**.

Sumber kebutuhan: `docs/sumber/SRS.md` (SRS v1.0) dan `docs/sumber/WBS.md`.
Keduanya **hanya dibaca**, tidak disunting. Project Charter sudah usang;
alasannya di `docs/RENCANA.md` bagian 1.

## Peta dokumen

| Saya mau…                                                        | Buka                  |
| ---------------------------------------------------------------- | --------------------- |
| **Tahu apa yang harus SAYA kerjakan**, stack, jadwal, TBD        | `docs/RENCANA.md`     |
| **Menulis kode yang menyentuh modul lain / API**, arsitektur, UI | `docs/SISTEM.md`      |
| Tahu aturan main antar-anggota / antar-agen, Git                 | `docs/KOLABORASI.md`  |
| Membaca dokumen resmi tim (SRS, WBS, Charter)                    | `docs/sumber/`        |

## Empat aturan yang tidak boleh dilanggar

1. **Tetap di cakupan SRS.** Yang dibangun hanya FR-01 sampai FR-21 di
   `docs/sumber/SRS.md`. Aplikasi mobile native, listing/transaksi properti,
   pengumpulan data primer, dan analisis di luar Jabodetabek **di luar cakupan**.
   Fitur di luar daftar itu ditolak, sebagus apa pun idenya.
2. **Preferensi persona hanya hidup di sesi klien.** Tidak pernah dikirim untuk
   disimpan ke basis data, tidak pernah ke cookie jangka panjang. Sistem tidak
   menyimpan data pribadi apa pun (SRS 5.2, Business Rule 6).
3. **Tidak ada rahasia di repo.** Kredensial basis data, kunci API peta atau
   routing, dan token apa pun hanya lewat `.env`, yang tidak pernah di-commit.
4. **Kontrak API beku setelah disepakati.** Jangan ubah tanpa kesepakatan
   Farrel, Adzkia, dan Nur'Afia; aturannya di `docs/SISTEM.md` bagian 2.

## Struktur kode

**Usulan, belum ada kode.** Struktur final ditetapkan saat scaffolding
(WBS 1.2.4) dan bagian ini diperbarui saat itu.

```
app/
  Http/Controllers/Api/   Endpoint RESTful (layer, search, persona, commute).
  Services/               Logika murni: skor persona, pemeringkatan Top 3, parsing query.
  Models/                 Model Eloquent untuk tabel layer.
database/
  migrations/             Skema PostGIS (tabel layer, indeks GIST).
  seeders/                Impor GeoJSON hasil QGIS ke PostGIS.
resources/js/
  Pages/                  Halaman Inertia (Visual Explorer).
  Components/             Komponen React: panel layer, search bar, Point Inspector.
  Map/                    Semua kode Leaflet. Satu-satunya tempat yang boleh menyentuh `L`.
  types/                  Tipe TypeScript yang mencerminkan kontrak API.
data/
  qgis/                   Proyek QGIS (.qgz) per layer.
  geojson/                GeoJSON hasil ekspor, siap diimpor.
tests/                    PHPUnit/Pest untuk Services dan endpoint.
```

Frontend berbicara ke backend **hanya** lewat endpoint yang tertulis di
`docs/SISTEM.md` bagian 2. Komponen React tidak memanggil Leaflet langsung;
lewat `Map/`.

## Perintah

**Diisi saat scaffolding (WBS 1.2.4).** Jangan menebak. Perkiraan bentuknya:
`composer install`, `php artisan migrate`, `php artisan serve`, `npm run dev`,
`php artisan test`. Tulis ulang bagian ini dengan perintah yang benar-benar
dijalankan dan terbukti berhasil.

## Kebiasaan yang diharapkan

- **Logika murni dipisah dari efek samping.** Formula skor persona,
  pemeringkatan Top 3, parsing query teks, dan estimasi waktu tempuh harus
  berupa fungsi/kelas yang bisa diuji tanpa HTTP dan tanpa peta.
  **Kode inilah yang wajib punya tes.** Komponen React tidak wajib dites.
- **Query spasial di PostGIS, bukan di PHP.** Jangan menarik ribuan geometri
  ke PHP untuk difilter. Pakai `ST_Intersects`, `ST_DWithin`, dan filter
  bounding box, dengan indeks GIST.
- **Satu SRID di penyimpanan.** Konvensinya ada di `docs/SISTEM.md` bagian 2.
- **Commit kecil, sering, di branch fitur.** Selalu `git pull --rebase`
  sebelum `git push`. Alur branch dan PR ada di `docs/KOLABORASI.md`.
- **Jangan menambah dependensi tanpa bilang-bilang.** `composer.json` dan
  `package.json` adalah berkas yang dipakai bersama dan paling gampang bentrok.
- **Teks antarmuka berbahasa Indonesia** (SRS B02).

## Versi yang dikunci

**Belum ada.** Tabel ini diisi saat scaffolding, dan setiap versi **diverifikasi
ke Packagist/npm**, bukan ditulis dari ingatan. Yang akan dikunci setidaknya:
PHP, Laravel, Inertia, React, Leaflet, Tailwind, PostgreSQL, PostGIS.

Setelah terisi: jangan naikkan versi mayor di tengah semester.

## Kalau kamu agen AI

- Kerjakan hanya folder yang dimiliki orang yang sedang kamu bantu, sesuai
  tabel di `docs/KOLABORASI.md`. Jangan "sekalian merapikan" folder orang lain.
- Kalau butuh sesuatu dari modul lain yang belum ada, **jangan buat sendiri di
  folder kamu**. Pakai bentuk dari kontrak API dan tulis mock lokal.
- Hal yang masih TBD (lihat `docs/RENCANA.md` bagian 5) atau yang menyimpang
  dari SRS/WBS **jangan diputuskan sendiri**. Tanyakan dulu.
