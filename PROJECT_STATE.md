# PROJECT_STATE.md

File ini adalah snapshot ringkas kondisi pekerjaan agar sesi berikutnya dapat dilanjutkan tanpa membaca seluruh riwayat percakapan.

Perbarui saat memulai sesi, melewati checkpoint, membuat keputusan penting, menemukan blocker, mengubah arah, berhenti di tengah pekerjaan, atau menyelesaikan task. Jangan menyalin seluruh daftar task atau percakapan ke file ini.

## Metadata

- Terakhir diperbarui: 2026-11-26 (FR-24 Listing Properti disetujui PM; CLAUDE.md & RENCANA.md diselaraskan. Uji Lahan: unduh gambar CAD .dxf; revisi Uji Lahan dikirim lewat branch `fitur/uji-lahan-lanjutan`)
- 2026-11-23 (Uji Lahan: ruang tangga/lift kos-apartemen, geser manual, dan tipe Rumah pribadi selesai; menunggu pengumuman kontrak dan persetujuan PM SRS v1.6)
- 2026-11-23 (rute alternatif `/api/commute`, `pribadi`/`publik` jadi array; lihat bagian di bawah)
- 2026-11-22 (spesifikasi mode Newbie/Pro disepakati; lihat bagian di bawah)
- 2026-11-21 (gabung `fitur/peta-mapbox` PR #3 dengan `main`: Uji Lahan, isochrone)
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

## Animasi landing (14 Nov 2026)

Tanpa dependensi baru: CSS + IntersectionObserver (`lib/gerak.ts`, atribut `data-gerak` per seksi, gerakan di
`gerak.css`). Hero: jejak lampu mobil di bundaran (SVG di atas foto, koordinat di `FOTO_HERO`, `Seksi.tsx`), butir
film, judul naik per baris, parallax saat digulir. Visi: garis putus tergambar. Our Vision: foto cetak jatuh dan
"berkembang". Misi: angka odometer. Persona: kipas simetris dari tengah + hover. Fitur: video demo saat hover
(`public/videos/demo-*.mp4`, **belum ada**, kartu jatuh ke gambar; lihat `public/videos/README.md`). Layer: tiga
kolom foto bergulir (foto tambahan memakai foto yang sudah ada di repo). Sumber data: tiga baris berjalan, berhenti
saat disorot. Cara kerja: foto per langkah muncul saat disorot. Coba Sekarang: letterbox + fade dari hitam. FAQ:
garis tergambar, akordeon halus. FAQ ke footer diam. `prefers-reduced-motion` dihormati. Ikut diperbaiki: logo
ATR/BPN di sumber data menunjuk `bpn.png` yang tidak ada (kini `atr-bpn.png`).
- 14 Nov (revisi tampilan): jejak lampu dibuat ekor + kepala dengan sisa cahaya lajur; bingkai Our Vision mendarat
  lurus; tile layer tidak lagi mengulang judul (foto tambahan diberi judul isi + label layer kecil); logo sumber data
  abu-abu (berwarna saat disorot) dan baris tidak lagi menyusut ke tengah (`justify-items` lama ikut berlaku di blok
  pada Chrome baru); tirai Coba Sekarang lebih gelap; animasi tak berujung berhenti saat di luar layar.
- Perlu dari tim: foto hero beresolusi tinggi (yang sekarang 460 px, sumber blur) dan tiga video demo. Bila foto
  hero diganti, sesuaikan `FOTO_HERO` (ukuran dan titik jalur) agar jejak lampu tetap di bundaran.

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
   **14 Nov:** 109.002 baris `layer_id='persil'` (DKI, dari `backup_nalarruang.sql`) sudah diimpor ke DB
   lokal lewat resep `docs/RENCANA.md` §"Memuat data persil"; belum ke Heroku. Izin sumber dikonfirmasi tim
   (hasil pencarian manual, gabungan beberapa sumber terpisah — bukan satu portal spesifik); kolom `sumber`
   dan popup (`isiPopupLegal`) sudah diperbarui jadi "Hasil pencarian manual tim" alih-alih label portal
   tunggal yang keliru. Status hak kosong (nilai bawaan "Hak Milik / Terdaftar") masih belum diperbaiki.
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
- Mode Newbie / Pro — **diturunkan dari prioritas tinggi**; spesifikasi final & urutan kerja (terakhir) ada di bagian "Mode Newbie / Pro" di akhir berkas ini (22 Nov 2026).
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
   layer `rdtr`/`persil`), `TASK.md`. (21 Nov: README, PROJECT_STATE, TASK, RENCANA, KOLABORASI sudah disegarkan; SISTEM belum memuat layer `rdtr`/`persil`.)
