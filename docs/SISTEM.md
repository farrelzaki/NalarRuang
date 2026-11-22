# Sistem NalarRuang

Status: **draf** · Disempurnakan setelah desain Figma dan ERD tersedia (TBD-02, TBD-04)

Dokumen ini menjawab: **bentuk sistemnya seperti apa.** Tiga bagian:
arsitektur, kontrak API, dan batasan antarmuka.

---

## 1. Arsitektur

Dua dunia yang terpisah waktu: **pengolahan data** terjadi sekali, luring, di
laptop tim; **aplikasi** hanya membaca hasilnya.

```
 PENGOLAHAN DATA (luring, WBS 1.3)          APLIKASI (daring, WBS 1.4)
 ────────────────────────────────          ─────────────────────────────────────────

 Overpass API ─┐                            Browser
 InaRISK/DEMNAS├─> QGIS ──> GeoJSON ──┐       React + Leaflet  (resources/js)
 ATR/BPN, GTFS ┘   bersihkan,          │          │  Inertia (halaman)
                   standarkan atribut, │          │  fetch JSON (layer, search, ...)
                   samakan SRID        │          ▼
                                       │     Laravel
                                       │       Controllers/Api  ─> Services (logika murni)
                                       │          │
                                       └─ seeder ─▼
                                             PostgreSQL + PostGIS
                                               tabel per layer, indeks GIST
```

Diagram ini tafsiran minimum SRS SW03: QGIS hanya di pra-pemrosesan. Kalau
dosen meminta QGIS ikut menyajikan layer, bagian ini berubah (TBD-QGIS).

### Dua jalur komunikasi

| Jalur | Dipakai untuk |
| --- | --- |
| **Inertia** | Memuat halaman Visual Explorer beserta data awal kecil (daftar layer, kota, deskripsi persona) |
| **REST JSON** (`/api/...`) | Data layer per bounding box, search, inspect, commute — dipanggil berkali-kali saat peta bergeser (FR-12, COM02) |

### Modul

Mengikuti SRS 5.5.

| Modul | Backend | Frontend | WBS |
| --- | --- | --- | --- |
| Core Map | — | `Map/` basemap, pan/zoom, highlight/dim | 1.4.1 |
| Multi-Layer Mapping | `GET /api/layers/...` | panel toggle 6 layer, slider Mesin Waktu | 1.4.3 |
| Requirement Search | `SearchService`, parsing query | search bar, hasil Top 3, fly-to | 1.4.2 |
| Point Inspector | `GET /api/inspect` | side-panel, tombol tutup di kiri | 1.4.4 |
| Persona Grading | `PersonaScoringService` | bintang 0–3 (titik), centang (wilayah), auto-summary | 1.4.5 |
| Commute Simulator | `CommuteService` | toggle di search bar, Pin A/B | 1.4.5 |
| Backend & API | skema, endpoint, optimasi query | — | 1.4.6 |
| Uji Lahan (FR-23) | `POST /api/lahan`, `KapasitasLahan` | tombol Uji Lahan, alat gambar `Map/GambarLahan.ts`, penyunting zona `Map/ZonaLahan.ts`, 3D `Map/Lahan3D.ts` (three.js, dimuat malas), `PanelLahan`, `PanelLayerLahan`, `Pratinjau3D`; revisi TestFit 22 Nov 2026: logika murni di `lib/` (`riwayat`, `proyekLahan`, `layerLahan`, `batasLahan`, `penempatan`, `ekstrusi3d`, `berkasLahan`, `skemaLahan`, `laporanLahan`, dites `npm run test:js`), ekspor `Map/EksporLahan.ts` | — (tambahan 16–22 Nov 2026) |

### Preferensi persona

Hanya hidup di klien: `sessionStorage` (hilang saat tab ditutup, sesuai FR-14),
dikirim sebagai parameter ke `search` dan `inspect`. Server tidak pernah
menyimpannya. Pilihan persona di mode checkbox search hanya berlaku untuk
pencarian itu dan tidak menimpa preferensi sesi (Business Rule 12).

