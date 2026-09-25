# Kontrak API dan Konvensi Data

Status: **DRAF — belum disepakati** · Dibekukan setelah Farrel, Adzkia, dan Nur'Afia sepakat (WBS 1.2.3)

---

## Kenapa dokumen ini ada

Backend (Farrel, Adzkia) dan frontend (Nur'Afia) menulis kode di sisi berlawanan
dari batas yang sama, pada waktu yang sama, masing-masing dibantu agen AI.
Satu-satunya cara itu bisa berjalan adalah kalau **bentuk sambungannya
disepakati sebelum isinya ditulis**.

Setelah kontrak disepakati, frontend bisa bekerja terhadap respons tiruan tanpa
menunggu query PostGIS selesai, dan backend tidak perlu tahu bentuk layarnya.

Setelah scaffolding, bentuk yang sama ditulis sebagai tipe TypeScript di
`resources/js/types/`. Kalau keduanya berbeda, itu bug; perbaiki dua-duanya
dalam satu commit.

## Aturan perubahan

Berlaku begitu status di atas berubah menjadi **beku**:

1. Ubah hanya setelah **disepakati** dengan Farrel, Adzkia, dan Nur'Afia.
2. Perubahan masuk dalam **satu commit/PR yang hanya menyentuh berkas ini dan
   `resources/js/types/`**. Jangan campur dengan perubahan fitur.
3. Umumkan setelah merge, supaya yang lain `git pull --rebase` sebelum lanjut.
4. Menambah field opsional itu murah. Mengganti nama atau menghapus field itu
   mahal — hindari setelah Sprint 2 dimulai.

## Konvensi data

| Hal | Konvensi |
| --- | --- |
| SRID penyimpanan | **EPSG:4326** (WGS 84). Leaflet dan GeoJSON memakai ini. |
| Perhitungan jarak | Cast ke `geography`, atau transformasi ke UTM 48S (EPSG:32748) untuk Jabodetabek. Jangan hitung meter dari derajat. |
| Urutan koordinat | GeoJSON: `[lng, lat]`. Leaflet: `[lat, lng]`. Konversi hanya di `resources/js/Map/`. |
| Format geometri keluar | GeoJSON `FeatureCollection` |
| Nama kolom dan field JSON | `snake_case`, bahasa Inggris untuk istilah teknis (`layer_id`, `geometry`) |
| Teks untuk pengguna | Bahasa Indonesia (SRS B02) |
| ID persona | `commuter`, `driver`, `social_vibe`, `zen` |
| Skor persona | Bilangan bulat 0–3. `null` berarti data tidak lengkap, **bukan** 0. |
| Galat | HTTP status yang sesuai + `{ "message": "..." }` dalam bahasa Indonesia |

### ID layer (usulan)

| `layer_id` | Layer SRS |
| --- | --- |
| `historis_risiko` | Historis & Risiko |
| `ekosistem` | Ekosistem Mikro & Gaya Hidup |
| `inklusivitas` | Inklusivitas |
| `mobilitas` | Mobilitas & Transit |
| `mesin_waktu` | Mesin Waktu |
| `legalitas` | Legalitas Lahan |

Nama tampilan singkat untuk UI menunggu TBD-08; ID di sini tidak berubah
karenanya.

## Endpoint (draf)

Diturunkan dari SRS FR-12 dan WBS 1.4.6.2. Bentuk rinci diisi saat WBS 1.2.3.

| Endpoint | FR | Masukan | Keluaran |
| --- | --- | --- | --- |
| `GET /api/layers` | FR-03 | — | Daftar layer: `layer_id`, nama, warna legenda |
| `GET /api/layers/{layer_id}` | FR-03, FR-04 | `bbox=minLng,minLat,maxLng,maxLat`, `tahun` (khusus `mesin_waktu`) | `FeatureCollection` |
| `GET /api/search` | FR-05, FR-06, FR-15 | `q` (teks bebas/nama wilayah) **atau** `kota` + `persona[]` | **Tepat 3** rekomendasi: nama, titik pusat, skor, alasan singkat |
| `GET /api/inspect` | FR-08, FR-09, FR-17 | `lat`,`lng` **atau** `wilayah_id`; `persona[]` dari sesi | Atribut lokasi, skor 4 persona, auto-summary untuk persona terpilih |
| `GET /api/commute` | FR-10, FR-11 | `dari`, `ke` (koordinat) | Jarak dan waktu untuk `pribadi` dan `publik`; masing-masing boleh `null` |

Catatan:

- `search` **wajib** mengembalikan tepat tiga hasil (Business Rule 1). Kalau
  tidak ada yang memenuhi, kembalikan daftar kosong dengan `message`, bukan
  kurang dari tiga (UC-03 alur alternatif 1).
- `persona[]` dikirim klien setiap kali; server tidak menyimpannya.
- `commute` bergantung pada TBD-ROUTE; bentuk keluarannya boleh disepakati
  lebih dulu supaya frontend tidak menunggu.