7. Farrel memuat data layer `rdtr` dan `persil` (`LayerController` mencari `layer_id` itu, seeder menyimpan RDTR sebagai `zonasi`); lalu catat keduanya di kontrak API bila disetujui.
8. Release Sprint 23–27 Nov: debugging, deployment produksi, dokumentasi (WBS 1.5.3–1.5.5).

## Keputusan penting (riwayat)

- SRS (kini v1.3) + WBS adalah acuan; Charter hanya riwayat. Desain Figma section "putih kayak bhumi yang
  udah di revisi" final; bila berbeda dengan dokumen, desain yang diikuti (29 Sep).
- Isi peta di Figma hanya ilustrasi; peta digambar dari data nyata.
- Ambang bintang titik 1,2 / 2,5 / 5 km, satu fasilitas utama per persona.
- IQAir dihapus (T-027); kualitas udara dari SatPM PM2.5 satelit.
- Hosting: Heroku (perbandingan hosting 8 Okt).
- Bila prompt tugas bertabrakan dengan `docs/RENCANA.md`, RENCANA yang dipakai (27 Sep).
- Git: branch per fitur + PR ke `main`. Agen tidak commit/push tanpa diminta.
- **Uji Lahan / FR-23 (16 Nov 2026):** fitur ala TestFit disetujui PM, dikerjakan Galih bersama agen di branch `fitur/uji-lahan` (menyentuh folder backend dan frontend dengan izin tim). Endpoint baru `POST /api/lahan`. Rumah tapak = jumlah kavling geometris (UTM 48S); kos/apartemen = KDB/KLB RDTR (Alternatif 1/2) atau asumsi di luar DKI. Biaya dan harga properti tidak termasuk.
- Yang coding bersama agen: Farrel, Adzkia, Nur'Afia, dan sejak 16 Nov 2026 **Galih** (System Analyst yang kini ikut memegang backend atas izin seluruh tim). Izdihar tidak.
- Aturan untuk agen yang membantu Galih: izin menyentuh folder tim sudah diberikan, tidak perlu ditanyakan lagi; tetapi **bila perubahan menyentuh kode anggota lain, tanya Galih dulu**.
- **Revisi SRS v1.5 (21 Nov 2026, disetujui PM):** FR-23 diselaraskan dengan implementasi (pola, zona, gerbang/pintu, ringkasan KDB/KLB/KDH, 3D), UI07 ditambah; isochrone digabung ke FR-08/FR-09 (tanpa FR-24); batas cakupan FR-01 sampai FR-23; FR-03 tetap enam layer. Rentang Mesin Waktu 2026–2045 tidak disebut di SRS, jadi FR-04 tidak perlu diubah.
- **Revisi Uji Lahan ala TestFit (22 Nov 2026, permintaan Galih):** Fase 0–9 dikerjakan langsung di `main` (9+ commit lokal, belum di-push). Fitur baru ada di rincian TASK.md Tahap 4. Menyentuh berkas peta milik Nur'Afia (`Map/PetaExplorer.tsx`, `PetaMapLibre.tsx`, `PetaPilihan.tsx`, `Components/BilahAlat.tsx`) atas persetujuan Galih; kontrak API bertambah (semua opsional). **SRS v1.6 (22 Nov 2026):** FR-23, deskripsi fitur, skenario, UI07, dan glosarium diselaraskan atas permintaan Galih; baris riwayat revisi mencatat "diajukan ke PM untuk disetujui" (persetujuan PM belum tercatat). Biaya/pro forma sengaja tidak dibuat (di luar SRS).
- **Revisi TestFit tahap 2 (23 Nov 2026):** tujuh poin Galih (parkir wrap datar di 3D, gerbang/pintu 1 m, simpanan per tab di sessionStorage, titik tambahan, putar desain, arah parkir, rekomendasi lahan kosong) dikerjakan per fase di `main`, belum di-push. Menutup panel Uji Lahan kini tidak menghapus desain; tombol Ulang yang menghapus. Desain disimpan di sessionStorage tanpa persona.
- **Perbaikan isochrone (21 Nov 2026):** query `ST_Dump` di dalam agregat di `InspectController::bangunPoligonBatasJalan` ditolak PostgreSQL sehingga garis tepi "mengikuti jalan terluar" tidak pernah terbentuk (selalu jatuh ke `/isochrone`); dipindah ke `LATERAL`, kunci cache jadi `isochrone_boundary_v3`. Tes `test_daftar_layer_dan_data_layer` disesuaikan dari 6 ke 8 layer.