### Skor persona

Dihitung di server karena butuh query spasial. Metodenya menurut tipe geometri
(FR-09, Business Rule 10):

| Diklik | Metode | Contoh |
| --- | --- | --- |
| Titik | Jarak ke fasilitas utama persona terdekat (`ST_DWithin`, satuan meter via `geography`); Zen dari kualitas udara | ≤ 1,2 km ke stasiun → Commuter 3 bintang |
| Poligon | Ada tidaknya fasilitas utama di wilayah (`ST_Intersects`) → centang, **tanpa bintang** | Ada stasiun di kelurahan → Commuter cocok |

Ambang titik (ditetapkan PM, 29 Sep 2026): **3 bintang ≤ 1,2 km, 2 bintang ≤ 2,5 km,
1 bintang ≤ 5 km, 0 bintang > 5 km.** Fasilitas utama: Commuter = stasiun/halte,
Driver = gerbang tol, Social & Vibe = kafe/restoran/mal. Zen = kategori kualitas
udara (ISPU) di titik itu: sehat 3, kurang sehat 2, tidak sehat 1, berbahaya 0;
dikurangi 1 bila RTH terdekat > 1,2 km, atau 2 bila tidak ada RTH dalam 5 km
(minimal 0). Poligon (TBD-09, ditetapkan PM): centang `cocok` bila ada minimal satu
fasilitas utama persona di dalam wilayah; Zen cocok bila udara sehat/kurang sehat
dan ada RTH. Di respons `/api/inspect`, titik mengirim `stars` (0–3) dan wilayah
mengirim `match` (boolean) per persona. Simpan semua ambang sebagai konstanta
di satu tempat supaya bisa disetel setelah uji coba data nyata.

## 2. Kontrak API

Status: **DRAF — belum disepakati.** Dibekukan setelah Farrel, Adzkia, dan
Nur'Afia sepakat (WBS 1.2.3).

Backend dan frontend ditulis bersamaan di dua sisi batas ini. Dengan bentuk
yang disepakati lebih dulu, frontend bisa bekerja terhadap respons tiruan
tanpa menunggu query PostGIS selesai. Setelah scaffolding, bentuk yang sama
ditulis sebagai tipe TypeScript di `resources/js/types/`; kalau keduanya
berbeda, itu bug.

**Aturan perubahan** (berlaku begitu dibekukan):

1. Ubah hanya setelah disepakati Farrel, Adzkia, dan Nur'Afia.
2. Dalam satu commit/PR yang hanya menyentuh bagian ini dan
   `resources/js/types/`. Jangan dicampur perubahan fitur.
3. Umumkan setelah merge supaya yang lain `git pull --rebase`.
4. Menambah field opsional itu murah; mengganti nama atau menghapus field itu
   mahal — hindari setelah Sprint 2 dimulai.

### Konvensi data

| Hal | Konvensi |
| --- | --- |
| SRID penyimpanan | **EPSG:4326** (WGS 84) |
| Perhitungan jarak | Cast ke `geography`, atau transformasi ke UTM 48S (EPSG:32748). Jangan hitung meter dari derajat. |
| Urutan koordinat | GeoJSON `[lng, lat]`, Leaflet `[lat, lng]`. Konversi hanya di `resources/js/Map/`. |
| Geometri keluar | GeoJSON `FeatureCollection` |
| Nama kolom dan field JSON | `snake_case` |
| Teks untuk pengguna | Bahasa Indonesia (frontend menerjemahkan ke Inggris lewat `teksServer()`) |
| ID persona | `commuter`, `driver`, `social_vibe`, `zen` |
| Skor persona | Bilangan bulat 0–3. `null` = data tidak lengkap, **bukan** 0. |
| Galat | HTTP status yang sesuai + `{ "message": "..." }` |

ID layer (usulan): `historis_risiko`, `ekosistem`, `inklusivitas`,
`mobilitas`, `mesin_waktu`, `legalitas`. Nama tampilan mengikuti desain final:
Historis & Risiko, Ekosistem Mikro, Inklusivitas, Mobilitas & Transit, Mesin
Waktu, Legalitas Lahan.

