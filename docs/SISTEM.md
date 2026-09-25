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
| Persona Grading | `PersonaScoringService` | bintang 0–3, auto-summary | 1.4.5 |
| Commute Simulator | `CommuteService` | toggle di search bar, Pin A/B | 1.4.5 |
| Backend & API | skema, endpoint, optimasi query | — | 1.4.6 |

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
| Titik | Jarak ke fasilitas relevan terdekat (`ST_DWithin`) | < 500 m dari stasiun → Commuter 3 bintang |
| Poligon | Jumlah fasilitas relevan di wilayah (`ST_Intersects`) | 2 stasiun untuk satu kota → Commuter 1 bintang |

Ambang (TBD-09, TBD-10) dan bobot (TBD-05) belum ditetapkan. Simpan sebagai
konstanta di satu tempat supaya bisa disetel setelah uji coba data nyata.

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
| Teks untuk pengguna | Bahasa Indonesia |
| ID persona | `commuter`, `driver`, `social_vibe`, `zen` |
| Skor persona | Bilangan bulat 0–3. `null` = data tidak lengkap, **bukan** 0. |
| Galat | HTTP status yang sesuai + `{ "message": "..." }` |

ID layer (usulan): `historis_risiko`, `ekosistem`, `inklusivitas`,
`mobilitas`, `mesin_waktu`, `legalitas`. Nama tampilan singkat menunggu TBD-08;
ID tidak berubah karenanya.

### Endpoint

| Endpoint | FR | Masukan | Keluaran |
| --- | --- | --- | --- |
| `GET /api/layers` | FR-03 | — | Daftar layer: `layer_id`, nama, warna legenda |
| `GET /api/layers/{layer_id}` | FR-03, FR-04 | `bbox=minLng,minLat,maxLng,maxLat`, `tahun` (khusus `mesin_waktu`) | `FeatureCollection` |
| `GET /api/search` | FR-05, FR-06, FR-15 | `q` **atau** `kota` + `persona[]` | **Tepat 3** rekomendasi: nama, titik pusat, skor, alasan singkat |
| `GET /api/inspect` | FR-08, FR-09, FR-17 | `lat`,`lng` **atau** `wilayah_id`; `persona[]` dari sesi | Atribut lokasi, skor 4 persona, auto-summary persona terpilih |
| `GET /api/commute` | FR-10, FR-11 | `dari`, `ke` (koordinat) | Jarak dan waktu untuk `pribadi` dan `publik`; masing-masing boleh `null` |

- `search` mengembalikan tepat tiga hasil (Business Rule 1). Kalau tidak ada
  yang memenuhi, kembalikan daftar kosong dengan `message` (UC-03).
- `commute` bergantung pada TBD-ROUTE; bentuk keluarannya disepakati lebih dulu.

## 3. Antarmuka

Desain Figma belum ada (TBD-02). Sampai desain masuk, yang berlaku hanya
batasan dari SRS di bawah; selebihnya jangan ditebak.

| Sumber | Batasan |
| --- | --- |
| SRS B03 | **Satu tipografi: Plus Jakarta Sans.** Responsif untuk desktop. |
| SRS B02 | Seluruh teks antarmuka Bahasa Indonesia. |
| SRS 5.4 | Bisa dipakai pengguna baru tanpa pelatihan. |

| ID | Komponen | Yang sudah ditetapkan SRS |
| --- | --- | --- |
| UI00 | Dialog onboarding | Checkbox 4 persona dengan deskripsi singkat, minimal satu dicentang |
| UI01 | Visual Explorer | Search bar **kanan atas**, hamburger menu, panel 6 layer **kanan bawah**, slider Mesin Waktu |
| UI02 | Search bar | Ikon **kaca pembesar** (search) dan **orang berjalan** (toggle ke Commute, dua kolom input), pola Google Maps |
| UI03 | Point Inspector | Side-panel, **tombol tutup di kiri**, bintang 0–3 empat persona, auto-summary |
| UI04 | Commute Simulator | Estimasi dua moda berdampingan |
| UI05 | Hamburger menu | Preferensi Persona, Legenda, Deskripsi Aplikasi |

Perilaku yang sudah pasti:

- Filter aktif menyorot area relevan dan meredupkan sisanya (FR-02).
- Memilih rekomendasi memicu fly-to (FR-07).
- Mengubah persona dari menu tidak memuat ulang halaman (FR-19).
- Titik tanpa data → "data tidak tersedia" (UC-04); data kurang → catatan
  "data tidak lengkap" (UC-05), bukan 0 bintang.

Belum ditentukan: palet warna, nama singkat layer, tata letak persis, ikon dan
simbol legenda.