## Mesin Waktu sampai 2045 (14 Nov 2026)

Keputusan Galih 14 Nov: rentang Mesin Waktu melebar dari 2026–2030 ke **2026–2045** (menyimpang dari SRS FR-04 /
desain; SRS perlu disesuaikan). Data baru `data/mesin_waktu/proyek_jutpi3.geojson` (27 garis) dibuat oleh
`data/scripts/gabung_jutpi3.py` dari:
- `jutpi3_modahub.geojson`: 53 lin JUTPI3 2045 + 787 stasiun dari ModaHub (dataset plan2045, CC BY-NC 4.0).
- `fase_video_jutpi3.csv`: 28 fase dan tahun yang dibaca dari video rujukan (youtu.be/DNarc_hZMXY).
- Aturan: fase yang sudah punya garis OSM di `proyek.geojson` dilewati; tahun dari `proyek.csv` (berita resmi)
  > video > 2045 ("rencana jangka panjang"). Bus/BRT JUTPI3 tidak dimasukkan; lin kereta rencana (Eastern/Western
  Ring, JIS, Jonggol, Leuwiliang) dan Tram Bogor masuk di 2045.
- Seeder `DataNyataSeeder::mesinWaktu()` kini membaca kedua berkas; kontrak API tidak berubah. Slider 2026–2045
  (tanda 2026/2030/2035/2040/2045), atribusi ditambahkan di peta, Legenda, dan Sumber Data landing.
- Perlu dicek di laptop: `php artisan db:seed --class=DataNyataSeeder`, lalu geser slider Mesin Waktu.

## Gabung PR #3 dengan `main` (21 Nov 2026)

`fitur/peta-mapbox` (MapLibre, bilah alat, Mesin Waktu 2045, animasi landing) digabung dengan `main` (Uji Lahan
FR-23 dan isochrone T-056 dari Adzkia). Keputusan Galih: alat **Titik** tidak lagi menggambar lingkaran 1,2 km,
melainkan poligon jangkauan waktu tempuh dari server (isochrone). Pilihan moda (jalan kaki/sepeda/mobil) dan menit
(5/10/15) dipindah dari panel melayang kanan atas ke baris petunjuk bilah alat, dan berlaku di MapLibre maupun Leaflet.
- Uji Lahan hanya ada di Leaflet (GambarLahan/ZonaLahan/AksesLahan memakai `L`): selama panel Uji Lahan terbuka,
  `PetaPilihan` memakai Leaflet (`paksaLeaflet`) lalu kembali ke MapLibre; pusat dan zoom dibawa (`Map/tampilan.ts`).
  Selama Uji Lahan, alat Jelajah/Titik/Area disembunyikan dan popup fitur tidak dibuka.