### Endpoint

| Endpoint | FR | Masukan | Keluaran |
| --- | --- | --- | --- |
| `GET /api/layers` | FR-03 | — | Daftar layer: `layer_id`, nama, warna legenda |
| `GET /api/layers/{layer_id}` | FR-03, FR-04 | `bbox=minLng,minLat,maxLng,maxLat`, `tahun` (khusus `mesin_waktu`) | `FeatureCollection` |
| `GET /api/search` | FR-05, FR-06, FR-15 | `q` **atau** `kota` + `persona[]` | **Tepat 3** rekomendasi: nama, tipe kawasan, persen kecocokan (`match`, 0–100), titik pusat, geometri wilayah, alasan singkat. Nama kelurahan/kecamatan di `q` (mis. "Kecamatan Cibubur") didahulukan |
| `GET /api/inspect` | FR-08, FR-09, FR-17 | `lat`,`lng` **atau** `wilayah_id` **atau** `area`; `persona[]` dari sesi | Nama lokasi, wilayah, jenis geometri, skor 4 persona (`stars` titik / `match` wilayah), auto-summary persona terpilih. Titik juga mengirim `ringkasan_layer[]` (`jenis`: `stasiun`, `tol`, `hijau`, `banjir`; `teks`) dan `fakta` per persona (`nama`, `meter`; Social `jumlah_1km`; Zen `kualitas_udara`, `banjir`) untuk kalimat kesimpulan. Wilayah juga mengirim `terdekat` per persona (`nama`, `meter` dari batas, 0 bila di dalam); centang cocok bila fasilitas di dalam atau ≤ 2,5 km dari batas (TBD-09, 23 Okt 2026) |
| `GET /api/commute` | FR-10, FR-11 | `dari`, `ke` (koordinat `lat,lng`); opsional `tol=0` (hindari tol), `gg=1` (hindari ruas ganjil-genap DKI), `bbm` (harga BBM Rp/liter, 5.000–30.000, bawaan 10.000) | Per moda `pribadi` dan `publik`: jarak, waktu, biaya, dan geometri rute (`LineString`/`MultiLineString` searah A→B); masing-masing boleh `null`. `pribadi` juga mengirim `biaya_bbm`, `biaya_tol`, `lewat_tol`, `ganjil_genap` (`hindari`, `ruas[]` = ruas ganjil-genap yang masih disusuri); `publik` mengirim `rincian`, `stasiun[]`, `langkah[]` (`tipe`: `jalan`, `ojol`, `naik`, `pindah`), `biaya_transum`, `biaya_ojol`, dan `geometri.ojol[]`; first/last mile > 1 km memakai ojol Rp15.000 |
| `GET /api/lokasi` | FR-10 | `q` (min. 3 huruf) | Saran lokasi untuk kolom titik A/B: `hasil[]` berisi `nama`, `keterangan`, `jenis` (`wilayah`, `stasiun`, `halte`, `poi`), `lat`, `lng`. Dicari dari data sendiri, tanpa geocoding luar |
| `POST /api/lahan` | FR-23 | JSON: `geometri` (GeoJSON `Polygon`, cincin luar saja, 4–200 titik), `tipe` (`rumah`, `kos`, `apartemen`), opsional `asumsi` (`lebar_kavling`, `panjang_kavling`, `lebar_jalan`, `luas_kamar`, `porsi_studio`, `porsi_2br`, `sempadan`, `lantai`, `rasio_parkir` (mobil, apartemen), `rasio_motor` (kos), dan khusus kos/apartemen `sudut_parkir` 30–90° (bawaan 90), `padding_parkir` 0–3 m, `maks_baris` 0–40 (Max Run: tiap N slot disela kolom kosong; 0 = tanpa batas); dijepit ke rentang aman), opsional `pola` (rumah `grid`/`cluster`, kos `keliling`/`koridor`/`grid`, apartemen `keliling`/`wrap`/`tower`; tidak dikenal = bawaan), opsional `zona[]` (≤ 12, tiap `{jenis: bangunan/parkir/taman/larangan, geometri: Polygon, induk?, prioritas?}`; `larangan` = area larangan bangun yang selalu menang; `induk` = nomor zona induk (sub-layer, dipotong ke bentuk induk dan menang atas induk); `prioritas` 0–1000, lebih besar menang, kosong = larangan > bangunan > parkir > taman; tanpa `zona[]` zona dibuat dari pola), opsional `akses[]` (≤ 6, tiap `{jenis: gerbang/pintu, titik: [lng, lat], lebar?, panjang?}`; gerbang: `panjang` jalan masuk 2–300 m (kosong = otomatis sampai jalan/parkir), `lebar` 2,5–30 m; pintu: `lebar` bukaan 1,5–20 m (bawaan 3), `panjang` kedalaman lobi 2–40 m (kosong = sedalam satu unit); gerbang `lebar` bawaan bawaan rumah = lebar jalan, kos 3 m, apartemen 6 m; pintu diabaikan untuk rumah tapak), opsional `isi_sisa_taman` (sisa lahan di luar semua zona menjadi taman; hanya kos/apartemen dengan `zona[]`), opsional `target` `{jumlah 1–50000, kunci_ukuran?}` (lantai dan ukuran menyesuaikan sampai jumlah tercapai; `kunci_ukuran` = hanya lantai yang berubah), opsional `larangan_banjir` 1–3 (area InaRISK bertingkat ≥ nilai ini menjadi zona larangan otomatis), `persona[]` dari sesi | `luas_m2`, `keliling_m`, `pusat`, `wilayah`, `wilayah_id`, `zonasi` (zona RDTR paling luas + `porsi`, hanya DKI; `null` di luar DKI), `intensitas` (`kdb` %, `klb`, `kdh` % atau `null`, `sumber` `RDTR DKI 2022`/`asumsi`, `alternatif` 1/2, `luas_persil_m2`), `banjir` (`porsi_rawan`, `tingkat_maks`, `genangan_2020`), `match`/`terdekat`/`jumlah_fasilitas` per persona (aturan wilayah TBD-09), `kesimpulan`, `pola`, `pola_tersedia[]`, `asumsi` yang dipakai, `kapasitas` (`jumlah`, `satuan` `rumah`/`kamar`/`unit`, `lantai`, `lantai_maks`, `luas_tapak_m2`, `luas_lantai_m2`, `kepadatan_per_ha`, kos/apartemen juga `unit_per_lantai`, `komposisi` per tipe `studio`/`1br`/`2br`/`kamar`, `parkir` {`butuh`, `muat`, `jenis` motor/mobil, `lantai`}), `ringkasan` (`kdb_terpakai`/`kdb_batas`, `klb_terpakai`/`klb_batas`, `kdh_terpakai`/`kdh_batas`, `tinggi_lantai_m`, `tinggi_m`, `pelanggaran[]` dari `kdb`/`klb`/`kdh`/`parkir`), `target` (`null` tanpa target; selain itu `diminta`, `tercapai`, `jumlah`, `maks`, `kunci_ukuran`, `lantai`, `ukuran` {`nama`, `nilai`}), `zona` (`FeatureCollection` zona yang dipakai, properti `id`, `jenis`, `luas_m2`, `lantai`, `otomatis` untuk larangan banjir; nomor: zona pengguna, lalu sisa taman bila `isi_sisa_taman`, lalu larangan otomatis), `zona_manual`, `akses` (`FeatureCollection` titik yang sudah ditempelkan: gerbang ke tepi lahan, pintu ke tepi zona bangunan; properti `id`, `jenis`, `lebar`, `panjang` yang dipakai, `otomatis`), `geometri_kapasitas` (`FeatureCollection`: `kavling` (`varian` 0–2) + `jalan` termasuk jalan lingkar untuk rumah tapak; `unit` (`tipe`) + `koridor` + `inti`/`void` + `taman` + `parkir` (`lantai`) + `slot` + `lobi` + `jalur` untuk kos/apartemen, `akses` (jalan dari gerbang) untuk semua tipe, `tapak` bila lahan terlalu sempit; isi zona membawa `zona` = id zona, akses/lobi/jalur membawa `akses` = id akses), `catatan[]`. Galat 422: lahan menyilang, < 30 m², > 20 ha, di luar Jabodetabek, atau zona/akses tidak sah |

