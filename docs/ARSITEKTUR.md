# Arsitektur NalarRuang

Status: **draf** · Disempurnakan di tahap 2 setelah desain Figma dan ERD (TBD-02, TBD-04) tersedia

---

## Bentuk dasar

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

Peran QGIS di sisi kanan (misalnya QGIS Server menyajikan WMS) **belum
diputuskan**. Lihat TBD-QGIS di `docs/PLAN.md`. Diagram ini menggambarkan
tafsiran minimum dari SRS SW03: QGIS hanya di pra-pemrosesan.

## Dua jalur komunikasi

| Jalur | Dipakai untuk | Kenapa |
| --- | --- | --- |
| **Inertia** | Memuat halaman Visual Explorer beserta data awal kecil (daftar layer, daftar kota, deskripsi persona) | Tanpa perlu API untuk navigasi halaman |
| **REST JSON** (`/api/...`) | Data layer per bounding box, Requirement Search, skor persona, commute | Dipanggil berkali-kali saat peta bergeser; SRS FR-12 dan COM02 meminta RESTful API |

Bentuk setiap endpoint REST ada di `docs/KONTRAK.md`.

## Modul

Mengikuti SRS 5.5. Satu modul = satu tanggung jawab = sebisa mungkin satu pemilik.

| Modul | Backend | Frontend | WBS |
| --- | --- | --- | --- |
| Core Map | — | `Map/` basemap, pan/zoom, highlight/dim | 1.4.1 |
| Multi-Layer Mapping | `GET /api/layers/...` | panel toggle 6 layer, slider Mesin Waktu | 1.4.3 |
| Requirement Search | `SearchService`, parsing query | search bar, hasil Top 3, fly-to | 1.4.2 |
| Point Inspector | `GET /api/inspect` | side-panel, tombol tutup di kiri | 1.4.4 |
| Persona Grading | `PersonaScoringService` | bintang 0–3, auto-summary | 1.4.5 |
| Commute Simulator | `CommuteService` | toggle di search bar, Pin A/B | 1.4.5 |
| Backend & API | skema, endpoint, optimasi query | — | 1.4.6 |

## Preferensi persona: di mana ia hidup

Hanya di klien. Disimpan di `sessionStorage` (hilang saat tab ditutup, cocok
dengan FR-14) dan dikirim sebagai **parameter** ke endpoint yang membutuhkannya
(`search`, `inspect`). Server tidak pernah menyimpannya. Ini aturan wajib nomor 2
di `CLAUDE.md`.

Pilihan persona di mode checkbox Requirement Search hanya berlaku untuk
pencarian itu dan **tidak** menimpa preferensi sesi (Business Rule 12).

## Skor persona

Dihitung di server, karena butuh query spasial. Dua metode menurut tipe
geometri (FR-09, Business Rule 10):

| Diklik | Metode | Contoh |
| --- | --- | --- |
| Titik | Jarak ke fasilitas relevan terdekat (`ST_DWithin`) | < 500 m dari stasiun → Commuter 3 bintang |
| Poligon | Jumlah fasilitas relevan di dalam wilayah (`ST_Intersects`) | 2 stasiun untuk satu kota → Commuter 1 bintang |

Ambang tiap bintang (TBD-09, TBD-10) dan bobot (TBD-05) **belum ditetapkan**.
Simpan sebagai konstanta di satu tempat, jangan tersebar, supaya bisa disetel
setelah uji coba data nyata (Business Rule 2).

## Belum dirancang

- Skema tabel dan ERD (TBD-04, WBS 1.2.2).
- Cara Commute Simulator menghitung waktu tempuh (TBD-ROUTE).
- Hosting staging dan produksi (WBS 1.2.5, 1.5.4).
- Tata letak komponen (TBD-02).