- `api.titik` kini mengirim `mode`/`minutes`; kontrak tertulis di `docs/SISTEM.md` (catatan `inspect`).
- Belum diuji di mesin dengan PostGIS dan npm: `php artisan test`, `npm run typecheck`, `npm run build`, dan
  coba isochrone sungguhan (Valhalla publik) di MapLibre dan Leaflet.

## Improvement V2 (T-046, T-057, T-059, T-060, T-061) diterapkan ulang di atas MapLibre (22 Nov 2026)

Setelah `main` berubah besar (MapLibre, bilah alat, Uji Lahan), perbaikan dari lembar Improvement V2 dipasang ulang dan
berlaku di MapLibre maupun Leaflet. T-054 dan T-055 sudah dipenuhi bilah alat dan Uji Lahan, jadi tidak dikerjakan lagi.
- **T-057 Kualitas Udara:** layer baru `kualitas_udara` (poligon kelurahan, kelas relatif sehat/kurang sehat/tidak sehat,
  popup PM2.5 dan kelipatan baku mutu). Data dari tabel `wilayah` (SatPM V6.GL.03 2024, ACAG WashU, CC BY 4.0), tanpa skema baru.
  **Menambah id layer ke-9 di `GET /api/layers`** (hanya penambahan); perlu persetujuan Farrel, Adzkia, dan Nur'Afia
  (CLAUDE.md aturan 4). Teks "enam layer" di Landing/SRS belum diubah.
- **T-059:** `status_jalur` (`eksisting`/`masa_depan`) di layer mobilitas dan mesin_waktu; rute eksisting (KRL, MRT, LRT, bus)
  tak putus, proyek masa depan putus-putus dengan warna lin yang sama.
- **T-046:** rute Biskita Trans Pakuan, Trans Tangerang Tayo, dan Bus Bekasi Keren (24 rute, Opentransum CC BY-NC; lisensi
  menunggu keputusan K9) dimuat `DataNyataSeeder::ruteBodetabek()` sebagai `jenis: bus`, dengan toggle sendiri. NBRT dan Mikrotrans belum ada datanya.
- **T-060:** saklar mode pencarian (ikon lokasi = cari tempat lewat `/api/lokasi`, ikon bintang = rekomendasi persona).
- **T-061:** onboarding terkunci: tiap langkah menunggu pengguna benar-benar mencoba fiturnya; melewati tur memunculkan peringatan.
- Perlu dijalankan di laptop: `php artisan db:seed --class=DataNyataSeeder` (rute bus, PM2.5), `npm run typecheck`, `npm run build`,
  dan uji tur serta geser/klik peta di browser.
- Tidak dikerjakan: T-058 (ModaHub; menunggu keputusan lisensi/izin), T-051 (segera hadir, di luar SRS), T-041 (data BHUMI terhalang), T-045 (menunggu keputusan PM).

## Mode Newbie / Pro — spesifikasi disepakati, dikerjakan TERAKHIR (22 Nov 2026)

Farrel menyepakati spesifikasi berikut; implementasi sengaja ditunda ke urutan paling akhir backlog
sesi ini (bukan prioritas tinggi lagi seperti catatan lama di bagian "Belum selesai" di atas):

- Saat masuk pertama kali (bagian awal onboarding/dialog persona), pengguna ditanya apakah sudah
  terbiasa memakai NalarRuang atau masih baru.
- **Newbie:** isi sistem disesuaikan agar lebih mudah dipahami, dengan bantuan tutorial yang
  **lebih jelas** daripada `Panduan.tsx`/tur onboarding yang sudah ada sekarang (T-061 mengunci
  tiap langkah tur agar dicoba — itu dasar yang sudah ada, bukan tutorial "lebih jelas" yang
  dimaksud di sini; perlu didesain ulang kontennya, bukan cuma dikunci).
- **Pro:** langsung masuk ke peta, tanpa tutorial/bantuan apa pun.
- Pilihan ini kemungkinan perlu disimpan di sesi klien (sama seperti preferensi persona, SRS BR 6) —
  bukan di database.