- `inspect` titik menerima opsional `mode` (`pedestrian`, `bicycle`, `auto`; bawaan `auto` bila persona hanya Driver,
  selain itu `pedestrian`) dan `minutes` (1–60, bawaan 10) untuk jangkauan waktu tempuh (T-056, Adzkia, 14 Nov 2026).
  Respons titik menambah `isochrone` (`FeatureCollection` poligon Valhalla, atau `null` bila server rute gagal) dan
  `isochrone_meta` (`mode`, `minutes`, `aktif`); fasilitas terdekat dicari di dalam poligon itu. Di peta, poligon ini
  menggantikan lingkaran radius 1,2 km alat Titik.
- `inspect` dengan `area=lng,lat;lng,lat;...` (alat Area di bilah alat; ditambahkan 13 Nov 2026, disetujui tim):
  3–60 titik sudut, luas 500 m²–25 km², minimal 90% di dalam kelurahan Jabodetabek; selain itu 422 dengan
  `message`. Respons berbentuk seperti wilayah (`jenis_geometri: "area"`, `match`, `jumlah_fasilitas`, `terdekat`,
  `kesimpulan`, `udara` dari kelurahan dengan irisan terbesar) ditambah `geometri`, `luas_m2`,
  `kelurahan[]` (`nama`, `porsi`) dan `banjir.porsi_rawan`. Aturan cocok sama dengan wilayah.
