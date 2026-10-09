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

Sumber kebutuhan: `docs/sumber/SRS.md` (SRS v1.2) dan `docs/sumber/WBS.md`.
Acuan UI: desain final Figma `ui-nalar-ruang`, section "putih kayak bhumi yang
udah di revisi". Bila desain berbeda dengan dokumen, **desain yang diikuti** dan
SRS/WBS ikut disesuaikan (keputusan tim 29 Sep 2026); di luar itu SRS/WBS tidak
disunting. Project Charter sudah usang; alasannya di `docs/RENCANA.md` bagian 1.

## Peta dokumen

| Saya mau…                                                        | Buka                  |
| ---------------------------------------------------------------- | --------------------- |
| **Tahu apa yang harus SAYA kerjakan**, stack, jadwal, TBD        | `docs/RENCANA.md`     |
| **Menulis kode yang menyentuh modul lain / API**, arsitektur, UI | `docs/SISTEM.md`      |
| Tahu aturan main antar-anggota / antar-agen, Git                 | `docs/KOLABORASI.md`  |
| Membaca dokumen resmi tim (SRS, WBS, Charter)                    | `docs/sumber/`        |

## Empat aturan yang tidak boleh dilanggar

1. **Tetap di cakupan SRS.** Yang dibangun hanya FR-01 sampai FR-22 di
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

Laravel 13 + Inertia v3 + React 19 (TypeScript) di akar repo. Scaffolding WBS
1.2.4 selesai 7 Okt 2026; folder yang belum berisi akan dibuat pemiliknya.

```
app/
  Http/Controllers/Api/   Endpoint RESTful (layer, search, persona, commute). Kini: HealthController.
  Http/Middleware/        HandleInertiaRequests (props bersama; jangan taruh persona di sini).
  Services/               Logika murni: skor persona, pemeringkatan Top 3, parsing query.
  Models/                 Model Eloquent untuk tabel layer. (Tanpa model User: tidak ada akun.)
database/
  migrations/             Skema PostGIS. 0000_..._aktifkan_postgis jalan pertama.
  seeders/                Impor GeoJSON hasil QGIS ke PostGIS.
resources/
  css/app.css             Tailwind v4 + token design-system.md 13.1 + font lokal (@fontsource).
  views/app.blade.php     Template akar Inertia.
  js/app.tsx              Entri Inertia (resolve halaman dari Pages/).
  js/Pages/               Halaman Inertia: Landing (/), Peta (/peta).
  js/Components/          Komponen React: panel layer, search bar, Point Inspector.
  js/Map/                 Semua kode Leaflet. Satu-satunya tempat yang boleh menyentuh `L`.
  js/types/               Tipe TypeScript yang mencerminkan kontrak API.
routes/
  web.php                 Rute halaman Inertia.
  api.php                 Rute /api/* (tanpa Sanctum: tidak ada auth).
data/
  qgis/                   Proyek QGIS (.qgz) per layer.
  geojson/                GeoJSON hasil ekspor, siap diimpor.
tests/                    PHPUnit untuk Services dan endpoint.
```

Frontend berbicara ke backend **hanya** lewat endpoint yang tertulis di
`docs/SISTEM.md` bagian 2. Komponen React tidak memanggil Leaflet langsung;
lewat `Map/`.

## Perintah

Prasyarat lokal: PHP 8.3 dengan ekstensi `pdo_pgsql` (Laragon
`php-8.3.30`), Composer 2, Node 24, PostgreSQL 17 + PostGIS 3.6 di port 5432.

```bash
composer install
npm install
cp .env.example .env          # isi DB_PASSWORD bila PostgreSQL-mu memakai kata sandi
php artisan key:generate
php artisan migrate           # butuh database `nalarruang` dan hak CREATE EXTENSION
php artisan db:seed --class=DemoPetaSeeder   # data contoh peta dari data/geojson/demo
php artisan serve             # http://127.0.0.1:8000  (cek /api/health)
npm run dev                   # Vite + hot reload, jalankan bersamaan dengan serve
php artisan test              # memakai database `nalarruang_test` (phpunit.xml)
npm run typecheck             # tsc --noEmit
npm run build                 # aset produksi ke public/build
```

Membuat database lokal (sekali): `createdb nalarruang` dan
`createdb nalarruang_test` sebagai user `postgres`.

**Data demo (sementara).** `data/geojson/demo/` berisi data nyata seluruh
Jabodetabek (OSM, InaRISK, Commute Data API), ditarik ulang dengan
`python data/scripts/tarik_data.py` dan `python data/scripts/banjir_inarisk.py`
(sumber per layer: `docs/RENCANA.md` bagian 2a). Kualitas udara, status
legalitas, dan tahun Mesin Waktu masih **nilai contoh**; batas desa Bekasi belum
ada di OSM. Ganti dengan hasil QGIS sebelum rilis.
Simulator rute memakai server OSRM demo publik (butuh internet). Pintasan demo:
`/peta?persona=commuter,zen` mengisi persona sesi tanpa dialog.

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
- **Teks antarmuka dwibahasa** (SRS B02, 6.2): Indonesia bawaan, Inggris opsional.
  Tulis teks sebagai pasangan `t('Teks', 'Text')` dari `resources/js/lib/bahasa.tsx`;
  teks dari API diterjemahkan di klien lewat `teksServer()`, kontrak API tidak diubah.
- **Huruf hanya dua:** Plus Jakarta Sans (semua teks) dan Fraunces (judul). Jangan
  menambah keluarga huruf lain.

## Versi yang dikunci

Diverifikasi ke Packagist/npm dan terpasang 7 Okt 2026. Jangan naikkan versi
mayor di tengah semester.

| Paket | Versi |
| --- | --- |
| PHP | 8.3 (minimum Laravel 13) |
| laravel/framework | 13.35 |
| inertiajs/inertia-laravel | 3.5 |
| phpunit/phpunit | 12.5 |
| PostgreSQL / PostGIS | 17.6 / 3.6.2 (lokal) |
| react, react-dom | 19.3 |
| @inertiajs/react | 3.8 |
| leaflet | 1.9.4 |
| tailwindcss, @tailwindcss/vite | 4.3 |
| vite | 8.3 |
| typescript | 7.0 |

Pest tidak dipakai: Pest 5 butuh PHP 8.4. Tes memakai PHPUnit bawaan Laravel.

## Kalau kamu agen AI

- Kerjakan hanya folder yang dimiliki orang yang sedang kamu bantu, sesuai
  tabel di `docs/KOLABORASI.md`. Jangan "sekalian merapikan" folder orang lain.
- Kalau butuh sesuatu dari modul lain yang belum ada, **jangan buat sendiri di
  folder kamu**. Pakai bentuk dari kontrak API dan tulis mock lokal.
- Hal yang masih TBD (lihat `docs/RENCANA.md` bagian 5) atau yang menyimpang
  dari SRS/WBS **jangan diputuskan sendiri**. Tanyakan dulu.