- Belum didesain: di mana tepatnya pertanyaan ini muncul relatif ke dialog persona (sebelum/sesudah/
  digabung), dan apakah "isi sistem disesuaikan" untuk Newbie berarti UI disederhanakan juga (sembunyikan
  opsi lanjutan seperti tol/ganjil-genap/BBM) atau hanya tutorialnya yang berbeda.

## Rute alternatif maks 3, ala Google Maps (23 Nov 2026)

Ide PM, disetujui Farrel/Adzkia/Nur'Afia secara lisan dalam sesi ini. `/api/commute` `pribadi`/`publik`
sekarang array (maks 3, terurut terbaik dulu) — **perubahan kontrak yang tidak aditif**, lihat
`docs/SISTEM.md` bagian 2 untuk detail lengkap. Frontend (`SimulatorRute.tsx`, `Pages/Peta.tsx`,
`types/index.d.ts`) sudah disesuaikan dalam commit yang sama; `Map/` dipisah lewat tipe baru `RuteTampil`
(satu rute terpilih) jadi tidak perlu tahu soal array.

- Kotak Mobil/Motor/Transit tetap menampilkan rute **terbaik** (indeks 0); daftar alternatif muncul di
  bawah kotak moda yang aktif, hanya bila moda itu punya > 1 pilihan.
- Mobil: Valhalla `alternates: 2` (OSRM `alternatives=true` sebagai cadangan). Hanya rute pertama yang
  diproses hindari-ganjil-genap (T-024); alternatif dilaporkan apa adanya.
- Umum: 3 kombinasi stasiun/halte naik-turun terbaik (bukan hanya satu), diurutkan dari total menit
  (jalan kaki + perjalanan) tercepat.
- Tes baru: `test_commute_mobil_sampai_3_alternatif`, `test_commute_publik_array_terurut_dari_tercepat`
  di `tests/Feature/ApiTest.php`. Test lama diperbarui ke path `pribadi.0.*`/`publik.0.*`.
- Belum diuji manual di browser (agen tidak bisa menjalankan `npm run dev` + klik peta): cek tampilan
  daftar alternatif di Simulator Rute dan pastikan highlight peta ikut berubah saat alternatif dipilih.

## FR-24 Listing Properti — disetujui PM, diselaraskan ke dokumen (26 Nov 2026)

PM menyetujui FR-24 (dikonfirmasi Farrel). Backend + demo visual sudah di-merge ke `main` sejak
23 Nov (lihat bagian "Rute alternatif..." di atas untuk riwayat sesi itu — FR-24 dikerjakan di
sesi yang sama). Hari ini: `CLAUDE.md` aturan 1 diperbarui (cakupan jadi FR-01–FR-23 + FR-24
sebagai pengecualian bertarget) dan `docs/RENCANA.md` TBD-12/draf FR-24 ditandai "Disetujui" alih-alih
"Belum disetujui"; komentar "DRAF"/"BELUM resmi" di kode (`PerumahanController.php`, `routes/api.php`,
`routes/web.php`, `lib/api.ts`, `types/perumahan.ts`, `PerumahanTest.php`, migration) diperbarui jadi
"disetujui PM 26 Nov 2026".

**Belum dikerjakan (sengaja ditunda, lihat docs/RENCANA.md TBD-12):** FR-24 belum dipindah PM ke
`docs/sumber/SRS.md` secara resmi (pola FR-23); kontrak API-nya belum dicatat di `docs/SISTEM.md`
bagian 2 karena itu butuh sepakat Farrel+Adzkia+Nur'Afia tersendiri (persetujuan PM atas fitur beda
dengan persetujuan kontrak teknis, CLAUDE.md aturan 4) — jangan anggap ini otomatis selesai juga.
Moderasi sungguhan, verifikasi WA, skor persona untuk listing, dan menautkan `/demo-perumahan` ke
alur produk juga belum dikerjakan.