- `search` mengembalikan tepat tiga hasil (Business Rule 1). Kalau tidak ada
  yang memenuhi, kembalikan daftar kosong dengan `message` (UC-03).
- `commute` bergantung pada TBD-ROUTE. Sementara: mobil lewat Valhalla (cadangan OSRM),
  umum lewat Commute Data API; tarif tol dan waktu tempuh adalah perkiraan.
- Metrik wilayah untuk `search` (jarak ke stasiun/tol/POI/RTH, jumlah POI, porsi banjir)
  dihitung sekali oleh `DemoPetaSeeder` dan disimpan di `wilayah.atribut`.
- `lahan` memakai POST karena koordinat poligon bisa terlalu panjang untuk query string. Rumus kapasitas ada di
  `app/Services/KapasitasLahan.php` (dites tanpa basis data); KDB/KLB bertingkat menurut luas persil dibaca dari
  `atribut.kdb_teks`/`klb_teks` zona RDTR (Alternatif 1 untuk rumah tapak dan kos, Alternatif 2 untuk apartemen).
  Grid kavling dibuat di UTM 48S dan diputar searah sisi terpanjang lahan.
- Zona pengguna dipotong ke lahan (bangunan ke lahan dikurangi sempadan) dan tumpang tindih diselesaikan dengan prioritas
  larangan > bangunan > parkir > taman (atau `prioritas` dari klien; klien memberi larangan tertinggi, lalu zona terkunci, lalu yang terakhir ditarik).
  `id` zona = urutan di `zona[]` permintaan, jadi klien bisa mencocokkan isinya. Sub-layer (`induk`) diproses lebih dulu dari induknya.
- Area larangan (manual maupun `larangan_banjir`) dikeluarkan dari semua zona sehingga tidak ada gedung, parkir, atau taman di dalamnya;
  `larangan_banjir` memakai fitur `banjir_tampil` bertingkat ≥ nilai yang diminta, dipotong ke lahan.
- Slot parkir miring (`sudut_parkir` < 90°) berupa jajar genjang: jarak antar slot = lebar / sin θ, tebal deret = panjang·sin θ + lebar·cos θ,
  lorong menyempit 55–100 % (`KapasitasLahan::slotMiring`). Bentuk, `padding_parkir`, dan `maks_baris` hanya memengaruhi slot parkir.
