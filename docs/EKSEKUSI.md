# Rencana Eksekusi — Terbagi per Orang

Status: **aktif** · Sumber: WBS Dictionary (`docs/sumber/WBS.md` bagian G)

---

Dokumen ini menjawab satu pertanyaan: **apa yang harus SAYA kerjakan sekarang?**
Semua baris di bawah diambil dari kolom *Responsible / PIC* di WBS Dictionary.
Kalau WBS berubah, dokumen ini ikut berubah, bukan sebaliknya.

## Siapa memegang apa

| Orang | Peran | Coding bersama agen? |
| --- | --- | --- |
| Farrel Muhammad Zaki | Backend Developer | Ya |
| Adzkia Nifa Adha | Backend/GIS Developer | Ya |
| Nur'Afia Avanza | UI/UX Designer, frontend | Ya |
| Raden Mas Galih Pradityo | System Analyst | Tidak — analisis, QGIS, rancangan data |
| Izdihar Izzan Wibowo | Project Manager, Scrum Master | Tidak — backlog, review, serah terima |

Kepemilikan folder ada di `docs/KOLABORASI.md`.

---

## Sprint 0 — 7 s.d. 25 Sep

| WBS | Pekerjaan | PIC | Status |
| --- | --- | --- | --- |
| 1.1.x | Elisitasi, analisis kebutuhan, SRS | Izdihar, Galih | SRS v1.0 disetujui |
| 1.2.1.x | User flow, wireframe, prototipe Figma, review desain | Nur'Afia | Belum diketahui (TBD-02) |
| 1.2.2 | Desain basis data spasial: ERD, DDL PostGIS | Galih, **Farrel** | Belum diketahui (TBD-04) |
| 1.2.3 | Arsitektur, kontrak API, rancangan algoritma | Galih, Izdihar, **Farrel**, Adzkia | Draf di `docs/ARSITEKTUR.md`, `docs/KONTRAK.md` |
| 1.2.4 | Repo GitHub, branching, boilerplate Laravel + PostGIS | Izdihar, **Farrel**, Adzkia | Repo ada; boilerplate belum |
| 1.2.5 | Domain & hosting staging gratis | **Farrel** (sendiri) | Belum diketahui |

## Sprint 1 — 28 Sep s.d. 16 Okt · Review 16 Okt

| WBS | Pekerjaan | PIC |
| --- | --- | --- |
| 1.3.1 | Akuisisi data 6 layer ke QGIS | Adzkia, Galih |
| 1.3.2 | Cleaning, standardisasi atribut, ekspor GeoJSON | Adzkia, Galih |
| 1.4.6.1 | Implementasi skema PostGIS (migrasi) | **Farrel** (sendiri) |
| 1.4.1 | Core Map: basemap, pan/zoom, highlight/dim | Nur'Afia, **Farrel** |
| 1.4.3 | Multi-layer mapping (mulai; tersebar sampai Sprint 3) | **Farrel**, Adzkia, Nur'Afia |

## Sprint 2 — 19 Okt s.d. 6 Nov · Review 6 Nov

| WBS | Pekerjaan | PIC |
| --- | --- | --- |
| 1.4.2 | Requirement Search: form, spatial intersection, fly-to | Nur'Afia, Galih, Adzkia |
| 1.4.6.2 | RESTful API (layer, search, persona) | **Farrel**, Adzkia |
| 1.4.6.3 | Optimasi query spasial | **Farrel** (sendiri) |
| 1.4.3 | Layer Inklusivitas & Mobilitas | **Farrel**, Adzkia, Nur'Afia |

## Sprint 3 — 9 s.d. 20 Nov · Review 20 Nov

| WBS | Pekerjaan | PIC |
| --- | --- | --- |
| 1.4.4 | Smart Point Inspector (panel) | Nur'Afia |
| 1.4.5 | Persona Grading + Commute Simulator | Galih, **Farrel**, Nur'Afia |
| 1.4.3 | Dua layer sisa | **Farrel**, Adzkia, Nur'Afia |
| 1.5.1 | Test plan | Galih, Izdihar |

## Release Sprint — 23 s.d. 27 Nov · Final 27 Nov

| WBS | Pekerjaan | PIC |
| --- | --- | --- |
| 1.5.2 | Testing: unit, integration, usability, UAT | Seluruh tim |
| 1.5.3 | Debugging | **Farrel**, Adzkia, Nur'Afia |
| 1.5.4 | Deployment produksi (SSL, domain) | **Farrel**, Adzkia |
| 1.5.5 | Dokumentasi pengguna & teknis | Nur'Afia, Galih, **Farrel**, Adzkia |
| 1.5.6 | Serah terima | Izdihar |

---

## Pembagian endpoint Farrel dan Adzkia — USULAN

WBS 1.4.6.2 menyebut keduanya tanpa membagi. Usulan ini **belum disepakati**;
tanyakan Adzkia sebelum mengerjakannya.

| Endpoint | Usulan pemilik | Alasan |
| --- | --- | --- |
| `layers`, `layers/{id}` | Farrel | Satu paket dengan skema (1.4.6.1) dan optimasi query (1.4.6.3) |
| `search` | Adzkia | Adzkia ikut di 1.4.2 Requirement Search |
| `inspect` + skor persona | Farrel | Farrel ikut di 1.4.5 Persona Grading |
| `commute` | Farrel | Bagian dari 1.4.5 |

## Pekerjaan pertama Farrel

Urutan ini mengikuti dependensi WBS, bukan selera:

1. **1.2.4** boilerplate Laravel + Inertia + React, tersambung ke PostGIS lokal.
   Isi bagian *Perintah* dan *Versi yang dikunci* di `CLAUDE.md`.
2. **1.2.2** bersama Galih: ERD dan DDL. Menutup TBD-04.
3. **1.2.5** staging gratis yang bisa menerima deploy Sprint 1.
4. **1.4.6.1** migrasi PostGIS dari DDL, dengan indeks GIST.
5. Bekukan `docs/KONTRAK.md` bersama Adzkia dan Nur'Afia sebelum Sprint 1
   berjalan jauh.
