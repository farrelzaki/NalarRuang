# PROJECT_STATE.md

File ini adalah snapshot ringkas kondisi pekerjaan agar sesi berikutnya dapat dilanjutkan tanpa membaca seluruh riwayat percakapan.

Perbarui saat memulai sesi, melewati checkpoint, membuat keputusan penting, menemukan blocker, mengubah arah, berhenti di tengah pekerjaan, atau menyelesaikan task. Jangan menyalin seluruh daftar task atau percakapan ke file ini.

## Metadata

- Terakhir diperbarui: 2026-11-13 (branch `fitur/peta-mapbox`, PR #3)
- Mode kerja: `competition`
- Status sesi: Berjalan — pindah ke akun Claude baru (handoff 11 Nov)
- Sprint aktif: Sprint 3 (9–20 Nov). Review 3: **20 Nov**. Final: **27 Nov**. Lomba BTN Housingpreneur tutup **30 Nov**
- Task aktif: migrasi peta ke MapLibre GL JS + OpenFreeMap, termasuk mode 2D / Miring / 3D (diminta Farrel 13 Nov)
- Checkpoint terakhir: migrasi 2D selesai di branch `fitur/peta-mapbox` (PR #3), menunggu uji tim

## Kondisi sistem saat ini

- **Branch:** `main` = `fitur/demo-ui` (PR #2, 1 Nov). Heroku auto-deploy dari `fitur/demo-ui`:
  https://nalarruang-5b9f9e688a34.herokuapp.com. `data/udara-zonasi` hanya untuk perekam ISPU.
- **Stack berjalan:** Laravel 13 + Inertia 3 + React 19 TS + Tailwind 4 + Leaflet, PostgreSQL + PostGIS.
  Deploy Heroku: `Procfile` menjalankan `php artisan nalar:muat-data` di fase release
  (hash data + seeder di tabel `versi_data`, dimuat ulang hanya bila berubah).
- **Data:** data nyata seluruh Jabodetabek di PostGIS (batas desa BIG 1.503, OSM, InaRISK, Commute Data API,
  GTFS TransJakarta, Biskita, PM2.5 SatPM V6.GL.03 2024, zonasi RDTR DKI 2022, genangan BNPB 2020,
  15 proyek Mesin Waktu dengan sumber, estimasi penduduk WorldPop 2025, kamus pencarian).
- **Endpoint:** `layers`, `layers/{id}`, `search`, `inspect`, `commute`, `lokasi`, `health` — semuanya
  memakai data nyata. Tes PHPUnit: 42 lulus per laporan handoff (belum dijalankan ulang di akun ini).
- **Skor:** titik = bintang 0–3 dari jarak ke fasilitas utama (1,2/2,5/5 km); wilayah = cocok bila
  fasilitas di dalam atau ≤ 2,5 km dari batas (TBD-09, 23 Okt). Zen memakai kelas udara **relatif
  antarkelurahan** (40% sehat, 40% kurang sehat, 20% tertinggi tidak sehat; "berbahaya" hanya > 55 µg/m³).
- **Banjir:** tampilan dipisah dari perhitungan; peta hanya indeks InaRISK ≥ 0,5 dalam tiga kepekatan
  (Cukup rawan / Rawan / Sangat rawan tergenang); skor tetap memakai kelas resmi. Indeks InaRISK =
  Geomorphic Flood Index, bukan peluang banjir.
- **Commute Simulator:** mobil lewat Valhalla (cadangan OSRM) dengan tarif tol, saklar tol, hindari
  ganjil-genap, harga BBM bisa diatur; umum lewat Commute Data API + TransJakarta, langkah perjalanan,
  ojol Rp15.000 untuk first/last mile > 1 km.
- **UI:** landing dengan animasi, onboarding peta 8 langkah, dwibahasa ID/EN, masukan uji Izdihar
  T-001–T-044 sebagian besar selesai (lihat `TASK.md`).

## Migrasi peta ke MapLibre + OpenFreeMap (12–13 Nov 2026)

Disetujui Farrel 12 Nov: ganti mesin peta sekarang (2D, fitur sama); mode miring dan 3D dikerjakan paling akhir.
13 Nov: Mapbox diganti MapLibre GL JS + OpenFreeMap (gratis, tanpa token, tanpa kuota; dipakai juga oleh Atransum).
Alasan: Mapbox tanpa kartu kredit dibatasi 5.000 muat peta per bulan. Rencana: dokumen Claude Docs
"Rencana Migrasi Peta NalarRuang".

- Branch `fitur/peta-mapbox` (belum di-merge; Heroku tidak berubah).
- `Map/PetaPilihan.tsx` memilih `Map/PetaMapLibre.tsx` bila WebGL tersedia, selain itu `Map/PetaExplorer.tsx`
  (Leaflet). MapLibre atau gaya OpenFreeMap gagal dimuat → otomatis Leaflet. `?mesin=leaflet` memaksa Leaflet.
- MapLibre GL JS 5.24.0 dimuat dari CDN jsDelivr (`Map/maplibre.ts`); gaya `tiles.openfreemap.org/styles/positron`;
  `package.json` tidak berubah. Font label dibaca dari gaya peta dasar.
- Teks popup dipindah ke `Map/isiPeta.ts` dan dipakai kedua mesin.
- Verifikasi: tsc (stub) bersih; uji asap Chrome dengan tiruan maplibregl (lihat PR #3). **Belum dicek dengan
  MapLibre/OpenFreeMap asli** (lingkungan agen tidak bisa menjangkau CDN dan server tile) dan `npm run build`
  belum dijalankan.
- 13 Nov: peta kosong di laptop karena `.maplibregl-map { position: relative }` dari CDN menimpa pembungkus;
  diperbaiki dengan `.nr-peta-maplibre.maplibregl-map`. Mode 2D / Miring / 3D ditambahkan (tidak lagi ditunda),
  uji asap 41/41.
- 13 Nov (sore): **bilah alat tengah bawah** — Jelajah / Titik (lingkaran 1,2 km) / Area (gambar poligon, Urungkan,
  Hapus, Selesai), mode tampilan 2D / Miring / 3D, dan zoom dalam satu baris (`Components/BilahAlat.tsx`); kontrol
  zoom dan kamera di dalam peta dihapus. Endpoint baru `GET /api/inspect?area=` (disetujui; `docs/SISTEM.md` bagian 2,
  `App\Services\AreaPoligon`). Onboarding langkah "Nilai titik atau area" menunjuk bilah alat. Ikut diperbaiki:
  tata letak HP (kotak cari jatuh ke bawah dan LAYER/PERSONA hilang karena pembungkus tombol kembali) dan toast di
  atas petunjuk bilah. Uji: AreaPoligon via PHP murni; uji menyeluruh halaman Peta di Chrome 23/23; uji peta 34/34.
  `php artisan test` (termasuk 2 tes fitur area baru) belum dijalankan karena tidak ada PostGIS di lingkungan agen.
- Perlu dilakukan: pull, `npm run dev`, uji berdampingan dengan `?mesin=leaflet`, jalankan `php artisan test`,
  lalu perbarui SRS B01/SW02.
- Label nama stasiun memakai font peta dasar (Noto Sans dari OpenFreeMap), bukan Plus Jakarta Sans; teks di
  dalam kanvas peta tidak bisa memakai font web.

## Dikerjakan anggota tim di luar sesi agen (25 Okt – 1 Nov)

Commit `c143594`, `61a1ed3` (25 Okt), `2ed7280` (26 Okt), `69cae69` (31 Okt), `e162dc9` (1 Nov):

- Perbaikan tampilan peta dan Simulator Rute (toggle kendaraan, harga BBM).
- **Ekosistem Mikro:** titik POI kini berwarna per jenis — **oranye `#d97706` kafe & restoran,
  biru `#0284c7` mal & belanja**, hijau untuk taman; legenda baru (Taman & RTH, Kafe & Restoran,
  Mall & Belanja). Perpustakaan belum punya warna sendiri (ikut biru).
- **Legalitas Lahan:** layer diubah menjadi "Hak Tanah Terdaftar DKI Jakarta" (sumber tertulis
  "DKI-Siap ATR/BPN"); popup menampilkan NIB, zona, status hak, luas. Layer dimuat per bounding box
  mulai zoom 14, maks. 1.500 poligon, geometri disederhanakan. Gaya baru `gayaRdtr` (warna per fungsi zona)
  dan `gayaPersil`.
- Deskripsi persona Zen diubah: tag "Tenang, hijau, bebas banjir"; mengutamakan RTH, taman, perpustakaan,
  dan lokasi bebas risiko banjir.
- Perbaikan kamera peta dan tampilan legenda.

## Perlu ditinjau dari perubahan 31 Okt – 1 Nov

1. **Data persil tidak ada di repo.** Tidak ada seeder yang memuat `layer_id = 'persil'`; berkas
   `data/geojson/hak_tanah_DKI_Jakarta/...` hanya di laptop anggota. Di Heroku layer Legalitas masih
   menampilkan poligon permukiman OSM + zona RDTR, tetapi dengan judul "Hak Tanah Terdaftar" dan nilai
   bawaan **"Hak Milik / Terdaftar"** bila atribut hak kosong → menampilkan status hak yang tidak ada di data.
   Asal dan izin sumber "DKI-Siap" juga perlu dipastikan (aturan: repo publik, jangan commit dataset terbatas).
2. **Kontrak API berubah tanpa catatan kesepakatan:** `LayerKey` dan `LayerController::LAYER` ditambah
   `rdtr` dan `persil`. Perlu disetujui Farrel, Adzkia, Nur'Afia lalu dicatat di `docs/SISTEM.md` bagian 2.
3. **`/api/layers/{id}`:** `bbox` yang salah format kini diabaikan diam-diam (dulu 422); galat SQL ditelan
   dan dibalas koleksi kosong. Menyulitkan debugging.
4. **Deskripsi Zen tidak sama dengan perhitungan:** teks menyebut perpustakaan dan bebas banjir, perhitungan
   memakai kualitas udara dan RTH. Terkait keputusan T-037 (banjir masuk kriteria Zen) yang belum diambil.
5. **`.gitignore` tersimpan dengan encoding campur (UTF-16)**. Aturan lama masih bekerja (`.env`, `vendor`,
   `node_modules` tetap diabaikan), tetapi dua baris baru (`data/geojson/...`) tidak terbaca.
6. Komentar warna di kode tidak sesuai nilainya (mis. "Ungu Violet"/"Hijau Emerald" untuk biru `#0284c7`).

## Belum selesai

46 pekerjaan per 29 Okt (dokumen "Pekerjaan Belum Selesai"; salinan di paket handoff
`dokumen-claude/01`). Prioritas tinggi:

- Bilah alat Jelajah / Titik / Area (butuh endpoint penilaian area baru → kesepakatan kontrak API).
- Mode Newbie / Pro.
- Penilaian titik vs wilayah sejalan; "cocok" butuh fasilitas cukup.
- Commute: asal = tujuan, jarak dekat cukup jalan kaki, penalti pindah moda, hindari ganjil-genap sungguhan.
- Judul hasil pencarian menyebut persona yang benar-benar dipakai.
- Legalitas dari BHUMI/ATR BPN lewat jalur sah (reCAPTCHA, jangan diakali) — lihat poin tinjauan 1.

Sudah selesai sejak dokumen 29 Okt: warna/ikon berbeda di Ekosistem Mikro (sebagian; perpustakaan dan
hiburan belum). Status "Terapkan rumus Zen yang sudah dikonfirmasi" perlu dicek: kelas relatif sudah ada
di kode (`97d610b`), rumus final belum dipastikan sama.

## Keputusan terbuka

- Peta harga tanah: A. label "Segera hadir" (disarankan) / B. hapus.
- T-037: banjir masuk kriteria Zen? (menyangkut SRS).
- TBD-QGIS, TBD-05, TBD-06 di `docs/RENCANA.md` bagian 5 (TBD-ROUTE de facto: Valhalla + OSRM + Commute Data API).

## Langkah berikutnya yang diusulkan

0. MapLibre: uji `fitur/peta-mapbox` (PR #3), merge ke `fitur/demo-ui` bila lulus.

1. Tinjau poin "Perlu ditinjau" bersama anggota yang mengubah Legalitas (paling mendesak: label hak tanah palsu).
2. Sepakati endpoint penilaian area, lalu kerjakan bilah alat Jelajah/Titik/Area dan mode Newbie/Pro.
3. Perbaikan Commute prioritas tinggi.
4. Outline deck BTN Housingpreneur (maks. 7 slide).
5. Buat ulang tugas terjadwal "Rekam ISPU KLH Jabodetabek" di akun baru, lalu matikan yang di akun lama.
6. Selaraskan dokumen basi: `docs/RENCANA.md` (masih SRS v1.0, IQAir), `docs/SISTEM.md` (rumus Zen lama,
   layer `rdtr`/`persil`), `TASK.md`.

## Keputusan penting (riwayat)

- SRS (kini v1.3) + WBS adalah acuan; Charter hanya riwayat. Desain Figma section "putih kayak bhumi yang
  udah di revisi" final; bila berbeda dengan dokumen, desain yang diikuti (29 Sep).
- Isi peta di Figma hanya ilustrasi; peta digambar dari data nyata.
- Ambang bintang titik 1,2 / 2,5 / 5 km, satu fasilitas utama per persona.
- IQAir dihapus (T-027); kualitas udara dari SatPM PM2.5 satelit.
- Hosting: Heroku (perbandingan hosting 8 Okt).
- Bila prompt tugas bertabrakan dengan `docs/RENCANA.md`, RENCANA yang dipakai (27 Sep).
- Git: branch per fitur + PR ke `main`. Agen tidak commit/push tanpa diminta.
- Yang coding bersama agen: Farrel, Adzkia, Nur'Afia. Izdihar dan Galih tidak.