- `target`: rumah tapak mencari lebar kavling dengan bagi dua; kos/apartemen mengisi lantai lebih dulu, lalu mengecilkan kamar/menggeser komposisi unit
  (sampai 5 putaran); kelebihan dipotong supaya jumlahnya persis. Untuk kos/apartemen denah = satu lantai tipikal:
  unit per lantai = ceil(target / lantai), unit sisanya, koridor yang tak lagi melayani unit, dan halaman dalam dihapus dari
  `geometri_kapasitas`; `unit_per_lantai`, `luas_tapak_m2`, `luas_lantai_m2`, dan label `jumlah` di peta mengikuti target. Bila tak muat, `target.tercapai` = false dan `target.maks` memberi batas.
- Gerbang membuka jalan akses (rumah: lebar jalan lingkungan, kos 3 m, apartemen 6 m) ke jalan lingkungan (rumah) atau
  ke zona parkir terdekat (kos/apartemen); kavling, unit, dan slot yang dilewati dibuang. Zona parkir bawaan diletakkan
  di sisi gerbang pertama. Pintu membuka lobi selebar dan sedalam yang diatur (unit yang terkena menjadi lobi) dan menarik jalur pejalan 1,5 m ke gerbang terdekat.
- Bentuk respons semua endpoint di atas dites di `tests/Feature/ApiTest.php` (Uji Lahan: `tests/Feature/LahanTest.php`).

## 3. Antarmuka

Acuan tampilan: desain final Figma `ui-nalar-ruang`, section "putih kayak bhumi
yang udah di revisi". Nilai visual, komponen, dan aturan kartografi ada di
`design-system.md`; perilaku per layar di `prd.md`. Ringkasnya (SRS UI00–UI06):

| ID | Komponen | Posisi dan isi |
| --- | --- | --- |
| UI00 | Dialog persona | "Pilih Persona mu!", 4 kartu, minimal satu, tanpa tombol tutup |
| UI01 | Visual Explorer | Search kiri atas; logo + tombol menu kanan atas; tombol LAYER/PERSONA kanan bawah; slider Mesin Waktu tengah bawah; zoom kanan bawah |
| UI02 | Search bar | Kaca pembesar + ikon **mobil** (toggle Commute); Top 3 tampil di bawahnya dengan persen kecocokan |
| UI03 | Point Inspector | Panel kiri di bawah search, tombol tutup **kanan atas** |
| UI04 | Simulator Rute | Titik A/B, kotak MOBIL dan TRANSIT (waktu + biaya) |
| UI05 | Menu utama | Drawer kiri: tab Persona, Legenda, Tentang |
| UI06 | Landing page | Halaman editorial pengantar peta |
| UI07 | Uji Lahan | Tombol di sebelah kanan search; panel kiri: mode Kotak/Poligon, tab Rumah tapak/Kos/Apartemen, slider asumsi; peta: lahan oranye dengan pegangan sudut, kavling/tapak bangunan; panel layer (nama, kunci, sembunyi, urutan, sub-layer/masking, duplikat), target jumlah dengan kunci ukuran, undo/redo (Ctrl+Z/Y), batas 20 ha dengan notifikasi, penempatan pintar zona baru; 3D langsung di peta (MapLibre) dan layar penuh; unduh/impor (.glb, .nalarruang.json, GeoJSON); simpan dan bandingkan hingga 4 skema; laporan CSV/PDF; semua hanya di sesi klien |

Perilaku yang sudah pasti:

- Isi peta digambar dari data sebenarnya; bentuk area, lokasi contoh, dan rute
  di Figma hanya ilustrasi (SRS Business Rule 13).
- Filter aktif menyorot area relevan dan meredupkan sisanya (FR-02).
- Memilih rekomendasi memicu fly-to (FR-07).
- Mengubah persona dari menu atau panel Profil Persona tidak memuat ulang
  halaman (FR-19).
- Titik tanpa data → "data tidak tersedia" (UC-04); data kurang → catatan
  "data tidak lengkap" (UC-05), bukan 0 bintang.
